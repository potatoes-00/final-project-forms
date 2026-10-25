import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
const out = path.resolve("../submission");
await fs.mkdir(path.join(out, "screenshots"), { recursive: true });
await fs.mkdir(path.join(out, "video"), { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "Asia/Manila",
  recordVideo: {
    dir: path.join(out, "video"),
    size: { width: 1440, height: 1000 },
  },
});
const page = await context.newPage();
const started = Date.now();
const marks = [];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function caption(title, body, seconds = 0) {
  marks.push({
    seconds: Math.round((Date.now() - started) / 1000),
    title,
    body,
  });
  await page.evaluate(
    ({ title, body }) => {
      let el = document.getElementById("demo-caption");
      if (!el) {
        el = document.createElement("aside");
        el.id = "demo-caption";
        el.style.cssText =
          "position:fixed;left:278px;right:28px;bottom:18px;z-index:10000;background:#153d33f5;color:white;border:1px solid #83ae9c;padding:16px 22px;border-radius:10px;box-shadow:0 4px 24px #0003;font-family:Arial,sans-serif;pointer-events:none";
        document.body.append(el);
      }
      el.replaceChildren();
      const t = document.createElement("strong");
      t.style.cssText = "display:block;font-size:17px;margin-bottom:6px";
      t.textContent = title;
      const p = document.createElement("div");
      p.style.cssText = "font-size:14px;line-height:1.5;color:#e4f1e7";
      p.textContent = body;
      el.append(t, p);
    },
    { title, body },
  );
  console.log(title);
  if (seconds) await pause(seconds * 1000);
}
async function shot(name) {
  await page.screenshot({
    path: path.join(out, "screenshots", name + ".png"),
    fullPage: true,
    style: "#demo-caption{display:none!important}",
  });
}
async function nav(name) {
  const labels = {
    "Walk-in visits": "Queue & Visits",
    "Patient directory": "Patients",
    "Profile & preferences": "My Account",
  };
  if (name === "Patient registration") {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Patients", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Register patient", exact: true })
      .click();
  } else {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: labels[name] || name, exact: true })
      .click();
  }
  await page.evaluate(() => scrollTo(0, 0));
}
await page.goto("http://127.0.0.1:5173/");
await nav("Patient registration");
await page.evaluate(() => document.fonts.ready);
await caption(
  "MediSystem • Group 3 • Laboratory Activity 7",
  "Four connected clinic forms: two major forms and two supporting forms. All records shown are fictional.",
  8,
);
await shot("01-patient-registration");
await caption(
  "Major form 1: patient registration",
  "13 data controls: personal details, contact information, emergency contact, and record confirmation.",
  6,
);
await page.locator("#firstName").fill("Maria");
await page.locator("#email").fill("not-an-email");
await page.locator("#phone").fill("123");
await page
  .getByRole("button", { name: "Register patient", exact: true })
  .click();
await shot("02-patient-validation-errors");
await caption(
  "Invalid submissions are blocked",
  "The error summary receives keyboard focus. Each message links to its field. Entered values remain available for correction.",
  10,
);
for (const [name, value] of Object.entries({
  firstName: "Maria",
  lastName: "Dela Cruz",
  middleName: "Reyes",
  dob: "1998-06-15",
  phone: "09175550123",
  email: "maria@example.com",
  address: "42 Demo Street",
  city: "Quezon City",
  emergencyName: "Juan Dela Cruz",
  emergencyPhone: "09185550123",
})) {
  await page.locator("#" + name).fill(value);
  await pause(450);
}
await page.locator("#sex").selectOption("Female");
await pause(700);
await page.locator("#civil").selectOption("Single");
await page.locator("#consent").check();
await caption(
  "Correct the details, then confirm",
  "Required fields, email and Philippine mobile formats, birth-date limits, and duplicate name + birth-date checks run before saving.",
  7,
);
await page
  .getByRole("button", { name: "Register patient", exact: true })
  .click();
await expect(page.getByRole("status")).toContainText("PT-0003");
await shot("03-patient-registration-success");
await page.locator(".notice").scrollIntoViewIfNeeded();
await caption(
  "Patient saved: PT-0003",
  "The patient count and recent-patient list update immediately. The record is saved to this browser’s local storage.",
  8,
);
await nav("Walk-in visits");
await shot("04-walk-in-visit");
await caption(
  "Major form 2: walk-in visit registration",
  "10 logical data controls link a registered patient to today’s queue. Clinic date and arrival time use Asia/Manila.",
  7,
);
await page.getByRole("button", { name: "Add to queue" }).click();
await shot("05-visit-validation-errors");
await caption(
  "No patient, no visit",
  "An unregistered or missing patient cannot enter the queue. Service, referral source, and reason are also required.",
  8,
);
await page.locator("#patientId").selectOption("PT-0003");
await pause(800);
await page.locator("#service").selectOption("General consultation");
await pause(800);
await page.locator("#priority").selectOption("Regular");
await page.locator("#referral").selectOption("Walk-in");
await page.locator("#reason").fill("Routine clinic check");
await page
  .locator("#notes")
  .fill("Fictional walk-in visit for the laboratory demonstration.");
await caption(
  "A connected visit record",
  "Future arrival times and duplicate active visits are rejected. Senior priority requires a patient aged 60 or above.",
  8,
);
await page.getByRole("button", { name: "Add to queue" }).click();
await expect(page.getByRole("status")).toContainText("Q-001");
await page.locator(".notice").scrollIntoViewIfNeeded();
await shot("06-visit-queue-success");
await caption(
  "Queue number assigned: Q-001",
  "The queue displays the patient, priority, and arrival time. Ordering uses priority rank, then arrival time and creation time.",
  8,
);
await page.reload();
await nav("Walk-in visits");
await expect(page.locator(".queue-row")).toHaveCount(1);
await caption(
  "Persistence after reload",
  "The patient and visit remain after refreshing. This is a local form prototype; Supabase integration is part of the full project.",
  6,
);
await nav("Patient directory");
await shot("07-patient-search");
await caption(
  "Supporting form 1: patient search",
  "10 filter controls support name or exact patient ID, sex, city, age range, registration dates, sorting, and result detail.",
  7,
);
await page.locator("#minAge").fill("80");
await page.locator("#maxAge").fill("20");
await page.getByRole("button", { name: "Search patients" }).click();
await shot("08-search-range-errors");
await caption(
  "Cross-field validation",
  "The maximum age must be at least the minimum age. Registration-date ranges must also be in chronological order.",
  8,
);
await page.getByRole("button", { name: "Reset filters" }).click();
await page.locator("#query").fill("maria");
await page.getByRole("button", { name: "Search patients" }).click();
await page.locator(".search-results").scrollIntoViewIfNeeded();
await shot("09-search-results");
await caption(
  "Search the record we just created",
  "Case-insensitive name matching returns Maria Dela Cruz. Exact ID matching is also available.",
  7,
);
await page.locator(".result-row").click();
await shot("10-patient-record");
await caption(
  "Inspect the matching record",
  "The patient dialog shows saved contact details and emergency contact information. Escape closes the dialog.",
  6,
);
await page.keyboard.press("Escape");
await nav("Profile & preferences");
await shot("11-staff-profile");
await caption(
  "Supporting form 2: staff profile & preferences",
  "11 data controls include staff details, email, mobile, language, contact preference, timezone, notes, and email preference.",
  7,
);
await page.locator("#email").fill("invalid-email");
await page.locator("#phone").fill("123");
await page.getByRole("button", { name: "Save preferences" }).click();
await shot("12-profile-validation-errors");
await caption(
  "Consistent, accessible error handling",
  "Invalid profile details are rejected. Labels, helper text, focus outlines, and normal Tab order are used throughout.",
  8,
);
await page.locator("#email").fill("alex.rivera@example.com");
await page.locator("#phone").fill("09175550124");
await page.locator("#displayName").fill("Alex Rivera");
await page.locator("#language").selectOption("Filipino");
await page.locator("#notes").fill("Fictional clinic staff profile.");
await caption(
  "Preferences produce a visible result",
  "Saving updates the workspace display name and stores the selected preferences. No email is sent by this prototype.",
  7,
);
await page.getByRole("button", { name: "Save preferences" }).click();
await shot("13-profile-save-success");
await caption(
  "Profile saved successfully",
  "The name in the top bar is now Alex Rivera. Reloading keeps the saved profile and clinic records.",
  7,
);
const downloaded = page.waitForEvent("download");
await page.getByRole("button", { name: "Export demo records" }).click();
const download = await downloaded;
await download.saveAs(path.join(out, "demo-records.json"));
await caption(
  "Data handling you can inspect",
  "Export demo records downloads JSON containing the fictional patient, linked visit, and saved profile.",
  6,
);
await nav("Patient registration");
await caption(
  "Ready for review",
  "Four implemented forms, validation and success states, persistent local data, responsive layout, screenshots, tests, and PDF documentation.",
  8,
);
await page.evaluate(() => document.getElementById("demo-caption")?.remove());
const duration = Math.round((Date.now() - started) / 1000);
await context.close();
const videoPath = await page.video().path();
await fs.rename(
  videoPath,
  path.join(out, "video", "MediSystem-Lab7-Demo.webm"),
);
await browser.close();
await fs.writeFile(
  path.join(out, "video", "chapters.json"),
  JSON.stringify({ durationSeconds: duration, chapters: marks }, null, 2),
);
const mobile = await chromium.launch();
const mcontext = await mobile.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  deviceScaleFactor: 1,
});
const mp = await mcontext.newPage();
await mp.goto("http://127.0.0.1:5173/");
await mp.screenshot({
  path: path.join(out, "screenshots", "14-mobile-registration.png"),
  fullPage: true,
});
await mobile.close();
console.log(`Demo complete: ${duration} seconds.`);
