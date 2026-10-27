import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("mobile navigation supports keyboard selection, role changes, and desktop resizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.locator(".menu-toggle");
  const navigation = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(navigation).toBeHidden();
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(navigation).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
  ).toEqual([]);
  const patients = navigation.getByRole("button", {
    name: "Patients",
    exact: true,
  });
  await patients.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Patients");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).toBeHidden();
  await page.getByLabel("Role preview").selectOption("staff");
  await menu.click();
  await expect(
    page
      .locator(".sidebar")
      .getByRole("button", { name: "Administration", exact: true }),
  ).toHaveCount(0);
  await menu.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(navigation).toBeVisible();
  await expect(menu).toBeHidden();
  await navigation
    .getByRole("button", { name: "Billing", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Billing");
});

test("all pages reflow at narrow mobile and tablet widths with navigation open and closed", async ({
  page,
}) => {
  await page.goto("/");
  const names = [
    "Dashboard",
    "Patients",
    "Queue & Visits",
    "Consultations",
    "Services & Lab",
    "Billing",
    "Reports",
    "Staff Accounts",
    "System Maintenance",
    "Backup & Restore",
    "Help & Guide",
    "My Account",
  ];
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of names) {
      if (width === 320) {
        await page.locator(".menu-toggle").click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `open menu: ${name}`,
        ).toBeTruthy();
      }
      await page
        .locator(".sidebar")
        .getByRole("button", { name, exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}px: ${name}`,
      ).toBeTruthy();
    }
  }
});
