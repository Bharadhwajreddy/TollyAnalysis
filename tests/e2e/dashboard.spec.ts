import { expect, test } from "@playwright/test";

test.describe("Heroes dashboard", () => {
  test("opens on one scrolling page with the Star Score leaderboard first", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Compare Telugu cinema careers");
    await expect(page.getByText(/PUBLIC-SOURCE SNAPSHOT/).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toContainText("Inside the data");
    const titles = await page.locator("section h2").allTextContents();
    expect(titles.find((t) => !/Compare Telugu/.test(t))).toContain("Star Score");
    expect(titles.some((t) => t.includes("More films vs. more success"))).toBe(true);
    await expect(page.locator("#how")).toContainText("How we calculate everything");
    await expect(page.locator("#leaderboard")).toContainText("What goes into the Star Score");
    // Photos are shown on the leaderboard.
    expect(await page.locator("#leaderboard image, #leaderboard img").count()).toBeGreaterThan(5);
    // Editorially excluded: never ranked or listed (only named in the note that explains the exclusion).
    await expect(page.locator("#leaderboard")).not.toContainText("Panja Vaisshnav Tej");
    await expect(page.locator("#table")).not.toContainText("Panja Vaisshnav Tej");
  });

  test("newcomer toggle never hides anyone already shown", async ({ page }) => {
    await page.goto("/");
    const before = await page.locator("#table tbody tr").count();
    await page.getByRole("switch").click();
    expect(await page.locator("#table tbody tr").count()).toBeGreaterThanOrEqual(before);
  });

  test("colour can switch to film families", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Film family" }).click();
    await expect(page.locator("#leaderboard")).toContainText("Mega family");
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
    await card.getByRole("combobox").nth(1).selectOption("totalGross");
    await expect(card).toContainText("Total box office (₹ crore)");
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
    await expect(page.getByRole("heading", { name: /Every counted film/ })).toBeVisible();
  });

  test("more measures can be ranked", async ({ page }) => {
    await page.goto("/");
    await page.locator("#leaderboard select").selectOption("releaseGap");
    await expect(page.locator("#leaderboard h2")).toContainText("gap between films");
  });

  test("fan ranking stays hidden unless switched on", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator("#fan-ranking")).toHaveCount(0);
    expect((await request.get("/api/user-ranking")).status()).toBe(404);
  });
});

test.describe("Other views", () => {
  test("compare two heroes", async ({ page }) => {
    await page.goto("/compare?heroes=nani,prabhas");
    await expect(page.getByRole("heading", { name: "Side-by-side detail" })).toBeVisible();
    await expect(page.locator("table")).toContainText("Prabhas");
  });

  test("hero page shows the Star Score breakdown, all statistics and every film with sources", async ({ page }) => {
    await page.goto("/hero/prabhas");
    await expect(page.locator("#star")).toContainText("Total box office");
    await expect(page.getByText(/All statistics/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Every counted film/ })).toBeVisible();
    await expect(page.locator("#films")).toContainText("Baahubali 2: The Conclusion");
    await page.locator("#films").getByRole("button", { name: /Inspect film evidence/ }).first().click();
    await expect(page.locator("#films")).toContainText("Suggest a correction");
  });

  test("each film's result names its source (Kithakithalu is a hit)", async ({ page }) => {
    await page.goto("/hero/allari-naresh");
    const row = page.locator("#films tr", { hasText: "Kithakithalu" }).first();
    await expect(row).toContainText("Hit");
    await expect(row).toContainText("via Wikipedia");
    await expect(page.locator("#films tbody tr td:first-child a", { hasText: /^Maharshi$/ })).toHaveCount(0);
  });

  test("all heroes directory", async ({ page }) => {
    await page.goto("/heroes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("All heroes");
    await page.getByRole("link", { name: "Name" }).click();
    await expect(page).toHaveURL(/sort=name/);
    expect(await page.locator("main ul li a").count()).toBeGreaterThan(50);
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
  for (const path of ["/", "/heroes", "/hero/prabhas", "/hero/allari-naresh", "/rankings", "/compare", "/trends", "/methodology", "/annexure", "/annexure/registry", "/annexure/heroes/nani", "/annexure/corrections"]) {
    test(`no horizontal page overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const [scrollW, clientW] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollW).toBeLessThanOrEqual(clientW);
    });
  }
});
