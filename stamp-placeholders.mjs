// PoC values are explicit local defaults, not an authenticated identity.
export const STAMP_DEFAULTS_KEY='pdf-review-stamp-defaults-v1';
export const placeholderKeys=['name','user','reviewer','initials','date','date_iso'];
export function todayIso(now=new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function validDate(value) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(`${value}T12:00:00Z`);return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;
}
export function normalizeStampDefaults(input={}) {
  const custom={};
  if(input.custom && typeof input.custom==='object' && !Array.isArray(input.custom)) {
    for(const [key,value] of Object.entries(input.custom).slice(0,30)) {
      if(/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(key) && !placeholderKeys.includes(key) && typeof value==='string')custom[key]=value.slice(0,500);
    }
  }
  return {name:typeof input.name==='string' ? input.name.slice(0,120) : 'PoC-Prüfer',initials:typeof input.initials==='string' ? input.initials.slice(0,30) : 'PP',autoDate:input.autoDate!==false,date:typeof input.date==='string' && validDate(input.date) ? input.date : '',custom};
}
export function stampValues(defaults,now=new Date()) {
  const d=normalizeStampDefaults(defaults),iso=d.autoDate || !d.date ? todayIso(now) : d.date;
  const [year,month,day]=iso.split('-');
  return {...d.custom,name:d.name,user:d.name,reviewer:d.name,initials:d.initials,date:`${day}.${month}.${year}`,date_iso:iso};
}
export function fillPlaceholders(text,values={}) {
  // Single pass: a value containing {{...}} is literal, never recursively evaluated.
  return String(text).replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*\}\}/g,(match,key)=>Object.hasOwn(values,key) ? String(values[key]) : match);
}
export function fillSvgText(source,values) {
  // Substitute only text nodes, never markup or attributes. XMLSerializer escapes values.
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  if(doc.querySelector('parsererror'))throw new Error('Ungültige SVG-Vorlage.');
  const walk=doc.createTreeWalker(doc.documentElement,4);let node;
  while((node=walk.nextNode()))if(['text','tspan','title','desc'].includes(node.parentElement?.localName))node.nodeValue=fillPlaceholders(node.nodeValue,values);
  return new XMLSerializer().serializeToString(doc.documentElement);
}
export function fillGraphicElements(elements,values) {
  return elements.map(e=>{
    if(e.type==='group')return {...structuredClone(e),elements:fillGraphicElements(e.elements,values)};
    if(e.type==='text')return {...structuredClone(e),text:fillPlaceholders(e.text,values)};
    if(e.type==='svg') {
      const source=fillSvgText(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${e.viewBox}">${e.body}</svg>`,values);
      const root=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
      return {...structuredClone(e),body:[...root.childNodes].map(n=>new XMLSerializer().serializeToString(n)).join('')};
    }
    return structuredClone(e);
  });
}
export function setupStampDefaults(onChange) {
  const el=id=>document.getElementById(id);let defaults=normalizeStampDefaults();
  try {const saved=localStorage.getItem(STAMP_DEFAULTS_KEY);if(saved)defaults=normalizeStampDefaults(JSON.parse(saved));}
  catch(error){el('stamp-defaults-status').textContent=`Standardwerte konnten nicht geladen werden: ${error.message}`;}
  const render=()=>{
    el('stamp-default-name').value=defaults.name;el('stamp-default-initials').value=defaults.initials;
    el('stamp-default-auto-date').checked=defaults.autoDate;el('stamp-default-date').value=defaults.autoDate ? todayIso() : defaults.date || todayIso();el('stamp-default-date').disabled=defaults.autoDate;
    el('stamp-default-custom').value=Object.entries(defaults.custom).map(([key,value])=>`${key}=${value}`).join('\n');
  };
  const save=()=>{
    const custom={};
    for(const line of el('stamp-default-custom').value.split('\n').filter(s=>s.trim())) {
      const i=line.indexOf('='),key=line.slice(0,i).trim();
      if(i<1 || !/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(key) || placeholderKeys.includes(key)) {el('stamp-defaults-status').textContent='Weitere Platzhalter: Schlüssel=Wert; Standardschlüssel sind reserviert.';return;}
      custom[key]=line.slice(i+1).trim();
    }
    if(Object.keys(custom).length>30){el('stamp-defaults-status').textContent='Maximal 30 eigene Platzhalter möglich.';return;}
    if(!el('stamp-default-auto-date').checked && !validDate(el('stamp-default-date').value)){el('stamp-defaults-status').textContent='Bitte ein gültiges festes Datum wählen.';return;}
    defaults=normalizeStampDefaults({name:el('stamp-default-name').value,initials:el('stamp-default-initials').value,autoDate:el('stamp-default-auto-date').checked,date:el('stamp-default-date').value,custom});
    el('stamp-default-date').disabled=defaults.autoDate;
    if(defaults.autoDate)el('stamp-default-date').value=todayIso();
    try {localStorage.setItem(STAMP_DEFAULTS_KEY,JSON.stringify(defaults));el('stamp-defaults-status').textContent='Standardwerte gespeichert. Sie gelten für neu platzierte Stempel.';}
    catch(error){el('stamp-defaults-status').textContent=`Nur für diese Sitzung: ${error.message}`;}
    onChange();
  };
  for(const id of ['stamp-default-name','stamp-default-initials','stamp-default-date','stamp-default-auto-date','stamp-default-custom'])el(id).addEventListener('change',save);
  for(const id of ['settings-open','manage-stamps'])el(id).addEventListener('click',()=>{if(defaults.autoDate)el('stamp-default-date').value=todayIso();});
  render();return ()=>stampValues(defaults);
}
