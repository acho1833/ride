'use client';

import LayoutShell from './layout-shell';
import { Section, SubSection } from './section';
import { Grid, GridCard, DataTable, CodeBlock, Analogy, IC } from './doc-components';
import { Collapsible, Tabs, Step, Callout } from './interactive';
import MermaidDiagram from './mermaid-diagram';
import type { NavItem } from './sidebar-nav';

/* ── Navigation Items ──────────────────────────────────────────────── */

const NAV_ITEMS: NavItem[] = [
  { id: 'what-is-spreadline', label: 'What is SpreadLine?', number: 1, color: 'blue' },
  { id: 'glossary', label: 'Glossary', number: 2, color: 'cyan' },
  { id: 'data-model', label: 'Data Model', number: 3, color: 'green' },
  { id: 'server-architecture', label: 'Server Architecture', number: 4, color: 'purple' },
  { id: 'api-specification', label: 'API Specification', number: 5, color: 'indigo' },
  { id: 'client-architecture', label: 'Client Architecture', number: 6, color: 'amber' },
  { id: 'layout-engine', label: 'Layout Engine', number: 7, color: 'rose' },
  { id: 'd3-visualization', label: 'D3 Visualization', number: 8, color: 'emerald' },
  { id: 'configuration', label: 'Configuration', number: 9, color: 'orange' },
  { id: 'directory-structure', label: 'Directory Structure', number: 10, color: 'teal' },
  { id: 'data-flow', label: 'Data Flow', number: 11, color: 'violet' },
  { id: 'migration-guide', label: 'Migration Guide', number: 12, color: 'sky' },
  { id: 'faq', label: 'FAQ', number: 13, color: 'fuchsia' }
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function SpreadlineReviewPage() {
  return (
    <LayoutShell
      title="SpreadLine TDD"
      subtitle="Technical Design Document for Ego-Network Visualization"
      badge="v1.0"
      navItems={NAV_ITEMS}
    >
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: What is SpreadLine?                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="what-is-spreadline"
        number={1}
        title="What is SpreadLine?"
        color="blue"
        subtitle="An interactive visualization for exploring ego-centric dynamic networks"
      >
        <p className="text-muted-foreground">
          <strong>SpreadLine</strong> is a system that lets you explore how one person (or entity) connects to others over time. It answers
          the question:{' '}
          <em>&quot;Given one person, who did they interact with, when, and how are those people connected to each other?&quot;</em>
        </p>

        <Analogy>
          Imagine you&apos;re the main character in a TV show. SpreadLine shows you who appeared in scenes with you (your direct
          connections), who those people talked to (indirect connections), and how the cast changed across seasons (time). The
          &quot;ego&quot; is you &mdash; the camera follows you.
        </Analogy>

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

        <SubSection title="The Three Core Concepts">
          <Grid cols={3}>
            <GridCard title="Ego-Centric" icon="*" accent="border-l-blue-500">
              Everything revolves around one central entity (the &quot;ego&quot;). Other entities are defined by their distance: 1 hop =
              direct connection, 2 hops = friend-of-a-friend.
            </GridCard>
            <GridCard title="Dynamic" icon="*" accent="border-l-green-500">
              The network changes over time. Entities appear, disappear, and their connections shift across time periods (years or months).
            </GridCard>
            <GridCard title="Network" icon="*" accent="border-l-purple-500">
              Entities are connected via relationships (e.g., co-authorship). Each relationship has a time, a source, a target, and a
              weight.
            </GridCard>
          </Grid>
        </SubSection>

        <SubSection title="What the User Sees">
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
        </SubSection>

        <Analogy>
          Think of the UI like Google Maps with two views: the top panel is like satellite view (nodes floating in space showing
          connections), and the bottom panel is like street view (a timeline showing how those connections change). Clicking a pin in one
          view highlights it in the other.
        </Analogy>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: Glossary                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section id="glossary" number={2} title="Glossary" color="cyan" subtitle="Key terms you'll encounter throughout the codebase">
        <DataTable
          headers={['Term', 'Definition', 'Analogy']}
          rows={[
            ['Ego', 'The central entity the entire network is built around.', 'The main character in a movie'],
            ['Entity', 'Any node in the network (a person, organization, etc.).', 'A character in the cast'],
            ['Relationship', 'A connection between two entities at a point in time.', 'A scene where two characters appear together'],
            [
              'Hop Distance',
              'How many edges to traverse to reach an entity from the ego. Hop 1 = direct, Hop 2 = through one intermediary.',
              'Degrees of separation (like "6 degrees of Kevin Bacon")'
            ],
            [
              'Time Block',
              'A single time period (e.g., "2020" or "2020-03"). Each column in the chart is one time block.',
              'One episode/season of the show'
            ],
            [
              'Topology',
              'The list of all connections (edges) with source, target, time, and weight.',
              'The complete script listing every scene between characters'
            ],
            [
              'Category',
              '"internal" (same affiliation as ego) or "external" (different). Determines line color.',
              'Same team vs. rival team'
            ],
            [
              'Groups',
              'Per-time-block arrays that define vertical ordering. Has 2*hopLimit+1 slots.',
              'Seating chart — who sits above and below the ego'
            ],
            [
              'BFS',
              'Breadth-First Search. Algorithm to discover entities within N hops.',
              'Ripples spreading outward when you drop a stone in water'
            ],
            ['Storyline', "A visual line representing one entity's path through time.", 'A character arc weaving through episodes'],
            ['Pinning', 'Highlighting specific entities across all views.', 'Highlighting a character with a marker across all scenes'],
            ['Granularity', '"yearly" or "monthly" time resolution.', 'Zooming in from season-level to episode-level']
          ]}
        />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: Data Model                                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="data-model"
        number={3}
        title="Data Model"
        color="green"
        subtitle="The three CSV files and TypeScript types that drive everything"
      >
        <Analogy>
          Think of the data like a movie database: <strong>relations.csv</strong> lists every scene (who appeared with whom and when),{' '}
          <strong>entities.csv</strong> lists every actor (with their studio affiliation per year), and <strong>citations.csv</strong> links
          specific movies to the actors who starred in them.
        </Analogy>

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
                    All data comes from three CSV files stored in <IC>data/spreadline/vis-author2/</IC> (yearly) and{' '}
                    <IC>data/spreadline/vis-author2-monthly/</IC> (monthly).
                  </p>

                  <Collapsible title="relations.csv" badge="edges" defaultOpen>
                    <p className="text-muted-foreground mb-2">
                      Each row is one relationship (edge) between two entities at a point in time. Think of it as: &quot;Person A and Person
                      B worked together on artifact X in year Y.&quot;
                    </p>
                    <CodeBlock filename="relations.csv">
                      {`year,sourceId,targetId,id,type,citationcount,count
2002,p1199,p0500,paper123,Co-co-author,5,1
2003,p1199,p0700,paper456,Co-co-author,12,1`}
                    </CodeBlock>
                  </Collapsible>

                  <Collapsible title="entities.csv" badge="nodes">
                    <p className="text-muted-foreground mb-2">
                      Each row is an entity at a specific time period. An entity can appear in multiple years with different affiliations
                      (e.g., a researcher who changed universities).
                    </p>
                    <CodeBlock filename="entities.csv">
                      {`id,name,year,relationshipcount,affiliation
p1199,Jeffrey Heer,2005,42,University of California, Berkeley, USA
p1199,Jeffrey Heer,2010,156,Stanford University, USA`}
                    </CodeBlock>
                  </Collapsible>

                  <Collapsible title="citations.csv" badge="weights">
                    <p className="text-muted-foreground mb-2">
                      Maps relationship artifacts to entities and their relationship counts. Used to compute edge weights and entity
                      metadata.
                    </p>
                    <CodeBlock filename="citations.csv">
                      {`entityId,year,relationshipcount,affiliation,paperID
p1199,2005,42,University of California,paper123
p0500,2005,15,Stanford University,paper123`}
                    </CodeBlock>
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
                      The complete API response. This is THE single data structure that drives all three visualizations.
                    </p>
                    <CodeBlock language="TypeScript">
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
                    </CodeBlock>
                  </Collapsible>

                  <Collapsible title="TopologyEntry" badge="edge">
                    <CodeBlock language="TypeScript">
                      {`interface TopologyEntry {
  sourceId: string;  // First entity ID
  targetId: string;  // Second entity ID
  time: string;      // Time period (e.g., "2020")
  weight: number;    // Edge weight (always 1 from BFS, aggregated later)
}`}
                    </CodeBlock>
                  </Collapsible>

                  <Collapsible title="EntityInfo" badge="node metadata">
                    <CodeBlock language="TypeScript">
                      {`interface EntityInfo {
  name: string;                         // Display name
  category: 'internal' | 'external';    // Affiliation category
  relationships: Record<string, number>; // time -> relationship count
}`}
                    </CodeBlock>
                  </Collapsible>

                  <Collapsible title="RelationEvent" badge="detail view">
                    <CodeBlock language="TypeScript">
                      {`interface RelationEvent {
  id: string;            // Unique artifact ID (e.g., paper ID)
  year: string;          // Time period
  sourceId: string;      // First entity ID
  targetId: string;      // Second entity ID
  type: string;          // Relationship type
  relationshipCount: number; // Weight
}`}
                    </CodeBlock>
                  </Collapsible>

                  <Collapsible title="SpreadlineGraphNode & SpreadlineGraphLink" badge="D3 types">
                    <CodeBlock language="TypeScript">
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
                    </CodeBlock>
                  </Collapsible>
                </div>
              )
            },
            {
              label: 'Groups Structure',
              content: (
                <div>
                  <p className="text-muted-foreground mb-4">
                    The <IC>groups</IC> field is the most complex part of the response. For each time block, it contains a 2D array with{' '}
                    <IC>2 * hopLimit + 1</IC> slots.
                  </p>

                  <Analogy>
                    Think of groups like a stadium seating chart. The ego sits in the center row. &quot;External&quot; entities (different
                    team) sit in the rows above, and &quot;internal&quot; entities (same team) sit below. The farther an entity is connected
                    (more hops), the farther from center they sit.
                  </Analogy>

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

                  <Grid>
                    <GridCard title="External (Teal #166b6b)" accent="border-l-teal-600">
                      Different affiliation from ego. Positioned ABOVE ego in the chart.
                    </GridCard>
                    <GridCard title="Internal (Orange #FA9902)" accent="border-l-orange-500">
                      Same affiliation as ego. Positioned BELOW ego in the chart.
                    </GridCard>
                  </Grid>
                </div>
              )
            }
          ]}
        />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: Server-Side Architecture                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="server-architecture"
        number={4}
        title="Server-Side Architecture"
        color="purple"
        subtitle="How raw CSV data gets processed into the API response"
      >
        <Analogy>
          The server is like a chef in a kitchen. Raw ingredients (CSV files) are loaded from the pantry (file system), filtered by recipe
          (relation types + year range), cooked through BFS (finding who connects to whom), plated into groups (visual arrangement), and
          served one course at a time (pagination).
        </Analogy>

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
          Every file in the <IC>server/</IC> directory must have it.
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
                  <Analogy>
                    Like a library that photocopies a book the first time someone borrows it. Every future request gets the photocopy
                    instantly instead of going back to the shelf.
                  </Analogy>
                  <CodeBlock filename="csv.utils.ts">
                    {`import Papa from 'papaparse';

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
                  </CodeBlock>
                </div>
              )
            },
            {
              label: 'BFS Algorithm',
              content: (
                <div>
                  <Analogy>
                    BFS is like dropping a stone in a pond. The first ripple reaches entities 1 hop away (direct connections). The second
                    ripple reaches 2 hops away (friend-of-a-friend). You stop at the ripple number set by <IC>hopLimit</IC>.
                  </Analogy>

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
                    caption="Sequence diagram showing BFS network construction and group assignment"
                  />

                  <CodeBlock filename="entity-network.utils.ts (simplified)">
                    {`for (const [time, entries] of Object.entries(byTime)) {
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
                  </CodeBlock>
                </div>
              )
            },
            {
              label: 'Data Service',
              content: (
                <div>
                  <p className="text-muted-foreground mb-4">
                    The <IC>getSpreadlineRawData()</IC> function orchestrates the entire pipeline. Think of it as the main recipe that calls
                    each cooking step in order.
                  </p>
                  <CodeBlock filename="spreadline-data.service.ts (simplified)">
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
                  </CodeBlock>
                  <Callout type="tip" title="Pagination">
                    Time blocks are sorted newest-first, then sliced into pages of 20. If the last page has fewer than 20 blocks, it&apos;s
                    padded with synthetic earlier time labels to keep column count consistent across pages.
                  </Callout>
                </div>
              )
            }
          ]}
        />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: API Specification                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="api-specification"
        number={5}
        title="API Specification"
        color="indigo"
        subtitle="Two endpoints power the entire visualization"
      >
        <Analogy>
          The API is like a restaurant menu with two items. The first dish (&quot;getRawData&quot;) gives you the full meal &mdash; all the
          network data for one page of time. The second dish (&quot;getRelationEvents&quot;) is a side order &mdash; details about specific
          relationships when you click on a connection.
        </Analogy>

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
          caption="Full API request lifecycle from component to service and back"
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
                  <DataTable
                    headers={['Parameter', 'Type', 'Default', 'Description']}
                    rows={[
                      ['egoId', 'string', '—', 'Central entity ID'],
                      ['relationTypes', 'string[]', '—', 'Types to include (e.g., ["Co-co-author"])'],
                      ['yearRange', '[number, number]', '—', 'Start and end year'],
                      ['granularity', '"yearly" | "monthly"', '"yearly"', 'Time resolution'],
                      ['splitByAffiliation', 'boolean', 'true', 'Distinguish internal/external'],
                      ['pageIndex', 'number', '0', 'Zero-based page'],
                      ['pageSize', 'number', '20', 'Blocks per page'],
                      ['hopLimit', 'number (1-5)', '2', 'Max BFS depth']
                    ]}
                  />
                  <CodeBlock filename="Hook usage">
                    {`import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useSpreadlineRawDataQuery = (params) => {
  return useQuery(orpc.spreadline.getRawData.queryOptions({ input: params }));
};`}
                  </CodeBlock>
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
                    Returns individual relationship events between two specific entities. Triggered when clicking a link in the graph.
                  </p>
                  <DataTable
                    headers={['Parameter', 'Type', 'Description']}
                    rows={[
                      ['sourceId', 'string', 'First entity ID'],
                      ['targetId', 'string', 'Second entity ID']
                    ]}
                  />
                  <CodeBlock filename="Hook usage">
                    {`export const useRelationEventsQuery = (sourceId, targetId) => {
  return useQuery({
    ...orpc.spreadline.getRelationEvents.queryOptions({
      input: { sourceId, targetId }
    }),
    enabled: !!sourceId && !!targetId  // Only fetch when both IDs set
  });
};`}
                  </CodeBlock>
                </div>
              )
            }
          ]}
        />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 6: Client-Side Architecture                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="client-architecture"
        number={6}
        title="Client-Side Architecture"
        color="amber"
        subtitle="Components, state management, and data transformation"
      >
        <Analogy>
          The client side is like a control room with TV monitors. The <IC>SpreadlineTabComponent</IC> is the control panel operator. It
          receives data from the API, transforms it into the right format for each monitor (force graph, storyline, timeline), and
          coordinates them &mdash; when you press a button on one monitor, the others respond.
        </Analogy>

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
          caption="Component tree. SpreadlineTabComponent owns all state and passes it down via props."
        />

        <Collapsible title="State Management Details" defaultOpen>
          <p className="text-muted-foreground mb-4">
            All state lives in <IC>SpreadlineTabComponent</IC> as React <IC>useState</IC> hooks. A module-level LRU cache (10 entries)
            preserves state across tab unmount/remount.
          </p>
          <CodeBlock filename="spreadline-tab.component.tsx (key state)">
            {`const [selectedRange, setSelectedRange] = useState<[number, number] | null>([0, 0]);
const [pinnedEntityNames, setPinnedEntityNames] = useState<string[]>([]);
const [relationTypes, setRelationTypes] = useState<string[]>(['Co-co-author']);
const [granularity, setGranularity] = useState<SpreadlineGranularity>('yearly');
const [splitByAffiliation, setSplitByAffiliation] = useState(true);
const [pageIndex, setPageIndex] = useState(0);
const [blocksFilter, setBlocksFilter] = useState(1);
const [activeBottomTab, setActiveBottomTab] = useState<SpreadlineBottomTab>('spreadline');
const [hopLimit, setHopLimit] = useState(2);`}
          </CodeBlock>
        </Collapsible>

        <Collapsible title="Utility Transform Functions">
          <p className="text-muted-foreground mb-3">
            These pure functions convert the API response into formats needed by each visualization:
          </p>
          <DataTable
            headers={['Function', 'Input', 'Output']}
            rows={[
              ['transformSpreadlineToGraph()', 'Raw response', 'Nodes + links across ALL times'],
              ['transformSpreadlineToGraphByTime()', 'Response + time', 'Nodes + links for ONE time block'],
              ['transformSpreadlineToGraphByTimes()', 'Response + time range', 'Nodes + links for MULTIPLE blocks'],
              ['transformSpreadlineToTimeline()', 'Raw response', 'TimelineEntity[] for timeline chart'],
              ['deduplicateLinks()', 'Topology + node IDs', 'Aggregated links (deduped)'],
              ['bfsDistances()', 'Start ID + links', 'Map of ID to shortest distance']
            ]}
          />
        </Collapsible>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 7: SpreadLine Layout Engine                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="layout-engine"
        number={7}
        title="SpreadLine Layout Engine"
        color="rose"
        subtitle="A 5-phase pipeline that computes where storylines should be drawn"
      >
        <p className="text-muted-foreground">
          The layout engine lives in <IC>src/lib/spreadline/</IC> and is a TypeScript port of a Python academic library. It computes
          vertical positions for storylines.
        </p>

        <Analogy>
          Imagine organizing spaghetti noodles on a plate so they don&apos;t tangle. Phase 1 decides the top-to-bottom order. Phase 2
          straightens noodles horizontally. Phase 3 squeezes out gaps. Phase 4 nudges overlapping noodles apart. Phase 5 draws the final
          curves.
        </Analogy>

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

        <Collapsible title="Phase Details" defaultOpen>
          <DataTable
            headers={['Phase', 'File', 'What It Does']}
            rows={[
              [
                '1. Ordering',
                'order.ts',
                'Determines vertical order at each time block to minimize edge crossings. Uses a barycenter heuristic.'
              ],
              [
                '2. Aligning',
                'align.ts',
                'Snaps entities to consistent Y positions across adjacent blocks so lines are as horizontal as possible.'
              ],
              ['3. Compacting', 'compact.ts', 'Removes unnecessary vertical whitespace, squeezing the chart to minimal height.'],
              [
                '4. Contextualizing',
                'contextualize.ts',
                'Runs a D3 force simulation for final position refinement and collision detection.'
              ],
              ['5. Rendering', 'render.ts', 'Converts final positions into SVG paths (bezier curves), labels, marks, and blocks.']
            ]}
          />
        </Collapsible>

        <Collapsible title="Usage Code Example">
          <CodeBlock filename="How to use the SpreadLine class">
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
          </CodeBlock>
        </Collapsible>

        <Collapsible title="Output: SpreadLineResult">
          <CodeBlock language="TypeScript">
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
          </CodeBlock>
        </Collapsible>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 8: D3 Visualization Layer                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="d3-visualization"
        number={8}
        title="D3 Visualization Layer"
        color="emerald"
        subtitle="How React and D3 work together without fighting each other"
      >
        <Analogy>
          React and D3 both want to control the DOM &mdash; like two cooks grabbing the same spoon. The solution: React owns the
          &quot;kitchen&quot; (lifecycle, when to cook), and D3 owns the &quot;stove&quot; (SVG rendering, animations). React decides WHEN
          to render; D3 decides HOW to render.
        </Analogy>

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
          caption="React manages lifecycle, D3 manages ALL rendering and interaction"
        />

        <Callout type="important" title="Critical Rendering Separation">
          React re-renders ONLY when data, config, or resetKey changes. D3 handles ALL other updates: filtering, pinning, hover, zoom/pan,
          highlight bar drag, block collapse/expand. This ensures smooth D3 animations without React interference.
        </Callout>

        <Collapsible title="SpreadLineChart Props API" defaultOpen>
          <CodeBlock language="TypeScript">
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
          </CodeBlock>
        </Collapsible>

        <Collapsible title="Force-Directed Graph Setup">
          <p className="text-muted-foreground mb-3">
            The top panel uses D3&apos;s force simulation to arrange nodes in a physics-based layout:
          </p>
          <CodeBlock filename="spreadline-graph.component.tsx (simplified)">
            {`const simulation = d3.forceSimulation(nodes)
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
          </CodeBlock>
        </Collapsible>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 9: Configuration & Constants                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="configuration"
        number={9}
        title="Configuration & Constants"
        color="orange"
        subtitle="All tunable values are centralized in one file"
      >
        <p className="text-muted-foreground">
          All tunable values live in <IC>src/features/spreadlines/const.ts</IC>. This is the single source of truth for defaults, colors,
          and dimensions.
        </p>

        <Tabs
          tabs={[
            {
              label: 'Defaults',
              content: (
                <DataTable
                  headers={['Constant', 'Value', 'Purpose']}
                  rows={[
                    ['SPREADLINE_DEFAULT_EGO_ID', '"p1199"', 'Demo ego entity'],
                    ['SPREADLINE_DEFAULT_YEAR_RANGE', '[2002, 2022]', 'Default time range'],
                    ['SPREADLINE_DEFAULT_HOP_LIMIT', '2', 'Default BFS depth'],
                    ['SPREADLINE_MAX_HOP_LIMIT', '5', 'Maximum BFS depth'],
                    ['SPREADLINE_PAGE_SIZE', '20', 'Blocks per API page']
                  ]}
                />
              )
            },
            {
              label: 'Colors',
              content: (
                <div>
                  <Grid>
                    {[
                      {
                        name: 'INTERNAL',
                        color: '#FA9902',
                        desc: 'Same affiliation as ego'
                      },
                      {
                        name: 'EXTERNAL',
                        color: '#166b6b',
                        desc: 'Different affiliation'
                      },
                      {
                        name: 'SELECTED',
                        color: 'hsl(270, 65%, 55%)',
                        desc: 'Pinned/selected entities'
                      }
                    ].map(c => (
                      <div key={c.name} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="h-8 w-8 flex-shrink-0 rounded-md border" style={{ backgroundColor: c.color }} />
                        <div>
                          <div className="font-mono text-xs">{c.name}</div>
                          <div className="text-muted-foreground text-sm">{c.desc}</div>
                        </div>
                      </div>
                    ))}
                  </Grid>
                  <SubSection title="Frequency Heatmap Colors (low to high)">
                    <div className="flex gap-1">
                      {['#ffffff', '#fcdaca', '#e599a6', '#c94b77', '#740980'].map(c => (
                        <div key={c} className="h-8 flex-1 rounded border" style={{ backgroundColor: c }} title={c} />
                      ))}
                    </div>
                    <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                      <span>Low activity</span>
                      <span>High activity</span>
                    </div>
                  </SubSection>
                </div>
              )
            },
            {
              label: 'Dimensions',
              content: (
                <DataTable
                  headers={['Constant', 'Value', 'Usage']}
                  rows={[
                    ['SPREADLINE_MIN_WIDTH_PER_TIMESTAMP', '200px', 'Minimum column width'],
                    ['SPREADLINE_CHART_HEIGHT', '1000px', 'Layout height'],
                    ['GRAPH_HOP1_LINK_DISTANCE', '100px', 'Hop-1 link distance'],
                    ['GRAPH_TIME_TRANSITION_MS', '600ms', 'Animation duration'],
                    ['NETWORK_TIMELINE_ROW_HEIGHT', '32px', 'Timeline row height']
                  ]}
                />
              )
            }
          ]}
        />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 10: Directory Structure                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="directory-structure"
        number={10}
        title="Directory Structure"
        color="teal"
        subtitle="Three directories, each with a clear responsibility"
      >
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

        <Analogy>
          Think of it like a restaurant chain: <strong>features/spreadlines</strong> is the specific restaurant (menu, staff, kitchen),{' '}
          <strong>lib/spreadline</strong> is the recipe book (reusable across restaurants), and <strong>lib/spreadline-viz</strong> is the
          plating guide (how to present the dish).
        </Analogy>

        <Collapsible title="Full File Tree" defaultOpen>
          <CodeBlock>
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
          </CodeBlock>
        </Collapsible>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 11: Data Flow                                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="data-flow"
        number={11}
        title="Data Flow"
        color="violet"
        subtitle="End-to-end journey of data from user action to rendered pixels"
      >
        <SubSection title="End-to-End Request Flow">
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
            caption="Complete sequence from user action to rendered visualization"
          />
        </SubSection>

        <SubSection title="User Interaction Flow">
          <p className="text-muted-foreground mb-4">
            Most interactions stay client-side. Only filter changes and page navigation trigger new API calls.
          </p>
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
            caption="Map of user interactions to system responses"
          />
        </SubSection>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 12: Migration Guide                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="migration-guide"
        number={12}
        title="Migration Guide"
        color="sky"
        subtitle="Step-by-step instructions to move SpreadLine into your project"
      >
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
          <CodeBlock>
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
          </CodeBlock>
        </Step>

        <Step number={2} title="Copy Layout Engine (standalone library)">
          <CodeBlock>{`cp -r src/lib/spreadline/ <your-project>/src/lib/spreadline/`}</CodeBlock>
          <p>
            This is self-contained. No external dependencies beyond D3. Run <IC>spreadline.test.ts</IC> to verify.
          </p>
        </Step>

        <Step number={3} title="Copy D3 Visualization Layer">
          <CodeBlock>{`cp -r src/lib/spreadline-viz/ <your-project>/src/lib/spreadline-viz/`}</CodeBlock>
          <p>
            Imports constants from <IC>features/spreadlines/const.ts</IC> &mdash; you&apos;ll need to update paths or copy those constants.
          </p>
        </Step>

        <Step number={4} title="Copy Data Models">
          <CodeBlock>{`cp src/models/relation-event.model.ts <your-project>/src/models/`}</CodeBlock>
          <p>
            The key types (TopologyEntry, EntityInfo, SpreadlineRawDataResponse) are defined inline in service/router files, not in separate
            model files.
          </p>
        </Step>

        <Step number={5} title="Copy the Feature Directory">
          <CodeBlock>{`cp -r src/features/spreadlines/ <your-project>/src/features/spreadlines/`}</CodeBlock>
          <p>
            Includes server/, hooks/, components/, utils/, and const.ts. Update import paths to match your project&apos;s <IC>@/</IC> alias.
          </p>
        </Step>

        <Step number={6} title="Copy CSV Data Files">
          <CodeBlock>{`cp -r data/spreadline/ <your-project>/data/spreadline/`}</CodeBlock>
          <p>This copies the demo dataset. If using your own data, create CSVs in the same format (Section 3).</p>
        </Step>

        <Step number={7} title="Set Up the API Layer">
          <CodeBlock filename="Your main router file (if using ORPC)">
            {`import { spreadlineRouter } from '@/features/spreadlines/server/routers';
export const router = {
  // ...your routers...
  spreadline: spreadlineRouter
};

// If using a different API framework (tRPC, REST, etc.):
// 1. Create equivalent endpoints for getRawData and getRelationEvents
// 2. Use the same Zod schemas from routers.ts
// 3. Update hooks to call your framework`}
          </CodeBlock>
        </Step>

        <Step number={8} title="Update Import Paths">
          <CodeBlock>
            {`# Key imports to search and fix:
@/lib/orpc/orpc            → Your API client path
@/lib/orpc                 → Your ORPC procedure definitions
@/components/ui/*          → Your Shadcn component paths
@/features/relationship-evidence/const → Just has MAX_RELATION_EVENTS (a number)
                                         Define locally to remove cross-feature dep`}
          </CodeBlock>
        </Step>

        <Step number={9} title="Create a Host Page">
          <CodeBlock filename="src/app/spreadline/page.tsx">
            {`import SpreadlineTabComponent from
  '@/features/spreadlines/components/spreadline-tab.component';

export default function SpreadlinePage() {
  return (
    <div className="h-screen w-full">
      <SpreadlineTabComponent fileId="default" fileName="spreadline" />
    </div>
  );
}`}
          </CodeBlock>
        </Step>

        <Step number={10} title="Handle Store Dependency">
          <p>
            <IC>SpreadlineTabComponent</IC> imports <IC>useOpenFilesActions</IC> (Zustand store for tab titles). Either remove the import +
            useEffect that calls <IC>updateOpenFileTitle</IC> (cosmetic only), or create a no-op stub hook.
          </p>
        </Step>

        <Step number={11} title="Adapt to Your Own Data">
          <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
            <li>Prepare three CSV files matching Section 3 format</li>
            <li>
              Place in <IC>data/spreadline/your-dataset/</IC>
            </li>
            <li>
              Update <IC>DATASET_DIRS</IC> in service
            </li>
            <li>
              Update <IC>SPREADLINE_DEFAULT_EGO_ID</IC> in const.ts
            </li>
            <li>
              Update <IC>SPREADLINE_DEFAULT_YEAR_RANGE</IC>
            </li>
            <li>
              Update <IC>SPREADLINE_RELATION_TYPE_OPTIONS</IC>
            </li>
            <li>
              Replace <IC>remapJHAffiliation()</IC> with your own normalization
            </li>
          </ol>
        </Step>

        <Step number={12} title="Run Tests">
          <CodeBlock>
            {`npm test -- --testPathPattern="spreadline"
# Should run 7 test files, all passing`}
          </CodeBlock>
        </Step>

        <Step number={13} title="Build and Verify">
          <CodeBlock>
            {`npm run build   # Catch TypeScript errors
npm run dev      # Navigate to your spreadline page`}
          </CodeBlock>
          <p>
            Verify: graph shows nodes/links, chart shows storylines, scrubber works, clicking pins entities, filters work, pagination loads
            new pages.
          </p>
        </Step>

        <Step number={14} title="Optional: Replace CSV with Database">
          <p>
            Replace the three <IC>loadCSV()</IC> calls in <IC>spreadline-data.service.ts</IC> with database queries. The rest of the
            function (network construction, pagination) stays exactly the same. Data must return the same shape as <IC>RelationRow</IC>,{' '}
            <IC>EntityRow</IC>, <IC>RelationshipRow</IC>.
          </p>
        </Step>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 13: FAQ                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section
        id="faq"
        number={13}
        title="Frequently Asked Questions"
        color="fuchsia"
        subtitle="Common questions from developers working with SpreadLine"
      >
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
            'It\'s specific to the demo dataset. Raw affiliation strings vary (e.g., "UC Berkeley" vs "University of California, Berkeley"). It normalizes them so internal/external classification works correctly. Replace with your own normalization or remove if your data is clean.'
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
      </Section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="mt-8 border-t pt-8 text-center">
        <p className="text-muted-foreground text-sm">SpreadLine Technical Design Document &mdash; Generated from codebase analysis</p>
        <p className="text-muted-foreground mt-1 text-xs">Last updated: 2026-03-05</p>
      </footer>
    </LayoutShell>
  );
}
