'use client';

import MermaidDiagram from './mermaid-diagram';
import { Collapsible, Tabs, Step, Callout } from './interactive';

export default function SpreadlineReviewPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-5xl p-8">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">SpreadLine Technical Design Document</h1>
          <p className="text-muted-foreground text-lg">
            A complete, self-contained guide for understanding and migrating the SpreadLine ego-network visualization system.
          </p>
          <div className="bg-muted mt-4 inline-block rounded-lg px-4 py-2 text-sm">
            Audience: Developers migrating SpreadLine to another Next.js + TypeScript project
          </div>
        </header>

        {/* ── Table of Contents ───────────────────────────────────── */}
        <nav className="bg-card mb-12 rounded-lg p-6">
          <h2 className="mb-4 text-xl font-semibold">Table of Contents</h2>
          <ol className="text-muted-foreground grid gap-2 md:grid-cols-2">
            {[
              ['what-is-spreadline', '1. What is SpreadLine?'],
              ['glossary', '2. Glossary'],
              ['data-model', '3. Data Model'],
              ['server-architecture', '4. Server-Side Architecture'],
              ['api-specification', '5. API Specification'],
              ['client-architecture', '6. Client-Side Architecture'],
              ['layout-engine', '7. SpreadLine Layout Engine'],
              ['d3-visualization', '8. D3 Visualization Layer'],
              ['configuration', '9. Configuration & Constants'],
              ['directory-structure', '10. Directory Structure'],
              ['data-flow', '11. Data Flow'],
              ['migration-guide', '12. Migration Guide (Step-by-Step)'],
              ['faq', '13. FAQ']
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-primary transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 1: What is SpreadLine?                           */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="what-is-spreadline" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">1. What is SpreadLine?</h2>

          <div className="bg-card space-y-4 rounded-lg p-6">
            <p className="text-muted-foreground">
              <strong>SpreadLine</strong> is an interactive visualization system for exploring <em>ego-centric dynamic networks</em>. Think
              of it as a tool that answers the question:{' '}
              <em>
                &quot;Given one person (the ego), who did they interact with, when, and how are those people connected to each other?&quot;
              </em>
            </p>

            <MermaidDiagram
              chart={`
graph LR
  subgraph "The Big Picture"
    A["Raw CSV Data<br/>(relations, entities)"] --> B["Server<br/>(BFS + Grouping)"]
    B --> C["API Response<br/>(SpreadlineRawDataResponse)"]
    C --> D["Client Transforms"]
    D --> E["Force Graph<br/>(D3 nodes + links)"]
    D --> F["Storyline Chart<br/>(SpreadLine layout)"]
    D --> G["Network Timeline<br/>(dots + lines)"]
  end
              `}
              caption="High-level system overview: CSV data flows through the server, gets transformed on the client, and renders in three visualization modes"
            />

            <h3 className="mt-4 text-lg font-semibold">The Three Core Concepts</h3>
            <div className="mt-2 grid gap-4 md:grid-cols-3">
              <div className="bg-muted/50 rounded-lg border p-4">
                <h4 className="text-primary mb-2 font-semibold">Ego-centric</h4>
                <p className="text-muted-foreground text-sm">
                  Everything revolves around one central entity (the &quot;ego&quot;). All other entities are defined by their relationship
                  distance from the ego (1 hop = direct, 2 hops = friend-of-a-friend).
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg border p-4">
                <h4 className="text-primary mb-2 font-semibold">Dynamic</h4>
                <p className="text-muted-foreground text-sm">
                  The network changes over time. Entities appear, disappear, and their connections shift across time periods (years or
                  months).
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg border p-4">
                <h4 className="text-primary mb-2 font-semibold">Network</h4>
                <p className="text-muted-foreground text-sm">
                  Entities are connected via relationships (e.g., co-authorship). Each relationship has a time, a source, a target, and a
                  weight.
                </p>
              </div>
            </div>

            <h3 className="mt-6 text-lg font-semibold">What the User Sees</h3>
            <MermaidDiagram
              chart={`
graph TB
  subgraph "UI Layout (Resizable Split)"
    direction TB
    subgraph "Top Panel"
      G["Force-Directed Graph<br/>D3 node-link diagram<br/>Ego centered, nodes by hop distance"]
    end
    subgraph "Bottom Panel (tabbed)"
      S["Spreadline Chart<br/>Storyline visualization<br/>Lines weave through time columns"]
      N["Network Timeline<br/>Dot-and-line per entity<br/>Colored by frequency"]
    end
  end
  G -.-> |"Time scrubber<br/>controls both"| S
  G -.-> |"Pin entities<br/>highlights across"| N
              `}
              caption="The UI has two resizable panels. Interactions in one panel (like pinning an entity) update the other."
            />

            <h3 className="mt-4 text-lg font-semibold">Example Dataset</h3>
            <p className="text-muted-foreground">
              The current implementation ships with a demo dataset: the <strong>Jeffrey Heer co-authorship network</strong>. Jeffrey Heer
              (ID: <code className="bg-muted rounded px-1">p1199</code>) is the ego. Other entities are researchers he has co-authored
              papers with. Relationships are co-authorships. Time ranges from 2002 to 2022, available in both yearly and monthly
              granularity.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 2: Glossary                                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="glossary" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">2. Glossary</h2>
          <div className="bg-card rounded-lg p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left font-semibold">Term</th>
                    <th className="py-2 text-left font-semibold">Definition</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ['Ego', 'The central entity the entire network is built around.'],
                    ['Entity', 'Any node in the network (a person, organization, etc.).'],
                    ['Relationship', 'A connection between two entities at a point in time (e.g., co-authorship).'],
                    [
                      'Hop Distance',
                      'How many edges you must traverse to reach an entity from the ego. Hop 1 = directly connected. Hop 2 = connected through one intermediary.'
                    ],
                    [
                      'Time Block',
                      'A single time period (one year like "2020" or one month like "2020-03"). Each column in the spreadline chart is one time block.'
                    ],
                    ['Topology', 'The list of all connections (edges) in the network with source, target, time, and weight.'],
                    [
                      'Category',
                      'Either "internal" (same affiliation as ego) or "external" (different affiliation). Determines line color.'
                    ],
                    [
                      'Groups',
                      'Per-time-block arrays that define vertical ordering. Has 2*hopLimit + 1 slots: external hops on top, ego in middle, internal hops on bottom.'
                    ],
                    ['BFS', 'Breadth-First Search. The algorithm used to discover entities within N hops of the ego.'],
                    ['Storyline', "A visual line in the spreadline chart representing one entity's path through time."],
                    ['Pinning', 'Highlighting specific entities across all views (graph + chart) by clicking on them.'],
                    ['Granularity', 'The time resolution: "yearly" (one column per year) or "monthly" (one column per month).']
                  ].map(([term, def]) => (
                    <tr key={term} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono whitespace-nowrap">{term}</td>
                      <td className="py-2">{def}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 3: Data Model                                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="data-model" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">3. Data Model</h2>

          <MermaidDiagram
            chart={`
erDiagram
    RELATIONS_CSV {
        string year
        string sourceId
        string targetId
        string id "paper/artifact ID"
        string type "e.g. Co-co-author"
        number citationcount
    }
    ENTITIES_CSV {
        string id
        string name
        string year
        number relationshipcount
        string affiliation
    }
    CITATIONS_CSV {
        string entityId
        string year
        number relationshipcount
        string affiliation
        string paperID
    }
    RELATIONS_CSV ||--o{ ENTITIES_CSV : "sourceId/targetId -> id"
    CITATIONS_CSV }o--|| RELATIONS_CSV : "paperID -> id"
    CITATIONS_CSV }o--|| ENTITIES_CSV : "entityId -> id"
            `}
            caption="Entity-relationship diagram showing how the three CSV files relate to each other"
          />

          <Tabs
            tabs={[
              {
                label: 'CSV Files',
                content: (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      All data comes from three CSV files stored in{' '}
                      <code className="bg-muted rounded px-1">data/spreadline/vis-author2/</code> (yearly) and{' '}
                      <code className="bg-muted rounded px-1">data/spreadline/vis-author2-monthly/</code> (monthly).
                    </p>

                    <Collapsible title="relations.csv" badge="edges" defaultOpen>
                      <p className="text-muted-foreground mb-2">
                        Each row is one relationship (edge) between two entities at a point in time.
                      </p>
                      <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                        {`year,sourceId,targetId,id,type,citationcount,count
2002,p1199,p0500,paper123,Co-co-author,5,1
2003,p1199,p0700,paper456,Co-co-author,12,1`}
                      </pre>
                    </Collapsible>

                    <Collapsible title="entities.csv" badge="nodes">
                      <p className="text-muted-foreground mb-2">
                        Each row is an entity at a specific time period (can appear in multiple years with different affiliations).
                      </p>
                      <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                        {`id,name,year,relationshipcount,affiliation
p1199,Jeffrey Heer,2005,42,University of California, Berkeley, USA
p1199,Jeffrey Heer,2010,156,Stanford University, USA`}
                      </pre>
                    </Collapsible>

                    <Collapsible title="citations.csv" badge="weights">
                      <p className="text-muted-foreground mb-2">Maps relationship artifacts to entities and their relationship counts.</p>
                      <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                        {`entityId,year,relationshipcount,affiliation,paperID
p1199,2005,42,University of California,paper123
p0500,2005,15,Stanford University,paper123`}
                      </pre>
                    </Collapsible>
                  </div>
                )
              },
              {
                label: 'TypeScript Types',
                content: (
                  <div className="space-y-4">
                    <Collapsible title="SpreadlineRawDataResponse" badge="main response" defaultOpen>
                      <p className="text-muted-foreground mb-2">
                        The complete API response. This is THE data structure driving all visualizations.
                      </p>
                      <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                        {`interface SpreadlineRawDataResponse {
  egoId: string;                       // Ego entity ID
  egoName: string;                     // Ego display name
  dataset: string;                     // Dataset name (e.g., "vis-author2")
  entities: Record<string, EntityInfo>; // entityId -> EntityInfo
  topology: TopologyEntry[];           // All edges for this page
  groups: Record<string, string[][]>;  // time -> group arrays (see below)
  totalPages: number;                  // Total pages available
  timeBlocks: string[];                // Time labels for this page only
}`}
                      </pre>
                    </Collapsible>

                    <Collapsible title="TopologyEntry" badge="edge">
                      <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                        {`interface TopologyEntry {
  sourceId: string;  // First entity ID
  targetId: string;  // Second entity ID
  time: string;      // Time period (e.g., "2020")
  weight: number;    // Edge weight (always 1 from BFS, aggregated later)
}`}
                      </pre>
                    </Collapsible>

                    <Collapsible title="EntityInfo" badge="node metadata">
                      <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                        {`interface EntityInfo {
  name: string;                         // Display name
  category: 'internal' | 'external';    // Affiliation category
  relationships: Record<string, number>; // time -> relationship count
}`}
                      </pre>
                    </Collapsible>

                    <Collapsible title="RelationEvent" badge="detail view">
                      <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                        {`interface RelationEvent {
  id: string;            // Unique artifact ID (e.g., paper ID)
  year: string;          // Time period
  sourceId: string;      // First entity ID
  targetId: string;      // Second entity ID
  type: string;          // Relationship type
  relationshipCount: number; // Weight
}`}
                      </pre>
                    </Collapsible>

                    <Collapsible title="SpreadlineGraphNode & SpreadlineGraphLink" badge="D3 types">
                      <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                        {`// Used for the force-directed graph
interface SpreadlineGraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  isEgo: boolean;
  collaborationCount: number;
  totalRelationships: number;
  hopDistance?: number;  // 0=ego, 1=direct, 2+=indirect
  category?: 'internal' | 'external' | 'ego';
}

interface SpreadlineGraphLink extends SimulationLinkDatum<SpreadlineGraphNode> {
  source: string | SpreadlineGraphNode;
  target: string | SpreadlineGraphNode;
  weight: number;       // Aggregated relationship count
  paperCount: number;   // Distinct shared artifacts
  years: string[];      // Time periods
}`}
                      </pre>
                    </Collapsible>
                  </div>
                )
              },
              {
                label: 'Groups Structure',
                content: (
                  <div>
                    <p className="text-muted-foreground mb-4">
                      The <code className="bg-muted rounded px-1">groups</code> field is the most complex part of the response. For each
                      time block, it contains a 2D array with <code className="bg-muted rounded px-1">2 * hopLimit + 1</code> slots.
                    </p>
                    <MermaidDiagram
                      chart={`
graph TB
  subgraph "groups['2020'] with hopLimit=2 (5 slots)"
    direction TB
    E0["[0] External 2-hop<br/>Farthest, different affiliation<br/>e.g., ['p0300', 'p0400']"]
    E1["[1] External 1-hop<br/>Direct connection, different affiliation<br/>e.g., ['p0500', 'p0600']"]
    EGO["[2] EGO<br/>Always the center<br/>e.g., ['p1199']"]
    I1["[3] Internal 1-hop<br/>Direct connection, same affiliation<br/>e.g., ['p0700', 'p0800']"]
    I2["[4] Internal 2-hop<br/>Farthest, same affiliation<br/>e.g., ['p0900']"]
    E0 --- E1 --- EGO --- I1 --- I2
  end
                    `}
                      caption="Visual layout of the groups array. External entities appear above ego, internal below."
                    />
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="bg-muted/50 rounded-lg border-l-4 p-4" style={{ borderColor: '#166b6b' }}>
                        <h4 className="font-semibold" style={{ color: '#166b6b' }}>
                          External (Teal #166b6b)
                        </h4>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Different affiliation from ego. Positioned ABOVE ego in the chart.
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg border-l-4 p-4" style={{ borderColor: '#FA9902' }}>
                        <h4 className="font-semibold" style={{ color: '#FA9902' }}>
                          Internal (Orange #FA9902)
                        </h4>
                        <p className="text-muted-foreground mt-1 text-sm">Same affiliation as ego. Positioned BELOW ego in the chart.</p>
                      </div>
                    </div>
                  </div>
                )
              }
            ]}
          />
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 4: Server-Side Architecture                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="server-architecture" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">4. Server-Side Architecture</h2>

          <MermaidDiagram
            chart={`
graph TB
    subgraph "Server-Side Pipeline"
        direction TB
        CSV1["relations.csv"] --> LOAD["loadCSV()<br/>PapaParse + Memory Cache"]
        CSV2["entities.csv"] --> LOAD
        CSV3["citations.csv"] --> LOAD
        LOAD --> FILTER["Filter by<br/>relation types + year range"]
        FILTER --> BFS["constructEntityNetwork()<br/>N-hop BFS per time block"]
        BFS --> CAT["Category Assignment<br/>internal vs external"]
        CAT --> GROUP["Group Assignment<br/>2*hopLimit+1 slots"]
        GROUP --> REL["Build Relationship Counts<br/>per entity per time"]
        REL --> PAGE["Server-Side Pagination<br/>slice timeBlocks by page"]
        PAGE --> RESP["SpreadlineRawDataResponse"]
    end
            `}
            caption="The server-side data pipeline from CSV files to API response"
          />

          <Callout type="info" title="All server files use import 'server-only'">
            This is a Next.js safety mechanism. If any client component accidentally imports a server file, the build will fail immediately.
            Every file in the <code className="bg-muted rounded px-1">server/</code> directory must have it.
          </Callout>

          <Tabs
            tabs={[
              {
                label: 'CSV Loading',
                content: (
                  <div>
                    <p className="text-muted-foreground mb-4">
                      Simple utility that reads CSV files using PapaParse and caches results in a module-level Map. Once loaded, subsequent
                      calls return cached data instantly.
                    </p>
                    <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                      {`// csv.utils.ts - Key function
import Papa from 'papaparse';

const csvCache = new Map<string, unknown[]>();

async function loadCSV<T>(filePath: string): Promise<T[]> {
  const cached = csvCache.get(filePath);
  if (cached) return cached as T[];

  const content = await fs.readFile(filePath, 'utf-8');
  const result = Papa.parse<T>(content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  csvCache.set(filePath, result.data);
  return result.data;
}`}
                    </pre>
                  </div>
                )
              },
              {
                label: 'BFS Algorithm',
                content: (
                  <div>
                    <MermaidDiagram
                      chart={`
sequenceDiagram
    participant S as Service
    participant BFS as constructEgoNetworks()
    participant G as Group Assignment

    S->>BFS: egoId, relations, hopLimit=2
    Note over BFS: For each time block:
    BFS->>BFS: Set ego at distance 0
    BFS->>BFS: Find ego's neighbors (hop 1)
    BFS->>BFS: Find neighbors' neighbors (hop 2)
    BFS-->>S: hopDistances per time block

    S->>G: hopDistances + affiliations
    Note over G: For each entity:
    G->>G: Compare affiliation with ego
    G->>G: internal? Place right of ego
    G->>G: external? Place left of ego
    G->>G: Resolve overlaps (closest wins)
    G->>G: Sort by paper count
    G-->>S: groups + categoryMap
                    `}
                      caption="Sequence diagram showing the BFS network construction and group assignment process"
                    />
                    <pre className="bg-muted mt-4 overflow-x-auto rounded-lg p-4 text-sm">
                      {`// Simplified BFS logic from constructEgoNetworks()
for (const [time, entries] of Object.entries(byTime)) {
  const distMap = new Map();     // entity -> hop distance
  distMap.set(egoId, 0);         // ego is at distance 0
  let waitlist = new Set([egoId]);
  let hop = 1;

  while (waitlist.size > 0 && hop <= hopLimit) {
    const nextWaitlist = [];
    for (const entity of waitlist) {
      const neighbors = findNeighbors(entries, entity);
      for (const neighbor of neighbors) {
        if (!distMap.has(neighbor)) {
          distMap.set(neighbor, hop);
          nextWaitlist.push(neighbor);
        }
      }
    }
    waitlist = new Set(nextWaitlist);
    hop++;
  }
}`}
                    </pre>
                  </div>
                )
              },
              {
                label: 'Data Service',
                content: (
                  <div>
                    <p className="text-muted-foreground mb-4">
                      The <code className="bg-muted rounded px-1">getSpreadlineRawData()</code> orchestrates everything:
                    </p>
                    <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                      {`async function getSpreadlineRawData(params) {
  // 1. Load all three CSV files in parallel
  const [relations, allEntities, relationships] = await Promise.all([
    loadCSV(path.join(basePath, 'relations.csv')),
    loadCSV(path.join(basePath, 'entities.csv')),
    loadCSV(path.join(basePath, 'citations.csv'))
  ]);

  // 2. Filter relations by type and year range
  // 3. Build ID -> name lookup
  // 4. Construct ego-centric network (BFS + categories + groups)
  const { topology, categoryMap, groups, network } =
    constructEntityNetwork(egoId, relations, allEntities, hopLimit);

  // 5. Optionally merge external into internal
  // 6. Build per-entity relationship counts
  // 7. Server-side pagination (slice timeBlocks)
  // 8. Filter topology, entities, groups to current page

  return { egoId, egoName, dataset, entities, topology,
           groups, totalPages, timeBlocks };
}`}
                    </pre>
                    <Callout type="tip" title="Pagination">
                      Time blocks are sorted newest-first, then sliced into pages of 20. If the last page has fewer than 20 blocks,
                      it&apos;s padded with synthetic earlier time labels to keep column count consistent across pages.
                    </Callout>
                  </div>
                )
              }
            ]}
          />
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 5: API Specification                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="api-specification" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">5. API Specification</h2>

          <MermaidDiagram
            chart={`
sequenceDiagram
    participant C as Client Component
    participant H as React Query Hook
    participant O as ORPC Client
    participant A as API Route
    participant R as ORPC Router
    participant S as Service

    C->>H: useSpreadlineRawDataQuery(params)
    H->>O: orpc.spreadline.getRawData.queryOptions()
    O->>A: GET /api/rpc/spreadline/getRawData
    A->>R: Route to spreadlineRouter.getRawData
    R->>R: Validate input with Zod
    R->>S: spreadlineDataService.getSpreadlineRawData()
    S-->>R: SpreadlineRawDataResponse
    R->>R: Validate output with Zod
    R-->>A: JSON response
    A-->>O: Response
    O-->>H: Typed data
    H-->>C: { data, isPending, error }
            `}
            caption="Sequence diagram showing the full API request lifecycle from component to service and back"
          />

          <Tabs
            tabs={[
              {
                label: 'getRawData',
                content: (
                  <div>
                    <div className="bg-muted mb-4 inline-block rounded px-3 py-1 text-sm">
                      <code>GET /api/rpc/spreadline/getRawData</code>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Returns all data needed to render the SpreadLine visualization for one page of time blocks.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="mb-4 w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 pr-4 text-left">Parameter</th>
                            <th className="py-2 pr-4 text-left">Type</th>
                            <th className="py-2 pr-4 text-left">Default</th>
                            <th className="py-2 text-left">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-mono">egoId</td>
                            <td className="py-2 pr-4">string</td>
                            <td className="py-2 pr-4">&mdash;</td>
                            <td className="py-2">Central entity ID</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-mono">relationTypes</td>
                            <td className="py-2 pr-4">string[]</td>
                            <td className="py-2 pr-4">&mdash;</td>
                            <td className="py-2">Types to include (e.g., [&quot;Co-co-author&quot;])</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-mono">yearRange</td>
                            <td className="py-2 pr-4">[number, number]</td>
                            <td className="py-2 pr-4">&mdash;</td>
                            <td className="py-2">Start and end year</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-mono">granularity</td>
                            <td className="py-2 pr-4">&quot;yearly&quot; | &quot;monthly&quot;</td>
                            <td className="py-2 pr-4">&quot;yearly&quot;</td>
                            <td className="py-2">Time resolution</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-mono">splitByAffiliation</td>
                            <td className="py-2 pr-4">boolean</td>
                            <td className="py-2 pr-4">true</td>
                            <td className="py-2">Distinguish internal/external</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-mono">pageIndex</td>
                            <td className="py-2 pr-4">number</td>
                            <td className="py-2 pr-4">0</td>
                            <td className="py-2">Zero-based page</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-mono">pageSize</td>
                            <td className="py-2 pr-4">number</td>
                            <td className="py-2 pr-4">20</td>
                            <td className="py-2">Blocks per page</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 font-mono">hopLimit</td>
                            <td className="py-2 pr-4">number (1-5)</td>
                            <td className="py-2 pr-4">2</td>
                            <td className="py-2">Max BFS depth</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                      {`// Client hook usage
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useSpreadlineRawDataQuery = (params) => {
  return useQuery(orpc.spreadline.getRawData.queryOptions({ input: params }));
};`}
                    </pre>
                  </div>
                )
              },
              {
                label: 'getRelationEvents',
                content: (
                  <div>
                    <div className="bg-muted mb-4 inline-block rounded px-3 py-1 text-sm">
                      <code>GET /api/rpc/spreadline/getRelationEvents</code>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Returns individual relationship events between two specific entities. Used when clicking a link in the graph.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="mb-4 w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 pr-4 text-left">Parameter</th>
                            <th className="py-2 pr-4 text-left">Type</th>
                            <th className="py-2 text-left">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b">
                            <td className="py-2 pr-4 font-mono">sourceId</td>
                            <td className="py-2 pr-4">string</td>
                            <td className="py-2">First entity ID</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 font-mono">targetId</td>
                            <td className="py-2 pr-4">string</td>
                            <td className="py-2">Second entity ID</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
                      {`// Returns: RelationEvent[] (sorted newest-first, limited)
// Client hook:
export const useRelationEventsQuery = (sourceId, targetId) => {
  return useQuery({
    ...orpc.spreadline.getRelationEvents.queryOptions({
      input: { sourceId, targetId }
    }),
    enabled: !!sourceId && !!targetId  // Only fetch when both IDs set
  });
};`}
                    </pre>
                  </div>
                )
              }
            ]}
          />
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 6: Client-Side Architecture                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="client-architecture" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">6. Client-Side Architecture</h2>

          <MermaidDiagram
            chart={`
graph TB
    TAB["SpreadlineTabComponent<br/>(main container, owns all state)"]
    HOOK["useSpreadlineRawDataQuery()"]
    TAB --> HOOK

    TAB --> GRAPH["SpreadlineGraphComponent<br/>D3 force-directed graph"]
    TAB --> BTABS["SpreadlineBottomTabsComponent<br/>Tab switcher"]
    TAB --> SL["SpreadlineComponent<br/>Storyline chart"]
    TAB --> NT["NetworkTimelineChartComponent<br/>Dot-and-line timeline"]

    GRAPH --> GZ["useGraphZoom()"]
    GRAPH --> TF["transformSpreadlineToGraphByTime()"]

    SL --> SLLIB["SpreadLine library<br/>Layout computation"]
    SL --> CHART["SpreadLineChart<br/>D3 visualization wrapper"]
    SL --> TOOLBAR1["SpreadlineToolbar"]
    SL --> SCRUB1["SpreadlineScrubber"]

    NT --> TOOLBAR2["SpreadlineToolbar"]
    NT --> SCRUB2["SpreadlineScrubber"]
            `}
            caption="Component tree showing parent-child relationships. SpreadlineTabComponent owns all state and passes it down via props."
          />

          <Collapsible title="State Management Details" defaultOpen>
            <p className="text-muted-foreground mb-4">
              All state lives in <code className="bg-muted rounded px-1">SpreadlineTabComponent</code> as React
              <code className="bg-muted rounded px-1"> useState</code> hooks. A module-level LRU cache (10 entries) preserves state across
              tab unmount/remount.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`// Key state managed by SpreadlineTabComponent:
const [selectedRange, setSelectedRange] = useState<[number, number] | null>([0, 0]);
const [pinnedEntityNames, setPinnedEntityNames] = useState<string[]>([]);
const [relationTypes, setRelationTypes] = useState<string[]>(['Co-co-author']);
const [granularity, setGranularity] = useState<SpreadlineGranularity>('yearly');
const [splitByAffiliation, setSplitByAffiliation] = useState(true);
const [pageIndex, setPageIndex] = useState(0);
const [blocksFilter, setBlocksFilter] = useState(1);
const [activeBottomTab, setActiveBottomTab] = useState<SpreadlineBottomTab>('spreadline');
const [hopLimit, setHopLimit] = useState(2);`}
            </pre>
          </Collapsible>

          <Collapsible title="Utility Transform Functions">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left">Function</th>
                    <th className="py-2 pr-4 text-left">Input</th>
                    <th className="py-2 text-left">Output</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">transformSpreadlineToGraph()</td>
                    <td className="py-2 pr-4">Raw response</td>
                    <td className="py-2">Nodes + links across ALL times</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">transformSpreadlineToGraphByTime()</td>
                    <td className="py-2 pr-4">Response + time</td>
                    <td className="py-2">Nodes + links for ONE time block</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">transformSpreadlineToGraphByTimes()</td>
                    <td className="py-2 pr-4">Response + time range</td>
                    <td className="py-2">Nodes + links for MULTIPLE blocks</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">transformSpreadlineToTimeline()</td>
                    <td className="py-2 pr-4">Raw response</td>
                    <td className="py-2">TimelineEntity[] for timeline chart</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">deduplicateLinks()</td>
                    <td className="py-2 pr-4">Topology + node IDs</td>
                    <td className="py-2">Aggregated links (deduped)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">bfsDistances()</td>
                    <td className="py-2 pr-4">Start ID + links</td>
                    <td className="py-2">Map of ID to shortest distance</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Collapsible>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 7: SpreadLine Layout Engine                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="layout-engine" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">7. SpreadLine Layout Engine</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              The layout engine lives in <code className="bg-muted rounded px-1">src/lib/spreadline/</code> and is a TypeScript port of a
              Python academic library. It computes vertical positions for storylines in the chart.
            </p>

            <MermaidDiagram
              chart={`
graph LR
    subgraph "5-Phase Pipeline"
        direction LR
        L["load()<br/>Load topology"] --> C["center()<br/>Filter to ego"]
        C --> O["ordering()<br/>Minimize crossings"]
        O --> A["aligning()<br/>Horizontal consistency"]
        A --> CO["compacting()<br/>Remove whitespace"]
        CO --> CX["contextualizing()<br/>Force refinement"]
        CX --> R["rendering()<br/>Generate SVG paths"]
    end
    R --> RES["SpreadLineResult<br/>storylines, blocks,<br/>timeLabels, paths"]
              `}
              caption="The SpreadLine layout pipeline: data flows through 5 optimization phases before rendering to SVG paths"
            />
          </div>

          <Collapsible title="Phase Details" defaultOpen>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left">Phase</th>
                    <th className="py-2 pr-4 text-left">File</th>
                    <th className="py-2 text-left">What It Does</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-semibold">1. Ordering</td>
                    <td className="py-2 pr-4 font-mono">order.ts</td>
                    <td className="py-2">
                      Determines vertical order at each time block to minimize edge crossings. Uses a barycenter heuristic.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-semibold">2. Aligning</td>
                    <td className="py-2 pr-4 font-mono">align.ts</td>
                    <td className="py-2">
                      Snaps entities to consistent Y positions across adjacent blocks so lines are as horizontal as possible.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-semibold">3. Compacting</td>
                    <td className="py-2 pr-4 font-mono">compact.ts</td>
                    <td className="py-2">Removes unnecessary vertical whitespace, squeezing the chart to minimal height.</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-semibold">4. Contextualizing</td>
                    <td className="py-2 pr-4 font-mono">contextualize.ts</td>
                    <td className="py-2">Runs a D3 force simulation for final position refinement and collision detection.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-semibold">5. Rendering</td>
                    <td className="py-2 pr-4 font-mono">render.ts</td>
                    <td className="py-2">Converts final positions into SVG paths (bezier curves), labels, marks, and blocks.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Collapsible>

          <Collapsible title="Usage Code Example">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`import { SpreadLine } from '@/lib/spreadline';

const spreadline = new SpreadLine();

// Phase 0: Load topology data
spreadline.load(topologyRows, {
  source: 'source', target: 'target',
  time: 'time', weight: 'weight'
});

// Phase 1: Center on ego, set time parameters, provide groups
spreadline.center(
  'ego_entity_name',  // ego name
  undefined,          // timeExtents (auto-detect)
  'year',             // timeDelta
  '%Y',               // timeFormat
  groups              // group constraints from API
);

// Phase 2-5: Run optimization + render
const result = spreadline.fit(width, height);
// result: SpreadLineResult with storylines, blocks, timeLabels, etc.`}
            </pre>
          </Collapsible>

          <Collapsible title="Output: SpreadLineResult">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`interface SpreadLineResult {
  bandWidth: number;       // Width of each time column
  blockWidth: number;      // Total chart width
  ego: string;             // Ego entity name
  timeLabels: { label: string; posX: number }[];
  heightExtents: [number, number];
  storylines: StorylineResult[];  // One per entity
  blocks: BlockResult[];          // One per time block
}

interface StorylineResult {
  name: string;          // Entity name
  lines: string[];       // SVG path strings (bezier curves)
  marks: MarkResult[];   // Dot markers at each time block
  label: LabelResult;    // Name label position
  color: string;         // Line color
  lifespan: number;      // Active time block count
}`}
            </pre>
          </Collapsible>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 8: D3 Visualization Layer                        */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="d3-visualization" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">8. D3 Visualization Layer</h2>

          <MermaidDiagram
            chart={`
graph TB
    subgraph "React World"
        RC["SpreadLineChart<br/>(React forwardRef)"]
        RC -->|"data, config"| INIT["useEffect: init"]
        RC -->|"blocksFilter"| FILTER["useEffect: D3 filter"]
        RC -->|"pinnedNames"| PIN["useEffect: D3 pins"]
        RC -->|"highlightTimes"| HL["useEffect: D3 highlight"]
    end
    subgraph "D3 World"
        INIT -->|"creates"| VIZ["SpreadLinesVisualizer"]
        VIZ --> SVG["SVG Elements"]
        VIZ --> HOVER["Hover Effects"]
        VIZ --> BRUSH["Brush / Click"]
        VIZ --> COLLAPSE["Collapse/Expand"]
        VIZ --> ANIM["Animations"]
        FILTER -->|"calls directly"| VIZ
        PIN -->|"calls directly"| VIZ
    end
            `}
            caption="The critical React/D3 separation: React manages lifecycle, D3 manages ALL rendering and interaction"
          />

          <Callout type="important" title="Critical Rendering Separation">
            React re-renders ONLY when data, config, or resetKey changes. D3 handles ALL other updates: filtering, pinning, hover, zoom/pan,
            highlight bar drag, block collapse/expand. This ensures smooth D3 animations without React interference.
          </Callout>

          <Collapsible title="SpreadLineChart Props API" defaultOpen>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`interface SpreadLineChartProps {
  data: SpreadLineData;                   // Layout result
  config?: Partial<SpreadLineConfig>;     // Visual overrides
  onFilterChange?: (names: string[]) => void;
  onTimeClick?: (timeLabel: string) => void;
  onHighlightRangeChange?: (start: string, end: string) => void;
  onEntityPin?: (names: string[]) => void;
  pinnedEntityNames?: string[];
  highlightTimes?: string[];
  blocksFilter?: number;
  crossingOnly?: boolean;
  resetKey?: number;                      // Increment to force re-init
}

// Imperative handle (via ref)
interface SpreadLineChartHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  getZoomLevel: () => number;
  clearPins: () => void;
  toggleLineVisibility: (color: string) => void;
  toggleLabels: () => void;
}`}
            </pre>
          </Collapsible>

          <Collapsible title="Force-Directed Graph Setup">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`// D3 force simulation for the top panel graph
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id)
    .distance(d => d.hopDistance === 1 ? 100 : 200))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide(20))
  .force('radial', d3.forceRadial(120, width / 2, height / 2)
    .strength(d => d.hopDistance === 1 ? 0.3 : 0));

// Key behaviors:
// - Ego: centered, larger node, glowing border
// - Hop-1 nodes: orbit in a circle (radial force)
// - Hop-2+ nodes: float farther out
// - Link thickness/color scales with relationship weight
// - Time changes trigger smooth D3 transitions (600ms)`}
            </pre>
          </Collapsible>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 9: Configuration & Constants                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="configuration" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">9. Configuration &amp; Constants</h2>

          <p className="text-muted-foreground mb-4">
            All tunable values are centralized in <code className="bg-muted rounded px-1">src/features/spreadlines/const.ts</code>.
          </p>

          <Tabs
            tabs={[
              {
                label: 'Defaults',
                content: (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 pr-4 text-left">Constant</th>
                          <th className="py-2 pr-4 text-left">Value</th>
                          <th className="py-2 text-left">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_DEFAULT_EGO_ID</td>
                          <td className="py-2 pr-4">&quot;p1199&quot;</td>
                          <td className="py-2">Jeffrey Heer (demo ego)</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_DEFAULT_YEAR_RANGE</td>
                          <td className="py-2 pr-4">[2002, 2022]</td>
                          <td className="py-2">Default time range</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_DEFAULT_HOP_LIMIT</td>
                          <td className="py-2 pr-4">2</td>
                          <td className="py-2">Default BFS depth</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_MAX_HOP_LIMIT</td>
                          <td className="py-2 pr-4">5</td>
                          <td className="py-2">Maximum BFS depth</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_PAGE_SIZE</td>
                          <td className="py-2 pr-4">20</td>
                          <td className="py-2">Blocks per API page</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              },
              {
                label: 'Colors',
                content: (
                  <div>
                    <div className="mb-4 grid gap-4 md:grid-cols-2">
                      {[
                        { name: 'INTERNAL', color: '#FA9902', desc: 'Same affiliation as ego' },
                        { name: 'EXTERNAL', color: '#166b6b', desc: 'Different affiliation' },
                        { name: 'SELECTED', color: 'hsl(270, 65%, 55%)', desc: 'Pinned/selected entities' }
                      ].map(c => (
                        <div key={c.name} className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                          <div className="h-8 w-8 flex-shrink-0 rounded-md border" style={{ backgroundColor: c.color }} />
                          <div>
                            <div className="font-mono text-xs">{c.name}</div>
                            <div className="text-muted-foreground text-sm">{c.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <h4 className="mb-2 font-semibold">Frequency Heatmap Colors (low to high)</h4>
                    <div className="flex gap-1">
                      {['#ffffff', '#fcdaca', '#e599a6', '#c94b77', '#740980'].map(c => (
                        <div key={c} className="h-8 flex-1 rounded border" style={{ backgroundColor: c }} title={c} />
                      ))}
                    </div>
                    <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                      <span>Low activity</span>
                      <span>High activity</span>
                    </div>
                  </div>
                )
              },
              {
                label: 'Dimensions',
                content: (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 pr-4 text-left">Constant</th>
                          <th className="py-2 pr-4 text-left">Value</th>
                          <th className="py-2 text-left">Usage</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_MIN_WIDTH_PER_TIMESTAMP</td>
                          <td className="py-2 pr-4">200px</td>
                          <td className="py-2">Minimum column width</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_CHART_HEIGHT</td>
                          <td className="py-2 pr-4">1000px</td>
                          <td className="py-2">Layout height</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-mono text-xs">GRAPH_HOP1_LINK_DISTANCE</td>
                          <td className="py-2 pr-4">100px</td>
                          <td className="py-2">Hop-1 link distance</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-mono text-xs">GRAPH_TIME_TRANSITION_MS</td>
                          <td className="py-2 pr-4">600ms</td>
                          <td className="py-2">Animation duration</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-mono text-xs">NETWORK_TIMELINE_ROW_HEIGHT</td>
                          <td className="py-2 pr-4">32px</td>
                          <td className="py-2">Timeline row height</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              }
            ]}
          />
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 10: Directory Structure                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="directory-structure" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">10. Directory Structure</h2>

          <MermaidDiagram
            chart={`
graph TB
    subgraph "3 Main Directories"
        F["src/features/spreadlines/<br/>Feature code<br/>(components, hooks, server, utils)"]
        L["src/lib/spreadline/<br/>Layout Engine<br/>(standalone, reusable)"]
        V["src/lib/spreadline-viz/<br/>D3 Visualization<br/>(React + D3 bridge)"]
    end
    F --> |"imports"| L
    F --> |"imports"| V
    V --> |"imports"| L
            `}
            caption="The three main directories and their dependency relationships"
          />

          <Collapsible title="Full File Tree" defaultOpen>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`# Feature code
src/features/spreadlines/
├── components/
│   ├── spreadline-tab.component.tsx            # Main container + state
│   ├── spreadline.component.tsx                # Storyline chart
│   ├── spreadline-graph.component.tsx          # Force-directed graph
│   ├── network-timeline-chart.component.tsx    # Dot-and-line timeline
│   ├── spreadline-toolbar.component.tsx        # Filter controls
│   ├── spreadline-scrubber.component.tsx       # Time range selector
│   └── spreadline-bottom-tabs.component.tsx    # Tab switcher
├── hooks/
│   ├── useSpreadlineRawDataQuery.ts            # API: getRawData
│   ├── useRelationEventsQuery.ts               # API: getRelationEvents
│   └── useGraphZoom.ts                         # D3 zoom behavior
├── utils/
│   ├── index.ts                                # Graph/timeline transforms
│   └── drag-cursor.ts                          # Custom drag cursor
├── server/
│   ├── routers.ts                              # ORPC endpoints
│   └── services/
│       ├── spreadline-data.service.ts          # Main orchestrator
│       ├── entity-network.utils.ts             # BFS algorithm
│       ├── csv.utils.ts                        # CSV loading
│       └── relation-event.service.ts           # Relation events
└── const.ts                                    # ALL configuration

# Layout engine (standalone)
src/lib/spreadline/
├── spreadline.ts     # Main class (load/center/fit)
├── types.ts          # Path, Node, Entity, Session, results
├── constructors.ts   # Ego filtering
├── order.ts          # Phase 1: Ordering
├── align.ts          # Phase 2: Alignment
├── compact.ts        # Phase 3: Compaction
├── contextualize.ts  # Phase 4: Force refinement
├── render.ts         # Phase 5: SVG paths
├── helpers.ts        # Date utilities
└── index.ts          # Public exports

# D3 visualization (React bridge)
src/lib/spreadline-viz/
├── spreadline-visualizer.ts  # D3 rendering class
├── spreadline-types.ts       # D3-specific types
├── spreadline-chart.tsx      # React wrapper (forwardRef)
├── spreadline-d3-utils.ts    # D3 utilities
└── index.ts

# Data files
data/spreadline/
├── vis-author2/          # Yearly
└── vis-author2-monthly/  # Monthly`}
            </pre>
          </Collapsible>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 11: Data Flow                                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="data-flow" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">11. Data Flow</h2>

          <h3 className="mb-4 text-lg font-semibold">End-to-End Request Flow</h3>
          <MermaidDiagram
            chart={`
sequenceDiagram
    participant U as User
    participant TAB as SpreadlineTabComponent
    participant RQ as React Query
    participant API as API /spreadline/getRawData
    participant SVC as spreadline-data.service
    participant CSV as CSV Files (cached)
    participant BFS as constructEntityNetwork

    U->>TAB: Opens .sl file
    TAB->>RQ: useSpreadlineRawDataQuery(params)
    RQ->>API: GET with egoId, yearRange, etc.
    API->>SVC: getSpreadlineRawData()
    SVC->>CSV: loadCSV(relations, entities, citations)
    CSV-->>SVC: Parsed rows (from cache or disk)
    SVC->>BFS: constructEntityNetwork(egoId, relations, entities, hopLimit)
    BFS->>BFS: BFS per time block
    BFS->>BFS: Assign categories (internal/external)
    BFS->>BFS: Build groups (2*hop+1 slots)
    BFS-->>SVC: topology, categoryMap, groups
    SVC->>SVC: Build relationship counts
    SVC->>SVC: Paginate (slice timeBlocks)
    SVC-->>API: SpreadlineRawDataResponse
    API-->>RQ: JSON
    RQ-->>TAB: { data, isPending }

    Note over TAB: Client-side rendering begins
    TAB->>TAB: transformSpreadlineToGraphByTime()
    TAB->>TAB: new SpreadLine().load().center().fit()
    TAB->>TAB: Render Force Graph + Spreadline Chart
            `}
            caption="Complete sequence diagram from user action to rendered visualization"
          />

          <h3 className="mt-8 mb-4 text-lg font-semibold">User Interaction Flow</h3>
          <MermaidDiagram
            chart={`
graph LR
    subgraph "User Actions"
        A1["Drag time scrubber"]
        A2["Click entity on graph"]
        A3["Click graph link"]
        A4["Change filter in toolbar"]
        A5["Page navigation arrows"]
        A6["Ctrl+wheel zoom"]
    end
    subgraph "What Happens"
        B1["selectedRange changes<br/>Graph + chart update"]
        B2["Entity pinned<br/>Highlights in both panels"]
        B3["API call: getRelationEvents<br/>Show detail tooltip"]
        B4["New API call if server param<br/>Or D3 direct update"]
        B5["New API call with pageIndex<br/>Full re-render"]
        B6["D3 zoom transform<br/>No React re-render"]
    end
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5
    A6 --> B6
            `}
            caption="Map of user interactions to system responses. Most stay client-side; only filter/page changes trigger API calls."
          />
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 12: Migration Guide                              */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="migration-guide" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">12. Migration Guide (Step-by-Step)</h2>

          <MermaidDiagram
            chart={`
graph TB
    subgraph "Migration Steps"
        direction TB
        S1["1. Install Dependencies"] --> S2["2. Copy Layout Engine"]
        S2 --> S3["3. Copy D3 Viz Layer"]
        S3 --> S4["4. Copy Data Models"]
        S4 --> S5["5. Copy Feature Directory"]
        S5 --> S6["6. Copy CSV Data Files"]
        S6 --> S7["7. Set Up API Layer"]
        S7 --> S8["8. Update Import Paths"]
        S8 --> S9["9. Create Host Page"]
        S9 --> S10["10. Remove Store Dependency"]
        S10 --> S11["11. Adapt to Your Data"]
        S11 --> S12["12. Run Tests"]
        S12 --> S13["13. Build & Verify"]
        S13 --> S14["14. Optional: Replace CSV with DB"]
    end
            `}
            caption="The 14 migration steps in order. Each step builds on the previous."
          />

          <Callout type="info" title="Prerequisites">
            Your target project must have: Next.js 14+ with App Router, TypeScript, React 18+, Tailwind CSS, and Shadcn/ui components
            (ResizablePanel, Button, Select, Slider, Tabs, Tooltip).
          </Callout>

          <Step number={1} title="Install Dependencies">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`# Core visualization
npm install d3 @types/d3

# CSV parsing (server-side)
npm install papaparse @types/papaparse

# Data fetching
npm install @tanstack/react-query

# Zod for validation
npm install zod

# Shadcn components
npx shadcn@latest add resizable button select slider tabs tooltip`}
            </pre>
          </Step>

          <Step number={2} title="Copy Layout Engine (standalone library)">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`cp -r src/lib/spreadline/ <your-project>/src/lib/spreadline/`}
            </pre>
            <p>
              This is self-contained. No external dependencies beyond D3. Run{' '}
              <code className="bg-muted rounded px-1">spreadline.test.ts</code> to verify.
            </p>
          </Step>

          <Step number={3} title="Copy D3 Visualization Layer">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`cp -r src/lib/spreadline-viz/ <your-project>/src/lib/spreadline-viz/`}
            </pre>
            <p>
              Imports constants from <code className="bg-muted rounded px-1">features/spreadlines/const.ts</code> &mdash; you&apos;ll need
              to update paths or copy those constants.
            </p>
          </Step>

          <Step number={4} title="Copy Data Models">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`cp src/models/relation-event.model.ts <your-project>/src/models/`}
            </pre>
            <p>
              The key types (TopologyEntry, EntityInfo, SpreadlineRawDataResponse) are defined inline in service/router files, not in
              separate model files.
            </p>
          </Step>

          <Step number={5} title="Copy the Feature Directory">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`cp -r src/features/spreadlines/ <your-project>/src/features/spreadlines/`}
            </pre>
            <p>
              Includes server/, hooks/, components/, utils/, and const.ts. Update import paths to match your project&apos;s{' '}
              <code className="bg-muted rounded px-1">@/</code> alias.
            </p>
          </Step>

          <Step number={6} title="Copy CSV Data Files">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`cp -r data/spreadline/ <your-project>/data/spreadline/`}
            </pre>
            <p>This copies the demo dataset. If using your own data, create CSVs in the same format (Section 3a).</p>
          </Step>

          <Step number={7} title="Set Up the API Layer">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`// In your main router file (if using ORPC):
import { spreadlineRouter } from '@/features/spreadlines/server/routers';
export const router = {
  // ...your routers...
  spreadline: spreadlineRouter
};

// If using a different API framework (tRPC, REST, etc.):
// 1. Create equivalent endpoints for getRawData and getRelationEvents
// 2. Use the same Zod schemas from routers.ts
// 3. Update hooks to call your framework`}
            </pre>
          </Step>

          <Step number={8} title="Update Import Paths">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`# Key imports to search and fix:
@/lib/orpc/orpc            → Your API client path
@/lib/orpc                 → Your ORPC procedure definitions
@/components/ui/*          → Your Shadcn component paths
@/features/relationship-evidence/const → Just has MAX_RELATION_EVENTS (a number)
                                         Define locally to remove cross-feature dep`}
            </pre>
          </Step>

          <Step number={9} title="Create a Host Page">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`// src/app/spreadline/page.tsx
import SpreadlineTabComponent from '@/features/spreadlines/components/spreadline-tab.component';

export default function SpreadlinePage() {
  return (
    <div className="h-screen w-full">
      <SpreadlineTabComponent fileId="default" fileName="spreadline" />
    </div>
  );
}`}
            </pre>
          </Step>

          <Step number={10} title="Handle Store Dependency">
            <p>
              <code className="bg-muted rounded px-1">SpreadlineTabComponent</code> imports{' '}
              <code className="bg-muted rounded px-1">useOpenFilesActions</code> (Zustand store for tab titles). Either remove the import +
              useEffect that calls <code className="bg-muted rounded px-1">updateOpenFileTitle</code> (cosmetic only), or create a no-op
              stub hook.
            </p>
          </Step>

          <Step number={11} title="Adapt to Your Own Data">
            <ol className="list-inside list-decimal space-y-1">
              <li>Prepare three CSV files matching Section 3a format</li>
              <li>
                Place in <code className="bg-muted rounded px-1">data/spreadline/your-dataset/</code>
              </li>
              <li>
                Update <code className="bg-muted rounded px-1">DATASET_DIRS</code> in service
              </li>
              <li>
                Update <code className="bg-muted rounded px-1">SPREADLINE_DEFAULT_EGO_ID</code> in const.ts
              </li>
              <li>
                Update <code className="bg-muted rounded px-1">SPREADLINE_DEFAULT_YEAR_RANGE</code>
              </li>
              <li>
                Update <code className="bg-muted rounded px-1">SPREADLINE_RELATION_TYPE_OPTIONS</code>
              </li>
              <li>
                Replace <code className="bg-muted rounded px-1">remapJHAffiliation()</code> with your own normalization
              </li>
            </ol>
          </Step>

          <Step number={12} title="Run Tests">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`npm test -- --testPathPattern="spreadline"
# Should run 7 test files, all passing`}
            </pre>
          </Step>

          <Step number={13} title="Build and Verify">
            <pre className="bg-muted mb-2 overflow-x-auto rounded-lg p-4 text-sm">
              {`npm run build   # Catch TypeScript errors
npm run dev      # Navigate to your spreadline page`}
            </pre>
            <p>
              Verify: graph shows nodes/links, chart shows storylines, scrubber works, clicking pins entities, filters work, pagination
              loads new pages.
            </p>
          </Step>

          <Step number={14} title="Optional: Replace CSV with Database">
            <p>
              Replace the three <code className="bg-muted rounded px-1">loadCSV()</code> calls in{' '}
              <code className="bg-muted rounded px-1">spreadline-data.service.ts</code> with database queries. The rest of the function
              (network construction, pagination) stays exactly the same. Data must return the same shape as{' '}
              <code className="bg-muted rounded px-1">RelationRow</code>, <code className="bg-muted rounded px-1">EntityRow</code>,{' '}
              <code className="bg-muted rounded px-1">RelationshipRow</code>.
            </p>
          </Step>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 13: FAQ                                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="faq" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">13. FAQ</h2>

          {[
            [
              'Why does the layout engine exist as a separate library from the D3 visualization?',
              'Separation of concerns. The layout engine computes WHERE things go (coordinates, paths). The viz layer handles HOW to render and interact (D3 SVG, hover, zoom). You could swap D3 for Canvas or WebGL without touching the layout engine.'
            ],
            [
              'Why is pagination server-side instead of client-side?',
              "With 20 years of monthly data, you'd have 240+ time blocks. BFS network construction for all blocks is expensive. Server-side pagination means we only compute and transfer one page at a time (default: 20 blocks)."
            ],
            [
              'What is remapJHAffiliation() for?',
              'It\'s specific to the Jeffrey Heer demo dataset. Raw affiliation strings vary (e.g., "UC Berkeley" vs "University of California, Berkeley"). It normalizes them so internal/external classification works correctly. Replace with your own normalization or remove if your data is clean.'
            ],
            [
              'Can I change the number of hops?',
              'Yes. hopLimit ranges from 1 to 5. Higher hops = more entities but exponentially more computation and visual complexity. Default of 2 is a good balance.'
            ],
            [
              'What happens when splitByAffiliation is false?',
              'All entities are treated as "internal" (same color). External group slots are emptied and merged into internal ones. Useful when your data doesn\'t have meaningful affiliation info.'
            ],
            [
              'Why Ctrl+wheel for zoom instead of just wheel?',
              'To prevent accidental zooming when scrolling the page. The chart lives in a scrollable container. Ctrl+wheel makes zoom intentional.'
            ],
            [
              'How does CSV caching work?',
              'Simple in-memory Map keyed by file path. Once loaded, data stays cached for the Node.js process lifetime. clearCSVCache() exists for testing. In serverless (Vercel), cache resets on cold starts.'
            ],
            [
              "What is import 'server-only' and why is it everywhere?",
              'A Next.js convention. If any client component imports a server file, the build fails. Prevents accidental exposure of server code (file system, database) to the browser.'
            ],
            [
              'Can I use a different dataset format?',
              'Yes. The layout engine and viz layer work with SpreadlineRawDataResponse, not CSV. As long as your data service produces that shape, everything else works. Load from a database, API, or any source.'
            ],
            [
              "What's the performance like?",
              'BFS is the bottleneck (server-side). Demo dataset (~1000 relations, ~200 entities): <200ms API response. Layout engine: 50-100ms for 20 blocks. D3 rendering: nearly instant. For 10k+ entities, reduce hop limit or pre-compute.'
            ],
            [
              'What does the "minimize" config do in the layout engine?',
              "3 options: 'space' minimizes vertical space, 'line' minimizes line lengths, 'wiggles' (default) minimizes unnecessary line movement. 'wiggles' generally produces the most readable charts."
            ],
            [
              'What are the minimum files for a bare-bones SpreadLine?',
              'Just: src/lib/spreadline/ (layout engine), src/lib/spreadline-viz/ (D3 rendering), src/features/spreadlines/const.ts (constants), and your data in SpreadlineRawDataResponse format.'
            ]
          ].map(([q, a], i) => (
            <Collapsible key={i} title={q}>
              <p className="text-muted-foreground">{a}</p>
            </Collapsible>
          ))}
        </section>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer className="border-t pt-8 text-center">
          <p className="text-muted-foreground text-sm">SpreadLine Technical Design Document &mdash; Generated from codebase analysis</p>
          <p className="text-muted-foreground mt-1 text-xs">Last updated: 2026-03-05</p>
        </footer>
      </div>
    </div>
  );
}
