/**
 * @jest-environment node
 */

import {
  getWorkspaceById,
  addEntitiesToWorkspace,
  removeEntitiesFromWorkspace,
  setWorkspaceData
} from './workspace.mock-service';

const TEST_SID = 'test-user-ws-mock';
const TEST_WORKSPACE = 'ws-mock-test-' + Date.now();

describe('workspace.mock-service', () => {
  describe('getWorkspaceById', () => {
    it('returns empty workspace for new ID', async () => {
      const wsId = TEST_WORKSPACE + '-empty';
      const result = await getWorkspaceById(wsId, TEST_SID);

      expect(result.id).toBe(wsId);
      expect(result.entityList).toEqual([]);
      expect(result.relationshipList).toEqual([]);
    });
  });

  describe('addEntitiesToWorkspace', () => {
    it('adds entities from MongoDB', async () => {
      const wsId = TEST_WORKSPACE + '-add';
      const result = await addEntitiesToWorkspace(wsId, ['google-hq'], TEST_SID);

      expect(result.entityList.length).toBe(1);
      expect(result.entityList[0].id).toBe('google-hq');
      expect(result.entityList[0].labelNormalized).toBe('Google');
    });

    it('auto-includes connecting relationships when adding related entities', async () => {
      const wsId = TEST_WORKSPACE + '-rel';
      // Add google-hq first
      await addEntitiesToWorkspace(wsId, ['google-hq'], TEST_SID);
      // Add a division (which has a relationship to google-hq)
      const result = await addEntitiesToWorkspace(wsId, ['div-1'], TEST_SID);

      expect(result.entityList.length).toBe(2);
      // Should have at least one relationship connecting them
      expect(result.relationshipList.length).toBeGreaterThan(0);
      const hasConnection = result.relationshipList.some(
        r =>
          (r.sourceEntityId === 'google-hq' && r.relatedEntityId === 'div-1') ||
          (r.sourceEntityId === 'div-1' && r.relatedEntityId === 'google-hq')
      );
      expect(hasConnection).toBe(true);
    });

    it('skips duplicate entities', async () => {
      const wsId = TEST_WORKSPACE + '-dup';
      await addEntitiesToWorkspace(wsId, ['google-hq'], TEST_SID);
      const result = await addEntitiesToWorkspace(wsId, ['google-hq'], TEST_SID);

      expect(result.entityList.length).toBe(1);
    });
  });

  describe('removeEntitiesFromWorkspace', () => {
    it('removes entities and their relationships', async () => {
      const wsId = TEST_WORKSPACE + '-rm';
      await addEntitiesToWorkspace(wsId, ['google-hq'], TEST_SID);
      await addEntitiesToWorkspace(wsId, ['div-1'], TEST_SID);

      const result = await removeEntitiesFromWorkspace(wsId, ['div-1'], TEST_SID);

      expect(result.entityList.length).toBe(1);
      expect(result.entityList[0].id).toBe('google-hq');
      // No relationships should reference div-1
      for (const rel of result.relationshipList) {
        expect(rel.sourceEntityId).not.toBe('div-1');
        expect(rel.relatedEntityId).not.toBe('div-1');
      }
    });
  });

  describe('setWorkspaceData', () => {
    it('replaces workspace data completely', async () => {
      const wsId = TEST_WORKSPACE + '-set';
      const entities = [
        { id: 'e1', labelNormalized: 'Entity 1', type: 'Person' },
        { id: 'e2', labelNormalized: 'Entity 2', type: 'Organization' }
      ];
      const relationships = [
        { relationshipId: 'r1', predicate: 'knows', sourceEntityId: 'e1', relatedEntityId: 'e2' }
      ];

      const result = await setWorkspaceData(wsId, entities, relationships, TEST_SID);

      expect(result.entityList.length).toBe(2);
      expect(result.relationshipList.length).toBe(1);
      expect(result.entityList[0].id).toBe('e1');
      expect(result.entityList[1].id).toBe('e2');
    });
  });
});
