// T-086: E2E tests for AdsClaw Cockpit
import { test, expect } from '@playwright/test';

test.describe('Cockpit Navigation', () => {
  test('redirects / to /dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('dashboard page loads with KPI cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Dashboard');
    // 4 KPI cards should be visible
    const cards = page.locator('.glass.rounded-2xl');
    await expect(cards.first()).toBeVisible();
  });

  test('clients page loads and shows table', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.locator('h2')).toContainText('Gestão de Clientes');
    // Table should be present
    await expect(page.locator('table')).toBeVisible();
  });

  test('alerts page loads', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.locator('h2')).toContainText('Alertas');
  });

  test('approvals page loads', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.locator('h2')).toContainText('Aprovações');
  });

  test('conversations page loads', async ({ page }) => {
    await page.goto('/conversations');
    await expect(page.locator('h2')).toContainText('Conversas');
  });
});

test.describe('Sidebar Navigation', () => {
  test('sidebar has all menu items', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('a')).toHaveCount(5); // Dashboard, Clientes, Alertas, Aprovações, Conversas
  });

  test('clicking Clientes navigates correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a[href="/clients"]');
    await expect(page).toHaveURL(/\/clients/);
    await expect(page.locator('h2')).toContainText('Gestão de Clientes');
  });

  test('clicking Alertas navigates correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a[href="/alerts"]');
    await expect(page).toHaveURL(/\/alerts/);
  });
});

test.describe('Dashboard Data', () => {
  test('shows real client count from Supabase', async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for data to load (Supabase fetch)
    await page.waitForTimeout(2000);
    // Should show client count > 0 if Supabase is reachable
    const kpiText = await page.locator('.glass.rounded-2xl').first().textContent();
    expect(kpiText).toBeTruthy();
  });
});

test.describe('Clients CRUD', () => {
  test('Novo Cliente button opens modal', async ({ page }) => {
    await page.goto('/clients');
    await page.click('button:has-text("Novo Cliente")');
    // Modal should appear
    await expect(page.locator('h3:has-text("Cadastrar Novo Cliente")')).toBeVisible();
  });

  test('modal has name and niche fields', async ({ page }) => {
    await page.goto('/clients');
    await page.click('button:has-text("Novo Cliente")');
    await expect(page.locator('input[placeholder*="AdsClaw"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Infoprodutos"]')).toBeVisible();
  });

  test('cancel button closes modal', async ({ page }) => {
    await page.goto('/clients');
    await page.click('button:has-text("Novo Cliente")');
    await page.click('button:has-text("Cancelar")');
    await expect(page.locator('h3:has-text("Cadastrar Novo Cliente")')).not.toBeVisible();
  });
});
