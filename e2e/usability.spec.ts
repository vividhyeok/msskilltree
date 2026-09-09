import { test, expect } from "@playwright/test";

for (const [width, height] of [
  [1024, 768],
  [768, 1024],
]) {
  test(`find a recipe and record without losing context at ${width}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const fixedOrder = await page
      .locator(".magic-tile")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-magic-id")));
    await page.getByRole("button", { name: "조합 찾기", exact: true }).click();
    const catalog = page.getByRole("dialog");
    await catalog.getByLabel("조합 검색").fill("데몬방정식");
    await expect(catalog.locator(".combo")).toHaveCount(1);
    await expect(catalog.locator(".recipe")).toContainText("화염구");
    await expect(catalog.locator(".recipe")).toContainText("대폭발");
    await expect(catalog.locator(".recipe")).toContainText("에너지탄");
    await expect(catalog.locator(".recipe")).toContainText("플레어");
    await page.screenshot({ path: `test-results/play-catalog-${width}.png` });
    await catalog
      .getByRole("button", { name: "목표 지정", exact: true })
      .click();
    await catalog.getByRole("button", { name: "닫기", exact: true }).click();
    const goal = page.locator(".target-row");
    await goal.locator("summary").click();
    await expect(goal.locator(".recipe")).toBeVisible();
    await expect(goal).toHaveCount(1);
    await expect(
      goal.getByRole("button", { name: "데몬 방정식 목표 해제", exact: true }),
    ).toBeVisible();
    await goal.locator("summary").click();
    await expect(goal.locator(".recipe")).not.toBeVisible();
    await expect(goal).toHaveCount(1);
    await page
      .getByRole("button", { name: "낙뢰 경로 보기", exact: true })
      .click();
    await page
      .getByRole("button", { name: "화염구 선택 기록", exact: true })
      .click();
    await expect(
      page.locator('.need-row[data-need-magic="fireball"]'),
    ).toContainText("1/7");
    await expect(page.locator(".focus-title h2")).toHaveText("낙뢰");
    await expect(page.getByRole("status")).toHaveText("화염구 Lv.1 기록");
    await page.getByRole("button", { name: "되돌리기", exact: true }).click();
    await expect(
      page.locator('.need-row[data-need-magic="fireball"]'),
    ).toContainText("0/7");

    // Live play keeps all magic tiles in one fixed spatial layout. Search/filter
    // belongs to the catalog, not the glance-and-record surface.
    await expect(page.getByLabel("마법 검색", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "목표 재료", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".magic-tile")).toHaveCount(21);
    expect(
      await page
        .locator(".magic-tile")
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-magic-id"))),
    ).toEqual(fixedOrder);

    await page
      .getByRole("button", { name: "화염구 경로 보기", exact: true })
      .click();
    await page.screenshot({ path: `test-results/play-recipes-${width}.png` });
    for (const button of await page
      .locator(
        ".tile-inspect,.tile-add,.need-inspect,.need-record,.target-heading",
      )
      .all()) {
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
