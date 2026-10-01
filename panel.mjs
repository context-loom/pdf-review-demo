import { linkedSourceTypes, linkedRect, noteText, isDerivedBox, isResizableBox } from './notes.mjs';
import { isTextBoundType } from './store.mjs';
import { annotationTitle, coordinateText } from './overlay.mjs';
import { paintPalette, populateResults, needsReason, markingValue, markingOption, HINT_COLORS } from './palette.mjs';

export function paintPanel(container, annotations, size, store, onChange, onSelect, selectedId, editorContainer) {
  container.replaceChildren();
  editorContainer.replaceChildren();
  if (!selectedId) {
    const empty = document.createElement('p'); empty.className = 'hint';
    empty.textContent = 'Eine Markierung auf der Seite oder in der Liste auswählen.';
    editorContainer.append(empty);
  }
  for (const annotation of annotations) {
    const item = document.createElement('li');
    item.dataset.annotationId = annotation.id;
    item.classList.toggle('selected', annotation.id === selectedId);
    const heading = document.createElement('div');
    heading.className = 'annotation-heading';
    const title = document.createElement('span'); title.textContent = annotationTitle(annotation);
    const badge = document.createElement('small'); badge.className = 'annotation-result'; badge.textContent = isDerivedBox(annotation.type) ? 'Anzeige aus Markierungen' : markingOption(markingValue(annotation.content)).label; title.append(document.createElement('br'),badge);
    const select = document.createElement('button');
    select.className = 'annotation-select'; select.textContent = 'Auswählen';
    select.setAttribute('aria-label', `Auswählen: ${annotationTitle(annotation)}`);
    select.addEventListener('click', () => onSelect(annotation.id));
    heading.append(title, select); item.append(heading); container.append(item);
    if (annotation.id !== selectedId) continue;
    const editor = document.createElement('li'); editor.dataset.annotationId = annotation.id;
    const editorTitle = document.createElement('strong'); editorTitle.textContent = annotationTitle(annotation); editor.append(editorTitle);
    const remove = document.createElement('button'); remove.textContent = 'Löschen';
    remove.setAttribute('aria-label', `Markierung löschen: ${annotationTitle(annotation)}`);
    remove.addEventListener('click', () => { store.remove(annotation.id); onChange(true); });
    if (annotation.anchor.selectedText) {
      const text = document.createElement('p'); text.className = 'annotation-quote';
      text.textContent = annotation.anchor.selectedText; editor.append(text);
    }
    const coordinates = document.createElement('pre');
    coordinates.className = 'annotation-coordinates';
    coordinates.textContent = coordinateText(annotation, size);
    const lockLabel = document.createElement('label'); lockLabel.className = 'lock-label';
    if (isTextBoundType(annotation.type)) {
      lockLabel.textContent = 'Textgebunden – Position fest';
    } else {
      const lock = document.createElement('input'); lock.type = 'checkbox'; lock.checked = Boolean(annotation.metadata.positionLocked);
      lock.addEventListener('change', () => { store.setLocked(annotation.id, lock.checked); onChange(false); });
      lockLabel.append(lock, document.createTextNode('Position fixieren'));
    }
    const colorLabel = document.createElement('div'); colorLabel.className = 'color-label';
    const colorTitle = document.createElement('span'); colorTitle.textContent = 'Farbe der Markierung';
    const palette = document.createElement('div'); palette.className = 'palette';
    palette.setAttribute('role','group'); palette.setAttribute('aria-label','Farbe der Markierung');
    const renderPalette = () => {
      colorLabel.hidden = store.get(annotation.id).content.annotationType !== 'hint' || annotation.type==='stamp' && annotation.content.allowColorChange===false;
      paintPalette(palette, store.get(annotation.id).content.color, value => { store.setColor(annotation.id,value); onChange(false); }, false, HINT_COLORS);
    };
    renderPalette(); colorLabel.append(colorTitle,palette);
    const resultLabel = document.createElement('label'); resultLabel.textContent = 'Markierung';
    const result = document.createElement('select'); result.setAttribute('aria-label','Markierung'); populateResults(result,markingValue(annotation.content)); resultLabel.append(result);
    const commentLabel = document.createElement('label'); commentLabel.textContent = annotation.type === 'free-text' ? 'Text' : 'Begründung / Hinweis';
    const comment = document.createElement('textarea'); comment.rows = 2; comment.value = isDerivedBox(annotation.type) ? noteText(annotation,annotations) : annotation.content.comment || ''; comment.readOnly = isDerivedBox(annotation.type);
    const validation = document.createElement('p'); validation.className = 'reason-validation'; validation.setAttribute('role','status');
    const validate = () => {
      comment.required = needsReason(result.value);
      const invalid = comment.required && !comment.value.trim();
      comment.setAttribute('aria-invalid',String(invalid));
      validation.textContent = invalid ? 'Begründung erforderlich – Prüfergebnis noch unvollständig.' : '';
      validation.hidden = !invalid;
    };
    result.addEventListener('change', () => { store.setMarking(annotation.id,result.value); renderPalette(); badge.textContent = markingOption(result.value).label; validate(); onChange(true); });
    comment.addEventListener('input', () => { store.setComment(annotation.id, comment.value); validate(); onChange(false); });
    validate(); commentLabel.append(comment);
    const textOption = document.createElement('label'); textOption.className = 'box-text-option';
    const alignmentLabel = document.createElement('label'); alignmentLabel.textContent = 'Textausrichtung';
    if (isResizableBox(annotation.type)) {
      const alignment = document.createElement('select'); alignment.setAttribute('aria-label','Textausrichtung');
      for (const [value,label] of [['top-left','Linksbündig / oben'],['center','Mittig / mittig']]) { const option = document.createElement('option'); option.value = value; option.textContent = label; alignment.append(option); }
      alignment.value = annotation.content.textAlignment || 'center'; alignment.disabled = annotation.type === 'box' && !annotation.content.showText;
      alignment.addEventListener('change', () => { store.setTextAlignment(annotation.id,alignment.value); onChange(false); });
      alignmentLabel.append(alignment);
      const showText = document.createElement('input'); showText.type = 'checkbox'; showText.checked = Boolean(annotation.content.showText);
      showText.addEventListener('change', () => { store.setShowText(annotation.id,showText.checked); alignment.disabled = !showText.checked; onChange(false); });
      textOption.append(showText,document.createTextNode('Begründung / Hinweis in Box anzeigen'));
    }
    const details = document.createElement('details'); details.className = 'coordinates-details';
    const summary = document.createElement('summary'); summary.textContent = 'Koordinaten'; details.append(summary, coordinates);
    if (!isDerivedBox(annotation.type)) editor.append(resultLabel, colorLabel);
    editor.append(commentLabel, validation);
    if(annotation.type==='stamp' && annotation.content.allowTextEdit && annotation.content.elements) {
      const textElements=elements=>elements.flatMap(e=>e.type==='group' ? textElements(e.elements) : e.type==='text' ? [e] : []);
      for(const e of textElements(annotation.content.elements)) {const label=document.createElement('label');label.textContent='Stempeltext';const input=document.createElement('textarea');input.value=e.text;input.oninput=()=>{store.setStampText(annotation.id,input.value,e.id);onChange(false);};label.append(input);editor.append(label);}
    }
    if (linkedSourceTypes.includes(annotation.type)) {
      const linked = document.createElement('button');
      linked.textContent = annotations.some(a=>a.type==='linked-note' && a.anchor.sourceAnnotationId===annotation.id) ? 'Hinweisbox auswählen' : 'Verbundene Hinweisbox hinzufügen';
      linked.addEventListener('click', () => { const note=store.addLinkedNote(annotation.id,linkedRect(annotation,size)); if (note) onSelect(note.id); });
      editor.append(linked);
    }
    if (annotation.type === 'linked-note') {
      const source = document.createElement('button'); source.textContent = 'Ursprüngliche Markierung auswählen'; source.addEventListener('click',()=>onSelect(annotation.anchor.sourceAnnotationId)); editor.append(source);
    }
    if (annotation.type === 'box') editor.append(textOption);
    if (isResizableBox(annotation.type)) editor.append(alignmentLabel);
    editor.append(lockLabel, remove, details); editorContainer.append(editor);
  }
}

