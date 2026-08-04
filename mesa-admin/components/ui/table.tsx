import type * as React from "react";
import { cn } from "@/lib/cn";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full border-collapse text-left", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("bg-surface-container border-b border-outline-variant", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-outline-variant", className)} {...props} />;
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn("border-t border-outline-variant bg-surface-container-low", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "h-table-row-height transition-colors hover:bg-surface-bright",
        "data-[selected=true]:bg-primary-container/10",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-3 py-3 font-data-mono text-table-header uppercase text-on-surface-variant",
        "first:pl-4 last:pr-4",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  mono,
  align,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  mono?: boolean;
  align?: "left" | "center" | "right";
}) {
  return (
    <td
      className={cn(
        "px-3 py-3 first:pl-4 last:pr-4 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono === false && "font-body-md text-body-md",
        mono !== false && "font-data-mono text-data-mono",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn("p-3 text-left font-body-md text-body-md text-on-surface-variant", className)}
      {...props}
    />
  );
}

export const TableEmpty = ({ colSpan, message = "No records found" }: { colSpan?: number; message?: string }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12 text-center">
      <span className="material-symbols-outlined text-headline-lg text-outline" aria-hidden>
        inbox
      </span>
      <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{message}</p>
    </td>
  </tr>
);
