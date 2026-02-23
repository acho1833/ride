import { transformSpreadlineToGraph, transformSpreadlineToGraphByTime, transformSpreadlineToGraphByTimes } from './utils';

const makeRawData = () => ({
  egoId: 'ego',
  egoName: 'Ego Author',
  entities: {
    a1: { name: 'Author A', category: 'internal' },
    a2: { name: 'Author B', category: 'external' }
  },
  topology: [
    { sourceId: 'ego', targetId: 'a1', time: '2020', weight: 100 },
    { sourceId: 'ego', targetId: 'a1', time: '2021', weight: 200 },
    { sourceId: 'ego', targetId: 'a2', time: '2020', weight: 50 },
    { sourceId: 'a1', targetId: 'a2', time: '2021', weight: 300 }
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
    expect(egoA1!.weight).toBe(300);
    expect(egoA1!.paperCount).toBe(2);
    expect(egoA1!.years).toEqual(expect.arrayContaining(['2020', '2021']));
  });

  it('computes totalCitations per node', () => {
    const { nodes } = transformSpreadlineToGraph(makeRawData());
    const a1 = nodes.find(n => n.id === 'a1');
    expect(a1!.totalCitations).toBe(600);
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
    expect(egoA1!.weight).toBe(100);
    expect(egoA1!.paperCount).toBe(1);
    expect(egoA1!.years).toEqual(['2020']);
  });
});

describe('transformSpreadlineToGraphByTimes', () => {
  it('aggregates link weight across time range', () => {
    const { links } = transformSpreadlineToGraphByTimes(makeRawData(), ['2020', '2021']);
    const egoA1 = links.find(l => [l.source, l.target].sort().join('::') === 'a1::ego');
    expect(egoA1!.weight).toBe(300);
    expect(egoA1!.paperCount).toBe(2);
  });
});
