import { expect, test } from "@playwright/test";

test.describe("Index explorer", () => {
  test("the old Star Score and Rankings pages open as views of the explorer", async ({ page }) => {
    await page.goto("/star-score");
    await expect(page).toHaveURL(/\/tolly-index\?view=boxoffice/);
    await expect(page.getByRole("radio", { name: "Box office", checked: true })).toBeVisible();
    await expect(page.locator("#explorer thead")).toContainText("Box office score");
    await page.goto("/rankings?metric=releaseGap");
    await expect(page).toHaveURL(/view=table/);
    await expect(page.locator("#explorer th[aria-sort=ascending]")).toContainText("Gap");
  });

  test("one frame, three views, synced to the address bar", async ({ page }) => {
    await page.goto("/tolly-index");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Tolly Index");
    await expect(page.getByRole("group", { name: "Tolly Index ledger" })).toBeVisible();
    await page.getByRole("radio", { name: "Table" }).click();
    await expect(page).toHaveURL(/view=table/);
    const rows = page.locator("#explorer tbody tr");
    expect(await rows.count()).toBeGreaterThan(40);
    await expect(rows.first()).toContainText("±");
    await expect(page.locator("#explorer th[aria-sort=descending]")).toContainText("Tolly Index");
    // No weights or shares are published anywhere on the page.
    await expect(page.locator("#explorer thead")).not.toContainText("%");
    await page.locator("#explorer th", { hasText: "Fame" }).getByRole("button").click();
    await expect(page).toHaveURL(/metric=fame/);
    await expect(page.locator("#explorer th[aria-sort=descending]")).toContainText("Fame");
    await page.getByRole("radio", { name: "Scatter" }).click();
    await page.getByRole("button", { name: /^Up/ }).click();
    await page.getByRole("option", { name: "Hit rate" }).click();
    await expect(page).toHaveURL(/y=hitRate/);
    await expect(page.locator("#explorer svg[role=img]")).toHaveAttribute("aria-label", /Hit rate against Reported gross/);
  });

  test("heroes outside the index give their real reason", async ({ page }) => {
    await page.goto("/tolly-index");
    const outside = page.locator("section:has(#outside)");
    await expect(outside).toContainText("Vijay");
    await expect(outside).toContainText("Box-office record being checked");
    await expect(page.locator("body")).not.toContainText(/too few/i);
    await expect(page.locator("body")).not.toContainText("Panja Vaisshnav Tej");
  });

  test("fan ranking stays hidden unless switched on", async ({ page, request }) => {
    await page.goto("/tolly-index");
    await expect(page.locator("#fan-ranking")).toHaveCount(0);
    expect((await request.get("/api/user-ranking")).status()).toBe(404);
  });
});

test.describe("Other views", () => {
  test("compare two heroes", async ({ page }) => {
    await page.goto("/compare?heroes=nani,prabhas");
    await expect(page.getByRole("heading", { name: "Careers, film by film" })).toBeVisible();
    await expect(page.locator("#numbers table")).toContainText("Prabhas");
    await page.getByRole("radio", { name: "Years since debut" }).click();
    await expect(page.locator("#reels svg[role=img]")).toHaveAttribute("aria-label", /years since debut/);
    await page.getByRole("button", { name: "Remove Nani" }).click();
    await expect(page).toHaveURL(/heroes=prabhas$/);
  });

  test("compare defaults to the index No. 1 and No. 2", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("group", { name: "Heroes being compared" })).toContainText("#1");
    await expect(page.getByRole("group", { name: "Heroes being compared" })).toContainText("#2");
  });

  test("hero page: one score, the career reel, where he stands and every film with its source", async ({ page }) => {
    await page.goto("/hero/prabhas");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prabhas");
    await expect(page.locator("main")).not.toContainText("Star Score");
    await expect(page.getByRole("img", { name: /Prabhas/ }).first()).toBeVisible();
    await expect(page.locator("section:has(#standing)")).toContainText("typical");
    const films = page.locator("section:has(#films)");
    await expect(films).toContainText("Baahubali 2: The Conclusion");
    await films.getByRole("button", { name: /Show details for Baahubali 2/ }).first().click();
    await expect(films).toContainText("Open the film page");
  });
  test("each film's result names its source (Kithakithalu is a hit)", async ({ page }) => {
    await page.goto("/hero/allari-naresh");
    const films = page.locator("section:has(#films)");
    await films.getByRole("button", { name: "Show details for Kithakithalu" }).first().click();
    await expect(films).toContainText("Source:");
    await expect(films.getByRole("link", { name: "Kithakithalu" }).first()).toHaveAttribute("href", /\/film\/kithakithalu-2006/);
  });
  test("all heroes ledger: search, group and light up a director", async ({ page }) => {
    await page.goto("/heroes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Heroes");
    expect(await page.locator("#heroes a[href^='/hero/']").count()).toBeGreaterThan(80);
    await page.getByRole("radio", { name: "Family" }).click();
    await expect(page).toHaveURL(/group=family/);
    await expect(page.getByRole("heading", { name: /Mega family/ })).toBeVisible();
    await page.getByPlaceholder("Find a hero").fill("Satyadev");
    await expect(page.locator("#heroes a[href^='/hero/']")).toHaveCount(1);
    await page.getByPlaceholder("Find a hero").fill("");
    await page.getByRole("combobox", { name: /director/ }).fill("Rajamouli");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /Showing S\. S\. Rajamouli/ })).toBeVisible();
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
  for (const path of ["/", "/tolly-index", "/tolly-index?view=table", "/tolly-index?view=scatter", "/heroes", "/hero/prabhas", "/hero/allari-naresh", "/hero/sivaji", "/compare", "/compare?heroes=prabhas,jr-ntr,ram-charan,nani", "/releases", "/directors", "/director/s-s-rajamouli", "/films", "/film/baahubali-2-the-conclusion-2017", "/methodology", "/annexure", "/annexure/registry", "/annexure/heroes/nani", "/annexure/corrections", "/annexure/sources", "/terms", "/privacy", "/careers", "/contact"]) {
    test(`no horizontal page overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const [scrollW, clientW] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollW).toBeLessThanOrEqual(clientW);
    });
  }
});

test.describe("Tolly Index", () => {
  test("hero page shows the index, its rank, the five parts and all 15 numbers, without weights", async ({ page }) => {
    await page.goto("/hero/allari-naresh");
    await expect(page.locator("main")).toContainText(/#\d+ of \d+/);
    const standing = page.locator("section:has(#standing)");
    await expect(standing).toContainText("Audience");
    await standing.getByText(/All 15 numbers/).click();
    await expect(standing.locator("table tbody tr")).toHaveCount(5 + 15);
    await expect(standing).not.toContainText(/\b37%|weight/i);
  });
  test("how it works explains the idea without naming data providers", async ({ page }) => {
    await page.goto("/methodology");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("How it works");
    await expect(page.locator("main")).toContainText("our own formula");
    await expect(page.locator("main")).toContainText("secret masala");
    await expect(page.locator("main")).not.toContainText(/IMDb|TMDB|Letterboxd/);
    await expect(page.getByRole("link", { name: /Data credits/ }).first()).toBeVisible();
  });
  test("films explorer: budget against gross, ranked lists, shareable tabs", async ({ page }) => {
    await page.goto("/films?tab=biggest");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main")).toContainText("Baahubali 2");
    await expect(page.locator("main")).not.toContainText(/IMDb|votes/);
  });

  test("film page: the result, the score and where it sits", async ({ page }) => {
    await page.goto("/film/baahubali-2-the-conclusion-2017");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Baahubali 2: The Conclusion");
    await expect(page.getByRole("link", { name: "Prabhas" }).first()).toHaveAttribute("href", "/hero/prabhas");
    await expect(page.locator("#sits")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/IMDb|votes/);
  });
  test("careers and contact pages are linked from the footer", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).not.toContainText(/IMDb|TMDB/);
    await footer.getByRole("link", { name: "Careers" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Careers");
    await expect(page.getByRole("form", { name: "Post a job" })).toBeVisible();
    await page.goto("/contact");
    await expect(page.getByRole("link", { name: "info@tollyanalysis.com" }).first()).toHaveAttribute("href", "mailto:info@tollyanalysis.com");
  });

  test("hero page shows age and profile facts", async ({ page }) => {
    await page.goto("/hero/chiranjeevi");
    const about = page.locator("section:has(#about)");
    await expect(about).toContainText(/22 Aug 1955.*age \d+/);
    await expect(about).toContainText("Padma Vibhushan");
  });
});

test.describe("Legal", () => {
  test("every page links the data credits, terms and privacy policy", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Data credits" }).first()).toHaveAttribute("href", "/annexure/sources");
    await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "Terms of use" })).toHaveAttribute("href", "/terms");
  });

  test("the source ledger lists each data licence", async ({ page }) => {
    await page.goto("/annexure/sources");
    await expect(page.locator("body")).toContainText("IMDb non-commercial datasets");
    await expect(page.locator("body")).toContainText("CC BY-SA 4.0");
  });
});

test.describe("Home page", () => {
  test("leads with the Tolly Index as careers on one timeline, findings, a duel and this year", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("biggest hero");
    const index = page.locator("#index");
    // Ten careers up front; the rest one click away.
    await expect(index.locator("a[href^='/hero/']:visible")).toHaveCount(10);
    await expect(index.locator("a[href^='/hero/']:visible").first()).toHaveAttribute("href", "/hero/allu-arjun");
    // Re-rank by another number: the rows re-sort (and the reading order follows).
    await index.getByRole("radio", { name: "Films" }).click();
    await expect(index.locator("a[href^='/hero/']:visible").first()).not.toHaveAttribute("href", "/hero/allu-arjun");
    await index.getByRole("button", { name: /Show all \d+/ }).click();
    expect(await index.locator("a[href^='/hero/']:visible").count()).toBeGreaterThan(40);
    await expect(page.locator("section:has(#findings) ol > li")).toHaveCount(4);
    await expect(page.locator("header")).not.toContainText("Star Score");
    await expect(page.locator("body")).not.toContainText("Panja Vaisshnav Tej");
    expect(errors).toEqual([]);
  });
  test("the career reel names every film on hover or keyboard, and marks the next film", async ({ page }) => {
    await page.goto("/hero/vishwak-sen");
    const reel = page.locator("section#reel, section:has(#reel-t)").first();
    const graph = reel.getByRole("img").first();
    await graph.scrollIntoViewIfNeeded();
    await graph.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tooltip")).toBeVisible();
  });
  test("directors: a ledger ranked by hit rate, a pairings matrix, and a page per director", async ({ page }) => {
    await page.goto("/directors");
    const ledger = page.locator("#ledger");
    await expect(ledger.getByRole("link", { name: /S\. S\. Rajamouli/ }).first()).toBeVisible();
    // Pairings: E. V. V. Satyanarayana × Allari Naresh reads "8 films, 6 hits".
    const cell = page.getByRole("gridcell").getByRole("button", { name: /E\. V\. V\. Satyanarayana × Allari Naresh: 8 films, 6 hits/ });
    await cell.hover();
    await expect(page.getByRole("tooltip")).toContainText("8 films, 6 hits");
    await ledger.getByRole("link", { name: /S\. S\. Rajamouli/ }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("S. S. Rajamouli");
    await expect(page).toHaveTitle(/S\. S\. Rajamouli — 12 of 12 hits/);
    await expect(page.getByRole("img", { name: /S\. S\. Rajamouli: 12 films on a timeline/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jr NTR" }).first()).toHaveAttribute("href", "/hero/jr-ntr");
  });

  test("years: releases per year, a week strip and each year's film list", async ({ page }) => {
    await page.goto("/releases");
    await expect(page.getByRole("img", { name: /Telugu releases per year, 2000 to/ })).toBeVisible();
    expect(await page.getByTestId("release-list").locator("li").count()).toBeGreaterThan(30);
    await page.goto("/releases?year=2020#list");
    await expect(page.getByRole("heading", { name: "2020", exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "Type of release" }).getByRole("link", { name: /OTT/ }).click();
    await expect(page).toHaveURL(/type=ott/);
    await expect(page.getByTestId("release-list")).toContainText("Middle Class Melodies");
    await page.getByRole("link", { name: "Previous year, 2019" }).click();
    await expect(page.getByRole("heading", { name: "2019", exact: true })).toBeVisible();
    await page.goto("/trends");
    await expect(page).toHaveURL(/\/releases$/);
  });

  test("search finds heroes, films and directors from anywhere", async ({ page }) => {
    await page.goto("/releases");
    await page.keyboard.press("/");
    const box = page.getByRole("combobox");
    await box.fill("prab");
    await expect(page.getByRole("option", { name: /Prabhas/ }).first()).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/hero\/prabhas$/);
    await page.getByRole("button", { name: "Search heroes, films and directors" }).click();
    await page.getByRole("combobox").fill("baahu");
    await expect(page.getByRole("option").first()).toContainText("Baahubali");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/film\/baahubali/);
  });
  test("every film title is a link to its film page", async ({ page }) => {
    await page.goto("/director/s-s-rajamouli");
    await page.getByRole("link", { name: /^RRR/ }).first().click();
    await expect(page).toHaveURL(/\/film\/rrr-2022/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("RRR");
  });
  test("head to head compares any two heroes factor by factor", async ({ page }) => {
    await page.goto("/");
    const duel = page.locator("section:has(#duel)");
    await duel.getByLabel("First hero").selectOption("prabhas");
    await duel.getByLabel("Second hero").selectOption("mahesh-babu");
    await expect(duel.getByRole("list", { name: "Prabhas against Mahesh Babu, factor by factor" }).getByRole("listitem")).toHaveCount(5);
    await expect(duel.getByRole("link", { name: "Compare every number" })).toHaveAttribute("href", "/compare?heroes=prabhas,mahesh-babu");
  });

  test("no opening animation: the page is usable at once", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("intro")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

