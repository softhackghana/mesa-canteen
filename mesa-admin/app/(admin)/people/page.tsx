"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  DataTable,
  Dialog,
  FilterChips,
  Input,
  Label,
  PageHeader,
  SearchInput,
  StatusPill,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
  type DataTableColumn,
} from "@/components";
import { DEMO_PEOPLE, type AdminPerson } from "@/lib/admin-data";

type Filter = "all" | "active" | "inactive" | "enrolled" | "pending";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Enrolled", value: "enrolled" },
  { label: "Pending Enrollment", value: "pending" },
];

function initials(p: AdminPerson): string {
  const first = p.first_name?.[0] ?? "";
  const last = p.last_name?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export default function PeoplePage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selected, setSelected] = useState<AdminPerson | null>(null);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_PEOPLE.filter((p) => {
      if (filter === "active" && p.status !== "active") return false;
      if (filter === "inactive" && p.status === "active") return false;
      if (filter === "enrolled" && p.biometricStatus !== "enrolled") return false;
      if (filter === "pending" && p.biometricStatus !== "pending") return false;
      if (!q) return true;
      const hay = `${p.first_name} ${p.last_name} ${p.employee_id} ${p.department ?? ""} ${p.cost_centre ?? ""} ${p.site ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, filter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<AdminPerson>[] = [
    {
      key: "employee",
      header: "Employee",
      mono: false,
      sortable: true,
      render: (p) => (
        <button
          type="button"
          className="flex items-center gap-3 text-left"
          onClick={() => {
            setSelected(p);
            setProfileOpen(true);
          }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container font-nav-item text-nav-item font-bold text-on-primary-container">
            {initials(p)}
          </span>
          <span className="flex flex-col">
            <span className="font-body-md text-body-md font-medium text-on-surface">
              {p.first_name} {p.last_name}
            </span>
            <span className="font-data-mono text-data-mono text-on-surface-variant">{p.employee_id}</span>
          </span>
        </button>
      ),
    },
    { key: "department", header: "Department", mono: false },
    { key: "cost_centre", header: "Cost Centre", sortable: true },
    { key: "site", header: "Site", mono: false },
    {
      key: "biometricStatus",
      header: "Biometric",
      sortable: true,
      render: (p) =>
        p.biometricStatus === "enrolled" ? (
          <StatusPill status={`Enrolled · ${p.biometricTemplates}`} tone="success" />
        ) : (
          <StatusPill status="Pending" tone="warning" />
        ),
    },
    {
      key: "credential",
      header: "Credential",
      sortable: true,
      render: (p) =>
        p.credential && p.credential !== "None" ? (
          <StatusPill status={p.credential} tone="info" icon={p.credential === "RFID" ? "contactless" : "pin"} />
        ) : (
          <span className="font-body-md text-body-md text-on-surface-variant">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (p) => (
        <StatusPill
          status={p.status === "active" ? "Active" : p.status === "inactive" ? "Inactive" : "Terminated"}
          tone={p.status === "active" ? "success" : "neutral"}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mono: false,
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelected(p);
              setProfileOpen(true);
            }}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({ title: `${p.first_name} ${p.last_name} updated`, variant: "success" })
            }
          >
            Edit
          </Button>
          {p.biometricStatus === "pending" && (
            <Link href="/people/enroll">
              <Button size="sm" variant="secondary">
                Enroll
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employee List"
        description="Manage personnel, credentials, and biometrics."
        actions={
          <>
            <SearchInput
              containerClassName="w-full sm:w-[300px]"
              placeholder="Search by name, ID, or department..."
              value={query}
              onSearch={(v) => {
                setQuery(v);
                setPage(1);
              }}
            />
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>upload</span>
              Bulk Import CSV
            </Button>
            <Button onClick={() => {
              setSelected(null);
              setProfileOpen(true);
            }}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>add</span>
              Add Employee
            </Button>
          </>
        }
      />

      <FilterChips
        options={FILTERS}
        value={filter}
        onValueChange={(v) => {
          setFilter(v as Filter);
          setPage(1);
        }}
      />

      <DataTable
        columns={columns}
        data={paged}
        rowKey={(p) => p.id}
        defaultSort={{ key: "employee", direction: "asc" }}
        pagination={{
          page,
          pageSize,
          total: filtered.length,
          onPageChange: setPage,
        }}
      />

      {/* Bulk import modal (mesa_bulk_import_modal) */}
      <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      {/* Add employee / profile (mesa_sarah_mensah_profile) */}
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        person={selected}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk import modal                                                   */
/* ------------------------------------------------------------------ */

function BulkImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [csv, setCsv] = useState("");
  const [mapping, setMapping] = useState({
    employeeId: "Employee ID",
    firstName: "First Name",
    lastName: "Last Name",
    department: "Department",
    role: "Role",
  });
  const [preview, setPreview] = useState<Array<{ employeeId: string; firstName: string; lastName: string; status: string }>>([]);
  const [fileName, setFileName] = useState("");

  const runPreview = () => {
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "No rows to preview", description: "Paste CSV data or upload a file.", variant: "warning" });
      return;
    }
    const rows = lines.slice(1, 6).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      return {
        employeeId: cols[0] ?? "",
        firstName: cols[1] ?? "",
        lastName: cols[2] ?? "",
        status: cols[0] === "E1001" ? "Duplicate ID" : "Valid",
      };
    });
    setPreview(rows);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const importRows = () => {
    toast({
      title: `Imported ${Math.max(0, preview.length - 1)} employee records`,
      description: "Row E1001 skipped as a duplicate Employee ID (FR-PM-004).",
      variant: "success",
    });
    onOpenChange(false);
    setCsv("");
    setPreview([]);
    setFileName("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Import CSV"
      description="Upload or paste employee records. Map columns, review the preview, then import."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={importRows} disabled={preview.length === 0}>
            <span className="material-symbols-outlined text-body-lg" aria-hidden>upload</span>
            Import {preview.length > 0 ? preview.length : ""} Rows
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Upload / paste */}
        <div className="flex flex-col gap-2">
          <Label>Source Data</Label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full font-body-md text-body-md text-on-surface-variant file:mr-3 file:rounded file:border file:border-outline-variant file:bg-surface-container file:px-3 file:py-1.5 file:font-body-md file:text-body-md file:text-on-surface"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {fileName && <span className="shrink-0 font-body-md text-body-md text-on-surface-variant">{fileName}</span>}
          </div>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={5}
            placeholder="Employee ID,First Name,Last Name,Department,Role&#10;E1001,Alice,Smith,Engineering,Cashier&#10;E1001,Bob,Johnson,Operations,Supervisor&#10;E1003,Charlie,Brown,Logistics,Cashier"
            className="w-full rounded border border-outline bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={runPreview}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>preview</span>
              Preview (First 5 Rows)
            </Button>
          </div>
        </div>

        {/* Column mapping */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              ["employeeId", "Employee ID Column"],
              ["firstName", "First Name Column"],
              ["lastName", "Last Name Column"],
              ["department", "Department Column"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1">
              <Label htmlFor={`map-${key}`}>{label}</Label>
              <SelectLike
                id={`map-${key}`}
                value={mapping[key]}
                options={["Employee ID", "First Name", "Last Name", "Department", "Role"]}
                onChange={(v) => setMapping((m) => ({ ...m, [key]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Preview table */}
        {preview.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-outline-variant">
            <div className="border-b border-outline-variant bg-surface-bright px-3 py-2">
              <span className="font-nav-item text-nav-item text-on-surface">Preview (First 5 Rows)</span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-surface font-label-md text-label-md uppercase text-on-surface-variant">
                <tr className="border-b border-outline-variant">
                  <th className="px-3 py-2">Employee ID</th>
                  <th className="px-3 py-2">First Name</th>
                  <th className="px-3 py-2">Last Name</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-md text-body-md text-on-surface">
                {preview.map((r, i) => (
                  <tr key={i} className={r.status === "Duplicate ID" ? "bg-error-container/30" : ""}>
                    <td className="px-3 py-2">{r.employeeId}</td>
                    <td className="px-3 py-2">{r.firstName}</td>
                    <td className="px-3 py-2">{r.lastName}</td>
                    <td className="px-3 py-2">
                      <StatusPill
                        status={r.status}
                        tone={r.status === "Valid" ? "success" : "error"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="font-body-md text-body-md text-on-surface-variant">
          Employee IDs must be unique across active and inactive records (FR-PM-004).
        </p>
      </div>
    </Dialog>
  );
}

function SelectLike({ id, value, options, onChange }: { id?: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded border border-outline bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* Profile dialog (mesa_sarah_mensah_profile)                          */
/* ------------------------------------------------------------------ */

function ProfileDialog({ open, onOpenChange, person }: { open: boolean; onOpenChange: (v: boolean) => void; person: AdminPerson | null }) {
  const { toast } = useToast();
  const isNew = !person;
  const p = person ?? DEMO_PEOPLE[0];

  const details: Array<[string, string]> = [
    ["Employee ID", p.employee_id],
    ["Department", p.department ?? "—"],
    ["Cost Centre", p.cost_centre ?? "—"],
    ["Assigned Site", p.site ?? "—"],
    ["Hire Date", p.hire_date ?? "—"],
    ["Current Meal Rule", p.mealRule ?? "Standard Shift (1 Meal)"],
    ["Remaining Balance Today", "1 meal"],
    ["Last Meal Claimed", "12:41 PM"],
    ["Access Level", "All Campus Cafeterias"],
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container font-nav-item text-nav-item font-bold text-on-primary-container">
            {initials(p)}
          </span>
          {isNew ? "Add Employee" : `${p.first_name} ${p.last_name}`}
          {!isNew && <StatusPill status={p.status === "active" ? "ACTIVE" : "INACTIVE"} tone={p.status === "active" ? "success" : "neutral"} />}
        </span>
      }
      description={isNew ? "Create a new personnel profile." : p.employee_id}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              toast({
                title: isNew ? "Employee created" : `${p.first_name} ${p.last_name} updated`,
                description: "Changes have been saved and audit-logged.",
                variant: "success",
              });
              onOpenChange(false);
            }}
          >
            {isNew ? "Create Employee" : "Save Changes"}
          </Button>
        </>
      }
    >
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="biometrics">Biometrics</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-3 sm:col-span-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label>First Name</Label>
                  <Input defaultValue={isNew ? "" : p.first_name} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Last Name</Label>
                  <Input defaultValue={isNew ? "" : p.last_name} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Employee ID</Label>
                  <Input defaultValue={isNew ? "" : p.employee_id} className="font-data-mono text-data-mono" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Department</Label>
                  <Input defaultValue={isNew ? "" : (p.department ?? "")} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Cost Centre</Label>
                  <Input defaultValue={isNew ? "" : (p.cost_centre ?? "")} className="font-data-mono text-data-mono" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Site</Label>
                  <Input defaultValue={isNew ? "" : (p.site ?? "")} />
                </div>
              </div>
            </div>
            <dl className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              {details.map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <dt className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{k}</dt>
                  <dd className="font-body-md text-body-md text-on-surface">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="biometrics">
          <div className="flex flex-col gap-3">
            {p.biometricStatus === "enrolled" ? (
              <>
                <div className="flex items-center justify-between rounded-lg border border-outline-variant p-3">
                  <div>
                    <p className="font-body-md text-body-md font-medium text-on-surface">Right Index Finger</p>
                    <p className="font-data-mono text-data-mono text-on-surface-variant">
                      {p.biometricTemplates} template{p.biometricTemplates !== 1 ? "s" : ""} · Quality 96.4% · DigitalPersona
                    </p>
                  </div>
                  <StatusPill status="Active" tone="success" />
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Up to 3 templates per profile (FR-IM-005). Raw fingerprint images are discarded after extraction.
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-warning bg-warning-container/40 p-4">
                <p className="font-nav-item text-nav-item text-on-warning-container">No biometric templates enrolled.</p>
                <Link href="/people/enroll" className="mt-2 inline-block">
                  <Button size="sm">Start Enrollment</Button>
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="credentials">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border border-outline-variant p-3">
              <div>
                <p className="font-body-md text-body-md font-medium text-on-surface">Secondary Credential</p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {p.credential === "None" ? "No fallback credential issued" : `${p.credential} · ${p.credentialValue}`}
                </p>
              </div>
              {p.credential !== "None" ? (
                <StatusPill status="Issued" tone="info" />
              ) : (
                <StatusPill status="Not Issued" tone="neutral" />
              )}
            </div>
            <Button variant="secondary" size="sm" className="self-start">
              <span className="material-symbols-outlined text-body-lg" aria-hidden>add_card</span>
              Issue RFID / PIN
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="flex flex-col gap-2">
            {[
              { at: "2026-07-28 09:12", what: "Profile updated by M. Johnson", detail: "site Tema Facility → HQ Campus" },
              { at: "2026-05-02 14:30", what: "Biometric template enrolled", detail: "right_index · quality 96.4" },
              { at: "2026-01-15 11:05", what: "Credential issued (RFID)", detail: "CARD-0005" },
            ].map((h) => (
              <div key={h.at} className="flex justify-between gap-4 rounded-lg border border-outline-variant p-3">
                <div>
                  <p className="font-body-md text-body-md font-medium text-on-surface">{h.what}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">{h.detail}</p>
                </div>
                <span className="shrink-0 font-data-mono text-data-mono text-on-surface-variant">{h.at}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}
