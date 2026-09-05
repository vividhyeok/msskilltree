import { test, expect } from "@playwright/test";
test("run flow: goals, conflicts, traits, completion, Undo, restore, builds and audit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "목표 조합 선택" }).click();
  await page.getByRole("textbox", { name: "조합 검색" }).fill("데몬 방정식");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "목표 지정", exact: true })
    .click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(
    page
      .locator(".magic-card")
      .filter({ has: page.getByRole("button", { name: "화염구 레벨 올리기" }) })
      .locator(".badge"),
  ).toHaveText("A");
  await page.getByRole("button", { name: "조합 찾기" }).click();
  await page.getByRole("textbox", { name: "조합 검색" }).fill("원점폭발");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "목표 지정", exact: true })
    .click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.locator(".conflict")).toContainText("동시 달성 불가");
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "화염구 레벨 올리기" }).click();
  await page.getByRole("button", { name: /^독가스/ }).click();
  await expect(page.getByText("이 선택으로 목표가 막힙니다")).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page.getByRole("button", { name: /^대폭발/ }).click();
  if (await page.getByRole("button", { name: "그래도 선택" }).isVisible())
    await page.getByRole("button", { name: "그래도 선택" }).click();
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "에너지탄 레벨 올리기" }).click();
  await page.getByRole("button", { name: /^플레어/ }).click();
  await page
    .locator("aside .combo")
    .filter({ has: page.getByRole("heading", { name: /데몬 방정식/ }) })
    .getByRole("button", { name: "조합 완료" })
    .click();
  await expect(page.locator(".slots")).toContainText("1");
  await expect(
    page.getByRole("button", { name: "화염구 레벨 올리기" }),
  ).toContainText("조합에 사용됨");
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.locator(".slots")).toContainText("0");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "화염구 레벨 올리기" }),
  ).toContainText("대폭발");
  await page.getByRole("button", { name: "저장한 빌드" }).click();
  await page.getByPlaceholder("예: 번개 빌드").fill("화염");
  await page.getByRole("button", { name: "현재 목표를 빌드로 저장" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "새 Run으로 불러오기" }).click();
  await expect(
    page.getByRole("button", { name: "화염구 레벨 올리기" }),
  ).toContainText("Lv. 0");
  await page.goto("/audit");
  await page.getByRole("button", { name: "일치", exact: true }).first().click();
  await page.reload();
  await expect(page.getByText("1 / 63 확인", { exact: false })).toBeVisible();
});
for (const [width, height] of [
  [1024, 768],
  [768, 1024],
  [1280, 800],
  [390, 844],
])
  test(`responsive ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "현재 Run" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".magic-main")).toHaveCount(21);
    if (width === 390) {
      await page.getByRole("button", { name: /조합 후보/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    await page.screenshot({
      path: `test-results/run-${width}.png`,
      fullPage: true,
    });
  });
test("offline reload retains run and app shell", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "화염구 레벨 올리기" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForTimeout(1500);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "화염구 레벨 올리기" }),
  ).toContainText("Lv. 1");
  await context.setOffline(false);
});
