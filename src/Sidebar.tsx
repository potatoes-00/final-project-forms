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
  Menu,
  X,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const selectPage = (target: Page) => {
    navigate(target);
    setMenuOpen(false);
  };
  const active = (target: Page) =>
    page === target || (target === "search" && page === "patients");
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <a
          href="#main"
          className="brand"
          onClick={() => selectPage("dashboard")}
        >
          <span className="brand-icon">
            <Building2 size={23} />
          </span>
          <span>
            MediSystem<small>Clinic Management System</small>
          </span>
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Menu"}
          aria-expanded={menuOpen}
          aria-controls="workspace-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          <span>{menuOpen ? "Close menu" : "Menu"}</span>
        </button>
      </div>
      <div
        id="workspace-navigation"
        className={`navigation-content${menuOpen ? " is-open" : ""}`}
      >
        <div className="workspace-label">{roleNames[role]}</div>
        <nav aria-label="Main navigation">
          {mainItems
            .filter((item) => canAccess(role, item.page))
            .map(({ page: target, label, Icon }) => (
              <button
                key={target}
                className={`nav-item${active(target) ? " active" : ""}`}
                onClick={() => selectPage(target)}
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
              onClick={() => setExpanded((open) => !open)}
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
                  onClick={() => selectPage(target)}
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
            onClick={() => selectPage("help")}
            aria-current={page === "help" ? "page" : undefined}
          >
            <CircleHelp size={18} />
            <span>Help & Guide</span>
          </button>
          <button
            className={`nav-item${page === "settings" ? " active" : ""}`}
            onClick={() => selectPage("settings")}
            aria-current={page === "settings" ? "page" : undefined}
          >
            <CircleUserRound size={18} />
            <span>My Account</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
