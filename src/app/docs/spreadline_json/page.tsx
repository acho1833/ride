export default function SpreadlineJsonDocsPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-5xl p-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">SpreadLine getRawData JSON Reference</h1>
          <p className="text-muted-foreground text-lg">
            API endpoint documentation for <code>/api/rpc/spreadline/getRawData</code>
          </p>
          <div className="bg-muted mt-4 inline-block rounded-lg px-4 py-2 text-sm">
            <code>GET</code> &mdash; Returns ego-network data for SpreadLine visualization
          </div>
        </header>

        {/* Table of Contents */}
        <nav className="bg-card mb-12 rounded-lg p-6">
          <h2 className="mb-4 text-xl font-semibold">Contents</h2>
          <ol className="text-muted-foreground grid gap-2 md:grid-cols-2">
            <li>
              <a href="#overview" className="hover:text-primary">
                1. Overview
              </a>
            </li>
            <li>
              <a href="#input" className="hover:text-primary">
                2. Input Parameters
              </a>
            </li>
            <li>
              <a href="#response" className="hover:text-primary">
                3. Response Schema
              </a>
            </li>
            <li>
              <a href="#topology" className="hover:text-primary">
                4. topology[]
              </a>
            </li>
            <li>
              <a href="#linecategory" className="hover:text-primary">
                5. lineCategory[]
              </a>
            </li>
            <li>
              <a href="#groups" className="hover:text-primary">
                6. groups
              </a>
            </li>
            <li>
              <a href="#nodecontext" className="hover:text-primary">
                7. nodeContext[]
              </a>
            </li>
            <li>
              <a href="#config" className="hover:text-primary">
                8. config
              </a>
            </li>
            <li>
              <a href="#full-example" className="hover:text-primary">
                9. Full Example
              </a>
            </li>
            <li>
              <a href="#improvements" className="hover:text-primary">
                10. Suggested Improvements
              </a>
            </li>
          </ol>
        </nav>

        {/* Section 1: Overview */}
        <section id="overview" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">1. Overview</h2>
          <div className="bg-card rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              The <code>getRawData</code> endpoint returns all data needed to render a SpreadLine ego-network visualization. It reads from
              CSV files (relations, entities, citations) and computes:
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-2">
              <li>
                <strong>Ego-centric network topology</strong> &mdash; 2-hop BFS from the ego entity per time slice
              </li>
              <li>
                <strong>Category classification</strong> &mdash; Each entity classified as &quot;internal&quot; (same affiliation as ego) or
                &quot;external&quot;
              </li>
              <li>
                <strong>Group ordering constraints</strong> &mdash; 5-layer layout ordering per time period
              </li>
              <li>
                <strong>Citation context</strong> &mdash; Aggregated citation counts per entity per time period
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Input */}
        <section id="input" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">2. Input Parameters</h2>
          <div className="bg-card rounded-lg p-6">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`{
  // The central entity to build the ego network around.
  // Optional — defaults to "Jeffrey Heer" if omitted.
  "ego": "Jeffrey Heer"    // string | undefined
}`}
            </pre>
          </div>
        </section>

        {/* Section 3: Response Schema */}
        <section id="response" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">3. Response Schema (Top-Level)</h2>
          <div className="bg-card rounded-lg p-6">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`{
  // The central entity name this network is built around.
  // Always matches the input ego (or the default).
  "ego": "Jeffrey Heer",                // string

  // Identifier for the source dataset used.
  // Currently always "vis-author".
  "dataset": "vis-author",              // string

  // Network edges — co-authorship relationships per time period.
  // Each entry is a directed edge with a weight.
  "topology": [ ... ],                  // TopologyEntry[]

  // Classification of each entity relative to the ego.
  // "internal" = shares affiliation, "external" = does not.
  // Colors are applied on the frontend, not here.
  "lineCategory": [ ... ],              // LineCategoryEntry[]

  // Layout ordering constraints per time period.
  // 5 positional layers controlling how entities are arranged
  // vertically in the visualization.
  "groups": { ... },                    // Record<string, string[][]>

  // Citation count context per entity per time period.
  // Used for node sizing/coloring in the visualization.
  "nodeContext": [ ... ],               // NodeContextEntry[]

  // Visualization configuration.
  // Controls time handling and layout optimization.
  "config": { ... }                     // Config object
}`}
            </pre>
          </div>
        </section>

        {/* Section 4: topology */}
        <section id="topology" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">4. topology[]</h2>
          <div className="bg-card mb-4 rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              Array of directed edges representing co-authorship relationships. Each entry connects a source author to a target author in a
              specific time period, weighted by the number of unique papers.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`[
  {
    // First author of the paper (or co-author on the source side).
    "source": "Arvind Satyanarayan",     // string

    // Second author (or co-author on the target side).
    // When target === ego, source is a direct collaborator.
    "target": "Jeffrey Heer",            // string

    // The time period (year) when this collaboration occurred.
    // Format depends on config.timeFormat (here: "%Y").
    "time": "2014",                      // string

    // Number of unique co-authored papers between source
    // and target across ALL edges in this time period.
    "weight": 3                          // number (integer, >= 1)
  },
  {
    "source": "Jeffrey Heer",
    "target": "Dominik Moritz",
    "time": "2016",
    "weight": 5
  }
  // ... typically 200-2000 entries for a full network
]`}
            </pre>
          </div>
          <div className="bg-muted rounded-lg p-4 text-sm">
            <strong>Note:</strong>
            <span className="text-muted-foreground">
              {' '}
              Edges are directional. A paper with authors [A, B, C] where A is the first author produces edges A→B and A→C. The ego entity
              appears as either source or target.
            </span>
          </div>
        </section>

        {/* Section 5: lineCategory */}
        <section id="linecategory" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">5. lineCategory[]</h2>
          <div className="bg-card mb-4 rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              Array classifying each non-ego entity as &quot;internal&quot; or &quot;external&quot; relative to the ego entity. The
              classification is based on whether the entity shares an institutional affiliation with the ego in any year. The ego entity
              itself is <strong>not</strong> included.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`[
  {
    // The entity (author) name.
    "entity": "Arvind Satyanarayan",     // string

    // Affiliation relationship to ego:
    //   "internal" — shares at least one affiliation with ego
    //   "external" — no shared affiliation with ego
    // Determined from the earliest year the entity appears.
    // The frontend maps this to a display color.
    "category": "internal"               // "internal" | "external"
  },
  {
    "entity": "Ben Shneiderman",
    "category": "external"
  }
  // ... one entry per unique non-ego entity in the network
]`}
            </pre>
          </div>
          <div className="bg-muted rounded-lg p-4 text-sm">
            <strong>Frontend color mapping:</strong>
            <span className="text-muted-foreground">
              {' '}
              The frontend maps these categories to hex colors: <code>&quot;internal&quot; → #FA9902</code> (orange),{' '}
              <code>&quot;external&quot; → #166b6b</code> (teal). This separation keeps presentation logic out of the API.
            </span>
          </div>
        </section>

        {/* Section 6: groups */}
        <section id="groups" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">6. groups</h2>
          <div className="bg-card mb-4 rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              Object keyed by time period (year). Each value is an array of exactly 5 sub-arrays representing layout layers. These layers
              control the vertical ordering of entities in the SpreadLine visualization.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`{
  // Key: time period string matching topology[].time
  "2014": [
    // Layer 0 — External entities, far from ego (top of layout).
    // These are co-authors who do NOT share affiliation with ego
    // and appear as targets (not first authors) in the edges.
    ["Ben Shneiderman", "Tamara Munzner"],   // string[]

    // Layer 1 — External entities, near ego.
    // First authors who do NOT share affiliation with ego.
    ["Jock Mackinlay"],                       // string[]

    // Layer 2 — The ego entity. Always a single-element array.
    ["Jeffrey Heer"],                         // string[]

    // Layer 3 — Internal entities, near ego.
    // First authors who DO share affiliation with ego.
    ["Arvind Satyanarayan"],                  // string[]

    // Layer 4 — Internal entities, far from ego (bottom of layout).
    // Co-authors who DO share affiliation with ego
    // and appear as targets in the edges.
    ["Dominik Moritz", "Kanit Wongsuphasawat"]  // string[]
  ],

  "2015": [
    // Same 5-layer structure for the next time period.
    // Entity membership may change year to year as
    // affiliations and collaborations shift.
    [], [], ["Jeffrey Heer"], [], []
  ]
  // ... one key per year the ego is active
}`}
            </pre>
          </div>
          <div className="bg-muted rounded-lg p-4 text-sm">
            <strong>Ordering within layers:</strong>
            <span className="text-muted-foreground">
              {' '}
              Entities within each layer are sorted by collaboration count. Layers 0-1 sort ascending (least collaborations first), layers
              2-4 sort descending (most collaborations first). This creates a visual &quot;funnel&quot; pattern around the ego.
            </span>
          </div>
        </section>

        {/* Section 7: nodeContext */}
        <section id="nodecontext" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">7. nodeContext[]</h2>
          <div className="bg-card mb-4 rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              Array of aggregated citation counts per entity per time period. Used by the visualization to color or size nodes. Multiple
              papers by the same author in the same year are summed together.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`[
  {
    // The entity (author) name.
    // Matches entities in topology[].source or topology[].target.
    "entity": "Jeffrey Heer",            // string

    // The time period (year) for this citation count.
    // Matches topology[].time format.
    "time": "2014",                      // string

    // Total citation count for this entity in this time period.
    // Sum of citations across all papers by this author in this year.
    // Higher values = more influential papers.
    "context": 2227                      // number (integer, >= 0)
  },
  {
    "entity": "Arvind Satyanarayan",
    "time": "2016",
    "context": 456
  }
  // ... one entry per unique (entity, time) pair
]`}
            </pre>
          </div>
          <div className="bg-muted rounded-lg p-4 text-sm">
            <strong>Note:</strong>
            <span className="text-muted-foreground">
              {' '}
              The <code>context</code> field name is generic because the SpreadLine library supports different context types. In this
              dataset it represents citation counts, but the library treats it as an opaque numeric value for node coloring.
            </span>
          </div>
        </section>

        {/* Section 8: config */}
        <section id="config" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">8. config</h2>
          <div className="bg-card rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              Visualization configuration that controls time handling and layout optimization. Passed directly to the SpreadLine
              library&apos;s <code>center()</code> and <code>configure()</code> methods.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`{
  // Time granularity for grouping data into columns.
  // Determines how topology edges are binned along the x-axis.
  // Possible values: "year", "month", "day"
  "timeDelta": "year",                   // string

  // d3-time-format string for parsing time values.
  // Must match the format of topology[].time strings.
  // Examples: "%Y" (year only), "%Y-%m-%d" (full date)
  "timeFormat": "%Y",                    // string

  // When true, entities with the same category are rendered
  // closer together vertically. Reduces whitespace between
  // same-affiliation authors.
  "squeezeSameCategory": true,           // boolean

  // Layout optimization strategy for the SpreadLine algorithm.
  // Controls how storylines are positioned to reduce visual clutter.
  //   "wiggles"  — minimize total vertical movement (default)
  //   "space"    — minimize total vertical space used
  //   "line"     — minimize number of line crossings
  "minimize": "wiggles"                  // "wiggles" | "space" | "line"
}`}
            </pre>
          </div>
        </section>

        {/* Section 9: Full Example */}
        <section id="full-example" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">9. Full Example</h2>
          <div className="bg-card rounded-lg p-6">
            <p className="text-muted-foreground mb-4">Minimal complete response with 2 edges and 2 time periods:</p>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`{
  // Central entity for the ego network
  "ego": "Jeffrey Heer",

  // Source dataset identifier
  "dataset": "vis-author",

  // Network edges (co-authorship)
  "topology": [
    {
      "source": "Arvind Satyanarayan",  // first author
      "target": "Jeffrey Heer",         // co-author (ego)
      "time": "2014",                   // year of publication
      "weight": 3                       // number of shared papers
    },
    {
      "source": "Jeffrey Heer",         // first author (ego)
      "target": "Dominik Moritz",       // co-author
      "time": "2016",
      "weight": 5
    }
  ],

  // Entity classification (internal/external to ego's institution)
  "lineCategory": [
    {
      "entity": "Arvind Satyanarayan",  // author name
      "category": "internal"            // same affiliation as ego
    },
    {
      "entity": "Dominik Moritz",
      "category": "internal"
    }
  ],

  // Layout ordering constraints per year (5 layers each)
  "groups": {
    "2014": [
      [],                               // layer 0: external far
      [],                               // layer 1: external near
      ["Jeffrey Heer"],                  // layer 2: ego (always)
      ["Arvind Satyanarayan"],           // layer 3: internal near
      []                                 // layer 4: internal far
    ],
    "2016": [
      [],
      [],
      ["Jeffrey Heer"],
      [],
      ["Dominik Moritz"]
    ]
  },

  // Citation counts per entity per year
  "nodeContext": [
    {
      "entity": "Jeffrey Heer",         // author name
      "time": "2014",                   // year
      "context": 2227                   // total citations that year
    },
    {
      "entity": "Arvind Satyanarayan",
      "time": "2014",
      "context": 456
    },
    {
      "entity": "Jeffrey Heer",
      "time": "2016",
      "context": 1893
    },
    {
      "entity": "Dominik Moritz",
      "time": "2016",
      "context": 312
    }
  ],

  // Visualization configuration
  "config": {
    "timeDelta": "year",                // time granularity
    "timeFormat": "%Y",                 // d3-time-format string
    "squeezeSameCategory": true,        // compact same-category lines
    "minimize": "wiggles"               // layout optimization strategy
  }
}`}
            </pre>
          </div>
        </section>

        {/* Section 10: Suggested Improvements */}
        <section id="improvements" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">10. Suggested Improvements</h2>

          {/* Improvement 1 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-2 text-lg font-semibold">
              10.1 <code>groups</code>: Positional arrays &rarr; Named keys
            </h3>
            <p className="text-muted-foreground mb-4">
              The 5-element array is opaque. Consumers must know that index 0 = external far, index 2 = ego, etc. Named keys would be
              self-documenting.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-destructive mb-2 text-sm font-semibold">Current</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`"2014": [
  ["Ben Shneiderman"],   // index 0 = ??
  ["Jock Mackinlay"],    // index 1 = ??
  ["Jeffrey Heer"],      // index 2 = ego
  ["Arvind Satyanarayan"], // index 3 = ??
  ["Dominik Moritz"]     // index 4 = ??
]`}
                </pre>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-green-500">Proposed</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`"2014": {
  "externalFar": ["Ben Shneiderman"],
  "externalNear": ["Jock Mackinlay"],
  "ego": ["Jeffrey Heer"],
  "internalNear": ["Arvind Satyanarayan"],
  "internalFar": ["Dominik Moritz"]
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Improvement 2 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-2 text-lg font-semibold">
              10.2 <code>config.minimize</code>: Open string &rarr; Enum
            </h3>
            <p className="text-muted-foreground mb-4">
              Currently the Zod schema allows any string, but only 3 values are valid. The frontend already casts it. The backend should
              validate it.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-destructive mb-2 text-sm font-semibold">Current (Zod)</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`minimize: z.string()

// Frontend casts:
rawData.config.minimize
  as 'space' | 'line' | 'wiggles'`}
                </pre>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-green-500">Proposed (Zod)</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`minimize: z.enum([
  'wiggles',
  'space',
  'line'
])
// No cast needed on frontend`}
                </pre>
              </div>
            </div>
          </div>

          {/* Improvement 3 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-2 text-lg font-semibold">
              10.3 <code>nodeContext.context</code>: Rename to <code>citationCount</code>
            </h3>
            <p className="text-muted-foreground mb-4">
              The field name <code>context</code> is generic to the point of being unclear. Since this dataset specifically tracks citation
              counts, a descriptive name would improve readability.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-destructive mb-2 text-sm font-semibold">Current</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`{
  "entity": "Jeffrey Heer",
  "time": "2014",
  "context": 2227     // context of what?
}`}
                </pre>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-green-500">Proposed</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`{
  "entity": "Jeffrey Heer",
  "time": "2014",
  "citationCount": 2227  // clear meaning
}`}
                </pre>
              </div>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">
              <strong>Trade-off:</strong> The SpreadLine library expects a <code>context</code> field name internally. Renaming here would
              require updating the library&apos;s field mapping or the component&apos;s <code>load()</code> call.
            </p>
          </div>

          {/* Improvement 4 */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-2 text-lg font-semibold">
              10.4 <code>topology</code>: Add paper <code>id</code> field
            </h3>
            <p className="text-muted-foreground mb-4">
              The service has paper IDs (from the CSV <code>id</code> column) but drops them in the response. Including the paper ID would
              enable cross-referencing edges with <code>nodeContext</code> and allow the frontend to link to specific papers.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-destructive mb-2 text-sm font-semibold">Current</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`{
  "source": "Arvind Satyanarayan",
  "target": "Jeffrey Heer",
  "time": "2014",
  "weight": 3
  // paper ID is lost
}`}
                </pre>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-green-500">Proposed</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`{
  "source": "Arvind Satyanarayan",
  "target": "Jeffrey Heer",
  "time": "2014",
  "weight": 3,
  "paperId": "53e9978db7602d9701f50690"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Improvement 5: lineCategory already done */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-2 text-lg font-semibold">
              10.5 <code>lineColor</code> &rarr; <code>lineCategory</code>
              <span className="bg-primary text-primary-foreground ml-2 rounded px-2 py-0.5 text-xs font-normal">IMPLEMENTED</span>
            </h3>
            <p className="text-muted-foreground mb-4">
              Previously the backend sent hex color strings (<code>#FA9902</code>, <code>#166b6b</code>), mixing presentation with data. Now
              it sends semantic categories and the frontend maps them to colors.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-destructive mb-2 text-sm font-semibold">Before (removed)</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`"lineColor": [
  {
    "entity": "Arvind Satyanarayan",
    "color": "#FA9902"  // presentation in API
  }
]`}
                </pre>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-green-500">After (current)</h4>
                <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                  {`"lineCategory": [
  {
    "entity": "Arvind Satyanarayan",
    "category": "internal"  // semantic
  }
]
// Frontend: const.ts defines colors`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-muted-foreground mt-12 text-center text-sm">
          <p>
            Source: <code>src/features/spreadlines/server/services/spreadline-data.service.ts</code>
            &nbsp;|&nbsp; Router: <code>src/features/spreadlines/server/routers.ts</code>
          </p>
        </footer>
      </div>
    </div>
  );
}
