import { test, expect } from "@playwright/test";

test("edit patient and persist an uploaded record without changing identity", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Elena Santos/ }).click();
  await page.getByRole("button", { name: "Edit patient record", exact: true }).click();
  await expect(page.locator("#firstName")).toHaveValue("Elena");
  await expect(page.locator("#phone")).toHaveValue("09171234567");
  await page.locator("#city").fill("Pasig");
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Save patient changes" }).click();
  await expect(page.getByRole("dialog")).toContainText("Pasig");
  await expect(page.getByRole("dialog")).toContainText("PT-0001");
  await page.getByLabel("Upload patient record", { exact: true }).setInputFiles({ name: "record.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test record") });
  await expect(page.getByRole("dialog")).toContainText("Record attached successfully.");
  await page.getByLabel("Upload patient record", { exact: true }).setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("test") });
  await expect(page.getByRole("dialog")).toContainText("Choose a PDF, JPG, PNG, or WebP file.");
  await page.reload();
  await page.getByRole("button", { name: /Elena Santos/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Pasig");
  await expect(page.getByRole("link", { name: "Download record.pdf" })).toHaveAttribute("download", "record.pdf");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("medisystem-lab7-v1")!).patients.length)).toBe(2);
});

test("scan opens webcam, captures an attachment, and stops the camera", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Elena Santos/ }).click();
  await page.getByRole("button", { name: "Scan record", exact: true }).click();
  await expect(page.getByLabel("Patient record camera preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Capture photo" })).toBeEnabled();
  await page.evaluate(() => { (window as any).cameraTrack = (document.querySelector("video")!.srcObject as MediaStream).getVideoTracks()[0]; });
  await page.getByRole("button", { name: "Capture photo" }).click();
  await expect(page.getByRole("dialog")).toContainText("Record attached successfully.");
  await expect(page.getByRole("link", { name: /Download scan-/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).cameraTrack.readyState)).toBe("ended");
});
