import { expect, test } from '@playwright/test';
import { iniciarSesion } from './apoyo';

test('flujo principal: el vendedor registra una venta y el stock baja', async ({
  page,
}) => {
  await iniciarSesion(page, 'vendedor', '/ventas/nueva');

  // Cliente
  await page.getByTestId('buscar-cliente').fill('Mamani');
  await page.getByTestId('opcion-cliente').first().click();

  // Producto: se lee el stock antes de vender
  await page.getByTestId('buscar-producto').fill('Paracetamol');
  const opcion = page.getByTestId('opcion-producto').first();
  const stockAntes = Number(await opcion.getAttribute('data-stock'));
  await opcion.click();
  await page.getByTestId('cantidad').last().fill('2');

  await expect(page.getByTestId('total-venta')).not.toHaveText('S/ 0.00');

  const registro = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/ventas') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Registrar venta' }).click();
  expect((await registro).status()).toBe(201);
  await expect(page.getByText(/Venta .* registrada/)).toBeVisible();

  // Integración con Productos: el stock refleja la venta (caché invalidada)
  await page.goto('/productos?orden=nombre&dir=asc');
  const fila = page
    .getByTestId('tabla-productos')
    .locator('tr', { hasText: 'Paracetamol' })
    .first();
  await expect(fila).toContainText(String(stockAntes - 2));
});
