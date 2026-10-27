import { useRef, useState } from "react";
import {
  readAccounts,
  registerStaff,
  setStaffStatus,
  type AccountStatus,
} from "./prototypeAuth";

export function StaffAccounts({
  legacyStaff,
}: {
  legacyStaff: {
    id: string;
    name: string;
    email: string;
    title: string;
    status: string;
  }[];
}) {
  const [accounts, setAccounts] = useState(() => {
    try {
      return readAccounts();
    } catch {
      return [];
    }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  return (
    <div className="module-stack">
      <p className="helper">
        Local prototype accounts only. This is not secure for production. No
        invitation or email is sent.
      </p>
      {notice && (
        <div className="module-notice" role="status">
          {notice}
        </div>
      )}
      <div className="module-actions">
        <button
          className="button primary"
          aria-expanded={showAdd}
          onClick={() => setShowAdd(!showAdd)}
        >
          Add staff account
        </button>
      </div>
      {showAdd && (
        <section className="module-panel">
          <div className="module-panel-heading">
            <h2>New staff account</h2>
          </div>
          <form
            className="module-form"
            aria-busy={busy}
            onSubmit={async (e) => {
              e.preventDefault();
              if (pending.current) return;
              const form = e.currentTarget;
              const input = Object.fromEntries(new FormData(form)) as Record<
                string,
                string
              >;
              pending.current = true;
              setBusy(true);
              setNotice("");
              try {
                await registerStaff(
                  input,
                  legacyStaff.map((s) => s.email),
                );
                setAccounts(readAccounts());
                form.reset();
                setShowAdd(false);
                setNotice(
                  "Staff account created. The registered username and password can now log in.",
                );
              } catch (error) {
                setNotice(
                  error instanceof Error
                    ? error.message
                    : "Unable to save prototype account.",
                );
              } finally {
                pending.current = false;
                setBusy(false);
              }
            }}
          >
            <div className="module-form-grid">
              <label>
                Full name
                <input name="name" required maxLength={80} disabled={busy} />
              </label>
              <label>
                Username
                <input
                  name="username"
                  required
                  minLength={3}
                  maxLength={32}
                  autoComplete="off"
                  disabled={busy}
                />
              </label>
              <label>
                Email address
                <input name="email" type="email" required disabled={busy} />
              </label>
              <label>
                Job title
                <input name="title" required maxLength={80} disabled={busy} />
              </label>
              <label>
                Role
                <input value="Clinic Staff" readOnly />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={busy}
                />
              </label>
              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  disabled={busy}
                />
              </label>
            </div>
            <div className="module-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Creating account…" : "Create staff account"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="module-panel">
        <div className="module-panel-heading">
          <h2>Clinic staff</h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Job title</th>
                <th>Access</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.username}</td>
                  <td>{a.email}</td>
                  <td>{a.title}</td>
                  <td>Clinic Staff</td>
                  <td>
                    <select
                      aria-label={`Status for ${a.username}`}
                      value={a.status}
                      onChange={(e) => {
                        try {
                          setStaffStatus(a.id, e.target.value as AccountStatus);
                          setAccounts(readAccounts());
                          setNotice("Staff account status updated.");
                        } catch {
                          setNotice("Unable to update account status.");
                        }
                      }}
                    >
                      {["Active", "Locked", "Deactivated"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="inline-button"
                      onClick={() => {
                        try {
                          setStaffStatus(
                            a.id,
                            a.status === "Active" ? "Deactivated" : "Active",
                          );
                          setAccounts(readAccounts());
                          setNotice("Staff account status updated.");
                        } catch {
                          setNotice("Unable to update account status.");
                        }
                      }}
                    >
                      {a.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {legacyStaff.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>No login configured</td>
                  <td>{a.email}</td>
                  <td>{a.title}</td>
                  <td>Clinic Staff</td>
                  <td>{a.status}</td>
                  <td>Legacy preview record</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
