/**
 * SpreadLine Main Class - TypeScript port of Python spreadline.py
 *
 * Main orchestrator for the SpreadLine visualization framework.
 * Manages the 5-phase optimization pipeline:
 * 1. load() - Load data
 * 2. center() - Filter to egocentric network
 * 3. fit() - Run optimization pipeline
 */

import {
  Node,
  Entity,
  Session,
  TopologyRow,
  ContentLayoutRow,
  NodeContextRow,
  EntityColorRow,
  SpreadLineResult,
  RenderConfig
} from './types';
import { strToDatetime, datetimeToStr, getTimeArray, checkValidity, full2D, groupBy, unique } from './helpers';
import { filterTimeByEgo, constructEgocentricNetwork, findWithinConstraints } from './constructors';
import { ordering } from './order';
import { aligning } from './align';
import { compacting } from './compact';
import { contextualizing, ContextResult } from './contextualize';
import { rendering } from './render';

export class SpreadLine {
  // Data storage
  _topo: TopologyRow[] = [];
  _groups: Record<string, string[][]> = {};
  _node_color: NodeContextRow[] = [];
  _content: ContentLayoutRow[] = [];
  _content_config = {
    dynamic: true,
    generated: true
  };
  _line_color: Record<string, string> = {};

  // Time settings
  time_format: string = '';
  _all_timestamps: string[] = [];

  // Session tracking
  locations = {
    contact: [] as number[],
    idle: new Set<number>()
  };

  // Entities and sessions
  ego: string = '';
  egoIdx: number = -1;
  entities: Entity[] = [];
  entities_names: string[] = [];
  sessions: Session[] = [];
  context: ContextResult | null = null;

  // Tables
  effective_timestamps: number[] = [];
  _tables: {
    session: number[][];
    presence: number[][];
    order: number[][];
    align: number[][];
    height: number[][];
    crossing: number[][];
  } = {
    session: [],
    presence: [],
    order: [],
    align: [],
    height: [],
    crossing: []
  };

  span: [number, number] = [0, 0];
  _counts = {
    numAllTimestamps: 0,
    numTimestamps: 0,
    numEntities: 0
  };

  _config: RenderConfig = {
    bandStretch: [],
    squeezeSameCategory: false,
    minimize: 'space'
  };

  _render: SpreadLineResult | null = null;

  constructor() {}

  getSessionByID(id: number): Session | null {
    for (const session of this.sessions) {
      if (session.id === id) return session;
    }
    return null;
  }

  getEntityByName(name: string): Entity | null {
    for (const entity of this.entities) {
      if (entity.name === name) return entity;
    }
    return null;
  }

  /**
   * Load data into SpreadLine
   * @param data - Data as array of objects or raw array
   * @param config - Column mapping configuration
   * @param key - Data type: 'topology', 'content', 'node', 'line'
   */
  load(data: any[], config: Record<string, string>, key: string = 'topology'): void {
    if (key === 'topology') {
      this._topo = checkValidity(data, config, ['time', 'source', 'target', 'weight']);
      return;
    }

    if (key === 'content') {
      const required = ['timestamp', 'id', 'posX', 'posY'];
      if (!required.every(k => k in config)) {
        throw new Error('Unmatched keys in the config');
      }

      // Handle static layout (no timestamp)
      if (config.timestamp === '') {
        this._content_config.dynamic = false;
        delete config.timestamp;
      }

      // Handle layout not pre-computed
      if (config.posX === '' && config.posY === '') {
        this._content_config.generated = false;
        delete config.posX;
        delete config.posY;
      }

      // Rename columns
      const invConfig: Record<string, string> = {};
      for (const [key, value] of Object.entries(config)) {
        if (value) invConfig[value] = key;
      }

      const seen = new Set<string>();
      const result: ContentLayoutRow[] = [];

      for (const row of data) {
        const newRow: Record<string, any> = {};
        for (const [oldKey, value] of Object.entries(row)) {
          const newKey = invConfig[oldKey] || oldKey;
          newRow[newKey] = value;
        }
        const key = JSON.stringify(newRow);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(newRow as ContentLayoutRow);
        }
      }

      this._content = result;
      return;
    }

    if (key === 'node') {
      this._node_color = checkValidity(data, config, ['time', 'entity', 'context']);
      return;
    }

    if (key === 'line') {
      const validated = checkValidity(data, config, ['entity', 'color']);
      this._line_color = {};
      for (const row of validated) {
        this._line_color[row.entity] = row.color;
      }
      return;
    }

    throw new Error('Not supported key type');
  }

  /**
   * Center on ego and construct egocentric network
   */
  center(
    ego: string,
    timeExtents?: [string, string],
    timeDelta: string = 'day',
    timeFormat: string = '%Y-%m-%d',
    groups: Record<string, string[][]> = {}
  ): void {
    this.time_format = timeFormat;
    this.ego = ego;
    this._groups = groups;

    // Convert time column to Date objects
    for (const row of this._topo) {
      if (typeof row.time === 'string') {
        row.time = strToDatetime(row.time, timeFormat);
      }
    }

    // Filter to times where ego exists
    this._topo = filterTimeByEgo(ego, this._topo);

    // Determine time extents if not provided
    if (!timeExtents) {
      const times = this._topo.map(r => r.time as Date);
      const minTime = new Date(Math.min(...times.map(t => t.getTime())));
      const maxTime = new Date(Math.max(...times.map(t => t.getTime())));
      timeExtents = [datetimeToStr(minTime, timeFormat), datetimeToStr(maxTime, timeFormat)];
    }

    // Get time array
    this._all_timestamps = getTimeArray(timeExtents, timeDelta, timeFormat);
    this._counts.numAllTimestamps = this._all_timestamps.length;

    const timeArray = this._all_timestamps.map(t => strToDatetime(t, timeFormat));

    // Filter topology within time range
    const topoWithinTime = this._topo.filter(row => {
      const rowTime = row.time as Date;
      const startTime = strToDatetime(timeExtents![0], timeFormat);
      const endTime = strToDatetime(timeExtents![1], timeFormat);
      return rowTime >= startTime && rowTime <= endTime;
    });

    // Construct egocentric network
    const network = constructEgocentricNetwork(ego, topoWithinTime);
    this._constructEntities(network);

    // Build sessions
    const sessions = this._constructContactSessions(network, timeArray);
    this.locations.contact = sessions.map(s => s.id);
    this._constructTimelinesIdleSessions(sessions);

    // Build tables
    this._constructTables();
    this.egoIdx = this.entities_names.indexOf(this.ego);
  }

  /**
   * Configure visualization options
   */
  configure(config: Partial<RenderConfig>): void {
    for (const key of Object.keys(config)) {
      if (!(key in this._config)) {
        throw new Error(`Unmatched key in config: ${key}`);
      }
    }
    this._config = { ...this._config, ...config };
  }

  /**
   * Run the optimization pipeline and render
   */
  fit(width: number = 1400, height: number = 500): SpreadLineResult {
    // Step 1: Ordering
    const [orderTable, orderedEntities, orderedIdleEntities, orderedSessions] = ordering(this);
    this._tables.order = orderTable;

    // Step 2: Aligning
    const [alignTable, sessionAlignTable] = aligning(this, orderedEntities, orderedIdleEntities);
    this._tables.align = alignTable;

    // Step 3: Compacting
    const [heightTable, sideTable] = compacting(this, orderedEntities, orderedSessions, sessionAlignTable);
    this._tables.height = heightTable;
    this._tables.crossing = sideTable;

    // Step 4: Contextualizing
    this.context = contextualizing(this);

    // Step 5: Rendering
    const size = { width, height };
    const result = rendering(size, this);

    this._render = result;
    return result;
  }

  // Private methods

  private _constructContactSessions(network: TopologyRow[], timeArray: Date[]): Session[] {
    let sessionID = 0;
    const sessions: Session[] = [];
    const names = this.entities_names;

    for (let tIdx = 0; tIdx < timeArray.length - 1; tIdx++) {
      const time = timeArray[tIdx];
      const nextTime = timeArray[tIdx + 1];

      // Filter entries within this time window
      const entries = network.filter(row => {
        const rowTime = row.time as Date;
        return rowTime >= time && rowTime < nextTime;
      });

      if (entries.length === 0) continue;

      sessionID++;
      const count = entries.reduce((sum, row) => sum + row.weight, 0);
      const arcs: [string, string, number][] = entries.map(row => [row.source, row.target, row.weight]);

      // Get groups for this timestamp
      const timestampLabel = this._all_timestamps[tIdx];
      let groups = this._groups[timestampLabel] || [];
      groups = groups.map(g => [...g]);

      let constraints: any[];
      let order: string[][];

      if (groups.length !== 0) {
        order = groups;
        constraints = [
          groups[0],
          groups[1].length !== 0 ? { 1: groups[1] } : {},
          groups[2],
          groups[3].length !== 0 ? { 1: groups[3] } : {},
          groups[4]
        ];
      } else {
        [constraints, order] = findWithinConstraints(entries, this.ego, this._line_color);
      }

      const entities = order.flat();
      const entitiesIDs = entities.map(name => names.indexOf(name));
      const entityNodes = entitiesIDs.map((id, idx) => new Node(names[id], sessionID, idx, -1, id));
      const indices = entries.map((_, idx) => idx);

      const session = new Session(sessionID, entityNodes, 'contact', tIdx, count, indices);
      session.set(order, arcs, constraints);
      sessions.push(session);
    }

    this.sessions = sessions;
    return sessions;
  }

  private _constructEntities(network: TopologyRow[]): void {
    const entityNames = unique([...network.map(r => r.source), ...network.map(r => r.target)]);

    this.entities_names = entityNames;
    const entities: Entity[] = [];

    for (let rIdx = 0; rIdx < entityNames.length; rIdx++) {
      const timeline: number[] = new Array(this._counts.numAllTimestamps).fill(0);
      const entity = new Entity(entityNames[rIdx], timeline, rIdx);
      entities.push(entity);
    }

    this.entities = entities;
    this._counts.numEntities = entities.length;
  }

  private _constructTimelinesIdleSessions(sessions: Session[]): void {
    let idleID = sessions.length + 1;
    const idleLoc = new Set<number>();

    for (const session of sessions) {
      const cIdx = session.timestamp;
      const sessionID = session.id;
      const names = session.printEntities();

      for (const node of session.entities) {
        const entity = this.getEntityByName(node.name);
        if (!entity) continue;

        const timeline = entity.timeline;
        const isAllZero = !timeline.some(v => v !== 0);

        if (isAllZero) {
          // Initialize
          timeline[cIdx] = sessionID;
          entity.setTimeline(timeline);
          continue;
        }

        // Find last non-zero index
        let lastIdx = -1;
        for (let i = timeline.length - 1; i >= 0; i--) {
          if (timeline[i] !== 0) {
            lastIdx = i;
            break;
          }
        }

        timeline[cIdx] = sessionID;

        if (cIdx - lastIdx > 1) {
          for (let i = lastIdx + 1; i < cIdx; i++) {
            timeline[i] = idleID;
          }
          idleLoc.add(idleID);
          idleID++;
        }
      }
    }

    this.locations.idle = idleLoc;
  }

  private _constructTables(): void {
    // Build timelines matrix
    const timelines: number[][] = this.entities.map(e => e.timeline.slice(0, -1));

    // Find unique columns (merge identical timestamps)
    const columnStrings = new Map<string, number>();
    const uniqueIndices: number[] = [];

    for (let cIdx = 0; cIdx < timelines[0].length; cIdx++) {
      const col = timelines.map(row => row[cIdx]).join(',');
      if (!columnStrings.has(col)) {
        columnStrings.set(col, cIdx);
        uniqueIndices.push(cIdx);
      }
    }

    uniqueIndices.sort((a, b) => a - b);

    // Build session table with only unique columns
    const sessionTable = timelines.map(row => uniqueIndices.map(idx => row[idx]));

    // Update entity timelines
    for (const entity of this.entities) {
      entity.timeline = uniqueIndices.map(idx => entity.timeline[idx]);
    }

    this.span = [sessionTable.length, sessionTable[0].length];

    // Build presence table
    const presenceTable = full2D(this.span[0], this.span[1], 0);
    const idleSessions = this.locations.idle;

    for (let rIdx = 0; rIdx < sessionTable.length; rIdx++) {
      for (let cIdx = 0; cIdx < sessionTable[0].length; cIdx++) {
        const sessionID = sessionTable[rIdx][cIdx];
        if (sessionID === 0) continue;
        presenceTable[rIdx][cIdx] = idleSessions.has(sessionID) ? -1 : 1;
      }
    }

    this.effective_timestamps = uniqueIndices;
    this._tables.session = sessionTable;
    this._tables.presence = presenceTable;
    this._counts.numTimestamps = uniqueIndices.length;
  }
}
