import { expect, type Page } from "@playwright/test";

export async function signIn(
  page: Page,
  username = "demo.admin",
  password = "MediDemo2026!",
) {
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
}
export async function createStaff(
  page: Page,
  username = "demo.staff",
  email = "demo.staff@example.com",
) {
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Staff Accounts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add staff account", exact: true })
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("Jamie Cruz");
  await page.locator('input[name="username"]').fill(username);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Job title", { exact: true }).fill("Receptionist");
  await page.locator('input[name="password"]').fill("StaffDemo2026!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("StaffDemo2026!");
  await page
    .getByRole("button", { name: "Create staff account", exact: true })
    .click();
}
export async function switchRole(page: Page, role: string) {
  if (role === "staff") {
    const exists = await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("medisystem-prototype-accounts-v1") || "[]",
      ).some((a: { username: string }) => a.username === "demo.staff"),
    );
    if (!exists) {
      await createStaff(page);
      await expect(page.getByRole("status")).toContainText(
        "Staff account created",
      );
    }
  }
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await signIn(
    page,
    role === "staff" ? "demo.staff" : "demo.admin",
    role === "staff" ? "StaffDemo2026!" : "MediDemo2026!",
  );
}
