(() => {
  const CATALOG = {
    tee: {
      handle: 'bayley-currey-racing-t-shirt',
      title: 'Bayley Currey Racing T-Shirt',
      shortTitle: 'Racing T-Shirt',
      description: 'A black everyday race tee featuring the official Bayley Currey artwork in white and red.',
      image: '/assets/merch-tee-studio.webp',
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      skuPrefix: 'BCR-TEE',
      price: 30
    },
    hoodie: {
      handle: 'bayley-currey-racing-hoodie',
      title: 'Bayley Currey Racing Hoodie',
      shortTitle: 'Racing Hoodie',
      description: 'A heavyweight black hoodie carrying the official Bayley Currey artwork in white and red.',
      image: '/assets/merch-hoodie-studio.webp',
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      skuPrefix: 'BCR-HOOD',
      price: 40
    },
    hat: {
      handle: 'bayley-currey-racing-hat',
      title: 'Bayley Currey Racing Hat',
      shortTitle: 'Racing Hat',
      description: 'A structured black cap finished with official Bayley Currey artwork on the front.',
      image: '/assets/merch-hat-studio.webp',
      sizes: ['One Size'],
      skuPrefix: 'BCR-HAT',
      price: 25
    }
  };

  const CART_KEY = 'bcr-merch-cart-v1';
  const state = { products: {}, cart: readCart(), activeProduct: null };

  function readCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(item => item && item.variantId && item.quantity > 0) : [];
    } catch (_) {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    renderCart();
  }

  function money(amount, currency = 'USD') {
    const value = Number(amount);
    if (!Number.isFinite(value)) return 'View price';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  async function shopifyRequest() {
    const storefront = await import('/shopify-storefront.mjs?v=1');
    return storefront.getProducts();
  }

  async function loadCatalog() {
    try {
      const payload = await shopifyRequest();
      state.products = payload.products || {};
      document.documentElement.dataset.storeReady = 'true';
      syncCatalogCards();
      setupProductPage();
    } catch (_) {
      document.documentElement.dataset.storeReady = 'false';
      syncCatalogCards();
      setupProductPage();
    }
  }

  function syncCatalogCards() {
    document.querySelectorAll('[data-price-for]').forEach(node => {
      const product = state.products[node.dataset.priceFor];
      const first = product?.variants?.nodes?.[0];
      node.textContent = first ? money(first.price.amount, first.price.currencyCode) : money(CATALOG[node.dataset.priceFor].price);
    });
  }

  function getVariantLabel(variant) {
    const size = variant?.selectedOptions?.find(option => option.name.toLowerCase() === 'size');
    return size?.value || variant?.title || 'One Size';
  }

  function setupProductPage() {
    const key = document.body.dataset.product;
    if (!key || !CATALOG[key]) return;
    const fallback = CATALOG[key];
    const product = state.products[key];
    state.activeProduct = product || null;

    const title = document.querySelector('[data-product-title]');
    const description = document.querySelector('[data-product-description]');
    if (product?.title && title) title.textContent = product.title;
    if (product?.description && description) description.textContent = product.description;

    const options = document.querySelector('[data-size-options]');
    const addButton = document.querySelector('[data-add-to-cart]');
    const status = document.querySelector('[data-store-status]');
    if (!options || !addButton || !status) return;

    if (!product?.variants?.nodes?.length) {
      document.body.dataset.productReady = 'false';
      options.innerHTML = fallback.sizes.map((size, index) => `
        <label class="size-option"><input type="radio" name="size" value="${escapeHtml(size)}" ${index === 0 ? 'checked' : ''} disabled><span>${escapeHtml(size)}</span></label>
      `).join('');
      document.querySelector('[data-detail-price]').textContent = money(fallback.price);
      addButton.disabled = true;
      status.innerHTML = 'The collection is coming soon. <a href="https://www.instagram.com/bayleycurrey05/" target="_blank" rel="noopener">Follow Bayley for release updates ↗</a>';
      status.classList.remove('error');
      return;
    }

    const variants = product.variants.nodes;
    document.body.dataset.productReady = 'true';
    options.innerHTML = variants.map((variant, index) => {
      const label = getVariantLabel(variant);
      return `<label class="size-option"><input type="radio" name="size" value="${escapeHtml(variant.id)}" data-label="${escapeHtml(label)}" ${index === 0 ? 'checked' : ''} ${variant.availableForSale ? '' : 'disabled'}><span>${escapeHtml(label)}</span></label>`;
    }).join('');

    const available = variants.find(variant => variant.availableForSale);
    if (available) {
      const input = options.querySelector(`input[value="${CSS.escape(available.id)}"]`);
      if (input) input.checked = true;
      updateSelectedVariant();
      addButton.disabled = false;
      status.textContent = '';
      status.classList.remove('error');
    } else {
      document.querySelector('[data-detail-price]').textContent = 'Sold out';
      addButton.disabled = true;
      status.textContent = 'This item is currently unavailable.';
      status.classList.add('error');
    }
  }

  function selectedVariant() {
    const selected = document.querySelector('[data-size-options] input:checked');
    if (!selected || !state.activeProduct) return null;
    return state.activeProduct.variants.nodes.find(variant => variant.id === selected.value) || null;
  }

  function updateSelectedVariant() {
    const variant = selectedVariant();
    if (!variant) return;
    const price = document.querySelector('[data-detail-price]');
    const addButton = document.querySelector('[data-add-to-cart]');
    if (price) price.textContent = money(variant.price.amount, variant.price.currencyCode);
    if (addButton) addButton.disabled = !variant.availableForSale;
  }

  function addCurrentProduct() {
    const key = document.body.dataset.product;
    const catalogItem = CATALOG[key];
    const variant = selectedVariant();
    const quantity = Math.max(1, Math.min(10, Number(document.querySelector('[data-product-quantity]')?.value || 1)));
    if (!catalogItem || !variant?.availableForSale) return;
    const label = getVariantLabel(variant);
    const existing = state.cart.find(item => item.variantId === variant.id);
    if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
    else state.cart.push({
      variantId: variant.id,
      productKey: key,
      title: state.activeProduct.title || catalogItem.title,
      size: label,
      quantity,
      amount: variant.price.amount,
      currency: variant.price.currencyCode
    });
    saveCart();
    showToast('Added to cart');
    openCart();
  }

  function renderProductArt(key, small = false) {
    const item = CATALOG[key] || CATALOG.tee;
    return `<div class="${small ? 'cart-item-image' : 'product-visual'}"><img class="product-base" src="${item.image}" alt=""></div>`;
  }

  function renderCart() {
    const count = state.cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = count; });
    const container = document.querySelector('[data-cart-items]');
    const subtotalNode = document.querySelector('[data-cart-subtotal]');
    const checkout = document.querySelector('[data-checkout]');
    if (!container) return;

    if (!state.cart.length) {
      container.innerHTML = '<div class="empty-cart"><strong>Your cart is empty</strong><p>Pick your race-day gear and come back when you are ready.</p><a href="/merch/">Shop merchandise</a></div>';
      if (subtotalNode) subtotalNode.textContent = money(0);
      if (checkout) checkout.disabled = true;
      return;
    }

    container.innerHTML = state.cart.map((item, index) => `
      <article class="cart-item" data-cart-index="${index}">
        ${renderProductArt(item.productKey, true)}
        <div><h3>${escapeHtml(item.title)}</h3><div class="cart-item-meta">${escapeHtml(item.size)}</div>
          <div class="cart-item-controls"><button type="button" data-cart-decrease aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button type="button" data-cart-increase aria-label="Increase quantity">+</button><button class="cart-remove" type="button" data-cart-remove>Remove</button></div>
        </div>
        <div class="cart-line-price">${money(Number(item.amount) * item.quantity, item.currency)}</div>
      </article>
    `).join('');

    const currency = state.cart[0].currency || 'USD';
    const subtotal = state.cart.reduce((total, item) => total + Number(item.amount) * item.quantity, 0);
    if (subtotalNode) subtotalNode.textContent = money(subtotal, currency);
    if (checkout) checkout.disabled = false;
  }

  function openCart() {
    document.body.classList.add('cart-open');
    document.querySelector('.cart-drawer')?.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.querySelector('.cart-close')?.focus(), 50);
  }

  function closeCart() {
    document.body.classList.remove('cart-open');
    document.querySelector('.cart-drawer')?.setAttribute('aria-hidden', 'true');
    document.querySelector('.cart-trigger')?.focus();
  }

  async function checkout() {
    const button = document.querySelector('[data-checkout]');
    const note = document.querySelector('[data-checkout-note]');
    if (!button || !state.cart.length) return;
    button.disabled = true;
    button.textContent = 'Opening checkout…';
    if (note) note.textContent = 'Secure checkout is handled by Shopify.';
    try {
      const storefront = await import('/shopify-storefront.mjs?v=1');
      const payload = await storefront.createCheckout(state.cart.map(item => ({ merchandiseId: item.variantId, quantity: item.quantity })));
      window.location.assign(payload.checkoutUrl);
    } catch (_) {
      button.disabled = false;
      button.textContent = 'Checkout securely';
      if (note) note.textContent = 'Checkout is temporarily unavailable. Please try again in a moment.';
    }
  }

  function changeQuantity(input, delta) {
    if (!input) return;
    input.value = Math.max(1, Math.min(10, Number(input.value || 1) + delta));
  }

  function showToast(message) {
    const toast = document.querySelector('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  document.addEventListener('click', event => {
    const menu = event.target.closest('[data-store-menu]');
    if (menu) {
      const header = menu.closest('.store-header');
      const open = header.dataset.menuOpen !== 'true';
      header.dataset.menuOpen = String(open);
      menu.setAttribute('aria-expanded', String(open));
      return;
    }
    if (event.target.closest('.store-nav a')) {
      const header = document.querySelector('.store-header');
      if (header) header.dataset.menuOpen = 'false';
    }
    if (event.target.closest('[data-cart-open]')) openCart();
    if (event.target.closest('[data-cart-close]') || event.target.classList.contains('cart-backdrop')) closeCart();
    if (event.target.closest('[data-add-to-cart]')) addCurrentProduct();
    if (event.target.closest('[data-qty-minus]')) changeQuantity(document.querySelector('[data-product-quantity]'), -1);
    if (event.target.closest('[data-qty-plus]')) changeQuantity(document.querySelector('[data-product-quantity]'), 1);
    if (event.target.closest('[data-checkout]')) checkout();

    const item = event.target.closest('[data-cart-index]');
    if (item) {
      const index = Number(item.dataset.cartIndex);
      if (event.target.closest('[data-cart-decrease]')) state.cart[index].quantity -= 1;
      if (event.target.closest('[data-cart-increase]')) state.cart[index].quantity = Math.min(20, state.cart[index].quantity + 1);
      if (event.target.closest('[data-cart-remove]') || state.cart[index].quantity <= 0) state.cart.splice(index, 1);
      saveCart();
    }
  });

  document.addEventListener('change', event => {
    if (event.target.closest('[data-size-options]')) updateSelectedVariant();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('cart-open')) closeCart();
  });

  renderCart();
  loadCatalog();
})();
