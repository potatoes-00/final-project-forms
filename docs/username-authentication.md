# Username authentication proposal — draft, not deployed

Local-testing update: the reviewed schema is now copied into the tracked migration
`supabase/migrations/20261027000100_create_accounts.sql`, with pgTAP tests in
`supabase/tests/accounts.test.sql`. Nothing is applied. See
[local-account-testing.md](local-account-testing.md) for tooling, execution steps,
current limitations and plan availability. Do not apply both draft and migration;
the tracked migration is the source for future application. Historical draft-only
instructions below describe the earlier review stage and do not authorize db push.
The hosted Password Verification Attempt hook requires Teams or Enterprise;
status-aware RLS remains mandatory regardless of plan.

## Scope and existing integration points

`src/auth/LoginForm.tsx` accepts `onLogin({ username, password })` and
`onForgotPassword()`. It prevents duplicate submissions and never trims passwords.
`src/lib/supabase.ts` creates the browser client using a publishable key.
Neither file needs changes in this stage. Existing clinic forms, local storage,
navigation, and role preview remain untouched. The dashboard is NOT protected yet.

The SQL draft is `supabase/drafts/accounts.sql`, deliberately outside the automatic
migrations directory. It creates no users and must not be applied without review.
No database schema, policies, Auth provider settings, or email delivery settings in
the hosted project have been inspected or verified.

## Account model and normalization

`accounts.user_id` is both the primary key and a foreign key to `auth.users.id`.
Passwords and registered emails remain managed by Supabase Auth. Roles and status
come exclusively from this server-managed table, never user-editable metadata.

Normalize usernames by removing ASCII spaces from the beginning/end and converting
ASCII A-Z to a-z. Accept only 3-32 ASCII characters: first character a letter/digit,
remaining characters letters/digits/dot/underscore/hyphen. Reject internal spaces,
tabs, newlines, Unicode lookalikes, and email syntax. SQL uses the C collation;
the function must implement this exact rule, regardless of frontend trimming.
Compatibility correction for later integration: LoginForm currently calls the
broader JavaScript trim() before its callback. Replace that with the agreed ASCII
space normalization when wiring real authentication; otherwise tabs/newlines at
the edges are accepted in the UI but rejected when sent directly to the endpoint.
Do not modify the component during this database-only review.
The database rejects noncanonical stored values. A unique lowercase index prevents
case variants from becoming separate accounts. Display names may contain Unicode.

Default account status is deactivated, with no default role. Activation is explicit.
Authenticated users can SELECT only their own five account columns, including
status so they can be denied gracefully. Anonymous users cannot read any account.
No ordinary user, including an application admin, can INSERT/UPDATE/DELETE accounts.
The service role is used only in trusted administrative code, never in React.
RLS is enabled; table grants AND policies are needed. No public username RPC exists.

## Proposed Edge Function structure (not executable implementation)

```text
supabase/functions/username-login/
  index.ts             HTTP handler and response contract
  validation.ts        request limits and canonical username validation
  authenticate.ts      private lookup, Auth sign-in, post-auth status check
  rate-limit.ts        shared atomic limiter, not process-local counters
  response.ts          generic failures, CORS, no-store, safe request IDs
supabase/functions/username-login/deno.json
supabase/config.toml   later: public login endpoint configuration
```

The endpoint must accept unauthenticated callers. Configure `verify_jwt = false`
for THIS login function only when implementing/deploying it. A publishable key is
not proof of user identity. Do not disable JWT verification on administrative
functions. Exact function configuration and dependencies need validation with the
installed CLI/runtime in the next stage.

### Request and response

POST JSON `{ username: string, password: string }` over HTTPS. Reject unsupported
methods, invalid JSON, incorrect types, empty values, invalid username syntax,
and excessive body/field sizes before database access. Proposed limits: 8 KiB
request body and 1024 UTF-8 bytes for the password (align with project Auth policy
before implementation). Never trim, lowercase, hash locally, or log the password.

Success: `{ access_token: string, refresh_token: string }` only. Do not serialize
the Auth user object or return registered email, account lookup results, or service
credentials. Authentication failures: identical HTTP 401 and
`{ error: "Unable to sign in. Check your details and try again." }` for wrong
password, missing username, missing profile, locked/deactivated or banned account.
Malformed requests may use a generic 400. Rate limits use a generic 429 with
Retry-After; service failures use a generic 503. All responses: Cache-Control:
no-store. Exact-origin CORS for approved web clients; no wildcard origins.
CORS is not access control and does not prevent nonbrowser abuse.

### Server-side flow

1. Validate method, allowed origin, bounded JSON and field formats.
2. Before account lookup, atomically rate-limit by trusted client IP and separately
   by an HMAC of the canonical username. Count nonexistent usernames too. Use a
   shared store with expiry, global limits and concurrency controls. Proposed
   starting limits: 20/IP/minute and 5/username/5 minutes, tuned in staging.
   Never trust arbitrary X-Forwarded-For input; verify gateway IP semantics first.
   Fail closed with 503 when the limiter fails. Do not permanently lock accounts
   merely because unauthenticated requests exceeded a threshold (denial-of-service).
3. Use a server-only privileged client to find account by canonical username.
   Resolve its current registered email through auth.admin.getUserById(user_id).
   Do not copy email mappings into a public table or accept email supplied by caller.
4. Use a separate request-scoped publishable-key Auth client with persistSession,
   autoRefreshToken and detectSessionInUrl disabled. Authenticate using
   auth.signInWithPassword({ email, password }). Never share session state between
   requests or let user sign-in replace the privileged client's authorization.
5. For nonexistent or disabled accounts, use the same external failure contract
   and a bounded, measured minimum failure duration/jitter. Never send a submitted
   password to a fabricated or unrelated account: a supposedly nonexistent sink
   identifier may later become real and would distort Auth abuse counters.
   Do not claim constant-time behavior: remote Auth latency differs; measure and
   test distributions, combine with throttling and abuse monitoring, and bound
   concurrency. Generic messages alone do not eliminate timing enumeration.
6. After successful verification, verify returned user ID equals account.user_id;
   re-read authoritative role/status and require a recognized role and active
   status. Never return tokens for a disabled/missing profile. Revoke/discard any
   newly created session on denial using the appropriate server-side session
   operation. Check error results; do not report success on database failures.
7. Return only the caller's real access/refresh tokens. These are sensitive user
   credentials, not privileged project keys; never log or cache them.

### Establishing the browser session (future integration)

The future onLogin callback invokes username-login and, on success, calls:

```ts
const { error } = await supabase.auth.setSession({
  access_token: result.access_token,
  refresh_token: result.refresh_token,
});
if (error) throw new Error("Unable to establish session");
```

Then query the signed-in user's own account and require active status and a valid
role before mounting the clinic. Never use a returned role field, sessionStorage,
or user_metadata as the authority. On missing/failed account checks, deny access
and sign out. Listen for session changes; handle expiry/logout/recovery and clear
in-memory sensitive UI state. Do not hand-roll extra token copies in storage.
The standard browser client persists sessions by default; XSS prevention remains
important. Browser tokens inherently identify the user and can contain their own
email claim; the promise is no public username-to-email directory, not hiding a
signed-in user's own identity from that user.

## Status enforcement and direct Auth bypass

The public Supabase email/password API and token refresh remain reachable directly.
The username function alone cannot enforce application account status. Future
protected APIs and EVERY protected database policy must require a current active
account, plus the relevant role. Read current table state rather than relying only
on possibly stale JWT claims. Account-management policies must not recursively
query accounts; any shared permission helper requires a carefully restricted
security-definer function with a fixed search_path and reviewed EXECUTE grants.
Such helpers and clinic policies are NOT in this draft because clinic storage is
unchanged. Local browser records cannot be secured by database RLS.

On deactivation/lock, trusted operations change account status first, then use
supported Auth administrative banning/session revocation as defense in depth.
Account checks must deny existing tokens even before their expiry. Password reset
must not reactivate an account or clear a lock. Define whether locking is temporary
or indefinite before adding an unlock workflow; this schema uses indefinite status.

The accounts SELECT policy deliberately allows a disabled user with a valid token
to read their OWN status. It does not authorize any clinic operation. RLS does not
intercept the Auth API: this migration alone cannot prevent a disabled user from
obtaining an Auth session through direct email/password access. If the requirement
includes denying password session issuance itself, implement and test an Auth
Password Verification Hook that rejects missing/nonactive accounts, subject to
project availability/configuration, in addition to backend authorization. Scope
hook grants to the Auth service; do not grant callers public execution. This hook
does not substitute for checks on refresh, recovery, other sign-in methods, or
already-issued access tokens. Do not claim complete disabled-account protection
until direct Auth, refresh, recovery and protected-resource tests pass.

There is a race between the function's last status check and token delivery; a lock
can occur immediately afterward. Current-status checks on every protected request
are therefore mandatory. Revocation/ban alone must not be assumed to invalidate
every existing access token immediately. Do not add a trigger on auth.users that
could break invitations, recovery or unrelated existing users in this stage.

## Registered-email recovery

Forgot Password asks for the registered EMAIL address, not a public username
lookup. Use resetPasswordForEmail with an allowlisted recovery redirect; always
show a neutral response such as 'If an eligible account exists, a recovery email
will be sent.' Add recovery rate limits/CAPTCHA as appropriate. Handle recovery
session/callback separately, show new-password/confirmation inputs, and call
updateUser({ password }). Do not render dashboards merely because recovery created
a session. Recheck role/status after recovery; status never changes automatically.
No email values or tokens belong in logs. Verify SMTP, redirect URLs, expired/used
links, and local-vs-production origins in a staging environment.

## Secure initial provisioning (after approval)

1. Apply the reviewed schema in an isolated test project first. Disable public
   signup for this administrator-provisioned application and configure email,
   password policy, site URL, invitation/recovery redirects and abuse controls.
2. Use the project owner's trusted dashboard or a server-only Admin API script
   to invite the Admin/Doctor at their real controlled email address. Obtain the
   returned auth user UUID; never accept a client-supplied role or guessed UUID.
3. Insert the canonical username, UUID, role admin, status deactivated and display
   name through a trusted owner/service operation. No email/password in this table.
   Auth invitations and database inserts are not one transaction: if insertion
   fails, stop, clean up/reconcile the invitation/user, and do not activate access.
4. User follows the single-use invitation link and sets their own password through
   the future invitation setup screen. No hardcoded/shared/committed password.
   Keep access denied until an administrator verifies setup and activates account.
5. Repeat with a distinct registered email/user UUID/username and role staff.
6. Verify both roles with real sign-in in staging. Document owner-controlled
   recovery for the initial administrator. Future in-app account management must
   validate caller identity and active admin role on the server before using a
   privileged client; browser possession of a selected admin view is insufficient.

## Logging and secrets

Store privileged credentials only in server secret storage, never VITE_* values,
React bundles, SQL literals, responses, commits, or browser consoles. Log only a
generated request ID, coarse outcome, latency and sanitized service error category.
Do not log request bodies, usernames, emails, raw IPs, passwords, authorization
headers, JWTs or refresh tokens. HMAC limiter keys require a server-only secret and
short retention. Restrict log access; use separate aggregate abuse metrics.

## Test plan before deployment

Use an isolated local/staging project, disposable users invited through trusted
operations, and runtime-generated passwords kept out of logs/source. Clean up only
those test users. Do not use production patient data.

| Case                     | Expected assertion                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Canonical username       | Mixed-case input/outer ASCII spaces resolves same account; Unicode, internal spaces and wrong lengths rejected        |
| Uniqueness/constraints   | Duplicate case variants and invalid role/status fail; nonexistent auth UUID fails FK; canonical storage enforced      |
| Anonymous permissions    | SELECT, INSERT, UPDATE, DELETE denied; no username/email lookup RPC                                                   |
| Own-row permissions      | User A sees only A, cannot read B by ID/filter; joins and counts reveal no other rows                                 |
| Privilege escalation     | A cannot update own username, role, status OR display name; no client account creation/deletion, even for app admin   |
| Active admin and staff   | Correct credentials produce real tokens; setSession succeeds; own role/status read is correct                         |
| Invalid/nonexistent      | Wrong password and nonexistent username return same status/body; no tokens or email; compare timing statistically     |
| Locked/deactivated       | Correct password still denied; missing profile and unknown role fail closed                                           |
| Status change mid-flight | Lock between verification and final check denies; existing session cannot access status-protected resources           |
| Auth bypass/refresh      | Direct email Auth or refresh cannot bypass application/API active-status checks                                       |
| Rate limits              | Existing/nonexistent usernames share limiter behavior; per-IP, per-username, global limits and limiter failure tested |
| Requests/logging         | Wrong method/origin/type, oversized body, concurrent requests; no credentials in logs/cache/responses                 |
| Recovery/invitation      | Real email link, allowlisted redirect, expired/used link, password update; disabled account stays disabled            |
| Regression               | Existing clinic Playwright assertions retained when authenticated fixtures are introduced later                       |

No SQL/RLS/Edge runtime tests have been executed by drafting these files.

## Later file changes (not performed)

Promote reviewed SQL to a timestamped `supabase/migrations/` file; add the Edge
Function modules/configuration and local database/function tests. Then add an
authentication service and AuthProvider, connect LoginForm callbacks, implement
recovery/invitation screens, replace role preview in main.tsx, update misleading
preview help/staff-administration text, and adapt Playwright auth fixtures. Keep
clinic data storage migration outside this contribution's current scope.

## Security review and safe application checklist

SQL review: standard PostgreSQL DDL, Supabase's built-in auth.users UUID primary
key, auth.uid(), anon/authenticated/service_role roles, and C collation are used;
no extension is required. Username, role and status now explicitly use C collation
to avoid dependence on a database's default equality semantics. Display names are
bounded by their full stored length and must contain a non-whitespace character.
Service-role defaults are revoked before granting only SELECT/INSERT/UPDATE/DELETE
(no TRUNCATE/REFERENCES/TRIGGER grants). Existing default column privileges,
custom role memberships, public schema CREATE rights, owner changes and privileged
views/functions in a customized hosted project still require inspection.

The script is intentionally a one-time CREATE, not idempotent. If accounts already
exists, stop and compare schemas; do not add IF NOT EXISTS to silently skip security
setup, and do not drop existing objects. SQL is review-ready for isolated testing,
not production-verified. No SQL was executed as part of this review.

After explicit approval, use this sequence:

1. Confirm the target project ID visually in Supabase Dashboard, select an isolated
   test project first, and record the operator/project/migration version. Back up
   any existing schema/data before a later production application. Inspect existing
   public.accounts, naming collisions, role memberships/default privileges, and
   dependent APIs. Stop on unexpected objects/permissions.
2. In SQL Editor, paste ONLY supabase/drafts/accounts.sql and review the complete
   transaction before Run. Execute once as the trusted project owner. Do not paste
   credentials or provisioning passwords. If any statement fails, roll back the
   transaction and investigate; do not run the remaining statements independently.
3. Verify the resulting schema with these read-only queries (not executed here):

   ```sql
   select column_name, data_type, is_nullable, collation_name
   from information_schema.columns
   where table_schema = 'public' and table_name = 'accounts';

   select conname, pg_get_constraintdef(oid)
   from pg_constraint where conrelid = 'public.accounts'::regclass;

   select indexdef from pg_indexes
   where schemaname = 'public' and tablename = 'accounts';

   select relrowsecurity, relforcerowsecurity
   from pg_class where oid = 'public.accounts'::regclass;

   select * from pg_policies
   where schemaname = 'public' and tablename = 'accounts';

   select grantee, privilege_type
   from information_schema.table_privileges
   where table_schema = 'public' and table_name = 'accounts';

   select grantee, column_name, privilege_type
   from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'accounts';
   ```

   Expect RLS true, one own-row SELECT policy, authenticated column SELECT only,
   no anon/PUBLIC table or column permissions, and service-role DML. Owner grants
   are expected. Inspect inherited/custom roles as well, not only direct ACLs.

4. Separately provision disposable test Auth users through trusted invitation/setup
   operations described above. Create account rows as owner/service, initially
   deactivated; activate only the intended test users. Never use production users
   to test destructive cases.
5. Using the publishable key and REAL user sessions in a test harness, exercise
   anon, user A, user B, app-admin and disabled-user requests. Do NOT test RLS only
   as SQL Editor owner/service_role: those bypass it. Verify selects/counts/filters
   expose only the caller's row; all ordinary writes (including display_name),
   upserts and deletes fail. Verify trusted writes and all constraints separately.
6. Run the test matrix above, including exact-case/invalid normalization, duplicate
   inserts, invalid UUID FK, cascade deletion of a disposable Auth user, and
   concurrent username uniqueness. Keep test credentials and tokens out of output.
7. Do not enable authentication in production yet. Implement/test the endpoint,
   shared limiter, account guards, recovery/invitation UI and any Auth hook first.
   Test direct Auth paths explicitly; the account-table migration cannot make
   the current role-preview dashboard secure.
8. After test evidence and a separate approval, promote the SAME reviewed SQL into
   versioned migrations and apply using one tracked deployment method. If manually
   applied first, reconcile migration history before db push to avoid reapplication.
   Do not run both paths blindly. On problems after application, restrict access
   and use a reviewed forward fix; do not drop populated accounts as a rollback.

No existing clinic table, trigger, policy or browser-storage key is changed by this
SQL. Actual hosted compatibility remains unverified until the target is inspected
and these tests are run. No account/role hook is created by this draft.

## Primary references

- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/reference/javascript/auth-setsession
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-hooks/password-verification-hook
