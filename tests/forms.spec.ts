import { signIn } from "./authHelpers";
import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await signIn(page);
});
async function register(page: Page, first = "Maria") {
  if (!(await page.locator("#firstName").count())) {
    await page
      .getByRole("button", { name: "Register patient", exact: true })
      .click();
  }
  for (const [name, value] of Object.entries({
    firstName: first,
    lastName: "Dela Cruz",
    dob: "1998-06-15",
    phone: "09175550123",
    email: "maria@example.com",
    address: "42 Demo Street",
    city: "Quezon City",
    emergencyName: "Juan Dela Cruz",
    emergencyPhone: "09185550123",
  }))
    await page.locator("#" + name).fill(value);
  await page.locator("#sex").selectOption("Female");
  await page.locator("#civil").selectOption("Single");
  await page.locator("#consent").check();
  await page
    .getByRole("button", { name: "Register patient", exact: true })
    .click();
}
test("registration blocks invalid input, retains entries, focuses errors, and persists a valid patient", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Register patient", exact: true })
    .click();
  await page.locator("#firstName").fill("Maria");
  await page.locator("#email").fill("invalid");
  await page.locator("#phone").fill("123");
  await page
    .getByRole("button", { name: "Register patient", exact: true })
    .click();
  await expect(page.locator("#error-summary")).toBeFocused();
  await expect(page.locator("#email-error")).toContainText("valid email");
  await expect(page.locator("#phone-error")).toContainText("09");
  await expect(page.locator("#firstName")).toHaveValue("Maria");
  expect(
    await page.evaluate(() => localStorage.getItem("medisystem-lab7-v1")),
  ).toBeNull();
  await register(page);
  await expect(page.getByRole("status")).toContainText("PT-0003");
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Maria Dela Cruz/ }),
  ).toBeVisible();
  await register(page);
  await expect(page.locator("#firstName-error")).toContainText(
    "already registered",
  );
});
test("visit requires a patient, enforces priority eligibility, saves queue, and rejects duplicate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Queue & Visits" }).click();
  await page.getByRole("button", { name: "Add to queue" }).click();
  await expect(page.locator("#patientId-error")).toBeVisible();
  await page.locator("#patientId").selectOption("PT-0002");
  await page.locator("#service").selectOption("General consultation");
  await page.locator("#priority").selectOption("Senior");
  await page.locator("#referral").selectOption("Walk-in");
  await page.locator("#reason").fill("Routine clinic check");
  await page.getByRole("button", { name: "Add to queue" }).click();
  await expect(page.locator("#priority-error")).toContainText("60");
  await page.locator("#priority").selectOption("Regular");
  await page.getByRole("button", { name: "Add to queue" }).click();
  await expect(page.getByRole("status")).toContainText("Q-001");
  await expect(page.locator(".queue-row")).toHaveCount(1);
  await page.locator("#patientId").selectOption("PT-0002");
  await page.locator("#service").selectOption("General consultation");
  await page.locator("#referral").selectOption("Walk-in");
  await page.locator("#reason").fill("Routine clinic check");
  await page.getByRole("button", { name: "Add to queue" }).click();
  await expect(page.locator("#patientId-error")).toContainText("active visit");
});
test("search validates ranges and returns matching persisted records with meaningful display options", async ({
  page,
}) => {
  await page.goto("/");
  await register(page);
  await page.getByRole("button", { name: "Patients", exact: true }).click();
  await page.locator("#minAge").fill("80");
  await page.locator("#maxAge").fill("20");
  await page.getByRole("button", { name: "Search patients" }).click();
  await expect(page.locator("#maxAge-error")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.locator("#query").fill("maria");
  await page.getByRole("button", { name: "Search patients" }).click();
  await expect(page.locator(".result-row")).toHaveCount(1);
  await expect(page.locator(".result-row")).toContainText("Quezon City");
  await page.locator("#detail").selectOption("Compact");
  await page.getByRole("button", { name: "Search patients" }).click();
  await expect(page.locator(".result-row")).not.toContainText("Quezon City");
  await page.locator("#query").fill("nobody");
  await page.getByRole("button", { name: "Search patients" }).click();
  await expect(page.locator(".search-results")).toContainText(
    "No patients match",
  );
});
test("profile validation prevents saving; valid changes update workspace and persist after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "My Account" }).click();
  await page.locator("#email").fill("wrong");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("#email-error")).toBeVisible();
  await page.locator("#email").fill("alex@example.com");
  await page.locator("#displayName").fill("Alex Rivera");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator(".profile")).toContainText("Alex Rivera");
  await page.reload();
  await expect(page.locator(".profile")).toContainText("Alex Rivera");
});
test("storage failure never reports success", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await register(page);
  await expect(page.getByRole("status")).toContainText("No record was saved");
  await expect(page.locator("#firstName")).toHaveValue("Maria");
});
test("keyboard navigation, accessible modal, control counts, and mobile layout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeAttached();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  for (const name of [
    "Register patient",
    "Queue & Visits",
    "Patients",
    "My Account",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect(
      await page.locator("form input,form select,form textarea").count(),
    ).toBeGreaterThanOrEqual(10);
    expect(
      await page
        .locator('form [tabindex]:not([tabindex="-1"]):not([tabindex="0"])')
        .count(),
    ).toBe(0);
  }
  await page.getByRole("button", { name: "Patients", exact: true }).click();
  await page.getByRole("button", { name: /Elena Santos/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Register patient", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("all four forms pass automated accessibility checks", async ({ page }) => {
  await page.goto("/");
  for (const name of [
    "Register patient",
    "Queue & Visits",
    "Patients",
    "My Account",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
