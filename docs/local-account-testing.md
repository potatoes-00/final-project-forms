# Isolated account schema testing on Windows

Prepared on feature/login-authentication. No local or hosted SQL executed.

## Files

- Migration: supabase/migrations/20261027000100_create_accounts.sql
- pgTAP tests: supabase/tests/accounts.test.sql
- Reviewed historical draft: supabase/drafts/accounts.sql

The migration preserves the draft's complete DDL, constraints, privileges, RLS and
transaction; only its two introductory comments differ. It is now eligible for a
future db push: do not run that command against the shared project. Use the tracked
migration as the application source; do not also apply the historical draft.

## Prerequisite check results

Node v24.10.0 is available. Supabase CLI, psql and Deno were not found on PATH;
there is no project-local Supabase executable. Docker was not on PATH or at the
standard Docker Desktop executable path. wsl.exe exists, but installed WSL
distributions, WSL2 configuration, virtualization and Docker daemon health have
not been verified. No packages or containers were installed/downloaded or started.

## Safe setup and exact next steps

1. Use Windows with hardware virtualization and WSL2 configured. Install/start
   Docker Desktop using its Linux-container/WSL2 backend; confirm `docker version`
   shows both client and server. Follow organizational Docker licensing rules.
2. Install the official Supabase CLI, preferably a pinned project dev dependency
   in a later authorized setup step (`npm.cmd install --save-dev supabase`). Do not
   use npm global installation. Verify `npx.cmd supabase --version`. psql and Deno
   are not prerequisites for `supabase test db`; Docker and the CLI are.
3. Open a terminal in C:\Users\Sophia\Softeng\final-project-forms and confirm
   `git branch --show-current` is feature/login-authentication. No Supabase login,
   remote link, hosted database URL, credentials or production dump are needed.
4. Once tooling exists, run `npx.cmd supabase init` to generate local config. If a
   config already exists, inspect it rather than overwriting it. Use a unique local
   project_id such as medisystem-account-tests. Keep database and Studio services
   private to this machine/firewall; do not expose the local stack to a LAN or
   untrusted network. Inspect configured ports and Docker context before starting.
5. Run `npx.cmd supabase start`. The CLI pulls images and starts an isolated local
   stack; fresh startup applies tracked migrations. Do not change .env.local or
   connect the React app to this stack for these SQL tests. Do not publish CLI
   startup output containing generated local keys.
6. If the local stack pre-existed before this migration, inspect its local state
   and history, then run `npx.cmd supabase migration up --local` to apply pending
   migrations. Never use --linked, --db-url or db push. If accounts exists without
   the expected migration history, stop and investigate instead of dropping it.
7. Run `npx.cmd supabase test db`. Expect every assertion to pass and exit code 0.
   Record real output after execution; no passing results are claimed yet.
8. Optionally run `npx.cmd supabase db lint --local` as an additional check. SQL
   runtime and role tests are still necessary; lint cannot establish RLS security.
9. Stop this unique stack with `npx.cmd supabase stop`. No reset/delete is required.
   Do not use db reset or stop --no-backup on an existing stack without confirming
   disposable local data and obtaining authorization for its deletion.

Review newly generated CLI config/ignore files before committing. Do not commit
CLI temp files, local keys, dumps, environment files, Auth tokens or Docker data.

## SQL tests and limits

Tests run inside BEGIN/ROLLBACK, use synthetic Auth UUID rows with no email/password,
and roll back every fixture, temporary probe object and mutation. They do not
create usable login credentials. Never run this fixture file on the shared project.
The minimal auth.users fixtures depend on the local Supabase Auth schema; runtime
compatibility must be verified, not assumed.

Coverage: valid canonical username/default status; uppercase, short/long, spaces,
newline, Unicode and punctuation rejection; duplicate canonical/normalized names;
invalid/null roles and statuses; FK, display name and cascade; anon CRUD denial;
staff/admin ownership; insert/update/delete/upsert denial; trusted service update.

pgTAP impersonates anon/authenticated with SET LOCAL ROLE and a synthetic auth.uid
claim. This exercises actual PostgreSQL grants/RLS, NOT real Auth issuance, JWT
signature checks, API mapping, password verification or Edge Function execution.
Separate Auth/API integration and timing/concurrency tests remain required.

A transaction-only probe table demonstrates current-status RLS for reads/inserts:
the same user identity sees a row when active and is denied after lock/deactivation.
Missing accounts are denied. The accounts table itself intentionally lets disabled
users read their own status. No actual clinic table/policy is changed or protected
by this migration. Future operations must use per-table policies requiring current
active status, permitted role AND relevant row ownership; write policies need
WITH CHECK, not only USING. Server-only operations must check status too because
privileged clients bypass RLS. Avoid recursive policies on accounts itself.

## Plan costs and direct Auth access

As checked against official Supabase Auth Hooks documentation on 2026-10-27,
Password Verification Attempt hooks are hosted Teams/Enterprise features. Do not
assume this hook is available on Free or Pro. Ordinary schema constraints, RLS,
username lookup architecture and password Auth do not inherently require this hook.
Hosted usage quotas, function usage, SMTP and an external shared rate limiter can
still create costs; the project's current plan has not been inspected.

The security baseline must work WITHOUT the paid hook: every protected database
request checks current accounts.status='active', rather than trusting an old JWT
role/status claim. This rejects an already-issued session at its next request
(subject to transaction snapshot semantics), even after direct email Auth or token
refresh. Auth bans/revocation provide additional protection, but do not replace RLS.
This prevents protected data access; it does not guarantee that the Auth service
cannot issue a session to a disabled application account. If blocking password
session issuance is mandatory, a suitable Auth-level mechanism/plan must be agreed
before claiming that requirement complete. Recovery must never reactivate accounts.

## References

- https://supabase.com/docs/guides/local-development/cli/getting-started
- https://supabase.com/docs/guides/local-development/cli/testing-and-linting
- https://supabase.com/docs/guides/auth/auth-hooks
- https://supabase.com/docs/guides/database/postgres/row-level-security
