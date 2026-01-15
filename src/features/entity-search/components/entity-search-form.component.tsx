'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { useEntityTypesQuery } from '../hooks/useEntityTypesQuery';

/** Zod schema for entity search form validation */
const entitySearchFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  types: z.array(z.string())
});

/** Form values type - explicitly defined per CLAUDE.md guidelines */
interface EntitySearchFormValues {
  name: string;
  types: string[];
}

interface Props {
  /** Callback when search is submitted (Enter key or button click) */
  onSearch: (name: string, types: string[]) => void;
}

/**
 * Entity search form with name input and type multi-select filter.
 * Uses react-hook-form with zod validation for all form state.
 * Search is triggered on form submit (Enter key or search button).
 * Empty type selection means "show all types" (no filter).
 */
const EntitySearchFormComponent = ({ onSearch }: Props) => {
  // Popover open state (UI-only, not form data)
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);

  // Fetch available entity types for the dropdown
  const { data: entityTypes = [] } = useEntityTypesQuery();

  // Initialize react-hook-form with zod validation
  const form = useForm<EntitySearchFormValues>({
    resolver: zodResolver(entitySearchFormSchema),
    defaultValues: { name: '', types: [] }
  });

  // Watch types for reactive UI updates
  // eslint-disable-next-line react-hooks/incompatible-library -- watch() is required for reactive form state; no memoization-safe alternative exists
  const selectedTypes = form.watch('types');

  // Handle form submission
  const onSubmit = (data: EntitySearchFormValues) => {
    onSearch(data.name, data.types);
  };

  // Toggle a type in the multi-select
  const toggleType = (type: string) => {
    const current = form.getValues('types');
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    form.setValue('types', updated);
  };

  // Clear all selected types
  const clearTypes = () => {
    form.setValue('types', []);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
        {/* Name search input with submit button */}
        <div className="flex items-center gap-x-1">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input type="text" placeholder="Search by name..." className="h-7 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0">
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Type filter multi-select dropdown */}
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

          {/* Clear button - only shown when types are selected */}
          {selectedTypes.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearTypes}>
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Selected types badges */}
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
