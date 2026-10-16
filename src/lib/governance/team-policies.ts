// ============================================================
// Internal Team Policies & Administrative Governance
//
// NOTICE:
// DIGISOLVNET currently operates without direct employees.
// These records represent pre-configured, future-ready operational
// governance documentation ready to be activated as team hiring occurs.
// ============================================================

import { InternalTeamPolicy } from "./types";

export const INTERNAL_TEAM_POLICIES: InternalTeamPolicy[] = [
  {
    slug: "leave_and_attendance",
    title: "Employee Leave and Attendance Policy",
    category: "hr",
    summary: "Guidelines governing planned annual leave, sick leave, casual leave, and attendance tracking.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 12,
    applicableRoles: ["Employee", "Manager", "Contractor"],
    guidance: [
      "Employees are entitled to 18 days of paid annual leave and 12 days of sick/casual leave per calendar year.",
      "Leave requests exceeding 3 consecutive days must be submitted at least 7 days in advance.",
      "Attendance is self-recorded via administrative HRMS portal; unnotified absence of 3 days triggers administrative outreach.",
    ],
    disclaimer: "Operational framework template for DIGISOLVNET India. Subject to legal compliance under local state Shops and Establishments Acts.",
  },
  {
    slug: "working_hours_and_holidays",
    title: "Working Hours and Public Holidays Policy",
    category: "hr",
    summary: "Standard working hours, flexible working arrangements, and gazetted national holiday schedule.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 12,
    applicableRoles: ["All Personnel"],
    guidance: [
      "Core operational hours are 9:30 AM to 6:30 PM IST, Monday through Friday (40 hours per week).",
      "Flexible working windows permitted with manager alignment, ensuring core meeting availability between 11:00 AM and 4:00 PM IST.",
      "10 mandatory national and festival holidays are observed annually, including Republic Day, Independence Day, and Gandhi Jayanti.",
    ],
    disclaimer: "Draft policy for Indian operations. To be reviewed with local labor counsel.",
  },
  {
    slug: "confidentiality_and_access",
    title: "Confidentiality and Access Control Policy",
    category: "security",
    summary: "Strict non-disclosure commitments and principle of least privilege access to platform systems.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 6,
    applicableRoles: ["All Personnel", "Contractors", "Vendors"],
    guidance: [
      "All personnel must execute a comprehensive Non-Disclosure Agreement (NDA) prior to receiving system credentials.",
      "Production database and Supabase service-role access is restricted strictly to authorized platform administrators.",
      "Access permissions are reviewed quarterly; dormant credentials (> 45 days) are automatically disabled.",
    ],
    disclaimer: "Binding confidentiality standards for future staff and contractors.",
  },
  {
    slug: "onboarding_offboarding",
    title: "Personnel Onboarding and Offboarding Checklist",
    category: "operations",
    summary: "Rigorous onboarding provisioning and immediate same-day offboarding access revocation.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 12,
    applicableRoles: ["HR", "IT Administrators", "Hiring Managers"],
    guidance: [
      "Onboarding: Background check, signed code of conduct, security training completion, and 2FA enrollment.",
      "Offboarding: Immediate revocation of SSO, GitHub, Supabase, and Meta developer console credentials within 1 hour of separation.",
      "Hardware: Recovery of company-provisioned devices and cryptographic wipe confirmation.",
    ],
    disclaimer: "Standard operating procedure for administrative personnel changes.",
  },
  {
    slug: "password_and_device_security",
    title: "Password, Device and Endpoint Security Policy",
    category: "security",
    summary: "Mandatory hardware encryption, strong password complexity, and multi-factor authentication (MFA).",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 6,
    applicableRoles: ["All Personnel"],
    guidance: [
      "Passwords must be at least 14 characters with mixed casing, digits, and symbols, managed via enterprise password vault.",
      "MFA (FIDO2 WebAuthn or TOTP) is mandatory across all platform, email, and repository accounts.",
      "Endpoints must have full-disk encryption (BitLocker / FileVault) enabled with automatic screen lock after 5 minutes of inactivity.",
    ],
    disclaimer: "Technical security baseline aligned with ISO 27001 control standards.",
  },
  {
    slug: "customer_data_handling",
    title: "Customer Data Handling and Zero-Snooping Policy",
    category: "security",
    summary: "Prohibits inspection of private WhatsApp conversations and governs customer metadata handling.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 6,
    applicableRoles: ["Support Agents", "Developers", "Administrators"],
    guidance: [
      "Zero Snooping: Staff are strictly prohibited from inspecting private WhatsApp customer chat bodies or media without explicit customer written consent for troubleshooting.",
      "Support telemetry is restricted to diagnostic delivery logs, message status codes, and aggregate error telemetry.",
      "Customer data exports and deletions must be handled exclusively through audited self-service workflows.",
    ],
    disclaimer: "Complies with Section 43A of the Information Technology Act 2000 and the DPDP Act 2023.",
  },
  {
    slug: "incident_escalation_and_disciplinary",
    title: "Incident Escalation and Disciplinary Review Policy",
    category: "operations",
    summary: "Severity-based escalation matrix for security vulnerabilities and internal disciplinary procedures.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 12,
    applicableRoles: ["Incident Response Team", "Management"],
    guidance: [
      "Severity 1 (Critical Data Breach): Response time < 15 minutes; executive notification and CERT-In disclosure within 6 hours.",
      "Severity 2 (Service Outage): Response time < 30 minutes; status page update and customer notification.",
      "Intentional violation of data privacy policies results in immediate termination and potential legal prosecution under Indian IT laws.",
    ],
    disclaimer: "Incident reporting procedure aligned with CERT-In 2022 cyber security directions.",
  },
  {
    slug: "code_review_and_release",
    title: "Code Review, Testing and Production Deployment Policy",
    category: "engineering",
    summary: "Peer review, 100% automated test suite pass rate, and staging verification before production release.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 6,
    applicableRoles: ["Software Engineers", "QA", "Release Managers"],
    guidance: [
      "No direct commits to main branch; all changes require signed commits and passing automated Vitest test suites.",
      "Database schema changes must be written as reversible, additive migrations (numbered 001..055).",
      "Production deployment keys and Razorpay secrets are never committed to repositories or exposed to client-side bundles.",
    ],
    disclaimer: "Software engineering baseline enforced by CI/CD gates.",
  },
  {
    slug: "vendor_and_third_party_access",
    title: "Vendor and Third-Party Risk Management Policy",
    category: "security",
    summary: "Security evaluation and contractual data-protection clauses for third-party service providers.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 12,
    applicableRoles: ["Procurement", "Legal", "Security Lead"],
    guidance: [
      "All third-party cloud providers (Supabase, Razorpay, Meta WhatsApp API) must maintain SOC2 Type II or ISO 27001 certifications.",
      "Vendors processing Indian personal data must execute Data Processing Addendums (DPA) compliant with Indian regulations.",
      "Third-party API keys must be stored in encrypted environment secret vaults and rotated bi-annually.",
    ],
    disclaimer: "Third-party risk management framework.",
  },
  {
    slug: "backup_and_business_continuity",
    title: "Backup and Business Continuity Disaster Recovery (BCDR) Policy",
    category: "operations",
    summary: "Daily encrypted database snapshots, geo-redundant storage, and disaster recovery testing.",
    effectiveDate: "2026-01-01",
    reviewFrequencyMonths: 6,
    applicableRoles: ["DevOps", "Database Administrators"],
    guidance: [
      "Daily automated database backups with point-in-time recovery (PITR) retained for 30 days.",
      "Recovery Point Objective (RPO) is set at 1 hour; Recovery Time Objective (RTO) is set at 4 hours.",
      "Bi-annual tabletop disaster recovery simulations to verify backup integrity and restoration runbooks.",
    ],
    disclaimer: "Disaster recovery guidelines.",
  },
];

export function listInternalTeamPolicies(): InternalTeamPolicy[] {
  return INTERNAL_TEAM_POLICIES;
}

export function getInternalTeamPolicy(slug: string): InternalTeamPolicy | null {
  return INTERNAL_TEAM_POLICIES.find((p) => p.slug === slug) ?? null;
}
