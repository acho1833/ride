/**
 * Generate monthly spreadline data from yearly vis-author2 CSVs.
 *
 * Strategy:
 * 1. Read yearly relations, entities, citations from data/spreadline/vis-author2/
 * 2. For each relation, assign it to a random month within its year (grouped by paper ID)
 * 3. Generate 10-15x synthetic additional relations to fill months densely
 * 4. Output to data/spreadline/vis-author2-monthly/
 *
 * Uses seeded faker for reproducibility.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import pkg from 'papaparse';
import { faker } from '@faker-js/faker';

const { parse, unparse } = pkg;

// ── Configuration ────────────────────────────────────────────────────
const SEED = 42;
const MULTIPLIER = 24;
const EGO_INTERNAL_EXTRA = 8; // Extra synthetic relations per ego-internal pair per year
const EGO_ID = 'p1199';
const SRC = 'data/spreadline/vis-author2';
const DST = 'data/spreadline/vis-author2-monthly';

// ── Helpers ──────────────────────────────────────────────────────────

faker.seed(SEED);

function loadCSV<T>(file: string): T[] {
  return parse<T>(readFileSync(`${SRC}/${file}`, 'utf-8'), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  }).data;
}

function padMonth(m: number): string {
  return String(m).padStart(2, '0');
}

function randomMonth(): number {
  return faker.number.int({ min: 1, max: 12 });
}

function generatePaperId(): string {
  return `syn_${faker.string.alphanumeric(24)}`;
}

// ── Main ─────────────────────────────────────────────────────────────

interface RelationRow {
  year: number | string;
  sourceId: string;
  targetId: string;
  id: string;
  type: string;
  citationcount: number;
  count: number;
}

interface EntityRow {
  id: string;
  name: string;
  year: number | string;
  citationcount: number;
  affiliation: string;
}

interface CitationRow {
  entityId: string;
  year: number | string;
  citationcount: number;
  affiliation: string;
  paperID: string;
}

const relations = loadCSV<RelationRow>('relations.csv');
const entities = loadCSV<EntityRow>('entities.csv');
const citations = loadCSV<CitationRow>('citations.csv');

// Step 1: Assign each paper to a random month (seeded)
const paperMonthMap = new Map<string, number>();
for (const r of relations) {
  if (!paperMonthMap.has(r.id)) {
    paperMonthMap.set(r.id, randomMonth());
  }
}

// Step 2: Convert original relations to monthly
const monthlyRelations: RelationRow[] = [];
for (const r of relations) {
  const month = paperMonthMap.get(r.id)!;
  monthlyRelations.push({
    ...r,
    year: `${r.year}-${padMonth(month)}`
  });
}

// Step 3: Generate synthetic relations (MULTIPLIER x)
const relationsByYear = new Map<number, RelationRow[]>();
for (const r of relations) {
  const year = Number(r.year);
  if (!relationsByYear.has(year)) relationsByYear.set(year, []);
  relationsByYear.get(year)!.push(r);
}

for (const [year, yearRelations] of relationsByYear) {
  const pairs = new Map<string, { sourceId: string; targetId: string; type: string }>();
  for (const r of yearRelations) {
    const key = `${r.sourceId}::${r.targetId}`;
    if (!pairs.has(key)) {
      pairs.set(key, { sourceId: r.sourceId, targetId: r.targetId, type: r.type });
    }
  }

  for (const pair of pairs.values()) {
    for (let i = 0; i < MULTIPLIER; i++) {
      const month = randomMonth();
      const paperId = generatePaperId();
      const citCount = faker.number.int({ min: 0, max: 200 });
      monthlyRelations.push({
        year: `${year}-${padMonth(month)}`,
        sourceId: pair.sourceId,
        targetId: pair.targetId,
        id: paperId,
        type: pair.type,
        citationcount: citCount,
        count: 1
      });
    }
  }
}

// Step 3b: Boost ego-internal relations
// Find ego's collaborators who share affiliations (internal) and add extra relations
function remapAffiliation(aff: string): string {
  if (!aff) return '';
  if (aff.includes('Berkeley')) return 'Berkeley';
  if (aff.includes('PARC') || aff.includes('Palo Alto') || aff.includes('Xerox')) return 'PARC';
  if (aff.includes('Stanford')) return 'Stanford';
  if (aff.includes('Washington')) return 'Washington';
  return aff;
}

// Build ego affiliation per year
const egoAffByYear = new Map<number, string>();
for (const e of entities) {
  if (e.id === EGO_ID) {
    const year = Number(e.year);
    if (!egoAffByYear.has(year)) {
      egoAffByYear.set(year, remapAffiliation(e.affiliation));
    }
  }
}

// Find direct ego collaborators per year
const egoCollabsByYear = new Map<number, Set<string>>();
for (const r of relations) {
  const year = Number(r.year);
  if (r.sourceId === EGO_ID || r.targetId === EGO_ID) {
    const other = r.sourceId === EGO_ID ? r.targetId : r.sourceId;
    if (!egoCollabsByYear.has(year)) egoCollabsByYear.set(year, new Set());
    egoCollabsByYear.get(year)!.add(other);
  }
}

// For each year, find internal collaborators and generate extra relations
for (const [year, collabs] of egoCollabsByYear) {
  const egoAff = egoAffByYear.get(year);
  if (!egoAff) continue;

  for (const collab of collabs) {
    // Check if collaborator shares affiliation with ego in this year
    const collabEntries = entities.filter(e => e.id === collab && Number(e.year) === year);
    const isInternal = collabEntries.some(e => remapAffiliation(e.affiliation) === egoAff);
    if (!isInternal) continue;

    // Generate extra synthetic relations for this internal pair
    for (let i = 0; i < EGO_INTERNAL_EXTRA; i++) {
      const month = randomMonth();
      const paperId = generatePaperId();
      monthlyRelations.push({
        year: `${year}-${padMonth(month)}`,
        sourceId: collab,
        targetId: EGO_ID,
        id: paperId,
        type: 'Co-author',
        citationcount: faker.number.int({ min: 5, max: 300 }),
        count: 1
      });
    }
  }
}

// Step 4: Convert entities to monthly (with year-correct affiliations)
const entityMonths = new Map<string, Set<string>>();
for (const r of monthlyRelations) {
  const ym = String(r.year);
  if (!entityMonths.has(r.sourceId)) entityMonths.set(r.sourceId, new Set());
  if (!entityMonths.has(r.targetId)) entityMonths.set(r.targetId, new Set());
  entityMonths.get(r.sourceId)!.add(ym);
  entityMonths.get(r.targetId)!.add(ym);
}

// Build year-specific entity lookup: entityId -> year -> EntityRow
const entityByIdYear = new Map<string, Map<number, EntityRow>>();
const entityById = new Map<string, EntityRow>();
for (const e of entities) {
  const year = Number(e.year);
  if (!entityByIdYear.has(e.id)) entityByIdYear.set(e.id, new Map());
  if (!entityByIdYear.get(e.id)!.has(year)) {
    entityByIdYear.get(e.id)!.set(year, e);
  }
  if (!entityById.has(e.id)) entityById.set(e.id, e);
}

function getEntityForMonth(entityId: string, ym: string): EntityRow | undefined {
  const yearNum = Number(ym.split('-')[0]);
  const yearMap = entityByIdYear.get(entityId);
  if (!yearMap) return entityById.get(entityId);
  // Use the exact year if available, otherwise nearest year
  if (yearMap.has(yearNum)) return yearMap.get(yearNum);
  const years = [...yearMap.keys()].sort((a, b) => Math.abs(a - yearNum) - Math.abs(b - yearNum));
  return years.length > 0 ? yearMap.get(years[0]) : entityById.get(entityId);
}

const monthlyEntities: EntityRow[] = [];
for (const [entityId, months] of entityMonths) {
  for (const ym of months) {
    const base = getEntityForMonth(entityId, ym);
    if (!base) continue;
    monthlyEntities.push({
      ...base,
      year: ym
    });
  }
}

// Step 5: Convert citations to monthly
const monthlyCitations: CitationRow[] = [];
for (const c of citations) {
  const paperId = String(c.paperID);
  const month = paperMonthMap.get(paperId);
  if (month !== undefined) {
    monthlyCitations.push({
      ...c,
      year: `${c.year}-${padMonth(month)}`
    });
  }
}

for (const r of monthlyRelations) {
  if (String(r.id).startsWith('syn_')) {
    const entity = entityById.get(r.sourceId) || entityById.get(r.targetId);
    monthlyCitations.push({
      entityId: r.sourceId,
      year: String(r.year),
      citationcount: r.citationcount,
      affiliation: entity?.affiliation ?? '',
      paperID: r.id
    });
  }
}

// Step 6: Write output
mkdirSync(DST, { recursive: true });
writeFileSync(`${DST}/relations.csv`, unparse(monthlyRelations));
writeFileSync(`${DST}/entities.csv`, unparse(monthlyEntities));
writeFileSync(`${DST}/citations.csv`, unparse(monthlyCitations));

const uniqueMonths = new Set(monthlyRelations.map(r => String(r.year)));
console.log(`Generated monthly data:`);
console.log(`  Relations: ${monthlyRelations.length} (from ${relations.length} yearly)`);
console.log(`  Entities:  ${monthlyEntities.length} (from ${entities.length} yearly)`);
console.log(`  Citations: ${monthlyCitations.length} (from ${citations.length} yearly)`);
console.log(`  Unique months: ${uniqueMonths.size}`);
console.log(`  Output: ${DST}/`);
