import { graphicSvg } from './graphic-core.mjs';
import { validateGraphicElements } from './graphic-validation.mjs';
import { isPaletteColor } from './palette.mjs';
const tags = new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','title','desc']);
const attributes = new Set(['xmlns','viewBox','width','height','x','y','dx','dy','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','transform','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','opacity','fill-opacity','stroke-opacity','font-size','font-family','font-weight','font-style','text-anchor','dominant-baseline']);
export function sanitizeSvg(source) {
  if (source.length > 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('SVG ist zu groß oder enthält nicht erlaubte XML-Deklarationen.');
  const doc = new DOMParser().parseFromString(source,'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg' || doc.querySelector('parsererror')) throw new Error('Ungültige SVG-Datei.');
  for (const node of [root,...root.querySelectorAll('*')]) {
    if (node.namespaceURI !== 'http://www.w3.org/2000/svg' || !tags.has(node.localName)) throw new Error('SVG enthält ein nicht unterstütztes Element.');
    for (const attr of [...node.attributes]) {
      if (!attributes.has(attr.name) || /url\s*\(|javascript:|data:|https?:/i.test(attr.value) && attr.name !== 'xmlns') throw new Error('SVG enthält ein nicht unterstütztes Attribut.');
    }
  }
  const box = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) throw new Error('SVG benötigt eine gültige viewBox.');
  return new XMLSerializer().serializeToString(root);
}
export function readStampJson(source) {
  const data = JSON.parse(source), items = Array.isArray(data) ? data : data.templates;
  if (!Array.isArray(items) || items.length > 100) throw new Error('JSON benötigt 1–100 Stempelvorlagen.');
  return items.map(item => {
    if (typeof item.label !== 'string' || !item.label.trim() || item.label.length > 40 || !isPaletteColor(item.color)) throw new Error('Ungültiger Stempeltext oder ungültige Vorlagenfarbe.');
    if (item.kind && !['text','svg'].includes(item.kind)) throw new Error('Unbekannte Stempelart.');
    let svgSource = item.svgSource ? sanitizeSvg(item.svgSource) : undefined;
    if (item.kind === 'svg' && !svgSource) throw new Error('SVG-Stempel ohne Grafik.');
    const options = {};
    for (const key of ['active','allowResize','keepAspectRatio','allowColorChange','allowTextEdit']) {
      if (item[key] !== undefined && typeof item[key] !== 'boolean') throw new Error('Ungültige Stempeloption.');
      if (item[key] !== undefined) options[key]=item[key];
    }
    for (const key of ['defaultWidth','defaultHeight']) {
      if (item[key] !== undefined && (!Number.isFinite(item[key]) || item[key]<1 || item[key]>2000)) throw new Error('Ungültige Stempelgröße.');
      if(item[key] !== undefined) options[key]=item[key];
    }
    // Imported SVG stays atomic. Structured editor data is restored only after validation.
    let elements;
    if(item.elements) {
      elements=validateGraphicElements(item.elements,sanitizeSvg);
      options.elements=elements;
      svgSource=sanitizeSvg(graphicSvg(elements,options.defaultWidth || 150,options.defaultHeight || 54));
    }
    return {...(typeof item.id==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(item.id) ? {id:item.id} : {}),label:item.label.trim(),color:item.color,description:String(item.description || '').slice(0,1000),category:String(item.category || '').slice(0,100),...options,kind:svgSource ? 'svg' : 'text',...(svgSource ? {svgSource} : {})};
  });
}

