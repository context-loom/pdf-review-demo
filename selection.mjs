import { normalizeRect } from './geometry.mjs';

export const normalizeText = text => text.replace(/\s+/g, ' ').trim();

export function readSelection(selection, textLayer, pageElement) {
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  // Reject cross-page/sidebar selection, rather than silently clipping its text.
  if (!textLayer.contains(range.startContainer) || !textLayer.contains(range.endContainer)) return null;
  const selectedText = normalizeText(selection.toString());
  if (!selectedText) return null;
  const page = pageElement.getBoundingClientRect();
  const segments = [...range.getClientRects()]
    .map(rect => normalizeRect(rect, page))
    .filter(rect => rect.width > 0 && rect.height > 0)
    .filter((rect, index, all) => !all.slice(0, index).some(other =>
      ['x', 'y', 'width', 'height'].every(key => Math.abs(rect[key] - other[key]) < 0.00001)));
  return segments.length ? { selectedText, segments } : null;
}

