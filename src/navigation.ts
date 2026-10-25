export type Role = "admin" | "staff";
export type Page =
  | "dashboard"
  | "patients"
  | "search"
  | "visits"
  | "consultations"
  | "services"
  | "billing"
  | "reports"
  | "staff"
  | "maintenance"
  | "backup"
  | "help"
  | "settings";

export const roleNames: Record<Role, string> = {
  admin: "Admin / Doctor",
  staff: "Clinic Staff",
};

export const pageNames: Record<Page, string> = {
  dashboard: "Dashboard",
  patients: "Patient registration",
  search: "Patients",
  visits: "Queue & Visits",
  consultations: "Consultations",
  services: "Services & Lab",
  billing: "Billing",
  reports: "Reports",
  staff: "Staff Accounts",
  maintenance: "System Maintenance",
  backup: "Backup & Restore",
  help: "Help & Guide",
  settings: "My Account",
};

export const canAccess = (role: Role, page: Page) =>
  role === "admin" ||
  !["consultations", "staff", "maintenance", "backup"].includes(page);
