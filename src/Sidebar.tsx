import { useState } from "react";
import {
  Building2,
  LayoutDashboard,
  Users,
  ListOrdered,
  Stethoscope,
  FlaskConical,
  Receipt,
  ChartNoAxesColumn,
  Shield,
  ChevronDown,
  CircleHelp,
  CircleUserRound,
} from "lucide-react";
import { canAccess, roleNames, type Page, type Role } from "./navigation";

const mainItems = [
  { page: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { page: "search", label: "Patients", Icon: Users },
  { page: "visits", label: "Queue & Visits", Icon: ListOrdered },
  { page: "consultations", label: "Consultations", Icon: Stethoscope },
  { page: "services", label: "Services & Lab", Icon: FlaskConical },
  { page: "billing", label: "Billing", Icon: Receipt },
  { page: "reports", label: "Reports", Icon: ChartNoAxesColumn },
] as const;
const adminItems = [
  { page: "staff", label: "Staff Accounts" },
  { page: "maintenance", label: "System Maintenance" },
  { page: "backup", label: "Backup & Restore" },
] as const;

export function Sidebar({
  role,
  page,
  navigate,
}: {
  role: Role;
  page: Page;
  navigate: (page: Page) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const active = (target: Page) =>
    page === target || (target === "search" && page === "patients");
  return (
    <aside className="sidebar">
      <a href="#main" className="brand" onClick={() => navigate("dashboard")}>
        <span className="brand-icon">
          <Building2 size={23} />
        </span>
        <span>
          MediSystem<small>Clinic Management System</small>
        </span>
      </a>
      <div className="workspace-label">{roleNames[role]}</div>
      <nav aria-label="Main navigation">
        {mainItems
          .filter((item) => canAccess(role, item.page))
          .map(({ page: target, label, Icon }) => (
            <button
              key={target}
              className={`nav-item${active(target) ? " active" : ""}`}
              onClick={() => navigate(target)}
              aria-current={active(target) ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
      </nav>
      {role === "admin" && (
        <div className="administration">
          <button
            className={`nav-item${adminItems.some((item) => page === item.page) ? " active" : ""}`}
            aria-expanded={expanded}
            aria-controls="administration-menu"
            onClick={() => setExpanded(!expanded)}
          >
            <Shield size={18} />
            <span>Administration</span>
            <ChevronDown size={15} className={expanded ? "expanded" : ""} />
          </button>
          <nav
            id="administration-menu"
            aria-label="Administration"
            hidden={!expanded}
          >
            {adminItems.map(({ page: target, label }) => (
              <button
                key={target}
                className={`subnav-item${page === target ? " active" : ""}`}
                onClick={() => navigate(target)}
                aria-current={page === target ? "page" : undefined}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}
      <nav aria-label="Support and account" className="sidebar-utilities">
        <button
          className={`nav-item${page === "help" ? " active" : ""}`}
          onClick={() => navigate("help")}
          aria-current={page === "help" ? "page" : undefined}
        >
          <CircleHelp size={18} />
          <span>Help & Guide</span>
        </button>
        <button
          className={`nav-item${page === "settings" ? " active" : ""}`}
          onClick={() => navigate("settings")}
          aria-current={page === "settings" ? "page" : undefined}
        >
          <CircleUserRound size={18} />
          <span>My Account</span>
        </button>
      </nav>
    </aside>
  );
}
