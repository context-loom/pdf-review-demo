const clamp = value => Math.min(1, Math.max(0, value));

// Browser rectangles -> page-relative normalized rectangles, origin top left.
export function normalizeRect(rect, page) {
  if (page.width <= 0 || page.height <= 0) throw new RangeError('Empty page');
  const x = clamp((rect.left - page.left) / page.width);
  const y = clamp((rect.top - page.top) / page.height);
  const right = clamp((rect.right - page.left) / page.width);
  const bottom = clamp((rect.bottom - page.top) / page.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

export function renderRect(rect, page) {
  return { left: rect.x * page.width, top: rect.y * page.height, width: rect.width * page.width, height: rect.height * page.height };
}

export function stampRect(x, y, page, definition = {}) {
  const width = Math.min(1, (definition.defaultWidth || 150) / page.width);
  const height = Math.min(1, (definition.defaultHeight || 54) / page.height);
  return { x: Math.max(0, Math.min(1 - width, x)), y: Math.max(0, Math.min(1 - height, y)), width, height };
}

export function dragRect(start, end) {
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

export function geometryRects(geometry) {
  if (geometry.segments) return geometry.segments;
  if (geometry.rect) return [geometry.rect];
  if (geometry.points) {
    const [tip, tail] = geometry.points;
    return [dragRect(tip, tail)];
  }
  return [];
}

// The second click determines the tail direction; distance is always 40 page pt.
export function shortArrow(tip, direction, page, length = 40) {
  const dx = (direction.x - tip.x) * page.width;
  const dy = (direction.y - tip.y) * page.height;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return null;
  const tail = { x: tip.x + dx / distance * length / page.width, y: tip.y + dy / distance * length / page.height };
  if (tail.x < 0 || tail.x > 1 || tail.y < 0 || tail.y > 1) return null;
  return { points: [tip, tail] };
}

export function translateGeometry(geometry, dx, dy) {
  const rects = geometryRects(geometry);
  const left = Math.min(...rects.map(rect => rect.x));
  const top = Math.min(...rects.map(rect => rect.y));
  const right = Math.max(...rects.map(rect => rect.x + rect.width));
  const bottom = Math.max(...rects.map(rect => rect.y + rect.height));
  const x = Math.max(-left, Math.min(1 - right, dx));
  const y = Math.max(-top, Math.min(1 - bottom, dy));
  const shift = point => ({ ...point, x: point.x + x, y: point.y + y });
  const result = structuredClone(geometry);
  if (result.rect) result.rect = shift(result.rect);
  if (result.segments) result.segments = result.segments.map(shift);
  if (result.points) result.points = result.points.map(shift);
  return result;
}

// Clockwise quarter turns in the displayed, normalized page frame.
export function rotateGeometry(geometry, quarterTurns) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  const result = structuredClone(geometry);
  const point = p => ({ ...p, x: 1 - p.y, y: p.x });
  const rect = r => ({ ...r, x: 1 - r.y - r.height, y: r.x, width: r.height, height: r.width });
  for (let i = 0; i < turns; i++) {
    if (result.rect) result.rect = rect(result.rect);
    if (result.segments) result.segments = result.segments.map(rect);
    if (result.points) result.points = result.points.map(point);
  }
  result.rotationDeg = ((geometry.rotationDeg || 0) + turns * 90) % 360;
  return result;
}

// Radius is measured in page points, keeping a true circle on any aspect ratio.
export function circleRect(center, edge, page) {
  const desired = Math.hypot((edge.x - center.x) * page.width, (edge.y - center.y) * page.height);
  const radius = Math.min(desired, center.x * page.width, (1 - center.x) * page.width, center.y * page.height, (1 - center.y) * page.height);
  return { x: center.x - radius / page.width, y: center.y - radius / page.height, width: 2 * radius / page.width, height: 2 * radius / page.height };
}

export function checkmarkRect(point, page, diameter = 24) {
  const width = Math.min(1, diameter / page.width), height = Math.min(1, diameter / page.height);
  return { x: Math.max(0, Math.min(1 - width, point.x - width / 2)), y: Math.max(0, Math.min(1 - height, point.y - height / 2)), width, height };
}

// Keep the opposite edge fixed, clamp to page bounds, and prevent inversion.
export function resizeRect(rect, handle, point, minimum = { width: .01, height: .01 }) {
  let left = rect.x, right = rect.x + rect.width, top = rect.y, bottom = rect.y + rect.height;
  if (handle.includes('w')) left = Math.max(0,Math.min(right - minimum.width,point.x));
  if (handle.includes('e')) right = Math.min(1,Math.max(left + minimum.width,point.x));
  if (handle.includes('n')) top = Math.max(0,Math.min(bottom - minimum.height,point.y));
  if (handle.includes('s')) bottom = Math.min(1,Math.max(top + minimum.height,point.y));
  return { x:left,y:top,width:right-left,height:bottom-top };
}

// Opposite bounding-box corners define a true circle. Expand the short side,
// shifting the square inward at page edges while retaining both clicked points.
export function boxCircleRect(first, second, page) {
  const bounds = dragRect(first, second);
  const diameter = Math.max(bounds.width * page.width, bounds.height * page.height);
  if (diameter > Math.min(page.width,page.height)) return null;
  const width = diameter / page.width, height = diameter / page.height;
  return {
    x: Math.max(0,Math.min(1-width,bounds.x+(bounds.width-width)/2)),
    y: Math.max(0,Math.min(1-height,bounds.y+(bounds.height-height)/2)),
    width,height,
  };
}

// Fixed 24-pt numbered circle with a pointer; clicks choose tip and direction.
export function pointedCheckmark(tip, direction, page) {
  const axis = shortArrow(tip, direction, page, 28);
  if (!axis) return null;
  const center = axis.points[1], rx = 12 / page.width, ry = 12 / page.height;
  const left = Math.min(tip.x, center.x-rx), top = Math.min(tip.y, center.y-ry);
  const right = Math.max(tip.x, center.x+rx), bottom = Math.max(tip.y, center.y+ry);
  if (left < 0 || top < 0 || right > 1 || bottom > 1) return null;
  return { rect: {x:left,y:top,width:right-left,height:bottom-top}, points: [tip,center] };
}

