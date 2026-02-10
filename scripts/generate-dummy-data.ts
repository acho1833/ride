/**
 * Generates mock data and writes it directly to SQLite database.
 *
 * Three datasets:
 * 1. Dummy data (seed 12345) — diversified entity types for testing preview mode
 * 2. Google org data (seed 54321) — ~2,000 entities with org hierarchy
 * 3. Microsoft org data (seed 99999) — ~20,000 entities with worker threads for employees
 *
 * Usage: npx tsx scripts/generate-dummy-data.ts
 */

import { faker } from '@faker-js/faker';
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { isMainThread, Worker } from 'worker_threads';

// Inlined to avoid import resolution issues in worker threads (tsx doesn't register for workers)
const RELATIONSHIP_PREDICATES = [
  'works_for',
  'knows',
  'manages',
  'reports_to',
  'collaborates_with',
  'part_of',
  'owns',
  'located_at',
  'attends',
  'operates'
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntityRow {
  id: string;
  labelNormalized: string;
  type: string;
}

interface RelationshipRow {
  relationshipId: string;
  predicate: string;
  sourceEntityId: string;
  relatedEntityId: string;
}

interface DataSet {
  entities: EntityRow[];
  relationships: RelationshipRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DUMMY_SEED = 12345;
const GOOGLE_SEED = 54321;
const MICROSOFT_SEED = 99999;

const DB_PATH = path.join(__dirname, '../src/lib/mock-data/mock.db');
const LEGACY_DUMMY_PATH = path.join(__dirname, '../src/lib/mock-data/dummyData.json');
const LEGACY_GOOGLE_PATH = path.join(__dirname, '../src/lib/mock-data/googleOrgData.json');

const WORKER_COUNT = 4;
const MS_EMPLOYEE_COUNT = 15000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deleteIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  Deleted ${path.basename(filePath)}`);
  }
}

/** Creates a duplicate-aware relationship adder scoped to a dataset. */
function createRelAdder(
  relationships: RelationshipRow[],
  seenPairs: Set<string>,
  relIdRef: { value: number },
  prefix: string
) {
  return (sourceId: string, targetId: string, predicate?: string): boolean => {
    const pairKey = `${sourceId}-${targetId}`;
    const reversePairKey = `${targetId}-${sourceId}`;
    if (seenPairs.has(pairKey) || seenPairs.has(reversePairKey) || sourceId === targetId) {
      return false;
    }
    seenPairs.add(pairKey);
    relationships.push({
      relationshipId: `${prefix}${relIdRef.value++}`,
      predicate: predicate ?? faker.helpers.arrayElement([...RELATIONSHIP_PREDICATES]),
      sourceEntityId: sourceId,
      relatedEntityId: targetId
    });
    return true;
  };
}

/** Connects sourceId to `count` random targets from pool. */
function connectToPool(
  sourceId: string,
  pool: EntityRow[],
  count: number,
  addRel: ReturnType<typeof createRelAdder>,
  predicate?: string
): void {
  let added = 0;
  let attempts = 0;
  while (added < count && attempts < count * 3) {
    const target = faker.helpers.arrayElement(pool);
    if (addRel(sourceId, target.id, predicate)) added++;
    attempts++;
  }
}

// ---------------------------------------------------------------------------
// 1. Dummy Data (seed 12345)
// ---------------------------------------------------------------------------

function generateDummyData(): DataSet {
  console.log('\n=== Dummy Data (seed 12345) ===');
  faker.seed(DUMMY_SEED);

  const entities: EntityRow[] = [];
  const relationships: RelationshipRow[] = [];
  const seenPairs = new Set<string>();
  const relIdRef = { value: 1 };
  const addRel = createRelAdder(relationships, seenPairs, relIdRef, 'rel-');

  // Entity counts by prefix
  const ENTITY_COUNTS = {
    A: 5, // 5-10 relationships
    B: 5, // 10-20 relationships
    C: 5, // 30-50 relationships
    D: 5, // 60-100 relationships
    Z: 3, // 100+ relationships
    regularPerson: 150,
    regularOrg: 150,
    regularVehicle: 30,
    regularLocation: 30,
    regularDevice: 20,
    regularEvent: 20
  };

  const RELATIONSHIP_TARGETS = {
    A: { min: 5, max: 10 },
    B: { min: 10, max: 20 },
    C: { min: 30, max: 50 },
    D: { min: 60, max: 100 },
    Z: { min: 100, max: 120 }
  };

  // A-prefix entities (Person, 5-10 relationships)
  for (let i = 1; i <= ENTITY_COUNTS.A; i++) {
    entities.push({
      id: `person-a-${i}`,
      labelNormalized: `A${faker.person.lastName()} ${faker.person.firstName()}`,
      type: 'Person'
    });
  }

  // B-prefix entities (Person, 20-30 relationships)
  for (let i = 1; i <= ENTITY_COUNTS.B; i++) {
    entities.push({
      id: `person-b-${i}`,
      labelNormalized: `B${faker.person.lastName()} ${faker.person.firstName()}`,
      type: 'Person'
    });
  }

  // C-prefix entities (Person, 30-49 relationships)
  for (let i = 1; i <= ENTITY_COUNTS.C; i++) {
    entities.push({
      id: `person-c-${i}`,
      labelNormalized: `C${faker.person.lastName()} ${faker.person.firstName()}`,
      type: 'Person'
    });
  }

  // D-prefix entities (Person, 60-100 relationships)
  for (let i = 1; i <= ENTITY_COUNTS.D; i++) {
    entities.push({
      id: `person-d-${i}`,
      labelNormalized: `D${faker.person.lastName()} ${faker.person.firstName()}`,
      type: 'Person'
    });
  }

  // Z-prefix entities (Organization, 100+ relationships)
  for (let i = 1; i <= ENTITY_COUNTS.Z; i++) {
    entities.push({
      id: `org-z-${i}`,
      labelNormalized: `Z${faker.company.name()}`,
      type: 'Organization'
    });
  }

  // Regular Person entities
  for (let i = 1; i <= ENTITY_COUNTS.regularPerson; i++) {
    entities.push({
      id: `person-${i}`,
      labelNormalized: faker.person.fullName(),
      type: 'Person'
    });
  }

  // Regular Organization entities
  for (let i = 1; i <= ENTITY_COUNTS.regularOrg; i++) {
    entities.push({
      id: `org-${i}`,
      labelNormalized: faker.company.name(),
      type: 'Organization'
    });
  }

  // Regular Vehicle entities
  for (let i = 1; i <= ENTITY_COUNTS.regularVehicle; i++) {
    entities.push({
      id: `vehicle-${i}`,
      labelNormalized: `${faker.vehicle.manufacturer()} ${faker.vehicle.model()}`,
      type: 'Vehicle'
    });
  }

  // Regular Location entities
  for (let i = 1; i <= ENTITY_COUNTS.regularLocation; i++) {
    entities.push({
      id: `location-${i}`,
      labelNormalized: `${faker.location.city()}, ${faker.location.state()}`,
      type: 'Location'
    });
  }

  // Regular Device entities
  for (let i = 1; i <= ENTITY_COUNTS.regularDevice; i++) {
    entities.push({
      id: `device-${i}`,
      labelNormalized: `${faker.commerce.productName()} (${faker.string.alphanumeric(8).toUpperCase()})`,
      type: 'Device'
    });
  }

  // Regular Event entities
  for (let i = 1; i <= ENTITY_COUNTS.regularEvent; i++) {
    entities.push({
      id: `event-${i}`,
      labelNormalized: `${faker.company.buzzNoun()} ${faker.helpers.arrayElement(['Summit', 'Conference', 'Workshop', 'Meetup', 'Symposium'])} ${faker.date.future().getFullYear()}`,
      type: 'Event'
    });
  }

  console.log(`  Generated ${entities.length} entities`);

  // Get all entity IDs for relationship targets
  const allEntityIds = entities.map(e => e.id);

  // Create relationships for A-prefix entities (5-10 each)
  for (let i = 1; i <= ENTITY_COUNTS.A; i++) {
    const sourceId = `person-a-${i}`;
    const targetCount = faker.number.int({
      min: RELATIONSHIP_TARGETS.A.min,
      max: RELATIONSHIP_TARGETS.A.max
    });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRel(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`    ${sourceId}: ${added} relationships`);
  }

  // Create relationships for B-prefix entities (20-30 each)
  for (let i = 1; i <= ENTITY_COUNTS.B; i++) {
    const sourceId = `person-b-${i}`;
    const targetCount = faker.number.int({
      min: RELATIONSHIP_TARGETS.B.min,
      max: RELATIONSHIP_TARGETS.B.max
    });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRel(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`    ${sourceId}: ${added} relationships`);
  }

  // Create relationships for C-prefix entities (30-49 each)
  for (let i = 1; i <= ENTITY_COUNTS.C; i++) {
    const sourceId = `person-c-${i}`;
    const targetCount = faker.number.int({
      min: RELATIONSHIP_TARGETS.C.min,
      max: RELATIONSHIP_TARGETS.C.max
    });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRel(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`    ${sourceId}: ${added} relationships`);
  }

  // Create relationships for D-prefix entities (60-100 each)
  for (let i = 1; i <= ENTITY_COUNTS.D; i++) {
    const sourceId = `person-d-${i}`;
    const targetCount = faker.number.int({
      min: RELATIONSHIP_TARGETS.D.min,
      max: RELATIONSHIP_TARGETS.D.max
    });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRel(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`    ${sourceId}: ${added} relationships`);
  }

  // Create relationships for Z-prefix entities (100+ each)
  for (let i = 1; i <= ENTITY_COUNTS.Z; i++) {
    const sourceId = `org-z-${i}`;
    const targetCount = faker.number.int({
      min: RELATIONSHIP_TARGETS.Z.min,
      max: RELATIONSHIP_TARGETS.Z.max
    });
    let added = 0;
    let attempts = 0;
    while (added < targetCount && attempts < targetCount * 3) {
      const targetId = faker.helpers.arrayElement(allEntityIds);
      if (addRel(sourceId, targetId)) added++;
      attempts++;
    }
    console.log(`    ${sourceId}: ${added} relationships`);
  }

  // Add random relationships between regular entities
  faker.seed(DUMMY_SEED + 1);
  const regularEntities = entities.filter(
    e => !e.id.includes('-a-') && !e.id.includes('-b-') && !e.id.includes('-c-') && !e.id.includes('-d-') && !e.id.includes('-z-')
  );
  for (let i = 0; i < 1000; i++) {
    const source = faker.helpers.arrayElement(regularEntities);
    const target = faker.helpers.arrayElement(regularEntities);
    addRel(source.id, target.id);
  }

  console.log(`  Generated ${relationships.length} relationships`);
  return { entities, relationships };
}

// ---------------------------------------------------------------------------
// 2. Google Org Data (seed 54321)
// ---------------------------------------------------------------------------

function generateGoogleOrgData(): DataSet {
  console.log('\n=== Google Org Data (seed 54321) ===');
  faker.seed(GOOGLE_SEED);

  const entities: EntityRow[] = [];
  const relationships: RelationshipRow[] = [];
  const seenPairs = new Set<string>();
  const relIdRef = { value: 1 };
  const addRel = createRelAdder(relationships, seenPairs, relIdRef, 'grel-');

  const COUNTS = {
    divisions: 8,
    teams: 40,
    executives: 15,
    directors: 80,
    managers: 250,
    employees: 1200,
    partners: 50,
    contractors: 350
  };

  // -- Create Entities --

  const googleHQ: EntityRow = { id: 'google-hq', labelNormalized: 'Google', type: 'Organization' };
  entities.push(googleHQ);

  const divisionNames = [
    'Google Cloud',
    'Google Search',
    'YouTube',
    'Android',
    'Google Ads',
    'Waymo',
    'DeepMind',
    'Google Maps'
  ];
  const divisions: EntityRow[] = [];
  for (let i = 0; i < COUNTS.divisions; i++) {
    const e: EntityRow = {
      id: `div-${i + 1}`,
      labelNormalized: divisionNames[i],
      type: 'Organization'
    };
    entities.push(e);
    divisions.push(e);
  }

  const teams: EntityRow[] = [];
  for (let i = 0; i < COUNTS.teams; i++) {
    const div = divisions[i % divisions.length];
    const e: EntityRow = {
      id: `team-${i + 1}`,
      labelNormalized: `${div.labelNormalized} - ${faker.commerce.department()} Team`,
      type: 'Organization'
    };
    entities.push(e);
    teams.push(e);
  }

  const executives: EntityRow[] = [];
  for (let i = 0; i < COUNTS.executives; i++) {
    const title = faker.helpers.arrayElement([
      'CEO',
      'CTO',
      'CFO',
      'CPO',
      'SVP',
      'VP Engineering',
      'VP Product',
      'VP Sales'
    ]);
    const e: EntityRow = {
      id: `exec-${i + 1}`,
      labelNormalized: `${faker.person.fullName()} (${title})`,
      type: 'Person'
    };
    entities.push(e);
    executives.push(e);
  }

  const directors: EntityRow[] = [];
  for (let i = 0; i < COUNTS.directors; i++) {
    const e: EntityRow = {
      id: `dir-${i + 1}`,
      labelNormalized: `${faker.person.fullName()} (Director)`,
      type: 'Person'
    };
    entities.push(e);
    directors.push(e);
  }

  const managers: EntityRow[] = [];
  for (let i = 0; i < COUNTS.managers; i++) {
    const e: EntityRow = {
      id: `mgr-${i + 1}`,
      labelNormalized: `${faker.person.fullName()} (Manager)`,
      type: 'Person'
    };
    entities.push(e);
    managers.push(e);
  }

  const employees: EntityRow[] = [];
  for (let i = 0; i < COUNTS.employees; i++) {
    const e: EntityRow = {
      id: `emp-${i + 1}`,
      labelNormalized: faker.person.fullName(),
      type: 'Person'
    };
    entities.push(e);
    employees.push(e);
  }

  const partners: EntityRow[] = [];
  for (let i = 0; i < COUNTS.partners; i++) {
    const e: EntityRow = {
      id: `partner-${i + 1}`,
      labelNormalized: faker.company.name(),
      type: 'Organization'
    };
    entities.push(e);
    partners.push(e);
  }

  const contractors: EntityRow[] = [];
  for (let i = 0; i < COUNTS.contractors; i++) {
    const e: EntityRow = {
      id: `contractor-${i + 1}`,
      labelNormalized: faker.person.fullName(),
      type: 'Person'
    };
    entities.push(e);
    contractors.push(e);
  }

  console.log(`  Generated ${entities.length} entities`);

  // -- Create Relationships --

  // Structural: HQ → divisions → teams
  for (const div of divisions) addRel(googleHQ.id, div.id, 'manages');
  for (let i = 0; i < teams.length; i++) {
    addRel(divisions[i % divisions.length].id, teams[i].id, 'manages');
  }

  // Executives
  for (const exec of executives) {
    addRel(exec.id, googleHQ.id, 'works_for');
    connectToPool(exec.id, divisions, faker.number.int({ min: 2, max: 4 }), addRel, 'manages');
    connectToPool(
      exec.id,
      executives,
      faker.number.int({ min: 3, max: 8 }),
      addRel,
      'collaborates_with'
    );
  }

  // Directors
  for (const dir of directors) {
    connectToPool(dir.id, executives, faker.number.int({ min: 1, max: 2 }), addRel, 'reports_to');
    connectToPool(dir.id, teams, faker.number.int({ min: 1, max: 3 }), addRel, 'manages');
    connectToPool(
      dir.id,
      directors,
      faker.number.int({ min: 2, max: 5 }),
      addRel,
      'collaborates_with'
    );
  }

  // Managers
  for (const mgr of managers) {
    connectToPool(mgr.id, directors, 1, addRel, 'reports_to');
    connectToPool(mgr.id, teams, 1, addRel, 'works_for');
    connectToPool(
      mgr.id,
      managers,
      faker.number.int({ min: 2, max: 5 }),
      addRel,
      'collaborates_with'
    );
  }

  // Employees
  for (const emp of employees) {
    connectToPool(emp.id, managers, 1, addRel, 'reports_to');
    connectToPool(emp.id, teams, 1, addRel, 'works_for');
    connectToPool(emp.id, employees, faker.number.int({ min: 1, max: 3 }), addRel, 'knows');
  }

  // Partners
  for (const partner of partners) {
    addRel(partner.id, googleHQ.id, 'collaborates_with');
    connectToPool(
      partner.id,
      divisions,
      faker.number.int({ min: 1, max: 3 }),
      addRel,
      'collaborates_with'
    );
  }

  // Contractors
  for (const contractor of contractors) {
    connectToPool(contractor.id, teams, 1, addRel, 'works_for');
    connectToPool(contractor.id, managers, 1, addRel, 'reports_to');
  }

  // Connect every entity to Google HQ via part_of
  for (const entity of entities) {
    if (entity.id !== googleHQ.id) {
      addRel(entity.id, googleHQ.id, 'part_of');
    }
  }

  console.log(`  Generated ${relationships.length} relationships`);
  return { entities, relationships };
}

// ---------------------------------------------------------------------------
// 3. Microsoft Org Data (seed 99999) — Worker thread code
// ---------------------------------------------------------------------------

/** Inline worker script that generates a chunk of employees + their relationships. */
const WORKER_SCRIPT = `
const { workerData, parentPort } = require('worker_threads');
const { faker } = require('@faker-js/faker');

const { chunkIndex, startIndex, count, seed, teamIds, managerIds, allEmployeeIdRange } = workerData;
faker.seed(seed + chunkIndex);

const entities = [];
const relationships = [];
const seenPairs = new Set();
let relId = 1;

function addRel(sourceId, targetId, predicate) {
  const pairKey = sourceId + '-' + targetId;
  const reversePairKey = targetId + '-' + sourceId;
  if (seenPairs.has(pairKey) || seenPairs.has(reversePairKey) || sourceId === targetId) return false;
  seenPairs.add(pairKey);
  relationships.push({
    relationshipId: 'ms-emp-rel-' + chunkIndex + '-' + (relId++),
    predicate,
    sourceEntityId: sourceId,
    relatedEntityId: targetId
  });
  return true;
}

for (let i = 0; i < count; i++) {
  const globalIndex = startIndex + i;
  const empId = 'ms-emp-' + globalIndex;
  entities.push({ id: empId, labelNormalized: faker.person.fullName(), type: 'Person' });

  addRel(empId, faker.helpers.arrayElement(managerIds), 'reports_to');
  addRel(empId, faker.helpers.arrayElement(teamIds), 'works_for');

  const knowCount = faker.number.int({ min: 1, max: 3 });
  for (let k = 0; k < knowCount; k++) {
    const otherIndex = faker.number.int({ min: allEmployeeIdRange.start, max: allEmployeeIdRange.end });
    if (otherIndex !== globalIndex) addRel(empId, 'ms-emp-' + otherIndex, 'knows');
  }
}

parentPort.postMessage({ entities, relationships });
`;

// Main-thread Microsoft generation
async function generateMicrosoftOrgData(): Promise<DataSet> {
  console.log('\n=== Microsoft Org Data (seed 99999) ===');
  faker.seed(MICROSOFT_SEED);

  const entities: EntityRow[] = [];
  const relationships: RelationshipRow[] = [];
  const seenPairs = new Set<string>();
  const relIdRef = { value: 1 };
  const addRel = createRelAdder(relationships, seenPairs, relIdRef, 'ms-rel-');

  // --- Entities ---

  // HQ
  const msHQ: EntityRow = { id: 'ms-hq', labelNormalized: 'Microsoft', type: 'Organization' };
  entities.push(msHQ);

  // Divisions (15)
  const divisionNames = [
    'Azure',
    'Office 365',
    'Windows',
    'Xbox',
    'LinkedIn',
    'GitHub',
    'Bing',
    'Surface',
    'Teams',
    'Dynamics',
    'Power Platform',
    'Outlook',
    'OneDrive',
    'Visual Studio',
    'Copilot'
  ];
  const divisions: EntityRow[] = [];
  for (let i = 0; i < divisionNames.length; i++) {
    const e: EntityRow = {
      id: `ms-div-${i + 1}`,
      labelNormalized: divisionNames[i],
      type: 'Organization'
    };
    entities.push(e);
    divisions.push(e);
  }

  // Teams (300)
  const teams: EntityRow[] = [];
  for (let i = 0; i < 300; i++) {
    const div = divisions[i % divisions.length];
    const e: EntityRow = {
      id: `ms-team-${i + 1}`,
      labelNormalized: `${div.labelNormalized} - ${faker.commerce.department()} Team`,
      type: 'Organization'
    };
    entities.push(e);
    teams.push(e);
  }

  // Executives (40)
  const executives: EntityRow[] = [];
  for (let i = 0; i < 40; i++) {
    const title = faker.helpers.arrayElement([
      'CEO',
      'CTO',
      'CFO',
      'CPO',
      'COO',
      'SVP',
      'EVP',
      'VP Engineering',
      'VP Product',
      'VP Sales',
      'VP Marketing',
      'VP Operations'
    ]);
    const e: EntityRow = {
      id: `ms-exec-${i + 1}`,
      labelNormalized: `${faker.person.fullName()} (${title})`,
      type: 'Person'
    };
    entities.push(e);
    executives.push(e);
  }

  // Directors (300)
  const directors: EntityRow[] = [];
  for (let i = 0; i < 300; i++) {
    const e: EntityRow = {
      id: `ms-dir-${i + 1}`,
      labelNormalized: `${faker.person.fullName()} (Director)`,
      type: 'Person'
    };
    entities.push(e);
    directors.push(e);
  }

  // Managers (2,000)
  const managers: EntityRow[] = [];
  for (let i = 0; i < 2000; i++) {
    const e: EntityRow = {
      id: `ms-mgr-${i + 1}`,
      labelNormalized: `${faker.person.fullName()} (Manager)`,
      type: 'Person'
    };
    entities.push(e);
    managers.push(e);
  }

  // Contractors (1,500)
  const contractors: EntityRow[] = [];
  for (let i = 0; i < 1500; i++) {
    const e: EntityRow = {
      id: `ms-contractor-${i + 1}`,
      labelNormalized: faker.person.fullName(),
      type: 'Person'
    };
    entities.push(e);
    contractors.push(e);
  }

  // Partners (150)
  const partners: EntityRow[] = [];
  for (let i = 0; i < 150; i++) {
    const e: EntityRow = {
      id: `ms-partner-${i + 1}`,
      labelNormalized: faker.company.name(),
      type: 'Organization'
    };
    entities.push(e);
    partners.push(e);
  }

  // Fleet Vehicles (200)
  const vehicles: EntityRow[] = [];
  for (let i = 0; i < 200; i++) {
    const e: EntityRow = {
      id: `ms-vehicle-${i + 1}`,
      labelNormalized: `${faker.vehicle.manufacturer()} ${faker.vehicle.model()}`,
      type: 'Vehicle'
    };
    entities.push(e);
    vehicles.push(e);
  }

  // Office Locations (100)
  const locations: EntityRow[] = [];
  for (let i = 0; i < 100; i++) {
    const e: EntityRow = {
      id: `ms-location-${i + 1}`,
      labelNormalized: `${faker.location.city()}, ${faker.location.state({ abbreviated: true })}`,
      type: 'Location'
    };
    entities.push(e);
    locations.push(e);
  }

  // Company Devices (300)
  const devices: EntityRow[] = [];
  for (let i = 0; i < 300; i++) {
    const e: EntityRow = {
      id: `ms-device-${i + 1}`,
      labelNormalized: `${faker.commerce.productName()} (${faker.string.alphanumeric(8).toUpperCase()})`,
      type: 'Device'
    };
    entities.push(e);
    devices.push(e);
  }

  // Company Events (100)
  const events: EntityRow[] = [];
  for (let i = 0; i < 100; i++) {
    const e: EntityRow = {
      id: `ms-event-${i + 1}`,
      labelNormalized: `${faker.company.buzzNoun()} ${faker.helpers.arrayElement(['Summit', 'Conference', 'Workshop', 'Hackathon', 'Keynote'])} ${faker.date.future().getFullYear()}`,
      type: 'Event'
    };
    entities.push(e);
    events.push(e);
  }

  const nonEmployeeCount = entities.length;
  console.log(`  Generated ${nonEmployeeCount} non-employee entities`);

  // --- Relationships (non-employee) ---

  // HQ → divisions via manages
  for (const div of divisions) addRel(msHQ.id, div.id, 'manages');

  // Divisions → teams via manages
  for (let i = 0; i < teams.length; i++) {
    addRel(divisions[i % divisions.length].id, teams[i].id, 'manages');
  }

  // Executives → divisions via manages, cross-collaborate
  for (const exec of executives) {
    addRel(exec.id, msHQ.id, 'works_for');
    connectToPool(exec.id, divisions, faker.number.int({ min: 2, max: 4 }), addRel, 'manages');
    connectToPool(
      exec.id,
      executives,
      faker.number.int({ min: 3, max: 8 }),
      addRel,
      'collaborates_with'
    );
  }

  // Directors → teams via manages, report to executives
  for (const dir of directors) {
    connectToPool(dir.id, executives, faker.number.int({ min: 1, max: 2 }), addRel, 'reports_to');
    connectToPool(dir.id, teams, faker.number.int({ min: 1, max: 3 }), addRel, 'manages');
    connectToPool(
      dir.id,
      directors,
      faker.number.int({ min: 2, max: 5 }),
      addRel,
      'collaborates_with'
    );
  }

  // Managers → report to directors, work for teams
  for (const mgr of managers) {
    connectToPool(mgr.id, directors, 1, addRel, 'reports_to');
    connectToPool(mgr.id, teams, 1, addRel, 'works_for');
    connectToPool(
      mgr.id,
      managers,
      faker.number.int({ min: 2, max: 5 }),
      addRel,
      'collaborates_with'
    );
  }

  // Contractors → work for teams, report to managers
  for (const contractor of contractors) {
    connectToPool(contractor.id, teams, 1, addRel, 'works_for');
    connectToPool(contractor.id, managers, 1, addRel, 'reports_to');
  }

  // Partners → collaborate with divisions
  for (const partner of partners) {
    addRel(partner.id, msHQ.id, 'collaborates_with');
    connectToPool(
      partner.id,
      divisions,
      faker.number.int({ min: 1, max: 3 }),
      addRel,
      'collaborates_with'
    );
  }

  // Vehicles → owned by HQ, operated by random managers (person → operates → vehicle)
  for (const vehicle of vehicles) {
    addRel(msHQ.id, vehicle.id, 'owns');
  }
  for (const mgr of managers.slice(0, 200)) {
    const vehicle = faker.helpers.arrayElement(vehicles);
    addRel(mgr.id, vehicle.id, 'operates');
  }

  // Locations → HQ located_at, divisions located_at
  for (const loc of locations) {
    addRel(msHQ.id, loc.id, 'located_at');
  }
  for (const div of divisions) {
    connectToPool(
      div.id,
      locations,
      faker.number.int({ min: 1, max: 3 }),
      addRel,
      'located_at'
    );
  }

  // Devices → owned by random managers (person → owns → device), part_of teams
  for (const device of devices) {
    const mgr = faker.helpers.arrayElement(managers);
    addRel(mgr.id, device.id, 'owns');
    connectToPool(device.id, teams, 1, addRel, 'part_of');
  }

  // Events → attended by executives/managers (person → attends → event), part_of divisions
  for (const event of events) {
    const execCount = faker.number.int({ min: 2, max: 5 });
    for (let j = 0; j < execCount; j++) {
      const exec = faker.helpers.arrayElement(executives);
      addRel(exec.id, event.id, 'attends');
    }
    const mgrCount = faker.number.int({ min: 3, max: 10 });
    for (let j = 0; j < mgrCount; j++) {
      const mgr = faker.helpers.arrayElement(managers);
      addRel(mgr.id, event.id, 'attends');
    }
    connectToPool(event.id, divisions, faker.number.int({ min: 1, max: 3 }), addRel, 'part_of');
  }

  // Connect every non-employee entity to MS HQ via part_of
  for (const entity of entities) {
    if (entity.id !== msHQ.id) {
      addRel(entity.id, msHQ.id, 'part_of');
    }
  }

  const nonEmployeeRelCount = relationships.length;
  console.log(`  Generated ${nonEmployeeRelCount} non-employee relationships`);

  // --- Employees via Worker Threads (15,000) ---

  console.log(`  Spawning ${WORKER_COUNT} workers for ${MS_EMPLOYEE_COUNT} employees...`);

  const teamIds = teams.map(t => t.id);
  const managerIds = managers.map(m => m.id);
  const chunkSize = Math.ceil(MS_EMPLOYEE_COUNT / WORKER_COUNT);

  const workerPromises: Promise<DataSet>[] = [];
  for (let w = 0; w < WORKER_COUNT; w++) {
    const startIndex = w * chunkSize + 1;
    const count = Math.min(chunkSize, MS_EMPLOYEE_COUNT - w * chunkSize);
    if (count <= 0) continue;

    workerPromises.push(
      new Promise<DataSet>((resolve, reject) => {
        const worker = new Worker(WORKER_SCRIPT, {
          eval: true,
          workerData: {
            chunkIndex: w,
            startIndex,
            count,
            seed: MICROSOFT_SEED,
            teamIds,
            managerIds,
            allEmployeeIdRange: { start: 1, end: MS_EMPLOYEE_COUNT }
          }
        });
        worker.on('message', (msg: DataSet) => {
          console.log(
            `    Worker ${w}: ${msg.entities.length} employees, ${msg.relationships.length} relationships`
          );
          resolve(msg);
        });
        worker.on('error', reject);
        worker.on('exit', code => {
          if (code !== 0) reject(new Error(`Worker ${w} exited with code ${code}`));
        });
      })
    );
  }

  const workerResults = await Promise.all(workerPromises);

  // Merge worker results
  for (const result of workerResults) {
    entities.push(...result.entities);
    relationships.push(...result.relationships);
  }

  // Add employee → HQ part_of relationships from main thread (deterministic with seed)
  faker.seed(MICROSOFT_SEED + 100);
  for (let i = 1; i <= MS_EMPLOYEE_COUNT; i++) {
    const empId = `ms-emp-${i}`;
    const pairKey = `${empId}-${msHQ.id}`;
    const reversePairKey = `${msHQ.id}-${empId}`;
    if (!seenPairs.has(pairKey) && !seenPairs.has(reversePairKey)) {
      seenPairs.add(pairKey);
      relationships.push({
        relationshipId: `ms-emp-partof-${i}`,
        predicate: 'part_of',
        sourceEntityId: empId,
        relatedEntityId: msHQ.id
      });
    }
  }

  console.log(`  Total: ${entities.length} entities, ${relationships.length} relationships`);
  return { entities, relationships };
}

// ---------------------------------------------------------------------------
// SQLite Database Creation & Insertion
// ---------------------------------------------------------------------------

async function createAndPopulateDatabase(datasets: DataSet[]): Promise<void> {
  console.log('\n=== Writing to SQLite ===');
  const start = performance.now();

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create tables and indexes
  db.run(`
    CREATE TABLE IF NOT EXISTS entity (
      id TEXT PRIMARY KEY,
      label_normalized TEXT NOT NULL,
      type TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS relationship (
      relationship_id TEXT PRIMARY KEY,
      predicate TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      related_entity_id TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(type);
    CREATE INDEX IF NOT EXISTS idx_entity_label ON entity(label_normalized COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_rel_source ON relationship(source_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_related ON relationship(related_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_predicate ON relationship(predicate);
  `);

  let totalEntities = 0;
  let totalRelationships = 0;

  db.run('BEGIN');
  for (const dataset of datasets) {
    for (const e of dataset.entities) {
      db.run('INSERT OR IGNORE INTO entity (id, label_normalized, type) VALUES (?, ?, ?)', [e.id, e.labelNormalized, e.type]);
    }
    totalEntities += dataset.entities.length;

    for (const r of dataset.relationships) {
      db.run(
        'INSERT OR IGNORE INTO relationship (relationship_id, predicate, source_entity_id, related_entity_id) VALUES (?, ?, ?, ?)',
        [r.relationshipId, r.predicate, r.sourceEntityId, r.relatedEntityId]
      );
    }
    totalRelationships += dataset.relationships.length;
  }
  db.run('COMMIT');

  // Persist to disk
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`  Inserted ${totalEntities} entities, ${totalRelationships} relationships`);
  console.log(`  SQLite write completed in ${elapsed}s`);
  console.log(`  Database: ${DB_PATH}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const totalStart = performance.now();

  console.log('=== Cleanup ===');
  deleteIfExists(DB_PATH);
  deleteIfExists(`${DB_PATH}-wal`);
  deleteIfExists(`${DB_PATH}-shm`);
  deleteIfExists(LEGACY_DUMMY_PATH);
  deleteIfExists(LEGACY_GOOGLE_PATH);

  // Generate all datasets
  const dummyData = generateDummyData();
  const googleData = generateGoogleOrgData();
  const microsoftData = await generateMicrosoftOrgData();

  // Write all to SQLite in a single transaction
  await createAndPopulateDatabase([dummyData, googleData, microsoftData]);

  const totalElapsed = ((performance.now() - totalStart) / 1000).toFixed(2);
  console.log(`\n=== Done in ${totalElapsed}s ===`);
}

// Only run main() on the main thread
if (isMainThread) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
