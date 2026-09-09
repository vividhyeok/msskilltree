import { test, expect } from "@playwright/test";

for (const [width, height] of [
  [1024, 768],
  [768, 1024],
]) {
  test(`completion roles and trait picker at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() =>
      localStorage.setItem(
        "ms-companion-v1",
        JSON.stringify({
          version: 1,
          run: {
            levels: { fireball: 7, energy_bolt: 7, electric_shock: 7 },
            selectedTraits: {
              fireball: { 7: "big_explosion" },
              energy_bolt: { 7: "flare" },
            },
            completed: [],
            pinned: ["demon_equation", "lightning_blast", "avatar"],
            bonus: false,
          },
          history: [],
          builds: [],
          filter: "all",
          audit: {},
        }),
      ),
    );
    await page.goto("/");
    const badges = page.locator(".target-heading .badge");
    const colors = await badges.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).backgroundColor),
    );
    expect(new Set(colors).size).toBe(3);
    await expect(page.locator('.target-row[data-target="A"]')).toContainText(
      "→ 승계",
    );
    await expect(page.locator('.target-row[data-target="A"]')).toContainText(
      "× 병합",
    );
    await page
      .getByRole("button", { name: "데몬 방정식 조합 완료", exact: true })
      .click();
    const carrier = page.locator('[data-magic-id="fireball"]');
    const material = page.locator('[data-magic-id="energy_bolt"]');
    await expect(carrier).toHaveAttribute("data-completion-role", "carrier");
    await expect(material).toHaveAttribute("data-completion-role", "material");
    for (const el of [carrier, material]) {
      await expect(el.locator(".tile-add")).toHaveCount(0);
      await expect(el).not.toContainText("7/7");
      await expect(el).toContainText("데몬 방정식");
    }
    await page.screenshot({
      path: `test-results/roles-completed-${width}.png`,
    });
    await page
      .getByRole("button", { name: "전기충격 경로 보기", exact: true })
      .click();
    await page
      .getByRole("button", { name: "전기충격 Lv.7 특성 수정", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    for (const button of await dialog.locator(".trait-option").all())
      await expect(button).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: `test-results/roles-trait-${width}.png` });
    await dialog.getByText("연쇄 번개 조합·효과 보기", { exact: true }).click();
    await expect(dialog).toContainText("에너지탄 × 데몬 방정식에 병합");
    await expect(dialog).not.toContainText("에너지탄 7/7");
    await expect(dialog.locator(".consumed-path")).toBeVisible();
    await page.screenshot({
      path: `test-results/roles-trait-expanded-${width}.png`,
    });
    await dialog.getByRole("button", { name: "닫기", exact: true }).click();
    await page.getByRole("button", { name: "되돌리기", exact: true }).click();
    await expect(carrier).not.toHaveAttribute(
      "data-completion-role",
      "carrier",
    );
    await expect(carrier).toContainText("대폭발");
  });
}
