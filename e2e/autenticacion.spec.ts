import { expect, test } from '@playwright/test';
import { iniciarSesion } from './apoyo';

test.describe('Autenticación', () => {
  test('una ruta protegida sin sesión lleva al login con returnUrl', async ({
    page,
  }) => {
    await page.goto('/ventas');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fventas/);
  });

  test('credenciales incorrectas muestran el mensaje del backend', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Usuario').fill('admin');
    await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      /Usuario o contraseña incorrectos/,
    );
  });

  test('tras iniciar sesión vuelve a la página pedida', async ({ page }) => {
    await iniciarSesion(page, 'vendedor', '/ventas');
    await expect(page).toHaveURL(/\/ventas$/);
  });
});
