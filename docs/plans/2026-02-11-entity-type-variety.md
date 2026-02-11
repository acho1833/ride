# Entity Type Variety for Dashboard Showcase

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Device and Event entity types with Phone, Email, Document, and Account to create 8 people-centric entity types that showcase all dashboard analytics panels.

**Architecture:** Update the data generation script to produce 8 entity types (Person, Organization, Location, Vehicle, Phone, Email, Document, Account) with meaningful cross-type relationships. Update the icon config and constants to support the new types. The entity search filter is already dynamic (queries DB), so it auto-updates.

**Tech Stack:** TypeScript, SQLite (sql.js), faker.js, Remix Icons

---

### Task 1: Update Entity Icon Config

**Files:**
- Modify: `src/const.ts:54-64`

**Step 1: Update ENTITY_ICON_CONFIG**

Replace Device and Event with Phone, Email, Document, Account:

```typescript
export const ENTITY_ICON_CONFIG: Record<string, { cssClass: string; unicode: string }> = {
  Person: { cssClass: 'ri-user-line', unicode: 'F264' },
  Organization: { cssClass: 'ri-building-2-line', unicode: 'EB09' },
  Vehicle: { cssClass: 'ri-car-line', unicode: 'EB3A' },
  Location: { cssClass: 'ri-map-pin-line', unicode: 'EF08' },
  Phone: { cssClass: 'ri-phone-line', unicode: 'F036' },
  Email: { cssClass: 'ri-mail-line', unicode: 'EEFE' },
  Document: { cssClass: 'ri-file-text-line', unicode: 'ED2A' },
  Account: { cssClass: 'ri-bank-card-line', unicode: 'EA8C' }
};
```

> **Note:** Unicode values must be verified against the Remix Icon font file bundled in the project. Check the existing working unicodes (Person: F264, Organization: EB09) as reference, then look up the correct unicodes for the new icon classes.

**Step 2: Verify icon unicodes**

Run the app and check that all 8 entity type icons render correctly in both:
- CSS font icons (entity cards, search results)
- SVG symbols (graph nodes)

If any icon shows as blank/missing, look up the correct unicode in the Remix Icon cheatsheet.

**Step 3: Commit**

```bash
git add src/const.ts
git commit -m "feat: update entity icon config for new entity types"
```

---

### Task 2: Update MOCK_ENTITY_TYPES Constant

**Files:**
- Modify: `src/lib/mock-data/entities.ts:2`

**Step 1: Update the constant**

```typescript
export const MOCK_ENTITY_TYPES = ['Person', 'Organization', 'Vehicle', 'Location', 'Phone', 'Email', 'Document', 'Account'] as const;
```

**Step 2: Update RELATIONSHIP_PREDICATES**

Replace `attends` and `operates` with predicates relevant to new types:

```typescript
export const RELATIONSHIP_PREDICATES = [
  'works_for',
  'knows',
  'manages',
  'reports_to',
  'collaborates_with',
  'part_of',
  'owns',
  'located_at',
  'contacted_via',
  'authored'
] as const;
```

**Step 3: Commit**

```bash
git add src/lib/mock-data/entities.ts
git commit -m "feat: update mock entity types and predicates"
```

---

### Task 3: Update Dummy Data Generation (Dataset 1)

**Files:**
- Modify: `scripts/generate-dummy-data.ts` — `generateDummyData()` function (lines 125-360)

**Step 1: Replace Device/Event entity generation with Phone/Email/Document/Account**

In the `ENTITY_COUNTS` object (line 136), replace:
```typescript
// OLD
regularDevice: 20,
regularEvent: 20

// NEW
regularPhone: 40,
regularEmail: 50,
regularDocument: 30,
regularAccount: 25
```

Replace the Device and Event entity generation loops (lines 239-255) with:

```typescript
// Regular Phone entities
for (let i = 1; i <= ENTITY_COUNTS.regularPhone; i++) {
  entities.push({
    id: `phone-${i}`,
    labelNormalized: faker.phone.number({ style: 'national' }),
    type: 'Phone'
  });
}

// Regular Email entities
for (let i = 1; i <= ENTITY_COUNTS.regularEmail; i++) {
  entities.push({
    id: `email-${i}`,
    labelNormalized: faker.internet.email(),
    type: 'Email'
  });
}

// Regular Document entities
for (let i = 1; i <= ENTITY_COUNTS.regularDocument; i++) {
  const docType = faker.helpers.arrayElement(['Report', 'Contract', 'Invoice', 'Memo', 'Filing']);
  entities.push({
    id: `document-${i}`,
    labelNormalized: `${docType} - ${faker.company.buzzNoun()} ${faker.string.alphanumeric(6).toUpperCase()}`,
    type: 'Document'
  });
}

// Regular Account entities
for (let i = 1; i <= ENTITY_COUNTS.regularAccount; i++) {
  const acctType = faker.helpers.arrayElement(['Checking', 'Savings', 'Brokerage', 'Trust', 'Corporate']);
  entities.push({
    id: `account-${i}`,
    labelNormalized: `${acctType} ****${faker.string.numeric(4)}`,
    type: 'Account'
  });
}
```

**Step 2: Update the random relationships section**

The existing random relationship loop (lines 348-356) connects regular entities to each other randomly. No changes needed here — it will automatically include the new entity types since it filters on regular entities.

**Step 3: Commit**

```bash
git add scripts/generate-dummy-data.ts
git commit -m "feat: update dummy dataset with new entity types"
```

---

### Task 4: Update Google Org Data Generation (Dataset 2)

**Files:**
- Modify: `scripts/generate-dummy-data.ts` — `generateGoogleOrgData()` function (lines 366-583)

**Step 1: Add new entity types to Google dataset**

After the contractors section (line 499), add Phone, Email, Document, and Account entities:

```typescript
// Phones (100 - contact numbers for employees/executives)
const phones: EntityRow[] = [];
for (let i = 0; i < 100; i++) {
  const e: EntityRow = {
    id: `google-phone-${i + 1}`,
    labelNormalized: faker.phone.number({ style: 'national' }),
    type: 'Phone'
  };
  entities.push(e);
  phones.push(e);
}

// Emails (200 - corporate email addresses)
const emails: EntityRow[] = [];
for (let i = 0; i < 200; i++) {
  const e: EntityRow = {
    id: `google-email-${i + 1}`,
    labelNormalized: faker.internet.email({ provider: 'google.com' }),
    type: 'Email'
  };
  entities.push(e);
  emails.push(e);
}

// Documents (80 - internal docs, contracts, reports)
const documents: EntityRow[] = [];
for (let i = 0; i < 80; i++) {
  const docType = faker.helpers.arrayElement(['Report', 'Contract', 'Patent', 'Whitepaper', 'Policy']);
  const e: EntityRow = {
    id: `google-doc-${i + 1}`,
    labelNormalized: `${docType} - ${faker.company.buzzNoun()} ${faker.string.alphanumeric(6).toUpperCase()}`,
    type: 'Document'
  };
  entities.push(e);
  documents.push(e);
}

// Accounts (50 - corporate financial accounts)
const accounts: EntityRow[] = [];
for (let i = 0; i < 50; i++) {
  const acctType = faker.helpers.arrayElement(['Corporate', 'Operating', 'Revenue', 'Investment', 'Escrow']);
  const e: EntityRow = {
    id: `google-acct-${i + 1}`,
    labelNormalized: `${acctType} ****${faker.string.numeric(4)}`,
    type: 'Account'
  };
  entities.push(e);
  accounts.push(e);
}
```

**Step 2: Add relationships for new entity types**

After the Contractors relationships section (line 573), add:

```typescript
// Phones → owned by executives, directors, managers (person → owns → phone)
for (const phone of phones) {
  const owner = faker.helpers.arrayElement([...executives, ...directors, ...managers]);
  addRel(owner.id, phone.id, 'owns');
}

// Emails → owned by employees, managers, executives (person → owns → email)
for (const email of emails) {
  const owner = faker.helpers.arrayElement([...executives, ...managers, ...employees.slice(0, 200)]);
  addRel(owner.id, email.id, 'owns');
}
// Some emails contacted_via by other people
for (const email of emails.slice(0, 100)) {
  const contactor = faker.helpers.arrayElement([...managers, ...employees.slice(0, 200)]);
  addRel(contactor.id, email.id, 'contacted_via');
}

// Documents → authored by executives/directors, signed by managers
for (const doc of documents) {
  const author = faker.helpers.arrayElement([...executives, ...directors]);
  addRel(author.id, doc.id, 'authored');
  const signer = faker.helpers.arrayElement(managers);
  addRel(signer.id, doc.id, 'part_of');
}

// Accounts → owned by organization divisions, managed by executives
for (const acct of accounts) {
  const div = faker.helpers.arrayElement(divisions);
  addRel(div.id, acct.id, 'owns');
  const exec = faker.helpers.arrayElement(executives);
  addRel(exec.id, acct.id, 'manages');
}
```

**Step 3: Commit**

```bash
git add scripts/generate-dummy-data.ts
git commit -m "feat: add new entity types to Google dataset"
```

---

### Task 5: Update Microsoft Org Data Generation (Dataset 3)

**Files:**
- Modify: `scripts/generate-dummy-data.ts` — `generateMicrosoftOrgData()` function (lines 636-1010)

**Step 1: Replace Device/Event entity blocks with Phone/Email/Document/Account**

Replace the Device block (lines 793-803) and Event block (lines 805-814) with:

```typescript
// Phones (300)
const phones: EntityRow[] = [];
for (let i = 0; i < 300; i++) {
  const e: EntityRow = {
    id: `ms-phone-${i + 1}`,
    labelNormalized: faker.phone.number({ style: 'national' }),
    type: 'Phone'
  };
  entities.push(e);
  phones.push(e);
}

// Emails (500)
const emails: EntityRow[] = [];
for (let i = 0; i < 500; i++) {
  const e: EntityRow = {
    id: `ms-email-${i + 1}`,
    labelNormalized: faker.internet.email({ provider: 'microsoft.com' }),
    type: 'Email'
  };
  entities.push(e);
  emails.push(e);
}

// Documents (200)
const documents: EntityRow[] = [];
for (let i = 0; i < 200; i++) {
  const docType = faker.helpers.arrayElement(['Report', 'Contract', 'Patent', 'Spec', 'Memo']);
  const e: EntityRow = {
    id: `ms-doc-${i + 1}`,
    labelNormalized: `${docType} - ${faker.company.buzzNoun()} ${faker.string.alphanumeric(6).toUpperCase()}`,
    type: 'Document'
  };
  entities.push(e);
  documents.push(e);
}

// Accounts (150)
const accounts: EntityRow[] = [];
for (let i = 0; i < 150; i++) {
  const acctType = faker.helpers.arrayElement(['Corporate', 'Operating', 'Revenue', 'Investment', 'Trust']);
  const e: EntityRow = {
    id: `ms-acct-${i + 1}`,
    labelNormalized: `${acctType} ****${faker.string.numeric(4)}`,
    type: 'Account'
  };
  entities.push(e);
  accounts.push(e);
}
```

**Step 2: Replace Device/Event relationship blocks**

Replace the Device relationships block (lines 909-914) and Event relationships block (lines 916-929) with:

```typescript
// Phones → owned by managers, executives (person → owns → phone)
for (const phone of phones) {
  const owner = faker.helpers.arrayElement([...executives, ...managers.slice(0, 300)]);
  addRel(owner.id, phone.id, 'owns');
}

// Emails → owned by executives/managers/contractors (person → owns → email)
for (const email of emails) {
  const owner = faker.helpers.arrayElement([...executives, ...managers.slice(0, 500), ...contractors.slice(0, 200)]);
  addRel(owner.id, email.id, 'owns');
}
// Some emails contacted_via
for (const email of emails.slice(0, 250)) {
  const contactor = faker.helpers.arrayElement([...managers.slice(0, 500)]);
  addRel(contactor.id, email.id, 'contacted_via');
}

// Documents → authored by directors/executives
for (const doc of documents) {
  const author = faker.helpers.arrayElement([...executives, ...directors]);
  addRel(author.id, doc.id, 'authored');
  const reviewer = faker.helpers.arrayElement(managers);
  addRel(reviewer.id, doc.id, 'part_of');
}

// Accounts → owned by divisions, managed by executives
for (const acct of accounts) {
  const div = faker.helpers.arrayElement(divisions);
  addRel(div.id, acct.id, 'owns');
  const exec = faker.helpers.arrayElement(executives);
  addRel(exec.id, acct.id, 'manages');
}
```

**Step 3: Commit**

```bash
git add scripts/generate-dummy-data.ts
git commit -m "feat: update Microsoft dataset with new entity types"
```

---

### Task 6: Update RELATIONSHIP_PREDICATES in Script

**Files:**
- Modify: `scripts/generate-dummy-data.ts:19-30`

**Step 1: Update the inlined predicates constant**

```typescript
const RELATIONSHIP_PREDICATES = [
  'works_for',
  'knows',
  'manages',
  'reports_to',
  'collaborates_with',
  'part_of',
  'owns',
  'located_at',
  'contacted_via',
  'authored'
] as const;
```

**Step 2: Commit**

```bash
git add scripts/generate-dummy-data.ts
git commit -m "feat: update relationship predicates in generation script"
```

---

### Task 7: Regenerate Data and Verify

**Step 1: Run the generation script**

```bash
npm run test:generate-data
```

Expected: Script completes successfully, generating ~20,000+ entities across 3 datasets.

**Step 2: Verify entity types in database**

```bash
npx tsx -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('src/lib/mock-data/mock.db'));
  const types = db.exec('SELECT type, COUNT(*) as cnt FROM entity GROUP BY type ORDER BY cnt DESC');
  console.table(types[0].values);
  db.close();
}
main();
"
```

Expected: 8 entity types with reasonable counts. Person should be largest, followed by Organization, then the rest.

**Step 3: Verify indexes cover query patterns**

The existing indexes already cover the needed queries:
- `idx_entity_type ON entity(type)` — used by `getEntityTypes()` and type filter
- `idx_entity_label ON entity(label_normalized COLLATE NOCASE)` — used by name search
- `idx_rel_source ON relationship(source_entity_id)` — used by `getEntityById()` related entities
- `idx_rel_related ON relationship(related_entity_id)` — used by `getEntityById()` related entities
- `idx_rel_predicate ON relationship(predicate)` — used by predicate filters

No new indexes needed — the existing schema handles all current SQL queries.

**Step 4: Commit (if any fixes were needed)**

---

### Task 8: Run Tests and Build

**Step 1: Run tests**

```bash
npm test
```

Expected: All tests pass. The dashboard utils tests use their own inline test data (not the generated DB), so they should be unaffected.

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: regenerate mock data with 8 entity types for dashboard showcase"
```
