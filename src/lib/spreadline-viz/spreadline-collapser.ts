/**
 * Collapser - Block Collapse Animation Handler
 * Ported from SpreadLine-main/demo/frontend/SpreadLiner/collapser.js
 *
 * Handles the collapse animation when an expanded block is clicked:
 * - Shifts elements back to the left
 * - Removes dummy fill lines with shrink animation
 * - Collapses block background
 * - Reverts node positions
 * - Removes relation arcs
 */

import * as d3 from 'd3';
import { Block, BrushComponent } from './spreadline-types';
import { shrinkLineAnimation, removeElement } from './spreadline-d3-utils';

export class Collapser {
  data: Block;
  posX: number;
  blockWidth: number;
  brushComponent: BrushComponent;
  duration = 500;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shrinkAnimation: any;

  private _block_id: number;
  private _moveX: number;

  constructor(block: Block, posX: number, blockWidth: number, brushComponent: BrushComponent) {
    this.data = block;
    this.posX = posX;
    this.blockWidth = blockWidth;
    this.brushComponent = brushComponent;
    this.shrinkAnimation = d3.transition().duration(this.duration).ease(d3.easeQuadInOut);
    this._block_id = block.id;
    this._moveX = block.moveX;
  }

  /**
   * Main collapse action - coordinates all collapse animations
   */
  act(): void {
    const blockWidth = this.blockWidth;
    const id = this._block_id;
    const moveX = this._moveX;
    const animation = this.shrinkAnimation;
    const posX = this.posX;

    /**
     * Translate elements back to the left
     */
    function collapseTranslate(this: d3.BaseType): void {
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
      let moveTo = currX - moveX;

      // Rules near the block center get half movement
      if (classes.includes('rules') && elem.getBBox().x < posX + blockWidth / 2) {
        moveTo = currX - moveX / 2;
      }

      d3.select(elem).transition(animation).attr('transform', `translate(${moveTo}, ${currY})`);
    }

    // Shift movable elements back to the left
    d3.selectAll('.movable')
      .filter(function () {
        const elem = this as SVGGraphicsElement;
        const bbox = elem.getBBox();
        return bbox.x + bbox.width / 2 >= posX && elem.getAttribute('id') !== `left-arc-${id}`;
      })
      .each(collapseTranslate);

    // Shift brush elements
    d3.selectAll('.brush')
      .filter(function () {
        const elem = this as SVGGraphicsElement;
        const groupID = elem.getAttribute('groupID');
        return groupID !== null && +groupID > id;
      })
      .each(collapseTranslate);

    // Shift symbol markers back
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
          .attr('transform', `translate(${currX - moveX}, ${data.posY}) rotate(${rotate})`);
      });

    this._removeDummyLines(id);
    this._collapseBlock(id);
    this._revertPointsLinks(id);
    this._updateBrush();
  }

  /**
   * Revert point positions and remove links
   */
  private _revertPointsLinks(id: number): void {
    const animation = this.shrinkAnimation;

    // Revert point positions
    d3.selectAll(`.points-${id}`).each(function (this: d3.BaseType, d: unknown) {
      const elem = this as SVGGraphicsElement;
      const point = d as { scaleX: number; scaleY: number };
      const transform = elem.getAttribute('transform') || 'translate(0,0)';
      const currX = +transform.split(',')[0].split('(')[1];

      if (point.scaleX === 0 && point.scaleY === 0) return;

      const embX = elem.getAttribute('embX') || '0';

      d3.select(elem)
        .transition(animation)
        .attr('transform', `translate(${currX - +embX}, 0)`)
        .attr('r', 5);
    });

    // Remove relation links with shrink animation
    d3.selectAll(`.links-${id}`)
      .transition(animation)
      .attr('marker-end', '')
      .attrTween('stroke-dasharray', shrinkLineAnimation as any)
      .on('end', removeElement as any);

    // Remove brushed points
    d3.selectAll(`.brush-points-${id}`)
      .transition(animation)
      .attr('opacity', 1e-6)
      .on('end', removeElement as any);

    // Remove brushed links
    d3.selectAll(`.brush-links-${id}`)
      .transition(animation)
      .attr('marker-end', '')
      .attrTween('stroke-dasharray', shrinkLineAnimation as any)
      .on('end', removeElement as any);
  }

  /**
   * Collapse the block background
   */
  private _collapseBlock(id: number): void {
    // Animate horizontal bars with shrink
    d3.selectAll(`.horizontal-bars-${id}`)
      .transition(this.shrinkAnimation)
      .attrTween('stroke-dasharray', shrinkLineAnimation as any);

    // Collapse white background
    d3.select(`#arc-group-rect-${id}`)
      .transition()
      .duration(this.duration)
      .ease(d3.easeQuadInOut)
      .attr('width', 0)
      .on('end', removeElement as any);

    // Collapse board rects (custom content)
    d3.selectAll(`.board-rect-${id}`)
      .transition()
      .duration(this.duration)
      .ease(d3.easeQuadInOut)
      .attr('width', 0)
      .on('end', removeElement as any);

    // Fade out board opacity elements
    d3.selectAll(`.board-opacity-${id}`)
      .transition()
      .duration(this.duration)
      .ease(d3.easeQuadInOut)
      .style('opacity', 1e-6)
      .on('end', removeElement as any);
  }

  /**
   * Remove dummy fill lines with shrink animation
   */
  private _removeDummyLines(id: number): void {
    d3.selectAll(`.dummy-movable-${id}`)
      .transition()
      .duration(this.duration)
      .ease(d3.easeQuadInOut)
      .attrTween('stroke-dasharray', shrinkLineAnimation as any)
      .on('end', removeElement as any);
  }

  /**
   * Update brush position after collapse
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
        startX: currX + data.posX - this.blockWidth / 2 - shiftX - expandX / 2,
        endX: currX + data.posX + this.blockWidth / 2 - shiftX + expandX / 2
      };
    });

    let brushMove: [number, number] | null = null;
    if (this.brushComponent.brushedSelection.length !== 0) {
      const [startIdx, endIdx] = this.brushComponent.brushedSelection;
      brushMove = [timePositions[startIdx].startX, timePositions[endIdx].endX];
    }

    if (this.brushComponent.brush) {
      (d3.select('#time-container') as any).transition(this.shrinkAnimation).call(this.brushComponent.brush.move, brushMove);
    }
  }
}
