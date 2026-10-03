import { setupStampDefaults } from './stamp-placeholders.mjs';
import { textRect, isResizableBox } from './notes.mjs';
import { getDocument, GlobalWorkerOptions, TextLayer } from './vendor/pdf.mjs';
import { stampRect, shortArrow, circleRect, boxCircleRect, checkmarkRect, pointedCheckmark, resizeRect } from './geometry.mjs';
import { readSelection } from './selection.mjs';
import { createAnnotationStore } from './store.mjs';
import { resizeGraphic, dragRect, translateGeometry } from './graphic-core.mjs';
import { openStampEditor } from './stamp-editor.mjs';
import { stampSnapshot, createStampTemplates } from './stamps.mjs';
import { paintOverlay } from './overlay.mjs';
import { paintPanel } from './panel.mjs';
import { createPageOrientations, fitScale } from './view.mjs';
import { setupLayout } from './layout.mjs';
import { sanitizeSvg, readStampJson } from './stamp-import.mjs';
import { paintPalette, populateResults, markingOption, HINT_COLORS, COLORS } from './palette.mjs';

GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
const element = id => document.getElementById(id);
const pageElement = element('pdf-page');
const canvas = pageElement.querySelector('canvas');
const textLayer = element('text-layer');
const layer = element('annotation-layer');
const store = createAnnotationStore(), templates = createStampTemplates();
try { const saved=localStorage.getItem('pdf-review-stamps-v2'); if(saved) templates.replace(readStampJson(saved)); }
catch(error) { element('import-result').textContent=`Gespeicherte Vorlagen konnten nicht geladen werden: ${error.message}`; }

const tools = ['highlight', 'strikeout', 'stamp', 'box', 'circle', 'arrow', 'checkmark', 'text', 'move'];
let orientations;
let suppressPlacement = false;
let circleCenter = null, previewPoint = null;
let documentPdf, pageNumber = 1, scale = 1, mode = 'highlight', busy = true;
let lastTool = 'highlight';
let selectedId = null, gesture = null, arrowTip = null, arrowDirection = null;
const pageSize = () => ({ width: parseFloat(pageElement.style.width) / scale, height: parseFloat(pageElement.style.height) / scale });
const displaySize = () => ({ width: parseFloat(pageElement.style.width), height: parseFloat(pageElement.style.height) });
const color = () => element('color').value;
const stampDefaults=setupStampDefaults(()=>{if(documentPdf && !busy)repaint(false);});
function position(event) {
  const box = pageElement.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) };
}
const layout = setupLayout(() => { if (!busy && element('zoom').value.startsWith('page-')) void renderPage(); });
function toolDescription() {
  if (mode === 'circle') return {
    bounds:'Ellipse / Box: klicken und aufziehen.',
    center:'Kreis / Mittelpunkt: Mittelpunkt klicken, dann Radius klicken.',
    square:'Kreis / Box: zwei gegenüberliegende Ecken klicken. Die Umgrenzung wird bei Bedarf quadratisch erweitert.',
  }[element('circle-method').value];
  if (mode === 'checkmark' && element('checkmark-shape').value === 'pointed') return 'Spitze klicken, dann Richtung zum Nummernkreis klicken. Die Vorschau zeigt die nächste Prüfmarke; feste Größe.';
  return {
    highlight:'Text mit gedrückter Maustaste auswählen; die Markierung bleibt textgebunden.',
    strikeout:'Text mit gedrückter Maustaste zum Durchstreichen auswählen; die Markierung bleibt textgebunden.',
    stamp:'Stempelvorlage wählen. Die Vorschau zeigt die Position; mit einem Klick platzieren.',
    box:'Box durch Klicken und Aufziehen zeichnen. Ausgewählte Boxen haben acht Größenmarker.',
    arrow:'Pfeilspitze klicken, dann Richtung zum Pfeilende klicken. Länge: 40 pt; Farbe gemäß Markierung.',
    checkmark:'Die Vorschau zeigt die nächste Prüfmarke. Mit einem Klick platzieren.',
    text:'Position klicken, Text im rechten Panel eingeben. Transparenter Hintergrund; ausgewählte Texte haben acht Größenmarker.',
    move:'Element greifen und ziehen. Strg+Ziehen funktioniert in jedem Werkzeug; fixierte Elemente bleiben gesperrt.',
  }[mode];
}
function status(message = toolDescription()) { element('status').textContent = message; }
function stampContent() {
  const template = templates.get(element('stamp-select').value);
  return template ? stampSnapshot(template, element('review-result').value === 'unreviewed' ? template.color : color(), stampDefaults()) : null;
}
function twoClickCircle(first, second, size) {
  return element('circle-method').value === 'square' ? boxCircleRect(first,second,size) : circleRect(first,second,size);
}
function controls() {
  element('previous').disabled = busy || !documentPdf || pageNumber === 1;
  element('next').disabled = busy || !documentPdf || pageNumber === documentPdf.numPages;
  for (const id of [...tools, 'zoom', 'zoom-out', 'zoom-in', 'page-input', 'color', 'stamp-select', 'circle-method', 'checkmark-shape', 'rotate-left', 'rotate-right', 'review-result', 'checkmark-summary']) element(id).disabled = busy || !documentPdf;
  element('zoom-out').disabled ||= scale <= .25;
  element('zoom-in').disabled ||= scale >= 4;
  element('color').disabled ||= mode === 'move';
  element('stamp').disabled ||= !templates.all().some(t=>t.active);
  element('stamp-select').disabled ||= !templates.all().some(t=>t.active);
  element('strikeout').disabled ||= element('review-result').value !== 'not-ok';
  element('color-option').hidden = element('review-result').value !== 'hint' || !['highlight', 'strikeout', 'box', 'circle', 'checkmark', 'stamp', 'arrow', 'text'].includes(mode);
  if(mode === 'stamp' && templates.get(element('stamp-select').value)?.allowColorChange === false) element('color-option').hidden=true;
  element('checkmark-option').hidden = mode !== 'checkmark';
  element('circle-option').hidden = mode !== 'circle';
  element('stamp-option').hidden = mode !== 'stamp';
  element('review-result').disabled ||= mode === 'move';
  paintPalette(element('drawing-palette'),color(), value => { element('color').value = value; if (!busy) repaint(false); }, busy || !documentPdf || mode === 'move', HINT_COLORS);
  pageElement.dataset.ready = String(!busy && Boolean(documentPdf));
}
const ghost = (type, geometry, content = {}) => ({ id: 'preview', type, geometry, content, metadata: {} });
function previewAnnotation() {
  if (gesture?.original || pageElement.classList.contains("ctrl-move")) return null;
  const size = pageSize();
  if (mode === 'arrow' && arrowTip && arrowDirection) {
    const geometry = shortArrow(arrowTip, arrowDirection, size);
    return geometry ? ghost('arrow', geometry, { color: color() }) : null;
  }
  if (mode === 'circle' && circleCenter && previewPoint) {
    const rect = twoClickCircle(circleCenter,previewPoint,size);
    return rect ? ghost('circle', {rect}, {color:color(),circleMethod:element('circle-method').value}) : null;
  }
  if (mode === 'text' && previewPoint) return ghost('free-text',{rect:textRect(previewPoint,size)},{color:color(),textAlignment:'top-left'});
  if (mode === 'stamp' && previewPoint) {
    const content = stampContent();
    return content ? ghost('stamp',{rect:stampRect(previewPoint.x,previewPoint.y,size,content)},content) : null;
  }
  if (mode === 'checkmark' && element('checkmark-shape').value === 'pointed' && (arrowTip || previewPoint)) {
    const tip = arrowTip || previewPoint;
    const direction = arrowDirection || {x:tip.x < .5 ? 1 : 0,y:tip.y < .5 ? 1 : 0};
    const geometry = pointedCheckmark(tip,direction,size);
    return geometry ? ghost('checkmark',geometry,{color:color(),number:store.nextCheckNumber(),shape:'pointed'}) : null;
  }
  if (mode === 'checkmark' && previewPoint) return ghost('checkmark', { rect: checkmarkRect(previewPoint, size) }, { color: color(), number: store.nextCheckNumber() });
  if (gesture && !gesture.original && previewPoint) return ghost(gesture.type, { rect: dragRect(gesture.start, previewPoint) }, { color: color() });
  return null;
}
function repaint(full = true) {
  if (selectedId && !store.get(selectedId)) selectedId = null;
  paintOverlay(layer, [...store.forPage(pageNumber), ...[previewAnnotation()].filter(Boolean)], displaySize(), scale, selectedId);
  if (full) paintPanel(element('annotations'), store.forPage(pageNumber), pageSize(), store, repaint, id => {
    selectedId = id; layout.showDetail(); setMode('move'); repaint();
  }, selectedId, element("selected-annotation"));
  element('checkmark-summary').disabled = busy || !store.forPage(pageNumber).some(a=>a.type==='checkmark');
  element('selected-state').textContent = JSON.stringify(store.get(selectedId),null,2);
  element('state').textContent = JSON.stringify(store.all(), null, 2);
  element('review-state').textContent = JSON.stringify({ schemaVersion: 2, documentRef: 'synthetic-test-v1', coordinateFrame: 'displayed-page-after-relative-rotation', pages: orientations?.all() || [], annotations: store.all() }, null, 2);
}
function cancelGesture() {
  if (gesture?.original) store.setGeometry(gesture.id, gesture.original);
  if (gesture && pageElement.hasPointerCapture(gesture.pointerId)) pageElement.releasePointerCapture(gesture.pointerId);
  gesture = null; arrowTip = null; arrowDirection = null; circleCenter = null; previewPoint = null;
  if (documentPdf && !busy) repaint();
}
function setMode(tool) {
  cancelGesture(); mode = tool;
  if (tool !== 'move') lastTool = tool;
  window.getSelection()?.removeAllRanges();
  const shortcut = pageElement.classList.contains("ctrl-move");
  pageElement.className = `${tool}-mode`;
  if (shortcut) pageElement.classList.add("ctrl-move");
  for (const id of tools) element(id).setAttribute('aria-pressed', String(id === mode));

  controls(); status();
}
function add(type, geometry, anchor = {}, content = {}) {
  selectedId = store.add(type, pageNumber, geometry, anchor, { ...content, annotationType: element('review-result').value === 'hint' ? 'hint' : 'review', reviewResult: element('review-result').value === 'hint' ? null : element('review-result').value }).id;
  layout.showDetail();
  repaint();
}
function refreshStampOptions(selected = element('stamp-select').value) {
  try { localStorage.setItem('pdf-review-stamps-v2',JSON.stringify({schemaVersion:2,templates:templates.all()})); }
  catch(error) { element('import-result').textContent=`Vorlagen konnten nicht im Browser gespeichert werden: ${error.message}`; }
  const select = element('stamp-select'); select.replaceChildren();
  for (const template of templates.all().filter(t=>t.active)) {
    const option = document.createElement('option'); option.value = template.id; option.textContent = template.label; select.append(option);
  }
  if (templates.get(selected)) select.value = selected;
  controls();
}
function manageStamps() {
  const container = element('stamp-templates'); container.replaceChildren();
  for (const template of templates.all()) {
    const row = document.createElement('div'); row.className = 'stamp-template';
    const label = document.createElement('label'); label.textContent = 'Stempeltext';
    const input = document.createElement('input'); input.value = template.label; input.maxLength = 40; label.append(input);
    const colorLabel = document.createElement('div'); colorLabel.textContent = 'Vorlagenfarbe';
    const tint = document.createElement('div'); tint.className = 'palette'; tint.setAttribute('role','group'); tint.setAttribute('aria-label','Vorlagenfarbe'); colorLabel.append(tint);
    let templateColor = template.color;
    const save = () => {
      templates.update(template.id, input.value, templateColor);
      input.value = templates.get(template.id).label;
      refreshStampOptions();
    };
    paintPalette(tint,templateColor,value => { templateColor = value; save(); });
    input.addEventListener('change',save);
    const remove = document.createElement('button'); remove.textContent = 'Vorlage löschen';
    remove.addEventListener('click', () => { templates.remove(template.id); refreshStampOptions(); manageStamps(); });
    const duplicate=document.createElement('button'); duplicate.textContent='Duplizieren';duplicate.onclick=()=>{templates.import([templates.get(template.id)]);refreshStampOptions();manageStamps();};
    const edit=document.createElement('button');edit.textContent='Grafik bearbeiten';edit.onclick=()=>openStampEditor(templates.get(template.id),updated=>{templates.save(template.id,updated);refreshStampOptions();manageStamps();});
    row.append(duplicate,edit);
    for(const [key,title] of [['active','Aktiv'],['allowResize','Größe änderbar'],['keepAspectRatio','Seitenverhältnis beibehalten'],['allowColorChange','Farbe änderbar'],['allowTextEdit','Instanztext änderbar']]) {
      const label=document.createElement('label'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=template[key];label.append(checkbox,document.createTextNode(title));row.append(label);checkbox.onchange=()=>{templates.save(template.id,{...templates.get(template.id),[key]:checkbox.checked});refreshStampOptions();};
    }
    for(const [key,title] of [['defaultWidth','Standardbreite (pt)'],['defaultHeight','Standardhöhe (pt)'],['description','Beschreibung'],['category','Kategorie']]) {
      const label=document.createElement('label'),input=document.createElement('input');label.textContent=title;input.type=key.startsWith('default') ? 'number' : 'text';input.value=template[key];label.append(input);row.append(label);input.onchange=()=>{const value=input.type==='number' ? Number(input.value) : input.value;if(input.type==='number' && (value<1 || value>2000 || !Number.isFinite(value)))return;templates.save(template.id,{...templates.get(template.id),[key]:value});refreshStampOptions();};
    }
    if (template.svgSource) { const preview = document.createElement('img'); preview.className = template.elements ? 'stamp-native-preview' : 'stamp-preview'; preview.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(template.svgSource.replace(/currentColor/g,template.color))}`; preview.alt = template.label; row.append(preview); }
    row.prepend(label, colorLabel); row.append(remove); container.append(row);
  }
}
element('stamp-add').addEventListener('submit', event => {
  event.preventDefault();
  const template = templates.add(element('stamp-label').value, element('stamp-color').value);
  if (!template) return;
  refreshStampOptions(template.id); manageStamps(); element('stamp-label').value = '';
});
element('manage-stamps').addEventListener('click', () => {
  element('settings').showModal(); element('stamp-manager').open = true;
  element('stamp-manager').querySelector('input')?.focus();
});
populateResults(element('review-result'));
const legendMeaning = {'Rot':'Nicht in Ordnung','Grün':'In Ordnung','Blau':'Hinweis','Gelb':'Klärung erforderlich / Hinweis','Grau':'Nicht geprüft / Hinweis','Schwarz':'Hinweis'};
for (const color of COLORS) {
  const row = document.createElement('div'); row.className = 'legend-row';
  const swatch = document.createElement('span'); swatch.className = 'color-swatch'; swatch.setAttribute('aria-hidden','true'); swatch.style.setProperty('--swatch',color.value);
  const label = document.createElement('span'); label.textContent = `${color.name}: ${legendMeaning[color.name]}`;
  row.append(swatch,label); element('color-legend').append(row);
}

paintPalette(element('new-stamp-palette'),element('stamp-color').value,value => { element('stamp-color').value = value; });
element('review-result').addEventListener('change', () => {
  const value = element('review-result').value;
  element('color').value = markingOption(value).color;
  if (value !== 'not-ok' && mode === 'strikeout') setMode('highlight');
  controls(); if (!busy) repaint(false);
});
element('stamp-import').addEventListener('change', async event => {
  try {
    const items = [];
    for (const file of event.target.files) {
      if (file.size > 1024 * 1024) throw new Error('Datei ist größer als 1 MB.');
      const source = await file.text();
      if (/\.svg$/i.test(file.name)) items.push({label:file.name.replace(/\.svg$/i,'').slice(0,40),color:'#808080',kind:'svg',svgSource:sanitizeSvg(source)});
      else if (/\.json$/i.test(file.name)) items.push(...readStampJson(source));
      else throw new Error('Bitte SVG oder JSON wählen.');
    }
    const added = templates.import(items); refreshStampOptions(added[0]?.id); manageStamps();
    element('import-result').textContent = `${added.length} Stempelvorlagen importiert.`;
  } catch (error) { element('import-result').textContent = `Import abgebrochen: ${error.message}`; }
  event.target.value = '';
});
element('stamp-export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:2,templates:templates.all()},null,2)],{type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'stempelvorlagen.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
};
refreshStampOptions(); manageStamps();

function fail(error) {
  busy = true; controls();
  element('status').textContent = `PDF konnte nicht dargestellt werden: ${error.message}. Bitte neu laden.`;
  console.error(error);
}
async function renderPage() {
  cancelGesture(); busy = true; controls();
  window.getSelection()?.removeAllRanges(); layer.replaceChildren(); textLayer.replaceChildren();
  element('mouse-coordinates').textContent = '–'; element('status').textContent = 'Seite wird dargestellt …';
  try {
    const page = await documentPdf.getPage(pageNumber);
    const rotation = (page.rotate + orientations.get(pageNumber)) % 360;
    const zoom = element('zoom').value;
    if (zoom.startsWith('page-')) {
      const workspace = document.querySelector('.workspace'), style = getComputedStyle(workspace);
      const viewport = page.getViewport({ scale: 1, rotation });
      scale = fitScale(zoom, viewport, {
        width: workspace.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 16,
        height: workspace.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 16,
      });
    } else scale = Number(zoom);
    const viewport = page.getViewport({ scale, rotation });
    pageElement.style.width = `${viewport.width}px`; pageElement.style.height = `${viewport.height}px`;
    pageElement.style.setProperty('--total-scale-factor', String(viewport.scale));
    pageElement.style.setProperty('--user-unit', String(viewport.userUnit));
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(viewport.width * ratio); canvas.height = Math.ceil(viewport.height * ratio);
    canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] }).promise;
    await new TextLayer({ textContentSource: await page.getTextContent(), container: textLayer, viewport }).render();
    element('page-number').textContent = `${pageNumber} / ${documentPdf.numPages}`;
    element('page-input').value = String(pageNumber); element('page-input').max = String(documentPdf.numPages);
    pageElement.dataset.page = String(pageNumber);
    pageElement.dataset.rotation = String(orientations.get(pageNumber));
    element('orientation').textContent = `${orientations.get(pageNumber)}° zur Datei`;
    const original = page.getViewport({scale:1,rotation:page.rotate});
    element('page-information-text').textContent = `Seite ${pageNumber} / ${documentPdf.numPages}\nDatei: ${original.width.toFixed(1)} × ${original.height.toFixed(1)} pt\nAnsicht: ${(viewport.width/scale).toFixed(1)} × ${(viewport.height/scale).toFixed(1)} pt\nZoom: ${(scale*100).toFixed(1)} %\nDrehung in der PDF-Datei: ${page.rotate}°\nDrehung der Ansicht: ${rotation}°`;
    if (!store.forPage(pageNumber).some(item => item.id === selectedId)) selectedId = store.forPage(pageNumber)[0]?.id || null;
    busy = false; controls(); repaint(); status();
  } catch (error) { fail(error); }
}
element('checkmark-summary').addEventListener('click', () => {
  if (busy || !store.forPage(pageNumber).some(a=>a.type==='checkmark')) return;
  const size=pageSize();
  selectedId=store.addCheckmarkSummary(pageNumber,textRect({x:1-240/size.width,y:1-160/size.height},size,220,140)).id;
  layout.showDetail(); setMode('move'); repaint();
});
for (const tool of tools) element(tool).addEventListener('click', () => setMode(tool));
element('previous').addEventListener('click', () => { pageNumber--; void renderPage(); });
element('next').addEventListener('click', () => { pageNumber++; void renderPage(); });
element('page-input').addEventListener('change', event => {
  const requested = Number(event.target.value);
  if (!Number.isInteger(requested) || requested < 1 || requested > documentPdf.numPages) { event.target.value = String(pageNumber); return; }
  pageNumber = requested; void renderPage();
});
element('zoom').addEventListener('change', () => { void renderPage(); });
function setNumericZoom(next) {
  const zoom = element('zoom');
  let option = zoom.querySelector('[data-wheel-zoom]');
  if (!option) { option = document.createElement('option'); option.dataset.wheelZoom = 'true'; zoom.append(option); }
  option.value = String(next); option.textContent = `${Math.round(next * 100)} %`; zoom.value = option.value;
}
for (const [id,delta] of [['zoom-out',-.15],['zoom-in',.15]]) {
  element(id).addEventListener('click', () => {
    if (busy || !documentPdf) return;
    const next = Math.max(.25,Math.min(4,Math.round((scale+delta)*10000)/10000));
    if (next === scale) return;
    setNumericZoom(next); void renderPage();
  });
}

element('checkmark-shape').addEventListener('change', () => { cancelGesture(); status(); });
element('circle-method').addEventListener('change', () => { cancelGesture(); status(); });
element('stamp-select').addEventListener('change', () => { controls(); if (!busy) repaint(false); });
element('color').addEventListener('input', () => { if (!busy) repaint(false); });
function rotatePage(degrees) {
  if (busy) return;
  cancelGesture();
  store.rotatePage(pageNumber, degrees / 90);
  orientations.rotate(pageNumber, degrees);
  void renderPage();
}
element('rotate-left').addEventListener('click', () => rotatePage(-90));
element('rotate-right').addEventListener('click', () => rotatePage(90));
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!busy && element('zoom').value.startsWith('page-')) void renderPage(); }, 150);
});
pageElement.className = 'highlight-mode';

document.addEventListener('pointerup', event => {
  if (event.button !== 0 || busy || !['highlight','strikeout'].includes(mode)) return;
  setTimeout(() => {
    if (busy || !['highlight','strikeout'].includes(mode)) return;
    const selection = window.getSelection(), result = readSelection(selection, textLayer, pageElement);
    if (!result) return;
    add(mode === 'strikeout' ? 'text-strikeout' : 'text-highlight', { segments: result.segments }, { selectedText: result.selectedText, selectors: [] }, { color: color() });
    selection.removeAllRanges();
  }, 0);
});
pageElement.addEventListener('pointerdown', event => {
  if (event.button !== 0 || busy) return;
  const start = position(event);
  const handle = event.target.closest('.resize-handle')?.dataset.handle;
  const targetId = event.target.closest('.mark')?.dataset.annotationId;
  const target = store.get(targetId);
  if (handle && !event.ctrlKey && target && (isResizableBox(target.type) || target.type==='stamp' && target.content.allowResize) && !target.metadata.positionLocked) {
    cancelGesture(); window.getSelection()?.removeAllRanges();
    gesture = { id: target.id, original: target.geometry, resizeHandle: handle, pointerId: event.pointerId };
    suppressPlacement = true;
  } else if (mode === 'move' || event.ctrlKey) {
    if (event.ctrlKey) { cancelGesture(); suppressPlacement = true; window.getSelection()?.removeAllRanges(); }
    const id = event.target.closest('.mark')?.dataset.annotationId;
    const annotation = store.get(id);
    selectedId = annotation?.id || null;
    if (selectedId) layout.showDetail();
    if (annotation && !annotation.metadata.positionLocked) gesture = { id, start, original: annotation.geometry, pointerId: event.pointerId };
    repaint();
  } else if (mode === 'box' || (mode === 'circle' && element('circle-method').value === 'bounds')) {
    gesture = { start, type: mode, pointerId: event.pointerId };
    const size = pageSize();
    previewPoint = { x: Math.min(1, start.x + 20 / size.width), y: Math.min(1, start.y + 20 / size.height) };
    repaint(false);
  }
  if (gesture) { event.preventDefault(); pageElement.setPointerCapture(event.pointerId); }
});
pageElement.addEventListener('pointermove', event => {
  if (busy) return;
  const point = position(event), size = pageSize();
  element('mouse-coordinates').textContent = `Seite ${pageNumber}\npt: x=${(point.x * size.width).toFixed(1)} y=${(point.y * size.height).toFixed(1)}\n0–1: x=${point.x.toFixed(4)} y=${point.y.toFixed(4)}`;
  previewPoint = point;
  if (['arrow','checkmark'].includes(mode) && arrowTip) arrowDirection = point;
  if (mode === 'arrow' || mode === 'checkmark' || mode === 'stamp' || mode === 'text' || circleCenter) repaint(false);
  if (gesture?.pointerId !== event.pointerId) return;
  if (gesture.original) {
    const geometry = gesture.resizeHandle
      ? { ...gesture.original, rect: resizeGraphic(gesture.original.rect,gesture.resizeHandle,point,{minimum:{width:16/size.width,height:16/size.height},keepAspectRatio:store.get(gesture.id)?.type==='stamp' && store.get(gesture.id).content.keepAspectRatio}) }
      : translateGeometry(gesture.original, point.x - gesture.start.x, point.y - gesture.start.y);
    store.setGeometry(gesture.id,geometry);
    repaint(false);
  } else {
    repaint(false);
  }
});
pageElement.addEventListener('pointerup', event => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  const drawing = gesture; gesture = null; previewPoint = null;
  if (pageElement.hasPointerCapture(event.pointerId)) pageElement.releasePointerCapture(event.pointerId);
  if (!drawing.original) {
    const rect = dragRect(drawing.start, position(event));
    if (rect.width * displaySize().width >= 4 && rect.height * displaySize().height >= 4) add(drawing.type, { rect }, {}, { color: color() });
  }
  repaint();
});
pageElement.addEventListener('pointercancel', cancelGesture);
pageElement.addEventListener('click', event => {
  if (event.button !== 0 || busy) return;
  if (event.ctrlKey || suppressPlacement) { suppressPlacement = false; return; }
  const point = position(event), size = pageSize();
  if (mode === 'text') {
    add('free-text',{rect:textRect(point,size)},{},{color:color(),comment:'',textAlignment:'top-left'});
    setMode('move'); repaint(); element('selected-annotation').querySelector('textarea')?.focus();
  } else if (mode === 'stamp') {
    const content = stampContent();
    if (content) add('stamp', {rect:stampRect(point.x,point.y,size,content)}, {}, content);
  } else if (mode === 'checkmark') {
    if (element('checkmark-shape').value === 'plain') {
      add('checkmark', { rect: checkmarkRect(point, size) }, {}, { color: color(), shape:'plain' });
    } else if (!arrowTip) {
      arrowTip = point; arrowDirection = {x:point.x < .5 ? 1 : 0,y:point.y < .5 ? 1 : 0};
      repaint(false); status('Spitze gesetzt. Jetzt Richtung zum Nummernkreis klicken; Escape bricht ab.');
    } else {
      const geometry = pointedCheckmark(arrowTip,point,size);
      if (!geometry) { status('Andere Richtung wählen: Die ganze Prüfmarke muss auf der Seite liegen.'); return; }
      arrowTip = null; arrowDirection = null; previewPoint = null;
      add('checkmark',geometry,{}, {color:color(),shape:'pointed',diameterPt:24,tipToCenterPt:28}); status();
    }
  } else if (mode === 'circle' && ['center','square'].includes(element('circle-method').value)) {
    if (!circleCenter) {
      circleCenter = point;
      previewPoint = { x: Math.min(1, point.x + 20 / size.width), y: point.y };
      repaint(false); element('status').textContent = element('circle-method').value === 'square' ? 'Erste Ecke gesetzt. Gegenüberliegende Ecke klicken; Escape bricht ab.' : 'Mittelpunkt gesetzt. Jetzt Radius klicken; Escape bricht ab.';
    } else {
      const rect = twoClickCircle(circleCenter,point,size);
      if (!rect || rect.width * size.width < 4) { element('status').textContent = 'Andere Größe wählen: mindestens 4 pt; der Kreis muss auf der Seite liegen.'; return; }
      circleCenter = null; previewPoint = null;
      add('circle', { rect }, {}, { color: color(), circleMethod: element('circle-method').value }); status();
    }
  } else if (mode === 'arrow') {
    if (!arrowTip) {
      arrowTip = point;
      // Initial ghost points inward; mouse movement sets the tail direction.
      arrowDirection = { x: point.x < .5 ? 1 : 0, y: point.y < .5 ? 1 : 0 };
      repaint(false); element('status').textContent = 'Spitze gesetzt. Jetzt Richtung zum Pfeilende klicken; Escape bricht ab.'; }
    else {
      const geometry = shortArrow(arrowTip, point, size);
      if (!geometry) { element('status').textContent = 'Eine andere Richtung wählen: Der 40-pt-Pfeil muss auf der Seite liegen.'; return; }
      arrowTip = null; arrowDirection = null; add('arrow', geometry, {}, { color: color(), lengthPt: 40 }); status();
    }
  }
});
pageElement.addEventListener('pointerleave', () => { element('mouse-coordinates').textContent = '–'; if (['checkmark','stamp','text'].includes(mode)) { previewPoint = null; repaint(false); } });
document.addEventListener('keydown', event => {
  if (event.key === 'Control') pageElement.classList.add('ctrl-move');
  if (event.key === 'Escape' && !element('settings').open && !element('tool-help').matches(':popover-open')) {
    if (mode !== 'move' || gesture) setMode('move');
    else if (!element(lastTool).disabled) setMode(lastTool);
  }
});
document.addEventListener('keyup', event => { if (event.key === 'Control') pageElement.classList.remove('ctrl-move'); });
window.addEventListener('blur', () => { pageElement.classList.remove('ctrl-move'); cancelGesture(); });
const workspace = document.querySelector('.workspace');
workspace.addEventListener('wheel', event => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  if (busy || !documentPdf || event.deltaY === 0) return;
  const anchor = position(event), mouseX = event.clientX, mouseY = event.clientY;
  const next = Math.max(.25,Math.min(4,Math.round(scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1) * 10000) / 10000));
  if (next === scale) return;
  setNumericZoom(next);
  void renderPage().then(() => {
    if (busy) return;
    const box = pageElement.getBoundingClientRect();
    workspace.scrollLeft += box.left + anchor.x * box.width - mouseX;
    workspace.scrollTop += box.top + anchor.y * box.height - mouseY;
  });
}, { passive: false });
async function loadTestPdf() {
  if (busy && documentPdf) return;
  busy = true;
  controls();
  element('load-test-pdf').disabled = true;
  element('status').textContent = 'Test-PDF wird geladen …';
  try {
    documentPdf = await getDocument({
      url: new URL('./test.pdf', import.meta.url).href,
      standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href,
      isEvalSupported: false
    }).promise;
    pageNumber = 1;
    orientations = createPageOrientations(documentPdf.numPages);
    await renderPage();
  } catch (error) {
    fail(error);
  } finally {
    element('load-test-pdf').disabled = false;
  }
}

element('load-test-pdf').addEventListener('click', () => { void loadTestPdf(); });
busy = false;
controls();

