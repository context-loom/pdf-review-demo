// Document-free primitives shared by PDF tools and stamp composition.
export { dragRect, renderRect, resizeRect, translateGeometry } from './geometry.mjs';
import { resizeRect } from './geometry.mjs';
export const clone = value => structuredClone(value);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function snapPoint(point, elements, { grid = 0, tolerance = 4, origin = null, axis = false } = {}) {
  const p = {...point};
  if (grid > 0) { p.x = Math.round(p.x/grid)*grid; p.y = Math.round(p.y/grid)*grid; }
  for (const key of ['x','y']) {
    const dimension = key === 'x' ? 'width' : 'height';
    const candidates = elements.flatMap(e => [e[key],e[key]+e[dimension]/2,e[key]+e[dimension]]);
    const nearest = candidates.sort((a,b)=>Math.abs(a-point[key])-Math.abs(b-point[key]))[0];
    if (Math.abs(nearest-point[key]) <= tolerance) p[key] = nearest;
  }
  if (axis && origin) {
    if (Math.abs(p.x-origin.x) >= Math.abs(p.y-origin.y)) p.y=origin.y; else p.x=origin.x;
  }
  return p;
}
export function resizeGraphic(rect, handle, point, { minimum = {width:.01,height:.01}, keepAspectRatio = false } = {}) {
  if (!keepAspectRatio) return resizeRect(rect,handle,point,minimum);
  const opposite = {x:handle.includes('w') ? rect.x+rect.width : rect.x,y:handle.includes('n') ? rect.y+rect.height : rect.y};
  let factor = Math.max(minimum.width/rect.width,minimum.height/rect.height,
    handle.includes('w') || handle.includes('e') ? Math.abs(point.x-opposite.x)/rect.width : Math.abs(point.y-opposite.y)/rect.height);
  factor = Math.min(factor,(handle.includes('w') ? opposite.x : 1-opposite.x)/rect.width,(handle.includes('n') ? opposite.y : 1-opposite.y)/rect.height);
  const width=rect.width*factor,height=rect.height*factor;
  return {x:handle.includes('w') ? opposite.x-width : opposite.x,y:handle.includes('n') ? opposite.y-height : opposite.y,width,height};
}
export function graphicSvg(elements, width=150, height=54) {
  const draw = e => {
    const attrs = `stroke="${escape(e.stroke || 'currentColor')}" stroke-width="${Number(e.strokeWidth ?? 1.5)}" fill="${escape(e.fill || 'none')}"`;
    if(e.type==='group') return `<g>${e.elements.map(draw).join('')}</g>`;
    if(e.type==='svg') return `<svg x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" viewBox="${escape(e.viewBox)}">${e.body}</svg>`;
    if(e.type==='text') {
      const anchor=e.align || 'middle',x=anchor==='start' ? e.x : anchor==='end' ? e.x+e.width : e.x+e.width/2;
      const font=Number(e.fontSize || 11),lines=String(e.text || '').split('\n');
      const textHeight=lines.length*font*1.2,y=e.y+font+(e.verticalAlign==='bottom' ? e.height-textHeight : e.verticalAlign==='middle' ? (e.height-textHeight)/2 : 0);
      return `<text x="${x}" y="${y}" fill="${escape(e.fill || 'currentColor')}" font-family="Arial" font-size="${font}" font-weight="${e.bold ? 'bold' : 'normal'}" font-style="${e.italic ? 'italic' : 'normal'}" text-anchor="${anchor}">${lines.map((line,i)=>`<tspan x="${x}" dy="${i ? font*1.2 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
    }
    if(e.type==='line') return `<line x1="${e.x}" y1="${e.y}" x2="${e.x+e.width}" y2="${e.y+e.height}" ${attrs}/>`;
    if(e.type==='ellipse') return `<ellipse cx="${e.x+e.width/2}" cy="${e.y+e.height/2}" rx="${e.width/2}" ry="${e.height/2}" ${attrs}/>`;
    return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="${e.rx || 0}" ${attrs}/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${elements.map(draw).join('')}</svg>`;
}
export function createGraphicHistory(initial) {
  let states=[clone(initial)],index=0;
  return {get:()=>clone(states[index]),commit(value){states=states.slice(0,index+1);states.push(clone(value));index++;},undo(){index=Math.max(0,index-1);return this.get();},redo(){index=Math.min(states.length-1,index+1);return this.get();}};
}
export function textStampElements(text) {
  return [{id:'frame',type:'rect',x:1,y:1,width:148,height:52,rx:3},
    {id:'label',type:'text',x:5,y:18,width:140,height:25,text,fontSize:13,bold:true,align:'middle'}];
}
