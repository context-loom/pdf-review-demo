export const COLORS = Object.freeze([
  {name:'Rot',value:'#c52222'}, {name:'Grün',value:'#16834b'},
  {name:'Blau',value:'#3366ff'}, {name:'Gelb',value:'#ffdf00'},
  {name:'Grau',value:'#808080'}, {name:'Schwarz',value:'#000000'},
]);
export const HINT_COLORS = Object.freeze(COLORS.filter(color => !['Rot','Grün'].includes(color.name)));
export const isHintColor = value => HINT_COLORS.some(color => color.value === value);
export const REVIEW_RESULTS = Object.freeze([
  {value:'unreviewed',label:'Nicht geprüft',color:'#808080'},
  {value:'ok',label:'In Ordnung',color:'#16834b'},
  {value:'not-ok',label:'Nicht in Ordnung',color:'#c52222'},
  {value:'clarification',label:'Klärung erforderlich',color:'#ffdf00'},
]);
export const MARKINGS = Object.freeze([{value:'hint',label:'Hinweis',color:'#3366ff'},...REVIEW_RESULTS.filter(result => result.value !== 'unreviewed'),REVIEW_RESULTS.find(result => result.value === 'unreviewed')]);
export const markingValue = content => content.annotationType === 'hint' ? 'hint' : content.reviewResult;
export const markingOption = value => MARKINGS.find(item => item.value === value);
export const isPaletteColor = value => COLORS.some(color => color.value === value);
export const reviewResult = value => REVIEW_RESULTS.find(result => result.value === value);
export const needsReason = value => ['not-ok','clarification'].includes(value);
export function paintPalette(container, value, onChange, disabled = false, colors = COLORS) {
  container.replaceChildren();
  for (const color of colors) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'color-swatch';
    button.setAttribute('aria-label', color.name); button.title = color.name;
    button.setAttribute('aria-pressed', String(color.value === value)); button.disabled = disabled;
    button.style.setProperty('--swatch',color.value);
    button.addEventListener('click', () => {
      onChange(color.value);
      for (const child of container.children) child.setAttribute('aria-pressed', String(child === button));
    });
    container.append(button);
  }
}
export function populateResults(select, value = 'hint') {
  for (const result of MARKINGS) {
    const option = document.createElement('option'); option.value = result.value; option.textContent = result.label; select.append(option);
  }
  select.value = value;
}

