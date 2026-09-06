import { test, expect, type Page } from "@playwright/test";
const fresh = () => ({
  version: 1,
  run: {
    levels: {},
    selectedTraits: {},
    completed: [],
    pinned: [],
    bonus: false,
  },
  history: [],
  builds: [] as { id: string; name: string; pinned: string[] }[],
  filter: "all",
  audit: {},
});
const tile = (page: Page, id: string) =>
  page.locator(`[data-magic-id="${id}"]`);
async function menu(page: Page, name: string) {
  await page.getByRole("button", { name: "더보기", exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
}
async function seedBuild(page: Page) {
  const saved = fresh();
  saved.builds = [
    {
      id: "starter",
      name: "화염과 번개",
      pinned: ["demon_equation", "lightning_blast"],
    },
  ];
  await page.addInitScript((s) => {
    if (!localStorage.getItem("ms-companion-v1"))
      localStorage.setItem("ms-companion-v1", JSON.stringify(s));
  }, saved);
  await page.goto("/");
  await menu(page, "저장한 빌드");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "새 Run으로 불러오기" }).click();
}
test("saved build glance, inspect versus record, traits, completion, locks, undo and restore", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await seedBuild(page);
  const need = page.getByRole("region", { name: "지금 필요한 마법" });
  for (const [name, trait] of [
    ["화염구", "대폭발"],
    ["에너지탄", "플레어"],
    ["낙뢰", "청천벽력"],
    ["전기충격", "연쇄 번개"],
  ]) {
    await expect(need).toContainText(name);
    await expect(need).toContainText(trait);
  }
  const energy = need.locator('[data-need-magic="energy_bolt"]');
  await expect(energy).toBeInViewport({ ratio: 1 });
  await expect(energy.locator(".badge")).toHaveText("A");
  const before = await page.locator(".magic-tile").evaluateAll((els) =>
    els.map((el) => ({
      id: el.getAttribute("data-magic-id"),
      x: el.getBoundingClientRect().x,
      y: el.getBoundingClientRect().y,
    })),
  );
  await page.getByRole("button", { name: "화염구 레벨 올리기" }).click();
  await expect(tile(page, "fireball")).toContainText("1/7");
  await expect(tile(page, "fireball").locator(".badge")).toHaveText("A");
  await page.getByRole("button", { name: "낙뢰 경로 보기" }).click();
  await expect(tile(page, "thunderstorm")).toContainText("0/7");
  await expect(
    page.getByRole("region", { name: "선택한 마법 경로" }),
  ).toContainText("청천벽력");
  const targetBox = await page.locator(".target-section").boundingBox();
  const needBox = await page.locator(".need-section").boundingBox();
  await page
    .locator(".path-scroll")
    .evaluate((el) => (el.scrollTop = el.scrollHeight));
  expect(await page.locator(".target-section").boundingBox()).toEqual(
    targetBox,
  );
  expect(await page.locator(".need-section").boundingBox()).toEqual(needBox);
  for (let i = 1; i < 7; i++)
    await page.getByRole("button", { name: "화염구 레벨 올리기" }).click();
  await page.getByRole("button", { name: "독가스 선택", exact: true }).click();
  await expect(page.getByText("A 데몬 방정식이 막힙니다.")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("필요: 대폭발");
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page.getByRole("button", { name: "대폭발 선택", exact: true }).click();
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "에너지탄 레벨 올리기" }).click();
  await page.getByRole("button", { name: "플레어 선택", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "데몬 방정식 조합 완료" }),
  ).toBeVisible();
  await expect(need.locator('[data-need-magic="energy_bolt"]')).toHaveCount(0);
  await page.getByRole("button", { name: "데몬 방정식 조합 완료" }).click();
  await expect(tile(page, "fireball")).toContainText("→ 승계");
  await expect(tile(page, "energy_bolt")).toContainText("× 병합·소멸");
  await expect(tile(page, "energy_bolt").locator(".tile-add")).toHaveCount(0);
  await expect(page.locator(".slots")).toContainText("1");
  // Recording no longer moves the path being inspected.
  await expect(page.locator(".focus-title h2")).toHaveText("낙뢰");
  await page
    .getByRole("button", { name: "에너지탄 경로 보기", exact: true })
    .click();
  await expect(page.locator(".path-pin")).toHaveCount(0);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.locator(".slots")).toContainText("0");
  await page.reload();
  await expect(tile(page, "fireball")).toContainText("대폭발");
  expect(
    await page.locator(".magic-tile").evaluateAll((els) =>
      els.map((el) => ({
        id: el.getAttribute("data-magic-id"),
        x: el.getBoundingClientRect().x,
        y: el.getBoundingClientRect().y,
      })),
    ),
  ).not.toEqual(before);
  await expect(page.locator(".magic-tile").first()).toHaveAttribute(
    "data-magic-id",
    "energy_bolt",
  );
  await expect(page.locator(".growth-plan > summary")).toBeVisible();
  await page.getByRole("button", { name: "화염구 경로 보기" }).click();
  await page.getByRole("button", { name: "전체 추천", exact: true }).click();
  await expect(page.locator(".growth-plan > summary")).toBeVisible();
  await menu(page, "저장한 빌드");
  await page.getByPlaceholder("예: 번개 빌드").fill("검증 빌드");
  await page.getByRole("button", { name: "현재 목표를 빌드로 저장" }).click();
  await expect(page.getByText("검증 빌드", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.screenshot({ path: "test-results/hud-1024-targets.png" });
  await page.goto("/audit");
  await page.getByRole("button", { name: "일치", exact: true }).first().click();
  await page.reload();
  await expect(page.getByText("1 / 63 확인", { exact: false })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "corrections.json 내보내기" }).click();
  expect((await download).suggestedFilename()).toBe("corrections.json");
});
test("one-tap path pinning and conflicting badges", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "화염구 경로 보기" }).click();
  await page
    .getByRole("button", { name: "데몬 방정식 목표 지정", exact: true })
    .click();
  await page
    .getByRole("button", { name: "원점폭발 목표 지정", exact: true })
    .click();
  await expect(tile(page, "energy_bolt").locator(".badge")).toHaveText([
    "A",
    "B",
  ]);
  await expect(page.getByRole("alert")).toContainText("동시 달성 불가");
  await expect(tile(page, "fireball")).toContainText("0/7");
  await page.getByRole("button", { name: "새 Run", exact: true }).click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(tile(page, "fireball").locator(".badge")).toHaveCount(2);
  await page.getByRole("button", { name: "새 Run", exact: true }).click();
  await page.getByRole("button", { name: "새 Run 시작" }).click();
  await expect(tile(page, "fireball").locator(".badge")).toHaveCount(0);
});
for (const [width, height] of [
  [1024, 768],
  [768, 1024],
  [1280, 800],
  [390, 844],
])
  test(`HUD fits ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seedBuild(page);
    await expect(page.locator(".magic-tile")).toHaveCount(21);
    await expect(page.locator(".passive-tile")).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width > 650) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
      for (const el of await page.locator(".magic-tile,.passive-tile").all())
        await expect(el).toBeInViewport({ ratio: 1 });
      const header = await page.locator("header").boundingBox();
      expect(header!.height).toBeLessThanOrEqual(54);
      for (const el of await page
        .locator(".tile-add,.tile-inspect,.passive-add")
        .all()) {
        const b = await el.boundingBox();
        expect(b!.width).toBeGreaterThanOrEqual(44);
        expect(b!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page.getByRole("button", { name: "화염구 경로 보기" }).click();
    if (width === 390) await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({
      path: `test-results/hud-${width}.png`,
      fullPage: true,
    });
  });
test("offline reload retains run", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "화염구 레벨 올리기" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForTimeout(1500);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(tile(page, "fireball")).toContainText("1/7");
  await context.setOffline(false);
});

test("three targets and six ingredients stay visible at 1024x768", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const saved = {
    ...fresh(),
    run: {
      ...fresh().run,
      pinned: ["demon_equation", "lightning_blast", "black_hole"],
    },
  };
  await page.addInitScript(
    (s) => localStorage.setItem("ms-companion-v1", JSON.stringify(s)),
    saved,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "화염구 경로 보기" }).click();
  await expect(page.locator(".target-row")).toHaveCount(3);
  await expect(page.locator(".need-row")).toHaveCount(6);
  for (const el of await page.locator(".target-row,.need-row").all())
    await expect(el).toBeInViewport({ ratio: 1 });
  expect(
    await page
      .locator(".target-section")
      .evaluate((el) => el.scrollHeight <= el.clientHeight),
  ).toBe(true);
  expect(
    await page
      .locator(".need-section")
      .evaluate((el) => el.scrollHeight <= el.clientHeight),
  ).toBe(true);
  await expect(page.locator(".path-group").first()).toBeInViewport();
  await page.screenshot({ path: "test-results/hud-three-targets.png" });
});
