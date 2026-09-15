import test from 'node:test';
import assert from 'node:assert/strict';
import { getProducts, createCheckout } from '../shopify-storefront.mjs';

test('catalog requests the three configured handles with a public token', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).hostname, 'wr1t0v-x1.myshopify.com');
    assert.ok(options.headers['X-Shopify-Storefront-Access-Token']);
    assert.equal(options.headers['Shopify-Storefront-Private-Token'], undefined);
    const { variables } = JSON.parse(options.body);
    assert.equal(variables.tee, 'bayley-currey-racing-t-shirt');
    assert.equal(variables.hoodie, 'bayley-currey-racing-hoodie');
    assert.equal(variables.hat, 'bayley-currey-racing-hat');
    return Response.json({ data: { tee: null, hoodie: null, hat: null } });
  });
  assert.deepEqual(await getProducts(), { products: { tee: null, hoodie: null, hat: null } });
});

test('checkout sends variant IDs and bounded whole quantities, never client prices', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const { variables } = JSON.parse(options.body);
    assert.deepEqual(variables.input.lines, [{ merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 20 }]);
    return Response.json({ data: { cartCreate: { cart: { checkoutUrl: 'https://wr1t0v-x1.myshopify.com/cart/c/test' }, userErrors: [], warnings: [] } } });
  });
  const result = await createCheckout([{ merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 99.5, price: 0.01 }]);
  assert.match(result.checkoutUrl, /^https:/);
});

test('empty and invalid carts cannot create checkout', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request'); });
  await assert.rejects(createCheckout([]), /empty/);
  await assert.rejects(createCheckout([{ merchandiseId: 'invalid', quantity: 1 }]), /empty/);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('GraphQL failures surface as unavailable', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ errors: [{ message: 'Denied' }] }));
  await assert.rejects(getProducts(), /unavailable/);
});

test('Shopify inventory warnings prevent silently altered checkout', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: { cartCreate: { cart: { checkoutUrl: 'https://wr1t0v-x1.myshopify.com/cart/c/test' }, userErrors: [], warnings: [{ message: 'Item removed' }] } } }));
  await assert.rejects(createCheckout([{ merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 1 }]), /unavailable/);
});

test('checkout refuses non-HTTPS redirects', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: { cartCreate: { cart: { checkoutUrl: 'http://example.com' }, userErrors: [], warnings: [] } } }));
  await assert.rejects(createCheckout([{ merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 1 }]), /unavailable/);
});
