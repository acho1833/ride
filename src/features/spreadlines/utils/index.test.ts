import {
  bfsDistances,
  deduplicateLinks,
  transformSpreadlineToGraph,
  transformSpreadlineToGraphByTime,
  transformSpreadlineToGraphByTimes,
  transformSpreadlineToTimeline
} from '.';

const makeRawData = () => ({
  egoId: 'ego',
  egoName: 'Ego Author',
  entities: {
    a1: { name: 'Author A', category: 'internal' },
    a2: { name: 'Author B', category: 'external' }
  },
  topology: [
    { sourceId: 'ego', targetId: 'a1', time: '2020', weight: 1 },
    { sourceId: 'ego', targetId: 'a1', time: '2021', weight: 1 },
    { sourceId: 'ego', targetId: 'a2', time: '2020', weight: 1 },
    { sourceId: 'a1', targetId: 'a2', time: '2021', weight: 1 }
  ],
  groups: {
    '2020': [[], [], ['ego'], ['a1'], ['a2']],
    '2021': [[], [], ['ego'], ['a1'], ['a2']]
  }
});

describe('transformSpreadlineToGraph', () => {
  it('aggregates link weight across all topology entries', () => {
    const { links } = transformSpreadlineToGraph(makeRawData());
    const egoA1 = links.find(l => [l.source, l.target].sort().join('::') === 'a1::ego');
    expect(egoA1).toBeDefined();
    expect(egoA1!.weight).toBe(2);
    expect(egoA1!.paperCount).toBe(2);
    expect(egoA1!.years).toEqual(expect.arrayContaining(['2020', '2021']));
  });

  it('computes totalCitations per node', () => {
    const { nodes } = transformSpreadlineToGraph(makeRawData());
    const a1 = nodes.find(n => n.id === 'a1');
    expect(a1!.totalCitations).toBe(3);
  });

  it('sets ego totalCitations to 0', () => {
    const { nodes } = transformSpreadlineToGraph(makeRawData());
    const ego = nodes.find(n => n.isEgo);
    expect(ego!.totalCitations).toBe(0);
  });
});

describe('transformSpreadlineToGraphByTime', () => {
  it('aggregates link weight for a single time block', () => {
    const { links } = transformSpreadlineToGraphByTime(makeRawData(), '2020');
    const egoA1 = links.find(l => [l.source, l.target].sort().join('::') === 'a1::ego');
    expect(egoA1!.weight).toBe(1);
    expect(egoA1!.paperCount).toBe(1);
    expect(egoA1!.years).toEqual(['2020']);
  });
});

describe('transformSpreadlineToGraphByTimes', () => {
  it('aggregates link weight across time range', () => {
    const { links } = transformSpreadlineToGraphByTimes(makeRawData(), ['2020', '2021']);
    const egoA1 = links.find(l => [l.source, l.target].sort().join('::') === 'a1::ego');
    expect(egoA1!.weight).toBe(2);
    expect(egoA1!.paperCount).toBe(2);
  });
});

describe('collaborationCount', () => {
  it('counts topology entries involving each entity in a single time block', () => {
    const { nodes } = transformSpreadlineToGraphByTime(makeRawData(), '2020');
    const a1 = nodes.find(n => n.id === 'a1');
    expect(a1!.collaborationCount).toBe(1); // Only 1 entry in 2020 involving a1
    const a2 = nodes.find(n => n.id === 'a2');
    expect(a2!.collaborationCount).toBe(1); // Only 1 entry in 2020 involving a2
  });
});

const makeRawDataWithCitations = () => ({
  egoId: 'ego',
  egoName: 'Ego Author',
  entities: {
    a1: { name: 'Author A', category: 'internal', citations: { '2020': 100, '2021': 200 } },
    a2: { name: 'Author B', category: 'external', citations: { '2020': 50 } }
  },
  topology: [
    { sourceId: 'ego', targetId: 'a1', time: '2020', weight: 1 },
    { sourceId: 'ego', targetId: 'a1', time: '2021', weight: 1 },
    { sourceId: 'ego', targetId: 'a2', time: '2020', weight: 1 },
    { sourceId: 'a1', targetId: 'a2', time: '2021', weight: 1 }
  ],
  groups: {
    '2020': [[], [], ['ego'], ['a1'], ['a2']],
    '2021': [[], [], ['ego'], ['a1'], ['a2']]
  },
  timeBlocks: ['2021', '2020']
});

describe('transformSpreadlineToTimeline', () => {
  it('returns ego entity first regardless of activity count', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    expect(result[0].name).toBe('Ego Author');
    expect(result[0].isEgo).toBe(true);
  });

  it('sorts non-ego entities by total activity count descending', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    const nonEgo = result.filter(e => !e.isEgo);
    expect(nonEgo[0].name).toBe('Author A');
    expect(nonEgo[1].name).toBe('Author B');
    expect(nonEgo[0].totalActivity).toBeGreaterThanOrEqual(nonEgo[1].totalActivity);
  });

  it('computes timeBlocks with citation counts per entity', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    const a1 = result.find(e => e.name === 'Author A')!;
    expect(a1.timeBlocks).toEqual(
      expect.arrayContaining([
        { time: '2020', citationCount: 100 },
        { time: '2021', citationCount: 200 }
      ])
    );
  });

  it('computes lifespan as number of distinct active time blocks', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    const a1 = result.find(e => e.name === 'Author A')!;
    expect(a1.lifespan).toBe(2);
    const a2 = result.find(e => e.name === 'Author B')!;
    expect(a2.lifespan).toBe(2);
  });

  it('includes ego time blocks from topology', () => {
    const result = transformSpreadlineToTimeline(makeRawDataWithCitations());
    const ego = result.find(e => e.isEgo)!;
    expect(ego.timeBlocks.length).toBeGreaterThan(0);
  });
});

describe('deduplicateLinks', () => {
  it('merges links with the same source-target pair', () => {
    const entries = [
      { sourceId: 'a', targetId: 'b', time: '2020', weight: 1 },
      { sourceId: 'a', targetId: 'b', time: '2021', weight: 2 },
      { sourceId: 'b', targetId: 'a', time: '2022', weight: 3 }
    ];
    const nodeIds = new Set(['a', 'b']);
    const links = deduplicateLinks(entries, nodeIds);

    expect(links).toHaveLength(1);
    expect(links[0].weight).toBe(6);
    expect(links[0].paperCount).toBe(3);
    expect(links[0].years).toEqual(['2020', '2021', '2022']);
  });

  it('filters out links where source or target is not in nodeIds', () => {
    const entries = [
      { sourceId: 'a', targetId: 'b', time: '2020', weight: 1 },
      { sourceId: 'a', targetId: 'c', time: '2020', weight: 1 }
    ];
    const nodeIds = new Set(['a', 'b']);
    const links = deduplicateLinks(entries, nodeIds);

    expect(links).toHaveLength(1);
    expect(links[0].source).toBe('a');
    expect(links[0].target).toBe('b');
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateLinks([], new Set())).toEqual([]);
  });
});

describe('bfsDistances', () => {
  it('computes shortest distances from a start node', () => {
    const links = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'a', target: 'd' }
    ];
    const distances = bfsDistances('a', links);

    expect(distances.get('a')).toBe(0);
    expect(distances.get('b')).toBe(1);
    expect(distances.get('c')).toBe(2);
    expect(distances.get('d')).toBe(1);
  });

  it('returns only reachable nodes', () => {
    const links = [
      { source: 'a', target: 'b' },
      { source: 'c', target: 'd' } // disconnected
    ];
    const distances = bfsDistances('a', links);

    expect(distances.has('a')).toBe(true);
    expect(distances.has('b')).toBe(true);
    expect(distances.has('c')).toBe(false);
    expect(distances.has('d')).toBe(false);
  });
});
