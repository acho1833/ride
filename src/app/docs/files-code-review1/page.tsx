/**
 * Code Review Document - Editor & File Explorer Features
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
<p><strong>Branch:</strong> drag_drop</p>
<p><strong>Commits Reviewed:</strong> 1f941d7...dba3415 (13 commits)</p>
<p><strong>Review Date:</strong> 2025-01-29</p>

<hr>

<h2>📝 Executive Summary</h2>

<p><strong>What does this code do in plain English?</strong></p>
<p>This code transforms the editor from a simple left/right split into a VSCode-style multi-pane editor with unlimited horizontal splits, up to 2 vertical rows, and full drag-and-drop support for organizing tabs. Users can now drag tabs within groups to reorder, drag tabs between groups to move files, drag files from the file explorer directly into the editor, and use right-click context menus with dynamic "Move/Split" options.</p>

<p><strong>Key changes/features added:</strong></p>
<ul>
  <li>🎯 Dynamic multi-row/multi-group editor layout (replaces hardcoded left/right)</li>
  <li>🖱️ Tab drag-and-drop (reorder within group, move between groups)</li>
  <li>📁 File tree drag-to-editor (drop files directly into tab bars)</li>
  <li>📋 Context menu with intelligent Move/Split options</li>
  <li>🔗 "Select Opened Files" sync toggle (tabs ↔ file explorer)</li>
  <li>📂 Expand/Collapse all folders buttons</li>
  <li>✨ Complete Zustand store rewrite for dynamic groups</li>
</ul>

<p><strong>Overall Code Health Score:</strong> <span class="score-box">8/10</span></p>
<p>Well-architected implementation following established patterns. Good separation of concerns, comprehensive JSDoc documentation, and proper use of constants. Minor issues with some missing edge case handling and a few optimization opportunities.</p>

<hr>

<h2>🏗️ Feature-Based Review</h2>

<!-- ==================== FEATURE 1 ==================== -->
<div class="feature-box">
<h3>Feature 1: Dynamic Editor Layout (Multi-Row/Multi-Group)</h3>

<p><strong>What it does:</strong> Transforms the editor from a hardcoded left/right split into a flexible grid of rows (vertical) and groups (horizontal), each dynamically created and removed based on user actions.</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/editor/const.ts</td><td>Configuration constants (yGroupLimit: 2, xGroupLimit: -1)</td></tr>
<tr><td class="file-path">src/stores/open-files/open-files.store.ts</td><td>Complete rewrite - rows[], groups[], files[] data model</td></tr>
<tr><td class="file-path">src/stores/open-files/open-files.selector.ts</td><td>New selectors for dynamic group access</td></tr>
<tr><td class="file-path">src/features/editor/components/editor-layout.component.tsx</td><td>Renders vertical ResizablePanelGroup for rows</td></tr>
<tr><td class="file-path">src/features/editor/components/editor-row.component.tsx</td><td>NEW - Renders horizontal ResizablePanelGroup for groups</td></tr>
<tr><td class="file-path">src/features/editor/components/editor-group.component.tsx</td><td>Simplified - now uses groupId prop instead of callbacks</td></tr>
</table>

<p><strong>User Flow:</strong></p>
<div class="mermaid-placeholder">
<pre>
sequenceDiagram
    participant User
    participant ContextMenu
    participant Store (Zustand)
    participant Layout

    User->>ContextMenu: Right-click tab → "Split and Move Right"
    ContextMenu->>Store: moveFileToNewGroup(fileId, groupId, 'right')
    Store->>Store: Create new group with UUID
    Store->>Store: Move file from source to new group
    Store->>Store: Update lastFocusedGroupId
    Store->>Layout: Trigger re-render
    Layout->>Layout: Map over rows → EditorRowComponent
    Layout->>Layout: Map over groups → EditorGroupComponent
    Layout-->>User: Shows new split view with file
</pre>
</div>

<p><strong>Data Model Visualization:</strong></p>
<div class="mermaid-placeholder">
<pre>
graph TD
    subgraph OpenFilesState
        A[rows: EditorRow[]] --> B1[Row 1]
        A --> B2[Row 2]

        B1 --> C1[groups: EditorGroup[]]
        C1 --> D1[Group A - id: uuid-1]
        C1 --> D2[Group B - id: uuid-2]

        D1 --> E1[files: OpenFile[]]
        D1 --> E2[activeFileId: string]

        B2 --> C2[groups: EditorGroup[]]
        C2 --> D3[Group C - id: uuid-3]
    end

    F[lastFocusedGroupId] --> D1
</pre>
</div>

<p><strong>Component Hierarchy:</strong></p>
<div class="mermaid-placeholder">
<pre>
graph TD
    A[Workspaces] --> B[EditorDndContextComponent]
    B --> C[EditorLayoutComponent]
    C --> D1[EditorRowComponent - Row 0]
    C --> D2[EditorRowComponent - Row 1]
    D1 --> E1[EditorGroupComponent - Group A]
    D1 --> E2[EditorGroupComponent - Group B]
    E1 --> F1[EditorTabsComponent]
    F1 --> G1[EditorTabComponent]
    F1 --> G2[EditorTabComponent]
    E1 --> H1[EditorContentComponent]
</pre>
</div>

<p><strong>Key Code Segments:</strong></p>

<p><em>Store data structure (open-files.store.ts:46-70):</em></p>
<pre><code>/** Unique group identifier */
export type GroupId = string;
export type RowId = string;

export type EditorGroup = {
  id: GroupId;
  files: OpenFile[];
  activeFileId: string | null;
};

export type EditorRow = {
  id: RowId;
  groups: EditorGroup[];
};

export interface OpenFilesState {
  openFiles: {
    rows: EditorRow[];
    lastFocusedGroupId: GroupId | null;
  };
}</code></pre>

<p><em>Cleanup helper (open-files.store.ts:120-145):</em></p>
<pre><code>/**
 * Remove empty groups and rows after file operations.
 * Always maintains at least one row with one group.
 */
const cleanupEmptyGroupsAndRows = (rows: EditorRow[]): EditorRow[] => {
  const cleanedRows = rows.map(row => ({
    ...row,
    groups: row.groups.filter(g => g.files.length > 0)
  }));
  const nonEmptyRows = cleanedRows.filter(row => row.groups.length > 0);
  if (nonEmptyRows.length === 0) {
    return [createRow()];
  }
  return nonEmptyRows;
};</code></pre>

<p><strong>Data Flow:</strong></p>
<ul>
  <li><strong>Input:</strong> User action (context menu click, drag-drop)</li>
  <li><strong>Processing:</strong> Store finds group location, validates constraints, mutates immutably</li>
  <li><strong>Output:</strong> New rows[] array triggers component re-render</li>
  <li><strong>State changes:</strong> rows structure, lastFocusedGroupId</li>
</ul>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> Using UUIDs for group/row IDs instead of array indices. This prevents bugs when items are reordered or removed, and makes React reconciliation more efficient.
</div>
</div>

<!-- ==================== FEATURE 2 ==================== -->
<div class="feature-box">
<h3>Feature 2: Tab Drag & Drop (dnd-kit)</h3>

<p><strong>What it does:</strong> Enables dragging tabs to reorder within a group or move between groups. Uses @dnd-kit library for smooth animations and accessibility.</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/editor/components/editor-dnd-context.component.tsx</td><td>NEW - DndContext wrapper, drag state provider, DragOverlay</td></tr>
<tr><td class="file-path">src/features/editor/components/editor-tabs.component.tsx</td><td>SortableContext wrapper, drop zone handling</td></tr>
<tr><td class="file-path">src/features/editor/components/editor-tab.component.tsx</td><td>useSortable hook, draggable tab</td></tr>
<tr><td class="file-path">src/features/workspaces/components/workspaces.component.tsx</td><td>Wraps layout with EditorDndContextComponent</td></tr>
</table>

<p><strong>User Flow:</strong></p>
<div class="mermaid-placeholder">
<pre>
sequenceDiagram
    participant User
    participant Tab (useSortable)
    participant DndContext
    participant Store

    User->>Tab: Mouse down + drag 8px
    Tab->>DndContext: onDragStart({fileId, groupId})
    DndContext->>DndContext: Set activeDragState
    DndContext->>DndContext: Show DragOverlay with filename

    User->>Tab: Drag over another tab
    DndContext->>DndContext: onDragOver → update overGroupId, overIndex
    DndContext->>Tab: Via EditorDragContext → show drop indicator

    User->>Tab: Release mouse
    DndContext->>DndContext: onDragEnd
    alt Same group
        DndContext->>Store: reorderFile(fileId, groupId, newIndex)
    else Different group
        DndContext->>Store: moveFileToGroup(fileId, from, to, index)
    end
</pre>
</div>

<p><strong>Key Code Segments:</strong></p>

<p><em>SSR Guard Pattern (editor-dnd-context.component.tsx:90-95):</em></p>
<pre><code>// dnd-kit generates unique IDs that differ between server and client,
// causing hydration mismatches. We defer DnD setup until after first client render.
const [isMounted, setIsMounted] = React.useState(false);
React.useEffect(() => {
  setIsMounted(true);
}, []);

// Render children without DnD context during SSR
if (!isMounted) {
  return <>{children}</>;
}</code></pre>

<p><em>Tab drag data attachment (editor-tab.component.tsx:72-81):</em></p>
<pre><code>const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: file.id,
  data: {
    fileId: file.id,
    fileName: file.name,
    fromGroupId: groupId
  },
  disabled: !isMounted  // Prevent SSR hydration issues
});</code></pre>

<p><em>Drop indicator logic (editor-tabs.component.tsx:180-195):</em></p>
<pre><code>// Show drop indicator before this tab during drag
const showIndicator = dragContext &&
  dragContext.overGroupId === groupId &&
  dragContext.overIndex === tabIndex &&
  dragContext.fileId !== file.id;

// In render:
{showIndicator && (
  <div className="bg-primary absolute top-1 bottom-1 -left-0.5 w-0.5 rounded-full" />
)}</code></pre>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> Using a React Context (EditorDragContext) to share drag state with deeply nested components, avoiding prop drilling through the component tree.
</div>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> SSR safety with isMounted guard. This prevents hydration mismatches because dnd-kit generates different IDs on server vs client.
</div>
</div>

<!-- ==================== FEATURE 3 ==================== -->
<div class="feature-box">
<h3>Feature 3: File Tree Drag to Editor</h3>

<p><strong>What it does:</strong> Allows dragging files from the file explorer directly into editor tab bars, opening them at the exact drop position.</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/files/components/file-tree.component.tsx</td><td>Native HTML5 drag source with custom MIME type</td></tr>
<tr><td class="file-path">src/features/editor/components/editor-tabs.component.tsx</td><td>Drop target handling, calculates insert index</td></tr>
<tr><td class="file-path">src/features/editor/const.ts</td><td>FILE_TREE_MIME_TYPE constant</td></tr>
</table>

<p><strong>Why Two Drag Systems?</strong></p>
<p>The code uses <strong>dnd-kit</strong> for tab operations and <strong>native HTML5 DnD</strong> for file tree drops. This separation is intentional:</p>
<ul>
  <li>dnd-kit provides smooth animations and sortable lists for tab reordering</li>
  <li>HTML5 DnD is simpler for one-way drops from external sources</li>
  <li>Custom MIME type prevents conflicts between the two systems</li>
</ul>

<p><strong>Key Code Segments:</strong></p>

<p><em>Drag source (file-tree.component.tsx:56-60):</em></p>
<pre><code>const handleDragStart = (e: React.DragEvent) => {
  e.dataTransfer.setData(
    FILE_TREE_MIME_TYPE,
    JSON.stringify({ fileId: node.id, fileName: node.name })
  );
  e.dataTransfer.effectAllowed = 'copy';
};</code></pre>

<p><em>Drop handling with type validation (editor-tabs.component.tsx:115-140):</em></p>
<pre><code>const handleDrop = (e: React.DragEvent) => {
  const data = e.dataTransfer.getData(FILE_TREE_MIME_TYPE);
  if (data) {
    try {
      const parsed: unknown = JSON.parse(data);
      // Type-safe validation before use
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'fileId' in parsed &&
        'fileName' in parsed &&
        typeof (parsed as { fileId: unknown }).fileId === 'string' &&
        typeof (parsed as { fileName: unknown }).fileName === 'string'
      ) {
        const { fileId, fileName } = parsed as { fileId: string; fileName: string };
        openFile(fileId, fileName, groupId, insertIndex ?? undefined);
      }
    } catch {
      // Invalid JSON, ignore
    }
  }
};</code></pre>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> Type-safe JSON parsing. The code validates the parsed object's shape before using it, preventing runtime errors from malformed data.
</div>
</div>

<!-- ==================== FEATURE 4 ==================== -->
<div class="feature-box">
<h3>Feature 4: Context Menu with Dynamic Move Options</h3>

<p><strong>What it does:</strong> Right-click context menu on tabs shows intelligent move options based on current layout state. Labels change between "Move Left" (existing group) and "Split and Move Left" (create new group).</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/editor/components/editor-tab.component.tsx</td><td>Context menu rendering with dynamic labels</td></tr>
<tr><td class="file-path">src/stores/open-files/open-files.selector.ts</td><td>useCanMoveInDirection hook - calculates availability</td></tr>
<tr><td class="file-path">src/stores/open-files/open-files.store.ts</td><td>moveFileToNewGroup action with direction logic</td></tr>
</table>

<p><strong>Decision Logic Flow:</strong></p>
<div class="mermaid-placeholder">
<pre>
graph TD
    A[User right-clicks tab] --> B{Check each direction}

    B --> C[LEFT]
    C --> C1{groupIndex === 0?}
    C1 -->|Yes| C2{files.length >= 2?}
    C2 -->|Yes| C3["Split and Move Left" - visible]
    C2 -->|No| C4[Hidden - can't split single file]
    C1 -->|No| C5["Move Left" - visible]

    B --> D[RIGHT]
    D --> D1{groupIndex === last?}
    D1 -->|Yes| D2{files.length >= 2?}
    D2 -->|Yes| D3["Split and Move Right" - visible]
    D2 -->|No| D4[Hidden]
    D1 -->|No| D5["Move Right" - visible]

    B --> E[UP]
    E --> E1{rowIndex === 0?}
    E1 -->|Yes| E2{yGroupLimit reached?}
    E2 -->|No| E3["Split and Move Up" - if 2+ files]
    E2 -->|Yes| E4[Hidden - at limit]
    E1 -->|No| E5["Move Up" - visible]
</pre>
</div>

<p><strong>Key Code Segments:</strong></p>

<p><em>useCanMoveInDirection selector (open-files.selector.ts:95-145):</em></p>
<pre><code>export const useCanMoveInDirection = (
  groupId: GroupId,
  direction: 'left' | 'right' | 'up' | 'down'
): { canMove: boolean; isNewGroup: boolean } =>
  useAppStore(
    useShallow((state: OpenFilesSlice) => {
      // Find group location in rows...
      const hasMultipleFiles = group.files.length >= 2;

      switch (direction) {
        case 'left': {
          const isNewGroup = groupIndex === 0;
          // Can't split and move if only 1 file (nothing would remain)
          return {
            canMove: isNewGroup ? hasMultipleFiles : true,
            isNewGroup
          };
        }
        // ... similar for right, up, down
      }
    })
  );</code></pre>

<p><em>Dynamic label generation (editor-tab.component.tsx:85-92):</em></p>
<pre><code>const DIRECTION_LABELS: Record<MoveDirection, string> = {
  left: 'Left', right: 'Right', up: 'Up', down: 'Down'
};

const getMoveLabel = (direction: MoveDirection, info: { canMove: boolean; isNewGroup: boolean }) => {
  if (info.isNewGroup) {
    return \`Split and Move \${DIRECTION_LABELS[direction]}\`;
  }
  return \`Move \${DIRECTION_LABELS[direction]}\`;
};</code></pre>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> DIRECTION_LABELS defined outside component to prevent object recreation on every render. This is a common React optimization.
</div>
</div>

<!-- ==================== FEATURE 5 ==================== -->
<div class="feature-box">
<h3>Feature 5: Select Opened Files Toggle</h3>

<p><strong>What it does:</strong> A toolbar toggle (Crosshair icon) that syncs the file explorer with the active editor tab. When ON, clicking a tab automatically expands parent folders and selects the file in the explorer.</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/stores/ui/ui.store.ts</td><td>selectOpenedFiles boolean state + toggle action</td></tr>
<tr><td class="file-path">src/stores/ui/ui.selector.ts</td><td>useSelectOpenedFiles hook</td></tr>
<tr><td class="file-path">src/stores/files/files.store.ts</td><td>revealFile action + findPathToFile helper</td></tr>
<tr><td class="file-path">src/features/files/components/files.component.tsx</td><td>Toggle button + auto-reveal on enable</td></tr>
<tr><td class="file-path">src/features/editor/components/editor-tab.component.tsx</td><td>Calls revealFile on tab click when enabled</td></tr>
</table>

<p><strong>Key Code Segments:</strong></p>

<p><em>findPathToFile helper (files.store.ts:170-185):</em></p>
<pre><code>/**
 * Find the path of parent folder IDs from root to a file.
 * Used by revealFile to know which folders to expand.
 */
export const findPathToFile = (tree: FolderNode, fileId: string, path: string[] = []): string[] | null => {
  for (const child of tree.children) {
    if (child.id === fileId) {
      return [...path, tree.id];
    }
    if (child.type === 'folder') {
      const result = findPathToFile(child, fileId, [...path, tree.id]);
      if (result) return result;
    }
  }
  return null;
};</code></pre>

<p><em>Auto-reveal on toggle enable (files.component.tsx:55-63):</em></p>
<pre><code>// When user turns ON the toggle, immediately reveal the current active file
const prevSelectOpenedFiles = useRef(selectOpenedFiles);
useEffect(() => {
  if (selectOpenedFiles && !prevSelectOpenedFiles.current && activeFileId) {
    revealFile(activeFileId);
  }
  prevSelectOpenedFiles.current = selectOpenedFiles;
}, [selectOpenedFiles, activeFileId, revealFile]);</code></pre>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> Using useRef to track previous value and useEffect to detect state transitions. This is the standard React pattern for "do X when Y changes from false to true".
</div>
</div>

<!-- ==================== FEATURE 6 ==================== -->
<div class="feature-box">
<h3>Feature 6: File Tree Context (Prop Drilling Fix)</h3>

<p><strong>What it does:</strong> Eliminates prop drilling in the recursive FileTreeComponent by using React Context. Props reduced from 14+ to just 3 (node, depth, isRoot).</p>

<p><strong>Files involved:</strong></p>
<table>
<tr><th>File</th><th>Purpose</th></tr>
<tr><td class="file-path">src/features/files/components/file-tree-context.tsx</td><td>NEW - Context provider and useFileTreeContext hook</td></tr>
<tr><td class="file-path">src/features/files/components/file-tree.component.tsx</td><td>Consumes context instead of props</td></tr>
<tr><td class="file-path">src/features/files/components/files.component.tsx</td><td>Provides context value</td></tr>
</table>

<p><strong>Before/After Comparison:</strong></p>
<pre><code>// BEFORE: 14+ props passed through every level
&lt;FileTreeComponent
  node={child}
  depth={depth + 1}
  selectedId={selectedId}
  onSelect={onSelect}
  onAddFile={onAddFile}
  onAddFolder={onAddFolder}
  onDelete={onDelete}
  onRename={onRename}
  openFolderIds={openFolderIds}
  onToggleFolder={onToggleFolder}
  editingNode={editingNode}
  onFinishEditing={onFinishEditing}
  onCancelEditing={onCancelEditing}
  renamingId={renamingId}
  onStartRename={onStartRename}
/&gt;

// AFTER: Just 3 props - everything else via context
&lt;FileTreeComponent node={child} depth={depth + 1} /&gt;</code></pre>

<div class="good-pattern">
<strong>✅ Good Pattern:</strong> When you have 5+ props being passed recursively through a tree structure, React Context is the right solution. This improves both DX and performance.
</div>
</div>

<hr>

<h2>🚨 Issues & Concerns (Priority Order)</h2>

<h3>🔴 Critical Issues</h3>
<p><em>No critical issues found!</em></p>

<h3>🟡 Code Quality Issues</h3>

<div class="issue-quality">
<p><strong>Issue 1: Missing Error Boundary for DnD Context</strong></p>
<p><strong>Location:</strong> <code>editor-dnd-context.component.tsx</code></p>
<p><strong>Description:</strong> If dnd-kit throws during drag operations, the entire editor crashes. DnD libraries can fail on touch devices or with certain browser extensions.</p>
<p><strong>Fix:</strong> Wrap DndContext in an Error Boundary that gracefully degrades to non-draggable tabs.</p>
<p><strong>Standard:</strong> React best practice for third-party libraries</p>
</div>

<div class="issue-quality">
<p><strong>Issue 2: Close Others Not Handling Edge Case</strong></p>
<p><strong>Location:</strong> <code>open-files.store.ts:closeOtherFiles</code></p>
<p><strong>Description:</strong> The "Close Others" action should keep the target file active, but if the target file was in a different position, the activeFileId might point to a wrong file briefly.</p>
<p><strong>Fix:</strong> Explicitly set activeFileId to the kept file's ID after filtering.</p>
</div>

<div class="issue-quality">
<p><strong>Issue 3: package-lock.json Deleted</strong></p>
<p><strong>Location:</strong> Root directory</p>
<p><strong>Description:</strong> The package-lock.json was deleted and needs to be regenerated with npm install.</p>
<p><strong>Fix:</strong> Run <code>npm install</code> to regenerate and commit.</p>
</div>

<h3>🟠 Performance Concerns</h3>

<div class="issue-perf">
<p><strong>Issue 1: ResizablePanelGroup Key Stability</strong></p>
<p><strong>Location:</strong> <code>editor-layout.component.tsx:60-70</code> and <code>editor-row.component.tsx:50-60</code></p>
<p><strong>Description:</strong> Using flatMap to insert handles creates new arrays on every render. While React Compiler may optimize this, the pattern could cause ResizablePanel to lose its size state when groups are added/removed.</p>
<p><strong>Impact:</strong> Panel sizes might reset unexpectedly when layout changes.</p>
<p><strong>Fix:</strong> Consider using stable IDs for panels and persisting panel sizes to store.</p>
</div>

<div class="issue-perf">
<p><strong>Issue 2: useCanMoveInDirection Called 4x Per Tab</strong></p>
<p><strong>Location:</strong> <code>editor-tab.component.tsx:68-71</code></p>
<p><strong>Description:</strong> Each tab calls useCanMoveInDirection 4 times (once per direction). With many tabs, this creates overhead.</p>
<p><strong>Impact:</strong> Minor - each call is O(n) where n = number of rows/groups, which is small.</p>
<p><strong>Fix:</strong> Could create a single useAllMoveDirections hook that returns all 4 at once, but not urgent.</p>
</div>

<h3>🟣 Type Safety Issues</h3>

<div class="issue-type">
<p><strong>Issue 1: DragData Type Assertions</strong></p>
<p><strong>Location:</strong> <code>editor-dnd-context.component.tsx:108, 165</code></p>
<p><strong>Description:</strong> Using <code>as DragData | undefined</code> type assertions on dnd-kit event data. If the data structure changes, TypeScript won't catch the mismatch.</p>
<p><strong>Fix:</strong> Create a type guard function: <code>isDragData(data): data is DragData</code></p>
</div>

<h3>🔵 Security Concerns</h3>

<div class="issue-security">
<p><strong>Issue 1: JSON.parse Without Schema Validation</strong></p>
<p><strong>Location:</strong> <code>editor-tabs.component.tsx:127</code></p>
<p><strong>Risk Level:</strong> Low</p>
<p><strong>Description:</strong> While there IS type checking after JSON.parse, using a schema library (Zod) would be more robust.</p>
<p><strong>Fix:</strong> Already mitigated with manual type checking. Could enhance with Zod for consistency with rest of codebase.</p>
</div>

<hr>

<h2>✅ Coding Standards Checklist</h2>

<ul class="checklist">
  <li class="done">Naming conventions: variables, functions, components follow standards</li>
  <li class="done">Error handling: try-catch blocks for JSON parsing, graceful null handling</li>
  <li class="done">Comments: Comprehensive JSDoc comments added to all files</li>
  <li class="done">Debug code removed: no console.logs, debugger statements</li>
  <li class="done">Validation: inputs validated, props typed, parameters checked</li>
  <li>Accessibility: ARIA labels, keyboard navigation, semantic HTML (partial - context menu needs ARIA)</li>
  <li>Tests: No tests added for new functionality</li>
  <li class="done">No magic numbers: constants defined in const.ts</li>
  <li class="done">Type safety: No 'any' types, proper generics</li>
  <li class="done">DRY principle: FileTreeContext eliminates prop drilling duplication</li>
  <li class="done">Dependencies: dnd-kit added with specific versions</li>
  <li class="done">Documentation: JSDoc comments comprehensive</li>
</ul>

<hr>

<h2>🏛️ Architecture Impact</h2>

<div class="mermaid-placeholder">
<pre>
graph TD
    subgraph "Before (Hardcoded)"
        A1[openFiles.left] --> B1[EditorGroupComponent left]
        A2[openFiles.right] --> B2[EditorGroupComponent right]
    end

    subgraph "After (Dynamic)"
        C[openFiles.rows[]] --> D1[Row 0]
        C --> D2[Row 1]
        D1 --> E1[Group A uuid-1]
        D1 --> E2[Group B uuid-2]
        D2 --> E3[Group C uuid-3]
    end

    style A1 fill:#553333
    style A2 fill:#553333
    style C fill:#335533
</pre>
</div>

<p><strong>Changes:</strong></p>
<table>
<tr><th>Category</th><th>Details</th></tr>
<tr><td>Dependencies Added</td><td>@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities</td></tr>
<tr><td>Breaking Changes</td><td>OpenFilesState structure completely changed (sessionStorage will reset)</td></tr>
<tr><td>Database</td><td>No changes - client-only state</td></tr>
<tr><td>API</td><td>No changes</td></tr>
<tr><td>State Management</td><td>open-files store rewritten, ui store extended with selectOpenedFiles</td></tr>
</table>

<hr>

<h2>🧪 Testing Coverage</h2>

<p><strong>What's Tested:</strong></p>
<ul>
  <li>Manual testing (checklist in FILE.md)</li>
</ul>

<p><strong>What's NOT Tested (but should be):</strong></p>
<ul class="checklist">
  <li>Unit tests for store actions (openFile, closeFile, moveFileToGroup, etc.)</li>
  <li>Unit tests for findPathToFile helper</li>
  <li>Unit tests for cleanupEmptyGroupsAndRows</li>
  <li>Integration tests for drag-and-drop flows</li>
  <li>E2E tests for full user workflows</li>
</ul>

<p><strong>Edge Cases to Test:</strong></p>
<ul class="checklist">
  <li>Empty/null inputs (opening file with empty name)</li>
  <li>Closing the last file in the only group</li>
  <li>Dragging tab to same position (no-op)</li>
  <li>Concurrent drag operations (unlikely but possible)</li>
  <li>Very deep folder structures for revealFile</li>
  <li>Many tabs causing overflow dropdown</li>
</ul>

<hr>

<h2>⚡ Quick Review Checklist</h2>

<p>The absolute minimum a reviewer must verify:</p>
<ol>
  <li>☐ <strong>Store rewrite correctness</strong> - Check moveFileToNewGroup and cleanupEmptyGroupsAndRows for edge cases. <em>Estimated: 10 min</em></li>
  <li>☐ <strong>SSR hydration safety</strong> - Verify isMounted pattern in dnd components prevents hydration errors. <em>Estimated: 5 min</em></li>
  <li>☐ <strong>Type safety in DnD handlers</strong> - Check type assertions in drag event handlers. <em>Estimated: 5 min</em></li>
</ol>

<hr>

<h2>⏱️ Estimated Review Time</h2>

<ul>
  <li>⚡ <strong>Quick scan (10-15 min):</strong> Check critical issues and breaking changes only</li>
  <li>📋 <strong>Standard review (30-45 min):</strong> Check issues, logic flow, and standards</li>
  <li>🔍 <strong>Deep dive (60-90 min):</strong> Understand architecture, trace all data flows, test scenarios</li>
</ul>

<hr>

<h2>📊 Summary</h2>

<div class="summary-grid">
  <div class="summary-card" style="border-top: 4px solid #ef4444;">
    <div class="summary-number">0</div>
    <div>Must Fix Before Merge</div>
  </div>
  <div class="summary-card" style="border-top: 4px solid #eab308;">
    <div class="summary-number">5</div>
    <div>Should Fix</div>
  </div>
  <div class="summary-card" style="border-top: 4px solid #3b82f6;">
    <div class="summary-number">3</div>
    <div>Nice to Have</div>
  </div>
</div>

<p><strong>Approval Status:</strong> <span style="color: #4ade80; font-size: 1.5em;">✅ Approved with comments</span></p>

<p>The implementation is solid, well-documented, and follows established patterns. The store rewrite is clean and the component hierarchy makes sense. The main gaps are around testing and a few minor optimizations. Ready to merge after regenerating package-lock.json.</p>

<hr>

<h2>📝 Appendix: Files Changed</h2>

<table>
<tr><th>Status</th><th>File</th><th>Changes</th></tr>
<tr><td style="color:#4ade80;">A</td><td>src/features/editor/components/editor-dnd-context.component.tsx</td><td>215 lines - DnD context provider</td></tr>
<tr><td style="color:#4ade80;">A</td><td>src/features/editor/components/editor-row.component.tsx</td><td>63 lines - Row container</td></tr>
<tr><td style="color:#4ade80;">A</td><td>src/features/editor/const.ts</td><td>56 lines - Configuration constants</td></tr>
<tr><td style="color:#4ade80;">A</td><td>src/features/files/components/file-tree-context.tsx</td><td>103 lines - File tree context</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/editor/components/editor-group.component.tsx</td><td>Simplified props, uses groupId</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/editor/components/editor-layout.component.tsx</td><td>Rewritten for dynamic rows</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/editor/components/editor-tab.component.tsx</td><td>Draggable + context menu</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/editor/components/editor-tabs.component.tsx</td><td>SortableContext + file tree drops</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/files/components/file-tree.component.tsx</td><td>Uses context, draggable files</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/features/files/components/files.component.tsx</td><td>Toggle button, context provider</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/stores/open-files/open-files.store.ts</td><td>Complete rewrite - 626 lines</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/stores/open-files/open-files.selector.ts</td><td>New selectors - 185 lines</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/stores/files/files.store.ts</td><td>Added revealFile + findPathToFile</td></tr>
<tr><td style="color:#eab308;">M</td><td>src/stores/ui/ui.store.ts</td><td>Added selectOpenedFiles state</td></tr>
<tr><td style="color:#ef4444;">D</td><td>package-lock.json</td><td>Deleted - needs regeneration</td></tr>
</table>

</div>
`;
