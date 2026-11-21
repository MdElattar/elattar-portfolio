import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function dynamicMasks(page: Page) {
  return [
    page.locator("canvas"),
    page.getByText(/CAIRO \/\//),
    page.getByText(/CAI \/\//),
    page.getByText(/UTC\+02/),
    page.getByText(/0x[0-9A-F]{6,}/),
    page.getByText(/[0-9.]+MB/),
  ];
}

async function scrollToSection(page: Page, id: string) {
  await page.evaluate((sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "instant" as ScrollBehavior,
      block: "start",
    });
  }, id);
  await page.waitForTimeout(700);
}

for (const viewport of viewports) {
  test(`visual home ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot(`home-${viewport.name}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      mask: dynamicMasks(page),
    });
  });

  test(`visual technical infrastructure ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await scrollToSection(page, "skills");
    await expect(page).toHaveScreenshot(`technical-${viewport.name}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      mask: dynamicMasks(page),
    });
  });

  test(`visual projects ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await scrollToSection(page, "projects");
    await expect(page).toHaveScreenshot(`projects-${viewport.name}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      mask: dynamicMasks(page),
    });
  });
}

test("visual admin (requires test credentials)", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD to capture the admin baseline.");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByText("Admin Access").waitFor();
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Password").fill(password!);
  await page.getByRole("button", { name: /authorize|login|sign in/i }).click();
  await page.goto("/admin");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
  await expect(page).toHaveScreenshot("admin-desktop.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.01,
    mask: dynamicMasks(page),
  });
});
