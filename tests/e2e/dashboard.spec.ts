import { expect, test } from "@playwright/test";

test.describe("Heroes dashboard", () => {
  test("opens on one clean page with the Star Score leaderboard first", async ({ page }) => {
    await page.goto("/star-score");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Compare Telugu cinema careers");
    await expect(page.getByRole("banner").getByRole("link", { name: "How it works" }).first()).toHaveAttribute("href", "/methodology");
    const titles = await page.locator("section h2").allTextContents();
    expect(titles.find((t) => !/Compare Telugu/.test(t))).toContain("Star Score");
    expect(titles.some((t) => t.includes("More films vs. more success"))).toBe(true);
    // The home page shows results only; how they are made lives on the "How it works" page.
    await expect(page.locator("#leaderboard")).not.toContainText("What goes into the Star Score");
    await expect(page.locator("body")).not.toContainText("How we calculate");
    await expect(page.locator("polyline")).toHaveCount(0);
    // Photos are shown on the leaderboard.
    expect(await page.locator("#leaderboard image, #leaderboard img").count()).toBeGreaterThan(5);
    // Editorially excluded: never ranked or listed (only named in the note that explains the exclusion).
    await expect(page.locator("#leaderboard")).not.toContainText("Panja Vaisshnav Tej");
    await expect(page.locator("#table")).not.toContainText("Panja Vaisshnav Tej");
  });

  test("newcomer toggle never hides anyone already shown", async ({ page }) => {
    await page.goto("/star-score");
    const before = await page.locator("#table tbody tr").count();
    await page.getByRole("switch").click();
    expect(await page.locator("#table tbody tr").count()).toBeGreaterThanOrEqual(before);
  });

  test("colour can switch to film families", async ({ page }) => {
    await page.goto("/star-score");
    await page.getByRole("radio", { name: "Film family" }).click();
    await expect(page.locator("#leaderboard")).toContainText("Mega family");
  });

  test("search filters every chart and the table", async ({ page }) => {
    await page.goto("/star-score");
    await page.getByPlaceholder("Search a hero").fill("Satyadev");
    await expect(page.locator("#table tbody tr")).toHaveCount(1);
    await expect(page.locator("#table")).toContainText("Satyadev");
  });

  test("Pareto axes can be changed", async ({ page }) => {
    await page.goto("/star-score");
    const card = page.locator("#pareto-1");
    await card.getByRole("combobox").nth(1).selectOption("totalGross");
    await expect(card).toContainText("Total box office (₹ crore)");
  });

  test("double-tapping a hero opens his page", async ({ page }) => {
    await page.goto("/star-score");
    const row = page.locator("#table tbody tr").first();
    // The cell also holds the avatar's initials badge; the name is the longest line.
    const name = (await row.locator("td").nth(1).innerText())
      .split("\n")
      .map((l) => l.replace("NEW", "").trim())
      .sort((a, b) => b.length - a.length)[0];
    await row.dblclick();
    await expect(page).toHaveURL(/\/hero\//);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expect(page.getByRole("heading", { name: /^Films \(\d+\)$/ })).toBeVisible();
  });

  test("more measures can be ranked", async ({ page }) => {
    await page.goto("/star-score");
    await page.locator("#leaderboard select").selectOption("releaseGap");
    await expect(page.locator("#leaderboard h2")).toContainText("gap between films");
  });

  test("fan ranking stays hidden unless switched on", async ({ page, request }) => {
    await page.goto("/star-score");
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
    await expect(page.getByRole("heading", { name: /^Films \(\d+\)$/ })).toBeVisible();
    await expect(page.locator("#films")).toContainText("Baahubali 2: The Conclusion");
    await page.locator("#films").getByRole("button", { name: /Details/ }).first().click();
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
  for (const path of ["/", "/star-score", "/tolly-index", "/heroes", "/hero/prabhas", "/hero/allari-naresh", "/hero/sivaji", "/rankings", "/compare", "/trends", "/methodology", "/annexure", "/annexure/registry", "/annexure/heroes/nani", "/annexure/corrections", "/annexure/sources", "/terms", "/privacy"]) {
    test(`no horizontal page overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const [scrollW, clientW] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollW).toBeLessThanOrEqual(clientW);
    });
  }
});

test.describe("Tolly Index", () => {
  test("ranking page lists ranked heroes with bands, and the heroes still waiting for data", async ({ page }) => {
    await page.goto("/tolly-index");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tolly Index");
    await expect(page.getByRole("navigation", { name: "Main" })).toContainText("Tolly Index");
    await expect(page.locator("#ranking")).toContainText("Hero ranking");
    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(40);
    await expect(rows.first()).toContainText("±");
    await expect(page.locator("#unranked")).toContainText("Not ranked yet");
    await expect(page.locator("body")).not.toContainText("Panja Vaisshnav Tej");
  });

  test("hero page shows the index, its pillars and each film's score", async ({ page }) => {
    await page.goto("/hero/allari-naresh");
    const card = page.locator("#tolly");
    await expect(card).toContainText("Tolly Index");
    await expect(card).toContainText(/#\d+ of \d+ heroes/);
    await expect(card).toContainText("Staying power");
    await expect(page.locator("#films thead")).toContainText("Tolly Index");
  });

  test("the how-it-works page holds the method for both scores", async ({ page }) => {
    await page.goto("/methodology");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("How it works");
    await expect(page.locator("#tolly-index")).toContainText("Three rules keep it fair");
    await expect(page.locator("#how")).toContainText("Star Score and the other numbers");
    await expect(page.getByRole("link", { name: /Sources and data licences/ }).first()).toBeVisible();
  });

  test("hero page shows age and profile facts", async ({ page }) => {
    await page.goto("/hero/chiranjeevi");
    await expect(page.locator("#facts")).toContainText(/Age \d+ · born 22 Aug 1955/);
    await expect(page.getByRole("region", { name: "Profile" })).toContainText("Padma Vibhushan");
  });
});

test.describe("Legal", () => {
  test("every page credits IMDb and links the terms and privacy policy", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toContainText("Information courtesy of IMDb (https://www.imdb.com). Used with permission.");
    await expect(footer.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "Terms of use" })).toHaveAttribute("href", "/terms");
  });

  test("the source ledger lists each data licence", async ({ page }) => {
    await page.goto("/annexure/sources");
    await expect(page.locator("body")).toContainText("IMDb non-commercial datasets");
    await expect(page.locator("body")).toContainText("CC BY-SA 4.0");
  });
});

test.describe("Home page", () => {
  test("leads with the Tolly Index: podium, top 10, one chart and ways to go deeper", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("biggest hero");
    await expect(page.getByRole("list", { name: "Top three heroes" }).getByRole("link")).toHaveCount(3);
    await expect(page.locator("section:has(#top10) ol > li")).toHaveCount(10);
    // One chart: success ratio against number of films, coloured by debut era or film family.
    const chart = page.locator("section:has(#home-chart)");
    await expect(chart.getByRole("group", { name: /number of films as lead/ })).toBeVisible();
    expect(await chart.locator("svg [role=button]").count()).toBeGreaterThan(30);
    await expect(chart).toContainText("Debut 2000–2007");
    await chart.getByRole("radio", { name: "Film family" }).click();
    await expect(chart).toContainText("Mega family");
    await chart.getByRole("radio", { name: "Loved vs. followed" }).click();
    expect(await page.getByRole("list", { name: "Heroes by film score and followers" }).getByRole("link").count()).toBeGreaterThan(30);
    // Only the essentials: the full dashboard lives on the Star Score page.
    await expect(page.locator("#leaderboard")).toHaveCount(0);
    await expect(page.locator("#table")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Star Score" })).toHaveAttribute("href", "/star-score");
    await expect(page.locator("body")).not.toContainText("Panja Vaisshnav Tej");
    expect(errors).toEqual([]);
  });

  test("find your hero opens his page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Find a hero" }).fill("prab");
    await page.getByRole("list", { name: "Matching heroes" }).getByRole("link", { name: /Prabhas/ }).click();
    await expect(page).toHaveURL(/\/hero\/prabhas$/);
  });

  test("head to head compares any two heroes factor by factor", async ({ page }) => {
    await page.goto("/");
    const duel = page.locator("section:has(#duel)");
    await duel.getByLabel("First hero").selectOption("prabhas");
    await duel.getByLabel("Second hero").selectOption("mahesh-babu");
    await expect(duel.getByRole("list", { name: "Prabhas against Mahesh Babu, factor by factor" }).getByRole("listitem")).toHaveCount(5);
    await expect(duel.getByRole("link", { name: "Compare every number →" })).toHaveAttribute("href", "/compare?heroes=prabhas,mahesh-babu");
  });

  test("the opening animation is skipped for reduced motion and never blocks the page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("intro")).toHaveCount(0);
  });
});

test.describe("Opening animation", () => {
  test.use({ reducedMotion: "no-preference" });

  test("plays once per session, can be skipped, and clears itself", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await expect(page.getByTestId("intro")).toBeVisible();
    await page.getByRole("button", { name: "Skip intro" }).click();
    await expect(page.getByTestId("intro")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("intro")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("ends by itself", async ({ page }) => {
    await page.goto("/heroes");
    await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 8000 });
  });
});
