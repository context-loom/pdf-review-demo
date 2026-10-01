export function setupLayout(onResize) {
  const element = id => document.getElementById(id);
  const show = value => {
    for (const mode of ['list','detail']) {
      element(`${mode}-view`).hidden = value !== mode;
      element(`panel-${mode}`).setAttribute('aria-pressed',String(value === mode));
    }
  };
  for (const mode of ['list','detail']) element(`panel-${mode}`).onclick = () => show(mode);
  element('settings-open').onclick = () => element('settings').showModal();
  element('settings-close').onclick = () => element('settings').close();
  const handle = element('panel-resizer');
  let dragging = false, width = 320;
  const resize = value => {
    width = Math.max(240,Math.min(700,Math.floor(window.innerWidth * .6),value));
    document.documentElement.style.setProperty('--panel-width',`${width}px`);
    handle.setAttribute('aria-valuenow',String(width));
  };
  handle.onpointerdown = event => { if (event.button !== 0) return; dragging = true; handle.setPointerCapture(event.pointerId); event.preventDefault(); };
  handle.onpointermove = event => { if (dragging) resize(window.innerWidth - event.clientX); };
  const finish = () => { if (dragging) { dragging = false; onResize(); } };
  handle.onpointerup = finish; handle.onpointercancel = finish;
  handle.onkeydown = event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault(); resize(event.key === 'Home' ? 240 : event.key === 'End' ? 700 : width + (event.key === 'ArrowLeft' ? 20 : -20)); onResize();
  };
  return { showDetail: () => show('detail') };
}

