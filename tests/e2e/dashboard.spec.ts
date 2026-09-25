import { expect, test } from "@playwright/test";

test.describe("Heroes dashboard", () => {
  test("opens on named benchmarks with the demo badge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("heroes, benchmarked");
    await expect(page.getByText("DEMO DATA").first()).toBeVisible();
    // First chart is the named leaderboard, before the scatter.
    const titles = await page.locator("section h2").allTextContents();
    const lead = titles.findIndex((t) => t.startsWith("Hero leaderboard"));
    const scatter = titles.findIndex((t) => t.startsWith("Performance dimensions"));
    expect(lead).toBeGreaterThanOrEqual(0);
    expect(lead).toBeLessThan(scatter);
    // Hero names are visible on the leaderboard.
    await expect(page.locator("#leaderboard").getByText("Siddhu Jonnalagadda").first()).toBeVisible();
    // Panja Vaisshnav Tej is never listed.
    await expect(page.getByText("Panja Vaisshnav Tej")).toHaveCount(0);
  });

  test("emerging toggle reveals 1–2 film heroes", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#table").getByText("Mouli Tanuj Prasanth")).toHaveCount(0);
    await page.getByRole("switch").click();
    await expect(page.locator("#table").getByText("Mouli Tanuj Prasanth")).toBeVisible();
  });

  test("selecting a hero updates the summary; search filters", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Search hero").fill("Nani");
    await expect(page.locator("#selected").getByText("Nani", { exact: true })).toBeVisible();
    await expect(page.locator("#table tbody tr")).toHaveCount(1);
  });

  test("period switch keeps the dashboard populated", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Last 5 years" }).click();
    await expect(page.locator("#leaderboard")).toContainText("Last 5 years");
    await expect(page.locator("#table tbody tr").first()).toBeVisible();
  });
});

test.describe("Other views", () => {
  test("compare two heroes", async ({ page }) => {
    await page.goto("/compare?heroes=nani,suriya");
    await expect(page.getByRole("heading", { name: "Side-by-side detail" })).toBeVisible();
    await expect(page.locator("table")).toContainText("Suriya");
  });

  test("annexure hero detail lists fictional demo titles", async ({ page }) => {
    await page.goto("/annexure/heroes/nani");
    await expect(page.getByRole("heading", { name: "Filmography and film-level evidence" })).toBeVisible();
    await expect(page.getByText("FICTIONAL").first()).toBeVisible();
  });

  test("correction form validates and submits privately", async ({ page }) => {
    await page.goto("/annexure/corrections");
    await page.getByRole("button", { name: "Submit correction" }).click();
    await expect(page.getByText("Describe the proposed correction")).toBeVisible();
    await page.getByLabel(/Proposed correction/).fill("The release date is wrong");
    await page.getByLabel(/Source URL/).fill("https://example.org/source");
    await page.getByRole("button", { name: "Submit correction" }).click();
    await expect(page.getByRole("status")).toContainText("private until an editor reviews it");
  });

  test("admin area requires sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("Responsive layout", () => {
  for (const path of ["/", "/rankings", "/compare", "/trends", "/methodology", "/annexure", "/annexure/registry", "/annexure/heroes/nani", "/annexure/corrections"]) {
    test(`no horizontal page overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const [scrollW, clientW] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollW).toBeLessThanOrEqual(clientW);
    });
  }
});
