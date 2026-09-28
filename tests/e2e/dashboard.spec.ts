import { expect, test } from "@playwright/test";

test.describe("Heroes dashboard", () => {
  test("opens on one scrolling page with photo leaderboard first and no top tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("heroes, compared");
    await expect(page.getByText("DEMO DATA").first()).toBeVisible();
    await expect(page.locator("header nav")).toHaveCount(0);
    const titles = await page.locator("section h2").allTextContents();
    expect(titles[0]).toContain("Success ratio");
    expect(titles.some((t) => t.includes("More films vs. more success"))).toBe(true);
    expect(titles.at(-1)).toContain("How we calculate everything");
    // Photos are shown on the leaderboard.
    expect(await page.locator("#leaderboard image, #leaderboard img").count()).toBeGreaterThan(5);
    await expect(page.getByText("Panja Vaisshnav Tej")).toHaveCount(0);
  });

  test("newcomer toggle reveals 1–2 film heroes", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#table").getByText("Mouli Tanuj Prasanth")).toHaveCount(0);
    await page.getByRole("switch").click();
    await expect(page.locator("#table").getByText("Mouli Tanuj Prasanth")).toBeVisible();
  });

  test("search filters every chart and the table", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Search a hero").fill("Satyadev");
    await expect(page.locator("#table tbody tr")).toHaveCount(1);
    await expect(page.locator("#table")).toContainText("Satyadev");
  });

  test("Pareto axes can be changed", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("#pareto-1");
    await card.getByRole("combobox").nth(1).selectOption("avgRating");
    await expect(card).toContainText("Average audience rating (out of 10)");
  });

  test("double-tapping a hero opens his page", async ({ page }) => {
    await page.goto("/");
    const row = page.locator("#table tbody tr").first();
    // The cell also holds the avatar's initials badge; the name is the longest line.
    const name = (await row.locator("td").nth(1).innerText())
      .split("\n")
      .map((l) => l.replace("NEW", "").trim())
      .sort((a, b) => b.length - a.length)[0];
    await row.dblclick();
    await expect(page).toHaveURL(/\/hero\//);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expect(page.getByRole("heading", { name: /All films/ })).toBeVisible();
  });

  test("fan ranking stays hidden unless switched on", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator("#fan-ranking")).toHaveCount(0);
    expect((await request.get("/api/user-ranking")).status()).toBe(404);
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
  for (const path of ["/", "/hero/prabhas", "/rankings", "/compare", "/trends", "/methodology", "/annexure", "/annexure/registry", "/annexure/heroes/nani", "/annexure/corrections"]) {
    test(`no horizontal page overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const [scrollW, clientW] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollW).toBeLessThanOrEqual(clientW);
    });
  }
});
