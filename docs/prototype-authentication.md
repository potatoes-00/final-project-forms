# Offline login and staff registration prototype

This local UI prototype is **not secure for production**. Use fictional data and
passwords only. It makes no Supabase authentication or backend requests. Existing
Supabase client setup, migrations, dependencies, and design documents are preserved
for future work; those documents describe a separate, unfinished backend design.

Fixed fictional Admin / Doctor login: username `demo.admin`, password `MediDemo2026!`.
These public demo credentials are also displayed on the login screen.

Sign in as Admin / Doctor, open Administration → Staff Accounts, and create an
account with name, unique username/email, job title, password and confirmation.
The role is always Clinic Staff; public registration and patient accounts do not
exist. Passwords require at least eight characters. Usernames are case insensitive,
3–32 ASCII letters/numbers/dot/underscore/hyphen, beginning with a letter or number.
Passwords are preserved exactly. Admin usernames/emails and legacy staff emails
are reserved. Legacy preview staff records have no usable login credentials.

Staff identities and salted PBKDF2 password hashes are saved under localStorage
`medisystem-prototype-accounts-v1`, separately from clinic exports/backups. Hashing
does not provide production authentication: anyone controlling this browser can
edit accounts, roles, status, storage, or application code. There is no server-side
authorization, multi-device synchronization, account invitation, or email delivery.
Web Crypto requires localhost or an HTTPS origin.

Session storage `medisystem-prototype-session-v1` contains only an account ID, never
a password/hash. Reload restores the identity from the account store and checks
Active status. Logout removes the session and unmounts the workspace. Locked and
Deactivated staff cannot sign in or restore access. Cross-tab account changes and
window focus recheck the current session. Roles come from the current account;
the old freely selectable role preview is removed from the authenticated header.

Admin may set staff status to Active, Locked, or Deactivated. This affects the same
accounts used by login. Forgot Password explicitly reports that recovery is a
prototype placeholder and no email was sent. There is no password reset workflow.

Clinic records and profile/preferences retain their existing shared browser
storage behavior; they are not isolated by account. Clearing browser storage loses
staff registrations. Existing workspace backups do not restore login accounts.

Validation commands: `npx.cmd tsc --noEmit`, `npm.cmd run build`, and `npm.cmd test`.
If Playwright's bundled browser is not installed, an installed Chrome can be used
in PowerShell with `$env:PLAYWRIGHT_CHANNEL='chrome'; npm.cmd test`.
