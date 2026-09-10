import { test, expect } from "@playwright/test";

test("deck board narrows builds from important magic choices and returns targets to Live", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/");
  await page.getByRole("link", { name: "덱 보드", exact: true }).click();
  await expect(page).toHaveURL(/deck-board\.html/);
  await expect(
    page.getByRole("heading", {
      name: "중요한 선택만 눌러서 갈 수 있는 덱을 좁혀보세요.",
      exact: true,
    }),
  ).toBeVisible();

  const shield = page.locator(".deck-magic").filter({ hasText: "보호막" }).first();
  await shield.click();
  await expect(page.locator(".deck-selected-line")).toContainText("보호막");
  await expect(page.locator(".deck-card").first()).not.toHaveAttribute(
    "data-compatibility",
    "탐색",
  );

  const usable = page.locator(".deck-card button.primary:not(:disabled)").first();
  await expect(usable).toBeVisible();
  await usable.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "덱 보드", exact: true })).toBeVisible();
});
