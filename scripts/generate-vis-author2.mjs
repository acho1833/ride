import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import pkg from 'papaparse';
const { parse, unparse } = pkg;

const SRC = 'data/spreadline/vis-author';
const DST = 'data/spreadline/vis-author2';
mkdirSync(DST, { recursive: true });

function loadCSV(file) {
  return parse(readFileSync(`${SRC}/${file}`, 'utf-8'), {
    header: true, dynamicTyping: true, skipEmptyLines: true
  }).data;
}

const entities = loadCSV('entities.csv');
const relations = loadCSV('relations.csv');
const citations = loadCSV('citations.csv');

// Build name -> id map from unique names across all CSVs
const allNames = new Set();
entities.forEach(r => allNames.add(r.name));
relations.forEach(r => { allNames.add(r.source); allNames.add(r.target); });
citations.forEach(r => allNames.add(r.name));

const nameToId = {};
let counter = 1;
for (const name of [...allNames].sort()) {
  nameToId[name] = `p${String(counter).padStart(4, '0')}`;
  counter++;
}

// entities.csv: add id column
const newEntities = entities.map(r => ({
  id: nameToId[r.name],
  name: r.name,
  year: r.year,
  citationcount: r.citationcount,
  affiliation: r.affiliation
}));

// relations.csv: replace source/target with sourceId/targetId
const newRelations = relations.map(r => ({
  year: r.year,
  sourceId: nameToId[r.source],
  targetId: nameToId[r.target],
  id: r.id,
  type: r.type,
  citationcount: r.citationcount,
  count: r.count
}));

// citations.csv: replace name with entityId
const newCitations = citations.map(r => ({
  entityId: nameToId[r.name],
  year: r.year,
  citationcount: r.citationcount,
  affiliation: r.affiliation,
  paperID: r.paperID
}));

writeFileSync(`${DST}/entities.csv`, unparse(newEntities));
writeFileSync(`${DST}/relations.csv`, unparse(newRelations));
writeFileSync(`${DST}/citations.csv`, unparse(newCitations));

console.log(`Generated ${Object.keys(nameToId).length} unique person IDs`);
console.log(`entities.csv: ${newEntities.length} rows`);
console.log(`relations.csv: ${newRelations.length} rows`);
console.log(`citations.csv: ${newCitations.length} rows`);
