/* eslint-disable @typescript-eslint/no-this-alias */
/**
 * SpreadLineVisualizer - Main D3 Visualization Class
 * Ported from SpreadLine-main/demo/frontend/SpreadLiner/visualizer.js
 *
 * This class handles all D3-based rendering and interactions for the SpreadLine visualization.
 * It uses D3 for:
 * - SVG element creation and management
 * - Transitions and animations (500ms, easeQuadInOut)
 * - Event handling (hover, click, brush)
 * - Force simulation for collision detection
 */

import * as d3 from 'd3';
import { Expander } from './spreadline-expander';
import { Collapser } from './spreadline-collapser';
import {
  SpreadLineData,
  SpreadLineConfig,
  Storyline,
  Block,
  TimeLabel,
  BrushComponent,
  HopSectionInfo,
  createDefaultConfig
} from './spreadline-types';
import {
  arraysEqual,
  _compute_embedding,
  getTextWidth,
  wrap,
  createStyleElementFromCSS,
  debounce,
  getThemeColors,
  ThemeColors
} from './spreadline-d3-utils';

export class SpreadLinesVisualizer {
  // Data
  data: SpreadLineData;
  config: SpreadLineConfig;
  storylines: (Storyline & { label: Storyline['label'] & { show?: string } })[];

  // Layout
  margin = { top: 40, right: 20, bottom: 20, left: 150 };
  _BAND_WIDTH: number;
  _EGO: string;
  _LEGEND_OFFSET = 40;
  _ANNOTATION_OFFSET = 0;
  _FILTER_THRESHOLD = 1;
  _FILTER_CROSSING = false;
  _HIDE_LABELS: 'hidden' | 'revealed' | 'some' = 'some';
  _button_labels = { hidden: 'Hide Labels', revealed: 'Reveal Labels', some: 'Some Labels' };

  // State
  visibility: Record<string, boolean> = {};
  members = { slider: [] as string[], crossing: [] as string[], pinned: [] as string[] };
  actors: Record<number, Expander | Collapser> = {};
  force = true;
  nodeColorScale: d3.ScaleThreshold<number, string>;
  theme: ThemeColors;

  // Track collapsed hop sections: blockId -> Set of collapsed sections ('top' | 'bottom')
  collapsedSections: Map<number, Set<'top' | 'bottom'>> = new Map();

  // D3 selections
  chartContainer!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  tooltipContainer!: d3.Selection<HTMLElement, unknown, null, undefined>;

  // Brush
  brushComponent: BrushComponent = {
    brush: null,
    brushedBlocks: [],
    brushedSelection: []
  };

  // Callbacks for React integration
  onFilterChange?: (filteredNames: string[]) => void;
  onBlockExpand?: (blockId: number, expanded: boolean) => void;

  constructor(json: SpreadLineData, config?: Partial<SpreadLineConfig>) {
    this.theme = getThemeColors();
    this.data = json;
    this.config = { ...createDefaultConfig(), ...config };
    this.storylines = json.storylines.map(s => ({ ...s }));
    this._BAND_WIDTH = json.bandWidth;
    this._EGO = json.ego;
    this._ANNOTATION_OFFSET = this.config.background.annotations.length > 0 ? 35 : 0;
    this.nodeColorScale = this.config.legend.node.scale;
  }

  /**
   * Main visualization entry point
   * @param container - SVG element or selector
   */
  visualize(container: SVGSVGElement | string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chartContainer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tooltipContainer: any;

    if (typeof container === 'string') {
      const elem = document.querySelector(container);
      if (elem?.tagName === 'SVG') {
        chartContainer = d3.select(elem as SVGSVGElement);
        tooltipContainer = d3.select(elem.parentElement as HTMLElement);
      } else {
        chartContainer = d3.select(container).append('svg').attr('id', 'story-svg');
        tooltipContainer = d3.select(container);
      }
    } else {
      chartContainer = d3.select(container);
      tooltipContainer = d3.select(container.parentElement as HTMLElement);
    }

    chartContainer.attr('width', '100%').attr('height', '100%');

    const bbox = chartContainer.node()!.getBoundingClientRect();
    const startY = Math.max(this.margin.top, 50) - 50;
    this.brushComponent.brush = d3.brushX().extent([
      [0, startY],
      [bbox.width - this.margin.right, startY + 30]
    ]);

    const timeLabels = this.data.timeLabels;
    const heightExtents = this.data.heightExtents;

    chartContainer
      .attr('width', Math.max(...timeLabels.map(d => d.posX)) + this.margin.left + this.margin.right + 100)
      .attr('height', heightExtents[1] + this.margin.top + this.margin.bottom + this._LEGEND_OFFSET + this._ANNOTATION_OFFSET + 20);

    // Initialize visibility
    this.data.storylines.forEach(d => (this.visibility[d.name] = true));

    this.chartContainer = chartContainer;
    this.tooltipContainer = tooltipContainer;

    // Calculate label visibility threshold
    const lifeSpans = this.storylines.map(d => d.lifespan);
    const quantile80 = d3.quantile(lifeSpans, 0.8);
    const toShowLabel = Math.min(quantile80 || 20, 20);
    this.storylines = this.storylines.map(d => ({
      ...d,
      label: { ...d.label, show: d.lifespan > toShowLabel ? 'visible' : 'hidden' }
    }));

    // Create tooltip if enabled
    if (this.config.tooltip.showLinkTooltip || this.config.tooltip.showPointTooltip) {
      this._createTooltip();
    }

    // Draw all components
    this._drawBackground();
    this._activateBrush(timeLabels, this.data.blocks);
    this._drawLineLegend();
    this._drawNodeLegend();
    this._drawStorylines();
    this._drawBlocksAndPoints();
    this._drawLabels();

    // Apply initial label visibility - match original exactly
    if (this._HIDE_LABELS === 'some') {
      const ego = this._EGO;
      const storylines = this.storylines;
      // Original uses two chained filters
      d3.selectAll('.labels,.mark-links')
        .filter((d: unknown) => (d as { name: string }).name !== ego)
        .filter((d: unknown) => {
          const data = d as { name: string; label?: { show?: string } };
          if (data.label !== undefined) {
            return data.label.show !== 'visible';
          }
          const entity = storylines.find(e => e.name === data.name);
          return entity?.label.show !== 'visible';
        })
        .style('visibility', 'hidden');
    }

    // Inject styles
    const svgNode = chartContainer.node();
    if (svgNode) {
      const style = createStyleElementFromCSS();
      svgNode.insertBefore(style, svgNode.firstChild);
    }

    // Create arrow marker
    chartContainer
      .append('defs')
      .append('marker')
      .attr('id', 'arrow-head')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .attr('xoverflow', 'visible')
      .append('path')
      .attr('d', 'M0,-4 L10,0 L0,4 Z')
      .style('fill', this.theme.foreground);
  }

  /**
   * Draw background elements (direction labels, time labels, rules)
   */
  private _drawBackground(): void {
    const self = this;
    const egoLabel = this.data.storylines.find(d => d.name === this._EGO)!.label;
    const heightExtents = this.data.heightExtents;
    const config = this.config.background;
    const textFormat = config.timeLabelFormat;

    // Direction labels (External/Internal)
    this.chartContainer
      .append('g')
      .attr('id', 'direction-container')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top + this._LEGEND_OFFSET + this._ANNOTATION_OFFSET})`)
      .selectAll('text')
      .data(config.direction)
      .join('text')
      .text(d => d)
      .attr('class', 'text-display')
      .attr('x', this.margin.left - 50)
      .attr('y', (_, i) =>
        i === 0 ? egoLabel.posY - (egoLabel.posY - heightExtents[0]) * 0.5 : egoLabel.posY + (heightExtents[1] - egoLabel.posY) * 0.5
      )
      .attr('fill', self.theme.mutedForeground)
      .style('opacity', 0.25)
      .style('font-size', config.directionFontSize)
      .style('text-anchor', 'start');

    // Time labels and rules
    this.chartContainer
      .append('g')
      .attr('id', 'time-container')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top + this._ANNOTATION_OFFSET})`)
      .selectAll('g')
      .data(this.data.timeLabels)
      .join(enter => {
        const container = enter.append('g');

        container
          .append('text')
          .attr('class', 'movable time-labels text-display rules')
          .attr('transform', 'translate(0, 0)')
          .attr('id', d => `time-label-${d.label}`)
          .text(d => textFormat(d.label))
          .attr('x', d => d.posX)
          .attr('y', this.margin.top / 2)
          .attr('fill', d => {
            const annotation = config.annotations.find(e => e.time === d.label);
            return annotation ? annotation.color : self.theme.foreground;
          })
          .style('cursor', 'pointer')
          .on('click', function (event: MouseEvent, d: TimeLabel) {
            const block = self.data.blocks.find(b => b.time === d.label);
            if (block) {
              self._blockUpdate(event, block);
            }
          });

        container
          .append('line')
          .attr('class', 'movable rules')
          .attr('transform', 'translate(0, 0)')
          .attr('x1', d => d.posX)
          .attr('x2', d => d.posX)
          .attr('y1', this.margin.top / 2 + 5)
          .attr('y2', heightExtents[1] + 20)
          .attr('stroke', self.theme.border)
          .style('opacity', 0.2)
          .style('stroke-dasharray', '2, 2');

        return container;
      });

    // Annotations
    if (config.annotations.length > 0) {
      this.chartContainer
        .append('g')
        .attr('id', 'time-annotation-container')
        .attr('transform', `translate(${this.margin.left}, ${this.margin.top + this._LEGEND_OFFSET / 2})`)
        .selectAll('g')
        .data(config.annotations)
        .join(enter => {
          const container = enter.append('g');
          container
            .append('text')
            .text(d => d.text)
            .attr('class', 'movable rules text-display')
            .attr('x', d => {
              const timeLabel = this.data.timeLabels.find(e => e.label === d.time);
              return timeLabel?.posX || 0;
            })
            .attr('y', 0)
            .attr('transform', 'translate(0, 0)')
            .attr('fill', d => d.color)
            .style('font-size', '.7rem')
            .style('text-anchor', 'middle')
            .call(wrap as any, 100);
          return container;
        });
    }
  }

  /**
   * Draw storyline paths, markers, and interactions
   */
  private _drawStorylines(): void {
    const self = this;

    this.chartContainer
      .append('g')
      .attr('id', 'storyline-container')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top + this._LEGEND_OFFSET + this._ANNOTATION_OFFSET})`)
      .selectAll('g')
      .data(this.data.storylines)
      .join(enter => {
        const container = enter
          .append('g')
          .attr('class', d => (d.name === this._EGO ? 'storyline-ego' : 'storyline-alter'))
          .style('cursor', d => (d.name === this._EGO ? 'default' : 'pointer'));

        // Single continuous path per storyline (renders behind pills)
        container
          .append('path')
          .attr('stroke', d => d.color)
          .attr('name', d => d.name)
          .attr('class', d => `line-${d.id} line-filter movable path-movable`)
          .attr('d', d => d.lines.join(' '))
          .attr('transform', 'translate(0, 0)');

        // Entry/exit markers
        container
          .append('g')
          .attr('fill', d => d.color)
          .attr('class', d => `line-${d.id} marks line-filter`)
          .attr('name', d => d.name)
          .selectAll('path')
          .data(d => d.marks)
          .join('path')
          .attr('class', 'symbol-movable')
          .attr(
            'd',
            d3
              .symbol()
              .type(d3.symbolTriangle)
              .size((e: unknown) => (e as { size: number }).size)
          )
          .attr('transform', (e, idx) =>
            idx % 2 === 0 ? `translate(${e.posX}, ${e.posY}) rotate(90)` : `translate(${e.posX}, ${e.posY}) rotate(-90)`
          );

        return container;
      })
      .on('mouseover', function (event, d) {
        self._lineHover(event, d as Storyline);
      })
      .on('click', function (event, d) {
        self._linePin(d as Storyline);
      })
      .on('mouseout', function (event, d) {
        self._lineHoverOut(event, d as Storyline);
      });
  }

  /**
   * Draw blocks (arcs) and points
   */
  private _drawBlocksAndPoints(): void {
    const self = this;
    const nodeColorScale = this.nodeColorScale;

    this.chartContainer
      .append('g')
      .attr('id', 'block-container')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top + this._LEGEND_OFFSET + this._ANNOTATION_OFFSET})`)
      .selectAll('g')
      .data(this.data.blocks)
      .join(enter => {
        const container = enter
          .append('g')
          .attr('class', 'arcs')
          .attr('id', d => `arc-group-${d.id}`)
          .append('g')
          .attr('id', d => `block-click-${d.id}`)
          .on('click', (event: MouseEvent, d: Block) => {
            this._blockUpdate(event, d);
          });

        // Main section - Left arc
        container
          .append('path')
          .attr('id', d => `left-arc-${d.id}`)
          .attr('class', d => `movable station-arcs left-arcs left-arc-${d.time}`)
          .attr('d', d => d.outline.left)
          .attr('transform', 'translate(0, 0)')
          .attr('active', 0);

        // Main section - Right arc
        container
          .append('path')
          .attr('id', d => `right-arc-${d.id}`)
          .attr('class', 'movable station-arcs')
          .attr('d', d => d.outline.right)
          .attr('transform', 'translate(0, 0)');

        // Top 2-hop section paths (if exists)
        container
          .filter(d => d.outline.topHop != null)
          .each(function (d) {
            const g = d3.select(this);
            const topHop = d.outline.topHop!;

            // Top arc (semicircle at top) - fill:none so storylines show through
            g.append('path')
              .attr('id', `top-hop-top-arc-left-${d.id}`)
              .attr('class', 'movable station-arcs top-hop-arc')
              .attr('d', topHop.topArcLeft)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)');
            g.append('path')
              .attr('id', `top-hop-top-arc-right-${d.id}`)
              .attr('class', 'movable station-arcs top-hop-arc')
              .attr('d', topHop.topArcRight)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)');

            // Line (vertical portion) - this is what we animate
            g.append('path')
              .attr('id', `top-hop-line-left-${d.id}`)
              .attr('class', 'movable station-arcs top-hop-line')
              .attr('d', topHop.lineLeft)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)')
              .attr('data-original-d', topHop.lineLeft)
              .attr('data-line-height', topHop.lineHeight);
            g.append('path')
              .attr('id', `top-hop-line-right-${d.id}`)
              .attr('class', 'movable station-arcs top-hop-line')
              .attr('d', topHop.lineRight)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)')
              .attr('data-original-d', topHop.lineRight)
              .attr('data-line-height', topHop.lineHeight);

            // Bottom arc (transition to main) - fill:none so storylines show through
            g.append('path')
              .attr('id', `top-hop-bottom-arc-left-${d.id}`)
              .attr('class', 'movable station-arcs top-hop-arc')
              .attr('d', topHop.bottomArcLeft)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)');
            g.append('path')
              .attr('id', `top-hop-bottom-arc-right-${d.id}`)
              .attr('class', 'movable station-arcs top-hop-arc')
              .attr('d', topHop.bottomArcRight)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)');
          });

        // Bottom 2-hop section paths (if exists)
        container
          .filter(d => d.outline.bottomHop != null)
          .each(function (d) {
            const g = d3.select(this);
            const bottomHop = d.outline.bottomHop!;

            // Top arc (transition from main) - fill:none so storylines show through
            g.append('path')
              .attr('id', `bottom-hop-top-arc-left-${d.id}`)
              .attr('class', 'movable station-arcs bottom-hop-arc')
              .attr('d', bottomHop.topArcLeft)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)');
            g.append('path')
              .attr('id', `bottom-hop-top-arc-right-${d.id}`)
              .attr('class', 'movable station-arcs bottom-hop-arc')
              .attr('d', bottomHop.topArcRight)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)');

            // Line (vertical portion) - this is what we animate
            g.append('path')
              .attr('id', `bottom-hop-line-left-${d.id}`)
              .attr('class', 'movable station-arcs bottom-hop-line')
              .attr('d', bottomHop.lineLeft)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)')
              .attr('data-original-d', bottomHop.lineLeft)
              .attr('data-line-height', bottomHop.lineHeight);
            g.append('path')
              .attr('id', `bottom-hop-line-right-${d.id}`)
              .attr('class', 'movable station-arcs bottom-hop-line')
              .attr('d', bottomHop.lineRight)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)')
              .attr('data-original-d', bottomHop.lineRight)
              .attr('data-line-height', bottomHop.lineHeight);

            // Bottom arc (semicircle at bottom) - fill:none so storylines show through
            g.append('path')
              .attr('id', `bottom-hop-bottom-arc-left-${d.id}`)
              .attr('class', 'movable station-arcs bottom-hop-arc')
              .attr('d', bottomHop.bottomArcLeft)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)');
            g.append('path')
              .attr('id', `bottom-hop-bottom-arc-right-${d.id}`)
              .attr('class', 'movable station-arcs bottom-hop-arc')
              .attr('d', bottomHop.bottomArcRight)
              .attr('fill', 'none')
              .attr('transform', 'translate(0, 0)');
          });

        // Horizontal bars (hidden until expanded)
        container
          .append('path')
          .attr('id', d => `top-bar-${d.id}`)
          .attr('d', d => d.outline.top)
          .attr('class', d => `station-arcs movable group horizontal-bars-${d.id} horizontal-bars`)
          .attr('groupID', d => d.id)
          .attr('transform', 'translate(0, 0)')
          .style('visibility', 'hidden');

        container
          .append('path')
          .attr('id', d => `bottom-bar-${d.id}`)
          .attr('d', d => d.outline.bottom)
          .attr('class', d => `station-arcs movable group horizontal-bars-${d.id} horizontal-bars`)
          .attr('groupID', d => d.id)
          .attr('transform', 'translate(0, 0)')
          .style('visibility', 'hidden');

        // Points
        container
          .selectAll('circle.points')
          .data(d => d.points)
          .join('circle')
          .attr('class', d => `movable points-${d.group} points-${d.name} points`)
          .attr('id', d => `point-${d.group}-${d.id}`)
          .attr('cx', d => d.posX)
          .attr('cy', d => d.posY)
          .attr('r', 6)
          .attr('fill', e => (e.label === '-100' ? self.theme.background : nodeColorScale(+e.label)))
          .attr('transform', 'translate(0, 0)')
          .style('visibility', d => d.visibility)
          .style('cursor', d => (self.visibility[d.name] === false ? 'default' : 'pointer'))
          .on('mouseover', function (event, d) {
            if (self.visibility[d.name] === false) return;
            self._showPointTooltip(d.name, +d.label);
            self._lineHover(event, d as unknown as Storyline);
          })
          .on('mouseout', function (event, d) {
            if (self.visibility[d.name] === false) return;
            d3.select('#point-tooltip').style('visibility', 'hidden');
            self._lineHoverOut(event, d as unknown as Storyline);
          });

        // Collapse buttons for top 2-hop section
        // Position at exterior (top of semicircle: topY - radius)
        container
          .filter(d => d.hopSections?.top !== null && d.hopSections?.top !== undefined && d.outline.topHop != null)
          .append('g')
          .attr('class', d => `hop-collapse-group hop-collapse-top-${d.id}`)
          .attr('transform', d => {
            const topHop = d.outline.topHop!;
            const radius = this.data.blockWidth / 2;
            // Position at top of semicircle (exterior)
            return `translate(${d.points[0]?.posX || 0}, ${topHop.topY - radius})`;
          })
          .each(function (d) {
            const g = d3.select(this);
            const section = d.hopSections!.top!;

            // Collapse button [-] (visible when expanded)
            g.append('rect')
              .attr('class', `hop-collapse-btn hop-collapse-btn-top-${d.id}`)
              .attr('x', -10)
              .attr('y', -8)
              .attr('width', 20)
              .attr('height', 16)
              .attr('rx', 3)
              .attr('fill', self.theme.muted)
              .attr('stroke', self.theme.border)
              .attr('stroke-width', 1)
              .style('cursor', 'pointer');

            g.append('text')
              .attr('class', `hop-collapse-btn-text hop-collapse-btn-text-top-${d.id}`)
              .attr('x', 0)
              .attr('y', 4)
              .attr('text-anchor', 'middle')
              .attr('font-size', '12px')
              .attr('fill', self.theme.mutedForeground)
              .style('cursor', 'pointer')
              .style('user-select', 'none')
              .text('−');

            // Expand button [+] (hidden when expanded, shown when collapsed)
            g.append('rect')
              .attr('class', `hop-expand-btn hop-expand-btn-top-${d.id}`)
              .attr('x', -10)
              .attr('y', -8)
              .attr('width', 20)
              .attr('height', 16)
              .attr('rx', 3)
              .attr('fill', self.theme.muted)
              .attr('stroke', self.theme.border)
              .attr('stroke-width', 1)
              .style('cursor', 'pointer')
              .style('visibility', 'hidden');

            g.append('text')
              .attr('class', `hop-expand-btn-text hop-expand-btn-text-top-${d.id}`)
              .attr('x', 0)
              .attr('y', 4)
              .attr('text-anchor', 'middle')
              .attr('font-size', '12px')
              .attr('fill', self.theme.mutedForeground)
              .style('cursor', 'pointer')
              .style('user-select', 'none')
              .style('visibility', 'hidden')
              .text('+');

            // Count circle (hidden when expanded, shown when collapsed)
            g.append('circle')
              .attr('class', `hop-count-circle hop-count-circle-top-${d.id}`)
              .attr('cx', 0)
              .attr('cy', 20)
              .attr('r', 12)
              .attr('fill', self.theme.muted)
              .attr('stroke', self.theme.border)
              .attr('stroke-width', 1)
              .style('cursor', 'pointer')
              .style('visibility', 'hidden');

            g.append('text')
              .attr('class', `hop-count-text hop-count-text-top-${d.id}`)
              .attr('x', 0)
              .attr('y', 24)
              .attr('text-anchor', 'middle')
              .attr('font-size', '11px')
              .attr('font-weight', 'bold')
              .attr('fill', self.theme.mutedForeground)
              .style('cursor', 'pointer')
              .style('user-select', 'none')
              .style('visibility', 'hidden')
              .text(section.nodeCount);

            // Click handler for entire group
            g.on('click', function (event: MouseEvent) {
              event.stopPropagation();
              self._toggleHopSection(d.id, 'top');
            });
          });

        // Collapse buttons for bottom 2-hop section
        // Position at exterior (bottom of semicircle: bottomY + radius)
        container
          .filter(d => d.hopSections?.bottom !== null && d.hopSections?.bottom !== undefined && d.outline.bottomHop != null)
          .append('g')
          .attr('class', d => `hop-collapse-group hop-collapse-bottom-${d.id}`)
          .attr('transform', d => {
            const bottomHop = d.outline.bottomHop!;
            const radius = this.data.blockWidth / 2;
            // Position at bottom of semicircle (exterior)
            return `translate(${d.points[0]?.posX || 0}, ${bottomHop.bottomY + radius})`;
          })
          .each(function (d) {
            const g = d3.select(this);
            const section = d.hopSections!.bottom!;

            // Collapse button [-] (visible when expanded)
            g.append('rect')
              .attr('class', `hop-collapse-btn hop-collapse-btn-bottom-${d.id}`)
              .attr('x', -10)
              .attr('y', -8)
              .attr('width', 20)
              .attr('height', 16)
              .attr('rx', 3)
              .attr('fill', self.theme.muted)
              .attr('stroke', self.theme.border)
              .attr('stroke-width', 1)
              .style('cursor', 'pointer');

            g.append('text')
              .attr('class', `hop-collapse-btn-text hop-collapse-btn-text-bottom-${d.id}`)
              .attr('x', 0)
              .attr('y', 4)
              .attr('text-anchor', 'middle')
              .attr('font-size', '12px')
              .attr('fill', self.theme.mutedForeground)
              .style('cursor', 'pointer')
              .style('user-select', 'none')
              .text('−');

            // Expand button [+] (hidden when expanded, shown when collapsed)
            g.append('rect')
              .attr('class', `hop-expand-btn hop-expand-btn-bottom-${d.id}`)
              .attr('x', -10)
              .attr('y', -8)
              .attr('width', 20)
              .attr('height', 16)
              .attr('rx', 3)
              .attr('fill', self.theme.muted)
              .attr('stroke', self.theme.border)
              .attr('stroke-width', 1)
              .style('cursor', 'pointer')
              .style('visibility', 'hidden');

            g.append('text')
              .attr('class', `hop-expand-btn-text hop-expand-btn-text-bottom-${d.id}`)
              .attr('x', 0)
              .attr('y', 4)
              .attr('text-anchor', 'middle')
              .attr('font-size', '12px')
              .attr('fill', self.theme.mutedForeground)
              .style('cursor', 'pointer')
              .style('user-select', 'none')
              .style('visibility', 'hidden')
              .text('+');

            // Count circle (hidden when expanded, shown when collapsed)
            g.append('circle')
              .attr('class', `hop-count-circle hop-count-circle-bottom-${d.id}`)
              .attr('cx', 0)
              .attr('cy', -20)
              .attr('r', 12)
              .attr('fill', self.theme.muted)
              .attr('stroke', self.theme.border)
              .attr('stroke-width', 1)
              .style('cursor', 'pointer')
              .style('visibility', 'hidden');

            g.append('text')
              .attr('class', `hop-count-text hop-count-text-bottom-${d.id}`)
              .attr('x', 0)
              .attr('y', -16)
              .attr('text-anchor', 'middle')
              .attr('font-size', '11px')
              .attr('font-weight', 'bold')
              .attr('fill', self.theme.mutedForeground)
              .style('cursor', 'pointer')
              .style('user-select', 'none')
              .style('visibility', 'hidden')
              .text(section.nodeCount);

            // Click handler for entire group
            g.on('click', function (event: MouseEvent) {
              event.stopPropagation();
              self._toggleHopSection(d.id, 'bottom');
            });
          });

        return container;
      });
  }

  /**
   * Draw entity labels
   */
  private _drawLabels(): void {
    this.chartContainer
      .append('g')
      .attr('id', 'label-container')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top + this._LEGEND_OFFSET + this._ANNOTATION_OFFSET})`)
      .selectAll('g')
      .data(this.storylines)
      .join(enter => {
        const container = enter
          .append('g')
          .attr('class', 'pin-check')
          .attr('name', d => d.name)
          .attr('id', d => `label-${d.name}`)
          .attr('point-id', d => d.id)
          .attr('pin', 0)
          .style('cursor', 'default');

        // Main label
        const labelText = container
          .append('text')
          .attr('fill', d => d.color)
          .text(d => d.label.label)
          .attr('class', 'stroked-text movable text-display labels line-labels')
          .attr('x', d => d.label.posX)
          .attr('y', d => d.label.posY)
          .attr('dy', '4px')
          .attr('transform', 'translate(0, 0)')
          .style('text-anchor', d => d.label.textAlign)
          .style('visibility', d => d.label.visibility)
          .on('mouseover', (event, d) => this._lineHover(event, d))
          .on('mouseout', (event, d) => this._lineHoverOut(event, d));

        // Add title element for tooltip (shows full name on hover if truncated)
        labelText.append('title').text(d => d.label.fullLabel || d.label.label);

        // Inline labels background
        container
          .append('g')
          .selectAll('text')
          .data(d => d.inlineLabels)
          .join('text')
          .attr('class', 'text-display movable labels inline-labels')
          .text(e => e.name)
          .attr('x', e => e.posX)
          .attr('y', e => e.posY)
          .attr('transform', 'translate(0, 0)')
          .style('text-anchor', 'middle')
          .attr('stroke', this.theme.background)
          .attr('stroke-width', '4px')
          .attr('dy', '4px');

        // Inline labels foreground
        container
          .append('g')
          .attr('fill', d => d.color)
          .selectAll('text')
          .data(d => d.inlineLabels)
          .join('text')
          .attr('class', 'text-display stroked-text movable labels inline-labels')
          .attr('transform', 'translate(0, 0)')
          .text(e => e.name)
          .attr('x', e => e.posX)
          .attr('y', e => e.posY)
          .style('text-anchor', 'middle')
          .attr('dy', '4px');

        // Label connector line
        container
          .append('path')
          .attr('stroke', d => d.color)
          .attr('d', d => (d.name === this._EGO ? '' : d.label.line))
          .attr('name', d => d.name)
          .style('visibility', d => d.label.visibility)
          .attr('class', 'movable mark-links line-labels')
          .attr('transform', 'translate(0, 0)')
          .attr('fill', 'none')
          .attr('stroke-width', '2px');

        return container;
      });
  }

  /**
   * Draw line legend
   */
  private _drawLineLegend(): void {
    const legendContainer = this.chartContainer.append('g').attr('id', 'line-legend-container');
    const config = this.config.legend.line;
    const buttonOffset = 100;
    const swatchSize = 15;
    const betweenOffset = [
      0,
      ...config.domain
        .map(d => getTextWidth(d, '12px') + swatchSize * 2 + 5)
        .reduce((acc: number[], x, i) => [...acc, x + (acc[i - 1] || 0)], [])
    ];

    const legend = legendContainer
      .append('g')
      .attr('transform', `translate(${this.margin.left + buttonOffset}, ${Math.max(this.margin.top / 2, 20)})`);

    // Label toggle button
    const self = this;
    legendContainer
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${Math.max(this.margin.top / 2, 20) + 10 + swatchSize / 2 + 3})`)
      .append('text')
      .text(this._button_labels[this._HIDE_LABELS])
      .attr('status', this._HIDE_LABELS)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('cursor', 'pointer')
      .on('click', function () {
        const status = this.getAttribute('status') as 'hidden' | 'revealed' | 'some';
        const ego = self._EGO;
        const storylines = self.storylines;

        if (status === 'revealed') {
          d3.selectAll('.labels,.mark-links')
            .filter((d: unknown) => (d as { name: string }).name !== ego)
            .style('visibility', 'hidden');
        }
        if (status === 'hidden') {
          d3.selectAll('.labels,.mark-links')
            .filter((d: unknown) => {
              const data = d as { name: string; label?: { show?: string } };
              if (data.name === ego) return false;
              if (data.label?.show !== undefined) return data.label.show === 'visible';
              const entity = storylines.find(e => e.name === data.name);
              return entity?.label.show === 'visible';
            })
            .style('visibility', 'visible');
        }
        if (status === 'some') {
          d3.selectAll('.labels,.mark-links')
            .filter((d: unknown) => (d as { name: string }).name !== ego)
            .style('visibility', 'visible');
        }

        const newStatus = status === 'revealed' ? 'hidden' : status === 'hidden' ? 'some' : 'revealed';
        this.setAttribute('status', newStatus);
        this.textContent = self._button_labels[newStatus];
      });

    // Color swatches
    legend
      .selectAll('rect')
      .data(config.range)
      .join('rect')
      .attr('class', 'line-swatches')
      .attr('width', swatchSize)
      .attr('height', swatchSize)
      .attr('fill', d => d)
      .attr('status', 'revealed')
      .attr('transform', (_, i) => `translate(${betweenOffset[i]}, 10)`)
      .on('click', function (this: d3.BaseType, _, color) {
        const elem = this as SVGRectElement;
        const status = elem.getAttribute('status');
        if (status === 'revealed') {
          d3.selectAll('.line-filter')
            .filter((d: unknown) => (d as { color: string }).color === color)
            .style('visibility', 'hidden');
        }
        if (status === 'hidden') {
          d3.selectAll('.line-filter')
            .filter((d: unknown) => (d as { color: string }).color === color)
            .style('visibility', 'visible');
        }
        elem.setAttribute('status', status === 'revealed' ? 'hidden' : 'revealed');
        elem.setAttribute('fill', status === 'revealed' ? self.theme.mutedForeground : color);
      });

    // Labels
    legend
      .selectAll('legendText')
      .data(config.domain)
      .join('text')
      .text(d => d)
      .attr('transform', (_, i) => `translate(${betweenOffset[i] + swatchSize + 5}, ${10 + swatchSize / 2 + 3})`)
      .style('font-size', '12px')
      .style('text-anchor', 'start');
  }

  /**
   * Draw node color legend
   */
  private _drawNodeLegend(): void {
    const legendContainer = this.chartContainer.append('g').attr('id', 'node-legend-container');
    const lineLegendSize = (d3.select('#line-legend-container').node() as SVGGElement)?.getBBox() || { width: 0 };
    const legendTitle = this.config.legend.node.title;
    const legendOffset = lineLegendSize.width + 40 + getTextWidth(legendTitle, '0.7rem bold');
    const swatchSize = 10;
    const swatchWidth = 3.5;
    const domain = this.nodeColorScale.domain();
    const colors = [...this.nodeColorScale.range(), '#ffffff'];

    const legend = legendContainer
      .append('g')
      .attr('transform', `translate(${this.margin.left + legendOffset}, ${Math.max(this.margin.top / 2, 20)})`);

    legend
      .append('text')
      .text(legendTitle)
      .attr('transform', 'translate(0, 20)')
      .style('vertical-align', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('text-anchor', 'end');

    legend
      .selectAll('rect')
      .data(colors)
      .join('rect')
      .attr('width', swatchSize * swatchWidth)
      .attr('height', swatchSize)
      .attr('fill', d => d)
      .attr('stroke', d => (d === '#ffffff' ? this.theme.border : ''))
      .attr('stroke-width', d => (d === '#ffffff' ? 0.4 : 0))
      .attr('transform', (_, i) =>
        i === colors.length - 1
          ? `translate(${(i + 1) * swatchSize * swatchWidth + i * 1 + 10}, 12)`
          : `translate(${i * swatchSize * swatchWidth + i * 1 + 10}, 12)`
      );

    const offsets = [25, 65, 100, 170];
    const labels = ['Negative', 'Controversial', 'Positive', 'Neutral'];
    legend
      .selectAll('legendText')
      .data(labels)
      .join('text')
      .text(d => d)
      .attr('transform', (_, i) => `translate(${offsets[i]}, ${i % 2 === 0 ? 7 : 10 + 25})`)
      .style('font-size', '12px')
      .style('text-anchor', 'middle');
  }

  /**
   * Block click handler - expand/collapse
   */
  private _blockUpdate = (event: MouseEvent, d: Block): void => {
    const ele = document.getElementById(`left-arc-${d.id}`) as SVGGraphicsElement | null;
    if (!ele) return;

    const active = Boolean(+ele.getAttribute('active')!);
    ele.setAttribute('active', String(+!active));
    const bbox = ele.getBBox();

    const supplement = {
      nodeColorScale: this.nodeColorScale,
      reference: this.data.reference?.filter(e => String(e.year) === String(d.time)) || []
    };

    const moveX = d.moveX;
    const actor = active
      ? new Collapser(d, bbox.x, this._BAND_WIDTH, this.brushComponent)
      : new Expander(d, bbox.x, this._BAND_WIDTH, this.brushComponent, supplement, this.config.content, this._EGO);

    this.actors[d.id] = actor;
    const currWidth = +this.chartContainer.node()!.getAttribute('width')!;
    this.chartContainer.attr('width', active ? currWidth - moveX : currWidth + moveX);
    actor.act();

    if (active) delete this.actors[d.id];
    this.onBlockExpand?.(d.id, !active);
  };

  /**
   * Toggle collapse/expand for a hop section (top or bottom 2-hop)
   */
  private _toggleHopSection = (blockId: number, section: 'top' | 'bottom'): void => {
    const block = this.data.blocks.find(b => b.id === blockId);
    if (!block) return;

    const hopSection = block.hopSections?.[section];
    if (!hopSection) return;

    // Get or create collapsed set for this block
    if (!this.collapsedSections.has(blockId)) {
      this.collapsedSections.set(blockId, new Set());
    }
    const collapsed = this.collapsedSections.get(blockId)!;
    const isCurrentlyCollapsed = collapsed.has(section);

    // Toggle state
    if (isCurrentlyCollapsed) {
      collapsed.delete(section);
      this._expandHopSection(blockId, section, hopSection);
    } else {
      collapsed.add(section);
      this._collapseHopSection(blockId, section, hopSection);
    }
  };

  /**
   * Collapse a hop section with animation - shrinks the pill height
   * Simple approach: animate line height to 0, translate arcs
   */
  private _collapseHopSection(blockId: number, section: 'top' | 'bottom', hopSection: HopSectionInfo): void {
    const duration = 500;
    const ease = d3.easeQuadInOut;
    const block = this.data.blocks.find(b => b.id === blockId);
    if (!block) return;

    const hopPaths = section === 'top' ? block.outline.topHop : block.outline.bottomHop;
    if (!hopPaths) return;

    const lineHeight = hopPaths.lineHeight;
    const posX = block.points[0]?.posX || 0;
    const radius = this.data.blockWidth / 2;

    // Calculate new position for the collapse group
    // The group is initially positioned at exterior (topY - radius for top, bottomY + radius for bottom)
    // On collapse:
    // - Top section: top arc moves down by lineHeight, so new position is (topY - radius) + lineHeight
    // - Bottom section: bottom arc moves up by lineHeight, so new position is (bottomY + radius) - lineHeight
    const collapseGroup = d3.select(`.hop-collapse-${section}-${blockId}`);
    const originalY = section === 'top' ? hopPaths.topY - radius : hopPaths.bottomY + radius;
    const newY = section === 'top' ? originalY + lineHeight : originalY - lineHeight;

    // Animate the collapse group to new position
    collapseGroup.transition().duration(duration).ease(ease).attr('transform', `translate(${posX}, ${newY})`);

    // 1. Hide collapse button [-], show expand button [+] and count circle
    d3.select(`.hop-collapse-btn-${section}-${blockId}`)
      .transition()
      .duration(duration / 2)
      .style('opacity', 0)
      .on('end', function () {
        d3.select(this).style('visibility', 'hidden');
      });

    d3.select(`.hop-collapse-btn-text-${section}-${blockId}`)
      .transition()
      .duration(duration / 2)
      .style('opacity', 0)
      .on('end', function () {
        d3.select(this).style('visibility', 'hidden');
      });

    // Show expand button [+]
    d3.select(`.hop-expand-btn-${section}-${blockId}`)
      .style('visibility', 'visible')
      .style('opacity', 0)
      .transition()
      .delay(duration / 2)
      .duration(duration / 2)
      .style('opacity', 1);

    d3.select(`.hop-expand-btn-text-${section}-${blockId}`)
      .style('visibility', 'visible')
      .style('opacity', 0)
      .transition()
      .delay(duration / 2)
      .duration(duration / 2)
      .style('opacity', 1);

    // Show count circle
    d3.select(`.hop-count-circle-${section}-${blockId}`)
      .style('visibility', 'visible')
      .style('opacity', 0)
      .transition()
      .delay(duration / 2)
      .duration(duration / 2)
      .style('opacity', 1);

    d3.select(`.hop-count-text-${section}-${blockId}`)
      .style('visibility', 'visible')
      .style('opacity', 0)
      .transition()
      .delay(duration / 2)
      .duration(duration / 2)
      .style('opacity', 1);

    // 2. Fade out nodes in this section
    hopSection.nodeIds.forEach(nodeId => {
      d3.select(`#point-${blockId}-${nodeId}`)
        .transition()
        .duration(duration)
        .ease(ease)
        .style('opacity', 0)
        .on('end', function () {
          d3.select(this).style('visibility', 'hidden');
        });
    });

    // 3. Hide storylines and markers connected to these nodes
    hopSection.names.forEach(name => {
      // Hide storyline paths
      d3.selectAll(`.path-movable[name="${name}"]`)
        .transition()
        .duration(duration)
        .ease(ease)
        .style('opacity', 0)
        .on('end', function () {
          d3.select(this).style('visibility', 'hidden');
        });

      // Hide entry/exit markers (triangles) - they're in .marks containers
      d3.selectAll(`.marks[name="${name}"]`)
        .transition()
        .duration(duration)
        .ease(ease)
        .style('opacity', 0)
        .on('end', function () {
          d3.select(this).style('visibility', 'hidden');
        });

      // Also hide labels
      d3.selectAll(`.labels, .mark-links`)
        .filter(function () {
          const elem = this as SVGElement;
          const data = (elem as unknown as { __data__: { name: string } }).__data__;
          return data?.name === name;
        })
        .transition()
        .duration(duration)
        .ease(ease)
        .style('opacity', 0)
        .on('end', function () {
          d3.select(this).style('visibility', 'hidden');
        });
    });

    // 4. Animate the hop section paths
    const prefix = section === 'top' ? 'top-hop' : 'bottom-hop';

    // For top section: collapse to bottomY (shrink downward toward ego)
    // For bottom section: collapse to topY (shrink upward toward ego)
    const collapseY = section === 'top' ? hopPaths.bottomY : hopPaths.topY;
    const collapsedLineLeft = `M${posX - this.data.blockWidth / 2},${collapseY} L${posX - this.data.blockWidth / 2},${collapseY}`;
    const collapsedLineRight = `M${posX + this.data.blockWidth / 2},${collapseY} L${posX + this.data.blockWidth / 2},${collapseY}`;

    d3.select(`#${prefix}-line-left-${blockId}`).transition().duration(duration).ease(ease).attr('d', collapsedLineLeft);

    d3.select(`#${prefix}-line-right-${blockId}`).transition().duration(duration).ease(ease).attr('d', collapsedLineRight);

    // Translate arcs to meet at the collapsed position
    if (section === 'top') {
      // Top section: move top arc DOWN to bottomY (shrink toward ego)
      d3.select(`#${prefix}-top-arc-left-${blockId}`)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('transform', `translate(0, ${lineHeight})`);

      d3.select(`#${prefix}-top-arc-right-${blockId}`)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('transform', `translate(0, ${lineHeight})`);

      // Bottom arc stays at main position
    } else {
      // Bottom section: move bottom arc UP to topY (shrink toward ego)
      d3.select(`#${prefix}-bottom-arc-left-${blockId}`)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('transform', `translate(0, ${-lineHeight})`);

      d3.select(`#${prefix}-bottom-arc-right-${blockId}`)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('transform', `translate(0, ${-lineHeight})`);
    }
  }

  /**
   * Expand a hop section with animation - restores the pill height
   * Simple approach: animate line height back, translate arcs back
   */
  private _expandHopSection(blockId: number, section: 'top' | 'bottom', hopSection: HopSectionInfo): void {
    const duration = 500;
    const ease = d3.easeQuadInOut;
    const block = this.data.blocks.find(b => b.id === blockId);
    if (!block) return;

    const hopPaths = section === 'top' ? block.outline.topHop : block.outline.bottomHop;
    if (!hopPaths) return;

    const posX = block.points[0]?.posX || 0;
    const radius = this.data.blockWidth / 2;

    // Restore collapse group to original position
    // Original position is at exterior (topY - radius for top, bottomY + radius for bottom)
    const collapseGroup = d3.select(`.hop-collapse-${section}-${blockId}`);
    const originalY = section === 'top' ? hopPaths.topY - radius : hopPaths.bottomY + radius;

    collapseGroup.transition().duration(duration).ease(ease).attr('transform', `translate(${posX}, ${originalY})`);

    // 1. Hide expand button [+] and count circle, show collapse button [-]
    d3.select(`.hop-expand-btn-${section}-${blockId}`)
      .transition()
      .duration(duration / 2)
      .style('opacity', 0)
      .on('end', function () {
        d3.select(this).style('visibility', 'hidden');
      });

    d3.select(`.hop-expand-btn-text-${section}-${blockId}`)
      .transition()
      .duration(duration / 2)
      .style('opacity', 0)
      .on('end', function () {
        d3.select(this).style('visibility', 'hidden');
      });

    d3.select(`.hop-count-circle-${section}-${blockId}`)
      .transition()
      .duration(duration / 2)
      .style('opacity', 0)
      .on('end', function () {
        d3.select(this).style('visibility', 'hidden');
      });

    d3.select(`.hop-count-text-${section}-${blockId}`)
      .transition()
      .duration(duration / 2)
      .style('opacity', 0)
      .on('end', function () {
        d3.select(this).style('visibility', 'hidden');
      });

    d3.select(`.hop-collapse-btn-${section}-${blockId}`)
      .style('visibility', 'visible')
      .style('opacity', 0)
      .transition()
      .delay(duration / 2)
      .duration(duration / 2)
      .style('opacity', 1);

    d3.select(`.hop-collapse-btn-text-${section}-${blockId}`)
      .style('visibility', 'visible')
      .style('opacity', 0)
      .transition()
      .delay(duration / 2)
      .duration(duration / 2)
      .style('opacity', 1);

    // 2. Fade in nodes in this section
    hopSection.nodeIds.forEach(nodeId => {
      d3.select(`#point-${blockId}-${nodeId}`)
        .style('visibility', 'visible')
        .transition()
        .duration(duration)
        .ease(ease)
        .style('opacity', 1);
    });

    // 3. Show storylines and markers connected to these nodes (if not filtered out)
    hopSection.names.forEach(name => {
      // Only show if not hidden by filter
      if (this.visibility[name] === false) return;

      // Show storyline paths
      d3.selectAll(`.path-movable[name="${name}"]`)
        .style('visibility', 'visible')
        .transition()
        .duration(duration)
        .ease(ease)
        .style('opacity', 1);

      // Show entry/exit markers (triangles)
      d3.selectAll(`.marks[name="${name}"]`).style('visibility', 'visible').transition().duration(duration).ease(ease).style('opacity', 1);

      // Also show labels
      d3.selectAll(`.labels, .mark-links`)
        .filter(function () {
          const elem = this as SVGElement;
          const data = (elem as unknown as { __data__: { name: string } }).__data__;
          return data?.name === name;
        })
        .style('visibility', 'visible')
        .transition()
        .duration(duration)
        .ease(ease)
        .style('opacity', 1);
    });

    // 4. Animate the hop section paths back to original
    const prefix = section === 'top' ? 'top-hop' : 'bottom-hop';

    // Restore line paths to original
    d3.select(`#${prefix}-line-left-${blockId}`).transition().duration(duration).ease(ease).attr('d', hopPaths.lineLeft);

    d3.select(`#${prefix}-line-right-${blockId}`).transition().duration(duration).ease(ease).attr('d', hopPaths.lineRight);

    // Restore arc transforms to original (translate 0, 0)
    d3.select(`#${prefix}-top-arc-left-${blockId}`).transition().duration(duration).ease(ease).attr('transform', 'translate(0, 0)');

    d3.select(`#${prefix}-top-arc-right-${blockId}`).transition().duration(duration).ease(ease).attr('transform', 'translate(0, 0)');

    d3.select(`#${prefix}-bottom-arc-left-${blockId}`).transition().duration(duration).ease(ease).attr('transform', 'translate(0, 0)');

    d3.select(`#${prefix}-bottom-arc-right-${blockId}`).transition().duration(duration).ease(ease).attr('transform', 'translate(0, 0)');
  }

  // ============================================
  // Tooltip
  // ============================================

  private _createTooltip(): void {
    const nodeTooltip = this.tooltipContainer.append('div').attr('id', 'point-tooltip').attr('class', 'content-tooltip');

    this.chartContainer.on('mousemove', event => {
      nodeTooltip.style('top', `${event.offsetY + 15}px`).style('left', `${event.offsetX + 5}px`);
    });
  }

  private _showPointTooltip = (name: string, label: number): void => {
    d3.select('#point-tooltip').style('visibility', 'visible').html(this.config.tooltip.pointTooltipContent(name, label));
  };

  // ============================================
  // Hover & Pin Interactions
  // ============================================

  private _lineHover = (event: MouseEvent, d: Storyline | { name: string; id?: number }): void => {
    if (d.name === this._EGO) return;

    const storyline = this.storylines.find(s => s.name === d.name);
    if (storyline) {
      this.LINE_SELECTION(storyline.id).classed('storyline-hover', true);
    }

    if (this.GET_PIN_STATUS(d.name) === 'pinned') return;

    this.ENTITY_SELECTION(d.name, true);
    if (this.PIN_STATUS().length > 0) {
      this._massHoverExecution(d.name, 'target', false);
      return;
    }

    this._massHoverExecution(d.name, 'others', true);
  };

  private _lineHoverOut = (event: MouseEvent, d: Storyline | { name: string; id?: number }): void => {
    if (d.name === this._EGO) return;

    const storyline = this.storylines.find(s => s.name === d.name);
    if (storyline) {
      this.LINE_SELECTION(storyline.id).classed('storyline-hover', false);
    }

    if (this.GET_PIN_STATUS(d.name) === 'pinned') return;

    if (this.PIN_STATUS().length > 0) {
      this.BLOCK_SELECTION(d.name, 'target')
        .filter((each: unknown) => !this.PIN_STATUS().some(name => (each as Block).names.includes(name)))
        .classed('storyline-arc-dehighlight', true);
      this.MISC_SELECTION(d.name, 'target').classed('storyline-dehighlight', true);
      this.POINT_SELECTION(d.name, 'target').classed('storyline-dehighlight', true);
      this.LABEL_SELECTION(d.name, 'target').classed('storyline-label-dehighlight', true);
      return;
    }

    this._massHoverExecution(d.name, 'others', false);
  };

  private _massHoverExecution(names: string | string[], group: 'target' | 'others', decision: boolean): void {
    this.MISC_SELECTION(names, group).classed('storyline-dehighlight', decision);
    this.POINT_SELECTION(names, group).classed('storyline-dehighlight', decision);
    this.LABEL_SELECTION(names, group).classed('storyline-label-dehighlight', decision);
    this.BLOCK_SELECTION(names, group).classed('storyline-arc-dehighlight', decision);
  }

  private _linePin = (d: Storyline, status = 'pinned'): void => {
    if (d.name === this._EGO) return;

    const ele = document.getElementById(`label-${d.name}`);
    if (!ele) return;

    const pinned = Boolean(+ele.getAttribute('pin')!);
    ele.setAttribute('pin', String(+!pinned));

    if (status === 'pinned') {
      this.members.pinned = pinned ? this.members.pinned.filter(e => e !== d.name) : [...this.members.pinned, d.name];
      this.members.crossing = pinned ? this.members.crossing.filter(e => e !== d.name) : this.members.crossing;
      this.members.slider = pinned ? this.members.slider.filter(e => e !== d.name) : this.members.slider;
    }

    if (pinned) {
      this.LINE_SELECTION(d.id).classed('storyline-hover', false);
    }
  };

  // ============================================
  // Brush
  // ============================================

  private _activateBrush(timeLabels: TimeLabel[], blocks: Block[]): void {
    const brush = this.brushComponent.brush!;
    brush.on('end.snap', brushEnd);

    const timeBisector = d3.bisector((d: { currX: number }) => d.currX).left;
    const brusher = this.brushComponent;
    const BAND_WIDTH = this._BAND_WIDTH;
    const visualizer = this;

    function dblclicked(this: SVGGElement) {
      const selection = d3.brushSelection(this) ? null : (d3.extent(timeLabels.map(d => d.posX)) as [number, number]);
      if (selection === null) {
        d3.selectAll('.brush')
          .transition()
          .duration(500)
          .ease(d3.easeQuadInOut)
          .attr('opacity', 1e-6)
          .on('end', function () {
            d3.select(this).remove();
          });
        brusher.brushedSelection = [];
        brusher.brushedBlocks = [];
      }
      d3.select(this).call(brush.move, selection);
    }

    function brushEnd(this: SVGGElement, { selection, sourceEvent }: d3.D3BrushEvent<unknown>) {
      if (!sourceEvent || !selection) return;

      const timePositions = d3
        .selectAll('.time-labels')
        .nodes()
        .map(d => {
          const elem = d as SVGTextElement;
          const data = (elem as unknown as { __data__: TimeLabel }).__data__;
          const transform = elem.getAttribute('transform') || 'translate(0,0)';
          const currX = +transform.split(',')[0].split('(')[1];
          const arc = d3.select(`.left-arc-${data.label}`).node() as SVGPathElement | null;
          let expandX = 0;
          if (arc && +arc.getAttribute('active')! === 1) {
            expandX = (arc as unknown as { __data__: Block }).__data__.moveX;
          }
          return {
            ...data,
            currX: +currX + data.posX,
            startX: +currX + data.posX - expandX / 2 - BAND_WIDTH / 2,
            endX: +currX + data.posX + expandX / 2 + BAND_WIDTH / 2
          };
        });

      const [selStart, selEnd] = selection as [number, number];
      const startIdx = timeBisector(timePositions, selStart);
      const endIdx = timeBisector(timePositions, selEnd) - 1;

      if (arraysEqual(brusher.brushedSelection, [startIdx, endIdx])) return;

      brusher.brushedSelection = [startIdx, endIdx];
      const startPos = timePositions[startIdx].startX;
      const endPos = timePositions[endIdx].endX;

      d3.select(this)
        .transition()
        .call(brush.move, endPos > startPos ? [startPos, endPos] : null);

      const timeSelection = timePositions.slice(startIdx, endIdx + 1).map(d => d.label);
      brusher.brushedBlocks = blocks.filter(d => timeSelection.includes(d.time));

      const expandedBlockIDs = d3
        .selectAll('.left-arcs')
        .nodes()
        .filter(d => +(d as SVGPathElement).getAttribute('active')! === 1)
        .map(d => (d as unknown as { __data__: Block }).__data__.id);

      expandedBlockIDs.forEach(id => {
        const actor = visualizer.actors[id];
        if (actor && 'updateBrushedSelection' in actor) {
          (actor as Expander).updateBrushedSelection();
        }
      });
    }

    const timeContainer = d3.select('#time-container') as any;
    timeContainer.call(brush).on('dblclick', dblclicked);
  }

  // ============================================
  // Selection Helpers
  // ============================================

  ENTITY_SELECTION = (names: string | string[], effect: boolean): void => {
    this.BLOCK_SELECTION(names, 'target').classed('storyline-arc-dehighlight', !effect);
    this.LABEL_SELECTION(names, 'target').classed('storyline-label-dehighlight', !effect);
    this.MISC_SELECTION(names, 'target').classed('storyline-dehighlight', !effect);
    this.POINT_SELECTION(names, 'target').classed('storyline-dehighlight', !effect);
  };

  MISC_SELECTION = (names: string | string[], target: 'target' | 'others' = 'target') => {
    const ego = this._EGO;
    const nameList = Array.isArray(names) ? names : [names];
    return d3.selectAll('.path-movable,.dummy-movable,.label-link-movable,.marks').filter(function (this: d3.BaseType) {
      const elem = this as SVGElement;
      const name = elem.getAttribute('name');
      return target === 'target' ? nameList.includes(name!) : ![...nameList, ego].includes(name!);
    });
  };

  BLOCK_SELECTION = (names: string | string[], target: 'target' | 'others' = 'target') => {
    const nameList = Array.isArray(names) ? names : [names];
    return d3.selectAll('.station-arcs').filter((each: unknown) => {
      const block = each as Block;
      const found = block.names?.some(name => nameList.includes(name));
      return target === 'target' ? found : !found;
    });
  };

  POINT_SELECTION = (names: string | string[], target: 'target' | 'others' = 'target') => {
    const nameList = Array.isArray(names) ? names : [names];
    const ego = this._EGO;
    const data = this.data;
    const pinStatus = this.PIN_STATUS();

    return d3.selectAll('.points').filter((each: unknown): boolean => {
      const point = each as { name: string; group: number };
      if (point.name === ego) {
        const block = data.blocks.find(d => d.id === point.group);
        const found = block?.names.some(name => nameList.includes(name)) ?? false;
        const pinFound = block?.names.some(name => pinStatus.includes(name)) ?? false;
        return pinFound ? false : target === 'target' ? found : !found;
      }
      const found = nameList.includes(point.name);
      return target === 'target' ? found : !found;
    });
  };

  LABEL_SELECTION = (names: string | string[], target: 'target' | 'others' = 'target') => {
    const nameList = Array.isArray(names) ? names : [names];
    const ego = this._EGO;
    return d3.selectAll('.labels,.mark-links').filter((each: unknown) => {
      const label = each as { name: string };
      const found = nameList.includes(label.name);
      if (label.name === ego) return false;
      return target === 'target' ? found : !found;
    });
  };

  LINE_SELECTION = (id: number) => d3.selectAll(`.line-${id}`).selectAll('*');

  PIN_STATUS = (): string[] => Object.values(this.members).flat();

  GET_PIN_STATUS = (name: string): 'pinned' | 'unpinned' => {
    const ele = document.getElementById(`label-${name}`);
    return ele && Boolean(+ele.getAttribute('pin')!) ? 'pinned' : 'unpinned';
  };

  // ============================================
  // Filtering
  // ============================================

  /**
   * Apply lifespan and crossing filters to storylines
   * Ported from original visualizer.js _activateFilter
   *
   * @param yearsFilter - Minimum lifespan threshold (default 1)
   * @param crossingOnly - Show only lines that cross blocks without being members
   */
  applyFilter(yearsFilter: number = 1, crossingOnly: boolean = false): void {
    this._FILTER_THRESHOLD = yearsFilter;
    this._FILTER_CROSSING = crossingOnly;

    const ego = this._EGO;
    const storylines = this.data.storylines;

    // Get names of entities below the lifespan threshold
    const belowThreshold = storylines.filter(d => d.name !== ego && d.lifespan < yearsFilter).map(d => d.name);

    // Determine which names to hide
    const toHide = new Set<string>();

    // Add below threshold names
    belowThreshold.forEach(name => toHide.add(name));

    // If crossingOnly is checked, hide non-crossing storylines
    // crossingCheck: true = crosses blocks (IS crossing) - KEEP these
    // crossingCheck: false = member of blocks (NOT crossing) - HIDE these
    if (crossingOnly) {
      storylines.forEach(s => {
        // Hide storylines that are NOT crossing (crossingCheck === false)
        if (s.name !== ego && s.crossingCheck === false) {
          toHide.add(s.name);
        }
      });
    }

    // Update visibility for all elements
    const toHideArray = Array.from(toHide);

    // Update visibility state
    storylines.forEach(s => {
      this.visibility[s.name] = !toHide.has(s.name);
    });

    // Apply visibility to path segments and markers
    d3.selectAll('.path-movable,.symbol-movable,.dummy-movable').each(function () {
      const elem = this as SVGElement;
      const name = elem.getAttribute('name');
      if (!name || name === ego) return;
      d3.select(elem).style('visibility', toHide.has(name) ? 'hidden' : 'visible');
    });

    // Apply visibility to marks containers
    d3.selectAll('.marks').each(function () {
      const elem = this as SVGElement;
      const name = elem.getAttribute('name');
      if (!name || name === ego) return;
      d3.select(elem).style('visibility', toHide.has(name) ? 'hidden' : 'visible');
    });

    // Apply visibility to points
    d3.selectAll('.points').each(function () {
      const elem = this as SVGElement;
      const classList = elem.getAttribute('class') || '';
      const pointName = storylines.find(s => classList.includes(`points-${s.name}`))?.name;
      if (!pointName || pointName === ego) return;
      d3.select(elem).style('visibility', toHide.has(pointName) ? 'hidden' : 'visible');
    });

    // Apply visibility to labels
    d3.selectAll('.labels,.mark-links')
      .filter(function () {
        const elem = this as SVGElement;
        const data = (elem as unknown as { __data__: { name: string } }).__data__;
        return data?.name !== ego;
      })
      .each(function () {
        const elem = this as SVGElement;
        const data = (elem as unknown as { __data__: { name: string } }).__data__;
        if (!data?.name) return;
        d3.select(elem).style('visibility', toHide.has(data.name) ? 'hidden' : 'visible');
      });

    // Apply visibility to line containers
    storylines.forEach(s => {
      if (s.name === ego) return;
      d3.selectAll(`.line-${s.id}`).style('visibility', toHide.has(s.name) ? 'hidden' : 'visible');
    });

    // Notify callback with filtered names
    const filteredNames = storylines.filter(s => !toHide.has(s.name)).map(s => s.name);
    this.onFilterChange?.(filteredNames);
  }

  // ============================================
  // Cleanup
  // ============================================

  destroy(): void {
    this.chartContainer?.selectAll('*').remove();
    d3.select('#point-tooltip').remove();
  }
}
