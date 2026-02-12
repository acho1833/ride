/**
 * D3 Utility Functions
 * Ported from SpreadLine-main/demo/frontend/SpreadLiner/helpers.js
 */

import * as d3 from 'd3';

// ============================================
// Theme Colors
// ============================================

export interface ThemeColors {
  foreground: string;
  background: string;
  muted: string;
  mutedForeground: string;
  border: string;
  card: string;
  textShadow: string;
}

/**
 * Returns theme-aware colors based on whether dark mode is active.
 * Checks the `dark` class on `<html>` (standard Tailwind dark mode).
 */
export function getThemeColors(): ThemeColors {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return dark
    ? {
        foreground: '#e8e8e8',
        background: '#1a1a1a',
        muted: '#2a2a2a',
        mutedForeground: '#999999',
        border: '#444444',
        card: '#262626',
        textShadow: '#1a1a1a'
      }
    : {
        foreground: '#000000',
        background: '#ffffff',
        muted: '#f0f0f0',
        mutedForeground: '#666666',
        border: '#e0e0e0',
        card: '#ffffff',
        textShadow: '#ffffff'
      };
}

// ============================================
// Embedding & Position Calculations
// ============================================

/**
 * Compute embedded position within expanded block
 * Used to position nodes inside expanded blocks with whitespace padding
 *
 * @param scale - Normalized position (0-1)
 * @param length - Total expansion width (moveX)
 * @returns Pixel position within block
 */
export function _compute_embedding(scale: number, length: number): number {
  const whiteSpace = 0.15;
  return (scale + whiteSpace / 2) * length * (1 - whiteSpace);
}

/**
 * Compute bezier control points for smooth curves
 */
export function _compute_bezier_line(start: [number, number], end: [number, number]): [[number, number], [number, number]] {
  const midX = 0.5 * (start[0] + end[0]);
  const control1: [number, number] = [midX, start[1]];
  const control2: [number, number] = [midX, end[1]];
  return [control1, control2];
}

/**
 * Determine curve factor based on distance
 * Closer points need more curve, distant points can be straighter
 */
function _determine_farther_factor(start: [number, number], end: [number, number]): number {
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dy = y2 - y1;
  const dx = x2 - x1;
  const dr = Math.sqrt(dy ** 2 + dx ** 2);
  return dr > 38 ? 0.2 : dr > 26 ? 0.5 : dr > 13 ? 0.3 : 1.0;
}

/**
 * Compute elliptical arc path for relation arrows
 * Creates curved arrows between nodes in expanded blocks
 *
 * @param start - Source node [x, y]
 * @param end - Target node [x, y]
 * @param startRadius - Source node radius (for offset)
 * @param endRadius - Target node radius (for arrow positioning)
 * @returns SVG path string
 */
export function _compute_elliptical_arc(start: [number, number], end: [number, number], startRadius = 5, endRadius = 7): string {
  const arc = d3.path();
  let [x1, y1] = start;
  let [x2, y2] = end;
  let dy = y2 - y1;
  let dx = x2 - x1;
  let dr = Math.sqrt(dy ** 2 + dx ** 2);

  if (dr === 0) return '';

  dy = dy / dr;
  dx = dx / dr;

  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;

  const farther = _determine_farther_factor(start, end);
  const factor = farther * dr;
  const cx = mx + dy * factor;
  const cy = my - dx * factor;

  let r = (((x1 - cx) ** 2 + (y1 - cy) ** 2) / factor) * 0.5;
  const rx = cx - dy * r;
  const ry = cy + dx * r;

  r = Math.abs(r);
  let a1 = Math.atan2(y1 - ry, x1 - rx);
  let a2 = Math.atan2(y2 - ry, x2 - rx);
  a1 = (a1 + Math.PI * 2) % (Math.PI * 2);
  a2 = (a2 + Math.PI * 2) % (Math.PI * 2);

  if (farther < 0 && a1 < a2) a1 += Math.PI * 2;
  else if (farther >= 0 && a1 > a2) a2 += Math.PI * 2;

  const arrowSize = 7;
  const arrowAngle = (arrowSize / r) * Math.sign(farther);

  a1 += (startRadius / r) * Math.sign(farther);
  a2 -= (endRadius / r) * Math.sign(farther);
  let aa1 = a1;
  let aa2 = a2 - arrowAngle * 0.7;

  if ((farther < 0 && aa1 < aa2) || (farther > 0 && aa2 < aa1)) {
    aa1 = a1;
    aa2 = a2;
  }

  // For very close points, draw a straight line instead
  if (farther === 0) {
    arc.moveTo(x1 + dx * startRadius, y1 + dy * startRadius);
    arc.lineTo(x2 - dx * endRadius - 5 * dx, y2 - dy * endRadius - 5 * dy);
    return arc.toString();
  }

  arc.arc(rx, ry, r, aa1, aa2, farther < 0);
  return arc.toString();
}

// ============================================
// Animation Functions
// ============================================

/**
 * Grow line animation using stroke-dasharray
 * Creates a "drawing" effect where the line appears to be drawn
 *
 * Usage: path.transition(animation).attrTween('stroke-dasharray', growLineAnimation)
 */
export function growLineAnimation(this: SVGPathElement): (t: number) => string {
  const length = this.getTotalLength();
  return d3.interpolate(`0,${length}`, `${length},${length}`);
}

/**
 * Shrink line animation (reverse of grow)
 * Creates an "erasing" effect where the line disappears
 */
export function shrinkLineAnimation(this: SVGPathElement): (t: number) => string {
  const length = this.getTotalLength();
  return d3.interpolate(`${length},${length}`, `0,${length}`);
}

/**
 * Helper to remove element after animation
 */
export function removeElement(this: Element): void {
  d3.select(this).remove();
}

// ============================================
// Text Utilities
// ============================================

/**
 * Get text width using canvas measurement
 * More accurate than SVG getBBox for dynamic text
 */
let textCanvas: HTMLCanvasElement | null = null;

export function getTextWidth(text: string, font: string): number {
  if (!textCanvas) {
    textCanvas = document.createElement('canvas');
  }
  const context = textCanvas.getContext('2d');
  if (!context) return 0;
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

/**
 * Wrap text to fit within specified width
 * Creates tspan elements for multi-line text in SVG
 */
export function wrap(textSelection: d3.Selection<SVGTextElement, { wrapWidth?: number }, SVGGElement, unknown>, width: number): void {
  textSelection.each(function (d) {
    const wrapping = d.wrapWidth || 1;
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word: string | undefined;
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1;
    const x = text.attr('x');
    const y = text.attr('y');
    const dy = 0;

    let tspan = text
      .text(null)
      .append('tspan')
      .attr('x', x)
      .attr('y', y)
      .attr('dy', dy + 'em');

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(' '));
      const tspanNode = tspan.node();
      if (tspanNode && tspanNode.getComputedTextLength() > width * wrapping) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text
          .append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', ++lineNumber * lineHeight + dy + 'em')
          .text(word);
      }
    }
  });
}

/**
 * Convert rem to pixels
 */
export function convertRemToPixels(rem: number): number {
  if (typeof document === 'undefined') return rem * 16;
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

// ============================================
// Style Injection
// ============================================

/**
 * Create style element from CSS for SVG embedding
 * Required for proper styling when SVG is exported
 */
export function createStyleElementFromCSS(): SVGStyleElement {
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    /* Storyline styles - matching original SpreadLine */
    .storyline-ego { stroke-width: 5.5px; }
    .storyline-alter { stroke-width: 2px; }
    .storyline-hover, .storyline-pin { stroke-width: 4px; }
    .storyline-dehighlight, .storyline-unpin { opacity: 0.1; }
    .storyline-arc-dehighlight { opacity: 0.1; }
    .storyline-label-dehighlight { opacity: 0; }
    .storyline-pin, .storyline-hover { opacity: 1 !important; }

    /* Station arcs (blocks) */
    .station-arcs {
      fill: none;
      stroke-width: 4px;
      cursor: pointer;
      stroke: var(--foreground);
      pointer-events: all;
    }

    /* Arcs container - ensure clickable */
    .arcs {
      cursor: pointer;
      pointer-events: all;
    }

    /* Points */
    .points {
      stroke: var(--foreground);
      stroke-width: 0.5px;
      pointer-events: all;
    }

    /* Path styling */
    .path-movable { fill: none; pointer-events: stroke; }

    /* Text */
    .text-display { font-weight: bold; font-size: 14px; }
    .stroked-text {
      text-shadow:
        -1px -1px 0 var(--background),
        0px -1px 0 var(--background),
        1px -1px 0 var(--background),
        1px 0px 0 var(--background),
        1px 1px 0 var(--background),
        0px 1px 0 var(--background),
        -1px 1px 0 var(--background),
        -1px 0px 0 var(--background);
    }

    /* Time labels */
    .time-labels { text-anchor: middle; }

    /* Labels */
    .labels { vertical-align: middle; z-index: 1; }

    /* Horizontal bars */
    .horizontal-bars { opacity: 1; }

    /* Tooltip */
    .content-tooltip {
      position: absolute;
      pointer-events: none;
      left: 0;
      top: 0;
      background: var(--card);
      border-radius: .2rem;
      padding: .5rem .5rem;
      font-size: 0.7rem;
      text-overflow: ellipsis;
      color: var(--card-foreground);
      z-index: 300;
      visibility: hidden;
      box-shadow: 0 0 5px rgba(0, 0, 0, .25);
      text-align: center;
    }

    /* Board text for expanded blocks */
    .board-text {
      fill: var(--foreground);
      opacity: 0.8;
      text-anchor: middle;
      font-weight: bold;
    }

    /* Filter styles */
    .filter {
      display: flex;
      font-size: 14px;
      padding-right: 2rem;
    }

    .filter-label {
      padding-left: 5px;
      padding-top: 2.5px;
      font-weight: bold;
    }

    /* Animated path */
    .animated-path {
      stroke-dasharray: 1000;
      stroke-dashoffset: 1000;
      animation: dash 5s linear forwards;
    }

    @keyframes dash {
      to { stroke-dashoffset: 0; }
    }
  `;
  return style;
}

// ============================================
// Array Utilities
// ============================================

/**
 * Check if two arrays are equal
 */
export function arraysEqual<T>(a: T[] | null, b: T[] | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ============================================
// Debounce Utility
// ============================================

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(callback: T, wait: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      callback(...args);
    }, wait);
  };
}
