/**
 * Generates dummyData.json with fixed seed for consistent mock data.
 *
 * Creates entities with specific relationship counts for testing preview mode:
 * - A prefix (Person): 5-10 relationships each
 * - B prefix (Person): 20-30 relationships each
 * - C prefix (Person): 30-49 relationships each
 * - Z prefix (Organization): 100+ relationships each
 * - Regular entities: Random relationships
 *
 * Usage: npx tsx scripts/generate-dummy-data.ts
 */

import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';
import type { EntityResponse } from '@/models/entity-response.model';
import type { RelationshipResponse } from '@/models/workspace-response.model';
import { RELATIONSHIP_PREDICATES } from '@/lib/mock-data/entities';

const FAKER_SEED = 12345;
const OUTPUT_PATH = path.join(__dirname, '../src/lib/mock-data/dummyData.json');
const WORKSPACE_STATE_PATH = path.join(__dirname, '../src/lib/mock-data/workspaceState.json');

// Entity counts by prefix
const ENTITY_COUNTS = {
  A: 5, // 5-10 relationships
  B: 5, // 20-30 relationships
  C: 5, // 30-49 relationships
  Z: 3, // 100+ relationships
  regularPerson: 200,
  regularOrg: 200
};

// Target relationship counts (min-max)
const RELATIONSHIP_TARGETS = {
  A: { min: 5, max: 10 },
  B: { min: 20, max: 30 },
  C: { min: 30, max: 49 },
  Z: { min: 100, max: 120 }
};

function generateData() {
  // Delete existing data files first
  for (const filePath of [OUTPUT_PATH, WORKSPACE_STATE_PATH]) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted ${path.basename(filePath)}`);
    }
  }

  console.log('Generating dummy data with fixed seed...');
  faker.seed(FAKER_SEED);

  const entities: EntityResponse[] = [];
  const relationships: RelationshipResponse[] = [];
  const seenPairs = new Set<string>();
  let relId = 1;

  // Helper to add relationship
  const addRelationship = (sourceId: string, targetId: string): boolean => {
    const pairKey = `${sourceId}-${targetId}`;
    const reversePairKey = `${targetId}-${sourceId}`;
    if (seenPairs.has(pairKey) || seenPairs.has(reversePairKey) || sourceId === targetId) {
      return false;
    }
    seenPairs.add(pairKey);
    relationships.push({
      relationshipId: `rel-${relId++}`,
      predicate: faker.helpers.arrayElement([...RELATIONSHIP_PREDICATES]),
      sourceEntityId: sourceId,
      relatedEntityId: targetId
    });
    return true;
  };

  // Create A-prefix entities (Person, 5-10 relationships)
  for (let i = 1; i <= ENTITY_COUNTS.A; i++) {
    entities.push({
      id: `person-a-${i}`,
      labelNormalized: `A${faker.person.lastName()} ${faker.person.firstName()}`,
      type: 'Person'
    });
  }

  // Create B-prefix entities (Person, 20-30 relationships)
  for (let i = 1; i <= ENTITY_COUNTS.B; i++) {
    entities.push({
      id: `person-b-${i}`,
      labelNormalized: `B${faker.person.lastName()} ${faker.person.firstName()}`,
      type: 'Person'
    });
  }

  // Create C-prefix entities (Person, 30-49 relationships)
  for (let i = 1; i <= ENTITY_COUNTS.C; i++) {
    entities.push({
      id: `person-c-${i}`,
      labelNormalized: `C${faker.person.lastName()} ${faker.person.firstName()}`,
      type: 'Person'
    });
  }

  // Create Z-prefix entities (Organization, 100+ relationships)
  for (let i = 1; i <= ENTITY_COUNTS.Z; i++) {
    entities.push({
      id: `org-z-${i}`,
      labelNormalized: `Z${faker.company.name()}`,
      type: 'Organization'
    });
  }

  // Create regular Person entities
  for (let i = 1; i <= ENTITY_COUNTS.regularPerson; i++) {
    entities.push({
      id: `person-${i}`,
      labelNormalized: faker.person.fullName(),
      type: 'Person'
    });
  }

  // Create regular Organization entities
  for (let i = 1; i <= ENTITY_COUNTS.regularOrg; i++) {
    entities.push({
      id: `org-${i}`,
      labelNormalized: faker.company.name(),
      type: 'Organization'
    });
  }

  console.log(`Generated ${entities.length} entities`);

  // Get all entity IDs for relationship targets
  const allEntityIds = entities.map(e => e.id);

  // Create relationships for A-prefix entities (5-10 each)
  for (let i = 1; i <= ENTITY_COUNTS.A; i++) {
    const sourceId = `person-a-${i}`;
    const targetCount = faker.number.int({ min: RELATIONSHIP_TARGETS.A.min, max: RELATIONSHIP_TARGETS.A.max });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRelationship(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`  ${sourceId}: ${added} relationships`);
  }

  // Create relationships for B-prefix entities (20-30 each)
  for (let i = 1; i <= ENTITY_COUNTS.B; i++) {
    const sourceId = `person-b-${i}`;
    const targetCount = faker.number.int({ min: RELATIONSHIP_TARGETS.B.min, max: RELATIONSHIP_TARGETS.B.max });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRelationship(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`  ${sourceId}: ${added} relationships`);
  }

  // Create relationships for C-prefix entities (30-49 each)
  for (let i = 1; i <= ENTITY_COUNTS.C; i++) {
    const sourceId = `person-c-${i}`;
    const targetCount = faker.number.int({ min: RELATIONSHIP_TARGETS.C.min, max: RELATIONSHIP_TARGETS.C.max });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRelationship(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`  ${sourceId}: ${added} relationships`);
  }

  // Create relationships for Z-prefix entities (100+ each)
  for (let i = 1; i <= ENTITY_COUNTS.Z; i++) {
    const sourceId = `org-z-${i}`;
    const targetCount = faker.number.int({ min: RELATIONSHIP_TARGETS.Z.min, max: RELATIONSHIP_TARGETS.Z.max });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRelationship(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`  ${sourceId}: ${added} relationships`);
  }

  // Add some random relationships between regular entities
  faker.seed(FAKER_SEED + 1);
  const regularEntities = entities.filter(e => !e.id.includes('-a-') && !e.id.includes('-b-') && !e.id.includes('-c-') && !e.id.includes('-z-'));
  for (let i = 0; i < 1000; i++) {
    const source = faker.helpers.arrayElement(regularEntities);
    const target = faker.helpers.arrayElement(regularEntities);
    addRelationship(source.id, target.id);
  }

  console.log(`Generated ${relationships.length} relationships`);

  // Write to file
  const data = { entities, relationships };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);
}

generateData();
