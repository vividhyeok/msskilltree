import { test, expect, type Page } from "@playwright/test";

async function configure(page: Page) {
  await page
    .getByRole("button", { name: "Run 상황 설정", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Run 설정", exact: true });
  await dialog.getByLabel("이번 Run 목표").selectOption("first_60m");
  await dialog.getByLabel("빌드 방향").selectOption("ultimate_survival_pe");
  await dialog.getByLabel("현재 시간대").selectOption("mid");
  await dialog.getByLabel("게임 버전", { exact: true }).fill("0.992");
  await dialog
    .getByText("클래스·실험체·궁극기 / 성장 예산", { exact: true })
    .click();
  await dialog.getByLabel("남은 마법 선택 횟수").fill("15");
  await dialog.getByRole("button", { name: "설정 저장" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-06T10:00:00Z"));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
});

test("tablet live flow: setup, contextual goal, fixed tiles, level budget and Undo", async ({
  page,
}) => {
  const positions = () =>
    page
      .locator(".magic-tile")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-magic-id")));
  const before = await positions();
  await configure(page);
  const pe = page.locator('[data-meta-ref="combination:perpetual_engine"]');
  await expect(pe).toContainText("현재 빌드 핵심");
  await pe.getByRole("button", { name: "목표 지정", exact: true }).click();
  await expect(
    page.locator('.need-row[data-need-magic="magic_circle"]'),
  ).toBeVisible();
  await expect(
    page.locator('.need-row[data-need-magic="intelligence"]'),
  ).toBeVisible();
  const needBox = await page.locator(".need-section").boundingBox();
  const targetBox = await page.locator(".target-section").boundingBox();
  expect(needBox!.y).toBeLessThan(targetBox!.y);
  await page.getByRole("button", { name: "마법진 레벨 올리기" }).click();
  expect(await positions()).toEqual(before);
  await expect(page.locator(".context-budget")).toContainText("14회");
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  await expect(page.locator(".context-budget")).toContainText("15회");
  await expect(page.locator('[data-magic-id="magic_circle"]')).toContainText(
    "0/5",
  );
  await page.getByRole("button", { name: "전체 추천", exact: true }).click();
  await page.locator(".growth-plan > summary").click();
  await expect(
    page.locator(".growth-plan .recommendation-summary"),
  ).toBeVisible();
  await page.locator(".growth-plan > summary").click();
  await page.locator(".path-scroll").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/meta-tablet-live.png" });
  await page.reload();
  await expect(page.locator(".run-context-bar")).toContainText("첫 60분");
  await expect(page.locator(".context-budget")).toContainText("15회");
  await expect(page.locator(".target-section")).toContainText("무한동력");
});

test("artifact compare records only the chosen item, survives reload, and undoes", async ({
  page,
}) => {
  await configure(page);
  await page.getByRole("button", { name: "유물 선택", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "유물 선택 비교",
    exact: true,
  });
  await dialog.getByLabel("유물 후보 1").selectOption("ouroboros");
  await dialog.getByLabel("유물 후보 2").selectOption("nexus");
  await dialog.getByLabel("유물 후보 3").selectOption("gear");
  await expect(
    dialog.locator("[data-artifact-result]").first(),
  ).toHaveAttribute("data-artifact-result", "ouroboros");
  const top = dialog.locator('[data-artifact-result="ouroboros"]');
  await top.getByText("이유·근거 보기", { exact: true }).click();
  await expect(
    top.locator('a[href*="gall.dcinside.com"]').first(),
  ).toBeVisible();
  await top.getByText("이유·근거 보기", { exact: true }).click();
  await page.screenshot({ path: "test-results/meta-artifact-compare.png" });
  await top.getByRole("button", { name: "우로보로스 선택 기록" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".run-context-bar")).toContainText("보유 1");
  await page.reload();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("ms-companion-v1")!).run.meta.artifacts,
    ),
  ).toEqual(["ouroboros"]);
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("ms-companion-v1")!).run.meta.artifacts,
    ),
  ).toEqual([]);
});

test("manual synergy proximity changes comparison and patch mismatch is cautious", async ({
  page,
}) => {
  await configure(page);
  await page.getByRole("button", { name: "유물 선택", exact: true }).click();
  const artifacts = page.getByRole("dialog", {
    name: "유물 선택 비교",
    exact: true,
  });
  await artifacts.getByLabel("유물 후보 1").selectOption("gear");
  await artifacts
    .getByText("시너지 완성이 가까운 후보가 있나요?", { exact: true })
    .click();
  await artifacts.getByLabel("톱니바퀴의 시너지").selectOption("oracle");
  await artifacts.getByLabel("톱니바퀴 남은 재료 수").fill("1");
  await artifacts.getByLabel("고희귀 핵심 재료 보유").check();
  await expect(artifacts.locator(".meta-priority")).toHaveText(
    "현재 상황에서 높음",
  );
  await artifacts.getByRole("button", { name: "상황 수정" }).click();
  const setup = page.getByRole("dialog", { name: "Run 설정", exact: true });
  await setup.getByLabel("게임 버전", { exact: true }).fill("0.993");
  await setup.getByRole("button", { name: "설정 저장" }).click();
  await expect(artifacts.locator(".meta-stamp")).toContainText("재검증 필요");
  await expect(artifacts.locator(".meta-priority")).toHaveText(
    "조건 확인 필요",
  );
});

test("four artifact choices remain comparable on a landscape tablet", async ({ page }) => {
  await configure(page);
  await page.getByRole("button", { name: "유물 선택", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "유물 선택 비교", exact: true });
  await dialog.getByRole("button", { name: "네 번째 후보 추가" }).click();
  for (const [index, id] of ["ouroboros", "nexus", "gear", "accelerator"].entries())
    await dialog.getByLabel(`유물 후보 ${index + 1}`).selectOption(id);
  await expect(dialog.locator("[data-artifact-result]")).toHaveCount(4);
  for (const button of await dialog.getByRole("button", { name: /선택 기록$/ }).all())
    await expect(button).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: "test-results/meta-artifact-four.png" });
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/meta-artifact-four-portrait.png" });
});

test("support trait picker labels meta as advice and never offers consumed support", async ({
  page,
}) => {
  await configure(page);
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "보호막 레벨 올리기" }).click();
  const dialog = page.getByRole("dialog", {
    name: "보호막 · Lv.5 특성",
    exact: true,
  });
  await expect(
    dialog.getByRole("button", { name: "재구축 선택", exact: true }),
  ).toContainText("커뮤니티 · 현재 빌드 핵심");
  await page.screenshot({ path: "test-results/meta-trait-advice.png" });
  await dialog
    .getByRole("button", { name: "재구축 선택", exact: true })
    .click();
  await page.getByRole("button", { name: "전체 추천", exact: true }).click();
  await expect(
    page.locator('[data-meta-ref="active:shield_reconstruction"]'),
  ).toHaveCount(0);
});

for (const [width, height] of [
  [768, 1024],
  [1280, 800],
  [390, 844],
]) {
  test(`meta live-play fits ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await configure(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const button of await page.locator(".tile-add,.tile-inspect").all()) {
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    if (width === 390)
      await page
        .getByRole("button", { name: "목표 / 조합 보기", exact: true })
        .click();
    await expect(
      page.getByRole("region", { name: "상황별 추천", exact: true }).last(),
    ).toBeVisible();
    await page.screenshot({ path: `test-results/meta-live-${width}.png` });
  });
}
