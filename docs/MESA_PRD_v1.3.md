   
**MESA**  
*Meal Entitlement, Service & Access Platform*  
**One Identity. Every Meal. Zero Friction.**  
   
**Product Requirements Document**  
Version 1.3  |  May 29, 2026  
**Status: Approved for Engineering**  
Audience: Product, Engineering, Operations, Security & Leadership  
   
# **1. Executive Summary**  
MESA (Meal Entitlement, Service & Access Platform) is a purpose-built, biometric-native enterprise canteen management system designed for corporate and industrial environments. MESA delivers a fully unified experience — combining biometric identity enrollment, real-time meal entitlement enforcement, offline-resilient point-of-sale transaction processing, automated financial reporting, and enterprise-grade license management within a single, cohesive platform.  
   
The platform is built around three core principles:  
- Biometric-First Identity: Fingerprint verification via DigitalPersona, Suprema, or ZKTeco hardware — all supported from initial release — with SourceAFIS as the vendor-agnostic matching engine storing one consistent template format regardless of which scanner captured the original image.  
- Operational Resilience: POS terminals maintain full functionality for up to 72 hours without network connectivity, automatically reconciling queued transactions upon reconnection.  
- Unified Intelligence: A single platform governs identity, entitlements, transactions, device management, financial reporting, and license enforcement — with real-time dashboards for every stakeholder level.  
   
MESA is engineered to deliver sub-second biometric transaction times, automated month-end financial closing with zero operational downtime, a touch-first cashier interface requiring less than 15 minutes of training, and a self-contained cryptographic licensing system with no third-party licensing service dependency.  
# **2. Product Vision & Mission**  
MESA's vision is to become the definitive enterprise canteen intelligence platform — making secure, frictionless meal management a solved problem for organisations of any scale.  
   
Our mission: To deliver a seamless, biometric-native canteen management experience that unifies identity, meal rule enforcement, POS transactions, and financial reporting into one highly resilient, real-time system that empowers operations teams, protects company assets, and gives every employee a fast, dignified dining experience.  
# **3. Product Goals**  
- Unified Identity Management: Embed biometric enrollment and verification natively; support DigitalPersona, Suprema, and ZKTeco hardware from v1 via a common adapter interface.  
- Operational Resilience: POS terminals operate fully offline and sync automatically upon network restoration with zero data loss.  
- Streamlined Administration: Automate month-end closing in the background with zero system downtime; automate HRIS-driven user lifecycle management.  
- Modern User Experience: Deploy a touch-optimized POS interface with background hardware polling — no mouse focus required.  
- Enterprise Security: RBAC, token-based session management, AES-256 biometric encryption, immutable audit logs, and ECDSA-signed license certificates.  
- Real-Time Visibility: Executive dashboards, exception reports, and live terminal health monitoring for every stakeholder.  
- Hardware Agnosticism: A device adapter architecture — with SourceAFIS as the matching engine — ensuring template format consistency across all supported scanners.  
- Self-Contained Licensing: Cryptographic license enforcement with no dependency on external licensing services, fully compatible with on-premises deployments.  
# **4. Non-Goals**  
- General-purpose retail or restaurant POS features (table mapping, tipping, external food delivery integrations).  
- Primary HRIS or payroll calculation engine — MESA consumes HR data and generates billing exports but does not compute gross/net pay.  
- Support for end-of-life biometric hardware lacking modern C/C++ SDK compatibility.  
- Facial recognition — planned for a future phase.  
# **5. Key Assumptions & Dependencies**  
- Biometric hardware manufacturers — DigitalPersona (HID Global), Suprema, and ZKTeco — provide stable, modern C/C++ SDKs compatible with MESA's Windows-native adapter layer. SourceAFIS is used as the vendor-agnostic matching and template engine across all three adapters.  
- Deployment environments have at least intermittent network connectivity to allow offline-sync buffers to flush daily.  
- Corporate IT policies permit storage of encrypted biometric templates (mathematical minutiae hashes) within the central database.  
- HR and Finance stakeholders will provide access to HRIS API specifications to support automated user synchronisation.  
- The MESA vendor operates a private licensing server from which signed license certificates are issued; customers require internet access only once per activation.  
# **6. Stakeholders**  
| | | |  
|-|-|-|  
| **Stakeholder** | **Accountability** | **Key Concern** |   
| **Operations Leadership** | Canteen throughput and efficiency | Speed, uptime, zero operational interruptions |   
| **IT & Security** | Deployment, network security, device management | Secure authentication, audit logs, device trust |   
| **HR & Finance** | Meal data for payroll deductions and vendor payments | Accurate reporting, automated closing, zero downtime |   
| **End Users / Employees** | Consuming meals in a timely and dignified manner | Speed, reliability, privacy-respecting enrollment |   
# **7. Personas & User Roles**  
| | | | |  
|-|-|-|-|  
| **Role** | **Primary Objectives** | **Key Permissions** | **Success Measures** |   
| **System Administrator** | Maintain platform health, configure global settings, manage integrations and licensing | Full global access, API config, device management, license management | 99.9% uptime; zero unresolved sync errors |   
| **Site / HR Administrator** | Manage local site profiles, cost centres, user entitlements | Edit People Master, assign meal rules, generate reports | Accurate user rosters; correct meal rule assignments |   
| **Enrollment Officer** | Quickly onboard users and capture high-quality biometric templates | Enroll users, capture biometrics, issue credentials | < 2 min enrollment time; < 1% biometric rejection rate |   
| **Cashier / POS Operator** | Process meals rapidly without system interruptions | Access POS client; override specific meal exceptions if granted | < 2 second transaction time; zero terminal lockups |   
| **Supervisor** | Manage floor operations, approve overrides, handle offline events | Biometric override, force POS unlock, view shift reports | Fast floor issue resolution without IT tickets |   
| **Finance Officer** | Reconcile monthly data and execute financial closing | Run month-end, export billing data, view financial reports | Zero downtime during month-end closing |   
   
# **8. Platform Architecture Overview**  
MESA is a unified three-tier architecture comprising:  
- Central Web Administration Portal — Cloud-hosted or on-premises management hub for enrollment, reporting, device management, HR administration, and financial operations. Accessible via modern browsers with SSO/SAML support.  
- Enrollment Application — Integrated module within the Web Portal (or a lightweight companion client for enrollment workstations) that interfaces directly with USB biometric peripherals via a local WebSocket bridge service.  
- Resilient POS Client — Installed on dedicated POS terminals. Touch-optimised, operates fully offline, and performs biometric matching against a local encrypted cache using SourceAFIS. Communicates with the central platform via secure background sync.  
   
Operational flow: An Enrollment Officer provisions a user natively in the Admin Portal, capturing fingerprints via a USB peripheral (DigitalPersona, Suprema, or ZKTeco). Templates are extracted by SourceAFIS, encrypted, and automatically synced to relevant site-level POS terminals within 60 seconds. An employee visits the canteen, places their finger on the POS reader — authentication, entitlement validation, coupon printing, and transaction logging occur in under one second. If the network is unavailable, the POS operates from its local encrypted cache, queuing transactions for automatic reconciliation upon reconnection.  
# **9. Scope Overview**  
| | | |  
|-|-|-|  
| **MVP — Phase 1** | **Phase 2** | **Phase 3 / Future** |   
| Native fingerprint enrollment People Master profiles Touch-optimised POS UI Offline transaction cache Basic Meal Rules Engine Core financial reporting RBAC & session management License activation & management Meal coupon / receipt printing Receipt template designer DigitalPersona adapter (HID) Suprema adapter ZKTeco adapter SourceAFIS matching engine Multi-modal fallback (Card/PIN) | Advanced HRIS/AD sync Automated background month-end Advanced fraud & exception dashboards Configurable shift rules Exception reporting dashboards | Facial recognition integration Employee self-service portal/app Wallet / cashless payments Turnstile & access control integration Predictive meal demand analytics |   
   
# **10. Detailed Product Modules**  
## **10.1  Identity & Biometric Management**  
Purpose: Manages the complete lifecycle of biometric templates and credentials natively within the platform.  
**Core Capabilities:**  
- Biometric capture via native hardware adapters for all three supported vendors: DigitalPersona (HID Global U.are.U series), Suprema (BioMini series), and ZKTeco (ZK series). All three adapters are available from initial release.  
- SourceAFIS open-source matching engine — vendor-agnostic template extraction and 1:N matching layer sitting above all three capture adapters. Templates are stored in a single, hardware-independent format regardless of which scanner captured the original image.  
- Quality scoring — rejects samples below a configurable threshold (default: 80%).  
- Real-time 1:N duplicate checking during enrollment to prevent ghost employees and dual-claiming.  
- Support for up to three distinct fingerprint templates per user profile.  
- Credential issuance (RFID cards, PINs) as biometric fallbacks.  
- Automatic template purge upon user termination or account deletion (GDPR/POPIA Right to Erasure).  
- Storage of SourceAFIS mathematical minutiae templates only — raw fingerprint images captured by the vendor adapter are discarded immediately after extraction.  
## **10.2  People Master**  
Purpose: The authoritative central repository for all employee and contractor profiles.  
**Core Capabilities:**  
- Full profile CRUD with fields: First Name, Last Name, Employee ID, Cost Centre, Department, Site.  
- Bulk import via CSV or REST API.  
- Secondary identifier support (RFID card, PIN) as biometric fallback credentials.  
- Unique Employee ID enforcement across all active and inactive records.  
- HRIS mapping fields to support integration with payroll and HR systems.  
## **10.3  POS & Meal Issuance**  
Purpose: The front-end cashier interface for executing meal transactions with maximum speed and resilience.  
**Core Capabilities:**  
- Touch-optimised interface requiring no mouse interaction or cursor focus for scanner activation.  
- Background hardware polling — the scanner is always listening regardless of UI state.  
- Full offline mode with local AES-256 encrypted SourceAFIS template cache and transaction queue.  
- Automatic push of cached transactions to central server upon network restoration.  
- Sub-1-second display of user name, photo, and entitlement status after a successful scan.  
- Supervisor Override button for damaged biometric or lost credential scenarios.  
## **10.4  Meal Rules Engine**  
Purpose: Policy-driven eligibility determination ensuring accurate meal entitlements.  
**Core Capabilities:**  
- Maximum meals per configurable time window (e.g., 1 meal between 11:00–14:00).  
- Duplicate meal attempt blocking with clear cashier notification.  
- Site mapping — specific Cost Centres assigned to specific canteen locations.  
- Subsidy logic configuration (e.g., 50% company-paid, 50% employee-paid).  
## **10.5  Reporting & Analytics**  
Purpose: Comprehensive operational, financial, and exception reporting for all stakeholder levels.  
**Core Capabilities:**  
- Consolidated Meals per Employee report grouped by Cost Centre and Department.  
- Customer Statements for selected date ranges.  
- Live operational dashboard: terminal statuses, pending sync backlogs, biometric success rates.  
- Export support: PDF, CSV, and Excel formats.  
- Scheduled automated report delivery via email.  
## **10.6  Administration & Device Management**  
Purpose: Centralised control over all platform configuration, terminals, and user sessions.  
**Core Capabilities:**  
- Stateless / token-based session management — no 'Already Logged In' lockout errors after power loss.  
- Dashboard of all registered POS terminals showing IP address, software version, last heartbeat, and auto-detected scanner vendor and model.  
- Remote terminal restart and session logoff.  
- User-friendly error displays — network issues show 'Offline Mode Active', never technical error dialogs.  
## **10.7  Finance & Period-End**  
Purpose: Non-disruptive financial closing and billing export management.  
**Core Capabilities:**  
- Month-end processing executes as a background batch job, tagging transactions to a closed fiscal period.  
- POS terminals continue processing new transactions during month-end execution — zero database locks.  
- Immutable closed-period transactions — no modification or deletion permitted.  
- Automated reconciliation summary generated upon month-end job completion.  
## **10.8  Integration & API Layer**  
Purpose: Seamless connectivity with enterprise HRIS, payroll, and directory systems.  
**Core Capabilities:**  
- Secure REST API endpoint for HRIS to push user creations, updates, and terminations.  
- GET endpoint for daily aggregated transaction data for payroll deduction processing.  
- SAML 2.0 and OAuth2 support for Admin Portal Single Sign-On.  
- Hardware device adapter layer — DigitalPersona, Suprema, and ZKTeco adapters all implement a common interface; new scanner models added via plugin without core code changes.  
## **10.9  Notifications & Alerts**  
Purpose: Proactive operational intelligence delivered to the right person at the right time.  
**Core Capabilities:**  
- Alerts for offline terminals, sync failures, high-volume biometric rejections, and license expiry (30-day advance warning).  
- Configurable notification channels (email, in-platform, SMS).  
## **10.10  Audit, Monitoring & Supportability**  
Purpose: Traceability, compliance, and root-cause investigation for every platform action.  
**Core Capabilities:**  
- Immutable audit logs for manual overrides, profile changes, rule adjustments, sync events, and license lifecycle events (activation, renewal, revocation).  
- Each log entry records: timestamp, actor ID, affected entity, and delta values.  
- Logs cannot be modified or deleted by any user role, including System Administrators.  
## **10.11  Licensing & Activation**  
Purpose: Enforces enterprise-grade license control using a self-contained cryptographic system — no third-party licensing service dependency — ensuring MESA is activated against a valid, business-tied license before any platform functionality is accessible.  
**Core Capabilities:**  
- License key activation — accepts a license key generated by the MESA Licensing Platform (an internal vendor tool) and validates it against the registered business name via a signed JWT certificate (ECDSA P-256).  
- Business identity binding — each license is cryptographically tied to the legal name of the enterprise at the time of generation; activation fails if the entered business name does not match the license record after normalisation.  
- Self-contained offline validation — after initial online activation, the signed JWT certificate is cached locally and verified using a public key embedded in the application bundle. No network contact is required for up to 72 hours.  
- Annual renewal model — licenses carry an expiry date. The platform displays proactive renewal warnings beginning 30 days before expiration. Upon expiry, the platform enters a configurable grace period (default: 7 days) before full access is suspended.  
- License status dashboard — System Administrators can view licensed business name, tier, activation date, expiry date, number of licensed POS terminals, and maximum enrolled identities, alongside current usage.  
- License transfer / reactivation — supports deactivation on one installation and reactivation on another via the licensing platform.  
## **10.12  Meal Coupon & Receipt Printing**  
Purpose: Issues a printed meal coupon to the employee upon successful biometric verification, which the employee presents at the food counter to collect their meal.  
**Core Capabilities:**  
- Automatic coupon print trigger — upon a successful POS verification and meal approval, the system sends a print job to the configured receipt printer immediately.  
- Offline printing — coupon printing functions fully in offline mode using locally cached transaction data and the locally stored active receipt template.  
- Printer configuration — each POS terminal is mapped to one or more ESC/POS compatible thermal printers via the Admin Portal device settings.  
- Print enable/disable toggle — the System or Site Administrator can globally or per-site disable coupon printing. When disabled, the POS operates in verification-only mode.  
- Reprint capability — the POS operator can trigger a one-time reprint of the most recent coupon, logged to the audit trail.  
- Printer health monitoring — printer status (online, paper-out, error) is surfaced on the POS UI and the Admin Device Management dashboard.  
## **10.13  Receipt & Coupon Template Designer**  
Purpose: Provides a flexible, WYSIWYG-style template design tool allowing businesses to customise the layout and content of printed meal coupons.  
**Core Capabilities:**  
- Default system template — a read-only default coupon layout ships with the platform, used as the baseline for all custom templates.  
- Custom template creation — businesses can create, name, save, and activate one or more custom templates derived from the default.  
- Field add/remove — administrators can add or remove any available data field: Business Name, Site Name, Employee Name, Employee ID, Department, Cost Centre, Meal Period, Date, Time, Transaction Reference, Subsidy Amount, Employee-Paid Amount, 1D Barcode, QR Code, Cashier Name, Terminal ID, and a freetext Custom Message block.  
- Layout controls — drag-to-reorder fields, text alignment (left/centre/right), font size (small/medium/large), bold/normal weight, and horizontal separator line insertion.  
- Header & footer customisation — logo upload and custom footer message string.  
- Template preview — real-time WYSIWYG preview at 80mm thermal print width, populated with sample data.  
- Template assignment — assignable at global level or overridden at site level.  
- Template versioning — changes saved as new versions; prior versions retained for audit.  
   
# **11. Functional Requirements**  
## **11.1  Identity & Biometric Management**  
- FR-IM-001: The system shall capture fingerprint templates via native hardware adapters for DigitalPersona, Suprema, and ZKTeco scanners, all supported from initial release.  
- FR-IM-002: The system shall use SourceAFIS as the vendor-agnostic matching engine for template extraction and 1:N identification, ensuring all templates are stored in a single hardware-independent format.  
- FR-IM-003: The system shall validate biometric quality during capture and reject samples below a configurable threshold (default 80%).  
- FR-IM-004: The system shall perform a real-time 1:N duplicate check against the entire database during enrollment and flag potential duplicates.  
- FR-IM-005: The system shall support up to three distinct fingerprint templates per user profile.  
- FR-IM-006: The system shall permanently delete or obfuscate biometric templates when a user profile is marked Terminated or Purged.  
- FR-IM-007: The POS terminal shall auto-detect the connected scanner by USB Vendor ID and load the appropriate adapter without manual configuration.  
## **11.2  People Master**  
- FR-PM-001: The system shall maintain user profiles including First Name, Last Name, Employee ID, Cost Centre, and Department.  
- FR-PM-002: The system shall allow bulk import of user profiles via CSV or REST API.  
- FR-PM-003: The system shall support associating a secondary identifier (RFID Card or PIN) to a user profile as a biometric fallback.  
- FR-PM-004: The system shall enforce unique Employee IDs across all active and inactive records.  
## **11.3  POS & Meal Issuance**  
- FR-POS-001: The POS client shall continuously poll the attached biometric scanner regardless of UI focus.  
- FR-POS-002: The POS shall operate in full offline mode, authenticating against a locally cached and AES-256 encrypted SourceAFIS template database.  
- FR-POS-003: The POS shall automatically push cached offline transactions to the central server upon network restoration.  
- FR-POS-004: The system shall display the user's name, photo (if configured), and entitlement status within 1 second of a successful scan.  
- FR-POS-005: The POS shall display a prominent Supervisor Override button for damaged biometric or lost credential scenarios.  
## **11.4  Meal Rules Engine**  
- FR-MRE-001: The system shall enforce a maximum meals per time window rule (e.g., 1 meal between 11:00–14:00).  
- FR-MRE-002: The system shall block transactions and alert the cashier upon a duplicate meal attempt within the same configured window.  
- FR-MRE-003: The system shall support mapping specific Cost Centres to specific canteen locations.  
- FR-MRE-004: The system shall allow configuration of subsidy logic (e.g., percentage company-paid vs. employee-paid).  
## **11.5  Reporting & Analytics**  
- FR-RPT-001: The system shall generate a Consolidated Meals per Employee report groupable by Cost Centre and Department.  
- FR-RPT-002: The system shall provide an exportable Customer Statement for selected date ranges.  
- FR-RPT-003: The system shall provide an operational dashboard displaying live terminal statuses and pending sync backlogs.  
- FR-RPT-004: The system shall support exporting all reports to PDF, CSV, and Excel formats.  
## **11.6  Administration & Device Management**  
- FR-ADM-001: The system shall use stateless or modern token-based session management, preventing 'Already Logged In' errors after abrupt shutdowns.  
- FR-ADM-002: The Admin Portal shall display all registered POS terminals with current IP, software version, last heartbeat, and auto-detected biometric scanner vendor and model.  
- FR-ADM-003: The system shall allow Administrators to remotely trigger a terminal restart or session logoff.  
- FR-ADM-004: The system shall mask all database connection strings; network errors shall display user-friendly messages only.  
## **11.7  Finance & Period-End**  
- FR-FIN-001: The system shall execute Month-End processing as a background batch job, tagging transactions to a closed fiscal period.  
- FR-FIN-002: Active POS terminals shall continue processing new transactions during Month-End execution without locking.  
- FR-FIN-003: The system shall prevent modification or deletion of any transaction linked to a closed financial period.  
- FR-FIN-004: The system shall generate an automated reconciliation summary upon Month-End job completion.  
## **11.8  Integration & API Layer**  
- FR-INT-001: The system shall provide a secure REST API endpoint for HRIS systems to POST user creations, updates, and terminations.  
- FR-INT-002: The system shall provide a GET endpoint to extract daily aggregated transaction data for payroll deduction processing.  
- FR-INT-003: The system shall support SAML 2.0 or OAuth2 for Administrator Portal Single Sign-On.  
- FR-INT-004: The system shall abstract hardware communications via a device adapter layer enabling new scanner models to be added via plugin updates without core code changes.  
## **11.9  Licensing & Activation**  
- FR-LIC-001: The system shall require a valid license certificate to be present and cryptographically verified before any platform functionality is accessible.  
- FR-LIC-002: License keys shall be generated exclusively by the MESA vendor licensing portal and shall be bound to a specific registered business name via a SHA-256 normalised hash.  
- FR-LIC-003: During activation, the system shall validate that the business name entered by the administrator matches the name encoded in the license record after normalisation; activation shall fail with a descriptive error on mismatch.  
- FR-LIC-004: The activation endpoint shall return a signed JWT certificate (ECDSA P-256 / ES256) which the client stores locally in an encrypted store for subsequent offline verification.  
- FR-LIC-005: The application shall verify the license certificate offline using an embedded public key, requiring no network contact for up to 72 hours after the last successful online validation.  
- FR-LIC-006: Each license shall carry a defined expiry date. The system shall display a renewal warning banner to System Administrators beginning 30 days prior to expiry.  
- FR-LIC-007: Upon license expiry, the system shall enter a configurable grace period (default: 7 days) before suspending access. POS operations continue during the grace period.  
- FR-LIC-008: The license status page shall display: Licensed Business Name, License Tier, Features, Activation Date, Expiry Date, Licensed Terminal Count, Maximum Enrolled Identities, and current usage against limits.  
- FR-LIC-009: The system shall support license deactivation (for re-installation or migration) via the Admin Portal, decrementing the activation count on the licensing server.  
- FR-LIC-010: The licensing guard shall block all API routes on the server if no active license record exists, with a clear error response directing administrators to the activation endpoint.  
## **11.10  Meal Coupon & Receipt Printing**  
- FR-RCP-001: Upon a successful meal verification and approval at the POS, the system shall automatically dispatch a print job to the configured receipt printer without requiring any additional cashier action.  
- FR-RCP-002: Coupon printing shall function fully in offline mode using locally cached transaction data and the locally stored active receipt template.  
- FR-RCP-003: Each POS terminal shall be configurable to one or more ESC/POS compatible thermal receipt printers via the Admin Portal Device Management module.  
- FR-RCP-004: A System or Site Administrator shall be able to enable or disable coupon printing globally or per site.  
- FR-RCP-005: The POS shall provide a clearly labelled 'Reprint Last Coupon' button. Each reprint event shall be recorded in the audit log.  
- FR-RCP-006: The POS UI and the Admin Device Management dashboard shall surface real-time printer status: Online, Paper Out, Cover Open, or Error.  
## **11.11  Receipt & Coupon Template Designer**  
- FR-TPL-001: The system shall ship with a non-editable default receipt template that serves as the baseline for all custom templates.  
- FR-TPL-002: Administrators shall be able to create, name, save, and activate custom receipt templates derived from the default template.  
- FR-TPL-003: The template designer shall allow administrators to add or remove any available data field from the coupon layout.  
- FR-TPL-004: The designer shall provide layout controls including drag-to-reorder fields, text alignment, font size selection, bold/normal weight toggle, and horizontal separator line insertion.  
- FR-TPL-005: Administrators shall be able to upload a business logo for the coupon header and define a custom footer message string.  
- FR-TPL-006: The designer shall render a real-time WYSIWYG preview at 80mm thermal print width populated with representative sample data.  
- FR-TPL-007: Templates shall be assignable at the global level with the ability to override at the site level.  
- FR-TPL-008: The system shall retain all prior versions of a modified template for audit purposes.  
   
# **12. Integrated Biometric Requirements**  
Biometric identity is the foundational capability of MESA. The platform does not depend on any third-party standalone software for core identity operations.  
   
| | |  
|-|-|  
| **Requirement** | **Specification** |   
| **Supported Modalities** | Fingerprint (Primary) via DigitalPersona, Suprema, or ZKTeco hardware — all supported from v1. Configurable fallbacks: RFID/Mifare Card, PIN, QR Code, or Supervisor Manual Override. Facial Recognition is a future phase addition. |   
| **Enrollment Workflow** | Integrated UI wizard capturing a minimum of 3 impressions per finger to generate a high-quality SourceAFIS minutiae template with quality scoring. |   
| **Duplicate Detection** | Real-time 1:N matching via SourceAFIS during enrollment to prevent ghost employees or dual-claiming across the entire template database. |   
| **Template Lifecycle** | Templates are created, updated, and purged entirely within MESA People Master. Deleting or terminating a user automatically purges the associated SourceAFIS template. |   
| **Device Abstraction** | Three vendor-specific capture adapters (DigitalPersona, Suprema, ZKTeco) implement a common IBiometricAdapter interface. Adapters handle only USB communication and raw image extraction. SourceAFIS sits above all adapters as the unified matching engine. Auto-detection selects the correct adapter by USB Vendor ID on terminal startup. |   
| **Offline Verification** | POS terminals cache AES-256 encrypted SourceAFIS templates locally based on Site/Outlet mapping, enabling sub-1-second 1:N offline matching regardless of which vendor scanner is attached. |   
| **Anti-Spoofing** | Hardware-based liveness detection is enabled where supported by the peripheral SDK. |   
| **Privacy Controls** | Only SourceAFIS mathematical minutiae templates are stored — raw fingerprint images captured by the vendor adapter are discarded immediately after template extraction. Biometric consent tracking indicators are maintained per user profile. |   
   
# **13. Licensing System — Technical Architecture**  
MESA uses a fully self-contained cryptographic licensing system with no third-party licensing service dependency. This architecture was selected specifically to support on-premises deployments where enterprise customers cannot allow activation traffic to reach an external vendor server.  
## **13.1  Architecture Decision: Custom ECDSA + JWT**  
Four options were evaluated. The table below summarises the decision:  
   
| | | | | | |  
|-|-|-|-|-|-|  
| **Criterion** | **Option A Keygen.sh** | **Option B Custom ECDSA (Selected)** | **Option C Hardware Bound** | **Option D License File** | **Winner** |   
| On-prem compatible | Partial | Fully ✓ | Fully | Fully | **B** |   
| External dependency | Yes | None ✓ | None | None | **B** |   
| Offline validation | SDK-based | JWT / ECDSA ✓ | Yes | Yes | **B** |   
| Business name binding | Manual layer | First-class ✓ | First-class | First-class | **B** |   
| Per-license cost | Yes | None ✓ | None | None | **B** |   
| Server migration safe | Yes | Yes ✓ | Breaks ✗ | Yes | **B** |   
| Deployment friction | Low | Low ✓ | Low | Medium | **B** |   
   
Option A (Keygen.sh) is a mature service but introduces an external validation dependency that on-premises enterprise IT departments will object to. Option C (hardware binding) breaks on server migrations — a common occurrence in enterprise environments. Option D (license file import) adds unnecessary deployment friction compared to a key string. Option B (Custom ECDSA + JWT) is the only approach that satisfies all MESA constraints without compromise.  
## **13.2  How the System Works**  
The licensing architecture separates the key (a short opaque claim ticket) from the certificate (the signed JWT that encodes all entitlements):  
   
- License Key — a human-typeable string in the format MESA-XXXXX-XXXXX-XXXXX-XXXXX. Generated by the MESA vendor licensing portal. Delivered to the customer once. Used as a claim ticket at activation time only.  
- License Certificate — a signed JWT (JSON Web Token) returned by the licensing server upon successful activation. Encodes business name, tier, expiry, terminal limit, identity limit, grace period, and enabled features. Verified locally using an ECDSA P-256 public key embedded in the application bundle.  
- Private Key — held exclusively on the MESA licensing server. Never distributed, never embedded in the application. Used only to sign certificates.  
- Public Key — embedded in the Electron application bundle at build time. Used for fully offline signature verification. Safe to distribute — it can verify but not forge signatures.  
## **13.3  License Key Format**  
The key is an opaque, human-typeable identifier. The format uses a restricted alphabet that eliminates visually ambiguous characters (O vs 0, I vs 1):  
   
**Format:    MESA-XXXXX-XXXXX-XXXXX-XXXXX**  
Example:   MESA-A3K9Z-BT2MQ-7XRPH-C4WNJ  
Alphabet:  A-Z and 2-9 excluding O, 0, I, 1  
Entropy:   Approximately 100 bits — sufficient for global uniqueness without a central registry  
   
The key is not the license. It is a claim ticket exchanged for a signed certificate during online activation. The certificate is what the application validates on every launch.  
## **13.4  Business Name Normalisation**  
The most operationally critical detail. Both the vendor portal (at generation time) and the activation server (at validation time) apply identical normalisation before hashing. This prevents activation failures caused by trailing punctuation, mixed case, or inconsistent whitespace.  
   
**Normalisation rules applied in order:**  
- Convert to lowercase  
- Trim leading and trailing whitespace  
- Strip punctuation (periods, commas, parentheses, slashes, hyphens, apostrophes)  
- Collapse multiple internal spaces to a single space  
- Normalise common legal suffixes (Ltd / Limited / Inc / LLC / PLC / Corp / Corporation)  
   
Examples:  
"ABC Manufacturing Ltd."  →  "abc manufacturing ltd"  
"ABC Manufacturing Ltd"   →  "abc manufacturing ltd"  
"  ABC  Manufacturing "   →  "abc manufacturing"  
   
The normalised string is SHA-256 hashed. Only the hash is stored in the license record — the plaintext business name is stored separately for display purposes only. On activation, the customer input is normalised and hashed before comparison; the raw input is never compared directly.  
## **13.5  Certificate Claims (JWT Payload)**  
The JWT payload encodes all license entitlements using short claim names to keep the token compact:  
   
| | | |  
|-|-|-|  
| **Claim** | **Full Name** | **Description** |   
| jti | JWT ID | Unique certificate identifier (UUID) |   
| sub | Subject | License key (opaque identifier) |   
| iss | Issuer | 'MESA Licensing Platform' |   
| exp | Expiry | Unix timestamp — license expiry date |   
| bus | Business Name | Display name of licensed business |   
| bnh | Business Name Hash | SHA-256 of normalised name — used for offline binding verification |   
| tier | License Tier | starter | professional | enterprise |   
| mxt | Max Terminals | Maximum number of POS terminals permitted |   
| mxi | Max Identities | Maximum number of enrolled biometric identities |   
| gpd | Grace Period Days | Days of continued access after expiry before full suspension |   
| fts | Features | Array of enabled feature flags (e.g. receipt_printing, hris_sync, saml_sso) |   
## **13.6  Activation Flow**  
Activation requires internet connectivity once. All subsequent validation is offline.  
   
1. Customer installs MESA. On first launch, the License Activation screen is displayed before any other functionality.  
2. Customer enters their registered business name and the license key provided by the MESA vendor.  
3. Application sends POST /licenses/activate to the MESA licensing server with the key and business name.  
4. Server looks up the license record by key hash, normalises and hashes the submitted business name, and compares against the stored hash. If they do not match, activation is rejected with a clear error message.  
5. Server validates the key is not revoked and has not exceeded its maximum activation count.  
6. Server signs and returns a JWT certificate (ES256). The certificate encodes all license entitlements.  
7. Application stores the certificate in an encrypted local store. The activation screen is dismissed. All platform functionality becomes available.  
8. The application re-validates against the server every 24 hours when online, refreshing the stored timestamp. If the server is unreachable, offline JWT validation continues for up to 72 hours.  
## **13.7  Renewal Flow**  
9. MESA vendor generates a new license key for the renewal period via the internal licensing portal.  
10. Customer receives the new key. At 30 days before expiry, the Admin Portal displays a persistent renewal warning banner.  
11. System Administrator navigates to Settings > License and enters the new license key under 'Activate Renewal Key'.  
12. Application calls POST /licenses/renew. Server validates the new key against the same business name and issues a new signed certificate.  
13. New certificate replaces the cached certificate. Warning banner is dismissed. An audit log entry records the renewal event.  
## **13.8  Offline Tolerance & Grace Period**  
These are two distinct mechanisms that must not be confused:  
   
- 72-Hour Offline Tolerance — the application validates its cached JWT certificate using the embedded public key on every launch. No server contact is required. If the application has not been able to reach the licensing server for more than 72 hours, it will attempt one online validation before allowing operations to continue. This protects against revoked licenses going undetected indefinitely during prolonged outages.  
- Grace Period (default 7 days) — begins after the license expiry date. During the grace period, the JWT signature still validates but the expiry timestamp has passed. The application detects this, continues operating, and prominently prompts the administrator to activate a renewal key. After the grace period ends, operations are suspended until a valid renewal key is activated.  
## **13.9  Vendor Licensing Portal**  
The MESA vendor licensing portal is a separate internal administrative tool — not accessible to customers — used by the MESA team to issue and manage customer licenses.  
   
**Key capabilities:**  
- Generate a new license key for a customer: enter business name (exact canonical form), tier, expiry date, terminal limit, identity limit, and enabled features. The system generates the key, creates the record, and displays the key once for the operator to copy and deliver.  
- View all issued licenses with status (inactive, active, grace, expired, revoked), activation dates, and usage.  
- Revoke a license (e.g., non-payment or fraud). Revocation is reflected on the customer's next online validation.  
- Extend an expiry date or increase limits on an existing license record.  
- View activation history and audit trail per license.  
   
**Security note:**  
The license key is shown exactly once in the portal at generation time and is never stored in plaintext. Only a SHA-256 hash is persisted. If the key is lost before delivery, a new key must be generated and the old record deactivated.  
   
# **14. User Journeys & Operational Workflows**  
## **14.1  New Employee Enrollment**  
14. HR profile is created via REST API or manual entry in the Admin Portal.  
15. Employee visits the Enrollment Officer.  
16. Officer selects the profile and initiates Biometric Capture. The portal detects the connected scanner automatically (DigitalPersona, Suprema, or ZKTeco) by USB Vendor ID.  
17. Employee scans their finger 3 times. SourceAFIS evaluates quality and runs a duplicate check.  
18. Template is encrypted and saved. MESA automatically syncs the identity to all applicable POS terminals within 60 seconds.  
## **14.2  Identity Synchronisation from HRIS**  
19. HRIS triggers a nightly or real-time webhook payload containing new hires and terminations.  
20. MESA People Master updates statuses and Cost Centres accordingly.  
21. Terminated user templates are purged from the central database and terminals are instructed to clear the local cache entry.  
## **14.3  POS Meal Claim & Verification**  
22. Cashier opens the POS screen. System is ready and polling the hardware immediately.  
23. Employee places their finger on the scanner.  
24. POS matches biometric locally via SourceAFIS. Meal Rules Engine confirms the user has not exceeded their entitlement for this shift window.  
25. System displays a green success indicator, dispatches a coupon print job, logs the meal transaction, and the cashier issues food.  
## **14.4  Failed Biometric & Exception Handling**  
26. Employee places their finger; scan fails (e.g., damaged fingerprint).  
27. POS displays a clear 'No Match Found' message.  
28. Cashier prompts for fallback (RFID card swipe or PIN entry).  
29. If fallback also fails, cashier presses the Supervisor Override button.  
30. Supervisor authenticates via PIN or biometric to authorise the transaction. Audit log records the override against the supervisor's identity.  
## **14.5  Offline Terminal Processing & Recovery**  
31. Network connectivity is lost at the site.  
32. POS automatically switches to Offline Mode; UI indicator changes to amber.  
33. Cashier continues scanning — transactions are validated against the local encrypted SourceAFIS cache and stored locally. Coupons print from the local template cache.  
34. Network is restored. POS detects the heartbeat, automatically pushes queued transactions, and downloads any new templates. UI indicator returns to green.  
## **14.6  Month-End Close & Reconciliation**  
35. Finance Officer initiates Month-End Close for the selected fiscal period via the Admin Portal.  
36. MESA tags all transactions up to the period cutoff as closed in the background.  
37. POS terminals continue processing new-period meals without any interruption.  
38. System generates finalised export files for payroll deduction and notifies the Finance Officer upon completion.  
## **14.7  First-Time License Activation**  
39. System Administrator installs MESA on the server for the first time.  
40. On first launch, MESA displays a License Activation screen before any other functionality is accessible.  
41. Administrator enters the business name exactly as registered with the vendor, and the license key received from the MESA vendor.  
42. MESA validates the key and business name hash against the licensing server. On success, the licensed business name, tier, expiry date, and limits are displayed for confirmation.  
43. Administrator confirms. The platform unlocks fully.  
## **14.8  License Renewal**  
44. 30 days before expiry, a renewal warning banner appears on the Admin Portal for System Administrators.  
45. Vendor generates a new license key for the next annual period.  
46. System Administrator navigates to Settings > License and enters the new license key.  
47. MESA validates and issues a new signed certificate. The renewal warning banner is dismissed. Audit log records the event.  
## **14.9  Meal Coupon Printing**  
48. Employee places finger on POS scanner.  
49. Biometric verification succeeds. Meal Rules Engine approves the transaction.  
50. POS UI displays the green approval screen.  
51. System dispatches a print job to the configured thermal receipt printer automatically. Coupon prints without any cashier action.  
52. Employee collects the coupon and presents it at the food counter.  
## **14.10  Receipt Template Customisation**  
53. Site Administrator navigates to Settings > Receipt Templates and selects 'Create New Template'.  
54. The designer loads the default template as the starting point in the WYSIWYG editor.  
55. Administrator removes unwanted fields, reorders remaining fields, uploads the company logo, and sets a custom footer message. The 80mm thermal preview updates in real time.  
56. Administrator saves the template and assigns it to one or more sites.  
57. POS terminals download the new template on next sync. All subsequent coupons use the new design.  
## **14.11  Device / Session Recovery After Power Loss**  
58. Power outage hits a POS terminal mid-transaction.  
59. Power is restored; cashier launches the MESA POS application.  
60. Token-based session management logs the cashier in immediately without errors. Transaction integrity is maintained.  
   
# **15. Reporting & Analytics Requirements**  
MESA delivers a comprehensive reporting suite with export capability (CSV, PDF, Excel) and dynamic filtering.  
## **15.1  Operational Reports**  
- Consolidated Meals per Employee — total counts mapped by Department and Cost Centre.  
- Throughput Analysis — peak meal windows and transactions per minute to optimise staffing.  
- Offline Sync Backlog — terminals holding unsynced local data.  
## **15.2  Financial Reports**  
- Customer Statements — itemised transaction list for a specific user over a selected period.  
- Subsidy vs. Recovery — total cost incurred versus amount eligible for payroll deduction.  
## **15.3  Exception & Fraud Dashboards**  
- Failed Auth Report — terminals or users with abnormally high biometric rejection rates.  
- Manual Override Log — frequency of supervisor overrides grouped by cashier and supervisor.  
- Duplicate Meal Attempts — log of users attempting more than their entitled meals in one shift.  
## **15.4  Executive Dashboards**  
- Visual summary widgets: device uptime, active users, total daily cost, and overall biometric success rate.  
- License status widget — tier, expiry date, and renewal status visible to System Administrators.  
- Configurable date ranges and site filters for all dashboard widgets.  
# **16. Security, Privacy, Audit & Compliance**  
- Role-Based Access Control (RBAC): Least-privilege enforcement — cashiers cannot access the People Master; Finance cannot edit biometrics; only System Administrators access license management.  
- Authentication: Admin Portal supports SSO via SAML 2.0 / OAuth2. POS terminals authenticate via distinct operator PINs or operator biometrics.  
- Encryption: Data in transit protected by TLS 1.2+. Biometric templates and PII encrypted at rest using AES-256. License certificate stored in encrypted local store.  
- License Certificate Security: ECDSA P-256 signature — computationally infeasible to forge without the private key. Private key never leaves the licensing server. Certificate contains a unique jti claim preventing replay attacks.  
- Audit Immutability: All critical actions (overrides, profile changes, rule adjustments, sync events, license activations, renewals, revocations) logged with timestamp, actor ID, and delta values. Logs cannot be deleted by any role.  
- Privacy & Compliance: Platform design supports GDPR and POPIA requirements, including permanent user data purge (Right to Erasure) and biometric consent tracking per profile.  
- Device Trust: Terminals must be registered and authenticated via secure tokens to connect to the central database, preventing rogue devices from accessing the identity cache.  
# **17. Integration Requirements**  
| | | | |  
|-|-|-|-|  
| **Integration Target** | **Direction** | **Method** | **Purpose** |   
| HRIS / Payroll / ERP | Inbound | REST API (JSON) | Automated import of new hires, terminations, and cost centre changes |   
| HRIS / Payroll / ERP | Outbound | Scheduled CSV / API | Export of monthly meal deduction totals for payroll processing |   
| Directory / Identity | Inbound | SAML 2.0 / OAuth2 | SSO for administrative and portal users |   
| Biometric Hardware | Bidirectional | Vendor C SDK + SourceAFIS | Three native adapters (DigitalPersona, Suprema, ZKTeco) capture raw images; SourceAFIS performs vendor-agnostic template extraction and 1:N matching |   
| MESA Licensing Server | Outbound | REST (HTTPS) | License activation, daily re-validation, renewal, and deactivation — internet required once per activation; subsequent validation is fully offline |   
| Access Control (Phase 3) | Outbound | API / Webhook | Link canteen entry turnstiles to meal eligibility rules |   
   
# **18. Non-Functional Requirements**  
| | | |  
|-|-|-|  
| **Category** | **Requirement** | **Target** |   
| **Availability** | Central platform uptime | 99.9% uptime |   
| **Offline Resilience** | POS terminals retain 100% core transaction capability during network loss | Up to 72 hours offline |   
| **Performance** | Biometric scan to UI result under load | < 1.0 second |   
| **Scalability** | Active biometric templates per site / concurrent global transactions | 10,000 templates / 500 concurrent |   
| **Reliability** | Transaction loss during intermittent network drops | Zero loss; guaranteed delivery |   
| **License Offline Tolerance** | Duration of operation without online license re-validation | 72 hours |   
| **Usability** | Time for a new cashier to achieve POS operational proficiency | < 15 minutes training |   
| **Observability** | Network and system errors presented to end users | Human-readable; never technical exceptions |   
| **Maintainability** | Ability to adopt new scanner hardware models without core code changes | Plugin-based adapter architecture |   
# **19. Data Model Overview**  
MESA uses a strictly normalised schema. Biometric Templates are separated from Business Profiles to enhance security and simplify HR data imports.  
   
- Person / Identity — Core PII: Name, Employee ID, Status.  
- Biometric Template — SourceAFIS minutiae representation linked via foreign key to Person; includes capture vendor tag and quality score.  
- Credential — RFID cards and PINs mapped to Person.  
- Organisational — Department, Cost Centre, Site, Outlet.  
- Device — POS Terminal, registered IP, heartbeat timestamp, software version, assigned printer, auto-detected scanner vendor and model.  
- Business Logic — Meal Rule, Entitlement configurations.  
- Activity — Transaction, Adjustment, Sync Job, Audit Event, Report Job.  
- License Record — License Key Hash, Business Name, Business Name Hash, Tier, Expiry, Terminal Limit, Identity Limit, Grace Period, Activation Count, Features, Revocation Status.  
- Receipt Template — Template Name, Version, Field Configuration (JSON), Logo Asset Reference, Footer Text, Active Flag, Site Assignment, Created By, Created At.  
- Print Job — Transaction Reference, Terminal ID, Template Version, Print Status, Timestamp, Reprint Count.  
# **20. Implementation Phases & Milestone Plan**  
| | | | |  
|-|-|-|-|  
| **Phase** | **Target Outcomes** | **Key Deliverables** | **Exit Criteria** |   
| **MVP — Phase 1** | Establish core operations, stabilise POS, deliver unified identity with all supported biometric hardware and self-contained licensing | Native bio enrollment (DigitalPersona, Suprema, ZKTeco via SourceAFIS), People Master, offline POS, core reporting, RBAC, ECDSA license activation, receipt printing, template designer, multi-modal fallback (Card/PIN) | Pilot site activates license, captures biometrics on all three supported scanners, processes offline meals, prints coupons, and generates accurate reports |   
| **Phase 2** | Automate administration, enforce advanced policies, and expand enterprise integrations | HRIS API inbound integration, automated background month-end, advanced meal rules, exception & fraud dashboards, configurable shift rules | Month-end runs in background with zero POS downtime; HR profile creation automated via API |   
| **Phase 3 / Future** | Expand modalities and modern touchpoints | Facial recognition, SSO via SAML, webhooks, employee app, advanced executive dashboards | SSO deployed; alternate biometric modalities successfully piloted |   
   
# **21. Acceptance Criteria**  
- Enrollment: Operator successfully creates a user and captures a fingerprint entirely within MESA's Web Admin Portal using each of the three supported scanners (DigitalPersona, Suprema, ZKTeco). SourceAFIS produces a consistent template format across all three devices.  
- License Activation: System Administrator successfully activates MESA using a vendor-issued license key. The platform correctly validates the business name normalisation and hash match, and displays license tier and expiry details.  
- License Enforcement: Platform correctly enters grace-period mode when a test license is expired, and full access is restored immediately upon activation of a renewed license key.  
- Offline License Validation: Application successfully launches and permits operations with no network connectivity, verifying the cached JWT certificate using the embedded public key.  
- Receipt Printing: Upon a successful POS biometric verification, a meal coupon prints automatically on the configured thermal printer without any additional cashier action. Printing continues correctly in offline mode.  
- Print Disable: When coupon printing is disabled at the site level, the POS processes and approves meals without dispatching any print jobs.  
- Template Designer: Administrator creates a custom template by removing fields, uploading a logo, and setting a custom footer. The WYSIWYG preview accurately reflects changes. POS terminals use the new design after sync.  
- Verification Speed: 95% of biometric POS transactions resolve in under 1 second.  
- Offline Operations: POS successfully authenticates a user, logs a meal, and prints a coupon while the network cable is physically unplugged; syncs correctly within 5 minutes of reconnection.  
- Duplicate Prevention: System rejects a second meal attempt within a restricted time window with a clear error message to the cashier.  
- Month-End Execution: Administrator triggers month-end closing and a POS operator successfully logs a new transaction simultaneously without any system lock.  
- Stale Session Elimination: Terminals rebooted abruptly allow operators to log back in immediately without manual database intervention.  
# **22. Risks & Mitigations**  
| | | | |  
|-|-|-|-|  
| **#** | **Risk** | **Severity** | **Mitigation** |   
| 1 | Biometric SDK procurement delay — one or more vendor SDKs takes longer than expected to be approved | Medium | Initiate procurement with all three vendors at kick-off. ZKTeco SDK has the lightest approval process and should be secured first to validate the SourceAFIS + adapter pattern end-to-end. Adapter architecture ensures the other two slot in without core code changes. |   
| 2 | Hardware failure — POS terminal or scanner fails during peak service | Medium | Multi-modal fallback (Card/PIN) supported. Hot-swappable terminals auto-pull cache on boot. |   
| 3 | Prolonged network outage causing sync conflicts and stale caches | Medium | Terminals alert when offline > 4 hours. Server handles sync deduplication natively. 72h offline tolerance built into both POS operations and license validation. |   
| 4 | User adoption resistance — cashiers resist new touch UI | Low | Touch-first, simplified interface designed for < 15-minute training. Hands-on onboarding sessions before go-live. |   
| 5 | Privacy pushback — employees object to biometric capture | Medium | Transparent consent workflows. Card/PIN fallback available for objectors. GDPR/POPIA compliant design with Right to Erasure. |   
| 6 | HRIS API rate limits flooding the network during sync | Low | Delta/incremental syncing rather than full daily data dumps. |   
| 7 | Browser-to-USB communication complexity for web enrollment | Medium | Local lightweight WebSocket bridge service/daemon on enrollment PC proxies between the browser and USB SDK. |   
| 8 | License ECDSA private key compromise | High | Private key stored in a secrets manager (not in code or Docker images). Rotate key pair if compromised — all existing customers must re-activate against a new certificate. Key rotation procedure documented and rehearsed annually. |   
| 9 | License expiry causes unplanned operational disruption during active canteen hours | High | 30-day advance warning banners for administrators. Configurable grace period (default 7 days) after expiry prevents sudden lockout. Offline JWT cache ensures network issues during renewal do not affect operations. |   
| 10 | Receipt printer hardware incompatibility — thermal printer lacks ESC/POS support | Medium | Standardise on ESC/POS compatible thermal printers during hardware procurement. Print-disable toggle ensures operations continue even if a printer fails. |   
| 11 | Printer paper jam or outage during peak meal service | Low | Printer status surfaced on POS UI in real time. Reprint function available. Business can opt to run in verification-only mode as a fallback. |   
   
# **23. Success Metrics & KPIs**  
| | | | |  
|-|-|-|-|  
| **Metric** | **Definition** | **Target** | **Owner** |   
| **Biometric Success Rate** | Percentage of scans accepted on the first attempt without fallback | > 95% | Product / UX |   
| **Transaction Latency** | Time from hardware scan to UI success confirmation | < 1.0 second | Engineering |   
| **Failed-Auth Rate** | Percentage of transactions requiring supervisor override | < 2% | Operations |   
| **Duplicate Prevention** | Rate at which rule-violating meals are successfully blocked | 100% | Engineering |   
| **IT Ticket Reduction** | Decrease in session lockout, terminal lock, and sync-related IT tickets | > 80% reduction | IT Support |   
| **Month-End Downtime** | System downtime required to execute financial period close | 0 minutes | Finance / Dev |   
| **License Renewal Lead Time** | Days before expiry that renewal warning is actioned by customer | > 14 days avg | Vendor Ops |   
# **24. Open Questions**  
- Have SDK agreements been initiated with all three biometric vendors — HID Global (DigitalPersona), Suprema, and ZKTeco? ZKTeco SDK has the fastest approval; which vendor will be prioritised to validate the SourceAFIS adapter pattern first?  
- Which specific scanner models from each vendor will be the primary supported devices at launch? (e.g., DigitalPersona U.are.U 5160, Suprema BioMini Plus 2, ZKTeco ZK9500)  
- Can existing employee RFID ID cards be reused natively as the primary fallback mechanism, or are new card encoders required?  
- What is the baseline network stability across target canteen sites (average hours of downtime per week)?  
- Is there an existing Active Directory or identity provider available for immediate SSO integration in Phase 1?  
- What is the retention policy for closed financial period transaction data?  
- What make and model of thermal receipt printers are currently deployed or planned? Are they ESC/POS compatible?  
- What is the target coupon paper width — standard 80mm or 58mm thermal roll?  
- Will the MESA Licensing Platform vendor portal be operated by the software vendor directly, or does the enterprise need access to a self-service license renewal portal?  
- What is the ECDSA key rotation policy — how frequently should the private key be rotated and what is the re-activation plan for existing customers on rotation?  
# **25. Document Control**  
| | | | |  
|-|-|-|-|  
| **Version** | **Date** | **Author** | **Change Summary** |   
| 1.0 | 2026-05-27 | Product Management | Initial release — new product definition |   
| 1.1 | 2026-05-28 | Product Management | Added: Enterprise Licensing (Module 10.11, FR-LIC), Meal Coupon & Receipt Printing (Module 10.12, FR-RCP), Receipt & Coupon Template Designer (Module 10.13, FR-TPL). Updated scope, data model, user journeys, acceptance criteria, risks, and open questions. |   
| 1.2 | 2026-05-29 | Product Management | Promoted all three biometric hardware adapters (DigitalPersona, Suprema, ZKTeco) from phased delivery to MVP scope. Replaced VeriFinger reference with SourceAFIS open-source engine throughout. |   
| 1.3 | 2026-05-29 | Product Management | Added Section 13: Licensing System Technical Architecture. Covers options analysis (A: Keygen, B: Custom ECDSA, C: Hardware Bound, D: License File), selection rationale, key format specification (MESA-XXXXX-XXXXX-XXXXX-XXXXX), ECDSA P-256 / JWT certificate approach, business name normalisation algorithm, JWT claims schema, activation and renewal flows, offline tolerance mechanics, grace period behaviour, and vendor licensing portal specification. Updated acceptance criteria, risks, and open questions accordingly. |   
   
*MESA — Meal Entitlement, Service & Access Platform  |  Confidential  |  v1.3  |  2026*  
