# Workspace Graph Entity Icons Design

## Overview

Enhance the workspace-graph component to display entity type icons inside circle nodes. Icons are rendered using SVG symbol definitions that reference Remix Icon font glyphs.

## Approach

**For D3 graph nodes:** Use SVG Symbol Definitions - predefine icons as `<symbol>` elements in a hidden SVG `<defs>` block, then reference them with `<use href="#entity-icon-EntityType">`.

**For the rest of the app:** Continue using CSS Font Icons via the existing `getEntityIconClass()` utility.

## Icon Configuration

Single source of truth mapping entity types to both CSS class (for non-D3 usage) and unicode (for SVG symbols):

```typescript
export const ENTITY_ICON_CONFIG: Record<string, { cssClass: string; unicode: string }> = {
  Person: { cssClass: 'ri-user-line', unicode: 'ea67' },
  Organization: { cssClass: 'ri-building-2-line', unicode: 'ea6c' }
};

export const DEFAULT_ENTITY_ICON = { cssClass: 'ri-question-line', unicode: 'f045' };
```

## SVG Symbol Centering

Symbols use a centered viewBox so `<use>` requires no positioning:

```svg
<symbol id="entity-icon-Person" viewBox="-12 -12 24 24">
  <text x="0" y="0" fontFamily="remixicon" textAnchor="middle" dominantBaseline="central">
    {icon glyph}
  </text>
</symbol>
```

- `viewBox="-12 -12 24 24"` centers the coordinate system at (0,0)
- D3 nodes use `<use href="#entity-icon-Person" width="20" height="20" />`
- The 24×24 viewBox scales to fit the 20×20 rendered size

## Ready State

`EntityIconProvider` exposes `useEntityIconsReady()` hook. Workspace graphs wait for icons to be ready before rendering. This supports future API-based icon config loading.

## File Structure

### Files to Create

```
src/components/icons/entity-icon-context.tsx    # Context, provider, SVG defs, useEntityIconsReady hook
```

### Files to Modify

```
src/const.ts                                              # Add ENTITY_ICON_CONFIG with cssClass + unicode
src/lib/utils.ts                                          # Update getEntityIconClass to use new config
src/components/providers/providers.tsx                    # Add EntityIconProvider
src/features/workspace/components/workspace-graph.component.tsx  # Add icon <use> elements to nodes
```

## Implementation Details

### 1. Entity Icon Config (`src/const.ts`)

Add to existing file:

```typescript
/**
 * Entity type icon configuration.
 * Maps entity types to Remix Icon CSS class and unicode for SVG rendering.
 */
export const ENTITY_ICON_CONFIG: Record<string, { cssClass: string; unicode: string }> = {
  Person: { cssClass: 'ri-user-line', unicode: 'ea67' },
  Organization: { cssClass: 'ri-building-2-line', unicode: 'ea6c' }
};

/** Default icon when entity type is not found */
export const DEFAULT_ENTITY_ICON = { cssClass: 'ri-question-line', unicode: 'f045' };
```

### 2. Update utils.ts (`src/lib/utils.ts`)

Update `getEntityIconClass` to use the new config:

```typescript
import { ENTITY_ICON_CONFIG, DEFAULT_ENTITY_ICON } from '@/const';

export function getEntityIconClass(type: string): string {
  return (ENTITY_ICON_CONFIG[type] ?? DEFAULT_ENTITY_ICON).cssClass;
}
```

### 3. Entity Icon Context (`src/components/icons/entity-icon-context.tsx`)

New file with context, provider, and SVG symbol definitions:

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ENTITY_ICON_CONFIG, DEFAULT_ENTITY_ICON } from '@/const';

interface EntityIconContextValue {
  isReady: boolean;
}

const EntityIconContext = createContext<EntityIconContextValue>({ isReady: false });

export const useEntityIconsReady = () => useContext(EntityIconContext).isReady;

interface Props {
  children: ReactNode;
}

/**
 * Provides entity icon definitions and ready state.
 * Renders hidden SVG symbols and signals when they're available.
 * In the future, this will fetch icon config from API before rendering.
 */
export const EntityIconProvider = ({ children }: Props) => {
  const [isReady, setIsReady] = useState(false);

  // Mark ready after initial render (will become API fetch later)
  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <EntityIconContext.Provider value={{ isReady }}>
      {/* SVG symbol definitions */}
      <svg style={{ display: 'none' }}>
        <defs>
          {Object.entries(ENTITY_ICON_CONFIG).map(([entityType, { unicode }]) => (
            <symbol key={entityType} id={`entity-icon-${entityType}`} viewBox="-12 -12 24 24">
              <text
                x="0"
                y="0"
                fontFamily="remixicon"
                fontSize="16"
                textAnchor="middle"
                dominantBaseline="central"
                fill="currentColor"
              >
                {String.fromCodePoint(parseInt(unicode, 16))}
              </text>
            </symbol>
          ))}
          {/* Default/unknown icon */}
          <symbol id="entity-icon-unknown" viewBox="-12 -12 24 24">
            <text
              x="0"
              y="0"
              fontFamily="remixicon"
              fontSize="16"
              textAnchor="middle"
              dominantBaseline="central"
              fill="currentColor"
            >
              {String.fromCodePoint(parseInt(DEFAULT_ENTITY_ICON.unicode, 16))}
            </text>
          </symbol>
        </defs>
      </svg>
      {children}
    </EntityIconContext.Provider>
  );
};
```

### 4. Update Providers (`src/components/providers/providers.tsx`)

Add EntityIconProvider to the provider chain:

```typescript
import { EntityIconProvider } from '@/components/icons/entity-icon-context';

// In the return, wrap children:
<ThemeProvider ...>
  <TanStackQueryProvider>
    <EntityIconProvider>
      {children}
    </EntityIconProvider>
  </TanStackQueryProvider>
</ThemeProvider>
```

### 5. Update WorkspaceGraphComponent (`src/features/workspace/components/workspace-graph.component.tsx`)

Add imports:
```typescript
import { useEntityIconsReady } from '@/components/icons/entity-icon-context';
import { ENTITY_ICON_CONFIG } from '@/const';
```

Add hook and early return:
```typescript
const WorkspaceGraphComponent = ({ workspace }: Props) => {
  const isEntityIconsReady = useEntityIconsReady();
  // ... existing refs and state

  // Wait for entity icon definitions
  if (!isEntityIconsReady) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }
  // ... rest of component
```

In D3 initialization, add icon after circles:
```typescript
// Add circles to nodes
node
  .append('circle')
  .attr('r', GRAPH_CONFIG.nodeRadius)
  .attr('fill', 'hsl(210, 70%, 50%)')
  .attr('stroke', 'white')
  .attr('stroke-width', 2);

// Add entity type icons (centered in circle)
node
  .append('use')
  .attr('href', d => `#entity-icon-${d.type in ENTITY_ICON_CONFIG ? d.type : 'unknown'}`)
  .attr('width', 20)
  .attr('height', 20)
  .attr('fill', 'white');
```

## Change Summary

| File | Change |
|------|--------|
| `src/const.ts` | Add `ENTITY_ICON_CONFIG` and `DEFAULT_ENTITY_ICON` with `{ cssClass, unicode }` |
| `src/lib/utils.ts` | Update `getEntityIconClass()` to import from `const.ts` |
| `src/components/icons/entity-icon-context.tsx` | New file: context, provider, SVG symbol definitions |
| `src/components/providers/providers.tsx` | Wrap children with `EntityIconProvider` |
| `src/features/workspace/components/workspace-graph.component.tsx` | Add `useEntityIconsReady` check, add `<use>` icons to nodes |
