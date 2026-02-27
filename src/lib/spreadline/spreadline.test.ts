import { SpreadLine } from './spreadline';

const makeTopologyData = () => [
  { source: 'Ego', target: 'Alice', time: '2020', weight: 1 },
  { source: 'Ego', target: 'Bob', time: '2020', weight: 1 },
  { source: 'Alice', target: 'Bob', time: '2020', weight: 1 },
  { source: 'Ego', target: 'Alice', time: '2021', weight: 1 },
  { source: 'Ego', target: 'Carol', time: '2021', weight: 1 }
];

describe('SpreadLine', () => {
  describe('load', () => {
    it('loads topology data', () => {
      const sl = new SpreadLine();
      expect(() =>
        sl.load(makeTopologyData(), { source: 'source', target: 'target', time: 'time', weight: 'weight' }, 'topology')
      ).not.toThrow();
    });

    it('loads line color data', () => {
      const sl = new SpreadLine();
      const colors = [
        { entity: 'Alice', color: '#ff0000' },
        { entity: 'Bob', color: '#00ff00' }
      ];
      sl.load(colors, { entity: 'entity', color: 'color' }, 'line');
      expect(sl._line_color).toEqual({ Alice: '#ff0000', Bob: '#00ff00' });
    });

    it('throws on unsupported key type', () => {
      const sl = new SpreadLine();
      expect(() => sl.load([], {}, 'invalid')).toThrow('Not supported key type');
    });
  });

  describe('center', () => {
    it('constructs egocentric network from topology', () => {
      const sl = new SpreadLine();
      sl.load(makeTopologyData(), { source: 'source', target: 'target', time: 'time', weight: 'weight' }, 'topology');
      sl.center('Ego', ['2020', '2021'], 'year', '%Y');

      expect(sl.ego).toBe('Ego');
      expect(sl.entities_names).toContain('Ego');
      expect(sl.entities_names).toContain('Alice');
      expect(sl.entities.length).toBeGreaterThan(0);
      expect(sl.sessions.length).toBeGreaterThan(0);
    });
  });

  describe('fit (full pipeline)', () => {
    it('produces a valid SpreadLineResult', () => {
      const sl = new SpreadLine();
      sl.load(makeTopologyData(), { source: 'source', target: 'target', time: 'time', weight: 'weight' }, 'topology');
      sl.center('Ego', ['2020', '2021'], 'year', '%Y');
      sl.configure({ squeezeSameCategory: false, minimize: 'wiggles' });

      const result = sl.fit(1400, 500);

      expect(result).toBeDefined();
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.storylines.length).toBeGreaterThan(0);
      expect(result.timeLabels.length).toBeGreaterThan(0);
      expect(result.ego).toBe('Ego');

      // Every storyline should have a name; entities spanning multiple
      // timestamps produce SVG path lines, single-timestamp entities may not.
      for (const storyline of result.storylines) {
        expect(storyline.name).toBeTruthy();
      }

      // At least one storyline should have SVG path lines
      const withLines = result.storylines.filter(s => s.lines.length > 0);
      expect(withLines.length).toBeGreaterThan(0);

      // Height extents should be ordered
      expect(result.heightExtents[0]).toBeLessThanOrEqual(result.heightExtents[1]);
    });
  });
});
