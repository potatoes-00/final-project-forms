# MediSystem

A UI prototype for A. Bautista Medical Clinic with two role views, based on the supplied sidebar reference and clinic workflows. The existing patient, visit, search, and profile forms remain available within the new navigation.

## Run the finished app

Install Node.js 22.12 or later. From a fresh clone, run:

```powershell
git clone https://github.com/potatoes-00/final-project-forms.git
cd final-project-forms
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173 in your browser. Stop with Ctrl+C. The server listens only on this computer. After building, Windows users can also double-click `START-MEDISYSTEM.cmd`. After changing the source, rebuild before using `npm start`.

## Develop and verify

```powershell
npm ci
npm run dev
npm run build
npx playwright install chromium
npm test
```

The development address is printed by Vite. Tests use port 5173. `npm run build` performs TypeScript checking before building. `package-lock.json` records exact installed versions.

## Role views and sidebar

Use **Role preview** in the header to switch between **Admin / Doctor** and **Clinic Staff**. The chosen view persists for the browser session. This is a UI preview, not sign-in or backend authorization.

Both roles have Dashboard, Patients, Queue & Visits, Services & Lab, Billing, Reports, Help & Guide, and My Account. Admin / Doctor also has Consultations and expandable Administration with Staff Accounts, System Maintenance, and Backup & Restore. Switching to Clinic Staff while on a restricted page returns to Dashboard.

- Patients opens search and filters; Register patient opens the registration form.
- Dashboard counts use the saved local records and provide registration shortcuts.
- Consultation drafts and completion update the corresponding visit status. Medical notes are shown only in the Admin / Doctor view.
- Both roles can create laboratory requests and update their status. Adding services is available only in the Admin / Doctor view. Initial catalog entries and fees are demonstration values.
- Billing previews a cash payment for a visit and a selected service, including insufficient-cash checks and change. This is a simplified UI workflow; it does not implement full invoice line items, discounts, or actual payment processing.
- Both roles can generate patient and visit reports. Billing and revenue reports are available only in the Admin / Doctor view. Print / Save PDF uses the browser print dialog.
- Staff Accounts creates local preview records and supports status changes; no sign-in accounts or invitations are created.
- System Maintenance saves local clinic settings. Backup & Restore exports local records and validates workspace JSON before replacing workspace data. Restore expects patient and visit IDs to match the records in this browser; patient and visit exports are separate.

Workspace records use `medisystem-workspace-ui-v1`; clinic settings use `medisystem-clinic-settings-v1`. Patient and visit records retain the original key below. Data is stored only in this browser. The UI scope excludes the paper's software/hardware requirements, authentication infrastructure, and external services.

## Forms

| Category | Form | Data controls | Outcome |
| --- | --- | ---: | --- |
| Major | Patient registration | 13 | Validates and saves a unique patient with a generated ID |
| Major | Walk-in visit registration | 10 logical controls | Saves a patient-linked visit, assigns a daily queue number, orders the waiting list |
| Supporting | Patient search and filters | 10 | Validates age/date ranges and displays matching records |
| Supporting | Staff profile and preferences | 11 | Saves profile preferences and updates the workspace name |

Counts exclude submit/reset buttons. The visit type's two radio buttons count as one logical control. Control types include text, telephone, email, date, time, number, select, radio, checkbox, textarea, and buttons.

All form fields have labels. Native controls follow the DOM's natural Tab order; no positive tabindex is used. Errors appear inline and in a focused summary with field links. Invalid submissions preserve entered values and cannot save. Success is announced in a status region. Dialogs use native modal focus management and close with Escape. A skip link, visible focus styles, responsive layouts, and reduced-motion support are included.

## Data flow

Form submission -> trimmed values -> HTML constraints + business rules -> save to localStorage -> update state -> render confirmation, counts, records, and queue. A failed storage write never reports success. Search only reads records. Export demo records downloads JSON.

Storage key: `medisystem-lab7-v1`. The initial two patients and staff profile are fictional. New records persist in the same browser and origin. Different ports/domains and private-browsing sessions have separate storage. Clear this site's browser storage to return to the sample state. The demo does not synchronize multiple tabs or devices.

Queue priority is Emergency, Special, Senior, Regular. Arrival time breaks priority ties, then creation time. Senior priority requires age 60+. A patient cannot have two visits on the same clinic date in this prototype. Consultation drafts mark visits In Consultation, and completion marks them Completed and removes them from the active queue.

## Scope

This submission is a working client-side form prototype. It intentionally demonstrates handling data through browser persistence and visible UI results, an option allowed by the laboratory instructions. It is not the complete production clinic system described in the paper. It does not implement Supabase Auth, PostgreSQL/RLS, Realtime, server-enforced account authorization, or email delivery. Consultation, laboratory, billing, reporting, and administration screens use local demonstration data. The profile is a fictional local profile, not an authenticated staff account. Preferred language/timezone are stored preferences; the interface remains English and clinic visit times remain Asia/Manila. Use fictional data only.

## Submission materials

The original laboratory screenshots, video, documentation, and ZIP are kept separately from this source repository and reflect an earlier version. `scripts/capture-demo.mjs` can record the four-form workflow while the dev server is running; its output is written to `../submission/`. Captions are injected only into the recording browser and are not part of the app.

## Group and repository

The supplied paper lists Sophia Mae V. Aguila, Charles Vince P. Egana, Althea Shane F. Emboltorio, and Laurence Kurt U. Rañeses. Confirm these names before submitting.

Repository: [potatoes-00/final-project-forms](https://github.com/potatoes-00/final-project-forms). Follow `COLLABORATION.md` for branches, pull requests, and genuine contributions from group members.
