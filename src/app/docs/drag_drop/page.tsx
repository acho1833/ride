'use client';

import { useEffect } from 'react';
import mermaid from 'mermaid';

export default function DragDropPresentationPage() {
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#60a5fa',
        lineColor: '#94a3b8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a'
      }
    });
    mermaid.contentLoaded();
  }, []);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-6xl p-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Tab Drag &amp; Drop Deep Dive</h1>
          <p className="text-muted-foreground text-lg">Understanding dnd-kit implementation in the editor</p>
          <div className="bg-muted mt-4 inline-block rounded-lg px-4 py-2">
            <code>@dnd-kit/core</code> + <code>@dnd-kit/sortable</code>
          </div>
        </header>

        {/* Table of Contents */}
        <nav className="bg-card mb-12 rounded-lg p-6">
          <h2 className="mb-4 text-xl font-semibold">Contents</h2>
          <ol className="text-muted-foreground grid gap-2 md:grid-cols-2">
            <li>
              <a href="#big-picture" className="hover:text-primary">
                1. The Big Picture
              </a>
            </li>
            <li>
              <a href="#component-tree" className="hover:text-primary">
                2. Component Tree
              </a>
            </li>
            <li>
              <a href="#drag-lifecycle" className="hover:text-primary">
                3. Drag Lifecycle
              </a>
            </li>
            <li>
              <a href="#state-flow" className="hover:text-primary">
                4. State Flow
              </a>
            </li>
            <li>
              <a href="#code-walkthrough" className="hover:text-primary">
                5. Code Walkthrough
              </a>
            </li>
            <li>
              <a href="#store-mutations" className="hover:text-primary">
                6. Store Mutations
              </a>
            </li>
          </ol>
        </nav>

        {/* Section 1: Big Picture */}
        <section id="big-picture" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">1. The Big Picture</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">What happens when you drag a tab?</h3>
            <p className="text-muted-foreground mb-4">In plain English, here&apos;s the journey:</p>

            <ol className="space-y-4">
              <li className="border-muted flex gap-4 border-l-2 pl-4">
                <span className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">1</span>
                <div>
                  <strong>Mouse Down + Move 8px</strong>
                  <p className="text-muted-foreground text-sm">
                    The PointerSensor waits for you to move 8 pixels. This prevents accidental drags when you just want to click.
                  </p>
                </div>
              </li>
              <li className="border-muted flex gap-4 border-l-2 pl-4">
                <span className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">2</span>
                <div>
                  <strong>Drag Starts</strong>
                  <p className="text-muted-foreground text-sm">
                    dnd-kit fires <code>onDragStart</code>. We save which file is being dragged and show a floating preview.
                  </p>
                </div>
              </li>
              <li className="border-muted flex gap-4 border-l-2 pl-4">
                <span className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">3</span>
                <div>
                  <strong>Drag Over Tabs</strong>
                  <p className="text-muted-foreground text-sm">
                    As you move, <code>onDragOver</code> fires continuously. We track which tab you&apos;re hovering over and show a blue
                    line indicator.
                  </p>
                </div>
              </li>
              <li className="border-muted flex gap-4 border-l-2 pl-4">
                <span className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">4</span>
                <div>
                  <strong>Drop (Release Mouse)</strong>
                  <p className="text-muted-foreground text-sm">
                    <code>onDragEnd</code> fires. We check: same group? Call <code>reorderFile()</code>. Different group? Call{' '}
                    <code>moveFileToGroup()</code>.
                  </p>
                </div>
              </li>
              <li className="border-muted flex gap-4 border-l-2 pl-4">
                <span className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">5</span>
                <div>
                  <strong>Store Updates → UI Re-renders</strong>
                  <p className="text-muted-foreground text-sm">
                    Zustand updates the <code>rows[]</code> array. React sees the change and re-renders tabs in their new positions.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="mermaid">
            {`
flowchart LR
    A[Mouse Down] --> B{Moved 8px?}
    B -->|No| A
    B -->|Yes| C[onDragStart]
    C --> D[Show DragOverlay]
    D --> E[onDragOver]
    E --> F[Update drop indicator]
    F --> E
    E --> G[Mouse Up]
    G --> H[onDragEnd]
    H --> I{Same group?}
    I -->|Yes| J[reorderFile]
    I -->|No| K[moveFileToGroup]
    J --> L[Store Update]
    K --> L
    L --> M[UI Re-render]
            `}
          </div>
        </section>

        {/* Section 2: Component Tree */}
        <section id="component-tree" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">2. Component Tree</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">How components are nested</h3>
            <p className="text-muted-foreground mb-4">
              The <code>DndContext</code> wraps everything. Each tab is a <code>useSortable</code> item. Tabs within a group share a{' '}
              <code>SortableContext</code>.
            </p>
          </div>

          <div className="mermaid">
            {`
graph TD
    subgraph Workspaces["workspaces.component.tsx"]
        DND["EditorDndContextComponent<br/><small>Provides DndContext</small>"]
    end

    subgraph DndContext["DndContext Wrapper"]
        Layout["EditorLayoutComponent<br/><small>Maps rows[]</small>"]
        Overlay["DragOverlay<br/><small>Floating preview</small>"]
    end

    subgraph Row["EditorRowComponent"]
        Group1["EditorGroupComponent<br/>Group A"]
        Group2["EditorGroupComponent<br/>Group B"]
    end

    subgraph Tabs1["EditorTabsComponent"]
        SC1["SortableContext<br/><small>items=[file IDs]</small>"]
        Tab1["EditorTabComponent<br/><small>useSortable()</small>"]
        Tab2["EditorTabComponent"]
        EndZone1["End Drop Zone<br/><small>useDroppable()</small>"]
    end

    DND --> Layout
    DND --> Overlay
    Layout --> Row
    Group1 --> Tabs1
    SC1 --> Tab1
    SC1 --> Tab2
    SC1 --> EndZone1
            `}
          </div>

          <div className="bg-muted mt-6 rounded-lg p-4">
            <h4 className="mb-2 font-semibold">Key Components:</h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <code className="bg-card rounded px-2 py-1">DndContext</code> - The brain. Manages all drag events.
              </li>
              <li>
                <code className="bg-card rounded px-2 py-1">SortableContext</code> - Tells dnd-kit which items can be sorted together.
              </li>
              <li>
                <code className="bg-card rounded px-2 py-1">useSortable()</code> - Hook that makes a tab draggable AND a drop target.
              </li>
              <li>
                <code className="bg-card rounded px-2 py-1">useDroppable()</code> - Hook for the &quot;end zone&quot; (drop after last tab).
              </li>
              <li>
                <code className="bg-card rounded px-2 py-1">DragOverlay</code> - The floating preview that follows your cursor.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Drag Lifecycle */}
        <section id="drag-lifecycle" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">3. Drag Lifecycle (Sequence Diagram)</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">Event sequence when dragging a tab</h3>
            <p className="text-muted-foreground">This shows exactly what happens, step by step, when you drag a tab to a new position.</p>
          </div>

          <div className="mermaid">
            {`
sequenceDiagram
    participant User
    participant Tab as EditorTabComponent<br/>(useSortable)
    participant DND as DndContext
    participant Ctx as EditorDragContext<br/>(React Context)
    participant Store as Zustand Store

    Note over User,Store: PHASE 1: Drag Activation
    User->>Tab: Mouse down
    Tab->>DND: PointerSensor activated
    User->>Tab: Move cursor 8px
    DND->>DND: Activation threshold met

    Note over User,Store: PHASE 2: Drag Start
    DND->>DND: onDragStart fires
    DND->>Ctx: setActiveDragState({fileId, fileName, fromGroupId})
    Ctx->>Tab: DragOverlay becomes visible

    Note over User,Store: PHASE 3: Drag Over (repeats as cursor moves)
    User->>Tab: Move cursor over tabs
    DND->>DND: onDragOver fires
    DND->>DND: Detect which tab cursor is over
    DND->>Ctx: Update overGroupId, overIndex
    Ctx->>Tab: Show blue drop indicator

    Note over User,Store: PHASE 4: Drop
    User->>Tab: Release mouse
    DND->>DND: onDragEnd fires
    DND->>Ctx: setActiveDragState(null)

    alt Same Group (reorder)
        DND->>Store: reorderFile(fileId, groupId, newIndex)
    else Different Group (move)
        DND->>Store: moveFileToGroup(fileId, from, to, index)
    end

    Store->>Store: Update rows[] array
    Store->>Tab: Trigger re-render
    Tab->>User: Tabs appear in new order
            `}
          </div>
        </section>

        {/* Section 4: State Flow */}
        <section id="state-flow" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">4. State Flow During Drag</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">How state changes at each phase</h3>
            <p className="text-muted-foreground">
              The <code>activeDragState</code> tracks everything about the current drag operation.
            </p>
          </div>

          {/* State boxes */}
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            <div className="bg-card rounded-lg p-4">
              <h4 className="text-destructive mb-2 font-semibold">Before Drag (idle)</h4>
              <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                {`activeDragState = null

// No drag happening
// DragOverlay hidden
// No drop indicators`}
              </pre>
            </div>

            <div className="bg-card rounded-lg p-4">
              <h4 className="mb-2 font-semibold text-yellow-500">onDragStart</h4>
              <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                {`activeDragState = {
  fileId: "ws1",
  fileName: "WS1.ws",
  fromGroupId: "group-a",
  overGroupId: "group-a", // starts in source
  overIndex: null         // no target yet
}`}
              </pre>
            </div>

            <div className="bg-card rounded-lg p-4">
              <h4 className="mb-2 font-semibold text-blue-500">onDragOver (hovering tab index 2)</h4>
              <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                {`activeDragState = {
  fileId: "ws1",
  fileName: "WS1.ws",
  fromGroupId: "group-a",
  overGroupId: "group-b", // moved to group B!
  overIndex: 2            // before 3rd tab
}`}
              </pre>
            </div>

            <div className="bg-card rounded-lg p-4">
              <h4 className="mb-2 font-semibold text-green-500">onDragEnd</h4>
              <pre className="bg-muted overflow-x-auto rounded p-3 text-sm">
                {`activeDragState = null  // cleared

// Then store action called:
moveFileToGroup(
  "ws1",      // fileId
  "group-a",  // from
  "group-b",  // to
  2           // insertIndex
)`}
              </pre>
            </div>
          </div>

          <div className="mermaid">
            {`
stateDiagram-v2
    [*] --> Idle: Page Load
    Idle --> DragStarted: Mouse down + move 8px
    DragStarted --> DragOver: Cursor moves
    DragOver --> DragOver: Cursor keeps moving<br/>(update overGroupId, overIndex)
    DragOver --> DragEnded: Mouse up
    DragEnded --> StoreUpdate: Call reorder/move
    StoreUpdate --> Idle: State cleared

    note right of DragStarted
        activeDragState set
        DragOverlay visible
    end note

    note right of DragOver
        Drop indicator shown
        at current overIndex
    end note

    note right of StoreUpdate
        rows[] array mutated
        React re-renders
    end note
            `}
          </div>
        </section>

        {/* Section 5: Code Walkthrough */}
        <section id="code-walkthrough" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">5. Code Walkthrough</h2>

          {/* DndContext Setup */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">5.1 Setting up DndContext</h3>
            <p className="text-muted-foreground mb-4">
              File: <code>editor-dnd-context.component.tsx</code>
            </p>

            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// Configure how drags are detected
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8  // Must move 8px before drag starts
                   // This prevents accidental drags on click
    }
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  })
);

// The main DnD wrapper
<DndContext
  sensors={sensors}
  collisionDetection={pointerWithin}  // How to detect what you're over
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
>
  {/* All editor components go here */}
</DndContext>`}
            </pre>

            <div className="bg-muted rounded p-3 text-sm">
              <strong>Why distance: 8?</strong>
              <p className="text-muted-foreground">
                Without this, clicking a tab would start a drag. The 8px threshold means you must intentionally drag, not just click.
              </p>
            </div>
          </div>

          {/* useSortable Hook */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">5.2 Making a Tab Draggable</h3>
            <p className="text-muted-foreground mb-4">
              File: <code>editor-tab.component.tsx</code>
            </p>

            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`const {
  attributes,    // ARIA props for accessibility
  listeners,     // onPointerDown, etc.
  setNodeRef,    // Ref to track this DOM element
  transform,     // { x, y } position offset during drag
  transition,    // CSS transition string
  isDragging     // Boolean: am I being dragged?
} = useSortable({
  id: file.id,   // Unique identifier for this tab
  data: {
    // Custom data attached to drag events
    fileId: file.id,
    fileName: file.name,
    fromGroupId: groupId
  },
  disabled: !isMounted  // SSR safety
});

// Apply to the DOM element
<div
  ref={setNodeRef}           // dnd-kit tracks this element
  style={{
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }}
  {...attributes}            // Spread ARIA props
  {...listeners}             // Spread event handlers
>
  {file.name}
</div>`}
            </pre>

            <div className="bg-muted rounded p-3 text-sm">
              <strong>What useSortable gives you:</strong>
              <ul className="text-muted-foreground mt-2 list-inside list-disc">
                <li>
                  <code>setNodeRef</code> - Tells dnd-kit &quot;this is the draggable element&quot;
                </li>
                <li>
                  <code>transform</code> - Position offset while dragging (for animations)
                </li>
                <li>
                  <code>listeners</code> - Event handlers (pointer down, key down, etc.)
                </li>
                <li>
                  <code>isDragging</code> - Style the element differently while dragging
                </li>
              </ul>
            </div>
          </div>

          {/* Event Handlers */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">5.3 Handling Drag Events</h3>
            <p className="text-muted-foreground mb-4">
              File: <code>editor-dnd-context.component.tsx</code>
            </p>

            <h4 className="mt-4 font-semibold text-yellow-500">onDragStart</h4>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`const handleDragStart = (event: DragStartEvent) => {
  const { active } = event;
  const data = active.data.current;  // Our custom data

  if (data) {
    setActiveDragState({
      fileId: data.fileId,
      fileName: data.fileName,
      fromGroupId: data.fromGroupId,
      overGroupId: data.fromGroupId,  // Start in source
      overIndex: null
    });
  }
};`}
            </pre>

            <h4 className="mt-4 font-semibold text-blue-500">onDragOver</h4>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`const handleDragOver = (event: DragOverEvent) => {
  const { over } = event;
  if (!activeDragState) return;

  const overData = over?.data.current;
  const overGroupId = overData?.fromGroupId ?? null;

  // Get insert index from sortable data or end zone
  let overIndex: number | null = null;
  if (overData?.isEndZone) {
    overIndex = overData.endIndex;  // Append at end
  } else {
    overIndex = over?.data.current?.sortable?.index ?? null;
  }

  // Only update if changed (optimization)
  if (overGroupId !== activeDragState.overGroupId ||
      overIndex !== activeDragState.overIndex) {
    setActiveDragState(prev => ({
      ...prev,
      overGroupId,
      overIndex
    }));
  }
};`}
            </pre>

            <h4 className="mt-4 font-semibold text-green-500">onDragEnd</h4>
            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  setActiveDragState(null);  // Clear state, hide overlay

  // No valid drop or dropped on self
  if (!over || active.id === over.id) return;

  const dragData = active.data.current;
  const overData = over.data.current;

  const fileId = dragData.fileId;
  const fromGroupId = dragData.fromGroupId;
  const toGroupId = overData.fromGroupId;
  const insertIndex = overData.isEndZone
    ? overData.endIndex
    : over.data.current?.sortable?.index;

  // Branch based on same/different group
  if (fromGroupId === toGroupId) {
    reorderFile(fileId, fromGroupId, insertIndex);
  } else {
    moveFileToGroup(fileId, fromGroupId, toGroupId, insertIndex);
  }
};`}
            </pre>
          </div>

          {/* SSR Safety */}
          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">5.4 SSR Hydration Safety</h3>
            <p className="text-muted-foreground mb-4">
              <strong>Problem:</strong> dnd-kit generates unique IDs. Server and client generate different IDs → hydration error!
            </p>

            <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4 text-sm">
              {`// The fix: Don't render DnD until client-side
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);  // Only runs on client
}, []);

// During SSR (isMounted = false): render plain children
// After hydration (isMounted = true): render with DndContext
if (!isMounted) {
  return <>{children}</>;
}

return (
  <DndContext ...>
    {children}
  </DndContext>
);`}
            </pre>

            <div className="mermaid">
              {`
sequenceDiagram
    participant Server
    participant Browser
    participant React

    Server->>Browser: HTML (isMounted=false, no DnD)
    Browser->>React: Hydrate
    React->>React: useEffect runs
    React->>React: setIsMounted(true)
    React->>Browser: Re-render with DndContext
    Note over Browser: Now drag works!
              `}
            </div>
          </div>
        </section>

        {/* Section 6: Store Mutations */}
        <section id="store-mutations" className="mb-16">
          <h2 className="border-primary mb-6 border-b pb-2 text-2xl font-bold">6. Store Mutations</h2>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">6.1 reorderFile (Same Group)</h3>
            <p className="text-muted-foreground mb-4">
              File: <code>open-files.store.ts</code> - When you reorder tabs within the same group.
            </p>

            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div className="bg-muted rounded p-3">
                <strong>Before:</strong>
                <div className="mt-2 flex gap-2">
                  <span className="rounded bg-blue-600 px-2 py-1 text-sm">WS1</span>
                  <span className="rounded bg-gray-600 px-2 py-1 text-sm">WS2</span>
                  <span className="rounded bg-gray-600 px-2 py-1 text-sm">TXT1</span>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">Drag WS1 to index 2</p>
              </div>
              <div className="bg-muted rounded p-3">
                <strong>After:</strong>
                <div className="mt-2 flex gap-2">
                  <span className="rounded bg-gray-600 px-2 py-1 text-sm">WS2</span>
                  <span className="rounded bg-gray-600 px-2 py-1 text-sm">TXT1</span>
                  <span className="rounded bg-blue-600 px-2 py-1 text-sm">WS1</span>
                </div>
              </div>
            </div>

            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`reorderFile: (fileId, groupId, newIndex) => set(state => {
  // 1. Find the group containing this file
  const location = findGroupLocation(rows, groupId);

  // 2. Find current position
  const currentIndex = group.files.findIndex(f => f.id === fileId);
  // currentIndex = 0 (WS1 is first)

  // 3. Remove from current position
  const newFiles = [...group.files];
  const [movedFile] = newFiles.splice(currentIndex, 1);
  // newFiles = [WS2, TXT1]
  // movedFile = { id: 'ws1', name: 'WS1.ws' }

  // 4. Insert at new position
  newFiles.splice(newIndex, 0, movedFile);
  // newFiles = [WS2, TXT1, WS1]

  // 5. Return new state (immutable update)
  return { openFiles: { rows: newRows } };
})`}
            </pre>
          </div>

          <div className="bg-card mb-6 rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">6.2 moveFileToGroup (Cross-Group)</h3>
            <p className="text-muted-foreground mb-4">When you drag a tab from one group to another.</p>

            <div className="mb-4">
              <div className="bg-muted mb-2 rounded p-3">
                <strong>Before:</strong>
                <div className="mt-2 flex gap-4">
                  <div>
                    <div className="text-muted-foreground mb-1 text-xs">Group A</div>
                    <div className="flex gap-1">
                      <span className="rounded bg-blue-600 px-2 py-1 text-sm">WS1</span>
                      <span className="rounded bg-gray-600 px-2 py-1 text-sm">WS2</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 text-xs">Group B</div>
                    <div className="flex gap-1">
                      <span className="rounded bg-gray-600 px-2 py-1 text-sm">WS3</span>
                      <span className="rounded bg-gray-600 px-2 py-1 text-sm">TXT1</span>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">Drag WS1 to Group B at index 1</p>
              </div>
              <div className="bg-muted rounded p-3">
                <strong>After:</strong>
                <div className="mt-2 flex gap-4">
                  <div>
                    <div className="text-muted-foreground mb-1 text-xs">Group A</div>
                    <div className="flex gap-1">
                      <span className="rounded bg-gray-600 px-2 py-1 text-sm">WS2</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 text-xs">Group B</div>
                    <div className="flex gap-1">
                      <span className="rounded bg-gray-600 px-2 py-1 text-sm">WS3</span>
                      <span className="rounded bg-blue-600 px-2 py-1 text-sm">WS1</span>
                      <span className="rounded bg-gray-600 px-2 py-1 text-sm">TXT1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              {`moveFileToGroup: (fileId, fromGroupId, toGroupId, insertIndex) => set(state => {
  // 1. Find both groups
  const fromLocation = findGroupLocation(rows, fromGroupId);
  const toLocation = findGroupLocation(rows, toGroupId);

  // 2. Get the file to move
  const file = fromLocation.group.files.find(f => f.id === fileId);
  // file = { id: 'ws1', name: 'WS1.ws' }

  // 3. Remove from source group
  const newFromFiles = fromGroup.files.filter(f => f.id !== fileId);
  // newFromFiles = [WS2]

  // 4. If we removed the active file, pick a new one
  if (fromGroup.activeFileId === fileId) {
    newFromActiveId = newFromFiles[0]?.id ?? null;
    // newFromActiveId = 'ws2'
  }

  // 5. Insert into target group at index
  const targetFiles = [...toGroup.files];
  targetFiles.splice(insertIndex, 0, file);
  // targetFiles = [WS3, WS1, TXT1]

  // 6. Build new rows array (immutable)
  // ... update both source and target groups

  // 7. Clean up empty groups
  newRows = cleanupEmptyGroupsAndRows(newRows);

  // 8. Update focus to target group
  return {
    openFiles: {
      rows: newRows,
      lastFocusedGroupId: toGroupId
    }
  };
})`}
            </pre>
          </div>

          {/* Data flow diagram */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">6.3 Complete Data Flow</h3>

            <div className="mermaid">
              {`
flowchart TD
    subgraph UI ["UI Layer"]
        Tab["EditorTabComponent<br/><small>useSortable()</small>"]
        Overlay["DragOverlay"]
        Indicator["Drop Indicator"]
    end

    subgraph Context ["Context Layer"]
        DND["DndContext<br/><small>onDragStart/Over/End</small>"]
        EDC["EditorDragContext<br/><small>activeDragState</small>"]
    end

    subgraph Store ["Zustand Store"]
        Actions["Actions<br/><small>reorderFile()<br/>moveFileToGroup()</small>"]
        State["State<br/><small>rows[], lastFocusedGroupId</small>"]
    end

    Tab -->|drag events| DND
    DND -->|updates| EDC
    EDC -->|reads| Overlay
    EDC -->|reads| Indicator
    DND -->|onDragEnd| Actions
    Actions -->|set()| State
    State -->|selector| Tab
              `}
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="bg-card rounded-lg p-6">
          <h2 className="mb-4 text-xl font-bold">Quick Reference Summary</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-muted rounded p-4">
              <h3 className="mb-2 font-semibold">Key Files</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>
                  <code>editor-dnd-context.component.tsx</code>
                </li>
                <li>
                  <code>editor-tabs.component.tsx</code>
                </li>
                <li>
                  <code>editor-tab.component.tsx</code>
                </li>
                <li>
                  <code>open-files.store.ts</code>
                </li>
              </ul>
            </div>

            <div className="bg-muted rounded p-4">
              <h3 className="mb-2 font-semibold">Key Hooks</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>
                  <code>useSortable()</code> - draggable tab
                </li>
                <li>
                  <code>useDroppable()</code> - end zone
                </li>
                <li>
                  <code>useSensors()</code> - activation config
                </li>
              </ul>
            </div>

            <div className="bg-muted rounded p-4">
              <h3 className="mb-2 font-semibold">Store Actions</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>
                  <code>reorderFile()</code> - same group
                </li>
                <li>
                  <code>moveFileToGroup()</code> - cross group
                </li>
                <li>
                  <code>cleanupEmptyGroupsAndRows()</code>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-muted-foreground mt-12 text-center text-sm">
          <p>
            Created for understanding the drag-drop implementation in <code>drag_drop</code> branch
          </p>
        </footer>
      </div>
    </div>
  );
}
