import fs from 'fs';

// Read existing data
const relCsv = fs.readFileSync('data/spreadline/vis-author2/relations.csv', 'utf8');
const entCsv = fs.readFileSync('data/spreadline/vis-author2/entities.csv', 'utf8');
const citCsv = fs.readFileSync('data/spreadline/vis-author2/citations.csv', 'utf8');

// Remove old synthetic data
const relLines = relCsv.trim().split('\n');
const entLines = entCsv.trim().split('\n');
const citLines = citCsv.trim().split('\n');

const relHeader = relLines[0];
const entHeader = entLines[0];
const citHeader = citLines[0];

const relReal = relLines.slice(1).filter(l => !l.includes('p4') && !l.includes('synth'));
const entReal = entLines.slice(1).filter(l => !l.includes('p4'));
const citReal = citLines.slice(1).filter(l => !l.includes('p4') && !l.includes('synth'));

// Also remove from monthly
const relMCsv = fs.readFileSync('data/spreadline/vis-author2-monthly/relations.csv', 'utf8');
const entMCsv = fs.readFileSync('data/spreadline/vis-author2-monthly/entities.csv', 'utf8');
const citMCsv = fs.readFileSync('data/spreadline/vis-author2-monthly/citations.csv', 'utf8');

const relMReal = relMCsv.trim().split('\n').slice(1).filter(l => !l.includes('p4') && !l.includes('synth'));
const entMReal = entMCsv.trim().split('\n').slice(1).filter(l => !l.includes('p4'));
const citMReal = citMCsv.trim().split('\n').slice(1).filter(l => !l.includes('p4') && !l.includes('synth'));

// --- CORRECT EGO ---
const ego = 'p1199'; // Jeffrey Heer

const rows = relReal.map(l => {
  const parts = l.split(',');
  return { year: parts[0], sourceId: parts[1], targetId: parts[2], id: parts[3], type: parts[4] };
}).filter(r => r.type === 'Co-co-author');

// Per-year BFS to find hop-2 entities for ego p1199
function getHop2ForYear(year) {
  const yearRows = rows.filter(r => r.year === year);
  const hop1 = new Set();
  for (const r of yearRows) {
    if (r.sourceId === ego) hop1.add(r.targetId);
    if (r.targetId === ego) hop1.add(r.sourceId);
  }
  hop1.delete(ego);

  const hop2 = new Set();
  for (const r of yearRows) {
    if (hop1.has(r.sourceId) && !hop1.has(r.targetId) && r.targetId !== ego) hop2.add(r.targetId);
    if (hop1.has(r.targetId) && !hop1.has(r.sourceId) && r.sourceId !== ego) hop2.add(r.sourceId);
  }
  return [...hop2];
}

// Log hop-2 entities per year to verify
for (const y of ['2006', '2008', '2010', '2012', '2014', '2015']) {
  const h2 = getHop2ForYear(y);
  console.log(`Year ${y}: ${h2.length} hop-2 entities for ego ${ego} — ${h2.slice(0, 5).join(', ')}`);
}

// --- Generate synthetic data ---
const newRels = [];
const newEnts = [];
const newCits = [];
let synthId = 90001;
let entityId = 4000;

const names = [
  'Richard May', 'Laura Chen', 'Marcus Webb', 'Elena Vasquez', 'Derek Patterson',
  'Sophia Lin', 'Omar Hassan', 'Yuki Tanaka', 'Priya Sharma', 'Nils Andersen',
  'Rachel Foster', 'Kai Nakamura', 'Isabel Reyes', 'Thomas Muller', 'Amara Okafor',
  'Leo Virtanen', 'Maya Patel', 'Jonas Berg', 'Aaliya Khan', 'Felix Larsson',
  'Clara Dubois', 'Hugo Santos', 'Nadia Petrova', 'Samuel Osei', 'Mia Johansson',
  'Arjun Mehta', 'Rosa Vargas', 'Erik Holm', 'Fatima Al-Rashid', 'Liam OBrien',
  'Aiko Yamamoto', 'Carlos Medina', 'Ingrid Svensson', 'Daniel Kwon', 'Bianca Rossi',
  'Ahmed Youssef', 'Hanna Kowalski', 'Victor Moreau', 'Suki Park', 'Ivan Volkov',
  'Camille Roux', 'Wei Zhang', 'Olga Kuznetsova', 'Rafael Torres', 'Anna Bergman',
  'Tariq Malik', 'Elise Fontaine', 'Ravi Krishnan', 'Leena Virtanen', 'Oscar Nilsson',
  'Vera Popov', 'Bruno Costa', 'Yara Nasser', 'Henrik Dahl', 'Marta Gonzalez',
  'Kenji Ito', 'Petra Novak', 'Andre Leclerc', 'Zara Ahmed', 'Tomas Eriksson',
  'Lucia Ferreira', 'Anton Becker', 'Dina Haddad', 'Mikael Lund', 'Amira Salim',
  'Paulo Alves', 'Kristina Ivanova', 'Gabriel Silva', 'Nour El-Din', 'Astrid Hansen',
  'Javier Ruiz', 'Simone Bianchi', 'Farhan Malik', 'Elsa Magnusson', 'Dmitri Sokolov',
  'Lina Cheng', 'Oscar Peralta', 'Miriam Goldstein', 'Sergei Kozlov', 'Alina Dragomir',
  'Kofi Asante', 'Julia Werner', 'Hassan Ibrahim', 'Freja Andersen', 'Marco Bellini',
  'Anya Romanova', 'David Kim-Park'
];

const affiliations = [
  'MIT, USA', 'Stanford University, USA', 'University of Tokyo, Japan',
  'ETH Zurich, Switzerland', 'University of Oxford, UK', 'Tsinghua University, China',
  'University of Toronto, Canada', 'TU Munich, Germany', 'Seoul National University, Korea',
  'University of Melbourne, Australia'
];

// Hop 3: entities connected to hop-2 entities of p1199
const hop3Config = [
  { year: '2006', count: 4 },
  { year: '2008', count: 5 },
  { year: '2010', count: 50 },
  { year: '2011', count: 8 },
  { year: '2012', count: 6 },
  { year: '2013', count: 5 },
  { year: '2014', count: 5 },
  { year: '2015', count: 4 },
];

let nameIdx = 0;
for (const { year, count } of hop3Config) {
  const hop2Entities = getHop2ForYear(year);
  if (hop2Entities.length === 0) {
    console.log(`WARNING: No hop-2 entities for year ${year}, skipping`);
    continue;
  }
  console.log(`Hop-3 for ${year}: connecting ${count} entities to ${hop2Entities.length} hop-2 entities`);

  for (let i = 0; i < count; i++) {
    const pid = `p${entityId++}`;
    const name = names[nameIdx % names.length];
    nameIdx++;
    const affil = affiliations[i % affiliations.length];
    const hop2Target = hop2Entities[i % hop2Entities.length];
    const citCount = 5 + Math.floor(Math.random() * 40);
    const paperId = `synth${synthId++}`;

    newRels.push(`${year},${hop2Target},${pid},${paperId},Co-co-author,${citCount},1`);
    newEnts.push(`${pid},${name},${year},${citCount},${affil}`);
    newCits.push(`${paperId},${year},${pid},${citCount}`);
  }
}

// Hop 4: connected to hop-3 entities
const hop3ByYear = {};
for (const rel of newRels) {
  const parts = rel.split(',');
  const year = parts[0];
  const targetId = parts[2];
  if (!hop3ByYear[year]) hop3ByYear[year] = [];
  hop3ByYear[year].push(targetId);
}

const hop4Config = [
  { year: '2010', count: 3 },
  { year: '2012', count: 3 },
  { year: '2014', count: 3 },
];

for (const { year, count } of hop4Config) {
  const hop3Entities = hop3ByYear[year] || [];
  if (hop3Entities.length === 0) continue;
  for (let i = 0; i < count; i++) {
    const pid = `p${entityId++}`;
    const name = names[nameIdx % names.length];
    nameIdx++;
    const affil = affiliations[i % affiliations.length];
    const hop3Target = hop3Entities[i % hop3Entities.length];
    const citCount = 3 + Math.floor(Math.random() * 20);
    const paperId = `synth${synthId++}`;

    newRels.push(`${year},${hop3Target},${pid},${paperId},Co-co-author,${citCount},1`);
    newEnts.push(`${pid},${name},${year},${citCount},${affil}`);
    newCits.push(`${paperId},${year},${pid},${citCount}`);
  }
}

// Hop 5: connected to hop-4 entities
const hop4Rels = newRels.filter(r => {
  const parts = r.split(',');
  const srcId = parts[1];
  return Object.values(hop3ByYear).flat().includes(srcId);
});
const hop4ByYear = {};
for (const rel of hop4Rels) {
  const parts = rel.split(',');
  if (!hop4ByYear[parts[0]]) hop4ByYear[parts[0]] = [];
  hop4ByYear[parts[0]].push(parts[2]);
}

const hop5Config = [
  { year: '2010', count: 2 },
  { year: '2012', count: 2 },
  { year: '2014', count: 2 },
];

for (const { year, count } of hop5Config) {
  const hop4Entities = hop4ByYear[year] || [];
  if (hop4Entities.length === 0) continue;
  for (let i = 0; i < count; i++) {
    const pid = `p${entityId++}`;
    const name = names[nameIdx % names.length];
    nameIdx++;
    const affil = affiliations[i % affiliations.length];
    const hop4Target = hop4Entities[i % hop4Entities.length];
    const citCount = 2 + Math.floor(Math.random() * 15);
    const paperId = `synth${synthId++}`;

    newRels.push(`${year},${hop4Target},${pid},${paperId},Co-co-author,${citCount},1`);
    newEnts.push(`${pid},${name},${year},${citCount},${affil}`);
    newCits.push(`${paperId},${year},${pid},${citCount}`);
  }
}

console.log(`\nGenerated: ${newRels.length} relations, ${newEnts.length} entities, ${newCits.length} citations`);
console.log(`Entity IDs: p4000 to p${entityId - 1}`);

// Write yearly data
fs.writeFileSync('data/spreadline/vis-author2/relations.csv',
  [relHeader, ...relReal, ...newRels].join('\n') + '\n');
fs.writeFileSync('data/spreadline/vis-author2/entities.csv',
  [entHeader, ...entReal, ...newEnts].join('\n') + '\n');
fs.writeFileSync('data/spreadline/vis-author2/citations.csv',
  [citHeader, ...citReal, ...newCits].join('\n') + '\n');

// Write monthly data (YYYY-06 format)
const monthlyRels = newRels.map(l => {
  const parts = l.split(',');
  parts[0] = parts[0] + '-06';
  return parts.join(',');
});
const monthlyEnts = newEnts.map(l => {
  const parts = l.split(',');
  parts[2] = parts[2] + '-06'; // entities.csv: id,name,year,...
  return parts.join(',');
});
const monthlyCits = newCits.map(l => {
  const parts = l.split(',');
  parts[1] = parts[1] + '-06';
  return parts.join(',');
});

fs.writeFileSync('data/spreadline/vis-author2-monthly/relations.csv',
  [relHeader, ...relMReal, ...monthlyRels].join('\n') + '\n');
fs.writeFileSync('data/spreadline/vis-author2-monthly/entities.csv',
  [entHeader, ...entMReal, ...monthlyEnts].join('\n') + '\n');
fs.writeFileSync('data/spreadline/vis-author2-monthly/citations.csv',
  [citHeader, ...citMReal, ...monthlyCits].join('\n') + '\n');

console.log('Done! Yearly and monthly data written.');
