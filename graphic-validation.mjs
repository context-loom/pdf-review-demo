export function validateGraphicElements(elements, sanitize, depth=0) {
  if(!Array.isArray(elements) || elements.length>200 || depth>8)throw new Error('Ungültige Grafikelemente.');
  return elements.map(e=>{
    if(!['rect','ellipse','line','text','svg','group'].includes(e.type))throw new Error('Unbekanntes Grafikelement.');
    if(e.type==='group' && (!e.elements || !e.elements.length))throw new Error('Leere Grafikgruppe.');
    if(e.type==='group')return {id:String(e.id),type:'group',elements:validateGraphicElements(e.elements,sanitize,depth+1)};
    for(const key of ['x','y','width','height'])if(!Number.isFinite(e[key]) || Math.abs(e[key])>10000)throw new Error('Ungültige Grafikgeometrie.');
    if(e.type==='svg') {
      const source=sanitize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${String(e.viewBox).replace(/"/g,'&quot;')}">${e.body}</svg>`);
      const root=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
      return {id:String(e.id),type:'svg',x:e.x,y:e.y,width:e.width,height:e.height,viewBox:root.getAttribute('viewBox'),body:[...root.childNodes].map(n=>new XMLSerializer().serializeToString(n)).join('')};
    }
    for(const key of ['fill','stroke'])if(e[key] && !/^(none|currentColor|#[0-9a-f]{3,8})$/i.test(e[key]))throw new Error('Ungültige Grafikfarbe.');
    for(const key of ['fontSize','strokeWidth','rx'])if(e[key]!==undefined && (!Number.isFinite(e[key]) || e[key]<0 || e[key]>2000))throw new Error('Ungültige Grafikgröße.');
    return {id:String(e.id),type:e.type,x:e.x,y:e.y,width:e.width,height:e.height,fill:e.fill,stroke:e.stroke,fontSize:e.fontSize,strokeWidth:e.strokeWidth,rx:e.rx,text:String(e.text || '').slice(0,4000),verticalAlign:['top','middle','bottom'].includes(e.verticalAlign) ? e.verticalAlign : 'top',bold:Boolean(e.bold),italic:Boolean(e.italic),align:['start','middle','end'].includes(e.align) ? e.align : 'middle'};
  });
}
