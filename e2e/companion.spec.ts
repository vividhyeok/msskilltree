import { test, expect } from "@playwright/test";
test('pre-run ultimate planning exposes class, subject and fusion requirements', async ({page}) => {
  await page.setViewportSize({width:1024,height:768});
  await page.goto('/');
  await page.getByRole('button',{name:'Run 상황 설정',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByText('클래스·실험체·궁극기 / 성장 예산',{exact:true}).click();
  await dialog.getByRole('combobox',{name:'궁극기',exact:true}).selectOption('berserk');
  await expect(dialog.locator('.growth-stage')).toContainText('클래스 · 전투마법사');
  await expect(dialog.locator('.growth-stage')).toContainText('실험체 · 전투마법사');
  await dialog.getByRole('combobox',{name:'클래스',exact:true}).selectOption('battlemage');
  await dialog.getByRole('combobox',{name:'실험체',exact:true}).selectOption('battlemage');
  await expect(dialog.locator('.growth-stage')).toContainText('✓ 클래스');
  await expect(dialog.locator('.growth-stage')).toContainText('✓ 실험체');
  await expect(dialog.locator('.growth-stage')).toContainText('○ 필수 조합');
});
test("tablet growth choices, separate MAX records, undo and timer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "패시브 · 성장", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".companion-pick")).toHaveCount(11);
  await dialog.getByRole("button", { name: /고속시전/ }).click();
  await expect(dialog.getByRole("button", { name: /고속시전/ })).toContainText(
    "1/3",
  );
  await dialog
    .getByRole("button", { name: "특수 패시브", exact: true })
    .click();
  await expect(dialog.locator(".companion-pick")).toHaveCount(24);
  await dialog.getByRole("button", { name: /무언영창/ }).click();
  await expect(dialog.getByRole("button", { name: /무언영창/ })).toBeDisabled();
  await dialog
    .getByRole("button", { name: "MAX 성장 패시브", exact: true })
    .click();
  await expect(dialog.locator(".companion-pick")).toHaveCount(9);
  await expect(dialog.getByRole("button", { name: /고속시전/ })).toBeDisabled();
  await dialog.getByLabel("현재 MAX 이후 성장 패시브 선택 중").check();
  await dialog.getByRole("button", { name: /고속시전/ }).click();
  await expect(dialog.getByRole("button", { name: /고속시전/ })).toContainText(
    "1/8",
  );
  await page.screenshot({ path: "test-results/v4-growth-tablet.png" });
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "패시브 · 성장", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "MAX 성장 패시브", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /고속시전/ }),
  ).toContainText("0/8");
  await page
    .getByRole("dialog")
    .getByLabel("현재 MAX 이후 성장 패시브 선택 중")
    .uncheck();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "닫기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run 타이머 시작", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run 타이머 일시정지", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run 타이머 일시정지", exact: true })
    .click();
  await expect(page.locator(".magic-tile")).toHaveCount(21);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/v4-live-tablet.png" });
});
test("artifact quick search explains automatic recipe completion", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("ms-companion-v1")!);
    s.run.meta.artifacts = ["second_heart", "bio_shield"];
    localStorage.setItem("ms-companion-v1", JSON.stringify(s));
  });
  await page.reload();
  await page.getByRole("button", { name: /^유물 선택/ }).click();
  await page.getByLabel("유물 빠른 검색").fill("혈액팩");
  await page.locator(".artifact-quick button").click();
  await expect(page.locator(".artifact-results")).toContainText(
    "이 선택으로 힐링 팩터 완성",
  );
  await page
    .locator(".artifact-results")
    .getByRole("button", { name: /선택 기록/ })
    .click();
  await page.getByRole("button", { name: /^유물 선택/ }).click();
  await expect(page.locator(".companion-details summary")).toContainText(
    "1개 완성",
  );
});
