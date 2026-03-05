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
            <li>
              <a href="#what-is-spreadline" className="hover:text-primary">
                1. What is SpreadLine?
              </a>
            </li>
            <li>
              <a href="#glossary" className="hover:text-primary">
                2. Glossary
              </a>
            </li>
            <li>
              <a href="#data-model" className="hover:text-primary">
                3. Data Model
              </a>
            </li>
            <li>
              <a href="#server-architecture" className="hover:text-primary">
                4. Server-Side Architecture
              </a>
            </li>
            <li>
              <a href="#api-specification" className="hover:text-primary">
                5. API Specification
              </a>
            </li>
            <li>
              <a href="#client-architecture" className="hover:text-primary">
                6. Client-Side Architecture
              </a>
            </li>
            <li>
              <a href="#layout-engine" className="hover:text-primary">
                7. SpreadLine Layout Engine
              </a>
            </li>
            <li>
              <a href="#d3-visualization" className="hover:text-primary">
                8. D3 Visualization Layer
              </a>
            </li>
            <li>
              <a href="#configuration" className="hover:text-primary">
                9. Configuration &amp; Constants
              </a>
            </li>
            <li>
              <a href="#directory-structure" className="hover:text-primary">
                10. Directory Structure
              </a>
            </li>
            <li>
              <a href="#data-flow" className="hover:text-primary">
                11. Data Flow
              </a>
            </li>
            <li>
              <a href="#migration-guide" className="hover:text-primary">
                12. Migration Guide (Step-by-Step)
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-primary">
                13. FAQ
              </a>
            </li>
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

            <h3 className="mt-4 text-lg font-semibold">The Three Core Concepts</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-2">
              <li>
                <strong>Ego-centric</strong> &mdash; Everything revolves around one central entity (the &quot;ego&quot;). All other entities
                are defined by their relationship distance from the ego (1 hop = direct connection, 2 hops = friend-of-a-friend, etc.).
              </li>
              <li>
                <strong>Dynamic</strong> &mdash; The network changes over time. Entities appear, disappear, and their connections shift
                across time periods (years or months).
              </li>
              <li>
                <strong>Network</strong> &mdash; Entities are connected via relationships (e.g., co-authorship on a paper). Each
                relationship has a time, a source, a target, and a weight.
              </li>
            </ul>

            <h3 className="mt-4 text-lg font-semibold">What the User Sees</h3>
            <p className="text-muted-foreground">The interface has two panels in a resizable split layout:</p>
            <ol className="text-muted-foreground list-inside list-decimal space-y-3">
              <li>
                <strong>Top Panel &mdash; Force-Directed Graph:</strong> A D3 node-link diagram showing the ego at center, surrounded by
                connected entities. Nodes are positioned by &quot;hop distance&quot; from the ego. The graph updates when you select
                different time periods using the scrubber.
              </li>
              <li>
                <strong>Bottom Panel &mdash; Timeline View (two tabs):</strong>
                <ul className="mt-1 ml-6 list-inside list-disc space-y-1">
                  <li>
                    <strong>Spreadline Chart:</strong> A storyline visualization where each entity is a horizontal line that weaves through
                    time columns. Lines are grouped and colored by affiliation category (internal/external). This is the core
                    &quot;SpreadLine&quot; visualization, ported from an academic Python library.
                  </li>
                  <li>
                    <strong>Network Timeline:</strong> A simpler dot-and-line timeline where each entity is a row, with dots at each time
                    block colored by relationship frequency.
                  </li>
                </ul>
              </li>
            </ol>

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
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Ego</td>
                    <td className="py-2">The central entity the entire network is built around.</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Entity</td>
                    <td className="py-2">Any node in the network (a person, organization, etc.).</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Relationship</td>
                    <td className="py-2">A connection between two entities at a point in time (e.g., co-authorship).</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Hop Distance</td>
                    <td className="py-2">
                      How many edges you must traverse to reach an entity from the ego. Hop 1 = directly connected. Hop 2 = connected
                      through one intermediary.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Time Block</td>
                    <td className="py-2">
                      A single time period (one year like &quot;2020&quot; or one month like &quot;2020-03&quot;). Each column in the
                      spreadline chart is one time block.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Topology</td>
                    <td className="py-2">The list of all connections (edges) in the network with source, target, time, and weight.</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Category</td>
                    <td className="py-2">
                      Either &quot;internal&quot; (same affiliation as ego) or &quot;external&quot; (different affiliation). Determines line
                      color.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Groups</td>
                    <td className="py-2">
                      Per-time-block arrays that define the vertical ordering of entities. Has <code>2*hopLimit + 1</code> slots: external
                      hops on top, ego in middle, internal hops on bottom.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">BFS</td>
                    <td className="py-2">Breadth-First Search. The algorithm used to discover entities within N hops of the ego.</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Storyline</td>
                    <td className="py-2">A visual line in the spreadline chart representing one entity&apos;s path through time.</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">Pinning</td>
                    <td className="py-2">Highlighting specific entities across all views (graph + chart) by clicking on them.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">Granularity</td>
                    <td className="py-2">
                      The time resolution: &quot;yearly&quot; (one column per year) or &quot;monthly&quot; (one column per month).
                    </td>
                  </tr>
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

          {/* 3a. CSV Files */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">3a. CSV Source Files</h3>
            <p className="text-muted-foreground mb-4">
              All data comes from three CSV files stored in <code className="bg-muted rounded px-1">data/spreadline/vis-author2/</code>{' '}
              (yearly) and <code className="bg-muted rounded px-1">data/spreadline/vis-author2-monthly/</code> (monthly). These are loaded
              at runtime by the server using PapaParse.
            </p>

            <h4 className="mt-4 mb-2 font-semibold">relations.csv</h4>
            <p className="text-muted-foreground mb-2">Each row is one relationship (edge) between two entities at a point in time.</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`year,sourceId,targetId,id,type,citationcount,count
2002,p1199,p0500,paper123,Co-co-author,5,1
2003,p1199,p0700,paper456,Co-co-author,12,1`}
            </pre>
            <div className="overflow-x-auto">
              <table className="mb-4 w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-4 text-left">Column</th>
                    <th className="py-1 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">year</td>
                    <td className="py-1">Time period (e.g., &quot;2002&quot; or &quot;2002-03&quot;)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">sourceId</td>
                    <td className="py-1">ID of the first entity</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">targetId</td>
                    <td className="py-1">ID of the second entity</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">id</td>
                    <td className="py-1">Unique identifier for the relationship artifact (e.g., paper ID)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">type</td>
                    <td className="py-1">Relationship type (e.g., &quot;Co-co-author&quot;)</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-mono">citationcount</td>
                    <td className="py-1">Number of citations for this artifact</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="mt-4 mb-2 font-semibold">entities.csv</h4>
            <p className="text-muted-foreground mb-2">
              Each row is an entity at a specific time period (entities can appear in multiple years with different affiliations).
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`id,name,year,relationshipcount,affiliation
p1199,Jeffrey Heer,2005,42,University of California, Berkeley, USA
p1199,Jeffrey Heer,2010,156,Stanford University, USA`}
            </pre>
            <div className="overflow-x-auto">
              <table className="mb-4 w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-4 text-left">Column</th>
                    <th className="py-1 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">id</td>
                    <td className="py-1">Unique entity ID</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">name</td>
                    <td className="py-1">Human-readable name</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">year</td>
                    <td className="py-1">Time period</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">relationshipcount</td>
                    <td className="py-1">Number of relationships in that period</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-mono">affiliation</td>
                    <td className="py-1">Organization the entity belongs to in that period</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="mt-4 mb-2 font-semibold">citations.csv</h4>
            <p className="text-muted-foreground mb-2">
              Maps relationship artifacts to entities and their relationship counts (used to compute per-entity relationship totals).
            </p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`entityId,year,relationshipcount,affiliation,paperID
p1199,2005,42,University of California,paper123
p0500,2005,15,Stanford University,paper123`}
            </pre>
          </div>

          {/* 3b. TypeScript Types */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">3b. TypeScript Interfaces</h3>
            <p className="text-muted-foreground mb-4">
              These are the key TypeScript types used throughout the codebase. Each has a matching Zod schema for API validation.
            </p>

            <h4 className="mt-4 mb-2 font-semibold">
              RelationEvent <span className="text-muted-foreground text-sm font-normal">(src/models/relation-event.model.ts)</span>
            </h4>
            <p className="text-muted-foreground mb-2">Represents a single interaction between two entities at a point in time.</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`interface RelationEvent {
  id: string;            // Unique artifact ID (e.g., paper ID)
  year: string;          // Time period (e.g., "2005")
  sourceId: string;      // First entity ID
  targetId: string;      // Second entity ID
  type: string;          // Relationship type (e.g., "Co-co-author")
  relationshipCount: number; // Weight/count of this relationship
}`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">
              TopologyEntry <span className="text-muted-foreground text-sm font-normal">(server/services/spreadline-data.service.ts)</span>
            </h4>
            <p className="text-muted-foreground mb-2">A single edge in the network topology returned by the API.</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`interface TopologyEntry {
  sourceId: string;  // First entity ID
  targetId: string;  // Second entity ID
  time: string;      // Time period (e.g., "2020")
  weight: number;    // Edge weight (always 1 from BFS, aggregated later)
}`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">
              EntityInfo <span className="text-muted-foreground text-sm font-normal">(server/services/spreadline-data.service.ts)</span>
            </h4>
            <p className="text-muted-foreground mb-2">Metadata about a single entity in the network (does not include the ego).</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`interface EntityInfo {
  name: string;                         // Display name
  category: 'internal' | 'external';    // Affiliation category
  relationships: Record<string, number>; // time -> relationship count
}`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">
              SpreadlineRawDataResponse{' '}
              <span className="text-muted-foreground text-sm font-normal">(server/services/spreadline-data.service.ts)</span>
            </h4>
            <p className="text-muted-foreground mb-2">
              The complete API response for <code className="bg-muted rounded px-1">getRawData</code>. This is the main data structure
              driving all visualizations.
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
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

            <h4 className="mt-4 mb-2 font-semibold">
              Understanding the <code className="bg-muted rounded px-1">groups</code> Structure
            </h4>
            <p className="text-muted-foreground mb-2">
              The <code className="bg-muted rounded px-1">groups</code> field is the most complex part of the response. For each time block,
              it contains a 2D array with <code className="bg-muted rounded px-1">2 * hopLimit + 1</code> slots. With the default
              <code className="bg-muted rounded px-1">hopLimit = 2</code>, that&apos;s 5 slots:
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`groups["2020"] = [
  ["p0300", "p0400"],   // Index 0: External hop-2 (farthest)
  ["p0500", "p0600"],   // Index 1: External hop-1
  ["p1199"],            // Index 2: Ego (always center)
  ["p0700", "p0800"],   // Index 3: Internal hop-1
  ["p0900"]             // Index 4: Internal hop-2 (farthest)
]

// Visual layout (top to bottom):
//   External 2-hop  (farthest from ego, different affiliation)
//   External 1-hop  (direct connection, different affiliation)
//   ═══ EGO ═══
//   Internal 1-hop  (direct connection, same affiliation)
//   Internal 2-hop  (farthest from ego, same affiliation)`}
            </pre>
            <p className="text-muted-foreground">
              &quot;Internal&quot; means the entity shares an affiliation with the ego (e.g., same university). &quot;External&quot; means
              different affiliation. This determines line color in the chart: internal = orange (
              <code className="bg-muted rounded px-1">#FA9902</code>), external = teal (
              <code className="bg-muted rounded px-1">#166b6b</code>).
            </p>
          </div>

          {/* 3c. Graph Types */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">3c. Client-Side Graph Types</h3>
            <p className="text-muted-foreground mb-4">
              These types are used on the client to feed data into D3 force simulations and timeline charts. They are derived from the API
              response via utility transform functions.
            </p>

            <h4 className="mt-4 mb-2 font-semibold">
              SpreadlineGraphNode <span className="text-muted-foreground text-sm font-normal">(features/spreadlines/utils/index.ts)</span>
            </h4>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`interface SpreadlineGraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  isEgo: boolean;
  collaborationCount: number;  // Number of topology entries for this node
  totalRelationships: number;  // Sum of edge weights
  hopDistance?: number;        // 0 = ego, 1 = direct, 2+ = indirect
  category?: 'internal' | 'external' | 'ego';
  x?: number; y?: number;     // D3 simulation positions
  fx?: number | null;         // Fixed x position (for pinning)
  fy?: number | null;         // Fixed y position (for pinning)
}`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">
              SpreadlineGraphLink <span className="text-muted-foreground text-sm font-normal">(features/spreadlines/utils/index.ts)</span>
            </h4>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`interface SpreadlineGraphLink extends SimulationLinkDatum<SpreadlineGraphNode> {
  source: string | SpreadlineGraphNode;
  target: string | SpreadlineGraphNode;
  weight: number;       // Aggregated relationship count
  paperCount: number;   // Number of distinct shared artifacts
  years: string[];      // Time periods where this link exists
}`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">
              TimelineEntity <span className="text-muted-foreground text-sm font-normal">(features/spreadlines/utils/index.ts)</span>
            </h4>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`interface TimelineEntity {
  id: string;
  name: string;
  isEgo: boolean;
  totalActivity: number;  // Number of time blocks with activity
  lifespan: number;       // Same as totalActivity
  timeBlocks: Array<{
    time: string;              // Time period label
    relationshipCount: number; // Relationships in this period
  }>;
}`}
            </pre>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 4: Server-Side Architecture                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="server-architecture" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">4. Server-Side Architecture</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Overview</h3>
            <p className="text-muted-foreground mb-4">The server side has three layers:</p>
            <ol className="text-muted-foreground mb-4 list-inside list-decimal space-y-2">
              <li>
                <strong>CSV Loading</strong> &mdash; Reads CSV files from disk and caches them in memory.
              </li>
              <li>
                <strong>Entity Network Construction</strong> &mdash; Runs BFS from the ego to build the N-hop network, assigns categories.
              </li>
              <li>
                <strong>Data Service</strong> &mdash; Orchestrates everything: loads CSVs, constructs the network, computes relationships,
                paginates results.
              </li>
            </ol>
            <p className="text-muted-foreground">
              All server files live under <code className="bg-muted rounded px-1">src/features/spreadlines/server/</code> and begin with{' '}
              <code className="bg-muted rounded px-1">import &apos;server-only&apos;</code> to prevent accidental client-side imports.
            </p>
          </div>

          {/* 4a. CSV Loading */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">4a. CSV Loading (csv.utils.ts)</h3>
            <p className="text-muted-foreground mb-4">
              A simple utility that reads CSV files using PapaParse and caches the parsed results in a module-level{' '}
              <code className="bg-muted rounded px-1">Map</code>. Once a file is loaded, subsequent calls return the cached data instantly.
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// csv.utils.ts
import 'server-only';
import { promises as fs } from 'fs';
import Papa from 'papaparse';

// TypeScript interface for relation rows
interface RelationRow {
  year: string;
  sourceId: string;
  targetId: string;
  id: string;
  type: string;
  relationshipcount?: number;
}

// In-memory cache: file path -> parsed rows
const csvCache = new Map<string, unknown[]>();

// Parse a CSV file with headers and dynamic typing. Results are cached.
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
            <p className="text-muted-foreground">
              <strong>Key point for migration:</strong> You need to bring your own CSV files in the same format, or adapt the loading
              functions to read from a database or API instead. The cache is simple but effective for file-based data that doesn&apos;t
              change at runtime.
            </p>
          </div>

          {/* 4b. Entity Network Construction */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">4b. Entity Network Construction (entity-network.utils.ts)</h3>
            <p className="text-muted-foreground mb-4">
              This is the core algorithm. It builds an ego-centric network using Breadth-First Search (BFS). Here&apos;s what it does step
              by step:
            </p>

            <h4 className="mt-4 mb-2 font-semibold">Step 1: BFS Per Time Block</h4>
            <p className="text-muted-foreground mb-2">
              For each time block, run BFS starting from the ego up to <code className="bg-muted rounded px-1">hopLimit</code> hops. This
              discovers all entities within N hops of the ego <em>in that specific time period</em>.
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Simplified BFS logic from constructEgoNetworks()
function constructEgoNetworks(data, egoId, hopLimit) {
  // Group relations by time period
  const byTime = groupByTime(data);

  for (const [time, entries] of Object.entries(byTime)) {
    const distMap = new Map();     // entity -> hop distance
    distMap.set(egoId, 0);         // ego is at distance 0
    let waitlist = new Set([egoId]);
    let hop = 1;

    while (waitlist.size > 0 && hop <= hopLimit) {
      const nextWaitlist = [];
      for (const entity of waitlist) {
        // Find all neighbors of this entity in this time block
        const neighbors = findNeighbors(entries, entity);
        for (const neighbor of neighbors) {
          if (!distMap.has(neighbor)) {
            distMap.set(neighbor, hop);  // Record hop distance
            nextWaitlist.push(neighbor);
          }
        }
      }
      waitlist = new Set(nextWaitlist);
      hop++;
    }
    hopDistances[time] = distMap;
  }
}`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">Step 2: Category Assignment</h4>
            <p className="text-muted-foreground mb-2">
              Each entity is classified as &quot;internal&quot; or &quot;external&quot; by comparing their affiliation to the ego&apos;s
              affiliation in the same year. If affiliations overlap, the entity is internal.
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Category assignment logic
const egoAffiliations = getAffiliations(egoId, year);
const entityAffiliations = getAffiliations(entityId, year);
const isInternal = entityAffiliations.some(a => egoAffiliations.includes(a));
const category = isInternal ? 'internal' : 'external';`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">Step 3: Group Assignment</h4>
            <p className="text-muted-foreground mb-2">
              Entities are placed into group slots based on their hop distance and category. Internal entities go to the right of ego
              (indices <code className="bg-muted rounded px-1">egoIdx + hopDist</code>), external entities go to the left (indices{' '}
              <code className="bg-muted rounded px-1">egoIdx - hopDist</code>).
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Group layout: 2*hopLimit + 1 slots
// Example with hopLimit=2:
//   [0] External 2-hop
//   [1] External 1-hop
//   [2] EGO           <-- egoIdx = hopLimit
//   [3] Internal 1-hop
//   [4] Internal 2-hop

const groupIdx = isInternal
  ? egoIdx + hopDist   // Internal: right of ego
  : egoIdx - hopDist;  // External: left of ego`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">Step 4: Overlap Resolution &amp; Sorting</h4>
            <p className="text-muted-foreground">
              If an entity appears in multiple groups (different hops across time), the closest hop wins. Within each group, entities are
              sorted by their paper count (most active first for internal, least active first for external).
            </p>
          </div>

          {/* 4c. Data Service */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">4c. Data Service Orchestration (spreadline-data.service.ts)</h3>
            <p className="text-muted-foreground mb-4">
              The <code className="bg-muted rounded px-1">getSpreadlineRawData()</code> function is the main entry point. Here&apos;s the
              full flow:
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`async function getSpreadlineRawData(params) {
  // 1. Load all three CSV files in parallel
  const [relations, allEntities, relationships] = await Promise.all([
    loadCSV(path.join(basePath, 'relations.csv')),
    loadCSV(path.join(basePath, 'entities.csv')),
    loadCSV(path.join(basePath, 'citations.csv'))
  ]);

  // 2. Filter relations by type and year range
  relations = relations.filter(r =>
    relationTypes.includes(r.type) &&
    year >= yearRange[0] && year <= yearRange[1]
  );

  // 3. Build ID -> name lookup
  const idToName = {};
  for (const e of allEntities) idToName[e.id] = e.name;

  // 4. Construct ego-centric network (BFS + categories + groups)
  const { topology, categoryMap, groups, network } =
    constructEntityNetwork(egoId, relations, allEntities, hopLimit);

  // 5. Optionally merge external into internal (splitByAffiliation=false)
  if (!splitByAffiliation) { /* merge groups */ }

  // 6. Build per-entity relationship counts from citations.csv
  const relationshipsByEntity = {};
  // ...aggregate by entity and time

  // 7. Build entities map (excluding ego)
  const entities = {};
  for (const eid of entityIds) {
    entities[eid] = { name, category, relationships };
  }

  // 8. Server-side pagination
  const allTimeBlocks = [...unique times sorted newest-first...];
  const pageTimeBlocks = allTimeBlocks.slice(start, end);
  // Pad to pageSize if needed (consistent column count)

  // 9. Filter topology, entities, groups to current page
  return { egoId, egoName, dataset, entities, topology, groups, totalPages, timeBlocks };
}`}
            </pre>
            <p className="text-muted-foreground">
              <strong>Important:</strong> Pagination is server-side. The API returns only one page of time blocks at a time (default: 20
              blocks per page). The client requests different pages as the user navigates.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 5: API Specification                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="api-specification" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">5. API Specification</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Overview</h3>
            <p className="text-muted-foreground mb-4">
              SpreadLine exposes two API endpoints via ORPC (type-safe RPC framework). Both are registered under the{' '}
              <code className="bg-muted rounded px-1">spreadline</code> namespace in the main router at{' '}
              <code className="bg-muted rounded px-1">src/lib/orpc/router.ts</code>.
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// src/lib/orpc/router.ts
import { spreadlineRouter } from '@/features/spreadlines/server/routers';

export const router = {
  // ...other feature routers...
  spreadline: spreadlineRouter
};`}
            </pre>
          </div>

          {/* Endpoint 1 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-2 text-lg font-semibold">
              Endpoint 1: <code className="bg-muted rounded px-1">getRawData</code>
            </h3>
            <div className="bg-muted mb-4 inline-block rounded px-3 py-1 text-sm">
              <code>GET /api/rpc/spreadline/getRawData</code>
            </div>
            <p className="text-muted-foreground mb-4">
              Returns all data needed to render the SpreadLine visualization for one page of time blocks.
            </p>

            <h4 className="mt-4 mb-2 font-semibold">Input Parameters</h4>
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
                    <td className="py-2">ID of the central entity</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">relationTypes</td>
                    <td className="py-2 pr-4">string[]</td>
                    <td className="py-2 pr-4">&mdash;</td>
                    <td className="py-2">Types of relationships to include (e.g., [&quot;Co-co-author&quot;])</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">yearRange</td>
                    <td className="py-2 pr-4">[number, number]</td>
                    <td className="py-2 pr-4">&mdash;</td>
                    <td className="py-2">Start and end year (inclusive)</td>
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
                    <td className="py-2">Whether to distinguish internal/external</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">pageIndex</td>
                    <td className="py-2 pr-4">number</td>
                    <td className="py-2 pr-4">0</td>
                    <td className="py-2">Zero-based page index</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">pageSize</td>
                    <td className="py-2 pr-4">number</td>
                    <td className="py-2 pr-4">20</td>
                    <td className="py-2">Number of time blocks per page</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">hopLimit</td>
                    <td className="py-2 pr-4">number (1-5)</td>
                    <td className="py-2 pr-4">2</td>
                    <td className="py-2">Maximum BFS depth from ego</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="mt-4 mb-2 font-semibold">Output Schema</h4>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Zod schema from routers.ts
const spreadlineRawDataResponseSchema = z.object({
  egoId: z.string(),
  egoName: z.string(),
  dataset: z.string(),
  entities: z.record(z.string(), entityInfoSchema),
  topology: topologyEntrySchema.array(),
  groups: z.record(z.string(), z.array(z.array(z.string()))),
  totalPages: z.number(),
  timeBlocks: z.array(z.string())
});`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">Example Usage (Client Hook)</h4>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`// src/features/spreadlines/hooks/useSpreadlineRawDataQuery.ts
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useSpreadlineRawDataQuery = (params: {
  egoId: string;
  relationTypes: string[];
  yearRange: [number, number];
  granularity?: 'yearly' | 'monthly';
  splitByAffiliation?: boolean;
  pageIndex?: number;
  pageSize?: number;
  hopLimit?: number;
}) => {
  return useQuery(orpc.spreadline.getRawData.queryOptions({ input: params }));
};`}
            </pre>
          </div>

          {/* Endpoint 2 */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-2 text-lg font-semibold">
              Endpoint 2: <code className="bg-muted rounded px-1">getRelationEvents</code>
            </h3>
            <div className="bg-muted mb-4 inline-block rounded px-3 py-1 text-sm">
              <code>GET /api/rpc/spreadline/getRelationEvents</code>
            </div>
            <p className="text-muted-foreground mb-4">
              Returns individual relationship events between two specific entities. Used when a user clicks a link in the graph to see
              details.
            </p>

            <h4 className="mt-4 mb-2 font-semibold">Input Parameters</h4>
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

            <h4 className="mt-4 mb-2 font-semibold">Output</h4>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Returns: RelationEvent[]
// Sorted by year descending (newest first)
// Limited to MAX_RELATION_EVENTS entries
[
  { id: "paper123", year: "2020", sourceId: "p1199", targetId: "p0500",
    type: "Co-co-author", relationshipCount: 15 },
  { id: "paper456", year: "2018", sourceId: "p0500", targetId: "p1199",
    type: "Co-co-author", relationshipCount: 8 }
]`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">Example Usage (Client Hook)</h4>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`// src/features/spreadlines/hooks/useRelationEventsQuery.ts
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useRelationEventsQuery = (sourceId: string, targetId: string) => {
  return useQuery({
    ...orpc.spreadline.getRelationEvents.queryOptions({
      input: { sourceId, targetId }
    }),
    enabled: !!sourceId && !!targetId  // Don't fetch until both IDs are set
  });
};`}
            </pre>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 6: Client-Side Architecture                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="client-architecture" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">6. Client-Side Architecture</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Component Tree</h3>
            <p className="text-muted-foreground mb-4">
              The component hierarchy from top to bottom. The tab component is the main container and manages all shared state.
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`SpreadlineTabComponent (main container, manages all state)
├── useSpreadlineRawDataQuery()          ← fetches API data
├── ResizablePanelGroup                  ← split layout
│   ├── Top Panel
│   │   └── SpreadlineGraphComponent     ← D3 force-directed graph
│   │       ├── useGraphZoom()           ← zoom/pan controls
│   │       ├── transformSpreadlineToGraphByTime()  ← data transform
│   │       └── D3 force simulation      ← node positioning
│   │
│   └── Bottom Panel
│       ├── SpreadlineBottomTabsComponent ← tab switcher
│       └── (active tab)
│           ├── SpreadlineComponent       ← storyline chart
│           │   ├── SpreadLine library    ← layout computation
│           │   ├── SpreadLineChart       ← D3 visualization wrapper
│           │   ├── SpreadlineToolbar     ← filter controls
│           │   └── SpreadlineScrubber    ← time range selector
│           │
│           └── NetworkTimelineChartComponent ← dot-and-line timeline
│               ├── SpreadlineToolbar     ← filter controls
│               └── SpreadlineScrubber    ← time range selector`}
            </pre>
          </div>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">State Management</h3>
            <p className="text-muted-foreground mb-4">
              All visualization state lives in <code className="bg-muted rounded px-1">SpreadlineTabComponent</code> as React
              <code className="bg-muted rounded px-1">useState</code> hooks. State is passed down via props and callbacks. A module-level
              LRU cache (10 entries) preserves state across tab unmount/remount.
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
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
            <p className="text-muted-foreground">
              <strong>Data flow is one-way:</strong> parent owns state &rarr; passes to children via props &rarr; children notify parent via
              callbacks (e.g., <code className="bg-muted rounded px-1">onRangeChange</code>,
              <code className="bg-muted rounded px-1">onEntityPin</code>).
            </p>
          </div>

          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Utility Transform Functions</h3>
            <p className="text-muted-foreground mb-4">
              These functions convert the API response into D3-ready data structures. Located in{' '}
              <code className="bg-muted rounded px-1">src/features/spreadlines/utils/index.ts</code>.
            </p>
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
                    <td className="py-2 pr-4 font-mono text-sm">transformSpreadlineToGraph()</td>
                    <td className="py-2 pr-4">Raw API response</td>
                    <td className="py-2">Nodes + links aggregated across ALL times</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">transformSpreadlineToGraphByTime()</td>
                    <td className="py-2 pr-4">Raw API response + single time</td>
                    <td className="py-2">Nodes + links for ONE time block (with hop info)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">transformSpreadlineToGraphByTimes()</td>
                    <td className="py-2 pr-4">Raw API response + time range</td>
                    <td className="py-2">Nodes + links for MULTIPLE time blocks (min hop used)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">transformSpreadlineToTimeline()</td>
                    <td className="py-2 pr-4">Raw API response</td>
                    <td className="py-2">Timeline entities for the network timeline chart</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">deduplicateLinks()</td>
                    <td className="py-2 pr-4">Topology entries + node IDs</td>
                    <td className="py-2">Aggregated graph links (deduplicated by source-target pair)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-sm">bfsDistances()</td>
                    <td className="py-2 pr-4">Start ID + links</td>
                    <td className="py-2">Map of entity ID &rarr; shortest distance from start</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 7: SpreadLine Layout Engine                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="layout-engine" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">7. SpreadLine Layout Engine</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Overview</h3>
            <p className="text-muted-foreground mb-4">
              The layout engine lives in <code className="bg-muted rounded px-1">src/lib/spreadline/</code> and is a TypeScript port of a
              Python academic library. It computes the vertical positions of storylines in the spreadline chart. Think of it as the
              &quot;brain&quot; that decides where to place each entity&apos;s line so that the chart is readable and crossings are
              minimized.
            </p>

            <h3 className="mt-6 mb-4 text-lg font-semibold">The 5-Phase Pipeline</h3>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Usage:
import { SpreadLine } from '@/lib/spreadline';

const spreadline = new SpreadLine();

// Phase 0: Load topology data
spreadline.load(topologyRows, {
  source: 'source',
  target: 'target',
  time: 'time',
  weight: 'weight'
});

// Phase 1: Center on ego, set time parameters, provide groups
spreadline.center(
  'ego_entity_name',    // ego name
  undefined,            // timeExtents (auto-detect)
  'year',               // timeDelta
  '%Y',                 // timeFormat
  groups                // group constraints from API
);

// Phase 2: Run optimization + render
const result = spreadline.fit(width, height);
// result: SpreadLineResult with storylines, blocks, timeLabels, etc.`}
            </pre>

            <h4 className="mt-6 mb-2 font-semibold">Phase Breakdown</h4>
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
                      Determines the vertical order of entities at each time block to minimize edge crossings. Uses a barycenter heuristic.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-semibold">2. Aligning</td>
                    <td className="py-2 pr-4 font-mono">align.ts</td>
                    <td className="py-2">
                      Snaps entities to consistent Y positions across adjacent time blocks so lines are as horizontal as possible.
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
          </div>

          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Core Data Structures</h3>
            <p className="text-muted-foreground mb-4">
              The layout engine uses its own internal data structures (separate from the API types).
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Node: one entity at one timestamp
class Node {
  name: string;         // Entity name
  id: number;           // Index in entities array
  sessionID: number;    // Which session this belongs to
  timestamp: number;    // Time index
  order: number;        // Vertical position index
}

// Entity: one actor across all timestamps
class Entity {
  id: number;
  name: string;
  timeline: number[];   // Session ID at each timestamp (0 = absent)
}

// Session: one time-slice snapshot
class Session {
  id: number;
  entities: Node[];     // Entities present in this session
  hops: string[][];     // Group constraint arrays
  links: [string, string, number][];  // [source, target, weight]
  constraints: SessionConstraints;
  type: 'contact' | 'idle';
}`}
            </pre>

            <h4 className="mt-4 mb-2 font-semibold">Output: SpreadLineResult</h4>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`interface SpreadLineResult {
  bandWidth: number;       // Width of each time column
  blockWidth: number;      // Total chart width
  ego: string;             // Ego entity name
  timeLabels: { label: string; posX: number }[];  // Time axis labels
  heightExtents: [number, number];                 // [minY, maxY]
  storylines: StorylineResult[];                   // One per entity
  blocks: BlockResult[];                           // One per time block
}

interface StorylineResult {
  name: string;          // Entity name
  lines: string[];       // SVG path strings (bezier curves)
  marks: MarkResult[];   // Dot markers at each time block
  label: LabelResult;    // Name label position
  color: string;         // Line color
  lifespan: number;      // Number of active time blocks
}

interface BlockResult {
  id: number;
  time: string;          // Time label
  points: PointResult[]; // Entity positions in this block
  hopSections: { tops: HopSectionInfo[]; bottoms: HopSectionInfo[] };
}`}
            </pre>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 8: D3 Visualization Layer                        */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="d3-visualization" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">8. D3 Visualization Layer</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Overview</h3>
            <p className="text-muted-foreground mb-4">
              The D3 visualization layer lives in <code className="bg-muted rounded px-1">src/lib/spreadline-viz/</code>. It takes the{' '}
              <code className="bg-muted rounded px-1">SpreadLineResult</code> from the layout engine and renders it as interactive SVG using
              D3.js. There are two key parts:
            </p>
            <ol className="text-muted-foreground list-inside list-decimal space-y-2">
              <li>
                <strong>SpreadLinesVisualizer</strong> (class) &mdash; The D3 rendering engine. Creates SVG elements, handles interactions
                (hover, click, brush, collapse), manages animations.
              </li>
              <li>
                <strong>SpreadLineChart</strong> (React component) &mdash; A <code className="bg-muted rounded px-1">forwardRef</code>{' '}
                wrapper that bridges React and D3. React handles lifecycle; D3 handles rendering and interaction.
              </li>
            </ol>
          </div>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Critical Rendering Separation</h3>
            <p className="text-muted-foreground mb-4">This is the most important architectural decision in the visualization layer:</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// REACT re-renders ONLY when:
//   - data changes (new API response)
//   - config changes
//   - resetKey changes (force re-init)
//
// D3 handles ALL other updates:
//   - Filtering (blocksFilter, crossingOnly)
//   - Pinning entities
//   - Hover effects
//   - Zoom/pan
//   - Highlight bar drag
//   - Block collapse/expand`}
            </pre>
            <p className="text-muted-foreground mb-4">
              This separation ensures smooth D3 animations without React interference. Filter changes go through
              <code className="bg-muted rounded px-1">useEffect</code> hooks that call D3 methods directly, not through re-renders.
            </p>
          </div>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">SpreadLineChart API (React Component)</h3>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`interface SpreadLineChartProps {
  data: SpreadLineData;                    // Layout result from SpreadLine engine
  config?: Partial<SpreadLineConfig>;      // Visual configuration overrides
  onFilterChange?: (names: string[]) => void;  // Filtered entity names
  onTimeClick?: (timeLabel: string) => void;   // Time column click
  onHighlightRangeChange?: (start: string, end: string) => void;  // Drag range
  onEntityPin?: (names: string[]) => void;      // Pinned entity change
  pinnedEntityNames?: string[];            // External pin state
  highlightTimes?: string[];               // Time columns to highlight
  blocksFilter?: number;                   // Min lifespan filter
  crossingOnly?: boolean;                  // Show only crossing lines
  resetKey?: number;                       // Increment to force re-init
  className?: string;
}

// Imperative handle (accessed via ref)
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
          </div>

          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Force-Directed Graph (SpreadlineGraphComponent)</h3>
            <p className="text-muted-foreground mb-4">
              The top panel graph is a separate D3 force simulation (not using the SpreadLine library). It lives in{' '}
              <code className="bg-muted rounded px-1">features/spreadlines/components/spreadline-graph.component.tsx</code>.
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Force simulation setup (simplified)
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id)
    .distance(d => d.hopDistance === 1 ? 100 : 200))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide(20))
  .force('radial', d3.forceRadial(120, width / 2, height / 2)
    .strength(d => d.hopDistance === 1 ? 0.3 : 0));`}
            </pre>
            <p className="text-muted-foreground">
              <strong>Key behaviors:</strong> Ego is centered and larger. Hop-1 nodes orbit in a circle. Hop-2+ nodes float farther out.
              Link thickness/color scales with relationship weight. Time changes trigger smooth D3 transitions (600ms).
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 9: Configuration & Constants                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="configuration" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">9. Configuration &amp; Constants</h2>

          <div className="bg-card rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              All tunable values are centralized in <code className="bg-muted rounded px-1">src/features/spreadlines/const.ts</code>. This
              file is the single source of truth for defaults, colors, dimensions, and behavior.
            </p>

            <h3 className="mt-4 mb-4 text-lg font-semibold">Default Values</h3>
            <div className="overflow-x-auto">
              <table className="mb-6 w-full text-sm">
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
                    <td className="py-2">Maximum allowed BFS depth</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_PAGE_SIZE</td>
                    <td className="py-2 pr-4">20</td>
                    <td className="py-2">Time blocks per API page</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-4 mb-4 text-lg font-semibold">Colors</h3>
            <div className="overflow-x-auto">
              <table className="mb-6 w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left">Constant</th>
                    <th className="py-2 pr-4 text-left">Value</th>
                    <th className="py-2 text-left">Usage</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_INTERNAL_COLOR</td>
                    <td className="py-2 pr-4">#FA9902 (orange)</td>
                    <td className="py-2">Entities sharing ego&apos;s affiliation</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_EXTERNAL_COLOR</td>
                    <td className="py-2 pr-4">#166b6b (teal)</td>
                    <td className="py-2">Entities with different affiliation</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_SELECTED_COLOR</td>
                    <td className="py-2 pr-4">hsl(270, 65%, 55%) (violet)</td>
                    <td className="py-2">Pinned/selected entities</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">SPREADLINE_FREQUENCY_COLORS</td>
                    <td className="py-2 pr-4">[white &rarr; dark purple]</td>
                    <td className="py-2">Heatmap scale (5 levels)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">GRAPH_LINK_COLORS</td>
                    <td className="py-2 pr-4">[tan &rarr; purple]</td>
                    <td className="py-2">Graph link stroke colors (5 levels)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-4 mb-4 text-lg font-semibold">Dimensions &amp; Layout</h3>
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
                    <td className="py-2">Layout computation height</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">GRAPH_HOP1_LINK_DISTANCE</td>
                    <td className="py-2 pr-4">100px</td>
                    <td className="py-2">Force link distance for hop-1</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">GRAPH_HOP1_RADIAL_RADIUS</td>
                    <td className="py-2 pr-4">120px</td>
                    <td className="py-2">Radial force target for hop-1</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">GRAPH_TIME_TRANSITION_MS</td>
                    <td className="py-2 pr-4">600ms</td>
                    <td className="py-2">Animation duration on time change</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">NETWORK_TIMELINE_ROW_HEIGHT</td>
                    <td className="py-2 pr-4">32px</td>
                    <td className="py-2">Height per entity row in timeline</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 10: Directory Structure                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="directory-structure" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">10. Directory Structure</h2>

          <div className="bg-card rounded-lg p-6">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`# Feature code (the main feature)
src/features/spreadlines/
├── components/
│   ├── spreadline-tab.component.tsx            # Main container + state management
│   ├── spreadline.component.tsx                # Storyline chart (bottom panel)
│   ├── spreadline-graph.component.tsx          # Force-directed graph (top panel)
│   ├── network-timeline-chart.component.tsx    # Dot-and-line timeline (alt tab)
│   ├── spreadline-toolbar.component.tsx        # Filter controls bar
│   ├── spreadline-scrubber.component.tsx       # Time range selector with animation
│   └── spreadline-bottom-tabs.component.tsx    # Tab switcher (Spreadline / Timeline)
├── hooks/
│   ├── useSpreadlineRawDataQuery.ts            # Fetches getRawData from API
│   ├── useRelationEventsQuery.ts               # Fetches getRelationEvents from API
│   └── useGraphZoom.ts                         # D3 zoom/pan behavior for graph
├── utils/
│   ├── index.ts                                # Graph/timeline data transforms
│   ├── index.test.ts                           # Unit tests for transforms
│   ├── drag-cursor.ts                          # Custom drag cursor utility
│   └── drag-cursor.test.ts                     # Tests for drag cursor
├── server/
│   ├── routers.ts                              # ORPC endpoint definitions (2 endpoints)
│   └── services/
│       ├── spreadline-data.service.ts          # Main orchestrator (CSV → network → response)
│       ├── spreadline-data.service.test.ts     # Service tests
│       ├── entity-network.utils.ts             # BFS network construction algorithm
│       ├── entity-network.utils.test.ts        # Network algorithm tests
│       ├── csv.utils.ts                        # CSV file loading with cache
│       ├── csv.utils.test.ts                   # CSV loading tests
│       ├── relation-event.service.ts           # Relation event queries
│       └── relation-event.service.test.ts      # Relation event tests
└── const.ts                                    # ALL configuration constants

# Layout engine (standalone library, reusable)
src/lib/spreadline/
├── spreadline.ts        # Main SpreadLine class (5-phase pipeline)
├── spreadline.test.ts   # Tests
├── types.ts             # Core types: Path, Node, Entity, Session, Result types
├── constructors.ts      # Ego filtering, network construction
├── order.ts             # Phase 1: Ordering (minimize crossings)
├── align.ts             # Phase 2: Alignment (horizontal consistency)
├── compact.ts           # Phase 3: Compaction (minimize whitespace)
├── contextualize.ts     # Phase 4: Force simulation refinement
├── render.ts            # Phase 5: Convert to SVG paths
├── helpers.ts           # Date parsing, grouping, deduplication
└── index.ts             # Public exports

# D3 visualization layer (bridges layout engine → interactive SVG)
src/lib/spreadline-viz/
├── spreadline-visualizer.ts  # D3 rendering class (hover, click, brush, collapse)
├── spreadline-types.ts       # D3-specific types, config, helper functions
├── spreadline-chart.tsx      # React wrapper component (forwardRef)
├── spreadline-d3-utils.ts    # D3 utilities (text measurement, theme colors)
└── index.ts                  # Public exports

# Data models (shared across features)
src/models/
├── entity.model.ts            # Entity type + Zod schema
├── entity-response.model.ts   # API response types
├── relationship.model.ts      # Relationship type + Zod schema
└── relation-event.model.ts    # Relation event type + Zod schema

# Data files (CSV datasets)
data/spreadline/
├── vis-author2/               # Yearly granularity
│   ├── relations.csv
│   ├── entities.csv
│   └── citations.csv
└── vis-author2-monthly/       # Monthly granularity
    ├── relations.csv
    ├── entities.csv
    └── citations.csv`}
            </pre>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 11: Data Flow                                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="data-flow" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">11. Data Flow</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">End-to-End Request Flow</h3>
            <p className="text-muted-foreground mb-4">Here is the complete data flow from user action to rendered visualization:</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`USER ACTION: Opens a .sl file (or changes filter)
    │
    ▼
SpreadlineTabComponent
    │  Constructs params: { egoId, relationTypes, yearRange, granularity, ... }
    │
    ▼
useSpreadlineRawDataQuery(params)
    │  React Query hook → ORPC client call
    │
    ▼
GET /api/rpc/spreadline/getRawData
    │  Next.js catch-all route → ORPC handler
    │
    ▼
spreadline-data.service.ts :: getSpreadlineRawData()
    │
    ├── loadCSV('relations.csv')    ← cached in memory after first load
    ├── loadCSV('entities.csv')     ← cached in memory after first load
    ├── loadCSV('citations.csv')    ← cached in memory after first load
    │
    ├── Filter relations by type + year range
    │
    ├── constructEntityNetwork()
    │   ├── constructEgoNetworks()   ← BFS per time block
    │   ├── Category assignment      ← internal vs external
    │   ├── Group assignment         ← 2*hopLimit+1 slots
    │   └── Overlap resolution       ← closest hop wins
    │
    ├── Build relationship counts per entity per time
    ├── Server-side pagination (slice timeBlocks)
    │
    └── Return SpreadlineRawDataResponse
            │
            ▼
    BACK IN THE BROWSER
            │
            ▼
SpreadlineTabComponent receives { data }
    │
    ├─── TOP PANEL (Force Graph)
    │    │
    │    ├── transformSpreadlineToGraphByTime(data, selectedTime)
    │    │   └── Produces: { nodes: SpreadlineGraphNode[], links: SpreadlineGraphLink[] }
    │    │
    │    └── D3 Force Simulation
    │        ├── forceLink (hop-aware distances)
    │        ├── forceManyBody (repulsion)
    │        ├── forceRadial (hop-1 orbit)
    │        └── forceCollide (prevent overlap)
    │            │
    │            └── SVG Rendering: circles + lines + labels
    │
    └─── BOTTOM PANEL (Spreadline Chart or Network Timeline)
         │
         ├── SPREADLINE CHART PATH:
         │   ├── new SpreadLine()
         │   │   .load(topology, config)
         │   │   .center(ego, ..., groups)
         │   │   .fit(width, height)
         │   │   └── Returns SpreadLineResult
         │   │
         │   └── new SpreadLinesVisualizer(result, config)
         │       .visualize(svgElement)
         │       └── SVG Rendering: paths + blocks + labels + tooltips
         │
         └── NETWORK TIMELINE PATH:
             ├── transformSpreadlineToTimeline(data)
             │   └── Produces: TimelineEntity[]
             │
             └── D3 Direct Rendering
                 └── SVG: rows of dots + connecting lines`}
            </pre>
          </div>

          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Interaction Flow</h3>
            <p className="text-muted-foreground mb-4">
              User interactions stay client-side (no additional API calls except for relation events).
            </p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`USER INTERACTION                    WHAT HAPPENS
─────────────────                   ─────────────
Time scrubber drag/click     →  selectedRange changes
                             →  Graph re-renders for that time block
                             →  Highlight bar moves on spreadline chart

Click entity on graph        →  Pinned entity toggled
                             →  Both graph + chart highlight that entity

Click graph link             →  useRelationEventsQuery(source, target)
                             →  API call to get detailed events
                             →  Shows tooltip/panel with event list

Change filter (toolbar)      →  Toolbar updates parent state via callback
                             →  New API call if server-side param changed
                             →  Or D3 direct update if client-side filter

Page navigation (arrows)     →  pageIndex changes
                             →  New API call with new pageIndex
                             →  Entire visualization re-renders

Zoom/pan (Ctrl+wheel/drag)   →  D3 zoom transform applied to SVG group
                             →  No React re-render, purely D3`}
            </pre>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 12: Migration Guide                              */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="migration-guide" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">12. Migration Guide (Step-by-Step)</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Prerequisites</h3>
            <p className="text-muted-foreground mb-4">Your target project must have:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Next.js 14+ with App Router</li>
              <li>TypeScript</li>
              <li>React 18+</li>
              <li>Tailwind CSS</li>
              <li>Shadcn/ui components (ResizablePanel, Button, Select, Slider, Tabs)</li>
            </ul>
          </div>

          {/* Step 1 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 1: Install Dependencies</h3>
            <p className="text-muted-foreground mb-2">Install the npm packages that SpreadLine depends on:</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Core visualization
npm install d3 @types/d3

# CSV parsing (server-side)
npm install papaparse @types/papaparse

# Data fetching
npm install @tanstack/react-query

# Zod for validation (likely already installed)
npm install zod`}
            </pre>
            <p className="text-muted-foreground mb-2">Install required Shadcn components if not already present:</p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`npx shadcn@latest add resizable
npx shadcn@latest add button
npx shadcn@latest add select
npx shadcn@latest add slider
npx shadcn@latest add tabs
npx shadcn@latest add tooltip`}
            </pre>
          </div>

          {/* Step 2 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 2: Copy the Layout Engine Library</h3>
            <p className="text-muted-foreground mb-2">This is the standalone core library. Copy the entire directory as-is:</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Copy the layout engine (no external dependencies beyond D3)
cp -r src/lib/spreadline/ <your-project>/src/lib/spreadline/`}
            </pre>
            <p className="text-muted-foreground mb-2">Files you&apos;re copying:</p>
            <ul className="text-muted-foreground mb-4 list-inside list-disc space-y-1">
              <li>
                <code className="bg-muted rounded px-1">spreadline.ts</code> &mdash; Main class with load/center/fit pipeline
              </li>
              <li>
                <code className="bg-muted rounded px-1">types.ts</code> &mdash; Path, Node, Entity, Session, all result types
              </li>
              <li>
                <code className="bg-muted rounded px-1">constructors.ts</code> &mdash; Ego filtering and network construction
              </li>
              <li>
                <code className="bg-muted rounded px-1">order.ts</code> &mdash; Phase 1: Ordering optimization
              </li>
              <li>
                <code className="bg-muted rounded px-1">align.ts</code> &mdash; Phase 2: Alignment optimization
              </li>
              <li>
                <code className="bg-muted rounded px-1">compact.ts</code> &mdash; Phase 3: Space compaction
              </li>
              <li>
                <code className="bg-muted rounded px-1">contextualize.ts</code> &mdash; Phase 4: Force simulation refinement
              </li>
              <li>
                <code className="bg-muted rounded px-1">render.ts</code> &mdash; Phase 5: SVG path generation
              </li>
              <li>
                <code className="bg-muted rounded px-1">helpers.ts</code> &mdash; Date/time utilities
              </li>
              <li>
                <code className="bg-muted rounded px-1">index.ts</code> &mdash; Public exports
              </li>
            </ul>
            <p className="text-muted-foreground">
              <strong>Verification:</strong> Run the existing tests (<code className="bg-muted rounded px-1">spreadline.test.ts</code>) in
              your project to confirm the library works independently.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 3: Copy the D3 Visualization Layer</h3>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Copy the D3 visualization wrapper
cp -r src/lib/spreadline-viz/ <your-project>/src/lib/spreadline-viz/`}
            </pre>
            <p className="text-muted-foreground mb-2">Files you&apos;re copying:</p>
            <ul className="text-muted-foreground mb-4 list-inside list-disc space-y-1">
              <li>
                <code className="bg-muted rounded px-1">spreadline-visualizer.ts</code> &mdash; D3 rendering class
              </li>
              <li>
                <code className="bg-muted rounded px-1">spreadline-types.ts</code> &mdash; D3-specific types and config
              </li>
              <li>
                <code className="bg-muted rounded px-1">spreadline-chart.tsx</code> &mdash; React wrapper component
              </li>
              <li>
                <code className="bg-muted rounded px-1">spreadline-d3-utils.ts</code> &mdash; D3 utility functions
              </li>
              <li>
                <code className="bg-muted rounded px-1">index.ts</code> &mdash; Public exports
              </li>
            </ul>
            <p className="text-muted-foreground">
              <strong>Note:</strong> This layer imports constants from{' '}
              <code className="bg-muted rounded px-1">features/spreadlines/const.ts</code>. You&apos;ll need to either copy those constants
              or update the import paths.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 4: Copy Data Models</h3>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Copy the model files you need
cp src/models/relation-event.model.ts <your-project>/src/models/`}
            </pre>
            <p className="text-muted-foreground">
              The <code className="bg-muted rounded px-1">entity.model.ts</code> and{' '}
              <code className="bg-muted rounded px-1">relationship.model.ts</code> are used by the entity-search feature, not directly by
              SpreadLine. You only strictly need
              <code className="bg-muted rounded px-1">relation-event.model.ts</code> from the models directory. The key types
              (TopologyEntry, EntityInfo, SpreadlineRawDataResponse) are defined inline in the service and router files.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 5: Copy the Feature Directory</h3>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Copy the entire feature
cp -r src/features/spreadlines/ <your-project>/src/features/spreadlines/`}
            </pre>
            <p className="text-muted-foreground mb-4">This includes:</p>
            <ul className="text-muted-foreground mb-4 list-inside list-disc space-y-1">
              <li>
                <code className="bg-muted rounded px-1">server/</code> &mdash; API router + services
              </li>
              <li>
                <code className="bg-muted rounded px-1">hooks/</code> &mdash; React Query hooks
              </li>
              <li>
                <code className="bg-muted rounded px-1">components/</code> &mdash; All UI components
              </li>
              <li>
                <code className="bg-muted rounded px-1">utils/</code> &mdash; Data transform utilities
              </li>
              <li>
                <code className="bg-muted rounded px-1">const.ts</code> &mdash; All configuration
              </li>
            </ul>
            <p className="text-muted-foreground">
              <strong>Important:</strong> Update import paths in the copied files to match your project&apos;s path aliases. The source uses{' '}
              <code className="bg-muted rounded px-1">@/</code> as a path alias for <code className="bg-muted rounded px-1">src/</code>.
            </p>
          </div>

          {/* Step 6 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 6: Copy CSV Data Files</h3>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Copy the data directory
cp -r data/spreadline/ <your-project>/data/spreadline/`}
            </pre>
            <p className="text-muted-foreground">
              This copies the demo dataset. If you&apos;re using your own data, create CSV files in the same format (see Section 3a) and
              update the <code className="bg-muted rounded px-1">DATASET_DIRS</code> paths in
              <code className="bg-muted rounded px-1">spreadline-data.service.ts</code>.
            </p>
          </div>

          {/* Step 7 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 7: Set Up the API Layer</h3>
            <p className="text-muted-foreground mb-2">
              This project uses ORPC for type-safe API calls. If your project also uses ORPC, register the router:
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// In your main router file:
import { spreadlineRouter } from '@/features/spreadlines/server/routers';

export const router = {
  // ...your existing routers...
  spreadline: spreadlineRouter
};`}
            </pre>
            <p className="text-muted-foreground mb-2">
              If your project uses a different API framework (tRPC, REST, etc.), you&apos;ll need to:
            </p>
            <ol className="text-muted-foreground list-inside list-decimal space-y-1">
              <li>
                Create equivalent endpoints for <code className="bg-muted rounded px-1">getRawData</code> and{' '}
                <code className="bg-muted rounded px-1">getRelationEvents</code>
              </li>
              <li>Use the same input/output types (Zod schemas are already defined in the router file)</li>
              <li>Update the hooks to call your API framework instead of ORPC</li>
            </ol>
          </div>

          {/* Step 8 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 8: Update Import Paths</h3>
            <p className="text-muted-foreground mb-2">Search and replace import paths that reference project-specific locations:</p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Key imports to check:
@/lib/orpc/orpc           → Your ORPC/API client path
@/lib/orpc                → Your ORPC procedure definitions
@/lib/spreadline          → Should work if you copied to same path
@/lib/spreadline-viz      → Should work if you copied to same path
@/components/ui/*         → Your Shadcn component paths
@/features/spreadlines/*  → Should work if you copied to same path
@/models/*                → Your models directory
@/features/relationship-evidence/const  → Contains MAX_RELATION_EVENTS (just a number constant)`}
            </pre>
            <p className="text-muted-foreground">
              <strong>Tip:</strong> The <code className="bg-muted rounded px-1">MAX_RELATION_EVENTS</code> constant from
              <code className="bg-muted rounded px-1">relationship-evidence/const</code> is just a number (default: 100). You can define it
              locally in the spreadlines feature to remove the cross-feature dependency.
            </p>
          </div>

          {/* Step 9 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 9: Create a Page to Host the Component</h3>
            <p className="text-muted-foreground mb-2">
              The SpreadLine tab component is designed to be embedded in an editor-like environment. For a standalone page, create a simple
              wrapper:
            </p>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// src/app/spreadline/page.tsx
import SpreadlineTabComponent from '@/features/spreadlines/components/spreadline-tab.component';

export default function SpreadlinePage() {
  return (
    <div className="h-screen w-full">
      <SpreadlineTabComponent
        fileId="default"
        fileName="spreadline"
      />
    </div>
  );
}`}
            </pre>
            <p className="text-muted-foreground">
              <strong>Note:</strong> The component expects <code className="bg-muted rounded px-1">fileId</code> and
              <code className="bg-muted rounded px-1">fileName</code> props (used for tab caching). For standalone use, pass any stable
              string as <code className="bg-muted rounded px-1">fileId</code>.
            </p>
          </div>

          {/* Step 10 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 10: Handle the Open Files Store Dependency</h3>
            <p className="text-muted-foreground mb-2">
              The <code className="bg-muted rounded px-1">SpreadlineTabComponent</code> imports
              <code className="bg-muted rounded px-1">useOpenFilesActions</code> from a Zustand store (used to update tab titles). You have
              two options:
            </p>
            <ol className="text-muted-foreground list-inside list-decimal space-y-2">
              <li>
                <strong>Remove the dependency:</strong> Delete the
                <code className="bg-muted rounded px-1">useOpenFilesActions</code> import and the
                <code className="bg-muted rounded px-1">useEffect</code> that calls
                <code className="bg-muted rounded px-1">updateOpenFileTitle</code>. This is cosmetic functionality only.
              </li>
              <li>
                <strong>Create a stub:</strong> Create a no-op hook that returns empty actions.
              </li>
            </ol>
          </div>

          {/* Step 11 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 11: Adapt to Your Own Data</h3>
            <p className="text-muted-foreground mb-2">To use your own data instead of the demo dataset:</p>
            <ol className="text-muted-foreground mb-4 list-inside list-decimal space-y-2">
              <li>Prepare three CSV files in the format described in Section 3a</li>
              <li>
                Place them in <code className="bg-muted rounded px-1">data/spreadline/your-dataset/</code>
              </li>
              <li>
                Update <code className="bg-muted rounded px-1">DATASET_DIRS</code> in{' '}
                <code className="bg-muted rounded px-1">spreadline-data.service.ts</code>
              </li>
              <li>
                Update <code className="bg-muted rounded px-1">SPREADLINE_DEFAULT_EGO_ID</code> in{' '}
                <code className="bg-muted rounded px-1">const.ts</code> to your ego&apos;s ID
              </li>
              <li>
                Update <code className="bg-muted rounded px-1">SPREADLINE_DEFAULT_YEAR_RANGE</code> to match your data&apos;s time range
              </li>
              <li>
                Update <code className="bg-muted rounded px-1">SPREADLINE_RELATION_TYPE_OPTIONS</code> to match your relationship types
              </li>
              <li>
                If your data doesn&apos;t use affiliations, set <code className="bg-muted rounded px-1">splitByAffiliation</code> to
                <code className="bg-muted rounded px-1">false</code> by default
              </li>
              <li>
                The <code className="bg-muted rounded px-1">remapJHAffiliation()</code> function in{' '}
                <code className="bg-muted rounded px-1">entity-network.utils.ts</code> is specific to the Jeffrey Heer dataset. Replace it
                with your own affiliation normalization logic, or remove it if your affiliations are already clean
              </li>
            </ol>
          </div>

          {/* Step 12 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 12: Run Tests to Verify</h3>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Run all spreadline-related tests
npm test -- --testPathPattern="spreadline"

# Expected test files:
#   src/lib/spreadline/spreadline.test.ts
#   src/features/spreadlines/server/services/spreadline-data.service.test.ts
#   src/features/spreadlines/server/services/entity-network.utils.test.ts
#   src/features/spreadlines/server/services/csv.utils.test.ts
#   src/features/spreadlines/server/services/relation-event.service.test.ts
#   src/features/spreadlines/utils/index.test.ts
#   src/features/spreadlines/utils/drag-cursor.test.ts`}
            </pre>
            <p className="text-muted-foreground">All tests should pass. If any fail due to import path differences, fix the paths first.</p>
          </div>

          {/* Step 13 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 13: Build and Verify</h3>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`# Build the project to catch any TypeScript errors
npm run build

# Start dev server and navigate to your spreadline page
npm run dev
# Open http://localhost:3000/spreadline (or wherever you mounted it)`}
            </pre>
            <p className="text-muted-foreground mb-2">
              <strong>What to verify visually:</strong>
            </p>
            <ol className="text-muted-foreground list-inside list-decimal space-y-1">
              <li>Graph panel shows nodes and links with the ego centered</li>
              <li>Spreadline chart shows storylines with colored lines</li>
              <li>Time scrubber works (click dots, drag range)</li>
              <li>Graph updates when time selection changes</li>
              <li>Clicking entities pins/highlights them across both panels</li>
              <li>Toolbar filters work (relation type, granularity, hop limit)</li>
              <li>Pagination arrows load new pages</li>
            </ol>
          </div>

          {/* Step 14 */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Step 14: Optional &mdash; Replace CSV with Database</h3>
            <p className="text-muted-foreground mb-2">
              For production use, you may want to replace CSV file loading with database queries. The changes are confined to two service
              files:
            </p>
            <ol className="text-muted-foreground list-inside list-decimal space-y-2">
              <li>
                <strong>spreadline-data.service.ts</strong> &mdash; Replace the three{' '}
                <code className="bg-muted rounded px-1">loadCSV()</code> calls with database queries. The rest of the function (network
                construction, pagination) stays the same.
              </li>
              <li>
                <strong>relation-event.service.ts</strong> &mdash; Replace the <code className="bg-muted rounded px-1">loadCSV()</code> call
                with a database query for relation events.
              </li>
            </ol>
            <p className="text-muted-foreground mt-2">
              The data must return the same shape as the CSV rows (see <code className="bg-muted rounded px-1">RelationRow</code>,
              <code className="bg-muted rounded px-1">EntityRow</code>, <code className="bg-muted rounded px-1">RelationshipRow</code>{' '}
              interfaces).
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* SECTION 13: FAQ                                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section id="faq" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">13. FAQ</h2>

          <div className="space-y-6">
            {/* Q1 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: Why does the layout engine exist as a separate library from the D3 visualization?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> Separation of concerns. The layout engine (
                <code className="bg-muted rounded px-1">src/lib/spreadline/</code>) computes WHERE things go (coordinates, paths). The
                visualization layer (<code className="bg-muted rounded px-1">src/lib/spreadline-viz/</code>) handles HOW to render and
                interact with them (D3 SVG, hover effects, zoom). This means you could swap D3 for Canvas or WebGL without touching the
                layout engine.
              </p>
            </div>

            {/* Q2 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: Why is pagination server-side instead of client-side?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> With 20 years of monthly data, you&apos;d have 240+ time blocks. The BFS network construction and group
                assignment for all blocks is expensive. Server-side pagination means we only compute and transfer one page of data at a time
                (default: 20 blocks), keeping the response fast and the client lightweight.
              </p>
            </div>

            {/* Q3 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">
                Q: What is the <code className="bg-muted rounded px-1">remapJHAffiliation()</code> function for?
              </h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> It&apos;s specific to the Jeffrey Heer demo dataset. The raw affiliation strings vary (e.g., &quot;UC
                Berkeley&quot;, &quot;University of California, Berkeley&quot;). This function normalizes them into consistent names so the
                internal/external classification works correctly. When migrating with your own data, replace this with your own
                normalization or remove it if your affiliations are already consistent.
              </p>
            </div>

            {/* Q4 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: Can I change the number of hops?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> Yes. The <code className="bg-muted rounded px-1">hopLimit</code> parameter ranges from 1 to 5
                (configured in <code className="bg-muted rounded px-1">const.ts</code>). Higher hops = more entities in the network, but
                exponentially more computation and visual complexity. The default of 2 is a good balance.
              </p>
            </div>

            {/* Q5 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">
                Q: What happens when <code className="bg-muted rounded px-1">splitByAffiliation</code> is set to false?
              </h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> All entities are treated as &quot;internal&quot; (same color). The external group slots are emptied and
                their entities are merged into the corresponding internal group slots. This is useful when your data doesn&apos;t have
                meaningful affiliation information.
              </p>
            </div>

            {/* Q6 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: Why does the force graph use Ctrl+wheel for zoom instead of just wheel?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> To prevent accidental zooming when the user scrolls the page. The spreadline chart also lives in a
                scrollable container. Requiring Ctrl+wheel (or Cmd+wheel on Mac) makes zoom intentional.
              </p>
            </div>

            {/* Q7 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: How does the CSV caching work?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> Simple in-memory <code className="bg-muted rounded px-1">Map&lt;string, unknown[]&gt;</code> keyed by
                file path. Once a CSV is loaded, subsequent requests for the same file return the cached parsed data immediately. The cache
                lives for the lifetime of the Node.js process. There&apos;s a <code className="bg-muted rounded px-1">clearCSVCache()</code>{' '}
                function for testing. In production with serverless (e.g., Vercel), the cache resets on each cold start.
              </p>
            </div>

            {/* Q8 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">
                Q: What is <code className="bg-muted rounded px-1">import &apos;server-only&apos;</code> and why is it in every server file?
              </h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> It&apos;s a Next.js convention. When you add{' '}
                <code className="bg-muted rounded px-1">import &apos;server-only&apos;</code> to a file, the build will fail if any client
                component (directly or transitively) imports that file. This prevents accidental exposure of server-side code (like file
                system access or database queries) to the browser. Every file in the <code className="bg-muted rounded px-1">server/</code>{' '}
                directory must have it.
              </p>
            </div>

            {/* Q9 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: Can I use this with a different dataset format?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> Yes, but you&apos;ll need to adapt the data loading layer. The layout engine and visualization layer
                don&apos;t care about CSV format &mdash; they work with the{' '}
                <code className="bg-muted rounded px-1">SpreadlineRawDataResponse</code> structure. As long as your data service produces
                that shape, everything else works. You could load from a database, API, or any other source. See Step 14 in the Migration
                Guide.
              </p>
            </div>

            {/* Q10 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: What&apos;s the performance like with large datasets?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> The main bottleneck is the BFS network construction (server-side). For the demo dataset (~1000
                relations, ~200 entities, 20 years), the API responds in under 200ms. Server-side pagination keeps response sizes
                manageable. On the client, the layout engine (5 phases) takes 50-100ms for 20 time blocks. D3 rendering is nearly instant.
                For much larger datasets (10k+ entities), consider reducing the hop limit or pre-computing the network.
              </p>
            </div>

            {/* Q11 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: What does the &quot;minimize&quot; configuration in the layout engine do?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> It controls the layout optimization strategy. Three options:
                <code className="bg-muted rounded px-1">&apos;space&apos;</code> minimizes total vertical space,
                <code className="bg-muted rounded px-1">&apos;line&apos;</code> minimizes line lengths, and
                <code className="bg-muted rounded px-1">&apos;wiggles&apos;</code> (default) minimizes unnecessary line movement between
                time blocks. &apos;wiggles&apos; generally produces the most readable charts.
              </p>
            </div>

            {/* Q12 */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="mb-2 font-semibold">Q: What are the minimum files needed for a bare-bones SpreadLine?</h3>
              <p className="text-muted-foreground">
                <strong>A:</strong> If you just want the storyline chart (no force graph, no network timeline, no toolbar):
              </p>
              <ol className="text-muted-foreground mt-2 list-inside list-decimal space-y-1">
                <li>
                  <code className="bg-muted rounded px-1">src/lib/spreadline/</code> (entire directory) &mdash; layout engine
                </li>
                <li>
                  <code className="bg-muted rounded px-1">src/lib/spreadline-viz/</code> (entire directory) &mdash; D3 rendering
                </li>
                <li>
                  <code className="bg-muted rounded px-1">src/features/spreadlines/const.ts</code> &mdash; constants
                </li>
                <li>
                  Your own data in <code className="bg-muted rounded px-1">SpreadlineRawDataResponse</code> format
                </li>
              </ol>
              <p className="text-muted-foreground mt-2">
                That&apos;s it. You can feed data directly to the SpreadLine class and SpreadLineChart component.
              </p>
            </div>
          </div>
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
