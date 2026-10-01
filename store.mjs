import { linkedSourceTypes, isDerivedBox, isResizableBox } from './notes.mjs';
import { graphicSvg } from './graphic-core.mjs';
import { rotateGeometry } from './geometry.mjs';
import { isHintColor, markingOption } from './palette.mjs';
// randomUUID requires HTTPS/localhost. getRandomValues also works on LAN HTTP.
export function annotationId(cryptoProvider = globalThis.crypto) {
  if (typeof cryptoProvider.randomUUID === 'function') return cryptoProvider.randomUUID();
  const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const isTextBoundType = type => ['text-highlight','text-strikeout'].includes(type);

export function createAnnotationStore() {
  let annotations = [];
  let nextCheckNumber = 1;
  return {
    add(type, page, geometry, anchor = {}, content = {}) {
      const classification = content.annotationType === 'hint' ? 'hint' : (content.reviewResult || 'unreviewed');
      if (!markingOption(classification) || ![undefined,'hint','review'].includes(content.annotationType)) throw new TypeError('Invalid annotation classification');
      const cleanContent = structuredClone(content);
      delete cleanContent.isHint; delete cleanContent.isReview;
      const annotation = {
        id: annotationId(), type, documentRef: 'synthetic-test-v1', page,
        anchor: structuredClone(anchor),
        geometry: { coordinateSystem: 'normalized-page', rotationDeg: 0, ...structuredClone(geometry) },
        content: { ...cleanContent, annotationType: classification === 'hint' ? 'hint' : 'review', reviewResult: classification === 'hint' ? null : classification },
        metadata: { author: 'PoC-Prüfer', createdAt: new Date().toISOString(), reason: '', valid: true, positionLocked: isTextBoundType(type) },
      };
      if (type !== 'stamp' && classification === 'hint' && !isHintColor(annotation.content.color)) annotation.content.color = '#3366ff';
      if (type === 'arrow' && classification !== 'hint') annotation.content.color = markingOption(classification).color;
      if (isResizableBox(type)) annotation.content.textAlignment = ['top-left','center'].includes(annotation.content.textAlignment) ? annotation.content.textAlignment : (type === 'box' ? 'center' : 'top-left');
      if (type === 'checkmark') annotation.content.number = nextCheckNumber++;
      annotations.push(annotation);
      return structuredClone(annotation);
    },
    addLinkedNote(sourceId, rect) {
      const source = annotations.find(a => a.id === sourceId);
      if (!source || !linkedSourceTypes.includes(source.type)) return null;
      const existing = annotations.find(a => a.type === 'linked-note' && a.anchor.sourceAnnotationId === sourceId);
      return existing ? structuredClone(existing) : this.add('linked-note',source.page,{rect},{sourceAnnotationId:sourceId},{annotationType:'hint',textAlignment:'top-left'});
    },
    addCheckmarkSummary(page, rect) {
      const existing = annotations.find(a => a.type === 'checkmark-summary' && a.page === page);
      return existing ? structuredClone(existing) : this.add('checkmark-summary',page,{rect},{scope:'page',sourceType:'checkmark'},{annotationType:'hint',color:'#000000',textAlignment:'top-left'});
    },
    remove(id) { annotations = annotations.filter(a => a.id !== id && !(a.type === 'linked-note' && a.anchor.sourceAnnotationId === id)); },
    setComment(id, comment) {
      const annotation = annotations.find(annotation => annotation.id === id);
      if (annotation && !isDerivedBox(annotation.type)) annotation.content.comment = comment;
    },
    get(id) { const annotation = annotations.find(item => item.id === id); return annotation ? structuredClone(annotation) : null; },
    setColor(id, color) {
      const annotation = annotations.find(item => item.id === id);
      if (annotation?.type === 'stamp' && annotation.content.allowColorChange === false) return;
      if (annotation && !isDerivedBox(annotation.type) && annotation.content.annotationType === 'hint' && isHintColor(color)) annotation.content.color = color;
    },
    setStampText(id, text, elementId) {
      const annotation=annotations.find(a=>a.id===id);
      if(annotation?.type!=='stamp' || !annotation.content.allowTextEdit || !annotation.content.elements)return;
      const update=elements=>elements.map(e=>e.type==='group' ? {...e,elements:update(e.elements)} : e.type==='text' && (!elementId || e.id===elementId) ? {...e,text:String(text).slice(0,1000)} : e);
      annotation.content.elements=update(annotation.content.elements);
      annotation.content.svgSource=graphicSvg(annotation.content.elements,annotation.content.defaultWidth,annotation.content.defaultHeight);
    },
    setTextAlignment(id, value) {
      const annotation = annotations.find(item => item.id === id);
      if (annotation && isResizableBox(annotation.type) && ['top-left','center'].includes(value)) annotation.content.textAlignment = value;
    },
    setShowText(id, value) {
      const annotation = annotations.find(item => item.id === id);
      if (annotation?.type === 'box') annotation.content.showText = Boolean(value);
    },
    setMarking(id, value) {
      const annotation = annotations.find(item => item.id === id), result = markingOption(value);
      if (!annotation || !result || isDerivedBox(annotation.type)) return;
      const hint = value === 'hint';
      annotation.content.annotationType = hint ? 'hint' : 'review';
      annotation.content.reviewResult = hint ? null : value;
      if (annotation.type === 'text-strikeout' && value === 'ok') annotation.type = 'text-highlight';
      if (annotation.type !== 'stamp' || annotation.content.allowColorChange !== false) annotation.content.color = result.color;
    },
    setReviewResult(id, value) { if (value !== 'hint') this.setMarking(id,value); },
    setLocked(id, locked) {
      const annotation = annotations.find(item => item.id === id);
      if (annotation) annotation.metadata.positionLocked = isTextBoundType(annotation.type) || Boolean(locked);
    },
    setGeometry(id, geometry) {
      const annotation = annotations.find(item => item.id === id);
      if (!annotation || isTextBoundType(annotation.type) || annotation.metadata.positionLocked) return;
      if(annotation.type==='stamp') {
        const old=annotation.geometry.rect,next=geometry.rect;
        if(!next)return;
        const changed=Math.abs(next.width-old.width)>1e-9 || Math.abs(next.height-old.height)>1e-9;
        if(changed && !annotation.content.allowResize)return;
        if(changed && annotation.content.keepAspectRatio && Math.abs(next.width/next.height-old.width/old.height)>1e-6)return;
      }
      annotation.geometry = structuredClone(geometry);
    },
    nextCheckNumber() { return nextCheckNumber; },
    rotatePage(page, quarterTurns) {
      // Position locks prevent manual moves; page-frame changes include locked marks.
      for (const annotation of annotations) if (annotation.page === page) annotation.geometry = rotateGeometry(annotation.geometry, quarterTurns);
    },
    forPage(page) { return structuredClone(annotations.filter(annotation => annotation.page === page)); },
    all() { return structuredClone(annotations); },
  };
}

