import { expect, test } from '@playwright/test';
import { iniciarSesion } from './apoyo';

test('productos se paginan en el servidor con la página en la URL', async ({
  page,
}) => {
  await iniciarSesion(page, 'admin', '/productos');
  const filas = page.getByTestId('tabla-productos').locator('tbody tr');

  await expect(filas).toHaveCount(20);
  await expect(page.getByTestId('pagina-actual')).toHaveText(
    /Página 1 de \d+/,
  );

  const respuesta = page.waitForResponse(
    (r) =>
      r.url().includes('/api/v1/productos') && r.url().includes('pagina=1'),
  );
  await page.getByRole('button', { name: 'Siguiente' }).click();
  expect((await respuesta).status()).toBe(200);

  await expect(page).toHaveURL(/pagina=1/);
  await expect(page.getByTestId('pagina-actual')).toHaveText(/Página 2 de/);

  await page.reload(); // F5 conserva la página
  await expect(page.getByTestId('pagina-actual')).toHaveText(/Página 2 de/);
});
