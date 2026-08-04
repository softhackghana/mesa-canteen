# MESA (Meal Entitlement, Service & Access) Platform — Project Brief

## 1. Project Overview
MESA is an AI-native, high-fidelity canteen management system designed to streamline meal entitlement, biometric service, and access control. It bridges the gap between administrative oversight and front-line point-of-sale (POS) operations, ensuring that every meal is accounted for with zero friction.

## 2. Core Modules

### A. Admin Web Portal (Desktop)
The central nerve center for platform administrators, HR, and finance teams.
- **Identity & Biometrics:** Full lifecycle management of employee profiles, including secure biometric (fingerprint) enrollment and credential assignment (RFID/PIN).
- **Meal Rules Engine:** Highly configurable logic for defining meal windows, entitlement counts, and complex subsidy/recovery splits.
- **Reporting & Analytics:** Data-dense operational, financial, and executive reports powered by JetBrains Mono for technical precision.
- **Finance & Reconciliation:** Automated period-end closing workflows and payroll deduction file generation.

### B. POS Client Application (Touch-First)
A dedicated, fullscreen interface for cashier terminals designed for high-throughput environments.
- **Touch-Optimized UX:** Large 48px tap targets and high-contrast status feedback (Approved/Denied).
- **Hybrid Auth:** Primary biometric scanning with fallback to RFID and PIN entry.
- **Offline Resilience:** Local cache transactions with automated background synchronization when network connectivity is restored.

## 3. Visual Identity & Design System
- **Brand Identity:** Professional, data-forward, and "quiet" (similar to Linear or Vercel).
- **Typography:** 
  - **Manrope:** Primary UI font for navigation, labels, and headings.
  - **JetBrains Mono:** Dedicated for all technical data (IDs, IPs, timestamps, currency).
- **Color Palette:** Primary Blue (#344AB7) on a clean Surface White/Gray (#F6FAFE) foundation.
- **Component Rules:** 56px table rows, 1px outline-variant borders, and full-round (pill) status chips.

## 4. Key Workflows
1. **Enrollment:** 3-step wizard for searching employees, capturing high-quality fingerprint minutiae templates, and syncing to global terminals.
2. **Meal Service:** Sub-second biometric scan at POS resulting in immediate "Approved" or "Denied" visual feedback.
3. **Period-End Close:** Checklist-driven reconciliation of all site transactions to ensure financial accuracy before closing a monthly period.

## 5. Technical Requirements
- **Hardware Integration:** Support for 80mm and 58mm thermal printers with a custom-built Template Designer.
- **Security:** TLS 1.3 secured communications, RBAC (Role-Based Access Control), and comprehensive audit logging for every administrative action.
- **Responsive Architecture:** Desktop-first admin portal with collapsed sidebar states for tablet and bottom-nav layouts for mobile.