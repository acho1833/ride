/**
 * Code Review Document - SpreadLine Enhancements
 *
 * This is a temporary review document that will be deleted after review.
 * All code is contained in this single file for easy cleanup.
 */

export default function CodeReviewPage() {
  return (
    <div className="prose prose-invert mx-auto max-w-6xl p-8">
      <div dangerouslySetInnerHTML={{ __html: reviewContent }} />
    </div>
  );
}

const reviewContent = `
<style>
  .review-container { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #e0e0e0; }
  h1, h2, h3, h4 { color: #fff; border-bottom: 1px solid #333; padding-bottom: 0.3em; }
  h1 { font-size: 2em; }
  h2 { font-size: 1.5em; margin-top: 2em; }
  h3 { font-size: 1.25em; margin-top: 1.5em; }
  code { background: #2d2d2d; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #1e1e1e; padding: 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #444; padding: 8px 12px; text-align: left; }
  th { background: #2d2d2d; }
  tr:nth-child(even) { background: #252525; }
  .emoji { font-size: 1.2em; }
  .score-box { display: inline-block; background: #2d5a2d; color: #4ade80; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
  .feature-box { background: #1e293b; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  .issue-critical { background: #3b1515; border-left: 4px solid #ef4444; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
  .issue-quality { background: #3b3515; border-left: 4px solid #eab308; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
  .issue-perf { background: #3b2515; border-left: 4px solid #f97316; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
  .issue-type { background: #2d1b3b; border-left: 4px solid #a855f7; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
  .issue-security { background: #1b2d3b; border-left: 4px solid #3b82f6; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
  .good-pattern { background: #1e3b2d; border-left: 4px solid #22c55e; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
  .mermaid-placeholder { background: #1a1a2e; border: 2px dashed #4a4a6a; padding: 20px; border-radius: 8px; text-align: center; color: #8888aa; }
  .checklist { list-style: none; padding-left: 0; }
  .checklist li { padding: 4px 0; }
  .checklist li::before { content: "☐ "; color: #888; }
  .checklist li.done::before { content: "☑ "; color: #4ade80; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
  .summary-card { background: #1e293b; padding: 16px; border-radius: 8px; text-align: center; }
  .summary-number { font-size: 2em; font-weight: bold; }
  .file-path { color: #60a5fa; font-family: monospace; }
  a { color: #60a5fa; }
</style>

<div class="review-container">

<h1>📋 Code Review Document</h1>
<p><strong>Branch:</strong> spreadline_sort</p>
<p><strong>Commits Reviewed:</strong> c16ed6e...a875c4e (4 commits)</p>
<p><strong>Review Date:</strong> 2026-03-06</p>

<hr>

<h2>📝 Executive Summary</h2>

<p><strong>What does this code do in plain English?</strong></p>
<p>This set of changes enhances the SpreadLine ego-network visualization with four improvements: entities can now have different internal/external affiliations at different points in time (instead of a single global category), users can toggle between newest-first and oldest-first time ordering, the backend data processing for monthly granularity is dramatically faster via pre-built lookup maps, and a bug where the network graph was missing entities that the spreadline showed has been fixed.</p>

<p><strong>Key changes/features added:</strong></p>
<ul>
  <li>🔀 Per-block internal/external category (entity affiliation can change over time)</li>
  <li>↕️ Ascending/descending sort order toggle for time blocks</li>
  <li>⚡ Performance optimization: O(1) adjacency maps, Set-based year filtering, pre-indexed citations</li>
  <li>🐛 BFS graph fix: all BFS-discovered entities now appear in the network graph</li>
</ul>

<p><strong>Overall Code Health Score:</strong> <span class="score-box">9/10</span></p>
<p>Focused, minimal changes that each solve a specific problem. Good separation between backend data processing and frontend visualization. Performance optimizations use standard data structure upgrades (Map/Set) without adding complexity. The BFS fix actually <em>removes</em> code, which is a sign of a correct simplification.</p>

<hr>

<h2>🏗️ Feature-Based Review</h2>

<!-- ==================== FEATURE 1 ==================== -->
<div class="feature-box">
<h3>Feature 1: Per-Block Internal/External Category</h3>

<p><strong>What it does:</strong> Previously, each entity had a single global category (<code>internal</code> or <code>external</code>) for its entire lifetime. Now, category is assigned <em>per time block</em>, so an entity can be "internal" in 2010 (same affiliation as ego) and "external" in 2015 (different affiliation). This reflects real-world researcher mobility between institutions.</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/spreadlines/server/services/entity-network.utils.ts</td><td>Assigns category per entity per year via <code>colorAssign[year][eid]</code></td></tr>
<tr><td class="file-path">src/features/spreadlines/server/services/spreadline-data.service.ts</td><td>Changed <code>EntityInfo.category</code> from <code>string</code> to <code>Record&lt;string, LineCategoryValue&gt;</code></td></tr>
<tr><td class="file-path">src/features/spreadlines/components/spreadline.component.tsx</td><td>Majority-vote logic for line colors across blocks</td></tr>
<tr><td class="file-path">src/lib/spreadline/spreadline.ts</td><td>Guard against missing group names in monthly topology</td></tr>
<tr><td class="file-path">src/lib/spreadline/types.ts</td><td>Guard against undefined node in <code>Session.replaceNode()</code></td></tr>
</table>

<p><strong>Data Model Change:</strong></p>
<div class="mermaid-placeholder">
<pre>
graph LR
    subgraph Before
        A["EntityInfo.category: string"]
        A1["'internal'"]
    end

    subgraph After
        B["EntityInfo.category: Record&lt;string, LineCategoryValue&gt;"]
        B1["{ '2010': 'internal', '2015': 'external', '2018': 'internal' }"]
    end

    A --> A1
    B --> B1

    style A1 fill:#553333
    style B1 fill:#335533
</pre>
</div>

<p><strong>Key Code Segments:</strong></p>

<p><em>Category assignment per year (entity-network.utils.ts:170-212):</em></p>
<pre><code>// Assign entities to groups using BFS hop distances
for (const year of yearsSet) {
  // ...
  const egoAffiliations = getAffiliations(egoId, year);

  for (const eid of networkEntityIds) {
    if (eid === egoId) continue;
    const hopDist = distMap.get(eid);
    if (hopDist === undefined || hopDist === 0 || hopDist > hopLimit) continue;

    const affiliations = getAffiliations(eid, year);
    const isInternal = affiliations.some(a => egoAffiliations.includes(a));
    const category: LineCategoryValue = isInternal ? INTERNAL : EXTERNAL;

    // Internal → right of ego, External → left of ego
    const groupIdx = isInternal ? egoIdx + hopDist : egoIdx - hopDist;
    groupAssign[year][groupIdx].add(eid);

    if (!colorAssign[year][eid]) {
      colorAssign[year][eid] = category;
    }
  }
}</code></pre>

<p><em>Category map build (entity-network.utils.ts:277-283):</em></p>
<pre><code>// Build category map (entity ID -> time -> category)
const categoryMap: Record&lt;string, Record&lt;string, LineCategoryValue&gt;&gt; = {};
for (const [year, assignments] of Object.entries(colorAssign)) {
  for (const [eid, category] of Object.entries(assignments)) {
    if (!categoryMap[eid]) categoryMap[eid] = {};
    categoryMap[eid][year] = category;
  }
}</code></pre>

<p><em>Frontend majority-vote for line color (spreadline.component.tsx):</em></p>
<p>When rendering a storyline that spans multiple blocks, the component determines the line color by counting how many blocks classify the entity as internal vs. external, then uses the majority category's color. This provides a stable visual identity while respecting temporal changes.</p>

<p><strong>Data Flow:</strong></p>
<ul>
  <li><strong>Input:</strong> BFS discovers entity at each time slice, checks affiliation against ego's affiliation for that year</li>
  <li><strong>Processing:</strong> <code>colorAssign[year][eid] = category</code> builds per-year assignments, converted to <code>categoryMap[eid][year]</code></li>
  <li><strong>Output:</strong> Frontend receives <code>EntityInfo.category</code> as a map of time→category, uses majority-vote for line rendering</li>
</ul>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> The per-block category model accurately reflects researcher mobility. Rather than over-engineering a "history of affiliations" system, it reuses the existing BFS-per-time-slice infrastructure to naturally produce per-block categories with zero additional queries.
</div>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> Added <code>Session.replaceNode()</code> guard (<code>if (node !== undefined)</code>) to prevent crashes when monthly granularity produces time blocks where some entities in groups don't appear in the topology. This is a defensive fix that costs nothing.
</div>
</div>

<!-- ==================== FEATURE 2 ==================== -->
<div class="feature-box">
<h3>Feature 2: Ascending/Descending Sort Order Toggle</h3>

<p><strong>What it does:</strong> Adds a toolbar button that toggles the time axis between newest-first (descending, default) and oldest-first (ascending). The sort order affects backend time block ordering, padding direction, and frontend drag handle constraints.</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/spreadlines/const.ts</td><td>New <code>SpreadlineSortOrder</code> type and <code>SPREADLINE_DEFAULT_SORT_ORDER</code> constant</td></tr>
<tr><td class="file-path">src/features/spreadlines/server/routers.ts</td><td>Added <code>sortOrder</code> to ORPC input schema</td></tr>
<tr><td class="file-path">src/features/spreadlines/server/services/spreadline-data.service.ts</td><td>Sorts time blocks by order; pads forward (asc) or backward (desc)</td></tr>
<tr><td class="file-path">src/features/spreadlines/hooks/useSpreadlineRawDataQuery.ts</td><td>Passes <code>sortOrder</code> to query</td></tr>
<tr><td class="file-path">src/features/spreadlines/components/spreadline-tab.component.tsx</td><td>Wires <code>sortOrder</code> state with cache persistence</td></tr>
<tr><td class="file-path">src/features/spreadlines/components/spreadline-toolbar.component.tsx</td><td>Toggle button with ArrowDownUp/ArrowUpDown icons</td></tr>
<tr><td class="file-path">src/lib/spreadline/render.ts</td><td>Position-based drag constraints (posX instead of index), reverse band positions for descending</td></tr>
<tr><td class="file-path">src/lib/spreadline-viz/spreadline-chart.tsx</td><td>Order-agnostic time extent calculations with <code>Math.min/Math.max</code></td></tr>
</table>

<p><strong>User Flow:</strong></p>
<div class="mermaid-placeholder">
<pre>
sequenceDiagram
    participant User
    participant Toolbar
    participant TabComponent
    participant ReactQuery
    participant Backend

    User->>Toolbar: Click sort toggle button
    Toolbar->>TabComponent: onSortOrderChange('asc')
    TabComponent->>TabComponent: Update cached sortOrder state
    TabComponent->>ReactQuery: Re-fetch with sortOrder='asc'
    ReactQuery->>Backend: GET /spreadlines/raw-data?sortOrder=asc
    Backend->>Backend: Sort timeBlocks ascending, pad forward
    Backend-->>ReactQuery: Return sorted data
    ReactQuery-->>TabComponent: Update rawData
    TabComponent-->>User: Re-render chart oldest-first
</pre>
</div>

<p><strong>Key Code Segments:</strong></p>

<p><em>Sort order type (const.ts):</em></p>
<pre><code>export type SpreadlineSortOrder = 'asc' | 'desc';
export const SPREADLINE_DEFAULT_SORT_ORDER: SpreadlineSortOrder = 'desc';</code></pre>

<p><em>Backend time block sorting and padding (spreadline-data.service.ts:174-218):</em></p>
<pre><code>// Extract unique time blocks sorted by requested order
const allTimeBlocks = [...new Set(topology.map(t => t.time))].sort((a, b) =>
  sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
);

// Pad to pageSize so every page lays out the same number of columns.
// Generate time labels beyond the last real block (forward for asc, backward for desc).
if (pageTimeBlocks.length < pageSize && pageTimeBlocks.length > 0) {
  const step = sortOrder === 'asc' ? 1 : -1;
  // ... pad with generated labels in the correct direction
}</code></pre>

<p><em>Toolbar toggle button (spreadline-toolbar.component.tsx:111-120):</em></p>
<pre><code>&lt;Button
  variant="ghost"
  size="sm"
  className="h-6 gap-1 px-2 text-xs"
  onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
  title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
&gt;
  {sortOrder === 'desc' ? &lt;ArrowDownUp /&gt; : &lt;ArrowUpDown /&gt;}
  {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
&lt;/Button&gt;</code></pre>

<p><em>Position-based drag constraints (render.ts:344-345):</em></p>
<pre><code>// Reverse positions so newest time appears on the left (descending order)
if (descending) bandStart.reverse();</code></pre>

<p><em>Order-agnostic label placement (render.ts:547):</em></p>
<pre><code>// Use the visually leftmost end for label placement (works for both ascending/descending order)
const labelEnd = lineStart[0][0] <= lineEnd[0][0] ? lineStart : lineEnd;</code></pre>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> Made drag handle constraints position-based (<code>posX</code>) instead of index-based. This means the highlight bar and drag handles work correctly regardless of whether time flows left-to-right or right-to-left, without separate codepaths for each direction.
</div>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> The <code>descending</code> flag is passed through the existing <code>RenderConfig</code> interface and handled in a single <code>bandStart.reverse()</code> call in the renderer. No scattered if/else branches — the rendering pipeline is order-agnostic after this one reversal point.
</div>
</div>

<!-- ==================== FEATURE 3 ==================== -->
<div class="feature-box">
<h3>Feature 3: Performance Optimization for Monthly Granularity</h3>

<p><strong>What it does:</strong> Replaces linear scans with pre-built lookup data structures in the BFS ego-network construction and citation indexing. Monthly granularity has 12x more time slices than yearly, making these lookups critical for responsive data loading.</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/spreadlines/server/services/entity-network.utils.ts</td><td>Pre-built adjacency maps per time slice, affiliation lookup map, Set-based year filtering</td></tr>
<tr><td class="file-path">src/features/spreadlines/server/services/spreadline-data.service.ts</td><td>Pre-indexed citations by paperID for O(1) relationship lookups</td></tr>
</table>

<p><strong>Optimization Details:</strong></p>

<table>
<tr><th>Area</th><th>Before</th><th>After</th><th>Complexity</th></tr>
<tr>
  <td>BFS neighbor lookup</td>
  <td><code>entries.filter(e => e.row.targetId === id)</code></td>
  <td><code>byTarget.get(id)</code></td>
  <td>O(n) → O(1)</td>
</tr>
<tr>
  <td>Year filtering</td>
  <td><code>years.includes(r.year)</code></td>
  <td><code>yearsSet.has(r.year)</code></td>
  <td>O(n) → O(1)</td>
</tr>
<tr>
  <td>Affiliation lookup</td>
  <td><code>allEntities.filter(e => e.id === id && e.year === year)</code></td>
  <td><code>affiliationLookup.get(\`\${id}|\${year}\`)</code></td>
  <td>O(n) → O(1)</td>
</tr>
<tr>
  <td>Citation lookup</td>
  <td><code>relationships.filter(r => r.paperID === paper)</code></td>
  <td><code>citationsByPaper.get(paper)</code></td>
  <td>O(n) → O(1)</td>
</tr>
<tr>
  <td>Year coercion</td>
  <td><code>relations.map(r => ({...r, year: String(r.year)}))</code></td>
  <td><code>for (const r of relations) r.year = String(r.year)</code></td>
  <td>Avoids full array clone</td>
</tr>
</table>

<p><strong>Key Code Segments:</strong></p>

<p><em>Pre-built adjacency maps for BFS (entity-network.utils.ts:58-68):</em></p>
<pre><code>// Pre-build adjacency maps for O(1) neighbor lookups
const bySource = new Map&lt;string, { row: RelationRow; idx: number }[]&gt;();
const byTarget = new Map&lt;string, { row: RelationRow; idx: number }[]&gt;();
for (const entry of entries) {
  const sId = entry.row.sourceId;
  const tId = entry.row.targetId;
  if (!bySource.has(sId)) bySource.set(sId, []);
  bySource.get(sId)!.push(entry);
  if (!byTarget.has(tId)) byTarget.set(tId, []);
  byTarget.get(tId)!.push(entry);
}</code></pre>

<p><em>Pre-built affiliation lookup (entity-network.utils.ts:137-144):</em></p>
<pre><code>// Pre-build affiliation lookup: "entityId|year" -> remapped affiliations
const affiliationLookup = new Map&lt;string, string[]&gt;();
for (const e of allEntities) {
  const key = \`\${e.id}|\${e.year}\`;
  if (!affiliationLookup.has(key)) affiliationLookup.set(key, []);
  const remapped = remapJHAffiliation(e.affiliation);
  const list = affiliationLookup.get(key)!;
  if (!list.includes(remapped)) list.push(remapped);
}</code></pre>

<p><em>Pre-indexed citations (spreadline-data.service.ts:139-144):</em></p>
<pre><code>// Pre-index citations by paperID for O(1) lookup
const citationsByPaper = new Map&lt;string, RelationshipRow[]&gt;();
for (const c of relationships) {
  if (!citationsByPaper.has(c.paperID)) citationsByPaper.set(c.paperID, []);
  citationsByPaper.get(c.paperID)!.push(c);
}</code></pre>

<p><strong>Impact Analysis:</strong></p>
<ul>
  <li><strong>Monthly dataset:</strong> ~240 time slices (20 years × 12 months). Before optimization, each BFS step scanned the full relation list for every entity neighbor. With pre-built maps, neighbor lookups are constant time.</li>
  <li><strong>Affiliation resolution:</strong> Called once per entity per year. With ~200 entities × 240 time slices, the old filter-based approach did ~48,000 linear scans. Now it's 48,000 O(1) lookups.</li>
  <li><strong>In-place coercion:</strong> Avoids cloning arrays with <code>.map()</code>, reducing GC pressure on large datasets.</li>
</ul>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> All optimizations use standard Map/Set data structures — no custom caches, no external dependencies. The code remains simple and readable while being dramatically faster. The composite key pattern (<code>\`\${id}|\${year}\`</code>) is a clean alternative to nested Maps.
</div>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> In-place mutation (<code>r.year = String(r.year)</code>) is used intentionally to avoid allocating new arrays. This is documented with a comment and is safe because the data is freshly loaded from CSV and not shared.
</div>
</div>

<!-- ==================== FEATURE 4 ==================== -->
<div class="feature-box">
<h3>Feature 4: BFS Graph Entity Fix</h3>

<p><strong>What it does:</strong> Fixes a mismatch where the SpreadLine chart showed entities that the network graph didn't. The root cause was a hop≤2 paper filter in <code>constructEntityNetwork</code> that discarded edges between non-ego entities from the topology, even though those entities were correctly discovered by BFS and placed in groups.</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/spreadlines/server/services/entity-network.utils.ts</td><td>Removed 15-line hop≤2 paper filter block</td></tr>
</table>

<p><strong>Root Cause Analysis:</strong></p>
<div class="mermaid-placeholder">
<pre>
graph TD
    A[BFS discovers entities at hop 1..N] --> B[Groups correctly contain all entities]
    B --> C[SpreadLine renders all entities ✅]

    A --> D[Old: hop≤2 paper filter]
    D --> E[Topology missing hop-1↔hop-2 edges]
    E --> F[Graph doesn't show some entities ❌]

    A --> G[Fix: use BFS output directly]
    G --> H[Topology contains all BFS edges]
    H --> I[Graph shows all entities ✅]

    style D fill:#553333
    style E fill:#553333
    style F fill:#553333
    style G fill:#335533
    style H fill:#335533
    style I fill:#335533
</pre>
</div>

<p><strong>What was removed:</strong></p>
<p>A block of code that filtered the BFS output to only keep papers (edges) where the ego was directly involved. For hop-1 entities this was redundant (they already connect to ego by definition). For hop-2+ entities, this actively discarded valid edges that BFS had correctly traversed, creating the visual mismatch.</p>

<p><strong>Key Code Change:</strong></p>
<pre><code>// BEFORE: Filtered BFS results, losing hop-1↔hop-2 edges
const network = hopLimit <= 2
  ? egoRelations.filter(r => /* ego is source or target */)
  : egoRelations;

// AFTER: Use BFS output directly — BFS already scopes to hopLimit
const network = egoRelations;</code></pre>

<p><strong>Why this is correct:</strong></p>
<ul>
  <li>The BFS in <code>constructEgoNetworks</code> already respects the hop limit — it only traverses <code>hopLimit</code> levels deep</li>
  <li>All edges added to the result set are between entities within the BFS frontier</li>
  <li>The paper filter was a legacy artifact from when hop-3+ was handled differently (it skipped the filter for hop &gt; 2)</li>
  <li>Removing the filter makes hop 1-2 behave consistently with hop 3+</li>
</ul>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> The fix <em>removes</em> code rather than adding it. The 15-line filter was unnecessary because the BFS already correctly scopes the results. This is the best kind of bug fix — eliminating complexity while fixing the bug.
</div>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> All 54 existing tests pass without modification, confirming that the removed filter was genuinely redundant for the tested scenarios.
</div>
</div>

<hr>

<h2>🚨 Issues & Concerns (Priority Order)</h2>

<h3>🔴 Critical Issues</h3>
<p><em>No critical issues found!</em></p>

<h3>🟡 Code Quality Issues</h3>

<div class="issue-quality">
<p><strong>Issue 1: In-Place Mutation of CSV Data</strong></p>
<p><strong>Location:</strong> <code>entity-network.utils.ts:133-134</code></p>
<p><strong>Description:</strong> <code>for (const r of relations) r.year = String(r.year)</code> mutates the input arrays in-place for performance. While safe today (data is freshly loaded from CSV per request), this could cause subtle bugs if the data is ever cached or shared between calls.</p>
<p><strong>Fix:</strong> Low priority — add a comment documenting the mutation assumption, or clone the arrays at the call site if caching is introduced later.</p>
</div>

<div class="issue-quality">
<p><strong>Issue 2: Missing Category for Entities Not in BFS at a Time Slice</strong></p>
<p><strong>Location:</strong> <code>spreadline-data.service.ts:169</code></p>
<p><strong>Description:</strong> <code>categoryMap[eid]</code> falls back to <code>{}</code> if no category exists for that entity. The frontend majority-vote logic handles this gracefully, but an entity that only appears in one time slice with no category will render with the default color.</p>
<p><strong>Fix:</strong> Minor — already handled by the fallback. Could add a log warning for debugging purposes.</p>
</div>

<h3>🟠 Performance Concerns</h3>

<div class="issue-perf">
<p><strong>Issue 1: Affiliation Comparison Uses Array.includes</strong></p>
<p><strong>Location:</strong> <code>entity-network.utils.ts:202</code></p>
<p><strong>Description:</strong> <code>affiliations.some(a => egoAffiliations.includes(a))</code> is O(n*m) where n and m are the number of affiliations. In practice, entities rarely have more than 2-3 affiliations per year, so this is effectively O(1).</p>
<p><strong>Impact:</strong> Negligible — affiliation arrays are tiny. No action needed.</p>
</div>

<h3>🟣 Type Safety Issues</h3>

<div class="issue-type">
<p><strong>Issue 1: sortOrder String Literal vs Enum</strong></p>
<p><strong>Location:</strong> <code>const.ts</code>, <code>routers.ts</code></p>
<p><strong>Description:</strong> <code>SpreadlineSortOrder</code> is defined as a type alias (<code>'asc' | 'desc'</code>) in <code>const.ts</code> but validated as <code>z.enum(['asc', 'desc'])</code> in the router. These are kept in sync manually.</p>
<p><strong>Fix:</strong> Low priority — could extract the enum values to a shared constant, but the current duplication is minimal and clear.</p>
</div>

<hr>

<h2>✅ Coding Standards Checklist</h2>

<ul class="checklist">
  <li class="done">Naming conventions: types, constants, and functions follow established patterns</li>
  <li class="done">Error handling: ORPCError for API errors, guards for undefined nodes</li>
  <li class="done">No magic values: sort orders, hop limits, page sizes all use named constants</li>
  <li class="done">Debug code removed: no console.logs or debugger statements</li>
  <li class="done">Type safety: no <code>any</code> types introduced, proper generic Map/Set usage</li>
  <li class="done">DRY principle: per-block category reuses existing BFS-per-time-slice infrastructure</li>
  <li class="done">Backward compatible: sort order defaults to <code>'desc'</code> (existing behavior)</li>
  <li class="done">Tests passing: all 54 existing tests pass with no modifications</li>
  <li class="done">State persistence: sort order is cached in tab state (survives unmount/remount)</li>
  <li class="done">Server-only imports: all server files maintain <code>import 'server-only'</code></li>
  <li>New tests: no new tests added for sort order or per-block category logic</li>
</ul>

<hr>

<h2>🏛️ Architecture Impact</h2>

<div class="mermaid-placeholder">
<pre>
graph TD
    subgraph "Data Model Change"
        A1["EntityInfo.category: string"] -->|Before| B1["'internal'"]
        A2["EntityInfo.category: Record"] -->|After| B2["{ '2010': 'internal', '2015': 'external' }"]
    end

    subgraph "New Query Parameter"
        C1["getRawData(egoId, ...)"] -->|Before| D1["No sort control"]
        C2["getRawData(egoId, ..., sortOrder)"] -->|After| D2["'asc' | 'desc'"]
    end

    subgraph "Performance"
        E1["O(n) BFS lookups"] -->|Before| F1["Linear filter per hop"]
        E2["O(1) Map lookups"] -->|After| F2["Pre-built adjacency maps"]
    end

    style B1 fill:#553333
    style D1 fill:#553333
    style F1 fill:#553333
    style B2 fill:#335533
    style D2 fill:#335533
    style F2 fill:#335533
</pre>
</div>

<p><strong>Changes:</strong></p>
<table>
<tr><th>Category</th><th>Details</th></tr>
<tr><td>Dependencies Added</td><td>None</td></tr>
<tr><td>Breaking Changes</td><td>EntityInfo.category type changed from <code>string</code> to <code>Record&lt;string, LineCategoryValue&gt;</code> — internal API only</td></tr>
<tr><td>Database</td><td>No changes — reads CSV files only</td></tr>
<tr><td>API</td><td>Added optional <code>sortOrder</code> parameter to <code>getRawData</code> (defaults to <code>'desc'</code>)</td></tr>
<tr><td>State Management</td><td><code>sortOrder</code> added to tab state cache (sessionStorage)</td></tr>
<tr><td>Rendering Pipeline</td><td><code>RenderConfig.descending</code> flag added, consumed by <code>render.ts</code></td></tr>
</table>

<hr>

<h2>🧪 Testing Coverage</h2>

<p><strong>What's Tested:</strong></p>
<ul>
  <li class="done">54 existing unit tests pass (entity-network.utils, spreadline-data.service)</li>
  <li>Manual verification of sort order toggle, per-block colors, graph entity visibility</li>
</ul>

<p><strong>What's NOT Tested (but should be):</strong></p>
<ul class="checklist">
  <li>Unit tests for per-block category assignment across time (entity changes affiliation mid-timeline)</li>
  <li>Unit tests for sort order affecting time block ordering and padding direction</li>
  <li>Unit tests for majority-vote line color computation</li>
  <li>Performance regression tests for monthly granularity data loading</li>
</ul>

<p><strong>Edge Cases to Test:</strong></p>
<ul class="checklist">
  <li>Entity with equal internal/external blocks (majority-vote tie)</li>
  <li>Sort order toggle mid-session with selected time range active</li>
  <li>Monthly granularity with year boundary padding (December → January)</li>
  <li>Hop limit = 1 with sort order = asc (minimal data, ascending)</li>
</ul>

<hr>

<h2>⚡ Quick Review Checklist</h2>

<p>The absolute minimum a reviewer must verify:</p>
<ol>
  <li>☐ <strong>Per-block category correctness</strong> — Verify <code>categoryMap[eid][year]</code> produces correct internal/external assignments when ego changes affiliation. <em>Estimated: 10 min</em></li>
  <li>☐ <strong>Sort order end-to-end</strong> — Toggle sort in UI, verify time blocks reverse, padding direction is correct, drag handles work. <em>Estimated: 5 min</em></li>
  <li>☐ <strong>Graph entity parity</strong> — Select a time block, verify all entities visible in spreadline also appear in the network graph. <em>Estimated: 5 min</em></li>
</ol>

<hr>

<h2>⏱️ Estimated Review Time</h2>

<ul>
  <li>⚡ <strong>Quick scan (10-15 min):</strong> Check the 4 features, verify no critical issues</li>
  <li>📋 <strong>Standard review (25-35 min):</strong> Trace data flow for category and sort, verify performance claims</li>
  <li>🔍 <strong>Deep dive (45-60 min):</strong> Read all changed files, trace BFS fix, benchmark monthly performance</li>
</ul>

<hr>

<h2>📊 Summary</h2>

<div class="summary-grid">
  <div class="summary-card" style="border-top: 4px solid #ef4444;">
    <div class="summary-number">0</div>
    <div>Must Fix Before Merge</div>
  </div>
  <div class="summary-card" style="border-top: 4px solid #eab308;">
    <div class="summary-number">2</div>
    <div>Should Fix</div>
  </div>
  <div class="summary-card" style="border-top: 4px solid #3b82f6;">
    <div class="summary-number">1</div>
    <div>Nice to Have</div>
  </div>
</div>

<p><strong>Approval Status:</strong> <span style="color: #4ade80; font-size: 1.5em;">✅ Approved with comments</span></p>

<p>Four tightly scoped changes that each solve a specific problem without introducing unnecessary complexity. The per-block category model is architecturally sound. The performance optimizations use standard patterns. The sort order toggle is cleanly wired through the full stack. The BFS fix is a correct simplification. All 54 tests pass. Ready to merge.</p>

<hr>

<h2>📝 Appendix: Files Changed</h2>

<table>
<tr><th>Status</th><th>File</th><th>Changes</th></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/spreadlines/const.ts</td><td>Added SpreadlineSortOrder type, SPREADLINE_DEFAULT_SORT_ORDER constant</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/spreadlines/server/routers.ts</td><td>Added sortOrder to input schema with z.enum validation</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/spreadlines/server/services/entity-network.utils.ts</td><td>Pre-built adjacency maps, affiliation lookup, per-block categories, removed hop≤2 filter</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/spreadlines/server/services/spreadline-data.service.ts</td><td>EntityInfo.category type change, sort order, pre-indexed citations</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/spreadlines/hooks/useSpreadlineRawDataQuery.ts</td><td>Added sortOrder parameter</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/spreadlines/components/spreadline-tab.component.tsx</td><td>Sort order state with cache persistence</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/spreadlines/components/spreadline-toolbar.component.tsx</td><td>Sort toggle button (ArrowDownUp/ArrowUpDown icons)</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/spreadlines/components/spreadline.component.tsx</td><td>Majority-vote line color for per-block categories</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/lib/spreadline/render.ts</td><td>Position-based drag constraints, descending band reversal</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/lib/spreadline/spreadline.ts</td><td>Guard for missing group names in monthly topology</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/lib/spreadline/types.ts</td><td>Undefined node guard in Session.replaceNode()</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/lib/spreadline-viz/spreadline-chart.tsx</td><td>Order-agnostic time extent calculations</td></tr>
</table>

</div>
`;
