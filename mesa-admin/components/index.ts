// MESA design system shared primitives.
// Barrel export: `import { Button, DataTable, AppShell } from "@/components"`.

// lib
export { cn } from "@/lib/cn";

// UI primitives
export { Button, type ButtonProps } from "@/components/ui/button";
export { Input, type InputProps } from "@/components/ui/input";
export { Label } from "@/components/ui/label";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
export { Badge, type BadgeProps, type BadgeVariant } from "@/components/ui/badge";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableEmpty,
} from "@/components/ui/table";
export { Dialog, type DialogProps } from "@/components/ui/dialog";
export { Select, type SelectProps, type SelectOption } from "@/components/ui/select";
export { Switch, type SwitchProps } from "@/components/ui/switch";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsProps,
} from "@/components/ui/tabs";
export {
  DropdownMenu,
  type DropdownMenuProps,
  type DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
export { Skeleton } from "@/components/ui/skeleton";
export {
  Toast,
  ToastProvider,
  useToast,
  type ToastData,
  type ToastProps,
  type ToastVariant,
} from "@/components/ui/toast";

// Layout components
export {
  AppShell,
  type AppShellProps,
  type SidebarItem,
  type SidebarSection,
} from "@/components/layout/app-shell";
export { Topbar, type TopbarProps } from "@/components/layout/topbar";
export { PageHeader, type PageHeaderProps } from "@/components/layout/page-header";
export { StatCard, type StatCardProps } from "@/components/layout/stat-card";
export { StatusPill, type StatusPillProps, type StatusTone } from "@/components/layout/status-pill";
export {
  DataTable,
  type DataTableProps,
  type DataTableColumn,
  type DataTablePagination,
} from "@/components/layout/data-table";
export { SearchInput, type SearchInputProps } from "@/components/layout/search-input";
export { FilterChips, type FilterChipsProps, type FilterChip } from "@/components/layout/filter-chips";
export { EmptyState, type EmptyStateProps } from "@/components/layout/empty-state";
export { DEFAULT_SIDEBAR_SECTIONS } from "@/components/layout/default-sidebar";
