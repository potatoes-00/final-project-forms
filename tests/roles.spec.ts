import { signIn, switchRole } from "./authHelpers";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await signIn(page);
});

const shared = [
  "Dashboard",
  "Patients",
  "Queue & Visits",
  "Services & Lab",
  "Billing",
  "Reports",
];
async function go(page: Page, name: string) {
  await page
    .locator(".sidebar")
    .getByRole("button", { name, exact: true })
    .click();
}
async function createVisit(page: Page) {
  await go(page, "Queue & Visits");
  await page.locator("#patientId").selectOption("PT-0002");
  await page.locator("#service").selectOption("General consultation");
  await page.locator("#priority").selectOption("Regular");
  await page.locator("#referral").selectOption("Walk-in");
  await page.locator("#reason").fill("Routine clinic visit");
  await page.getByRole("button", { name: "Add to queue", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Q-001");
}

test("sidebar follows both role menus, expands Administration, and leaves restricted pages on role change", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button"),
  ).toHaveText([
    "Dashboard",
    "Patients",
    "Queue & Visits",
    "Consultations",
    "Services & Lab",
    "Billing",
    "Reports",
  ]);
  const administration = page.getByRole("button", {
    name: "Administration",
    exact: true,
  });
  await expect(administration).toHaveAttribute("aria-expanded", "true");
  await administration.click();
  await expect(
    page.getByRole("button", { name: "Staff Accounts", exact: true }),
  ).toBeHidden();
  await administration.click();
  await go(page, "Staff Accounts");
  await expect(
    page.getByRole("heading", { name: "Staff Accounts", level: 1 }),
  ).toBeVisible();
  await switchRole(page, "staff");
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button"),
  ).toHaveText(shared);
  for (const name of [
    "Consultations",
    "Administration",
    "Staff Accounts",
    "System Maintenance",
    "Backup & Restore",
  ]) {
    await expect(
      page.locator(".sidebar").getByRole("button", { name, exact: true }),
    ).toHaveCount(0);
  }
  await go(page, "Services & Lab");
  await page
    .getByRole("button", { name: "Service catalog", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add service", exact: true }),
  ).toHaveCount(0);
  await go(page, "Reports");
  await expect(page.getByLabel("Report type").locator("option")).toHaveText([
    "Patient registrations",
    "Patient visits",
  ]);
  await page.reload();
  await expect(page.locator(".top-right")).toContainText("Clinic Staff");
  await switchRole(page, "admin");
  await go(page, "Reports");
  await expect(page.getByLabel("Report type").locator("option")).toHaveText([
    "Patient registrations",
    "Patient visits",
    "Billing & revenue",
  ]);
});

test("consultation draft and completion persist and update the queue", async ({
  page,
}) => {
  await page.goto("/");
  await createVisit(page);
  await go(page, "Consultations");
  await page
    .getByRole("combobox", { name: "Patient visit", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Complete consultation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "diagnosis, and treatment",
  );
  await page
    .getByRole("textbox", { name: "Diagnosis", exact: true })
    .fill("Fictional assessment");
  await page
    .getByRole("textbox", { name: "Treatment details", exact: true })
    .fill("Fictional treatment notes");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("draft saved");
  await page.reload();
  await go(page, "Consultations");
  await page.getByRole("button", { name: "Open record", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Diagnosis", exact: true }),
  ).toHaveValue("Fictional assessment");
  await page
    .getByRole("button", { name: "Complete consultation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Consultation completed",
  );
  await go(page, "Queue & Visits");
  await expect(page.locator(".queue-row")).toHaveCount(0);
});

test("staff can create and update a lab request, process payment, and generate permitted reports", async ({
  page,
}) => {
  await page.goto("/");
  await switchRole(page, "staff");
  await createVisit(page);
  await go(page, "Services & Lab");
  await page
    .getByRole("button", { name: "New lab request", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Patient", exact: true })
    .selectOption("PT-0002");
  await page
    .getByRole("combobox", { name: "Laboratory service", exact: true })
    .selectOption("SRV-003");
  await page.getByRole("button", { name: "Save request", exact: true }).click();
  await page.getByLabel("Status for LAB-001").selectOption("Completed");
  await page.reload();
  await go(page, "Services & Lab");
  await expect(page.getByLabel("Status for LAB-001")).toHaveValue("Completed");
  await go(page, "Billing");
  await page
    .getByRole("combobox", { name: "Patient visit", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("combobox", { name: "Service / charge", exact: true })
    .selectOption("SRV-001");
  await page.getByLabel("Cash received (PHP)").fill("100");
  await page
    .getByRole("button", { name: "Confirm cash payment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "cover the total amount",
  );
  await page.getByLabel("Cash received (PHP)").fill("600");
  await expect(page.locator(".payment-summary")).toContainText("₱100.00");
  await page
    .getByRole("button", { name: "Confirm cash payment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Transaction marked as paid",
  );
  await expect(page.locator("tbody tr")).toContainText("PAY-001");
  await expect(
    page
      .getByRole("combobox", { name: "Patient visit", exact: true })
      .locator("option"),
  ).toHaveCount(1);
  await go(page, "Reports");
  await page.getByLabel("Report type").selectOption("visits");
  await page
    .getByRole("button", { name: "Generate report", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await switchRole(page, "admin");
  await go(page, "Reports");
  await page.getByLabel("Report type").selectOption("revenue");
  await page
    .getByRole("button", { name: "Generate report", exact: true })
    .click();
  await expect(page.locator(".report-summary")).toContainText("₱500.00");
});

test("staff administration validates duplicates and saves preview account status", async ({
  page,
}) => {
  await page.goto("/");
  await go(page, "Staff Accounts");
  await page
    .getByRole("button", { name: "Add staff account", exact: true })
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("Jamie Cruz");
  await page.getByLabel("Username", { exact: true }).fill("jamie.cruz");
  await page.getByLabel("Password", { exact: true }).fill("StaffDemo2026!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("StaffDemo2026!");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("staff@example.com");
  await page.getByLabel("Job title", { exact: true }).fill("Receptionist");
  await page
    .getByRole("button", { name: "Create staff account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("already exists");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("jamie@example.com");
  await page
    .getByRole("button", { name: "Create staff account", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Jamie Cruz" });
  await row.getByRole("button", { name: "Deactivate", exact: true }).click();
  await page.reload();
  await go(page, "Staff Accounts");
  await expect(
    page.getByRole("row").filter({ hasText: "Jamie Cruz" }),
  ).toContainText("Deactivated");
});

test("restore rejects malformed data without replacing saved workspace records", async ({
  page,
}) => {
  await page.goto("/");
  await go(page, "Backup & Restore");
  await page.getByLabel("Workspace backup file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        services: [{}],
        requests: [],
        payments: [],
        consultations: [],
        staff: [],
      }),
    ),
  });
  await page
    .getByLabel("Replace the current workspace records with this file.")
    .check();
  await page
    .getByRole("button", { name: "Restore workspace records", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "valid workspace export",
  );
  await go(page, "Services & Lab");
  await page
    .getByRole("button", { name: "Service catalog", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
});

test("both roles' screens pass accessibility checks and fit mobile widths", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  for (const role of ["admin", "staff"]) {
    await switchRole(page, role);
    const names = [
      ...shared,
      ...(role === "admin"
        ? [
            "Consultations",
            "Staff Accounts",
            "System Maintenance",
            "Backup & Restore",
          ]
        : []),
      "Help & Guide",
      "My Account",
    ];
    for (const name of names) {
      await go(page, name);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          page: name,
          role,
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${role}: ${name}`,
      ).toBeTruthy();
      await page.setViewportSize({ width: 1440, height: 1100 });
    }
  }
});
