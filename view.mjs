export function createPageOrientations(count) {
  const pages = Array.from({ length: count }, (_, index) => ({ page: index + 1, rotationRelativeToFile: 0 }));
  return {
    get(page) { return pages[page - 1].rotationRelativeToFile; },
    rotate(page, degrees) {
      if (!Number.isInteger(degrees / 90)) throw new RangeError('Quarter turns only');
      const item = pages[page - 1];
      item.rotationRelativeToFile = ((item.rotationRelativeToFile + degrees) % 360 + 360) % 360;
    },
    all() { return structuredClone(pages); },
  };
}

export function fitScale(mode, page, available) {
  const width = Math.max(1, available.width) / page.width;
  const height = Math.max(1, available.height) / page.height;
  return mode === 'page-width' ? width : Math.min(width, height);
}

