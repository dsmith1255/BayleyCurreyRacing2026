const API_VERSION = '2026-07';

const productFields = `
  id
  title
  handle
  description
  availableForSale
  featuredImage { url altText width height }
  images(first: 8) { nodes { url altText width height } }
  options { name values }
  variants(first: 30) {
    nodes {
      id
      title
      availableForSale
      sku
      selectedOptions { name value }
      price { amount currencyCode }
      image { url altText width height }
    }
  }
`;

const catalogQuery = `
  query MerchCatalog($tee: String!, $hoodie: String!, $hat: String!) {
    tee: product(handle: $tee) { ${productFields} }
    hoodie: product(handle: $hoodie) { ${productFields} }
    hat: product(handle: $hat) { ${productFields} }
  }
`;

const cartMutation = `
  mutation CreateCart($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl }
      userErrors { field message code }
      warnings { message code }
    }
  }
`;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': statusCode === 200 ? 'no-store' : 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function normalizeDomain(value = '') {
  return value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function shopifyConfig() {
  const domain = normalizeDomain(process.env.SHOPIFY_STORE_DOMAIN);
  const publicToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim();
  const privateToken = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.trim();
  if (!domain || (!publicToken && !privateToken)) return null;
  return { domain, publicToken, privateToken };
}

async function storefront(query, variables, clientIp) {
  const config = shopifyConfig();
  if (!config) throw new Error('STORE_NOT_CONFIGURED');
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (config.privateToken) headers['Shopify-Storefront-Private-Token'] = config.privateToken;
  else headers['X-Shopify-Storefront-Access-Token'] = config.publicToken;
  if (clientIp) headers['Shopify-Storefront-Buyer-IP'] = clientIp;

  const response = await fetch(`https://${config.domain}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length) throw new Error('SHOPIFY_UNAVAILABLE');
  return payload.data;
}

function clientIpFrom(event) {
  return event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
}

export async function handler(event) {
  const action = event.queryStringParameters?.action || 'products';
  const clientIp = clientIpFrom(event);
  try {
    if (event.httpMethod === 'GET' && action === 'products') {
      const data = await storefront(catalogQuery, {
        tee: process.env.SHOPIFY_TEE_HANDLE || 'bayley-currey-racing-t-shirt',
        hoodie: process.env.SHOPIFY_HOODIE_HANDLE || 'bayley-currey-racing-hoodie',
        hat: process.env.SHOPIFY_HAT_HANDLE || 'bayley-currey-racing-hat'
      }, clientIp);
      return json(200, { products: { tee: data.tee, hoodie: data.hoodie, hat: data.hat } });
    }

    if (event.httpMethod === 'POST' && action === 'checkout') {
      const parsed = JSON.parse(event.body || '{}');
      const lines = Array.isArray(parsed.lines) ? parsed.lines.slice(0, 20).map(line => ({
        merchandiseId: String(line.merchandiseId || ''),
        quantity: Math.max(1, Math.min(20, Number(line.quantity) || 1))
      })).filter(line => line.merchandiseId.startsWith('gid://shopify/ProductVariant/')) : [];
      if (!lines.length) return json(400, { message: 'Your cart is empty.' });

      const data = await storefront(cartMutation, { input: { lines } }, clientIp);
      const errors = data.cartCreate.userErrors || [];
      if (errors.length || !data.cartCreate.cart?.checkoutUrl) {
        return json(422, { message: 'One or more items are unavailable. Please review your cart.' });
      }
      return json(200, { checkoutUrl: data.cartCreate.cart.checkoutUrl });
    }

    return json(404, { message: 'Store action not found.' });
  } catch (error) {
    if (error.message === 'STORE_NOT_CONFIGURED') return json(503, { message: 'Online ordering is being connected.' });
    return json(502, { message: 'The store is temporarily unavailable. Please try again shortly.' });
  }
}
