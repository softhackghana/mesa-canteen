/**
 * MESA demo seed data — identities for the POS kiosk simulator and fallback flows.
 *
 * ponytail: These are throwaway fixtures for the SimulatedBiometricAdapter and
 * demo PIN flows. Swap for real directory data (People Master API) when the
 * data worker lands; the shape is intentionally the same as a profile summary.
 */

export type MealPeriod = "breakfast" | "lunch" | "dinner";

export interface DemoIdentity {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  costCentre: string;
  category: string;
  entitlement: MealPeriod;
  photo?: string;
  /** ISO timestamp of the last meal claimed (used for duplicate detection). */
  lastClaimedAt?: string;
  /** Simulated meal balance for the shift window. */
  mealsRemaining: number;
  mealsAllowed: number;
  /** Simulated SourceAFIS-style template (hash only, never raw image data). */
  template: string;
  /** Optional simulated RFID/PIN credential for fallback flows. */
  pin?: string;
  rfid?: string;
}

export const DEMO_SITE = {
  id: "site-hq",
  name: "HQ Campus",
};

export const DEMO_TERMINAL_ID = "TERM-NY-01";
export const DEMO_OPERATOR = {
  id: "op-01",
  name: "John Doe",
  role: "Cashier",
};

/** Supervisor whose PIN/biometric authorises overrides (demo). */
export const DEMO_SUPERVISOR = {
  id: "sup-01",
  name: "Sarah Mensah",
  role: "Supervisor",
  pin: "4829",
  template: "tpl-supervisor-4829",
};

export const demoIdentities: DemoIdentity[] = [
  {
    id: "p-8849",
    employeeId: "EMP-8849",
    name: "Robert Chen",
    department: "Engineering",
    costCentre: "CC-ENG",
    category: "STAFF CATEGORY A",
    entitlement: "lunch",
    photo: "https://lh3.googleusercontent.com/aida-public/AB6AXuADizSWlKf1Tgdk1CigZUJebr4bG71POgxeStaqrNXoVW2K_w4Ly88DzztwkwCRf_wU02NVLD2oZQs5X7nJ1Xy1R_J9Ry3lVOcW4fWt4eqqwi2PM9YFXhZTGHfXnagUfrzqyRejF2oYNZHxZfUcfPrIzgmFshlgyfPB8CUaeAg5iU0iQjpsKzmhmWekLSmkSdH1HwgBM2LgArKspYdPkIb803tKFk-YbljMs-_7ufbI-vxG3coBYaXKVoKYXcm22PaRMnwKL11-FXQ",
    mealsRemaining: 1,
    mealsAllowed: 1,
    template: "tpl-robert-chen",
    pin: "4571",
    rfid: "RF-8849-3022",
  },
  {
    id: "p-10493",
    employeeId: "EMP-10493",
    name: "Sarah Lopez",
    department: "Operations",
    costCentre: "CC-OPS",
    category: "STAFF CATEGORY B",
    entitlement: "lunch",
    mealsRemaining: 0, // already claimed today → duplicate-denial demo
    mealsAllowed: 1,
    lastClaimedAt: "2026-08-04T12:34:00Z",
    template: "tpl-sarah-lopez",
    pin: "1290",
    rfid: "RF-10493-77",
  },
  {
    id: "p-84729",
    employeeId: "EMP-84729",
    name: "Aisha Bello",
    department: "Finance",
    costCentre: "CC-FIN",
    category: "STAFF CATEGORY A",
    entitlement: "dinner",
    mealsRemaining: 1,
    mealsAllowed: 1,
    template: "tpl-aisha-bello",
    pin: "3310",
    rfid: "RF-84729-04",
  },
  {
    id: "p-5632",
    employeeId: "EMP-5632",
    name: "Daniel Okafor",
    department: "Logistics",
    costCentre: "CC-LOG",
    category: "STAFF CATEGORY C",
    entitlement: "lunch",
    mealsRemaining: 1,
    mealsAllowed: 1,
    template: "tpl-daniel-okafor",
    pin: "7721",
    rfid: "RF-5632-19",
  },
];
