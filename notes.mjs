import { geometryRects } from './geometry.mjs';

export const linkedSourceTypes = ['box','circle','checkmark','arrow'];
export const isDerivedBox = type => ['linked-note','checkmark-summary'].includes(type);
export const isResizableBox = type => ['box','free-text','linked-note','checkmark-summary'].includes(type);
export const isCaptionBox = type => ['free-text','linked-note','checkmark-summary'].includes(type);

export function noteText(annotation, annotations) {
  if (annotation.type === 'linked-note') return annotations.find(a => a.id === annotation.anchor.sourceAnnotationId)?.content.comment || '';
  if (annotation.type === 'checkmark-summary') return annotations
    .filter(a => a.page === annotation.page && a.type === 'checkmark')
    .sort((a,b) => a.content.number-b.content.number)
    .map(a => `${a.content.number}. ${a.content.comment?.trim() || '–'}`).join('\n');
  return annotation.content.comment || '';
}

export function textRect(point, page, width=180, height=70) {
  const w = Math.min(1,width/page.width), h = Math.min(1,height/page.height);
  return {x:Math.max(0,Math.min(1-w,point.x)),y:Math.max(0,Math.min(1-h,point.y)),width:w,height:h};
}

export function linkedRect(source, page) {
  const r = geometryRects(source.geometry)[0];
  const point = {x:r.x+r.width+24/page.width,y:r.y};
  if (point.x+180/page.width > 1) point.x = r.x-204/page.width;
  return textRect(point,page,180,90);
}

// Facing edge midpoints. Circle edges coincide with the visible ellipse contour.
export function noteConnection(source, note, page) {
  let a = geometryRects(source.geometry)[0], b = note.geometry.rect;
  if (!a || !b) return null;
  if (source.type === 'checkmark' && source.geometry.points) {
    const c = source.geometry.points[1];
    a = {x:c.x-12/page.width,y:c.y-12/page.height,width:24/page.width,height:24/page.height};
  }
  const ac = {x:a.x+a.width/2,y:a.y+a.height/2}, bc = {x:b.x+b.width/2,y:b.y+b.height/2};
  const dx = (bc.x-ac.x)*page.width, dy = (bc.y-ac.y)*page.height;
  let target, start;
  if (Math.abs(dx) >= Math.abs(dy)) {
    target = {x:dx>=0?a.x+a.width:a.x,y:ac.y};
    start = {x:dx>=0?b.x:b.x+b.width,y:bc.y};
  } else {
    target = {x:ac.x,y:dy>=0?a.y+a.height:a.y};
    start = {x:bc.x,y:dy>=0?b.y:b.y+b.height};
  }
  if (source.type === 'arrow') target = source.geometry.points.reduce((best,p) =>
    Math.hypot((p.x-bc.x)*page.width,(p.y-bc.y)*page.height) < Math.hypot((best.x-bc.x)*page.width,(best.y-bc.y)*page.height) ? p : best);
  if (a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y) return null;
  if (Math.hypot((target.x-start.x)*page.width,(target.y-start.y)*page.height) < 1) return null;
  return {start,target};
}

