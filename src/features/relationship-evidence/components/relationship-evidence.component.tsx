'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnFiltersState,
  type SortingState
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRelationEventsQuery } from '@/features/spreadlines/hooks/useRelationEventsQuery';
import { columns } from '@/features/relationship-evidence/utils';
import { RE_PAGE_SIZE } from '@/features/relationship-evidence/const';

interface Props {
  metadata?: Record<string, string>;
}

const RelationshipEvidenceComponent = ({ metadata }: Props) => {
  const sourceId = metadata?.sourceId ?? '';
  const targetId = metadata?.targetId ?? '';
  const sourceName = metadata?.sourceName ?? sourceId;
  const targetName = metadata?.targetName ?? targetId;
  const timeStart = metadata?.timeStart ?? '';
  const timeEnd = metadata?.timeEnd ?? '';

  const { data: events = [], isPending } = useRelationEventsQuery(sourceId, targetId);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'year', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    if (timeStart || timeEnd) {
      return [{ id: 'year', value: [timeEnd, timeStart] }];
    }
    return [];
  });

  const table = useReactTable({
    data: events,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: RE_PAGE_SIZE } }
  });

  if (!sourceId || !targetId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Missing author IDs in file metadata</div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <div className="text-muted-foreground text-sm">Loading relationship events...</div>
        </div>
      </div>
    );
  }

  const yearFilter = (table.getColumn('year')?.getFilterValue() as [string, string]) ?? ['', ''];
  const filteredRows = table.getFilteredRowModel().rows;
  const totalCitations = filteredRows.reduce((sum, row) => sum + (row.original.citationCount ?? 0), 0);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="shrink-0">
        <h2 className="text-lg font-semibold">
          {sourceName} &harr; {targetName}
        </h2>
        <p className="text-muted-foreground text-sm">
          {filteredRows.length} events &middot; {totalCitations.toLocaleString()} total citations
        </p>
      </div>

      {/* Filters */}
      <div className="flex shrink-0 flex-wrap items-end gap-3">
        <div className="flex items-end gap-1">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Year From</label>
            <Input
              className="h-8 w-28 text-sm"
              placeholder="YYYY-MM"
              value={yearFilter[0]}
              onChange={e => table.getColumn('year')?.setFilterValue([e.target.value, yearFilter[1]])}
            />
          </div>
          <span className="text-muted-foreground pb-1">&ndash;</span>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Year To</label>
            <Input
              className="h-8 w-28 text-sm"
              placeholder="YYYY-MM"
              value={yearFilter[1]}
              onChange={e => table.getColumn('year')?.setFilterValue([yearFilter[0], e.target.value])}
            />
          </div>
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Paper ID</label>
          <Input
            className="h-8 w-36 text-sm"
            placeholder="Filter..."
            value={(table.getColumn('id')?.getFilterValue() as string) ?? ''}
            onChange={e => table.getColumn('id')?.setFilterValue(e.target.value)}
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Type</label>
          <Input
            className="h-8 w-36 text-sm"
            placeholder="Filter..."
            value={(table.getColumn('type')?.getFilterValue() as string) ?? ''}
            onChange={e => table.getColumn('type')?.setFilterValue(e.target.value)}
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Citations</label>
          <Input
            className="h-8 w-28 text-sm"
            placeholder="Filter..."
            value={(table.getColumn('citationCount')?.getFilterValue() as string) ?? ''}
            onChange={e => table.getColumn('citationCount')?.setFilterValue(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="cursor-pointer select-none" onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex shrink-0 items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RelationshipEvidenceComponent;
