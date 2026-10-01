import { fillPlaceholders, fillSvgText, fillGraphicElements } from './stamp-placeholders.mjs';
import { annotationId } from './store.mjs';
import { isPaletteColor } from './palette.mjs';
import { graphicSvg, textStampElements } from './graphic-core.mjs';
export function stampDefinition(item) {
  const result={description:'',category:'',active:true,defaultWidth:150,defaultHeight:54,allowResize:false,keepAspectRatio:true,allowColorChange:true,allowTextEdit:false,...structuredClone(item)};
  if (!result.svgSource) { result.elements ||= textStampElements(result.label); result.svgSource=graphicSvg(result.elements,result.defaultWidth,result.defaultHeight); }
  result.kind='svg'; return result;
}
export function stampSnapshot(template, color, values = {}) {
  const elements=template.elements ? fillGraphicElements(template.elements,values) : undefined;
  const svgSource=elements ? graphicSvg(elements,template.defaultWidth,template.defaultHeight) : Object.keys(values).length ? fillSvgText(template.svgSource,values) : template.svgSource;
  return {stampType:template.id,stampId:template.id,label:fillPlaceholders(template.label,values),kind:'svg',svgSource,
    placeholderValues:structuredClone(values),nativeSvg:Boolean(elements),elements,allowResize:template.allowResize,keepAspectRatio:template.keepAspectRatio,
    allowColorChange:template.allowColorChange,allowTextEdit:template.allowTextEdit,
    defaultWidth:template.defaultWidth,defaultHeight:template.defaultHeight,
    color:template.allowColorChange ? color : template.color};
}
export function createStampTemplates() {
  let templates = [
    {id:'test',label:'TEST',color:'#c52222'}, {id:'accepted',label:'AKZEPTIERT',color:'#16834b'}, {id:'rejected',label:'ABGELEHNT',color:'#c52222'},
  ].map(stampDefinition);
  return {
    all:()=>structuredClone(templates),get:id=>structuredClone(templates.find(t=>t.id===id)||null),
    add(label,color){if(!label.trim() || !isPaletteColor(color))return null;const t=stampDefinition({id:annotationId(),label:label.trim().slice(0,40),color});templates.push(t);return structuredClone(t);},
    update(id,label,color){const t=templates.find(t=>t.id===id);if(t && label.trim() && isPaletteColor(color)){const old=t.label;t.label=label.trim().slice(0,40);t.color=color;if(t.elements){for(const e of t.elements)if(e.type==='text' && e.text===old)e.text=t.label;t.svgSource=graphicSvg(t.elements,t.defaultWidth,t.defaultHeight);}}},
    save(id,definition){const i=templates.findIndex(t=>t.id===id);if(i<0)return;templates[i]=stampDefinition({...definition,id});},
    import(items){const added=items.map(item=>stampDefinition({...item,id:annotationId()}));templates.push(...added);return structuredClone(added);},
    replace(items){const ids=new Set();templates=items.map(item=>{const id=item.id && !ids.has(item.id) ? item.id : annotationId();ids.add(id);return stampDefinition({...item,id});});},
    remove(id){templates=templates.filter(t=>t.id!==id);},
  };
}
