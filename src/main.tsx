import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import "@fontsource-variable/dm-sans";
import { LoginForm } from "./auth/LoginForm";
import {
  ACCOUNT_KEY,
  DEMO_ADMIN,
  DEMO_PASSWORD,
  login,
  logout,
  restoreSession,
  type Identity,
} from "./auth/prototypeAuth";
import "./styles.css";
import { Sidebar } from "./Sidebar";
import { PatientDocuments } from "./PatientDocuments";
import { ModulePages } from "./ModulePages";
import { canAccess, pageNames, roleNames, type Page } from "./navigation";

type Values = Record<string, string>;
type Patient = Values & { id: string; created: string };
type Visit = Values & { id: string; created: string; number: string };
type Database = { patients: Patient[]; visits: Visit[]; profile: Values };
const KEY = "medisystem-lab7-v1";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const nowTime = () =>
  new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
  });
const age = (dob: string) => {
  const a = new Date(dob + "T00:00:00");
  const b = new Date(today() + "T00:00:00");
  return (
    b.getFullYear() -
    a.getFullYear() -
    (b.getMonth() < a.getMonth() ||
    (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())
      ? 1
      : 0)
  );
};
const initial: Database = {
  patients: [
    {
      id: "PT-0001",
      firstName: "Elena",
      lastName: "Santos",
      middleName: "Reyes",
      dob: "1957-04-18",
      sex: "Female",
      civil: "Married",
      phone: "09171234567",
      email: "elena@example.com",
      address: "24 Sample Street",
      city: "Quezon City",
      emergencyName: "Marco Santos",
      emergencyPhone: "09181234567",
      consent: "on",
      created: today(),
    },
    {
      id: "PT-0002",
      firstName: "Miguel",
      lastName: "Reyes",
      middleName: "",
      dob: "1994-09-12",
      sex: "Male",
      civil: "Single",
      phone: "09191234567",
      email: "miguel@example.com",
      address: "18 Demo Street",
      city: "Manila",
      emergencyName: "Ana Reyes",
      emergencyPhone: "09201234567",
      consent: "on",
      created: today(),
    },
  ],
  visits: [],
  profile: {
    firstName: "John",
    lastName: "Doe",
    displayName: "John Doe",
    email: "staff@example.com",
    phone: "09171234567",
    jobTitle: "Clinic assistant",
    language: "English",
    contact: "Email",
    timezone: "Asia/Manila",
    notifications: "on",
    notes: "",
  },
};
function readDB(): Database {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      v &&
      Array.isArray(v.patients) &&
      Array.isArray(v.visits) &&
      v.profile
    ) {
      if (["Alex Morgan", "Jogn Doe"].includes(v.profile.displayName)) {
        v.profile = {
          ...v.profile,
          firstName: "John",
          lastName: "Doe",
          displayName: "John Doe",
        };
      }
      return v;
    }
  } catch {}
  return structuredClone(initial);
}
const fullName = (p: Patient) => `${p.firstName} ${p.lastName}`;
const phoneRule = "^(09[0-9]{9}|\\+639[0-9]{9})$";
const fieldNames: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  dob: "Date of birth",
  sex: "Sex",
  civil: "Civil status",
  phone: "Mobile number",
  email: "Email address",
  address: "Street address",
  city: "City / municipality",
  emergencyName: "Emergency contact",
  emergencyPhone: "Emergency mobile",
  consent: "Record confirmation",
  patientId: "Patient",
  reason: "Reason for visit",
  date: "Visit date",
  time: "Arrival time",
  service: "Service",
  priority: "Priority",
  referral: "Referral source",
  visitType: "Visit type",
  notes: "Notes",
  query: "Patient name or ID",
  minAge: "Minimum age",
  maxAge: "Maximum age",
  from: "Registered from",
  to: "Registered to",
  displayName: "Display name",
  jobTitle: "Job title",
};

function Field({
  name,
  label,
  help,
  required,
  errors,
  wide,
  children,
}: {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  errors: Values;
  wide?: boolean;
  children: React.ReactElement;
}) {
  const child = React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    {
      id: name,
      name,
      required,
      "aria-invalid": errors[name] ? "true" : undefined,
      "aria-describedby":
        `${help ? name + "-help " : ""}${errors[name] ? name + "-error" : ""}`.trim() ||
        undefined,
    },
  );
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label htmlFor={name}>
        {label}
        {required && (
          <span className="required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
        {!required && <span className="optional">Optional</span>}
      </label>
      {child}
      {help && (
        <div id={name + "-help"} className="helper">
          {help}
        </div>
      )}
      {errors[name] && (
        <div id={name + "-error"} className="field-error">
          {errors[name]}
        </div>
      )}
    </div>
  );
}
function App({ user, onLogout }: { user: Identity; onLogout: () => void }) {
  const [db, setDB] = useState<Database>(readDB);
  const role = user.role;
  const [page, setPage] = useState<Page>("dashboard");
  const [errors, setErrors] = useState<Values>({});
  const [notice, setNotice] = useState("");
  const [resultDetail, setResultDetail] = useState("Standard");
  const [results, setResults] = useState<Patient[] | null>(null);
  const [preview, setPreview] = useState<Patient | null>(null);
  const [editing, setEditing] = useState<Patient | null>(null);
  const save = (next: Database) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setDB(next);
      return true;
    } catch {
      setNotice(
        "Unable to save. Browser storage may be full or disabled. No record was saved.",
      );
      return false;
    }
  };
  const navigate = (p: Page) => {
    if (!canAccess(role, p)) return;
    setEditing(null);
    setPage(p);
    setErrors({});
    setNotice("");
    setPreview(null);
    setTimeout(() => document.querySelector<HTMLElement>("h1")?.focus(), 0);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    const form = event.currentTarget;
    const data = Object.fromEntries(
      [...new FormData(form)].map(([k, v]) => [k, String(v).trim()]),
    ) as Values;
    const e: Values = {};
    for (const el of Array.from(form.elements)) {
      if (
        !(
          el instanceof HTMLInputElement ||
          el instanceof HTMLSelectElement ||
          el instanceof HTMLTextAreaElement
        ) ||
        !el.name
      )
        continue;
      if (
        el.required &&
        (!data[el.name] ||
          (el instanceof HTMLInputElement &&
            el.type === "checkbox" &&
            !el.checked))
      )
        e[el.name] =
          `Please enter ${fieldNames[el.name]?.toLowerCase() || el.name}.`;
      else if (!el.validity.valid) {
        e[el.name] = el.validity.typeMismatch
          ? "Enter a valid email address."
          : el.validity.patternMismatch
            ? "Use 09 followed by 9 digits, or +639 followed by 9 digits."
            : el.validity.tooShort
              ? `Use at least ${el instanceof HTMLInputElement ? el.minLength : 2} characters.`
              : el.validity.rangeUnderflow || el.validity.rangeOverflow
                ? "Enter a value within the displayed limits."
                : "Check this value and try again.";
      }
      if (
        data[el.name] &&
        el instanceof HTMLInputElement &&
        el.minLength > 0 &&
        data[el.name].length < el.minLength
      )
        e[el.name] = `Use at least ${el.minLength} characters.`;
    }
    if (page === "patients") {
      if (data.dob && (data.dob > today() || age(data.dob) > 120))
        e.dob = "Enter a birth date from the past 120 years, up to today.";
      if (
        db.patients.some(
          (p) =>
            p.id !== editing?.id &&
            p.firstName.toLowerCase() === data.firstName?.toLowerCase() &&
            p.lastName.toLowerCase() === data.lastName?.toLowerCase() &&
            p.dob === data.dob,
        )
      )
        e.firstName =
          "A patient with this name and birth date is already registered.";
    }
    if (page === "visits") {
      const p = db.patients.find((p) => p.id === data.patientId);
      if (!p) e.patientId = "Select a registered patient.";
      if (
        db.visits.some(
          (v) => v.patientId === data.patientId && v.date === data.date,
        )
      )
        e.patientId = "This patient already has an active visit for this date.";
      if (data.date !== today())
        e.date = "Walk-in visits must use today’s clinic date.";
      if (data.time && data.time > nowTime())
        e.time = "Arrival time cannot be in the future.";
      if (data.priority === "Senior" && p && age(p.dob) < 60)
        e.priority = "Senior priority requires a patient aged 60 or above.";
    }
    if (page === "search") {
      if (Number(data.minAge) > Number(data.maxAge))
        e.maxAge = "Maximum age must be at least the minimum age.";
      if (data.from && data.to && data.from > data.to)
        e.to = "End date must be on or after the start date.";
    }
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.getElementById("error-summary")?.focus(), 0);
      return;
    }
    if (page === "patients") {
      if (editing) {
        const updated = { ...editing, ...data };
        if (
          save({
            ...db,
            patients: db.patients.map((p) =>
              p.id === editing.id ? updated : p,
            ),
          })
        ) {
          setResults(
            (current) =>
              current?.map((p) => (p.id === updated.id ? updated : p)) ?? null,
          );
          setEditing(null);
          setPreview(updated);
          setNotice("Patient record updated successfully.");
        }
        return;
      }
      const id = `PT-${String(Math.max(0, ...db.patients.map((p) => Number(p.id.slice(3)))) + 1).padStart(4, "0")}`;
      if (
        save({
          ...db,
          patients: [...db.patients, { ...data, id, created: today() }],
        })
      ) {
        form.reset();
        setNotice(
          `${data.firstName} ${data.lastName} registered successfully. Patient ID: ${id}.`,
        );
      }
    } else if (page === "visits") {
      const n =
        db.visits.filter((v) => v.date === today() && v.status !== "Completed")
          .length + 1;
      const number = `Q-${String(n).padStart(3, "0")}`;
      if (
        save({
          ...db,
          visits: [
            ...db.visits,
            {
              ...data,
              id: crypto.randomUUID(),
              created: new Date().toISOString(),
              number,
            },
          ],
        })
      ) {
        form.reset();
        setNotice(`Visit saved. Queue number ${number} is waiting.`);
      }
    } else if (page === "settings") {
      if (save({ ...db, profile: data }))
        setNotice(
          "Profile and communication preferences saved. Your workspace name has been updated.",
        );
    } else {
      let found = db.patients.filter((p) => {
        const q = data.query.toLowerCase();
        return (
          (!q ||
            (data.match === "Exact ID"
              ? p.id.toLowerCase() === q
              : fullName(p).toLowerCase().includes(q) ||
                p.id.toLowerCase() === q)) &&
          (!data.sex || p.sex === data.sex) &&
          (!data.city ||
            p.city.toLowerCase().includes(data.city.toLowerCase())) &&
          age(p.dob) >= Number(data.minAge) &&
          age(p.dob) <= Number(data.maxAge) &&
          (!data.from || p.created >= data.from) &&
          (!data.to || p.created <= data.to)
        );
      });
      found.sort((a, b) =>
        data.sort === "Oldest first"
          ? a.created.localeCompare(b.created)
          : data.sort === "Name A–Z"
            ? fullName(a).localeCompare(fullName(b))
            : b.created.localeCompare(a.created),
      );
      setResultDetail(data.detail);
      setResults(found);
      setNotice(
        `${found.length} patient${found.length === 1 ? "" : "s"} found. Filters applied.`,
      );
    }
  };

  const text = (
    name: string,
    label: string,
    required = true,
    placeholder = "",
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field errors={errors} name={name} label={label} required={required}>
      <input
        type="text"
        maxLength={80}
        placeholder={placeholder}
        defaultValue={page === "patients" ? editing?.[name] : undefined}
        {...extra}
      />
    </Field>
  );
  const select = (
    name: string,
    label: string,
    options: string[],
    required = true,
    defaultValue = "",
  ) => (
    <Field errors={errors} name={name} label={label} required={required}>
      <select
        defaultValue={
          page === "patients" ? (editing?.[name] ?? defaultValue) : defaultValue
        }
      >
        <option value="">{required ? "Select an option" : "All"}</option>
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </Field>
  );
  const isFormPage = ["patients", "visits", "search", "settings"].includes(
    page,
  );
  const title = {
    ...pageNames,
    patients: "Register a patient",
    visits: "Register a walk-in visit",
    search: "Patients",
    settings: "My Account",
  }[page];
  const queue = [...db.visits]
    .filter((v) => v.date === today() && v.status !== "Completed")
    .sort(
      (a, b) =>
        ["Emergency", "Special", "Senior", "Regular"].indexOf(a.priority) -
          ["Emergency", "Special", "Senior", "Regular"].indexOf(b.priority) ||
        a.time.localeCompare(b.time) ||
        a.created.localeCompare(b.created),
    );
  const exportData = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medisystem-demo-records.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Demo records exported as JSON.");
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Sidebar role={role} page={page} navigate={navigate} />
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Clinic workspace</span>
            <ChevronRight size={14} />
            <strong>{pageNames[page]}</strong>
          </div>
          <div className="top-right">
            <span className="authenticated-identity">
              {user.name} · {roleNames[role]}
            </span>
            <button className="button secondary" onClick={onLogout}>
              Logout
            </button>
            <div className="top-divider" />
            <button className="profile" onClick={() => navigate("settings")}>
              <span className="avatar">
                {(db.profile.displayName || "Staff")
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span>
                <strong>{db.profile.displayName}</strong>
                <small>{roleNames[role]}</small>
              </span>
            </button>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <h1 tabIndex={-1}>{title}</h1>
            </div>
            <div className="page-heading-actions">
              {page === "search" && (
                <button
                  className="button primary"
                  onClick={() => navigate("patients")}
                >
                  <UserPlus size={16} />
                  Register patient
                </button>
              )}
              {page === "patients" && (
                <button
                  className="button secondary"
                  onClick={() => navigate("search")}
                >
                  <Users size={16} />
                  Patient directory
                </button>
              )}
              <span className="date-tag">
                <Clock3 size={15} />
                {new Date(today() + "T12:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          {isFormPage ? (
            <>
              <div className="content-grid">
                <section className="form-card">
                  <div className="card-heading">
                    <div>
                      <h2>
                        {page === "patients"
                          ? editing
                            ? `Edit patient ? ${editing.id}`
                            : "Patient information"
                          : page === "visits"
                            ? "Visit details"
                            : page === "search"
                              ? "Search & filters"
                              : "Staff information"}
                      </h2>
                      <p>
                        {page === "search"
                          ? "Combine filters to narrow your results."
                          : "Fields marked with * are required."}
                      </p>
                    </div>
                  </div>
                  {notice && (
                    <div className="notice" role="status">
                      <Check size={18} />
                      <span>{notice}</span>
                      <button
                        type="button"
                        onClick={() => setNotice("")}
                        aria-label="Dismiss notification"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                  <form
                    key={`${page}-${editing?.id ?? "new"}`}
                    onSubmit={submit}
                    noValidate
                    onReset={() => {
                      setErrors({});
                      setNotice("");
                      if (page === "search") {
                        setResults(null);
                        setPreview(null);
                      }
                    }}
                  >
                    {Object.keys(errors).length > 0 && (
                      <div
                        className="error-summary"
                        id="error-summary"
                        tabIndex={-1}
                        role="alert"
                      >
                        <strong>
                          Please review {Object.keys(errors).length} field
                          {Object.keys(errors).length === 1 ? "" : "s"} before
                          continuing.
                        </strong>
                        <ul>
                          {Object.entries(errors).map(([k, v]) => (
                            <li key={k}>
                              <a
                                href={"#" + k}
                                onClick={(e) => {
                                  e.preventDefault();
                                  document.getElementById(k)?.focus();
                                }}
                              >
                                {fieldNames[k] || k}: {v}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {page === "patients" && (
                      <>
                        <div className="section-title">
                          <h3>Personal details</h3>
                        </div>
                        <div className="fields">
                          {text("firstName", "First name", true, "e.g. Maria", {
                            minLength: 2,
                            autoComplete: "given-name",
                          })}
                          {text("lastName", "Last name", true, "e.g. Santos", {
                            minLength: 2,
                            autoComplete: "family-name",
                          })}
                          {text(
                            "middleName",
                            "Middle name",
                            false,
                            "e.g. Reyes",
                            {
                              autoComplete: "additional-name",
                            },
                          )}
                          <Field
                            errors={errors}
                            name="dob"
                            label="Date of birth"
                            required
                            help="Age is calculated from your clinic’s current date."
                          >
                            <input
                              type="date"
                              defaultValue={editing?.dob}
                              min={new Date(
                                new Date().getFullYear() - 120,
                                0,
                                1,
                              )
                                .toISOString()
                                .slice(0, 10)}
                              max={today()}
                            />
                          </Field>
                          {select("sex", "Sex", [
                            "Female",
                            "Male",
                            "Intersex",
                            "Prefer not to say",
                          ])}
                          {select("civil", "Civil status", [
                            "Single",
                            "Married",
                            "Widowed",
                            "Separated",
                            "Prefer not to say",
                          ])}
                        </div>
                        <div className="section-title">
                          <h3>Contact information</h3>
                        </div>
                        <div className="fields">
                          <Field
                            errors={errors}
                            name="phone"
                            label="Mobile number"
                            required
                            help="09XXXXXXXXX or +639XXXXXXXXX"
                          >
                            <input
                              type="tel"
                              defaultValue={editing?.phone}
                              placeholder="09171234567"
                              pattern={phoneRule}
                              maxLength={13}
                              autoComplete="tel"
                            />
                          </Field>
                          <Field
                            errors={errors}
                            name="email"
                            label="Email address"
                          >
                            <input
                              type="email"
                              defaultValue={editing?.email}
                              placeholder="maria@example.com"
                              maxLength={120}
                              autoComplete="email"
                            />
                          </Field>
                          {text(
                            "address",
                            "Street address",
                            true,
                            "House no., street, barangay",
                            { maxLength: 160, autoComplete: "street-address" },
                          )}
                          {text(
                            "city",
                            "City / municipality",
                            true,
                            "e.g. Quezon City",
                            { autoComplete: "address-level2" },
                          )}
                          {text(
                            "emergencyName",
                            "Emergency contact",
                            true,
                            "Full name",
                            { minLength: 2 },
                          )}
                          <Field
                            errors={errors}
                            name="emergencyPhone"
                            label="Emergency mobile"
                            required
                            help="09XXXXXXXXX or +639XXXXXXXXX"
                          >
                            <input
                              type="tel"
                              defaultValue={editing?.emergencyPhone}
                              placeholder="09181234567"
                              pattern={phoneRule}
                              maxLength={13}
                            />
                          </Field>
                        </div>
                        <div className="check-panel">
                          <input
                            id="consent"
                            name="consent"
                            type="checkbox"
                            required
                            aria-invalid={!!errors.consent}
                            aria-describedby={
                              errors.consent ? "consent-error" : undefined
                            }
                          />
                          <div>
                            <label htmlFor="consent">
                              I have checked the patient’s details.{" "}
                              <span className="required">*</span>
                            </label>
                            <p>
                              Use fictional details in this demonstration
                              workspace.
                            </p>
                            {errors.consent && (
                              <div id="consent-error" className="field-error">
                                Confirm the details before saving.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {page === "visits" && (
                      <>
                        <div className="section-title">
                          <h3>Patient & arrival</h3>
                        </div>
                        <div className="fields">
                          <Field
                            errors={errors}
                            name="patientId"
                            label="Registered patient"
                            required
                            wide
                            help="Register the patient first if they are not listed."
                          >
                            <select defaultValue="">
                              <option value="">Select a patient</option>
                              {db.patients.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.id} · {fullName(p)} · {age(p.dob)} years
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field
                            errors={errors}
                            name="date"
                            label="Visit date"
                            required
                            help="Walk-in registration is available for today only."
                          >
                            <input
                              type="date"
                              defaultValue={today()}
                              min={today()}
                              max={today()}
                            />
                          </Field>
                          <Field
                            errors={errors}
                            name="time"
                            label="Arrival time"
                            required
                            help="Clinic local time (Asia/Manila)."
                          >
                            <input type="time" defaultValue={nowTime()} />
                          </Field>
                          {select("service", "Service", [
                            "General consultation",
                            "Follow-up consultation",
                            "Laboratory request",
                            "Medical certificate",
                          ])}
                          {select(
                            "priority",
                            "Priority",
                            ["Regular", "Senior", "Special", "Emergency"],
                            true,
                            "Regular",
                          )}
                          {select("referral", "Referral source", [
                            "Walk-in",
                            "Returning patient",
                            "Doctor referral",
                            "Family / friend",
                          ])}
                          <Field
                            errors={errors}
                            name="reason"
                            label="Reason for visit"
                            required
                          >
                            <input
                              type="text"
                              minLength={5}
                              maxLength={200}
                              placeholder="Briefly describe the reason"
                            />
                          </Field>
                        </div>
                        <div className="section-title">
                          <h3>Visit preferences</h3>
                        </div>
                        <fieldset className="radio-field">
                          <legend>
                            Visit type <span className="required">*</span>
                          </legend>
                          <label>
                            <input
                              type="radio"
                              name="visitType"
                              value="First visit"
                              defaultChecked
                            />{" "}
                            First visit
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="visitType"
                              value="Follow-up"
                            />{" "}
                            Follow-up
                          </label>
                        </fieldset>
                        <label className="standalone-check">
                          <input type="checkbox" name="assistance" /> Patient
                          requests mobility assistance
                        </label>
                        <div className="fields">
                          <Field
                            errors={errors}
                            name="notes"
                            label="Arrival notes"
                            wide
                            help="Up to 500 characters. Do not enter diagnoses in this form."
                          >
                            <textarea
                              rows={3}
                              maxLength={500}
                              placeholder="Add information that will help the clinic team"
                            />
                          </Field>
                        </div>
                      </>
                    )}
                    {page === "search" && (
                      <>
                        <div className="section-title">
                          <h3>Patient lookup</h3>
                        </div>
                        <div className="fields">
                          {text(
                            "query",
                            "Patient name or ID",
                            false,
                            "e.g. Elena or PT-0001",
                          )}
                          {select(
                            "match",
                            "Match method",
                            ["Name or ID", "Exact ID"],
                            true,
                            "Name or ID",
                          )}
                          {select(
                            "sex",
                            "Sex",
                            ["Female", "Male", "Intersex", "Prefer not to say"],
                            false,
                          )}
                          {text(
                            "city",
                            "City / municipality",
                            false,
                            "e.g. Quezon City",
                          )}
                          <Field
                            errors={errors}
                            name="minAge"
                            label="Minimum age"
                            required
                            help="From 0 to 120 years."
                          >
                            <input
                              type="number"
                              min={0}
                              max={120}
                              step={1}
                              defaultValue={0}
                            />
                          </Field>
                          <Field
                            errors={errors}
                            name="maxAge"
                            label="Maximum age"
                            required
                            help="Must be at least the minimum age."
                          >
                            <input
                              type="number"
                              min={0}
                              max={120}
                              step={1}
                              defaultValue={120}
                            />
                          </Field>
                          <Field
                            errors={errors}
                            name="from"
                            label="Registered from"
                          >
                            <input type="date" max={today()} />
                          </Field>
                          <Field
                            errors={errors}
                            name="to"
                            label="Registered to"
                          >
                            <input type="date" max={today()} />
                          </Field>
                          {select(
                            "sort",
                            "Sort results",
                            ["Newest first", "Oldest first", "Name A–Z"],
                            true,
                            "Newest first",
                          )}
                          {select(
                            "detail",
                            "Result detail",
                            ["Standard", "Compact"],
                            true,
                            "Standard",
                          )}
                        </div>
                      </>
                    )}
                    {page === "settings" && (
                      <>
                        <div className="section-title">
                          <h3>About you</h3>
                        </div>
                        <div className="fields">
                          {text("firstName", "First name", true, "First name", {
                            minLength: 2,
                            defaultValue: db.profile.firstName,
                            autoComplete: "given-name",
                          })}
                          {text("lastName", "Last name", true, "Last name", {
                            minLength: 2,
                            defaultValue: db.profile.lastName,
                            autoComplete: "family-name",
                          })}
                          {text(
                            "displayName",
                            "Display name",
                            true,
                            "Name shown in the workspace",
                            {
                              minLength: 2,
                              maxLength: 40,
                              defaultValue: db.profile.displayName,
                            },
                          )}
                          {text(
                            "jobTitle",
                            "Job title",
                            true,
                            "e.g. Clinic assistant",
                            { minLength: 2, defaultValue: db.profile.jobTitle },
                          )}
                          <Field
                            errors={errors}
                            name="email"
                            label="Email address"
                            required
                          >
                            <input
                              type="email"
                              defaultValue={db.profile.email}
                              maxLength={120}
                              autoComplete="email"
                            />
                          </Field>
                          <Field
                            errors={errors}
                            name="phone"
                            label="Mobile number"
                            required
                            help="09XXXXXXXXX or +639XXXXXXXXX"
                          >
                            <input
                              type="tel"
                              defaultValue={db.profile.phone}
                              pattern={phoneRule}
                              maxLength={13}
                              autoComplete="tel"
                            />
                          </Field>
                        </div>
                        <div className="section-title">
                          <h3>Communication preferences</h3>
                        </div>
                        <div className="fields">
                          {select(
                            "language",
                            "Preferred language",
                            ["English", "Filipino"],
                            true,
                            db.profile.language,
                          )}
                          {select(
                            "contact",
                            "Preferred contact",
                            ["Email", "Phone"],
                            true,
                            db.profile.contact,
                          )}
                          {select(
                            "timezone",
                            "Display timezone",
                            ["Asia/Manila", "Asia/Singapore"],
                            true,
                            db.profile.timezone,
                          )}
                          <Field
                            errors={errors}
                            name="notes"
                            label="Profile note"
                          >
                            <textarea
                              maxLength={300}
                              rows={2}
                              defaultValue={db.profile.notes}
                              placeholder="A short note for your demo profile"
                            />
                          </Field>
                        </div>
                        <label className="standalone-check">
                          <input
                            name="notifications"
                            type="checkbox"
                            defaultChecked={db.profile.notifications === "on"}
                          />{" "}
                          Include me in the clinic’s email update preference
                          list
                        </label>
                        <p className="preference-note">
                          Preferences are saved locally. This demo does not send
                          emails or change an authenticated account.
                        </p>
                      </>
                    )}
                    {page === "patients" && editing && (
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          setErrors({});
                          setNotice("");
                        }}
                      >
                        Cancel editing
                      </button>
                    )}
                    <div className="form-footer">
                      <span>
                        <ShieldCheck size={15} />
                        {page === "search"
                          ? "Your filters stay in this session"
                          : "Saved in this browser only"}
                      </span>
                      <div>
                        <button className="button secondary" type="reset">
                          {page === "search" ? "Reset filters" : "Reset form"}
                        </button>
                        <button className="button primary" type="submit">
                          {page === "patients"
                            ? editing
                              ? "Save patient changes"
                              : "Register patient"
                            : page === "visits"
                              ? "Add to queue"
                              : page === "search"
                                ? "Search patients"
                                : "Save preferences"}
                          {page === "search" ? (
                            <Search size={17} />
                          ) : (
                            <ArrowRight size={17} />
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                  {page === "search" && results !== null && (
                    <div className="search-results">
                      <h3>
                        Results <span>{results.length}</span>
                      </h3>
                      {results.length === 0 ? (
                        <p>
                          No patients match these filters. Try a broader name or
                          age range.
                        </p>
                      ) : (
                        results.map((p) => (
                          <button
                            className="result-row"
                            key={p.id}
                            onClick={() => setPreview(p)}
                          >
                            <span className="patient-avatar">
                              {p.firstName[0]}
                              {p.lastName[0]}
                            </span>
                            <span>
                              <strong>{fullName(p)}</strong>
                              <small>
                                {p.id}
                                {resultDetail === "Standard"
                                  ? ` · ${age(p.dob)} years · ${p.city}`
                                  : ""}
                              </small>
                            </span>
                            <ChevronRight size={17} />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </section>
                <aside className="context-column">
                  <div className="context-card">
                    <div className="list-heading">
                      <h3>
                        {page === "visits"
                          ? "Today’s queue"
                          : "Recent patients"}
                      </h3>
                      <span className="count">
                        {page === "visits" ? queue.length : db.patients.length}
                      </span>
                    </div>
                    {page === "visits" ? (
                      queue.length ? (
                        queue.slice(0, 5).map((v) => (
                          <div key={v.id} className="queue-row">
                            <strong>{v.number}</strong>
                            <span>
                              {
                                db.patients.find((p) => p.id === v.patientId)
                                  ?.firstName
                              }
                              <small>
                                {v.priority} · {v.time}
                              </small>
                            </span>
                            <span className="waiting">
                              {v.status || "Waiting"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">
                          <Clock3 size={23} />
                          <p>The queue is clear.</p>
                          <small>Add a walk-in visit to get started.</small>
                        </div>
                      )
                    ) : (
                      db.patients
                        .slice(-3)
                        .reverse()
                        .map((p) => (
                          <button
                            className="patient-row"
                            onClick={() => setPreview(p)}
                            key={p.id}
                          >
                            <span className="patient-avatar">
                              {p.firstName[0]}
                              {p.lastName[0]}
                            </span>
                            <span>
                              <strong>{fullName(p)}</strong>
                              <small>
                                {p.id} · {age(p.dob)} years
                              </small>
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        ))
                    )}
                    <button
                      className="text-link"
                      onClick={() =>
                        page === "visits"
                          ? navigate("patients")
                          : navigate("search")
                      }
                    >
                      {page === "visits"
                        ? "Register a new patient"
                        : "View patient directory"}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <ModulePages
              key={`${page}-${role}`}
              page={page}
              role={role}
              patients={db.patients}
              visits={db.visits}
              queue={queue}
              navigate={navigate}
              viewPatient={setPreview}
              exportRecords={exportData}
              updateVisit={(id, status) =>
                save({
                  ...db,
                  visits: db.visits.map((v) =>
                    v.id === id ? { ...v, status } : v,
                  ),
                })
              }
            />
          )}
          <footer className="main-footer">
            <span>
              MediSystem <span>·</span> A. Bautista Medical Clinic
            </span>
          </footer>
        </main>
      </div>
      {preview && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setPreview(null);
          }}
        >
          <dialog
            ref={(node) => {
              if (node && !node.open) node.showModal();
            }}
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setPreview(null);
              }
            }}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              autoFocus
              onClick={() => {
                setPreview(null);
              }}
            >
              <X size={20} />
            </button>
            <>
              <span className="overline">PATIENT RECORD</span>
              <h2 id="dialog-title">{fullName(preview)}</h2>
              <p>
                {preview.id} · {age(preview.dob)} years · {preview.sex}
              </p>
              <button
                className="button primary"
                onClick={() => {
                  const patient = preview;
                  navigate("patients");
                  setEditing(patient);
                }}
              >
                Edit patient record
              </button>
              <dl>
                <dt>Mobile</dt>
                <dd>{preview.phone}</dd>
                <dt>Email</dt>
                <dd>{preview.email || "Not provided"}</dd>
                <dt>Address</dt>
                <dd>
                  {preview.address}, {preview.city}
                </dd>
                <dt>Emergency contact</dt>
                <dd>
                  {preview.emergencyName} · {preview.emergencyPhone}
                </dd>
                <dt>Registered</dt>
                <dd>{preview.created}</dd>
              </dl>
              <PatientDocuments
                key={preview.id}
                value={preview.documents || "[]"}
                onSave={(documents) => {
                  const updated = { ...preview, documents };
                  if (
                    !save({
                      ...db,
                      patients: db.patients.map((p) =>
                        p.id === updated.id ? updated : p,
                      ),
                    })
                  )
                    return false;
                  setPreview(updated);
                  setResults(
                    (current) =>
                      current?.map((p) =>
                        p.id === updated.id ? updated : p,
                      ) ?? null,
                  );
                  return true;
                }}
              />
            </>
          </dialog>
        </div>
      )}
    </>
  );
}
function PrototypeRoot() {
  const [user, setUser] = useState<Identity | null>(restoreSession);
  const [feedback, setFeedback] = useState("");
  const signOut = () => {
    try {
      logout();
      setUser(null);
      setFeedback("You have logged out of the prototype.");
    } catch {
      setFeedback("Unable to clear the prototype session. Please try again.");
    }
  };
  useEffect(() => {
    const refresh = () => setUser(restoreSession());
    const storage = (event: StorageEvent) => {
      if (event.key === ACCOUNT_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", storage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  if (user)
    return (
      <>
        {feedback && <p role="status">{feedback}</p>}
        <App key={user.id} user={user} onLogout={signOut} />
      </>
    );
  return (
    <main className="prototype-login">
      <p className="helper">
        Admin / Doctor demo: <strong>{DEMO_ADMIN.username}</strong> /{" "}
        <strong>{DEMO_PASSWORD}</strong>
      </p>
      {feedback && <p role="status">{feedback}</p>}
      <LoginForm
        onLogin={async (credentials) => {
          const identity = await login(
            credentials.username,
            credentials.password,
          );
          setFeedback("");
          setUser(identity);
        }}
        onForgotPassword={() =>
          setFeedback(
            "Prototype only: password recovery is unavailable and no email was sent. Ask the demo administrator for help.",
          )
        }
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PrototypeRoot />
  </React.StrictMode>,
);
