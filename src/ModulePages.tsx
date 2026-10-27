import { useState, type ReactNode } from "react";
import { ArrowRight, Plus, Download, Search, ShieldCheck } from "lucide-react";
import { roleNames, type Page, type Role } from "./navigation";

type RecordValues = Record<string, string>;
type Patient = RecordValues & { id: string; created: string };
type Visit = RecordValues & { id: string; created: string; number: string };
type Service = { id: string; name: string; category: string; fee: number };
type LabRequest = {
  id: string;
  patient: string;
  service: string;
  status: string;
  date: string;
};
type Payment = {
  id: string;
  patient: string;
  visit: string;
  service: string;
  total: number;
  cash: number;
  date: string;
};
type Consultation = {
  visit: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  medication: string;
  notes: string;
  status: string;
};
type Staff = {
  id: string;
  name: string;
  email: string;
  title: string;
  status: string;
};
type WorkspaceData = {
  services: Service[];
  requests: LabRequest[];
  payments: Payment[];
  consultations: Consultation[];
  staff: Staff[];
};
const MODULE_KEY = "medisystem-workspace-ui-v1";
const initial: WorkspaceData = {
  services: [
    {
      id: "SRV-001",
      name: "General consultation",
      category: "Consultation",
      fee: 500,
    },
    {
      id: "SRV-002",
      name: "Follow-up consultation",
      category: "Consultation",
      fee: 300,
    },
    {
      id: "SRV-003",
      name: "Complete blood count",
      category: "Laboratory",
      fee: 250,
    },
    { id: "SRV-004", name: "Urinalysis", category: "Laboratory", fee: 150 },
  ],
  requests: [],
  payments: [],
  consultations: [],
  staff: [
    {
      id: "STF-001",
      name: "John Doe",
      email: "staff@example.com",
      title: "Clinic assistant",
      status: "Active",
    },
  ],
};
const money = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value,
  );
const clinicDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="module-panel">
      <div className="module-panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <div className="module-empty">{children}</div>;
}
function Badge({ children }: { children: ReactNode }) {
  return <span className="status-badge">{children}</span>;
}

export function ModulePages({
  page,
  role,
  patients,
  visits,
  queue,
  navigate,
  viewPatient,
  updateVisit,
  exportRecords,
}: {
  page: Page;
  role: Role;
  patients: Patient[];
  visits: Visit[];
  queue: Visit[];
  navigate: (page: Page) => void;
  viewPatient: (patient: Patient) => void;
  updateVisit: (id: string, status: string) => boolean;
  exportRecords: () => void;
}) {
  const [data, setData] = useState<WorkspaceData>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODULE_KEY) || "null");
      if (
        saved &&
        ["services", "requests", "payments", "consultations", "staff"].every(
          (key) => Array.isArray(saved[key]),
        )
      ) {
        saved.staff = saved.staff.map((staff: Staff) =>
          staff.id === "STF-001" &&
          ["Alex Morgan", "Jogn Doe"].includes(staff.name)
            ? { ...staff, name: "John Doe" }
            : staff,
        );
        return saved;
      }
    } catch {
      /* Use sample records if local storage is unavailable. */
    }
    return structuredClone(initial);
  });
  const [notice, setNotice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState("requests");
  const [query, setQuery] = useState("");
  const [selectedVisit, setSelectedVisit] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [cash, setCash] = useState("");
  const [report, setReport] = useState("patients");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(clinicDate());
  const [generated, setGenerated] = useState(false);
  const patientName = (id: string) => {
    const p = patients.find((patient) => patient.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "Unknown patient";
  };
  const commit = (next: WorkspaceData, message: string) => {
    try {
      localStorage.setItem(MODULE_KEY, JSON.stringify(next));
      setData(next);
      setNotice(message);
      return true;
    } catch {
      setNotice("Unable to save. Browser storage may be full or disabled.");
      return false;
    }
  };
  const values = (form: HTMLFormElement) =>
    Object.fromEntries(new FormData(form)) as RecordValues;
  const feedback = notice ? (
    <div className="module-notice" role="status">
      {notice}
    </div>
  ) : null;
  const rangeValid = !from || !to || from <= to;
  const inRange = (date: string) =>
    (!from || date >= from) && (!to || date <= to);

  if (page === "dashboard") {
    const metrics = [
      {
        label: "Registered patients",
        value: patients.length,
        target: "search",
      },
      {
        label: "Waiting today",
        value: queue.filter((v) => v.status !== "In Consultation").length,
        target: "visits",
      },
      {
        label: "Open lab requests",
        value: data.requests.filter((r) =>
          ["Requested", "Pending"].includes(r.status),
        ).length,
        target: "services",
      },
      {
        label: "Payments today",
        value: data.payments.filter((p) => p.date === clinicDate()).length,
        target: "billing",
      },
    ] as const;
    return (
      <div className="module-stack">
        <div className="dashboard-metrics">
          {metrics.map(({ label, value, target }) => (
            <button
              key={label}
              className="metric-card"
              onClick={() => navigate(target)}
            >
              <span>
                <small>{label}</small>
                <strong>{String(value).padStart(2, "0")}</strong>
              </span>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
        <div className="module-actions">
          <button
            className="button primary"
            onClick={() => navigate("patients")}
          >
            <Plus size={16} />
            Register patient
          </button>
          <button
            className="button secondary"
            onClick={() => navigate("visits")}
          >
            <Plus size={16} />
            Register walk-in visit
          </button>
        </div>
        <div className="dashboard-columns">
          <Panel
            title="Today's queue"
            action={
              <button className="text-link" onClick={() => navigate("visits")}>
                View queue <ArrowRight size={15} />
              </button>
            }
          >
            {queue.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Queue</th>
                      <th>Patient</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((v) => (
                      <tr key={v.id}>
                        <td>{v.number}</td>
                        <td>{patientName(v.patientId)}</td>
                        <td>{v.priority}</td>
                        <td>
                          <Badge>{v.status || "Waiting"}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                No patients are waiting. Register a walk-in visit to add to the
                queue.
              </Empty>
            )}
          </Panel>
          <Panel title="Recent patients">
            {patients
              .slice(-5)
              .reverse()
              .map((p) => (
                <button
                  className="dashboard-patient"
                  key={p.id}
                  onClick={() => viewPatient(p)}
                >
                  <span className="patient-avatar">
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </span>
                  <span>
                    <strong>
                      {p.firstName} {p.lastName}
                    </strong>
                    <small>{p.id}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
          </Panel>
        </div>
        {role === "admin" && (
          <Panel title="Today's collections">
            <div className="collection-total">
              {money(
                data.payments
                  .filter((p) => p.date === clinicDate())
                  .reduce((sum, p) => sum + p.total, 0),
              )}
              <span>Cash payments recorded today</span>
            </div>
          </Panel>
        )}
      </div>
    );
  }
  if (page === "services")
    return (
      <div className="module-stack">
        {feedback}
        <div className="module-toolbar">
          <div
            className="module-tabs"
            aria-label="Services and laboratory views"
          >
            <button
              aria-pressed={tab === "requests"}
              onClick={() => {
                setTab("requests");
                setShowAdd(false);
              }}
            >
              Laboratory requests
            </button>
            <button
              aria-pressed={tab === "catalog"}
              onClick={() => {
                setTab("catalog");
                setShowAdd(false);
              }}
            >
              Service catalog
            </button>
          </div>
          {(tab === "requests" || role === "admin") && (
            <button
              className="button primary"
              aria-expanded={showAdd}
              onClick={() => setShowAdd(!showAdd)}
            >
              <Plus size={16} />
              {tab === "requests" ? "New lab request" : "Add service"}
            </button>
          )}
        </div>
        {showAdd && (
          <Panel
            title={
              tab === "requests"
                ? "New laboratory request"
                : "Add clinic service"
            }
          >
            <form
              className="module-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const v = values(form);
                if (tab === "requests") {
                  if (
                    !patients.some((p) => p.id === v.patient) ||
                    !data.services.some(
                      (s) => s.id === v.service && s.category === "Laboratory",
                    )
                  )
                    return;
                  if (
                    commit(
                      {
                        ...data,
                        requests: [
                          ...data.requests,
                          {
                            id: `LAB-${String(data.requests.length + 1).padStart(3, "0")}`,
                            patient: v.patient,
                            service: v.service,
                            status: "Requested",
                            date: clinicDate(),
                          },
                        ],
                      },
                      "Laboratory request saved.",
                    )
                  )
                    setShowAdd(false);
                } else if (role === "admin") {
                  if (!v.name.trim()) {
                    setNotice("Enter a service name.");
                    return;
                  }
                  if (
                    data.services.some(
                      (s) =>
                        s.name.toLowerCase() === v.name.trim().toLowerCase(),
                    )
                  ) {
                    setNotice("This service already exists.");
                    return;
                  }
                  if (
                    commit(
                      {
                        ...data,
                        services: [
                          ...data.services,
                          {
                            id: `SRV-${String(data.services.length + 1).padStart(3, "0")}`,
                            name: v.name.trim(),
                            category: v.category,
                            fee: Number(v.fee),
                          },
                        ],
                      },
                      "Clinic service added.",
                    )
                  )
                    setShowAdd(false);
                }
              }}
            >
              <div className="module-form-grid">
                {tab === "requests" ? (
                  <>
                    <label>
                      Patient
                      <select name="patient" required defaultValue="">
                        <option value="">Select a patient</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {patientName(p.id)} · {p.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Laboratory service
                      <select name="service" required defaultValue="">
                        <option value="">Select a service</option>
                        {data.services
                          .filter((s) => s.category === "Laboratory")
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Service name
                      <input name="name" required maxLength={100} />
                    </label>
                    <label>
                      Category
                      <select name="category">
                        <option>Consultation</option>
                        <option>Laboratory</option>
                        <option>Other service</option>
                      </select>
                    </label>
                    <label>
                      Fee (PHP)
                      <input
                        name="fee"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                      />
                    </label>
                  </>
                )}
              </div>
              <div className="module-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button className="button primary">
                  {tab === "requests" ? "Save request" : "Save service"}
                </button>
              </div>
            </form>
          </Panel>
        )}
        <Panel
          title={tab === "requests" ? "Laboratory requests" : "Clinic services"}
        >
          {tab === "catalog" ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Service ID</th>
                    <th>Service</th>
                    <th>Category</th>
                    <th className="numeric">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {data.services.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.name}</td>
                      <td>{s.category}</td>
                      <td className="numeric">{money(s.fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <div className="module-filter">
                <Search size={17} />
                <input
                  aria-label="Search laboratory requests"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search request ID, patient, or service"
                />
              </div>
              {data.requests.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Request</th>
                        <th>Patient</th>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.requests
                        .filter((r) =>
                          `${r.id} ${patientName(r.patient)} ${data.services.find((s) => s.id === r.service)?.name}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((r) => (
                          <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{patientName(r.patient)}</td>
                            <td>
                              {
                                data.services.find((s) => s.id === r.service)
                                  ?.name
                              }
                            </td>
                            <td>{r.date}</td>
                            <td>
                              <select
                                aria-label={`Status for ${r.id}`}
                                value={r.status}
                                onChange={(e) =>
                                  commit(
                                    {
                                      ...data,
                                      requests: data.requests.map((item) =>
                                        item.id === r.id
                                          ? { ...item, status: e.target.value }
                                          : item,
                                      ),
                                    },
                                    "Request status updated.",
                                  )
                                }
                              >
                                {[
                                  "Requested",
                                  "Pending",
                                  "Completed",
                                  "Cancelled",
                                ].map((status) => (
                                  <option key={status}>{status}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty>No laboratory requests yet.</Empty>
              )}
            </>
          )}
        </Panel>
      </div>
    );
  if (page === "consultations" && role === "admin") {
    const consultation = data.consultations.find(
      (c) => c.visit === selectedVisit,
    );
    const visit = visits.find((v) => v.id === selectedVisit);
    return (
      <div className="module-stack">
        {feedback}
        <Panel title="Consultation workspace">
          <div className="module-form">
            <label>
              Patient visit
              <select
                value={selectedVisit}
                onChange={(e) => {
                  setSelectedVisit(e.target.value);
                  setNotice("");
                }}
              >
                <option value="">Select a registered visit</option>
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {patientName(v.patientId)} · {v.number} · {v.date}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {visit ? (
            <form
              key={selectedVisit}
              className="module-form"
              onSubmit={(e) => {
                e.preventDefault();
                const v = values(e.currentTarget);
                const status =
                  (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                    "value",
                  ) || "Draft";
                const entry: Consultation = {
                  visit: selectedVisit,
                  complaint: v.complaint.trim(),
                  diagnosis: v.diagnosis.trim(),
                  treatment: v.treatment.trim(),
                  medication: v.medication.trim(),
                  notes: v.notes.trim(),
                  status,
                };
                if (
                  status === "Completed" &&
                  [entry.complaint, entry.diagnosis, entry.treatment].some(
                    (value) => !value,
                  )
                ) {
                  setNotice(
                    "Enter the complaint, diagnosis, and treatment before completing the consultation.",
                  );
                  return;
                }
                if (
                  commit(
                    {
                      ...data,
                      consultations: [
                        ...data.consultations.filter(
                          (c) => c.visit !== selectedVisit,
                        ),
                        entry,
                      ],
                    },
                    status === "Completed"
                      ? "Consultation completed."
                      : "Consultation draft saved.",
                  )
                )
                  updateVisit(
                    selectedVisit,
                    status === "Completed" ? "Completed" : "In Consultation",
                  );
              }}
            >
              <div className="module-form-grid">
                <label>
                  Chief complaint
                  <textarea
                    name="complaint"
                    defaultValue={consultation?.complaint || visit.reason}
                    maxLength={1000}
                  />
                </label>
                <label>
                  Diagnosis
                  <textarea
                    name="diagnosis"
                    defaultValue={consultation?.diagnosis}
                    maxLength={1000}
                  />
                </label>
                <label>
                  Treatment details
                  <textarea
                    name="treatment"
                    defaultValue={consultation?.treatment}
                    maxLength={1000}
                  />
                </label>
                <label>
                  Prescribed medications
                  <textarea
                    name="medication"
                    defaultValue={consultation?.medication}
                    maxLength={1000}
                  />
                </label>
                <label className="wide">
                  Doctor's notes
                  <textarea
                    name="notes"
                    defaultValue={consultation?.notes}
                    maxLength={2000}
                  />
                </label>
              </div>
              <div className="module-actions">
                <button className="button secondary" value="Draft">
                  Save draft
                </button>
                <button className="button primary" value="Completed">
                  Complete consultation
                </button>
              </div>
            </form>
          ) : (
            <Empty>
              Select a patient visit to record or review a consultation.
            </Empty>
          )}
        </Panel>
        <Panel title="Consultation records">
          {data.consultations.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Visit</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.consultations.map((c) => {
                    const v = visits.find((v) => v.id === c.visit);
                    return (
                      <tr key={c.visit}>
                        <td>
                          {v ? patientName(v.patientId) : "Unknown patient"}
                        </td>
                        <td>{v?.number}</td>
                        <td>
                          <Badge>{c.status}</Badge>
                        </td>
                        <td>
                          <button
                            className="inline-button"
                            onClick={() => setSelectedVisit(c.visit)}
                          >
                            Open record
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No consultation records yet.</Empty>
          )}
        </Panel>
      </div>
    );
  }
  if (page === "billing") {
    const service = data.services.find((s) => s.id === selectedService);
    const unpaid = visits.filter(
      (v) => !data.payments.some((p) => p.visit === v.id),
    );
    return (
      <div className="module-stack">
        {feedback}
        <Panel title="Cash payment">
          <form
            className="module-form"
            onSubmit={(e) => {
              e.preventDefault();
              const visit = unpaid.find((v) => v.id === selectedVisit);
              if (!visit || !service) {
                setNotice("Select an unpaid visit and a service.");
                return;
              }
              if (!cash || Number(cash) < service.fee) {
                setNotice("Cash received must cover the total amount.");
                return;
              }
              if (
                commit(
                  {
                    ...data,
                    payments: [
                      ...data.payments,
                      {
                        id: `PAY-${String(data.payments.length + 1).padStart(3, "0")}`,
                        patient: visit.patientId,
                        visit: visit.id,
                        service: service.name,
                        total: service.fee,
                        cash: Number(cash),
                        date: clinicDate(),
                      },
                    ],
                  },
                  "Cash payment recorded. Transaction marked as paid.",
                )
              ) {
                setSelectedVisit("");
                setSelectedService("");
                setCash("");
              }
            }}
          >
            <div className="module-form-grid">
              <label>
                Patient visit
                <select
                  required
                  value={selectedVisit}
                  onChange={(e) => setSelectedVisit(e.target.value)}
                >
                  <option value="">Select an unpaid visit</option>
                  {unpaid.map((v) => (
                    <option key={v.id} value={v.id}>
                      {patientName(v.patientId)} · {v.number}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Service / charge
                <select
                  required
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  <option value="">Select a service</option>
                  {data.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {money(s.fee)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cash received (PHP)
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                />
              </label>
            </div>
            <div className="payment-summary">
              <span>
                Total amount<strong>{money(service?.fee || 0)}</strong>
              </span>
              <span>
                Change
                <strong>
                  {money(
                    service && Number(cash) >= service.fee
                      ? Number(cash) - service.fee
                      : 0,
                  )}
                </strong>
              </span>
            </div>
            <button className="button primary">Confirm cash payment</button>
          </form>
        </Panel>
        <Panel title="Payment transactions">
          {data.payments.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Patient</th>
                    <th>Service</th>
                    <th className="numeric">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{patientName(p.patient)}</td>
                      <td>{p.service}</td>
                      <td className="numeric">{money(p.total)}</td>
                      <td>
                        <Badge>Paid</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No payments recorded.</Empty>
          )}
        </Panel>
      </div>
    );
  }
  if (page === "reports") {
    const rows: { id: string; name: string; date: string; detail: string }[] =
      report === "patients"
        ? patients
            .filter((p) => inRange(p.created))
            .map((p) => ({
              id: p.id,
              name: patientName(p.id),
              date: p.created,
              detail: p.city,
            }))
        : report === "visits"
          ? visits
              .filter((v) => inRange(v.date))
              .map((v) => ({
                id: v.number,
                name: patientName(v.patientId),
                date: v.date,
                detail: v.status || "Waiting",
              }))
          : role === "admin"
            ? data.payments
                .filter((p) => inRange(p.date))
                .map((p) => ({
                  id: p.id,
                  name: patientName(p.patient),
                  date: p.date,
                  detail: money(p.total),
                }))
            : [];
    return (
      <div className="module-stack">
        <Panel title="Generate report">
          <form
            className="module-form"
            onSubmit={(e) => {
              e.preventDefault();
              setGenerated(rangeValid);
            }}
          >
            <div className="module-form-grid">
              <label>
                Report type
                <select
                  value={report}
                  onChange={(e) => {
                    setReport(e.target.value);
                    setGenerated(false);
                  }}
                >
                  <option value="patients">Patient registrations</option>
                  <option value="visits">Patient visits</option>
                  {role === "admin" && (
                    <option value="revenue">Billing & revenue</option>
                  )}
                </select>
              </label>
              <label>
                From
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setGenerated(false);
                  }}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setGenerated(false);
                  }}
                />
              </label>
            </div>
            {!rangeValid && (
              <p role="alert">End date must be on or after the start date.</p>
            )}
            <button className="button primary">Generate report</button>
          </form>
        </Panel>
        {generated && (
          <Panel
            title={`Report results · ${rows.length} records`}
            action={
              <button
                className="button secondary"
                onClick={() => window.print()}
              >
                <Download size={15} />
                Print / Save PDF
              </button>
            }
          >
            <div className="report-summary">
              <strong>
                {report === "revenue"
                  ? money(
                      data.payments
                        .filter((p) => inRange(p.date))
                        .reduce((sum, p) => sum + p.total, 0),
                    )
                  : rows.length}
              </strong>
              <span>
                {report === "revenue"
                  ? "Total cash collections"
                  : "Matching records"}
              </span>
            </div>
            {rows.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Patient</th>
                      <th>Date</th>
                      <th
                        className={report === "revenue" ? "numeric" : undefined}
                      >
                        {report === "revenue"
                          ? "Amount"
                          : report === "visits"
                            ? "Status"
                            : "City"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.name}</td>
                        <td>{row.date}</td>
                        <td
                          className={
                            report === "revenue" ? "numeric" : undefined
                          }
                        >
                          {row.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No records match the selected dates.</Empty>
            )}
          </Panel>
        )}
      </div>
    );
  }
  if (page === "staff" && role === "admin")
    return (
      <div className="module-stack">
        {feedback}
        <div className="module-actions">
          <button
            className="button primary"
            onClick={() => setShowAdd(!showAdd)}
            aria-expanded={showAdd}
          >
            <Plus size={16} />
            Add staff account
          </button>
        </div>
        {showAdd && (
          <Panel title="New staff account">
            <form
              className="module-form"
              onSubmit={(e) => {
                e.preventDefault();
                const v = values(e.currentTarget);
                if (!v.name.trim() || !v.title.trim()) {
                  setNotice("Enter a name and job title.");
                  return;
                }
                if (
                  data.staff.some(
                    (s) =>
                      s.email.toLowerCase() === v.email.trim().toLowerCase(),
                  )
                ) {
                  setNotice("An account with this email already exists.");
                  return;
                }
                if (
                  commit(
                    {
                      ...data,
                      staff: [
                        ...data.staff,
                        {
                          id: `STF-${String(data.staff.length + 1).padStart(3, "0")}`,
                          name: v.name.trim(),
                          email: v.email.trim(),
                          title: v.title.trim(),
                          status: "Active",
                        },
                      ],
                    },
                    "Staff account added to the UI preview. No sign-in invitation was sent.",
                  )
                )
                  setShowAdd(false);
              }}
            >
              <div className="module-form-grid">
                <label>
                  Full name
                  <input name="name" required maxLength={80} />
                </label>
                <label>
                  Email address
                  <input name="email" type="email" required />
                </label>
                <label>
                  Job title
                  <input name="title" required maxLength={80} />
                </label>
                <label>
                  Access level
                  <input value="Clinic Staff" readOnly />
                </label>
              </div>
              <div className="module-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button className="button primary">Create staff account</button>
              </div>
            </form>
          </Panel>
        )}
        <Panel title="Clinic staff">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Job title</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.name}
                      <small className="table-secondary">{s.id}</small>
                    </td>
                    <td>{s.email}</td>
                    <td>{s.title}</td>
                    <td>Clinic Staff</td>
                    <td>
                      <Badge>{s.status}</Badge>
                    </td>
                    <td>
                      <button
                        className="inline-button"
                        onClick={() =>
                          commit(
                            {
                              ...data,
                              staff: data.staff.map((item) =>
                                item.id === s.id
                                  ? {
                                      ...item,
                                      status:
                                        s.status === "Active"
                                          ? "Inactive"
                                          : "Active",
                                    }
                                  : item,
                              ),
                            },
                            "Staff account status updated in the UI preview.",
                          )
                        }
                      >
                        {s.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    );
  if (page === "maintenance" && role === "admin")
    return (
      <div className="module-stack">
        {feedback}
        <Panel title="Clinic settings">
          <form
            className="module-form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                localStorage.setItem(
                  "medisystem-clinic-settings-v1",
                  JSON.stringify(values(e.currentTarget)),
                );
                setNotice("Clinic settings saved for this browser.");
              } catch {
                setNotice("Unable to save clinic settings.");
              }
            }}
          >
            <ClinicSettingsFields />
            <button className="button primary">Save clinic settings</button>
          </form>
        </Panel>
        <Panel title="Workspace status">
          <dl className="settings-list">
            <div>
              <dt>Record storage</dt>
              <dd>This browser</dd>
            </div>
            <div>
              <dt>Patient records</dt>
              <dd>{patients.length}</dd>
            </div>
            <div>
              <dt>Visit records</dt>
              <dd>{visits.length}</dd>
            </div>
            <div>
              <dt>Access levels</dt>
              <dd>Admin / Doctor, Clinic Staff</dd>
            </div>
          </dl>
        </Panel>
      </div>
    );
  if (page === "backup" && role === "admin")
    return (
      <div className="module-stack">
        {feedback}
        <Panel title="Export records">
          <div className="module-body">
            <p>Download a copy of the records stored in this browser.</p>
            <div className="module-actions">
              <button className="button primary" onClick={exportRecords}>
                <Download size={16} />
                Export patient & visit records
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  download("medisystem-workspace-records.json", data);
                  setNotice(
                    "Services, requests, payments, consultation records, and staff preview records exported.",
                  );
                }}
              >
                <Download size={16} />
                Export workspace records
              </button>
            </div>
          </div>
        </Panel>
        <Panel title="Restore workspace records">
          <form
            className="module-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const file = (
                e.currentTarget.elements.namedItem("backup") as HTMLInputElement
              ).files?.[0];
              if (!file) return;
              try {
                const candidate = JSON.parse(await file.text());
                if (!validWorkspace(candidate, patients, visits)) {
                  setNotice(
                    "Select a valid workspace export with matching patient and visit records.",
                  );
                  return;
                }
                commit(candidate, "Workspace records restored.");
              } catch {
                setNotice(
                  "This file could not be read. Select a valid JSON workspace export.",
                );
              }
            }}
          >
            <label>
              Workspace backup file
              <input
                type="file"
                name="backup"
                required
                accept=".json,application/json"
              />
            </label>
            <label className="restore-confirm">
              <input type="checkbox" required />
              Replace the current workspace records with this file.
            </label>
            <button className="button primary">
              Restore workspace records
            </button>
          </form>
        </Panel>
      </div>
    );
  if (page === "help")
    return (
      <Panel title="Help & Guide">
        <div className="help-topics">
          {[
            [
              "Patients",
              "Open Patients to search by name or patient ID. Choose Register patient to create a record. Required fields and duplicate checks are shown before saving.",
            ],
            [
              "Queue & Visits",
              "Register a walk-in visit for an existing patient. Queue priority is Emergency, Special, Senior, then Regular. Arrival time breaks ties. Senior priority requires age 60 or above.",
            ],
            ...(role === "admin"
              ? [
                  [
                    "Consultations",
                    "Select a patient visit, record the complaint, diagnosis, treatment, medications, and notes. Save a draft to continue later, or complete the consultation.",
                  ],
                ]
              : []),
            [
              "Services & Lab",
              "View clinic services and fees, create laboratory requests, and update request statuses. Adding clinic services is available to Admin / Doctor.",
            ],
            [
              "Billing",
              "Select an unpaid visit and a service, enter the cash received, and review the total and change before confirming payment.",
            ],
            [
              "Reports",
              "Choose a report type and date range, then generate the report. Use Print / Save PDF to download through your browser. Billing and revenue reports are available to Admin / Doctor.",
            ],
            [
              "My Account",
              "Update your profile and preferences. This UI preview stores records in this browser; it does not authenticate accounts or send emails.",
            ],
          ].map(([heading, text]) => (
            <details key={heading}>
              <summary>{heading}</summary>
              <p>{text}</p>
            </details>
          ))}
          <div className="help-access">
            <ShieldCheck size={19} />
            <span>
              Current view: <strong>{roleNames[role]}</strong>. Use the role
              preview selector to inspect either interface.
            </span>
          </div>
        </div>
      </Panel>
    );
  return null;
}

function ClinicSettingsFields() {
  const [settings] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem("medisystem-clinic-settings-v1") || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  });
  return (
    <div className="module-form-grid">
      <label>
        Clinic name
        <input
          name="clinicName"
          required
          defaultValue={settings.clinicName || "A. Bautista Medical Clinic"}
          maxLength={100}
        />
      </label>
      <label>
        Contact number
        <input
          name="clinicPhone"
          type="tel"
          defaultValue={settings.clinicPhone || ""}
          maxLength={20}
        />
      </label>
      <label>
        Opening time
        <input
          name="opening"
          type="time"
          required
          defaultValue={settings.opening || "08:00"}
        />
      </label>
      <label>
        Closing time
        <input
          name="closing"
          type="time"
          required
          defaultValue={settings.closing || "17:00"}
        />
      </label>
    </div>
  );
}

function validWorkspace(
  value: unknown,
  patients: Patient[],
  visits: Visit[],
): value is WorkspaceData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const fields = {
    services: ["id", "name", "category"],
    requests: ["id", "patient", "service", "status", "date"],
    payments: ["id", "patient", "visit", "service", "date"],
    consultations: [
      "visit",
      "complaint",
      "diagnosis",
      "treatment",
      "medication",
      "notes",
      "status",
    ],
    staff: ["id", "name", "email", "title", "status"],
  };
  for (const [key, names] of Object.entries(fields)) {
    const entries = v[key];
    if (
      !Array.isArray(entries) ||
      entries.some(
        (item) =>
          !item ||
          typeof item !== "object" ||
          names.some((name) => typeof item[name] !== "string"),
      )
    )
      return false;
    const ids = entries.map((item) => item.id || item.visit);
    if (new Set(ids).size !== ids.length) return false;
  }
  const data = value as WorkspaceData;
  return (
    data.services.every((s) => Number.isFinite(s.fee) && s.fee >= 0) &&
    data.requests.every(
      (r) =>
        patients.some((p) => p.id === r.patient) &&
        data.services.some((s) => s.id === r.service) &&
        ["Requested", "Pending", "Completed", "Cancelled"].includes(r.status),
    ) &&
    data.payments.every(
      (p) =>
        visits.some((v) => v.id === p.visit && v.patientId === p.patient) &&
        Number.isFinite(p.total) &&
        p.total >= 0 &&
        Number.isFinite(p.cash) &&
        p.cash >= p.total,
    ) &&
    data.consultations.every(
      (c) =>
        visits.some((v) => v.id === c.visit) &&
        ["Draft", "Completed"].includes(c.status),
    ) &&
    data.staff.every((s) => ["Active", "Inactive"].includes(s.status))
  );
}
