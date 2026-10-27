import { test, expect } from "@playwright/test";
import { createStaff, signIn } from "./authHelpers";

test("login validates required fields, rejects invalid credentials, and supports password visibility/reset/recovery", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(
    page.getByText("Enter your username.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Enter your password.", { exact: true }),
  ).toBeVisible();
  await page.locator('input[name="username"]').fill("demo.admin");
  await page.locator('input[name="password"]').fill("wrong");
  await page.getByLabel("Show Password").check();
  await expect(page.locator('input[name="password"]')).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Unable to sign in");
  await page.getByRole("button", { name: "Clear Fields" }).click();
  await expect(page.locator('input[name="username"]')).toHaveValue("");
  await expect(page.locator('input[name="password"]')).toHaveValue("");
  await page.getByRole("button", { name: "Forgot Password" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Prototype only" }),
  ).toContainText("no email was sent");
});

test("admin session restores without passwords and logout clears access", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);
  await expect(page.locator(".top-right")).toContainText("Admin / Doctor");
  const session = await page.evaluate(() =>
    JSON.parse(
      sessionStorage.getItem("medisystem-prototype-session-v1") || "null",
    ),
  );
  expect(session).toEqual({ accountId: "demo-admin" });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
});

test("registration validates required fields and confirmation and rejects duplicate username/email", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);
  await createStaff(page);
  await expect(page.getByRole("status")).toContainText("Staff account created");
  await createStaff(page, "DEMO.STAFF", "different@example.com");
  await expect(page.getByRole("status")).toContainText(
    "username already exists",
  );
  await page.locator('input[name="username"]').fill("another.staff");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("DEMO.STAFF@example.com");
  await page
    .getByRole("button", { name: "Create staff account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("email already exists");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("another@example.com");
  await page.getByLabel("Confirm password", { exact: true }).fill("mismatch");
  await page
    .getByRole("button", { name: "Create staff account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Passwords do not match",
  );
  await page.getByLabel("Full name", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Create staff account", exact: true })
    .click();
  await expect(page.getByLabel("Full name", { exact: true })).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("medisystem-prototype-accounts-v1") || "[]",
        ).length,
    ),
  ).toBe(1);
});

test("registered staff can log in after reload and cannot access staff administration or escalate via preview storage", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page);
  await createStaff(page);
  await expect(page.getByRole("status")).toContainText("Staff account created");
  await page.getByRole("button", { name: "Logout" }).click();
  await page.reload();
  await signIn(page, "demo.staff", "StaffDemo2026!");
  await expect(page.locator(".top-right")).toContainText(
    "Jamie Cruz · Clinic Staff",
  );
  for (const name of [
    "Staff Accounts",
    "Administration",
    "Consultations",
    "Backup & Restore",
    "System Maintenance",
  ])
    await expect(
      page.locator(".sidebar").getByRole("button", { name, exact: true }),
    ).toHaveCount(0);
  await expect(page.getByLabel("Role preview")).toHaveCount(0);
  await page.evaluate(() =>
    sessionStorage.setItem("medisystem-role-preview", "admin"),
  );
  await page.reload();
  await expect(page.locator(".top-right")).toContainText("Clinic Staff");
  await expect(
    page.getByRole("button", { name: "Add staff account" }),
  ).toHaveCount(0);
});

for (const status of ["Locked", "Deactivated"]) {
  test(`${status} staff cannot log in or restore a session`, async ({
    page,
  }) => {
    await page.goto("/");
    await signIn(page);
    await createStaff(page);
    await expect(page.getByRole("status")).toContainText(
      "Staff account created",
    );
    const accountId = await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("medisystem-prototype-accounts-v1") || "[]",
        )[0].id as string,
    );
    await page.getByLabel("Status for demo.staff").selectOption(status);
    await page.getByRole("button", { name: "Logout" }).click();
    await page.locator('input[name="username"]').fill("demo.staff");
    await page.locator('input[name="password"]').fill("StaffDemo2026!");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Locked or deactivated",
    );
    await page.evaluate(
      (id) =>
        sessionStorage.setItem(
          "medisystem-prototype-session-v1",
          JSON.stringify({ accountId: id }),
        ),
      accountId,
    );
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Login", exact: true }),
    ).toBeVisible();
    await signIn(page);
    await page
      .getByRole("button", { name: "Staff Accounts", exact: true })
      .click();
    await page.getByLabel("Status for demo.staff").selectOption("Active");
    await page.getByRole("button", { name: "Logout" }).click();
    await signIn(page, "demo.staff", "StaffDemo2026!");
  });
}
