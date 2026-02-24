import { createColumnHelper } from '@tanstack/react-table';
import type { RelationEvent } from '@/models/relation-event.model';

const columnHelper = createColumnHelper<RelationEvent>();

export const columns = [
  columnHelper.accessor('year', {
    header: 'Year',
    cell: info => info.getValue(),
    filterFn: 'includesString'
  }),
  columnHelper.accessor('id', {
    header: 'Paper ID',
    cell: info => info.getValue(),
    filterFn: 'includesString'
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: info => info.getValue(),
    filterFn: 'includesString'
  }),
  columnHelper.accessor('citationCount', {
    header: 'Citations',
    cell: info => info.getValue(),
    filterFn: 'includesString'
  })
];

/** Year range filter: keeps rows where year is between min and max (inclusive, string comparison) */
export function yearRangeFilterFn(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: [string, string]
): boolean {
  const year = String(row.getValue(columnId));
  const [min, max] = filterValue;
  if (min && year < min) return false;
  if (max && year > max) return false;
  return true;
}
