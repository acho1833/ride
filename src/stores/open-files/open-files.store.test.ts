import { create } from 'zustand';
import { createOpenFilesSlice, OpenFilesSlice, EditorRow } from './open-files.store';

// Helper to create a minimal store for testing
const createTestStore = (rows: EditorRow[], lastFocusedGroupId: string | null = 'group-1') => {
  const store = create<OpenFilesSlice>()((...a) => ({
    ...createOpenFilesSlice(...a)
  }));

  // Override initial state with test state
  store.setState({
    openFiles: { rows, lastFocusedGroupId }
  });

  return store;
};

// Helper to build a group with files
const makeGroup = (id: string, fileIds: string[], activeFileId: string) => ({
  id,
  files: fileIds.map(fid => ({ id: fid, name: `${fid}.txt` })),
  activeFileId
});

describe('open-files store - active tab selection after move', () => {
  describe('moveFileToGroup', () => {
    it('should activate the previous tab when the last tab is moved out', () => {
      // Tabs: A, B, C with C active
      // Move C to another group → should activate B (not A)
      const rows: EditorRow[] = [
        {
          id: 'row-1',
          groups: [makeGroup('group-1', ['A', 'B', 'C'], 'C'), makeGroup('group-2', ['D'], 'D')]
        }
      ];
      const store = createTestStore(rows);

      store.getState().moveFileToGroup('C', 'group-1', 'group-2');

      const group1 = store.getState().openFiles.rows[0].groups[0];
      expect(group1.activeFileId).toBe('B');
    });

    it('should activate the next tab when a middle tab is moved out', () => {
      // Tabs: A, B, C with B active
      // Move B → should activate C (tab at same index)
      const rows: EditorRow[] = [
        {
          id: 'row-1',
          groups: [makeGroup('group-1', ['A', 'B', 'C'], 'B'), makeGroup('group-2', ['D'], 'D')]
        }
      ];
      const store = createTestStore(rows);

      store.getState().moveFileToGroup('B', 'group-1', 'group-2');

      const group1 = store.getState().openFiles.rows[0].groups[0];
      expect(group1.activeFileId).toBe('C');
    });

    it('should activate the next tab when the first tab is moved out', () => {
      // Tabs: A, B, C with A active
      // Move A → should activate B (tab at index 0)
      const rows: EditorRow[] = [
        {
          id: 'row-1',
          groups: [makeGroup('group-1', ['A', 'B', 'C'], 'A'), makeGroup('group-2', ['D'], 'D')]
        }
      ];
      const store = createTestStore(rows);

      store.getState().moveFileToGroup('A', 'group-1', 'group-2');

      const group1 = store.getState().openFiles.rows[0].groups[0];
      expect(group1.activeFileId).toBe('B');
    });
  });

  describe('moveFileToNewGroup', () => {
    it('should activate the previous tab when the last tab is split right', () => {
      // Tabs: A, B, C with C active
      // Split and Move Right on C → should activate B (not A)
      const rows: EditorRow[] = [
        {
          id: 'row-1',
          groups: [makeGroup('group-1', ['A', 'B', 'C'], 'C')]
        }
      ];
      const store = createTestStore(rows);

      store.getState().moveFileToNewGroup('C', 'group-1', 'right');

      const group1 = store.getState().openFiles.rows[0].groups[0];
      expect(group1.activeFileId).toBe('B');
    });

    it('should activate the next tab when a middle tab is split right', () => {
      // Tabs: A, B, C with B active
      // Split and Move Right on B → should activate C
      const rows: EditorRow[] = [
        {
          id: 'row-1',
          groups: [makeGroup('group-1', ['A', 'B', 'C'], 'B')]
        }
      ];
      const store = createTestStore(rows);

      store.getState().moveFileToNewGroup('B', 'group-1', 'right');

      const group1 = store.getState().openFiles.rows[0].groups[0];
      expect(group1.activeFileId).toBe('C');
    });

    it('should activate the next tab when the first tab is split left', () => {
      // Tabs: A, B, C with A active
      // Split and Move Left on A → should activate B
      const rows: EditorRow[] = [
        {
          id: 'row-1',
          groups: [makeGroup('group-1', ['A', 'B', 'C'], 'A')]
        }
      ];
      const store = createTestStore(rows);

      store.getState().moveFileToNewGroup('A', 'group-1', 'left');

      // After split left, the source group is now at index 1 (new group inserted at 0)
      const sourceGroup = store.getState().openFiles.rows[0].groups[1];
      expect(sourceGroup.activeFileId).toBe('B');
    });
  });
});
