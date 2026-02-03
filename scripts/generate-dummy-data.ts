/**
 * Generates dummyData.json with fixed seed for consistent mock data.
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
const ENTITY_COUNT = 500; // 250 Person + 250 Organization
const RELATIONSHIP_COUNT = 2000;

const OUTPUT_PATH = path.join(__dirname, '../src/lib/mock-data/dummyData.json');

function generateData() {
  console.log('Generating dummy data with fixed seed...');

  // Generate entities
  faker.seed(FAKER_SEED);
  const entities: EntityResponse[] = [];

  const personCount = Math.floor(ENTITY_COUNT / 2);
  const orgCount = ENTITY_COUNT - personCount;

  for (let i = 1; i <= personCount; i++) {
    entities.push({
      id: `person-${i}`,
      labelNormalized: faker.person.fullName(),
      type: 'Person'
    });
  }

  for (let i = 1; i <= orgCount; i++) {
    entities.push({
      id: `org-${i}`,
      labelNormalized: faker.company.name(),
      type: 'Organization'
    });
  }

  console.log(`Generated ${entities.length} entities`);

  // Generate relationships
  faker.seed(FAKER_SEED + 1);
  const relationships: RelationshipResponse[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < RELATIONSHIP_COUNT; i++) {
    const source = faker.helpers.arrayElement(entities);
    const target = faker.helpers.arrayElement(entities.filter(e => e.id !== source.id));
    const pairKey = `${source.id}-${target.id}`;

    if (!seenPairs.has(pairKey)) {
      seenPairs.add(pairKey);
      relationships.push({
        relationshipId: `rel-${i + 1}`,
        predicate: faker.helpers.arrayElement([...RELATIONSHIP_PREDICATES]),
        sourceEntityId: source.id,
        relatedEntityId: target.id
      });
    }
  }

  console.log(`Generated ${relationships.length} relationships`);

  // Write to file
  const data = { entities, relationships };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);
}

generateData();
