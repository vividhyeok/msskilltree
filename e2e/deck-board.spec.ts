import { test, expect } from "@playwright/test";

test("deck board narrows builds from important magic choices and returns targets to Live", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/");
  await page
    .getByRole("link", { name: "중급자용 전체 덱 빠르게 보기", exact: true })
    .click();
  await expect(page).toHaveURL(/deck-board\.html/);
  await expect(
    page.getByRole("heading", {
      name: "전체 덱을 먼저 보고, 지금 뜬 마법으로 바로 좁혀보세요.",
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
  await expect(
    page.getByRole("link", { name: "중급자용 전체 덱 빠르게 보기", exact: true }),
  ).toBeVisible();
});
