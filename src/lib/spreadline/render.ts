/**
 * SpreadLine Render - TypeScript port of Python render.py
 *
 * Converts optimized layout into SVG-ready JSON structure.
 * Handles time positioning, entity coordinates, line segments,
 * blocks, labels, and inline labels.
 */

import { Path, Session, SpreadLineResult, StorylineResult, BlockResult, PointResult } from './types';
import { full2D, nanMin, nanMax } from './helpers';
import type { SpreadLine } from './spreadline';
import type { ContextResult } from './contextualize';
import { SPREADLINE_LABEL_MAX_CHARS } from '@/features/spreadlines/const';

function truncateLabel(name: string, max: number): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

/**
 * Convert point to SVG coordinate string
 */
function toSvgJoin(point: number[]): string {
  return point.map(p => String(p)).join(',');
}

/**
 * Compute bezier control points for curved lines
 */
function computeBezierLine(start: number[], end: number[]): [number[], number[]] {
  const width = Math.abs(end[0] - start[0]);
  const height = Math.abs(end[1] - start[1]);
  const ratio = height > 0 ? width / height : Infinity;

  if (ratio >= 0) {
    const midX = (start[0] + end[0]) * 0.5;
    const control1 = [midX, start[1]];
    const control2 = [midX, end[1]];
    return [control1, control2];
  }

  return [
    [start[0], start[1]],
    [end[0], end[1]]
  ];
}

/**
 * Get min and max from array using key function
 */
function getExtents<T>(array: T[], key: (item: T) => number): [T, T] | [] {
  if (array.length === 0) return [];
  let min = array[0];
  let max = array[0];
  let minVal = key(array[0]);
  let maxVal = key(array[0]);

  for (const item of array) {
    const val = key(item);
    if (val < minVal) {
      minVal = val;
      min = item;
    }
    if (val > maxVal) {
      maxVal = val;
      max = item;
    }
  }
  return [min, max];
}

/**
 * Compute block outline with button and bars
 */
function computeButtonAndBars(posX: number, topPosY: number, bottomPosY: number, radius: number, width: number): Record<string, any> {
  const height = 18;
  const buttonWidth = 60;

  const button = {
    width: buttonWidth,
    height: height,
    posX: posX,
    posY: bottomPosY + radius
  };

  const topBar = new Path();
  const bottomBar = new Path();
  topBar.moveTo(posX, topPosY - radius).lineTo(posX + width, topPosY - radius);
  bottomBar.moveTo(posX, bottomPosY + radius).lineTo(posX + width, bottomPosY + radius);

  return {
    button,
    top: topBar.toString(),
    bottom: bottomBar.toString()
  };
}

/**
 * Compute block outline shape
 * Now outputs separate paths for each collapsible section:
 * - topHop: { topArc, line, bottomArc } for top 2-hop section
 * - main: { left, right } for main section (1-hop + ego)
 * - bottomHop: { topArc, line, bottomArc } for bottom 2-hop section
 */
function computeBlock(points: PointResult[], hops: number[][], blockWidth: number, portion: number = 0.35): [Record<string, any>, number] {
  const radius = blockWidth / 2;
  const extents = getExtents(points, p => p.posY);
  if (extents.length === 0) return [{}, 0];

  const [topPosY, bottomPosY] = extents;
  const posX = points[0].posX;
  const width = Math.abs(bottomPosY.posY - topPosY.posY);

  const result = computeButtonAndBars(posX, topPosY.posY, bottomPosY.posY, radius, width);

  const offset = 0.005;

  // Get points by hop level
  const topHops = points.filter(p => hops[0].includes(p.id));
  const main = points.filter(p => hops[1].includes(p.id) || hops[2].includes(p.id) || hops[3].includes(p.id));
  const bottomHops = points.filter(p => hops[4].includes(p.id));

  const mainExtents = getExtents(main, p => p.posY);
  if (mainExtents.length === 0) return [result, width];

  const [topMain, bottomMain] = mainExtents;

  // Initialize separate section paths
  result.topHop = null;
  result.bottomHop = null;

  // Build paths for top 2-hop section (if exists)
  const topHopExtents = hops[0].length > 0 ? getExtents(topHops, p => p.posY) : [];

  if (hops[0].length > 0 && topHopExtents.length === 2) {
    const [topTopHop, bottomTopHop] = topHopExtents;

    // Top arc (semicircle at top of 2-hop section)
    const topArcLeft = new Path();
    const topArcRight = new Path();
    topArcLeft.arc(posX, topTopHop.posY, radius, Math.PI * (1.5 + offset), Math.PI, 1);
    topArcRight.arc(posX, topTopHop.posY, radius, Math.PI * (1.5 - offset), 0);

    // Line (vertical portion of 2-hop section)
    const lineLeft = `M${posX - radius},${topTopHop.posY} L${posX - radius},${bottomTopHop.posY}`;
    const lineRight = `M${posX + radius},${topTopHop.posY} L${posX + radius},${bottomTopHop.posY}`;

    // Bottom arc (transition from 2-hop to main)
    const bottomArcLeft = new Path();
    const bottomArcRight = new Path();
    bottomArcLeft
      .arc(posX, bottomTopHop.posY, radius, Math.PI, Math.PI * (1 - portion + offset), 1)
      .arc(posX, topMain.posY, radius, Math.PI * (1 + portion), Math.PI, 1);
    bottomArcRight
      .arc(posX, bottomTopHop.posY, radius, 0, Math.PI * (portion + offset))
      .arc(posX, topMain.posY, radius, -Math.PI * portion, 0);

    result.topHop = {
      topArcLeft: topArcLeft.toString(),
      topArcRight: topArcRight.toString(),
      lineLeft,
      lineRight,
      bottomArcLeft: bottomArcLeft.toString(),
      bottomArcRight: bottomArcRight.toString(),
      // Store Y coordinates for animation
      topY: topTopHop.posY,
      bottomY: bottomTopHop.posY,
      mainY: topMain.posY,
      lineHeight: bottomTopHop.posY - topTopHop.posY
    };
  }

  // Build paths for bottom 2-hop section (if exists)
  const bottomHopExtents = hops[4].length > 0 ? getExtents(bottomHops, p => p.posY) : [];

  if (hops[4].length > 0 && bottomHopExtents.length === 2) {
    const [topBottomHop, bottomBottomHop] = bottomHopExtents;

    // Top arc (transition from main to 2-hop)
    const topArcLeft = new Path();
    const topArcRight = new Path();
    topArcLeft
      .arc(posX, bottomMain.posY, radius, Math.PI, Math.PI * (1 - portion + offset), 1)
      .arc(posX, topBottomHop.posY, radius, Math.PI * (1 + portion), Math.PI, 1);
    topArcRight
      .arc(posX, bottomMain.posY, radius, 0, Math.PI * (portion + offset))
      .arc(posX, topBottomHop.posY, radius, -Math.PI * portion, 0);

    // Line (vertical portion of 2-hop section)
    const lineLeft = `M${posX - radius},${topBottomHop.posY} L${posX - radius},${bottomBottomHop.posY}`;
    const lineRight = `M${posX + radius},${topBottomHop.posY} L${posX + radius},${bottomBottomHop.posY}`;

    // Bottom arc (semicircle at bottom of 2-hop section)
    const bottomArcLeft = new Path();
    const bottomArcRight = new Path();
    bottomArcLeft.arc(posX, bottomBottomHop.posY, radius, Math.PI, Math.PI * (0.5 - offset), 1);
    bottomArcRight.arc(posX, bottomBottomHop.posY, radius, 0, Math.PI * (0.5 + offset));

    result.bottomHop = {
      topArcLeft: topArcLeft.toString(),
      topArcRight: topArcRight.toString(),
      lineLeft,
      lineRight,
      bottomArcLeft: bottomArcLeft.toString(),
      bottomArcRight: bottomArcRight.toString(),
      // Store Y coordinates for animation
      topY: topBottomHop.posY,
      bottomY: bottomBottomHop.posY,
      mainY: bottomMain.posY,
      lineHeight: bottomBottomHop.posY - topBottomHop.posY
    };
  }

  // Build main section arcs (always present)
  const mainLeftArc = new Path();
  const mainRightArc = new Path();

  // Top of main section
  if (hops[0].length === 0 || topHopExtents.length !== 2) {
    // No top hops - draw semicircle at top
    mainLeftArc.arc(posX, topMain.posY, radius, Math.PI * (1.5 + offset), Math.PI, 1);
    mainRightArc.arc(posX, topMain.posY, radius, Math.PI * (1.5 - offset), 0);
  }
  // If top hops exist, the main section starts where topHop.bottomArc ends

  // Vertical line through main section (from topMain to bottomMain)
  if (hops[0].length === 0 || topHopExtents.length !== 2) {
    mainLeftArc.lineTo(posX - radius, bottomMain.posY);
    mainRightArc.lineTo(posX + radius, bottomMain.posY);
  } else {
    // Start from topMain (where topHop ends)
    mainLeftArc.moveTo(posX - radius, topMain.posY);
    mainRightArc.moveTo(posX + radius, topMain.posY);
    mainLeftArc.lineTo(posX - radius, bottomMain.posY);
    mainRightArc.lineTo(posX + radius, bottomMain.posY);
  }

  // Bottom of main section
  if (hops[4].length === 0 || bottomHopExtents.length !== 2) {
    // No bottom hops - draw semicircle at bottom
    mainLeftArc.arc(posX, bottomMain.posY, radius, Math.PI, Math.PI * (0.5 - offset), 1);
    mainRightArc.arc(posX, bottomMain.posY, radius, 0, Math.PI * (0.5 + offset));
  }
  // If bottom hops exist, the main section ends where bottomHop.topArc starts

  result.left = mainLeftArc.toString();
  result.right = mainRightArc.toString();

  return [result, width];
}

/**
 * Renderer class for converting SpreadLine data to SVG
 */
class Renderer {
  private origin: ([number[], number] | number[])[][] = [];
  private heights: number[][] = [];
  private labelTable: number[][] = [];
  private blockRange: number[][] = [];

  render: SpreadLineResult = {
    bandWidth: 0,
    blockWidth: 40,
    ego: '',
    timeLabels: [],
    heightExtents: [0, 0],
    storylines: [],
    blocks: []
  };

  private scaleTimer = {
    bandWidth: -1,
    allTimeLabels: [] as number[],
    allBlocks: [] as [number, number][],
    allBands: [] as [number, number][]
  };

  fit(screenSize: { width: number; height: number }, liner: SpreadLine): void {
    const { width, height } = screenSize;

    this.fitTime(width, liner._all_timestamps, liner._config.bandStretch);
    this.fitEntities(liner.span, height, liner._tables.presence, liner._tables.height, liner.effective_timestamps);

    this.prepareTimeLabels(liner._all_timestamps);
    this.prepareLineSegments(liner);
    this.preparePointsBlocks(liner);
    this.prepareLabels(liner);
    this.prepareInlineLabels(liner.entities_names);

    this.render.ego = liner.entities_names[liner.egoIdx];
  }

  /**
   * Compute horizontal positioning (d3.scaleBand() emulation)
   */
  private fitTime(width: number, domain: string[], bandStretch: [string, string][]): void {
    const domainSize = domain.length;
    const toBeStretched: number[] = [];

    for (const [start, end] of bandStretch) {
      const startIdx = start !== '' ? domain.indexOf(start) : 0;
      const endIdx = end !== '' ? domain.indexOf(end) : domainSize - 1;
      for (let i = startIdx; i <= endIdx; i++) {
        toBeStretched.push(i);
      }
    }

    const align = 0.5;
    const paddingInter = 0.2;
    const paddingOuter = 0.1;

    const step = Math.round((width / (domainSize + paddingOuter * 2 - paddingInter)) * 100) / 100;
    const gap = step * paddingInter;
    const bandwidth = step - gap;
    const paddingLeft = step * paddingOuter * align * 2;

    const bandStart: number[] = new Array(domainSize).fill(0);
    bandStart[0] = paddingLeft;

    for (let idx = 1; idx < domainSize; idx++) {
      const additional = toBeStretched.includes(idx) ? step * 1.1 : 0;
      bandStart[idx] = bandStart[idx - 1] + step + additional;
    }

    // Reverse positions so newest time appears on the left (descending order)
    bandStart.reverse();

    const bands: [number, number][] = bandStart.map(s => [s, s + bandwidth]);

    let blockWeight = 0.6;
    if (blockWeight * bandwidth < this.render.blockWidth) {
      this.render.blockWidth = blockWeight * bandwidth;
    } else {
      blockWeight = this.render.blockWidth / bandwidth;
    }

    const blockSideWeight = (1 - blockWeight) / 2;
    const blocks: [number, number][] = bandStart.map(s => [s + bandwidth * blockSideWeight, s + bandwidth * (1 - blockSideWeight)]);

    this.scaleTimer = {
      allTimeLabels: bandStart.map(s => s + bandwidth / 2),
      allBands: bands,
      allBlocks: blocks,
      bandWidth: bandwidth
    };
    this.render.bandWidth = bandwidth;
  }

  /**
   * Map entity positions to screen coordinates
   */
  private fitEntities(
    span: [number, number],
    height: number,
    validTable: number[][],
    heightTable: number[][],
    validDomain: number[]
  ): void {
    const [numEntities, numTimestamps] = span;

    // Scale heights
    const heights = heightTable.map(row => row.map(h => (h === -1 ? NaN : (h + 1) * 8)));

    const allHeights = heights.flat().filter(h => !isNaN(h));
    const topY = Math.min(...allHeights);
    const bottomY = Math.max(...allHeights);
    this.render.heightExtents = [topY, bottomY];
    this.heights = heights;

    // Build entity positions
    const entity: ([number[], number] | number[])[][] = [];
    const markers = validDomain.map(idx => this.scaleTimer.allBlocks[idx]);

    for (let rIdx = 0; rIdx < numEntities; rIdx++) {
      const row: ([number[], number] | number[])[] = [];
      for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
        if (validTable[rIdx][cIdx] === 0) {
          row.push([-1, -1]);
        } else {
          const x = markers[cIdx];
          const y = heights[rIdx][cIdx];
          row.push([x, y]);
        }
      }
      entity.push(row);
    }
    this.origin = entity;
  }

  private prepareTimeLabels(timeLabels: string[]): void {
    const labelPos = this.scaleTimer.allTimeLabels;
    this.render.timeLabels = timeLabels.slice(0, -1).map((label, idx) => ({
      label,
      posX: labelPos[idx]
    }));
  }

  private prepareLineSegments(liner: SpreadLine): void {
    const ego = liner.egoIdx;
    const names = liner.entities_names;
    const color = liner._line_color;
    const effectiveTimestamps = liner.effective_timestamps;
    const [numEntities, numTimestamps] = this.origin.length > 0 ? [this.origin.length, this.origin[0].length] : [0, 0];

    this.labelTable = full2D(numEntities, numTimestamps, -1);
    const sideTable = liner._tables.crossing;
    const result: StorylineResult[] = [];

    for (let rIdx = 0; rIdx < numEntities; rIdx++) {
      const marks = this.origin[rIdx];
      const invalidity = marks.map(m => Array.isArray(m) && m.length === 2 && m[0] === -1 && m[1] === -1);

      const valids: number[] = [];
      for (let i = 0; i < invalidity.length; i++) {
        if (!invalidity[i]) valids.push(i);
      }

      const lineColor = rIdx === ego ? '#888888' : color[names[rIdx]] || '#424242';
      const lifeStart = valids[0];
      const lifeEnd = valids[valids.length - 1];

      const chunk: StorylineResult = {
        name: names[rIdx],
        lines: [],
        marks: [
          { posX: 0, posY: 0, name: names[rIdx], size: 0 },
          { posX: 0, posY: 0, name: names[rIdx], size: 0 }
        ],
        label: { posX: 0, posY: 0, textAlign: 'start', line: '', label: '', fullLabel: '' },
        inlineLabels: [],
        color: lineColor,
        id: rIdx,
        lifespan: effectiveTimestamps[lifeEnd] - effectiveTimestamps[lifeStart] + 1,
        crossingCheck: sideTable[rIdx][0] !== 0
      };

      if (valids.length <= 1) {
        result.push(chunk);
        continue;
      }

      const validLines = valids.map(i => marks[i]);

      // Build a single continuous SVG path per entity (no intermediate M commands)
      const firstMark = validLines[0] as [[number, number], number];
      const [firstLeft, firstRight] = firstMark[0];
      let path = `M${toSvgJoin([(firstLeft + firstRight) / 2, firstMark[1]])}`;

      for (let idx = 1; idx < validLines.length; idx++) {
        const cIdx = valids[idx];
        const prevMark = validLines[idx - 1] as [[number, number], number];
        const currMark = validLines[idx] as [[number, number], number];

        const prevY = prevMark[1];
        const currY = currMark[1];
        const [prevLeft, prevRight] = prevMark[0];
        const [currLeft, currRight] = currMark[0];

        // Determine which edges face each other based on traversal direction
        const goingLeft = prevLeft > currLeft;
        const prevExit = goingLeft ? prevLeft : prevRight;
        const currEntry = goingLeft ? currRight : currLeft;

        // Line to exit edge of previous block
        path += ` L${toSvgJoin([prevExit, prevY])}`;

        // Connect to entry edge of next block
        if (prevY === currY) {
          this.labelTable[rIdx][cIdx] = cIdx;
          path += ` L${toSvgJoin([currEntry, currY])}`;
        } else {
          const [control1, control2] = computeBezierLine([prevExit, prevY], [currEntry, currY]);
          path += ` C${toSvgJoin(control1)} ${toSvgJoin(control2)} ${toSvgJoin([currEntry, currY])}`;
        }
      }

      chunk.lines = [path];
      result.push(chunk);
    }

    this.render.storylines = result;
  }

  private prepareLabels(liner: SpreadLine): void {
    const storylines = this.render.storylines;
    const ego = liner.egoIdx;
    const names = liner.entities_names;
    const numEntities = this.origin.length;
    const numTimestamps = this.origin[0]?.length || 0;

    for (let rIdx = 0; rIdx < numEntities; rIdx++) {
      const marks = this.origin[rIdx];
      const invalidity = marks.map(m => Array.isArray(m) && m.length === 2 && m[0] === -1 && m[1] === -1);
      const valids: number[] = [];
      for (let i = 0; i < invalidity.length; i++) {
        if (!invalidity[i]) valids.push(i);
      }

      if (valids.length === 0) continue;

      const update = storylines[rIdx];
      const lineStart = marks[valids[0]] as [[number, number], number];
      const lineEnd = marks[valids[valids.length - 1]] as [[number, number], number];

      // Prepare marks
      const h = 7;
      const a = (2 * h) / Math.sqrt(3);
      const area = (Math.sqrt(3) / 4) * a * a;

      if (rIdx !== ego) {
        // Order markers left-to-right visually so visualizer rotation (▷ ◁) is correct
        const leftBlock = lineStart[0][0] <= lineEnd[0][0] ? lineStart : lineEnd;
        const rightBlock = lineStart[0][0] <= lineEnd[0][0] ? lineEnd : lineStart;
        update.marks = [
          { posX: leftBlock[0][0] - h / 2, posY: leftBlock[1], name: names[rIdx], size: area, visibility: 'visible' },
          { posX: rightBlock[0][1] + h / 2, posY: rightBlock[1], name: names[rIdx], size: area, visibility: 'visible' }
        ];
      }

      // Prepare labels (no truncation - width is calculated dynamically)
      const dx = 12;
      const dxOffset = 10;
      const markOffset = 2;

      const name = names[rIdx];

      // Use the visually leftmost end for label placement (works for both ascending/descending order)
      const labelEnd = lineStart[0][0] <= lineEnd[0][0] ? lineStart : lineEnd;

      update.label = {
        posX: labelEnd[0][0] - dx,
        posY: labelEnd[1],
        textAlign: 'end',
        line: `M${toSvgJoin([labelEnd[0][0] - dxOffset, labelEnd[1]])} L${toSvgJoin([labelEnd[0][0] - markOffset, labelEnd[1]])}`,
        label: truncateLabel(name, SPREADLINE_LABEL_MAX_CHARS),
        fullLabel: name,
        visibility: 'visible'
      };
    }
  }

  private preparePointsBlocks(liner: SpreadLine): void {
    const validDomain = liner.effective_timestamps;
    const sessions = liner.sessions;
    const names = liner.entities_names;
    const timeLabels = liner._all_timestamps;
    const context = liner.context;
    const nodeContext = liner._node_color;

    const numTimestamps = this.origin[0]?.length || 0;
    const blockRender: BlockResult[] = [];
    const validLabels = sessions.map(s => s.timestamp);
    const layout = context?.layout || new Map();

    this.blockRange = full2D(2, numTimestamps, -1);
    const blocks = validDomain.map(idx => this.scaleTimer.allBlocks[idx]);
    const validBlocks = validLabels.map(idx => this.scaleTimer.allBlocks[idx]);
    const width = this.render.blockWidth;

    // Create node context lookup
    const nodeContextMap = new Map<string, any>();
    for (const row of nodeContext) {
      const key = `${row.time},${row.entity}`;
      nodeContextMap.set(key, row);
    }

    for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
      const currentBlock = blocks[cIdx];
      if (!validBlocks.some(vb => vb[0] === currentBlock[0] && vb[1] === currentBlock[1])) {
        continue;
      }

      // Find session for this timestamp
      const tIdx = this.scaleTimer.allBlocks.findIndex(b => b[0] === currentBlock[0] && b[1] === currentBlock[1]);
      const session = sessions.find(s => s.timestamp === tIdx);
      if (!session) continue;

      const timestamp = session.timestamp;
      const entities = session.getEntityIDs();

      // Mark label table
      for (const entityIdx of entities) {
        this.labelTable[entityIdx][cIdx] = -1;
      }

      const hops = session.hops.map(hop => hop.map(name => names.indexOf(name)));

      // Build points
      const points: PointResult[] = entities.map((idx, i) => {
        const mark = this.origin[idx][cIdx] as [[number, number], number];
        return {
          id: idx,
          posX: (mark[0][0] + mark[0][1]) / 2,
          posY: mark[1],
          name: names[idx],
          group: blockRender.length,
          aggregateGroup: 0,
          visibility: 'visible'
        };
      });

      // Compute block outline
      const [blockOutline, moveX] = computeBlock(points, hops, width);

      // Get block range
      const pointExtents = getExtents(points, p => p.posY);
      if (pointExtents.length === 2) {
        this.blockRange[0][cIdx] = pointExtents[0].posY - 5;
        this.blockRange[1][cIdx] = pointExtents[1].posY + 5;
      }

      // Add layout and context info to points
      for (const point of points) {
        let scaleX = 0,
          scaleY = 0;
        let label: string | number = -1;

        const layoutKey = `${point.name},${timestamp}`;
        const layoutEntry = layout.get(layoutKey);
        if (layoutEntry) {
          scaleX = layoutEntry.posX;
          scaleY = layoutEntry.posY;
        }

        const contextKey = `${timeLabels[timestamp]},${point.name}`;
        const nodeContextEntry = nodeContextMap.get(contextKey);
        if (nodeContextEntry) {
          label = String(nodeContextEntry.context);
        }

        point.scaleX = scaleX;
        point.scaleY = scaleY;
        point.label = label;
      }

      // Build links
      const links: [number, number][] = session.links.map(([source, target]) => {
        const sourcePoint = points.find(p => p.name === source);
        const targetPoint = points.find(p => p.name === target);
        return [sourcePoint?.id || 0, targetPoint?.id || 0];
      });

      // Calculate hop sections info for collapse/expand UI
      const topHopIds = hops[0] || [];
      const bottomHopIds = hops[4] || [];

      const topHopPoints = points.filter(p => topHopIds.includes(p.id));
      const bottomHopPoints = points.filter(p => bottomHopIds.includes(p.id));

      const hopSections = {
        top:
          topHopPoints.length > 0
            ? {
                nodeCount: topHopPoints.length,
                centerY: (Math.min(...topHopPoints.map(p => p.posY)) + Math.max(...topHopPoints.map(p => p.posY))) / 2,
                nodeIds: topHopPoints.map(p => p.id),
                names: topHopPoints.map(p => p.name),
                minY: Math.min(...topHopPoints.map(p => p.posY)),
                maxY: Math.max(...topHopPoints.map(p => p.posY))
              }
            : null,
        bottom:
          bottomHopPoints.length > 0
            ? {
                nodeCount: bottomHopPoints.length,
                centerY: (Math.min(...bottomHopPoints.map(p => p.posY)) + Math.max(...bottomHopPoints.map(p => p.posY))) / 2,
                nodeIds: bottomHopPoints.map(p => p.id),
                names: bottomHopPoints.map(p => p.name),
                minY: Math.min(...bottomHopPoints.map(p => p.posY)),
                maxY: Math.max(...bottomHopPoints.map(p => p.posY))
              }
            : null
      };

      blockRender.push({
        id: blockRender.length,
        time: timeLabels[timestamp],
        outline: blockOutline,
        names: entities.map(idx => names[idx]),
        relations: links,
        points,
        moveX,
        topPosY: Math.min(...points.map(p => p.posY)),
        hopSections
      });
    }

    this.render.blocks = blockRender;
  }

  private prepareInlineLabels(names: string[]): void {
    const numEntities = this.labelTable.length;
    const numTimestamps = this.labelTable[0]?.length || 0;
    const storylines = this.render.storylines.map(s => s.name);

    for (let rIdx = 0; rIdx < numEntities; rIdx++) {
      const result: { posX: number; posY: number; name: string; fullName: string }[] = [];
      const marks = this.origin[rIdx];
      const name = names[rIdx];
      const storylineIdx = storylines.indexOf(name);
      if (storylineIdx === -1) continue;

      // Filter out labels within block ranges
      for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
        if (this.labelTable[rIdx][cIdx] === -1) continue;
        const mark = marks[cIdx] as [[number, number], number];
        const posY = mark[1];
        const extents = this.blockRange.map(row => row[cIdx]);
        if (extents[0] < posY && posY < extents[1]) {
          this.labelTable[rIdx][cIdx] = -1;
        }
      }

      // Find consecutive label groups of 3+
      const groups: number[][] = [];
      let currentGroup: number[] = [];

      for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
        const val = this.labelTable[rIdx][cIdx];
        if (val !== -1) {
          if (currentGroup.length === 0 || val === currentGroup[currentGroup.length - 1] + 1) {
            currentGroup.push(val);
          } else {
            if (currentGroup.length >= 3) groups.push(currentGroup);
            currentGroup = [val];
          }
        } else {
          if (currentGroup.length >= 3) groups.push(currentGroup);
          currentGroup = [];
        }
      }
      if (currentGroup.length >= 3) groups.push(currentGroup);

      // Add inline labels at middle of each group
      for (const slots of groups) {
        const mid = Math.floor(slots.length / 2);
        const targetIdx = slots[mid];
        const mark = marks[targetIdx] as [[number, number], number];
        result.push({
          posX: (mark[0][0] + mark[0][1]) / 2,
          posY: mark[1],
          name: truncateLabel(name, SPREADLINE_LABEL_MAX_CHARS),
          fullName: name
        });
      }

      this.render.storylines[storylineIdx].inlineLabels = result;
    }
  }
}

/**
 * Main rendering function
 */
export function rendering(size: { width: number; height: number }, liner: SpreadLine): SpreadLineResult {
  const renderer = new Renderer();
  renderer.fit(size, liner);
  return renderer.render;
}
