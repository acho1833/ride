# Entity Search Autocomplete Implementation Plan

**Goal:** Create a reusable `AutoComplete` component (similar to PrimeReact's API) and use it for entity name search with case-insensitive `startsWith` matching, arrow key navigation, and debounced queries.

**Architecture:**
1. Create a generic `AutoComplete` component in `src/components/ui/` following PrimeReact's API pattern
2. Add autocomplete backend endpoint
3. Use the new component in entity search form

**Tech Stack:** Next.js, oRPC, React Query, Shadcn Popover/Command (cmdk), Tailwind CSS

---

## PrimeReact API Reference

```tsx
<AutoComplete
  field="name"                    // Property to display from suggestion objects
  value={selectedCountry}         // Currently selected value (controlled)
  suggestions={filteredCountries} // Array of filtered suggestions
  completeMethod={search}         // Callback when user types - receives { query }
  onChange={(e) => setValue(e.value)}  // Callback when selection changes
  itemTemplate={itemTemplate}     // (Optional) Custom render function - defaults to field value
  loading={isLoading}             // Shows rotating spinner on right side of input
/>
```

---

## Files to Create/Modify

```
src/
├── components/
│   └── ui/
│       └── autocomplete.tsx                        # NEW - reusable component
├── hooks/
│   └── useDebounce.ts                              # NEW - debounce hook
│
├── features/
│   └── entity-search/
│       ├── server/
│       │   ├── routers.ts                          # MODIFY - add autocomplete endpoint
│       │   └── services/
│       │       ├── entity.service.ts               # MODIFY - add autocomplete function
│       │       └── entity.mock-service.ts          # MODIFY - add autocomplete function
│       ├── hooks/
│       │   └── useEntityAutocompleteQuery.ts       # NEW - autocomplete query hook
│       └── components/
│           └── entity-search-form.component.tsx    # MODIFY - use AutoComplete component
```

**Summary: 3 new files, 4 modified files**

---

## Task 1: Create useDebounce Hook

**Why:** Prevent excessive API calls while user types.

**File:** `src/hooks/useDebounce.ts`

```typescript
import { useState, useEffect } from 'react';

/**
 * Debounce a value by a specified delay.
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## Task 2: Create Reusable AutoComplete Component

**Why:** Generic, reusable autocomplete following PrimeReact's API pattern. Can be used throughout the app.

**File:** `src/components/ui/autocomplete.tsx`

### API Design

```typescript
interface AutoCompleteProps<T> {
  /** Property name to display from suggestion objects (e.g., "name" displays item.name) */
  field: keyof T;
  /** Currently selected value (controlled) */
  value: T | null;
  /** Array of filtered suggestions to display */
  suggestions: T[];
  /** Callback when user types - receives { query: string } */
  completeMethod: (event: { query: string }) => void;
  /** Callback when selection changes - receives { value: T | null } */
  onChange: (event: { value: T | null }) => void;
  /** (Optional) Custom render function for each suggestion item - defaults to displaying field value */
  itemTemplate?: (item: T) => React.ReactNode;
  /** Placeholder text for input */
  placeholder?: string;
  /** Show rotating loading spinner on right side of input while fetching */
  loading?: boolean;
  /** Input className */
  className?: string;
  /** Disable the input */
  disabled?: boolean;
}
```

### Implementation

```typescript
'use client';

import { useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';

interface AutoCompleteProps<T> {
  field: keyof T;
  value: T | null;
  suggestions: T[];
  completeMethod: (event: { query: string }) => void;
  onChange: (event: { value: T | null }) => void;
  itemTemplate?: (item: T) => React.ReactNode;
  placeholder?: string;
  loading?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Reusable AutoComplete component with PrimeReact-like API.
 * Built on shadcn Popover + Command (cmdk) for keyboard navigation.
 *
 * - field: Required property to display from suggestion objects
 * - itemTemplate: Optional custom render - if not provided, displays field value
 * - loading: Shows rotating spinner on right side of input
 * - Dropdown only shows when there are suggestions (no empty state)
 */
export function AutoComplete<T extends { id?: string | number }>({
  field,
  value,
  suggestions,
  completeMethod,
  onChange,
  itemTemplate,
  placeholder = 'Search...',
  loading = false,
  className,
  disabled = false
}: AutoCompleteProps<T>) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Get display text from item using the field property
  const getDisplayText = (item: T): string => {
    return String(item[field]);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);
    completeMethod({ query });
  };

  // Handle item selection
  const handleSelect = (item: T) => {
    onChange({ value: item });
    setInputValue(getDisplayText(item));
    setOpen(false);
    inputRef.current?.focus();
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
    // Arrow down opens dropdown if closed and has suggestions
    if (e.key === 'ArrowDown' && !open && suggestions.length > 0) {
      setOpen(true);
    }
  };

  // Display value: selected value's field, or current input
  const displayValue = value ? getDisplayText(value) : inputValue;

  // Only show dropdown when there are suggestions
  const showDropdown = open && suggestions.length > 0;

  return (
    <Popover open={showDropdown} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            disabled={disabled}
            className="pr-8"
          />
          {/* Loading spinner on right side of input */}
          {loading && (
            <Loader2Icon className="text-muted-foreground absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Don't close if clicking the input
          if (inputRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandGroup>
              {suggestions.map((item, index) => {
                const key = item.id !== undefined ? String(item.id) : index;
                return (
                  <CommandItem
                    key={key}
                    value={String(key)}
                    onSelect={() => handleSelect(item)}
                  >
                    {/* Use itemTemplate if provided, otherwise display field value */}
                    {itemTemplate ? itemTemplate(item) : getDisplayText(item)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Task 3: Add Autocomplete to Backend

**Why:** Server-side autocomplete with `startsWith` matching (case-insensitive), limited to 10 results.

### 3a. Mock Service

**File:** `src/features/entity-search/server/services/entity.mock-service.ts`

Add after `getEntityTypes`:

```typescript
/**
 * Autocomplete entities by name prefix (case-insensitive startsWith match).
 * Returns max 10 suggestions for dropdown display.
 */
export async function autocompleteEntities(prefix: string): Promise<EntityResponse[]> {
  if (!prefix || prefix.trim() === '') {
    return [];
  }

  const normalizedPrefix = prefix.trim().toLowerCase();

  return MOCK_ENTITIES
    .filter(e => e.labelNormalized.toLowerCase().startsWith(normalizedPrefix))
    .sort((a, b) => a.labelNormalized.localeCompare(b.labelNormalized))
    .slice(0, 10);
}
```

### 3b. Service Layer

**File:** `src/features/entity-search/server/services/entity.service.ts`

Add after `getEntityTypes`:

```typescript
/**
 * Autocomplete entities by name prefix.
 */
export async function autocompleteEntities(prefix: string): Promise<Entity[]> {
  const mockResponse = await mockService.autocompleteEntities(prefix);
  return mockResponse.map(toEntity);
}
```

### 3c. Router

**File:** `src/features/entity-search/server/routers.ts`

Add to `entityRouter`:

```typescript
  /**
   * GET /entities/autocomplete - Autocomplete entity names.
   * Returns max 10 entities matching the prefix (case-insensitive startsWith).
   */
  autocomplete: appProcedure
    .route({
      method: 'GET',
      path: `${API_ENTITY_PREFIX}/autocomplete`,
      summary: 'Autocomplete entity names by prefix',
      tags
    })
    .input(z.object({ prefix: z.string() }))
    .output(entitySchema.array())
    .handler(async ({ input }) => {
      return entityService.autocompleteEntities(input.prefix);
    })
```

---

## Task 4: Create Autocomplete Query Hook

**File:** `src/features/entity-search/hooks/useEntityAutocompleteQuery.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for autocomplete entity names.
 * @param prefix - Search prefix (case-insensitive startsWith match)
 * @param enabled - Whether to execute the query
 */
export const useEntityAutocompleteQuery = (prefix: string, enabled: boolean = true) => {
  return useQuery({
    ...orpc.entity.autocomplete.queryOptions({ input: { prefix } }),
    enabled: enabled && prefix.trim().length > 0
  });
};
```

---

## Task 5: Update Entity Search Form

**Why:** Use the new AutoComplete component for entity name search.

**File:** `src/features/entity-search/components/entity-search-form.component.tsx`

Key changes:
1. Import `AutoComplete` component and `useDebounce` hook
2. Replace plain Input with AutoComplete
3. Use `completeMethod` to trigger autocomplete query
4. Custom `itemTemplate` with entity icon and type

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { AutoComplete } from '@/components/ui/autocomplete';
import { ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { useEntityTypesQuery } from '../hooks/useEntityTypesQuery';
import { useEntityAutocompleteQuery } from '../hooks/useEntityAutocompleteQuery';
import { useDebounce } from '@/hooks/useDebounce';
import { getEntityIconClass } from '@/lib/utils';
import { Entity } from '@/models/entity.model';

const entitySearchFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  types: z.array(z.string())
});

interface EntitySearchFormValues {
  name: string;
  types: string[];
}

interface Props {
  onSearch: (name: string, types: string[]) => void;
}

const EntitySearchFormComponent = ({ onSearch }: Props) => {
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  const { data: entityTypes = [] } = useEntityTypesQuery();

  const form = useForm<EntitySearchFormValues>({
    resolver: zodResolver(entitySearchFormSchema),
    defaultValues: { name: '', types: [] }
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() required for reactive form state
  const selectedTypes = form.watch('types');

  // Debounce autocomplete query
  const debouncedQuery = useDebounce(autocompleteQuery, 300);

  // Fetch autocomplete suggestions
  const { data: suggestions = [], isPending } = useEntityAutocompleteQuery(debouncedQuery);

  // Handle autocomplete query change
  const handleCompleteMethod = (event: { query: string }) => {
    setAutocompleteQuery(event.query);
  };

  // Handle autocomplete selection
  const handleAutocompleteChange = (event: { value: Entity | null }) => {
    setSelectedEntity(event.value);
    if (event.value) {
      form.setValue('name', event.value.labelNormalized);
    }
  };

  // Custom item template with icon
  const itemTemplate = (entity: Entity) => (
    <>
      <i className={`${getEntityIconClass(entity.type)} text-muted-foreground mr-2`} />
      <span className="flex-1 truncate">{entity.labelNormalized}</span>
      <span className="text-muted-foreground text-xs">{entity.type}</span>
    </>
  );

  const onSubmit = (data: EntitySearchFormValues) => {
    onSearch(data.name, data.types);
  };

  const toggleType = (type: string) => {
    const current = form.getValues('types');
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    form.setValue('types', updated);
  };

  const clearTypes = () => {
    form.setValue('types', []);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
        {/* Name search with autocomplete */}
        <div className="flex items-center gap-x-1">
          <FormField
            control={form.control}
            name="name"
            render={() => (
              <FormItem className="flex-1">
                <FormControl>
                  <AutoComplete<Entity>
                    field="labelNormalized"
                    value={selectedEntity}
                    suggestions={suggestions}
                    completeMethod={handleCompleteMethod}
                    onChange={handleAutocompleteChange}
                    itemTemplate={itemTemplate}
                    placeholder="Search by name..."
                    loading={isPending}
                    className="h-7 text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0">
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Type filter (unchanged) */}
        <div className="flex items-center gap-x-1">
          <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 justify-between text-xs">
                {selectedTypes.length === 0 ? 'All Types' : `${selectedTypes.length} selected`}
                <ChevronDownIcon className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="flex flex-col gap-y-1">
                {entityTypes.map(type => (
                  <label key={type} className="hover:bg-accent flex cursor-pointer items-center gap-x-2 rounded p-1">
                    <Checkbox checked={selectedTypes.includes(type)} onCheckedChange={() => toggleType(type)} />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {selectedTypes.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearTypes}>
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>

        {selectedTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTypes.map(type => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        )}
      </form>
    </Form>
  );
};

export default EntitySearchFormComponent;
```

---

## Verification

### Manual Test

1. `npm run dev`
2. Open `http://localhost:3000`
3. Click "Entity Search" icon
4. Type "person" in name field
5. Verify dropdown appears after 300ms with suggestions
6. Verify suggestions start with "person" (case-insensitive)
7. Use arrow keys to navigate (up/down)
8. Press Enter to select highlighted item
9. Click a suggestion to select it
10. Verify selected name appears in input
11. Press Enter or click search button to search

### Checklist

- [ ] Typing triggers autocomplete after 300ms debounce
- [ ] Case-insensitive `startsWith` matching
- [ ] Max 10 suggestions
- [ ] Dropdown only appears when there are suggestions (no empty state)
- [ ] Arrow keys navigate (up/down)
- [ ] Enter selects highlighted suggestion
- [ ] Click selects suggestion
- [ ] Escape closes dropdown
- [ ] Click outside closes dropdown
- [ ] Form submission works
- [ ] Icons display for each entity type
- [ ] Loading spinner shows on right side of input during fetch

---

## Sources

- [shadcn Combobox](https://ui.shadcn.com/docs/components/combobox)
- [DEV Community - Autocomplete with shadcn](https://dev.to/thevideopilot/using-shadcnui-for-an-autocomplete-component-4cgc)
- [Balastrong shadcn-autocomplete-demo](https://github.com/Balastrong/shadcn-autocomplete-demo)
- [PrimeReact AutoComplete](https://primereact.org/autocomplete/)
