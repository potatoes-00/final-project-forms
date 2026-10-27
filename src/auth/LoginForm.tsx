import { useId, useRef, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import "./LoginForm.css";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginFormProps {
  /** Supply real authentication here. Reject/throw when sign-in fails. */
  onLogin: (credentials: LoginCredentials) => Promise<void> | void;
  onForgotPassword: () => void;
}

type Errors = Partial<Record<keyof LoginCredentials, string>>;

/** Presentation and validation only; this component does not authenticate users. */
export function LoginForm({ onLogin, onForgotPassword }: LoginFormProps) {
  const id = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submissionError, setSubmissionError] = useState("");
  const [processing, setProcessing] = useState(false);
  const pending = useRef(false);
  const usernameInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    const nextErrors: Errors = {};
    if (!username.trim()) nextErrors.username = "Enter your username.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    setSubmissionError("");
    if (nextErrors.username || nextErrors.password) {
      (nextErrors.username ? usernameInput : passwordInput).current?.focus();
      return;
    }
    pending.current = true;
    setProcessing(true);
    try {
      // Preserve the password exactly as entered, including spaces.
      await onLogin({ username: username.trim(), password });
    } catch {
      // Never render raw provider errors, which may contain sensitive details.
      setSubmissionError(
        "Unable to sign in. Check your username and password. Locked or deactivated accounts cannot sign in.",
      );
    } finally {
      pending.current = false;
      setProcessing(false);
    }
  };

  return (
    <section
      className="form-card login-form-card"
      aria-labelledby={`${id}-title`}
    >
      <div className="card-heading">
        <span className="heading-icon">
          <ShieldCheck size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 id={`${id}-title`}>Login to MediSystem</h2>
          <p>Clinic Management System</p>
        </div>
      </div>
      <form
        noValidate
        onSubmit={submit}
        aria-busy={processing}
        onReset={(event) => {
          event.preventDefault();
          if (pending.current) return;
          setUsername("");
          setPassword("");
          setShowPassword(false);
          setErrors({});
          setSubmissionError("");
          usernameInput.current?.focus();
        }}
      >
        <p className="helper login-stage-note" id={`${id}-help`}>
          Local prototype login. Supabase is not used.
        </p>
        <div className="login-fields">
          <div className="field">
            <label htmlFor={`${id}-username`}>
              Username{" "}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              ref={usernameInput}
              id={`${id}-username`}
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Enter your username"
              required
              disabled={processing}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={errors.username ? true : undefined}
              aria-describedby={
                errors.username ? `${id}-username-error` : undefined
              }
            />
            {errors.username && (
              <div
                className="field-error"
                id={`${id}-username-error`}
                role="alert"
              >
                {errors.username}
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor={`${id}-password`}>
              Password{" "}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              ref={passwordInput}
              id={`${id}-password`}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              disabled={processing}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? `${id}-password-error` : undefined
              }
            />
            {errors.password && (
              <div
                className="field-error"
                id={`${id}-password-error`}
                role="alert"
              >
                {errors.password}
              </div>
            )}
          </div>
        </div>
        <label className="standalone-check login-show-password">
          <input
            type="checkbox"
            checked={showPassword}
            disabled={processing}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          Show Password
        </label>
        {submissionError && (
          <p className="field-error" role="alert">
            {submissionError}
          </p>
        )}
        <div className="login-actions">
          <button
            className="text-link"
            type="button"
            disabled={processing}
            onClick={onForgotPassword}
          >
            Forgot Password
          </button>
          <div>
            <button
              className="button secondary"
              type="reset"
              disabled={processing}
            >
              Clear Fields
            </button>
            <button
              className="button primary"
              type="submit"
              disabled={processing}
              aria-describedby={`${id}-help`}
            >
              {processing ? "Processing…" : "Login"}
            </button>
          </div>
        </div>
        <span className="login-status" role="status">
          {processing ? "Processing login request." : ""}
        </span>
      </form>
    </section>
  );
}
