/**
 * SpreadLine Types - TypeScript port of Python utils/types.py
 *
 * Core data structures for the SpreadLine visualization framework:
 * - Path: D3-style SVG path generator
 * - Node: Entity at a specific timestamp
 * - Entity: Actor timeline across all timestamps
 * - Session: Snapshot of interactions at one timestamp
 */

const tau = 2 * Math.PI;
const epsilon = 1e-6;
const tauEpsilon = tau - epsilon;

/**
 * D3-style SVG path generator
 * Replicates most of d3.path() functionality
 */
export class Path {
  // The start of current subpath
  startX: number | null = null; // this._x0
  startY: number | null = null; // this._y0
  // The end of current subpath
  endX: number | null = null; // this._x1
  endY: number | null = null; // this._y1
  str: string = '';
  curve: number = 0.5;

  toString(): string {
    return this.str;
  }

  moveTo(x: number, y: number): this {
    this.startX = +x;
    this.startY = +y;
    this.endX = +x;
    this.endY = +y;
    this.str += `M${+x},${+y}`;
    return this;
  }

  lineTo(x: number, y: number): this {
    this.endX = +x;
    this.endY = +y;
    this.str += `L${this.endX}, ${this.endY}`;
    return this;
  }

  quadraticCurveTo(x1: number, y1: number, x: number, y: number): this {
    this.endX = +x;
    this.endY = +y;
    this.str += `Q${+x1}, ${+y1}, ${this.endX}, ${this.endY}`;
    return this;
  }

  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): this {
    this.endX = +x;
    this.endY = +y;
    this.str += `C${+x1}, ${+y1}, ${+x2}, ${+y2}, ${this.endX}, ${this.endY}`;
    return this;
  }

  horizontalEaseCurveTo(x: number, y: number): this {
    this.bezierCurveTo(this.endX! * (1 - this.curve) + x * this.curve, this.endY!, this.endX! * this.curve + x * (1 - this.curve), y, x, y);
    return this;
  }

  easeCurveTo(x: number, y: number): this {
    let c0x = this.endX!;
    let c0y = this.endY!;
    let c1x = x;
    let c1y = y;
    if ((x - this.endX!) * (y - this.endY!) > 0) {
      c0y = this.endY! * (1 - this.curve) + y * this.curve;
      c1x = this.endX! * this.curve + x * (1 - this.curve);
    } else {
      c0x = this.endX! * (1 - this.curve) + x * this.curve;
      c1y = this.endY! * this.curve + y * (1 - this.curve);
    }
    this.bezierCurveTo(c0x, c0y, c1x, c1y, x, y);
    return this;
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, ccw: number = 0): this {
    x = +x;
    y = +y;
    radius = +radius;
    ccw = ~~ccw; // Convert to integer (equivalent to Python's ~~ccw)

    if (radius < 0) throw new Error(`Negative radius: ${radius}`);

    const dx = radius * Math.cos(startAngle);
    const dy = radius * Math.sin(startAngle);
    const x0 = x + dx;
    const y0 = y + dy;
    const cw = 1 ^ ccw;
    let da = ccw === 0 ? endAngle - startAngle : startAngle - endAngle;

    if (this.endX === null) {
      this.str += `M${x0}, ${y0}`;
      this.startX = x0;
      this.startY = y0;
      this.endX = x0;
      this.endY = y0;
    } else if (Math.abs(this.endX - x0) > epsilon || Math.abs(this.endY! - y0) > epsilon) {
      this.str += `L${x0}, ${y0}`;
      this.endX = x0;
      this.endY = y0;
    }

    // Convert negative angles to positive (d3.path behavior)
    if (da < 0) da = (da % tau) + tau;

    if (da > tauEpsilon) {
      // This is a complete circle, so draw two arcs
      this.endX = x0;
      this.endY = y0;
      this.str += `A${radius},${radius},0,1,${cw},${x - dx},${y - dy}`;
      this.str += `A${radius},${radius},0,1,${cw},${this.endX},${this.endY}`;
    } else if (da > epsilon) {
      // This is an arc, so draw it
      this.endX = x + radius * Math.cos(endAngle);
      this.endY = y + radius * Math.sin(endAngle);
      this.str += `A${radius},${radius},0,${da >= Math.PI ? 1 : 0},${cw},${this.endX},${this.endY}`;
    }
    return this;
  }

  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): this {
    x1 = +x1;
    y1 = +y1;
    x2 = +x2;
    y2 = +y2;
    r = +r;

    const x0 = this.endX!;
    const y0 = this.endY!;
    const x21 = x2 - x1;
    const y21 = y2 - y1;
    const x01 = x0 - x1;
    const y01 = y0 - y1;
    const r01 = x01 ** 2 + y01 ** 2;

    if (this.endX === null) {
      this.str += `M${x1},${y1}`;
      this.endX = x1;
      this.endY = y1;
      return this;
    } else if (r01 <= epsilon) {
      return this;
    } else if (Math.abs(y01 * x21 - y21 * x01) <= epsilon || r === 0) {
      this.str += `L${x1},${y1}`;
      this.endX = x1;
      this.endY = y1;
      return this;
    }

    const x20 = x2 - x0;
    const y20 = y2 - y0;
    const r21 = x21 ** 2 + y21 ** 2;
    const r20 = x20 ** 2 + y20 ** 2;
    const length = r * Math.tan((Math.PI - Math.acos((r21 + r01 - r20) / (2 * Math.sqrt(r21) * Math.sqrt(r01)))) / 2);
    const t01 = length / Math.sqrt(r01);
    const t21 = length / Math.sqrt(r21);

    if (Math.abs(t01 - 1) > epsilon) {
      this.str += `L${x1 + t01 * x01}, ${y1 + t01 * y01}`;
    }

    this.str += `A${r},${r},0,0,${y01 * x20 > x01 * y20 ? 1 : 0},${x1 + t21 * x21},${y1 + t21 * y21}`;
    this.endX = x1 + t21 * x21;
    this.endY = y1 + t21 * y21;
    return this;
  }
}

/**
 * Represents an entity at a specific timestamp within a session
 */
export class Node {
  name: string;
  id: number;
  sessionID: number;
  timestamp: number;
  order: number;

  constructor(name: string = '', sessionID: number = 0, order: number = 0, time: number = -1, index: number = -1) {
    this.name = name;
    this.id = index;
    this.sessionID = sessionID;
    this.timestamp = time;
    this.order = order;
  }

  toString(): string {
    return this.name;
  }

  /**
   * Get the order of this node in the previous timestamp
   */
  getBarycenterLeaf(nodes: Node[]): number {
    const prevNode = this.findSelf(nodes);
    if (prevNode) {
      return prevNode.order;
    }
    return this.order;
  }

  /**
   * Find yourself at a different timestamp
   */
  findSelf(nodes: Node[]): Node | null {
    for (const each of nodes) {
      if (each.name === this.name) {
        return each;
      }
    }
    return null;
  }
}

/**
 * Represents a unique actor in the network across all timestamps
 */
export class Entity {
  id: number;
  name: string;
  timeline: number[]; // sessionID at each timestamp

  constructor(name: string = '', timeline: number[] = [], index: number = -1) {
    this.id = index;
    this.name = name;
    this.timeline = timeline;
  }

  setTimeline(timeline: number[]): void {
    this.timeline = timeline;
  }

  getAtTimestamp(time: number): number {
    return this.timeline[time];
  }

  getName(): string {
    return this.name;
  }
}

/**
 * Represents a snapshot of interactions at one timestamp
 */
export class Session {
  id: number;
  entities: Node[];
  entityWeight: number;
  constraints: SessionConstraints; // [[dict]*5], each dict has a key being the weight
  type: 'contact' | 'idle';
  weight: number;
  indices: number[];
  timestamp: number; // the index in liner._all_timestamps
  hops: string[][]; // [[top-2-hop], [1-hop source], [ego], [1-hop target], [bottom-2-hop]]
  links: [string, string, number][];
  barycenter: number;

  constructor(
    sessionID: number = 0,
    entities: Node[] = [],
    form: 'contact' | 'idle' = 'contact',
    timestamp: number = -1,
    weight: number = 0,
    indices: number[] = []
  ) {
    this.id = sessionID;
    this.entities = entities;
    this.entityWeight = entities.length;
    this.constraints = [];
    this.type = form;
    this.weight = weight;
    this.indices = indices;
    this.timestamp = timestamp;
    this.hops = [];
    this.links = [];
    this.barycenter = 0;
  }

  printEntities(): string[] {
    return this.entities.map(entity => entity.toString());
  }

  getIdentity(name: string): number {
    for (let idx = 0; idx < this.hops.length; idx++) {
      const group = this.hops[idx];
      if (group.includes(name)) return idx;
    }
    return -1;
  }

  add(name: string): void {
    // Note: This should add a Node, not string - keeping for API compatibility
    this.entities.push(new Node(name));
    this.entityWeight += 1;
  }

  findNode(name: string, returnSession: boolean = false, returnIndex: boolean = false): Node | Session | number | null {
    for (let idx = 0; idx < this.entities.length; idx++) {
      const each = this.entities[idx];
      if (each.name === name) {
        if (returnSession) return this;
        if (returnIndex) return idx;
        return each;
      }
    }
    return null;
  }

  set(hops: string[][] = [], links: [string, string, number][] = [], constraints: SessionConstraints = []): void {
    if (hops.length !== 0) this.hops = hops;
    if (links.length !== 0) this.links = links;
    if (constraints.length !== 0) this.constraints = constraints;
  }

  getEntityIDs(): number[] {
    return this.entities.map(node => node.id);
  }

  replaceNode(nodes: Node[], sweepRange: [number, number]): void {
    const [startIdx, endIdx] = sweepRange;
    for (let idx = startIdx; idx < endIdx; idx++) {
      this.entities[idx] = nodes[idx - startIdx];
    }
  }

  // Deprecated methods kept for API compatibility
  setHops(hops: string[][]): void {
    this.hops = hops;
  }

  setLinks(links: [string, string, number][]): void {
    this.links = links;
  }

  setConstraints(constraints: SessionConstraints): void {
    this.constraints = constraints;
  }
}

export type SessionConstraints = (string[] | Record<number, string[]>)[];

// Type definitions for data structures used throughout the pipeline

export interface TopologyRow {
  source: string;
  target: string;
  time: string | Date;
  weight: number;
  id?: string;
  [key: string]: any;
}

export interface EntityColorRow {
  entity: string;
  color: string;
}

export interface NodeContextRow {
  time: string;
  entity: string;
  context: string | number;
}

export interface ContentLayoutRow {
  id: string;
  timestamp: string | number;
  posX: number;
  posY: number;
  [key: string]: any;
}

export interface RenderConfig {
  bandStretch: [string, string][];
  squeezeSameCategory: boolean;
  minimize: 'space' | 'line' | 'wiggles';
}

export interface SpreadLineResult {
  bandWidth: number;
  blockWidth: number;
  ego: string;
  timeLabels: { label: string; posX: number }[];
  heightExtents: [number, number];
  storylines: StorylineResult[];
  blocks: BlockResult[];
  mode?: string;
  reference?: any[];
}

export interface StorylineResult {
  name: string;
  lines: string[];
  marks: MarkResult[];
  label: LabelResult;
  inlineLabels: InlineLabelResult[];
  color: string;
  id: number;
  lifespan: number;
  crossingCheck: boolean;
}

export interface MarkResult {
  posX: number;
  posY: number;
  name: string;
  size: number;
  visibility?: string;
}

export interface LabelResult {
  posX: number;
  posY: number;
  textAlign: string;
  line: string;
  label: string;
  fullLabel: string; // Full name for tooltip
  visibility?: string;
}

export interface InlineLabelResult {
  posX: number;
  posY: number;
  name: string;
  fullName: string;
}

export interface HopSectionInfo {
  nodeCount: number; // Number of nodes in this section
  centerY: number; // Y position for button/count circle
  nodeIds: number[]; // Node IDs in this section
  names: string[]; // Entity names in this section
  minY: number; // Top Y of this section
  maxY: number; // Bottom Y of this section
}

export interface BlockResult {
  id: number;
  time: string;
  outline: any;
  names: string[];
  relations: [number, number][];
  points: PointResult[];
  moveX: number;
  topPosY: number;
  hopSections: {
    top: HopSectionInfo | null;
    bottom: HopSectionInfo | null;
  };
}

export interface PointResult {
  id: number;
  posX: number;
  posY: number;
  name: string;
  group: number;
  aggregateGroup: number;
  visibility: string;
  scaleX?: number;
  scaleY?: number;
  label?: string | number;
}
