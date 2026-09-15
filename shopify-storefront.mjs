// PUBLIC Storefront token: intended for browser use. Never add private tokens here.
export const SHOPIFY_DOMAIN = 'wr1t0v-x1.myshopify.com';
const PUBLIC_TOKEN = '82e19d22d5d223f3c399974f93f3a7d7';
const ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/2026-07/graphql.json`;
export const PRODUCT_HANDLES = { tee: 'bayley-currey-racing-t-shirt', hoodie: 'bayley-currey-racing-hoodie', hat: 'bayley-currey-racing-hat' };
const FIELDS = `id title handle description availableForSale variants(first: 100) { nodes { id title availableForSale selectedOptions { name value } price { amount currencyCode } } }`;

async function request(query, variables = {}) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': PUBLIC_TOKEN },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length || !payload.data) throw new Error('Shopify is temporarily unavailable. Please try again.');
  return payload.data;
}

export async function getProducts() {
  const products = await request(`query MerchCatalog($tee: String!, $hoodie: String!, $hat: String!) {
    tee: product(handle: $tee) { ${FIELDS} }
    hoodie: product(handle: $hoodie) { ${FIELDS} }
    hat: product(handle: $hat) { ${FIELDS} }
  }`, PRODUCT_HANDLES);
  return { products };
}

export async function createCheckout(cartLines) {
  const lines = cartLines.slice(0, 20).map(line => ({
    merchandiseId: String(line.merchandiseId || ''),
    quantity: Math.min(20, Math.max(1, Math.floor(Number(line.quantity) || 1)))
  })).filter(line => /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(line.merchandiseId));
  if (!lines.length) throw new Error('Your cart is empty.');
  const data = await request(`mutation Checkout($input: CartInput!) {
    cartCreate(input: $input) { cart { checkoutUrl } userErrors { message } warnings { message } }
  }`, { input: { lines } });
  const result = data.cartCreate;
  if (result.userErrors?.length || result.warnings?.length || !result.cart?.checkoutUrl) throw new Error('Some items are unavailable. Please review your cart.');
  const url = new URL(result.cart.checkoutUrl);
  if (url.protocol !== 'https:') throw new Error('Checkout is temporarily unavailable.');
  return { checkoutUrl: url.href };
}
