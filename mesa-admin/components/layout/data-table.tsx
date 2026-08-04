"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Sort key; falls back to `key` when sorting is enabled. */
  sortKey?: string;
  sortable?: boolean;
  /** Right-aligned for numeric/data columns (design system alignment). */
  align?: "left" | "center" | "right";
  /** data-mono cells by default; set false for prose cells. */
  mono?: boolean;
  /** Cell renderer. Defaults to String(value). */
  render?: (row: T) => React.ReactNode;
  /** Class applied to the <th>. */
  headerClassName?: string;
  /** Class applied to the <td>. */
  cellClassName?: string;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Optional row identifier for keys/selection. Defaults to index. */
  rowKey?: (row: T, index: number) => string | number;
  getRowId?: (row: T) => string | number;
  selection?: {
    selected: (string | number)[];
    onSelectionChange: (selected: (string | number)[]) => void;
    getRowId: (row: T) => string | number;
    /** Hide the header select-all checkbox. */
    headerCheckbox?: boolean;
  };
  /** Server-side pagination. When provided, sorting is controlled (onSortChange). */
  pagination?: DataTablePagination;
  onSortChange?: (sortKey: string, direction: "asc" | "desc") => void;
  sort?: { key: string; direction: "asc" | "desc" };
  defaultSort?: { key: string; direction: "asc" | "desc" };
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
}

const PAGE_SIZES = [10, 25, 50];

function SortIndicator({ direction }: { direction: "asc" | "desc" | null }) {
  return (
    <span
      className={cn(
        "material-symbols-outlined text-[14px] transition-opacity",
        direction ? "text-primary" : "text-outline opacity-40",
      )}
      aria-hidden
    >
      {direction === "asc" ? "arrow_upward" : "arrow_downward"}
    </span>
  );
}

/**
 * Generic data table: 56px rows, mono data cells, header checkbox + select-all,
 * sortable headers, pagination controls matching the MESA mocks.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  getRowId,
  selection,
  pagination,
  onSortChange,
  sort: controlledSort,
  defaultSort,
  loading = false,
  emptyState,
  onRowClick,
  className,
  toolbar,
  footer,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = React.useState<
    { key: string; direction: "asc" | "desc" } | undefined
  >(defaultSort);
  const sort = controlledSort ?? internalSort;

  const allIds = React.useMemo(
    () => data.map((row, index) => (getRowId ?? rowKey ?? ((_, i) => i))(row, index)),
    [data, getRowId, rowKey],
  );

  const selectedSet = React.useMemo(
    () => new Set(selection?.selected ?? []),
    [selection?.selected],
  );
  const allSelected = data.length > 0 && allIds.every((id) => selectedSet.has(id));
  const someSelected = allIds.some((id) => selectedSet.has(id));

  const toggleAll = () => {
    if (!selection) return;
    if (allSelected) {
      selection.onSelectionChange(
        (selection.selected ?? []).filter((id) => !allIds.includes(id)),
      );
    } else {
      const merged = new Set(selection.selected ?? []);
      allIds.forEach((id) => merged.add(id));
      selection.onSelectionChange(Array.from(merged));
    }
  };

  const toggleRow = (id: string | number) => {
    if (!selection) return;
    const has = selectedSet.has(id);
    selection.onSelectionChange(
      has
        ? (selection.selected ?? []).filter((x) => x !== id)
        : [...(selection.selected ?? []), id],
    );
  };

  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    const key = col.sortKey ?? col.key;
    const next: { key: string; direction: "asc" | "desc" } = {
      key,
      direction: sort?.key === key && sort.direction === "asc" ? "desc" : "asc",
    };
    if (onSortChange) onSortChange(next.key, next.direction);
    else setInternalSort(next);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest",
        className,
      )}
    >
      {toolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 p-3">
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="h-12">
              {selection && (
                <TableHead className="w-12 pl-4 pr-0 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.sortable && "cursor-pointer select-none",
                    col.headerClassName,
                  )}
                  onClick={col.sortable ? () => handleSort(col) : undefined}
                  aria-sort={
                    sort?.key === (col.sortKey ?? col.key)
                      ? sort.direction === "asc" ? "ascending" : "descending"
                      : undefined
                  }
                >
                  <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                    {col.header}
                    {col.sortable && (
                      <SortIndicator
                        direction={
                          sort?.key === (col.sortKey ?? col.key) ? sort.direction : null
                        }
                      />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: pagination?.pageSize ?? 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="h-table-row-height">
                    {selection && <TableCell className="pl-4 pr-0"><div className="h-4 w-4 animate-pulse rounded bg-surface-container-high" /></TableCell>}
                    {columns.map((col) => (
                      <TableCell key={col.key} mono={false}>
                        <div className="h-4 w-24 animate-pulse rounded bg-surface-container-high" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.length === 0
                ? emptyState ?? (
                    <TableRow className="h-56">
                      <TableCell colSpan={columns.length + (selection ? 1 : 0)} mono={false}>
                        <div className="flex flex-col items-center gap-2 text-center">
                          <span className="material-symbols-outlined text-[32px] text-outline" aria-hidden>
                            inbox
                          </span>
                          <p className="font-body-md text-body-md text-on-surface-variant">No records found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                : data.map((row, index) => {
                    const id = (getRowId ?? rowKey ?? ((_, i) => i))(row, index);
                    const selected = selectedSet.has(id);
                    return (
                      <TableRow
                        key={id}
                        data-selected={selected || undefined}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={cn(onRowClick && "cursor-pointer")}
                      >
                        {selection && (
                          <TableCell className="pl-4 pr-0 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Select row ${id}`}
                              className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
                              checked={selected}
                              onChange={() => toggleRow(id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                        )}
                        {columns.map((col) => (
                          <TableCell
                            key={col.key}
                            mono={col.mono}
                            align={col.align}
                            className={col.cellClassName}
                          >
                            {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-lowest p-3">
          <div className="font-body-md text-[13px] text-on-surface-variant">
            Showing{" "}
            <span className="font-medium text-on-surface">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-on-surface">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{" "}
            of <span className="font-medium text-on-surface">{pagination.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Rows per page"
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="h-8 rounded border border-outline-variant bg-surface-container-lowest px-2 font-body-md text-[13px] text-on-surface focus:border-primary focus:outline-none"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange?.(pagination.page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden>chevron_left</span>
            </button>
            <span className="min-w-12 text-center font-data-mono text-data-mono text-on-surface-variant">
              {pagination.page} / {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={pagination.page >= Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
              onClick={() => pagination.onPageChange?.(pagination.page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden>chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {footer}
    </div>
  );
}
