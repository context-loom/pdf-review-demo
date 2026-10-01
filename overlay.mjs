import { noteText, noteConnection, isCaptionBox, isResizableBox } from './notes.mjs';
import { isTextBoundType } from './store.mjs';
import { renderRect } from './graphic-core.mjs';
import { geometryRects } from './geometry.mjs';

export const annotationTitle = annotation => ({ 'text-highlight': 'Highlight', 'text-strikeout': 'Durchstreichen', box: 'Box', circle: 'Kreis / Ellipse', arrow: 'Pfeil', 'free-text':'Text', 'linked-note':'Verbundene Hinweisbox', 'checkmark-summary':'Prüfmarken-Sammelbox' })[annotation.type]
  || (annotation.type === 'checkmark' ? `Prüfmarke ${annotation.content.number}` : annotation.content.label);

export function paintOverlay(layer, annotations, size, scale, selectedId) {
  layer.replaceChildren();
  // Connectors are derived on repaint, below marks, with no separate editable state.
  for (const note of annotations.filter(a => a.type === 'linked-note')) {
    const source = annotations.find(a => a.id === note.anchor.sourceAnnotationId);
    if (!source) continue;
    const connection = noteConnection(source,note,{width:size.width/scale,height:size.height/scale});
    if (!connection) continue;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.classList.add('note-connector'); svg.dataset.noteId = note.id;
    const {start,target} = connection, x1=start.x*size.width,y1=start.y*size.height,x2=target.x*size.width,y2=target.y*size.height;
    const color = source.content.color || '#3366ff';
    const line = document.createElementNS(svg.namespaceURI,'line');
    for (const [k,v] of Object.entries({x1,y1,x2,y2,stroke:color,'stroke-width':scale})) line.setAttribute(k,v);
    const length=Math.hypot(x2-x1,y2-y1), ux=(x2-x1)/length,uy=(y2-y1)/length;
    const head=document.createElementNS(svg.namespaceURI,'polygon');
    head.setAttribute('points',`${x2},${y2} ${x2-ux*7*scale-uy*3*scale},${y2-uy*7*scale+ux*3*scale} ${x2-ux*7*scale+uy*3*scale},${y2-uy*7*scale-ux*3*scale}`); head.setAttribute('fill',color);
    svg.append(line,head); layer.append(svg);
  }
  for (const annotation of annotations) {
    for (const rect of geometryRects(annotation.geometry)) {
      const mark = document.createElement('div');
      mark.className = `mark ${annotation.type === 'text-highlight' ? 'highlight' : annotation.type === 'text-strikeout' ? 'strikeout' : annotation.type}`;
      mark.dataset.annotationId = annotation.id;
      mark.classList.toggle('preview', annotation.id === 'preview');
      mark.classList.toggle('selected', annotation.id === selectedId);
      mark.classList.toggle('locked', Boolean(annotation.metadata.positionLocked));
      mark.classList.toggle('text-bound', isTextBoundType(annotation.type));
      const color = (annotation.type === 'linked-note' ? annotations.find(a=>a.id===annotation.anchor.sourceAnnotationId)?.content.color : annotation.content.color) || (annotation.type === 'text-highlight' ? '#ffdf00' : '#c52222');
      mark.style.setProperty('--mark-color', color);
      if (annotation.type === 'text-highlight') mark.style.backgroundColor = `${color}66`;
      for (const [key, value] of Object.entries(renderRect(rect, size))) mark.style[key] = `${value}px`;
      if (annotation.type === 'circle' && annotation.id === 'preview' && annotation.content.circleMethod === 'square') {
        const bounds = document.createElement('div'); bounds.className = 'circle-bounds'; mark.append(bounds);
      }
      if (annotation.type === 'text-strikeout') {
        const line = document.createElement('div'); line.className = 'strikeout-line';
        const rotated = (annotation.geometry.rotationDeg || 0) % 180 !== 0;
        Object.assign(line.style, rotated
          ? {left:'50%',top:'0',width:`${2*scale}px`,height:'100%'}
          : {left:'0',top:'50%',width:'100%',height:`${2*scale}px`});
        line.style.backgroundColor = color; mark.append(line);
      }
      if (annotation.type === 'stamp' || (annotation.type === 'checkmark' && !annotation.geometry.points)) {
        mark.style.fontSize = `${(annotation.type === 'checkmark' ? 15 : 13) * scale}px`;
        const title = annotation.content.nativeSvg ? new DOMParser().parseFromString(annotation.content.svgSource,'image/svg+xml').documentElement : document.createElement(annotation.content.svgSource ? 'img' : 'strong');
        if (annotation.content.svgSource && !annotation.content.nativeSvg) { title.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(annotation.content.svgSource)}`; title.alt = annotation.content.label; }
        if (!annotation.content.nativeSvg) title.textContent = annotation.type === 'checkmark' ? annotation.content.number : annotation.content.label;
        title.style.color=color;
        if(annotation.content.nativeSvg) title.setAttribute('preserveAspectRatio',annotation.content.keepAspectRatio===false ? 'none' : 'xMidYMid meet');
        else if(annotation.content.svgSource && annotation.content.keepAspectRatio===false) title.style.objectFit='fill';
        if(annotation.content.svgSource && !annotation.content.nativeSvg) title.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(annotation.content.svgSource.replace(/currentColor/g,color).replace(/<svg /,'<svg preserveAspectRatio="'+(annotation.content.keepAspectRatio===false ? 'none' : 'xMidYMid meet')+'" '))}`;
        const rotation = annotation.geometry.rotationDeg || 0;
        if (rotation) {
          const pixels = renderRect(rect, size), odd = rotation % 180 !== 0;
          title.style.position = 'absolute'; title.style.display = 'flex';
          title.style.alignItems = 'center'; title.style.justifyContent = 'center';
          title.style.width = `${odd ? pixels.height : pixels.width}px`;
          title.style.height = `${odd ? pixels.width : pixels.height}px`;
          title.style.transform = `rotate(${rotation}deg)`;
        }
        mark.append(title);
      }
      if (annotation.type === 'checkmark' && annotation.geometry.points) {
        mark.classList.add('pointed');
        const [tip, center] = annotation.geometry.points;
        const tx = (tip.x-rect.x)*size.width, ty = (tip.y-rect.y)*size.height;
        const cx = (center.x-rect.x)*size.width, cy = (center.y-rect.y)*size.height;
        const length = Math.hypot(tx-cx,ty-cy), ux = (tx-cx)/length, uy = (ty-cy)/length;
        const radius = 12*scale, base = 10*scale, half = Math.sqrt(radius*radius-base*base);
        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        const node = (name, attrs) => {
          const child = document.createElementNS(svg.namespaceURI,name);
          for (const [key,value] of Object.entries(attrs)) child.setAttribute(key,value);
          svg.append(child); return child;
        };
        node('circle',{cx,cy,r:radius-scale,fill:`color-mix(in srgb, ${color} 8%, white)`,stroke:color,'stroke-width':2*scale});
        node('polygon',{points:`${tx},${ty} ${cx+ux*base-uy*half},${cy+uy*base+ux*half} ${cx+ux*base+uy*half},${cy+uy*base-ux*half}`,fill:color});
        const number = node('text',{x:cx,y:cy,'text-anchor':'middle','dominant-baseline':'central',fill:color,'font-size':15*scale,'font-weight':'bold',transform:`rotate(${annotation.geometry.rotationDeg || 0} ${cx} ${cy})`});
        number.textContent = annotation.content.number; mark.append(svg);
      }
      if (annotation.type === 'arrow') {
        const [tip, tail] = annotation.geometry.points;
        const x = (tip.x - tail.x) * size.width;
        const y = (tip.y - tail.y) * size.height;
        const length = Math.hypot(x, y);
        const ux = x / length, uy = y / length;
        const tx = (tip.x - rect.x) * size.width, ty = (tip.y - rect.y) * size.height;
        const sx = (tail.x - rect.x) * size.width, sy = (tail.y - rect.y) * size.height;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.overflow = 'visible';
        const line = document.createElementNS(svg.namespaceURI, 'line');
        for (const [key, value] of Object.entries({ x1: sx, y1: sy, x2: tx, y2: ty, stroke: color, 'stroke-width': 2 * scale })) line.setAttribute(key, value);
        const head = document.createElementNS(svg.namespaceURI, 'polygon');
        const h = 10 * scale, w = 4.5 * scale;
        head.setAttribute('points', `${tx},${ty} ${tx-ux*h-uy*w},${ty-uy*h+ux*w} ${tx-ux*h+uy*w},${ty-uy*h-ux*w}`);
        head.setAttribute('fill', color);
        svg.append(line, head); mark.append(svg);
        // Hit target includes horizontal/vertical arrows; drawing remains anchored.
        mark.style.minWidth = '8px'; mark.style.minHeight = '8px';
      }
      let caption, captionText;
      const text = noteText(annotation,annotations);
      if ((annotation.type === 'box' && annotation.content.showText && text.trim()) || isCaptionBox(annotation.type)) {
        caption = document.createElement('div'); caption.className = 'box-caption';
        if (isCaptionBox(annotation.type)) caption.style.color = color;
        captionText = document.createElement('div'); captionText.className = 'box-caption-text'; captionText.textContent = text || (annotation.type === 'free-text' ? 'Text …' : annotation.type === 'linked-note' ? 'Begründung / Hinweis …' : 'Keine Prüfmarken auf dieser Seite'); captionText.classList.toggle('placeholder', !text); caption.append(captionText);
        const topLeft = annotation.content.textAlignment === 'top-left';
        caption.style.textAlign = topLeft ? 'left' : 'center'; caption.style.justifyContent = topLeft ? 'flex-start' : 'center';
        caption.style.padding = `${4*scale}px`;
        const pixels = renderRect(rect,size), rotation = annotation.geometry.rotationDeg || 0, odd = rotation % 180 !== 0;
        caption.style.width = `${odd ? pixels.height : pixels.width}px`;
        caption.style.height = `${odd ? pixels.width : pixels.height}px`;
        caption.style.transform = `translate(-50%,-50%) rotate(${rotation}deg)`;
        mark.append(caption);
      }
      if ((isResizableBox(annotation.type) || annotation.type==='stamp' && annotation.content.allowResize) && annotation.id === selectedId && !annotation.metadata.positionLocked) {
        for (const handle of (annotation.type==='stamp' && annotation.content.keepAspectRatio ? ['nw','ne','se','sw'] : ['nw','n','ne','e','se','s','sw','w'])) {
          const node = document.createElement('span'); node.className = `resize-handle handle-${handle}`;
          node.dataset.handle = handle; node.title = 'Boxgröße ändern'; mark.append(node);
        }
      }
      layer.append(mark);
      if (caption) {
        // Fit wrapped text to the current box; rendering does not change the model.
        const maximum = 11*scale;
        const fits = () => captionText.scrollWidth <= captionText.clientWidth && captionText.scrollHeight <= caption.clientHeight - 8*scale;
        caption.style.fontSize = `${maximum}px`;
        if (!fits()) {
          let low = .5*scale, high = maximum;
          for (let step=0;step<12;step++) {
            const font = (low+high)/2; caption.style.fontSize = `${font}px`;
            if (fits()) low = font; else high = font;
          }
          caption.style.fontSize = `${low}px`;
        }
      }
    }
  }
}

export function coordinateText(annotation, size) {
  const prefix = `Seite ${annotation.page}\n`;
  if (annotation.geometry.points) return prefix + annotation.geometry.points.map((point, index) =>
    `${index ? (annotation.type === 'checkmark' ? 'Mittelpunkt' : 'Ende') : 'Spitze'}: x=${(point.x * size.width).toFixed(1)} y=${(point.y * size.height).toFixed(1)} pt`).join('\n');
  const rectangles = geometryRects(annotation.geometry);
  return prefix + rectangles.map((rect, index) => {
    const points = renderRect(rect, size);
    return `${rectangles.length > 1 ? `Segment ${index + 1}\n` : ''}pt: x=${points.left.toFixed(1)} y=${points.top.toFixed(1)}\n    B=${points.width.toFixed(1)} H=${points.height.toFixed(1)}\n0–1: x=${rect.x.toFixed(4)} y=${rect.y.toFixed(4)}\n     B=${rect.width.toFixed(4)} H=${rect.height.toFixed(4)}`;
  }).join('\n\n');
}

