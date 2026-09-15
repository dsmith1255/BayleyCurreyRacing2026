# Shopify catalog import

The import contains the shirt ($30), hoodie ($40), and hat ($25): 13 size variants total.

1. In Shopify Products, choose Import and upload `bayley-currey-products.csv`.
2. Review the three products and import. Their image URLs must already be live on bayleycurreyracing.com.
3. Select all three products and include them in the Headless sales channel. The website reads products from that channel automatically.
4. Before opening sales, confirm the available sizes, fulfillment arrangements, tax settings, shipping rates, payment provider, and store policies in Shopify.

The import uses manual fulfillment and untracked inventory for made-to-order items. It does not connect a printer or supplier. Product images are design mockups, not photographs of manufactured inventory. Shopify is the source of truth for price and availability once products are published.

No Admin API credentials are included. The public Storefront token can read the catalog and create checkout carts but cannot create products.
