// ============================================
// SpreadLine TypeScript Type Definitions
// Extended for D3.js Integration
// ============================================

import * as d3 from 'd3';

/**
 * Represents a point/node in a block at a specific timestep
 */
export interface Point {
  id: number;
  name: string;
  label: string;
  posX: number;
  posY: number;
  scaleX: number;
  scaleY: number;
  group: number;
  visibility: 'visible' | 'hidden';
}

/**
 * Info about a hop section (top or bottom 2-hop) for collapse UI
 */
export interface HopSectionInfo {
  nodeCount: number; // Number of nodes in this section
  centerY: number; // Y position for button/count circle
  nodeIds: number[]; // Node IDs in this section
  names: string[]; // Entity names in this section
  minY: number; // Top Y of this section
  maxY: number; // Bottom Y of this section
}

/**
 * Separate paths for a collapsible 2-hop section
 */
export interface HopSectionPaths {
  topArcLeft: string;
  topArcRight: string;
  lineLeft: string;
  lineRight: string;
  bottomArcLeft: string;
  bottomArcRight: string;
  topY: number;
  bottomY: number;
  mainY: number;
  lineHeight: number;
}

/**
 * Represents a block (session) at a specific timestep
 */
export interface Block {
  id: number;
  time: string;
  moveX: number;
  names: string[];
  topPosY: number;
  points: Point[];
  relations: [number, number][];
  outline: {
    left: string;
    right: string;
    top: string;
    bottom: string;
    button?: string;
    topHop?: HopSectionPaths | null;
    bottomHop?: HopSectionPaths | null;
  };
  hopSections: {
    top: HopSectionInfo | null;
    bottom: HopSectionInfo | null;
  };
}

/**
 * Represents a storyline (entity's path through time)
 */
export interface Storyline {
  id: number;
  name: string;
  color: string;
  crossingCheck: boolean;
  lifespan: number;
  lines: string[];
  marks: Mark[];
  label: StorylineLabel;
  inlineLabels: InlineLabel[];
}

export interface Mark {
  name: string;
  posX: number;
  posY: number;
  size: number;
  visibility: 'visible' | 'hidden';
}

export interface StorylineLabel {
  label: string;
  fullLabel: string; // Full name for tooltip
  line: string;
  posX: number;
  posY: number;
  textAlign: string;
  visibility: 'visible' | 'hidden';
  show?: 'visible' | 'hidden';
}

export interface InlineLabel {
  name: string;
  fullName: string;
  posX: number;
  posY: number;
}

export interface TimeLabel {
  label: string;
  posX: number;
}

export interface SpreadLineData {
  bandWidth: number;
  blockWidth: number;
  blocks: Block[];
  storylines: Storyline[];
  timeLabels: TimeLabel[];
  heightExtents: [number, number];
  ego: string;
  mode?: string;
  reference?: Array<{ year: string; [key: string]: unknown }>;
}

// ============================================
// D3 Configuration Types
// ============================================

export interface SpreadLineConfig {
  legend: {
    line: {
      domain: string[];
      range: string[];
      offset: number[];
    };
    node: {
      scale: d3.ScaleThreshold<number, string>;
      title: string;
    };
  };
  background: {
    direction: string[];
    directionFontSize: string;
    timeLabelFormat: (d: string) => string;
    annotations: Array<{ time: string; text: string; color: string; wrapWidth?: number }>;
    timeHighlight: string[];
    sliderTitle: string;
  };
  content: {
    customize: (
      container: d3.Selection<SVGGElement, unknown, null, undefined>,
      supplement: unknown,
      bbox: DOMRect,
      moveX: number,
      currX: number,
      id: number,
      topPosY: number,
      posX: number,
      strokeWidth: number,
      animation: d3.Transition<SVGElement, unknown, null, undefined>
    ) => void;
    collisionDetection: boolean;
    showLinks: boolean;
  };
  tooltip: {
    showPointTooltip: boolean;
    pointTooltipContent: (name: string, label: number) => string;
    showLinkTooltip: boolean;
  };
}

// ============================================
// D3 Node Types for Force Simulation
// ============================================

export interface ForceNode extends d3.SimulationNodeDatum {
  name: string;
  id: number;
  posX: number;
  posY: number;
  group: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fx?: number | null;
  fy?: number | null;
}

export interface BrushComponent {
  brush: d3.BrushBehavior<unknown> | null;
  brushedBlocks: Block[];
  brushedSelection: number[];
}

// ============================================
// Default Configuration Factory
// ============================================

export const createDefaultConfig = (): SpreadLineConfig => ({
  legend: {
    line: {
      domain: ['External', 'Internal'],
      range: ['#146b6b', '#FA9902'],
      offset: []
    },
    node: {
      scale: d3.scaleThreshold<number, string>().domain([10, 50, 100, 500]).range(['#ffffff', '#fcdaca', '#e599a6', '#c94b77', '#740980']),
      title: 'Frequencies'
    }
  },
  background: {
    direction: ['External', 'Internal'],
    directionFontSize: '3rem',
    timeLabelFormat: (d: string) => d,
    annotations: [],
    timeHighlight: [],
    sliderTitle: 'Min Years'
  },
  content: {
    customize: () => {},
    collisionDetection: true,
    showLinks: true
  },
  tooltip: {
    showPointTooltip: true,
    pointTooltipContent: (name: string, label: number) => `<b>${name}</b><br/>${label === -1 ? 'Unknown' : label}`,
    showLinkTooltip: true
  }
});

// ============================================
// Helper Functions (React-compatible)
// ============================================

export const computeEmbedding = (scale: number, length: number): number => {
  const whiteSpace = 0.15;
  return (scale + whiteSpace / 2) * length * (1 - whiteSpace);
};

export const getNodeColor = (label: number, thresholds = [10, 50, 100, 500]): string => {
  const colors = ['#ffffff', '#fcdaca', '#e599a6', '#c94b77', '#740980'];
  for (let i = 0; i < thresholds.length; i++) {
    if (label < thresholds[i]) return colors[i];
  }
  return colors[colors.length - 1];
};

export const easeOutQuad = (t: number): number => t * (2 - t);

export const getPathStartX = (pathD: string): number => {
  const match = pathD.match(/M\s*([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
};

export const getPathEndX = (pathD: string): number => {
  const parts = pathD.split(/[MLCQZ\s,]+/).filter(Boolean);
  return parts.length >= 2 ? parseFloat(parts[parts.length - 2]) : 0;
};

export const getPathEndY = (pathD: string): number => {
  const parts = pathD.split(/[MLCQZ\s,]+/).filter(Boolean);
  return parts.length >= 1 ? parseFloat(parts[parts.length - 1]) : 0;
};

export const getPathStartY = (pathD: string): number => {
  const match = pathD.match(/M\s*[\d.]+[,\s]+([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
};
