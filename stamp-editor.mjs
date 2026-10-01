import { graphicSvg, snapPoint, createGraphicHistory, dragRect } from './graphic-core.mjs';
import { sanitizeSvg } from './stamp-import.mjs';
import { annotationId } from './store.mjs';
const NS='http://www.w3.org/2000/svg';
export function openStampEditor(template, onSave) {
  const dialog=document.createElement('dialog');dialog.className='graphic-editor';dialog.setAttribute('aria-label','Stempel-Editor');
  dialog.innerHTML=`<h2>Stempel-Editor</h2><div class="editor-toolbar"></div><div class="editor-body"><svg class="editor-canvas" tabindex="0" aria-label="Stempelfläche"></svg><div class="editor-properties"></div></div><p>Shift: Mehrfachauswahl / horizontale oder vertikale Linie. Doppelklick auf Text: direkt bearbeiten. SVG bleibt eine Grafik. Platzhalter im Text: {{name}}, {{initials}}, {{date}}; Werte werden beim Platzieren eingesetzt.</p><p class="editor-error" role="status"></p><div class="editor-footer"></div>`;
  document.body.append(dialog);
  let model=structuredClone(template.elements || [{id:annotationId(),type:'svg',x:0,y:0,width:template.defaultWidth,height:template.defaultHeight,...atomicSvg(template.svgSource)}]);
  const history=createGraphicHistory(model);let selected=new Set(),gesture=null,tool='select',grid=0,snapping=true,lastPick=null;
  const canvas=dialog.querySelector('svg'),properties=dialog.querySelector('.editor-properties'),toolbar=dialog.querySelector('.editor-toolbar');
  const width=template.defaultWidth,height=template.defaultHeight;
  canvas.setAttribute('viewBox',`0 0 ${width} ${height}`);canvas.style.color=template.color;
  const button=(parent,text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;parent.append(b);return b;};
  const field=(parent,text,value,onChange,type='text')=>{const label=document.createElement('label');label.textContent=text;const input=document.createElement(type==='textarea' ? 'textarea' : 'input');if(type!=='textarea')input.type=type;if(type==='checkbox')input.checked=value;else input.value=value;input.onchange=()=>onChange(type==='checkbox' ? input.checked : type==='number' ? Number(input.value) : input.value);label.append(input);parent.append(label);return input;};
  const commit=()=>{if(JSON.stringify(history.get())!==JSON.stringify(model))history.commit(model);paint();};
  const transform=(elements,fn)=>elements.map(e=>e.type==='group' ? {...e,elements:transform(e.elements,fn)} : fn(e));
  const bounds=e=>{if(e.type!=='group')return e;const items=e.elements.map(bounds);const x=Math.min(...items.map(e=>Math.min(e.x,e.x+e.width))),y=Math.min(...items.map(e=>Math.min(e.y,e.y+e.height)));return {x,y,width:Math.max(...items.map(e=>Math.max(e.x,e.x+e.width)))-x,height:Math.max(...items.map(e=>Math.max(e.y,e.y+e.height)))-y};};
  const move=(e,dx,dy)=>e.type==='group' ? {...e,elements:transform(e.elements,v=>({...v,x:v.x+dx,y:v.y+dy}))} : {...e,x:e.x+dx,y:e.y+dy};
  const change=(id,key,value)=>{model=model.map(e=>e.id===id ? {...e,[key]:value} : e);commit();};
  for(const [type,label] of [['select','Auswählen'],['rect','Rechteck'],['rounded','Abgerundet'],['ellipse','Ellipse'],['line','Linie'],['text','Text']])button(toolbar,label,()=>{tool=type;canvas.dataset.tool=type;});
  button(toolbar,'Undo',()=>{model=history.undo();paint();});button(toolbar,'Redo',()=>{model=history.redo();paint();});
  button(toolbar,'Duplizieren',()=>{model.push(...model.filter(e=>selected.has(e.id)).map(e=>({...move(structuredClone(e),3,3),id:annotationId()})));commit();});
  button(toolbar,'Löschen',()=>{model=model.filter(e=>!selected.has(e.id));selected.clear();commit();});
  button(toolbar,'Gruppieren',()=>{const elements=model.filter(e=>selected.has(e.id));if(elements.length<2)return;const id=annotationId();model=model.filter(e=>!selected.has(e.id));model.push({id,type:'group',elements});selected=new Set([id]);commit();});
  button(toolbar,'Gruppe lösen',()=>{model=model.flatMap(e=>selected.has(e.id) && e.type==='group' ? e.elements : [e]);selected.clear();commit();});
  for(const [label,front] of [['Nach vorne',true],['Nach hinten',false]])button(toolbar,label,()=>{const chosen=model.filter(e=>selected.has(e.id)),others=model.filter(e=>!selected.has(e.id));model=front ? [...others,...chosen] : [...chosen,...others];commit();});
  for(const [label,axis,mode] of [['Links ausrichten','x','start'],['Horizontal zentrieren','x','center'],['Rechts ausrichten','x','end'],['Oben ausrichten','y','start'],['Vertikal zentrieren','y','center'],['Unten ausrichten','y','end']])button(toolbar,label,()=>{
    const chosen=model.filter(e=>selected.has(e.id));if(chosen.length<2)return;const ref=bounds(chosen[0]),dimension=axis==='x' ? 'width' : 'height',factor=mode==='center' ? .5 : mode==='end' ? 1 : 0;
    model=model.map(e=>{if(!selected.has(e.id))return e;const b=bounds(e),delta=ref[axis]+ref[dimension]*factor-b[axis]-b[dimension]*factor;return move(e,axis==='x' ? delta : 0,axis==='y' ? delta : 0);});commit();
  });
  field(toolbar,'Raster',0,v=>{grid=Math.max(0,v);},'number');field(toolbar,'Snapping',true,v=>{snapping=v;},'checkbox');
  const file=field(toolbar,'SVG ergänzen','',async()=>{},'file');file.accept='.svg,image/svg+xml';file.onchange=async()=>{try{const source=sanitizeSvg(await file.files[0].text());model.push({id:annotationId(),type:'svg',x:5,y:5,width:width/2,height:height/2,...atomicSvg(source)});commit();}catch(e){alert(e.message);}file.value='';};
  function paint() {
    // Generated content includes only primitives and sanitized atomic SVG.
    canvas.innerHTML=graphicSvg([],width,height).replace(/<svg[^>]*>|<\/svg>/g,'');
    for(const e of model){const wrapper=document.createElementNS(NS,'g');wrapper.dataset.elementId=e.id;
      const doc=new DOMParser().parseFromString(graphicSvg([e],width,height),'image/svg+xml');wrapper.append(...Array.from(doc.documentElement.children));canvas.append(wrapper);
      if(selected.has(e.id)){const b=bounds(e),rect=document.createElementNS(NS,'rect');for(const [k,v]of Object.entries({x:b.x,y:b.y,width:Math.max(1,b.width),height:Math.max(1,b.height),fill:'none',stroke:'#2672bb','stroke-width':.5,'stroke-dasharray':'2 1'}))rect.setAttribute(k,v);rect.style.pointerEvents='none';canvas.append(rect);
        const handle=document.createElementNS(NS,'rect');for(const[k,v]of Object.entries({x:b.x+b.width-1.5,y:b.y+b.height-1.5,width:3,height:3,fill:'white',stroke:'#2672bb','stroke-width':.5}))handle.setAttribute(k,v);handle.dataset.resize=e.id;canvas.append(handle);
      }
    }
    properties.replaceChildren();
    const chosen=model.filter(e=>selected.has(e.id));
    if(chosen.length===1){const e=chosen[0];
      if(e.type!=='group')for(const[k,label]of [['x','X'],['y','Y'],['width','Breite'],['height','Höhe'],['strokeWidth','Rahmenstärke']])field(properties,label,e[k]??1.5,v=>{if(Number.isFinite(v) && Math.abs(v)<=2000)change(e.id,k,v);},'number');
      if(e.type==='rect')field(properties,'Eckenradius',e.rx||0,v=>change(e.id,'rx',Math.max(0,v)),'number');
      if(!['svg','group'].includes(e.type))for(const k of ['fill','stroke'])field(properties,k==='fill' ? 'Füllfarbe (currentColor / none / #hex)' : 'Linienfarbe (currentColor / none / #hex)',e[k] || (k==='fill' ? 'none' : 'currentColor'),v=>{if(/^(currentColor|none|#[0-9a-f]{3,8})$/i.test(v))change(e.id,k,v);});
      if(e.type==='text'){
        field(properties,'Text',e.text,v=>change(e.id,'text',v),'textarea');field(properties,'Schriftgröße',e.fontSize||11,v=>change(e.id,'fontSize',Math.max(1,Math.min(200,v))),'number');
        field(properties,'Fett',e.bold,v=>change(e.id,'bold',v),'checkbox');field(properties,'Kursiv',e.italic,v=>change(e.id,'italic',v),'checkbox');
        for(const [v,label]of [['top','Oben'],['middle','Vertikal mittig'],['bottom','Unten']])button(properties,label,()=>change(e.id,'verticalAlign',v));
        for(const [v,label]of [['start','Linksbündig'],['middle','Mittig'],['end','Rechtsbündig']])button(properties,label,()=>change(e.id,'align',v));
      }
    }
    const list=document.createElement('div');list.className='editor-elements';properties.append(list);
    for(const e of model)button(list,`${selected.has(e.id) ? '✓ ' : ''}${e.type}: ${e.text || e.id.slice(0,8)}`,()=>{selected=new Set([e.id]);paint();});
  }
  function point(event){const matrix=canvas.getScreenCTM().inverse();return new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix);}
  const constrain=p=>({x:Math.max(0,Math.min(width,p.x)),y:Math.max(0,Math.min(height,p.y))});
  canvas.onpointerdown=event=>{
    if(event.button!==0)return;const p=constrain(point(event)),resize=event.target.dataset.resize,id=resize || event.target.closest('[data-element-id]')?.dataset.elementId;
    if(tool==='select'){
      if(id && model.find(e=>e.id===id)?.type==='text') {
        const now=Date.now();if(lastPick?.id===id && now-lastPick.time<450){lastPick=null;gesture=null;editText(id);event.preventDefault();return;}lastPick={id,time:now};
      } else lastPick=null;
      if(id){if(event.shiftKey){if(selected.has(id))selected.delete(id);else selected.add(id);}else if(!selected.has(id))selected=new Set([id]);gesture={start:p,original:structuredClone(model),resize,id};}
      else {if(!event.shiftKey)selected.clear();gesture={start:p,original:structuredClone(model),selection:true,initial:new Set(selected)};}
    }else {const original=structuredClone(model),id=annotationId(),type=tool==='rounded' ? 'rect' : tool;const e={id,type,x:p.x,y:p.y,width:0,height:0,rx:tool==='rounded' ? 3 : 0};if(type==='text')Object.assign(e,{width:width/2,height:18,text:'Text',fontSize:11,fill:'currentColor',align:'start'});model.push(e);selected=new Set([id]);gesture={start:p,id,create:true,original};}
    canvas.setPointerCapture(event.pointerId);paint();event.preventDefault();
  };
  canvas.onpointermove=event=>{
    if(!gesture)return;let p=constrain(point(event));if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>2)lastPick=null;p=snapPoint(p,snapping ? gesture.original.filter(e=>!selected.has(e.id)).map(bounds) : [],{grid,tolerance:width/canvas.clientWidth*6,origin:gesture.start,axis:event.shiftKey && tool==='line'});
    if(gesture.selection){const x=Math.min(p.x,gesture.start.x),y=Math.min(p.y,gesture.start.y),w=Math.abs(p.x-gesture.start.x),h=Math.abs(p.y-gesture.start.y);selected=new Set([...gesture.initial,...model.filter(e=>{const b=bounds(e);return b.x>=x && b.y>=y && b.x+b.width<=x+w && b.y+b.height<=y+h;}).map(e=>e.id)]);}
    else if(gesture.create)model=model.map(e=>e.id===gesture.id && e.type!=='text' ? {...e,...(e.type==='line' ? {x:gesture.start.x,y:gesture.start.y,width:p.x-gesture.start.x,height:p.y-gesture.start.y} : dragRect(gesture.start,p))} : e);
    else if(gesture.resize)model=gesture.original.map(e=>{if(e.id!==gesture.id)return e;const b=bounds(e),w=Math.max(1,p.x-b.x),h=Math.max(1,p.y-b.y);return e.type==='group' ? {...e,elements:transform(e.elements,v=>({...v,x:b.x+(v.x-b.x)*w/Math.max(1,b.width),y:b.y+(v.y-b.y)*h/Math.max(1,b.height),width:v.width*w/Math.max(1,b.width),height:v.height*h/Math.max(1,b.height),...(v.fontSize ? {fontSize:v.fontSize*h/Math.max(1,b.height)} : {}),...(v.strokeWidth ? {strokeWidth:v.strokeWidth*Math.min(w/Math.max(1,b.width),h/Math.max(1,b.height))} : {})}))} : {...e,width:w,height:h};});
    else {let dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;
      const first=gesture.original.find(e=>selected.has(e.id));
      if(snapping && first){const b=bounds(first),others=gesture.original.filter(e=>!selected.has(e.id)).map(bounds),tolerance=width/canvas.clientWidth*6;
        for(const axis of ['x','y']){const dimension=axis==='x' ? 'width' : 'height',delta=axis==='x' ? dx : dy;let correction=Infinity;
          for(const factor of [0,.5,1]){const point={x:b.x+dx,y:b.y+dy};point[axis]+=b[dimension]*factor;const snapped=snapPoint(point,others,{tolerance});const shift=snapped[axis]-point[axis];if(shift!==0 && Math.abs(shift)<Math.abs(correction))correction=shift;}
          if(Number.isFinite(correction)){if(axis==='x')dx+=correction;else dy+=correction;}
        }
      }
      model=gesture.original.map(e=>selected.has(e.id) ? move(e,dx,dy) : e);}
    paint();
  };
  canvas.onpointerup=event=>{if(!gesture)return;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);const creation=gesture.create;gesture=null;commit();if(creation)tool='select';};
  canvas.onpointercancel=()=>{if(gesture){model=gesture.original;gesture=null;paint();}};
  canvas.ondblclick=event=>editText(event.target.closest('[data-element-id]')?.dataset.elementId);
  function editText(id) {
    const e=model.find(e=>e.id===id);if(e?.type!=='text' || dialog.querySelector('.inline-text'))return;
    const input=document.createElement('textarea');input.className='inline-text';input.value=e.text;const box=canvas.getBoundingClientRect(),db=dialog.getBoundingClientRect(),origin=new DOMPoint(e.x,e.y).matrixTransform(canvas.getScreenCTM());Object.assign(input.style,{left:`${origin.x-db.left+dialog.scrollLeft}px`,top:`${origin.y-db.top+dialog.scrollTop}px`,width:`${Math.max(60,e.width/width*box.width)}px`,height:`${Math.max(40,e.height/height*box.height)}px`,fontFamily:'Arial',fontSize:`${e.fontSize*box.width/width}px`,fontWeight:e.bold?'bold':'normal',fontStyle:e.italic?'italic':'normal',textAlign:e.align==='middle' ? 'center' : e.align==='end' ? 'right' : 'left'});dialog.append(input);input.focus();input.select();input.onblur=()=>{change(id,'text',input.value);input.remove();};input.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Escape'){input.value=e.text;input.blur();}};
  };
  dialog.onkeydown=event=>{if(event.target.matches('input,textarea'))return;if(event.ctrlKey && ['z','y'].includes(event.key.toLowerCase())){event.preventDefault();model=event.key.toLowerCase()==='y' || event.shiftKey ? history.redo() : history.undo();paint();}if(event.key==='Escape' && gesture){event.preventDefault();model=gesture.original;gesture=null;paint();}};
  const footer=dialog.querySelector('.editor-footer');
  button(footer,'Speichern',()=>{try {const svgSource=sanitizeSvg(graphicSvg(model,width,height));onSave({...template,elements:structuredClone(model),svgSource});dialog.close();}catch(error){dialog.querySelector('.editor-error').textContent=error.message;}});button(footer,'Abbrechen',()=>dialog.close());dialog.onclose=()=>dialog.remove();paint();dialog.showModal();
}
export function atomicSvg(source) {
  const root=new DOMParser().parseFromString(sanitizeSvg(source),'image/svg+xml').documentElement;
  return {viewBox:root.getAttribute('viewBox'),body:[...root.childNodes].map(n=>new XMLSerializer().serializeToString(n)).join('')};
}
