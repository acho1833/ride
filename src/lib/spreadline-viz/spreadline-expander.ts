/**
 * Expander - Block Expansion Animation Handler
 * Ported from SpreadLine-main/demo/frontend/SpreadLiner/expander.js
 *
 * Handles the expansion animation when a block is clicked:
 * - Shifts elements to the right
 * - Creates fill lines for storylines
 * - Expands block background
 * - Uses D3 force simulation for node collision detection
 * - Draws relation arcs with arrows
 */

import * as d3 from 'd3';
import { Block, BrushComponent, ForceNode, SpreadLineConfig } from './spreadline-types';
import { _compute_embedding, _compute_elliptical_arc, growLineAnimation, arraysEqual } from './spreadline-d3-utils';

interface ExpanderSupplement {
  nodeColorScale: d3.ScaleThreshold<number, string>;
  reference: Array<{ year: string; [key: string]: unknown }>;
}

export class Expander {
  data: Block;
  posX: number;
  blockWidth: number;
  brushComponent: BrushComponent;
  supplement: ExpanderSupplement;
  duration = 500;
  ego: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  growAnimation: any;
  existence: { points: ForceNode[]; relations: [number, number][] } = { points: [], relations: [] };

  private _top_posY: number;
  private _block_id: number;
  private _moveX: number;
  private _nodeColorScale: d3.ScaleThreshold<number, string>;
  private linkColor = '#424242';
  private force: boolean;
  private forceMode = 'circle';
  private drawLinks: boolean;
  private customizeComponent: SpreadLineConfig['content']['customize'];

  constructor(
    block: Block,
    posX: number,
    bandWidth: number,
    brushComponent: BrushComponent,
    supplement: ExpanderSupplement,
    config: SpreadLineConfig['content'],
    ego: string
  ) {
    this.data = block;
    this.posX = posX;
    this.blockWidth = bandWidth;
    this.brushComponent = brushComponent;
    this.supplement = supplement;
    this.ego = ego;
    this.growAnimation = d3.transition().duration(this.duration).ease(d3.easeQuadInOut);

    this._top_posY = block.topPosY;
    this._block_id = block.id;
    this._moveX = block.moveX;
    this._nodeColorScale = supplement.nodeColorScale;

    this.force = config.collisionDetection;
    this.drawLinks = config.showLinks;
    this.customizeComponent = config.customize;
  }

  /**
   * Main expand action - coordinates all expansion animations
   */
  act(): void {
    const blockWidth = this.blockWidth;
    const animation = this.growAnimation;
    const id = this._block_id;
    const posX = this.posX;
    const moveX = this._moveX;

    /**
     * Translate elements to the right to make room for expansion
     */
    function expandTranslate(this: d3.BaseType): void {
      const elem = this as SVGGraphicsElement;
      const transform = elem.getAttribute('transform') || 'translate(0,0)';
      const classes = (elem.getAttribute('class') || '').split(' ');

      // Skip elements that belong to this block
      if (classes.includes(`points-${id}`) || classes.includes(`horizontal-bars-${id}`) || classes.includes(`button-${id}`)) {
        return;
      }

      // Skip links from blocks to the left
      if (classes.includes('links') || classes.includes('group')) {
        const groupID = elem.getAttribute('groupID');
        if (groupID && +groupID < id) return;
      }

      const currX = +transform.split(',')[0].split('(')[1];
      const currY = +transform.split(',')[1].split(')')[0];
      let moveTo = currX + moveX;

      // Rules near the block center get half movement
      if (classes.includes('rules') && elem.getBBox().x < posX + blockWidth / 2) {
        moveTo = currX + moveX / 2;
      }

      d3.select(elem).transition(animation).attr('transform', `translate(${moveTo}, ${currY})`);
    }

    // Shift movable elements to the right
    d3.selectAll('.movable')
      .filter(function () {
        const elem = this as SVGGraphicsElement;
        const bbox = elem.getBBox();
        return bbox.x + bbox.width / 2 >= posX && elem.getAttribute('id') !== `left-arc-${id}`;
      })
      .each(expandTranslate);

    // Shift brush elements
    d3.selectAll('.brush')
      .filter(function () {
        const elem = this as SVGGraphicsElement;
        const groupID = elem.getAttribute('groupID');
        return groupID !== null && +groupID > id;
      })
      .each(expandTranslate);

    // Shift symbol markers (triangles use transform for positioning)
    d3.selectAll('.symbol-movable')
      .filter((d: unknown) => (d as { posX: number }).posX >= posX)
      .each(function (this: d3.BaseType, d: unknown) {
        const elem = this as SVGGraphicsElement;
        const data = d as { posX: number; posY: number };
        const transform = elem.getAttribute('transform') || '';
        const rotate = transform.split('(')[2]?.split(')')[0] || '0';
        const currX = +transform.split(',')[0].split('(')[1];

        d3.select(elem)
          .transition(animation)
          .attr('transform', `translate(${currX + moveX}, ${data.posY}) rotate(${rotate})`);
      });

    this._fillDummyLines(id);
    this._expandBlock(id);
    this._contextualize(id);
    this._updateBrush();
  }

  /**
   * Apply D3 force simulation for collision detection
   * Positions nodes inside expanded block without overlap
   */
  private _contextualize(id: number): void {
    const length = this._moveX;
    const animation = this.growAnimation;
    const baseline = this._top_posY;
    const ego = this.ego;

    const pointSelection = d3.selectAll(`.points-${id}`);
    const nodes: ForceNode[] = pointSelection.data().map((d: unknown) => {
      const point = d as {
        name: string;
        id: number;
        posX: number;
        posY: number;
        group: number;
        label: string;
        scaleX: number;
        scaleY: number;
      };
      return {
        name: point.name,
        id: point.id,
        posX: point.posX,
        posY: point.posY,
        group: point.group,
        label: point.label,
        x: _compute_embedding(point.scaleX, length),
        y: _compute_embedding(point.scaleY, length),
        width: point.name === ego ? 10 : 6,
        height: point.name === ego ? 10 : 6
      };
    });

    // Apply force simulation for collision detection
    if (this.force && this.forceMode === 'circle') {
      const simulation = d3
        .forceSimulation(nodes)
        .force(
          'x',
          d3.forceX((d: ForceNode) => d.x)
        )
        .force(
          'y',
          d3.forceY((d: ForceNode) => d.y)
        )
        .force(
          'collide',
          d3.forceCollide((d: ForceNode) => d.width)
        )
        .stop();

      // Run simulation synchronously
      for (let i = 0; i < 100; i++) simulation.tick();
    }

    // Animate points to their new positions
    pointSelection.each(function (this: d3.BaseType, d: unknown, idx: number) {
      const elem = this as SVGGraphicsElement;
      const point = d as { scaleX: number; scaleY: number; name: string; posY: number };
      const transform = elem.getAttribute('transform') || 'translate(0,0)';
      const currX = +transform.split(',')[0].split('(')[1];

      if (point.scaleX === 0 && point.scaleY === 0) return;

      const node = nodes[idx];
      d3.select(elem).attr('embX', node.x);
      d3.select(elem)
        .transition(animation)
        .attr('transform', `translate(${currX + node.x}, ${-point.posY + baseline + node.y})`);

      if (point.name === ego) {
        d3.select(elem).attr('r', 7);
      }
    });

    this.existence.points = nodes;

    if (this.drawLinks) {
      this._drawLinks(nodes);
    }
  }

  /**
   * Draw relation arcs between nodes
   */
  private _drawLinks(nodes: ForceNode[]): void {
    const id = this._block_id;
    const relations = this.data.relations;
    const baseline = this._top_posY;
    const ego = this.ego;

    const relationArcs = relations
      .map(([sourceID, targetID]) => {
        const source = nodes.find(d => d.id === sourceID);
        const target = nodes.find(d => d.id === targetID);
        if (!source || !target) return null;

        const sourceCoordinate: [number, number] = [source.x + source.posX, source.y + baseline];
        const targetCoordinate: [number, number] = [target.x + target.posX, target.y + baseline];
        const sourceRadius = source.name === ego ? 7 : 5;
        const targetRadius = target.name === ego ? 7 : 5;

        const arc = _compute_elliptical_arc(sourceCoordinate, targetCoordinate, sourceRadius, targetRadius);

        const ele = document.getElementById(`point-${id}-${sourceID}`);
        if (!ele) return null;

        const transform = ele.getAttribute('transform') || 'translate(0,0)';
        const currX = +transform.split(',')[0].split('(')[1];

        return { relation: arc, currX };
      })
      .filter(Boolean) as Array<{ relation: string; currX: number }>;

    const container = d3.select(`#block-click-${id}`);

    // Remove existing links
    d3.selectAll(`.link-group-${id}`).remove();

    // Draw new links with animation
    container
      .append('g')
      .attr('class', `link-group-${id}`)
      .selectAll('path')
      .data(relationArcs)
      .join('path')
      .attr('class', `movable links-${id} links`)
      .attr('id', (_, idx) => `arc-${idx}`)
      .attr('transform', d => `translate(${d.currX}, 0)`)
      .attr('fill', 'none')
      .attr('stroke', this.linkColor)
      .attr('groupID', id)
      .attr('d', e => e.relation)
      .transition(this.growAnimation)
      .attrTween('stroke-dasharray', growLineAnimation as any)
      .on('end', function () {
        d3.select(this).attr('marker-end', 'url(#arrow-head)');
      });

    this.existence.relations = relations;
  }

  /**
   * Expand the block background
   */
  private _expandBlock(id: number): void {
    const moveX = this._moveX;
    const animation = this.growAnimation;
    const container = d3.select(`#block-click-${id}`);

    // Show and animate horizontal bars
    d3.selectAll(`.horizontal-bars-${id}`)
      .style('visibility', 'visible')
      .transition(animation)
      .attrTween('stroke-dasharray', growLineAnimation as any);

    // Get right arc dimensions
    const ele = document.getElementById(`right-arc-${id}`) as SVGGraphicsElement | null;
    if (!ele) return;

    const bbox = ele.getBBox();
    const strokeWidth = parseInt(getComputedStyle(ele).getPropertyValue('stroke-width'));
    const transform = ele.getAttribute('transform') || 'translate(0,0)';
    const currX = +transform.split(',')[0].split('(')[1];

    // Create expanding white background
    container
      .append('rect')
      .attr('id', `arc-group-rect-${id}`)
      .attr('class', 'movable group')
      .attr('groupID', id)
      .attr('x', bbox.x)
      .attr('y', bbox.y + strokeWidth / 2)
      .attr('height', bbox.height - strokeWidth)
      .attr('fill', '#ffffff')
      .attr('transform', `translate(${currX}, 0)`)
      .style('cursor', 'pointer')
      .transition(animation)
      .attr('width', moveX + 1)
      .on('end', () => this.updateBrushedSelection());

    // Custom content rendering
    this.customizeComponent(
      container as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      this.supplement,
      bbox as unknown as DOMRect,
      moveX,
      currX,
      id,
      this._top_posY,
      this.posX,
      strokeWidth,
      animation as unknown as d3.Transition<SVGElement, unknown, null, undefined>
    );

    // Raise points above the background
    d3.selectAll(`.points-${id}`).raise();
  }

  /**
   * Update brush position after expansion
   */
  private _updateBrush(): void {
    const timeLabels = d3.selectAll('.time-labels');
    const time = this.data.time;
    const index = timeLabels.data().findIndex((d: unknown) => (d as { label: string }).label === time);

    const timePositions = timeLabels.nodes().map((d, idx) => {
      const elem = d as SVGTextElement;
      const data = (elem as unknown as { __data__: { label: string; posX: number } }).__data__;
      const transform = elem.getAttribute('transform') || 'translate(0,0)';
      const currX = +transform.split(',')[0].split('(')[1];

      const arc = d3.select(`.left-arc-${data.label}`).node() as SVGPathElement | null;
      let expandX = 0;
      if (arc && +arc.getAttribute('active')! === 1) {
        expandX = (arc as unknown as { __data__: Block }).__data__.moveX;
      }

      const shiftX = idx === index ? this._moveX / 2 : idx > index ? this._moveX : 0;

      return {
        startX: currX + data.posX - this.blockWidth / 2 + shiftX - expandX / 2,
        endX: currX + data.posX + this.blockWidth / 2 + shiftX + expandX / 2
      };
    });

    let brushMove: [number, number] | null = null;
    if (this.brushComponent.brushedSelection.length !== 0) {
      const [startIdx, endIdx] = this.brushComponent.brushedSelection;
      brushMove = [timePositions[startIdx].startX, timePositions[endIdx].endX];
    }

    if (this.brushComponent.brush) {
      (d3.select('#time-container') as any).transition(this.growAnimation).call(this.brushComponent.brush.move, brushMove);
    }
  }

  /**
   * Fill in dummy lines for storylines crossing the expanded block
   */
  private _fillDummyLines(id: number): void {
    const posX = this.posX;
    const names = this.data.names;
    const animation = this.growAnimation;
    const moveX = this._moveX;

    // Find path segments at the block position
    const lineSelection = d3.selectAll('.path-movable').filter(function () {
      const elem = this as SVGGraphicsElement;
      const bbox = elem.getBBox();
      const parent = elem.parentNode as SVGElement | null;
      const name = parent?.getAttribute('name');
      return +bbox.x.toFixed(3) === +posX.toFixed(3) && !names.includes(name!);
    });

    // Create fill lines
    lineSelection.each(function (this: d3.BaseType) {
      const elem = this as SVGPathElement;
      const pathD = elem.getAttribute('d') || '';
      const startM = pathD.split(' ')[0].split(',');
      const startX = +startM[0].slice(1);
      const startY = +startM[1];

      const parentContainer = d3.select(elem.parentNode as SVGElement);
      const transform = elem.getAttribute('transform') || 'translate(0,0)';
      const currX = +transform.split(',')[0].split('(')[1];
      const name = elem.getAttribute('name');

      parentContainer
        .append('path')
        .attr('d', `M${startX},${startY} L${startX + moveX},${startY}`)
        .attr('class', `movable dummy-movable-${id} dummy-movable`)
        .attr('transform', `translate(${currX}, 0)`)
        .attr('name', name)
        .transition(animation)
        .attrTween('stroke-dasharray', growLineAnimation as any);
    });
  }

  /**
   * Remove brushed elements that are no longer in selection
   */
  private _removeBrushedElements(id: number): { points: unknown[]; relations: unknown[] } {
    const animation = d3.transition<SVGElement>().duration(500).ease(d3.easeQuadInOut);

    const currentSelection = d3.selectAll(`.brush-${id}`);
    const toBeRemoved = currentSelection.filter(
      (each: unknown) => !this.brushComponent.brushedBlocks.map(d => d.id).includes((each as { group: number }).group)
    );

    const removedPoints: unknown[] = [];
    const removedRelations: unknown[] = [];

    toBeRemoved.each(function (each: unknown) {
      const elem = this as SVGElement;
      if (elem.tagName === 'path') {
        d3.select(this)
          .transition(animation)
          .attr('marker-end', '')
          .attrTween('stroke-dasharray', function () {
            const length = (this as SVGPathElement).getTotalLength();
            return d3.interpolate(`${length},${length}`, `0,${length}`);
          })
          .on('end', function () {
            d3.select(this).remove();
          });
        removedRelations.push(each);
      }
      if (elem.tagName === 'circle') {
        d3.select(this)
          .transition(animation)
          .attr('opacity', 1e-6)
          .on('end', function () {
            d3.select(this).remove();
          });
        removedPoints.push(each);
      }
    });

    d3.selectAll(`.brush-group-${this._block_id}`).each(function () {
      if (d3.select(this).selectAll('*').nodes().length === 0) {
        d3.select(this).remove();
      }
    });

    return { points: removedPoints, relations: removedRelations };
  }

  /**
   * Draw brushed points from other time periods
   */
  private _drawBrushedPoints(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    fixedBrushPoints: ForceNode[],
    newPoints: ForceNode[]
  ): void {
    const mainPoints = this.existence.points;
    const arc = d3.select(`#left-arc-${this._block_id}`).node() as SVGPathElement;
    const baseX = arc.getBBox().x + arc.getBBox().width;
    const transform = arc.getAttribute('transform') || 'translate(0,0)';
    const currX = +transform.split(',')[0].split('(')[1];

    const nodes: ForceNode[] = [
      ...mainPoints.map(d => ({ ...d, fx: d.x, fy: d.y })),
      ...fixedBrushPoints.map(d => ({ ...d, fx: d.x, fy: d.y })),
      ...newPoints
    ];

    if (this.force) {
      const simulation = d3
        .forceSimulation(nodes)
        .force(
          'x',
          d3.forceX((d: ForceNode) => d.x)
        )
        .force(
          'y',
          d3.forceY((d: ForceNode) => d.y)
        )
        .force('collide', d3.forceCollide(5 + 1))
        .stop();

      for (let i = 0; i < 100; i++) simulation.tick();
    }

    container
      .selectAll('circle')
      .data(newPoints)
      .join('circle')
      .attr('class', `points brush-${this._block_id} brush brush-points-${this._block_id}`)
      .attr('groupID', this._block_id)
      .attr('cx', baseX)
      .attr('cy', this._top_posY)
      .attr('r', 5)
      .attr('fill', e => this._nodeColorScale(+e.label))
      .attr('transform', d => `translate(${currX + d.x}, ${d.y})`);
  }

  /**
   * Update brushed selection after brush change
   */
  updateBrushedSelection(): void {
    const existing = { points: [...this.existence.points], relations: [...this.existence.relations] };
    let existingPointLength = existing.points.length;
    let fixedBrushPoints: ForceNode[] = [];

    // Remove elements no longer in selection
    const removal = this._removeBrushedElements(this._block_id);

    const currentBrushedPoints = d3.selectAll(`.brush-points-${this._block_id}`).filter((each: unknown) => !removal.points.includes(each));

    if (currentBrushedPoints.nodes().length !== 0) {
      fixedBrushPoints = currentBrushedPoints.data() as ForceNode[];
      existing.points = [...existing.points, ...fixedBrushPoints];
      existingPointLength += currentBrushedPoints.nodes().length;
    }

    const container = d3
      .select(`#block-click-${this._block_id}`)
      .append('g')
      .attr('class', `brush-group-${this._block_id}`)
      .attr('opacity', 0.4);

    // Add new points from brushed blocks
    this.brushComponent.brushedBlocks
      .filter(e => e.id !== this._block_id)
      .forEach(block => {
        const existingNames = existing.points.map(each => each.name);
        const uniquePoints = block.points.filter(each => !existingNames.includes(each.name));
        existing.points = [
          ...existing.points,
          ...uniquePoints.map(d => ({
            name: d.name,
            id: d.id,
            posX: d.posX,
            posY: d.posY,
            group: d.group,
            label: d.label,
            x: _compute_embedding(d.scaleX, this._moveX),
            y: _compute_embedding(d.scaleY, this._moveX),
            width: 6,
            height: 6
          }))
        ];
      });

    const tobeAdded = {
      points: existing.points.slice(existingPointLength),
      relations: []
    };

    if (tobeAdded.points.length === 0) return;

    this._drawBrushedPoints(
      container as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      fixedBrushPoints,
      tobeAdded.points
    );
  }
}
