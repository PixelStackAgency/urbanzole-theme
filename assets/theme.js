/* ================================================================
   URBANZOLE — theme.js v2.0
   Full working JS: Cart, Search, Mobile Menu, All interactions
   ================================================================ */
'use strict';

// ── State ──────────────────────────────────────────────────────
const UZ = {
  cart: null,
  searchTimer: null,
};

// ── DOM Ready ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initSearchOverlay();
  initCartDrawer();
  initReveal();
  initBackTop();
  initProductPage();
  initCartPage();
  initAccordions();
  initToastQueue();
  fetchCart();
});

/* ================================================================
   HEADER — sticky + scroll
   ================================================================ */
function initHeader() {
  const header = document.querySelector('.site-header');
  const annBar = document.querySelector('.announcement-bar');
  if (!header) return;

  function updateHeader() {
    const scrolled = window.scrollY > 40;
    header.classList.toggle('scrolled', scrolled);
    if (annBar) {
      const annH = annBar.offsetHeight;
      header.style.top = scrolled ? '0' : annH + 'px';
    }
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Announce bar close (optional)
  const annClose = document.querySelector('.ann-close');
  if (annClose && annBar) {
    annClose.addEventListener('click', () => {
      annBar.style.maxHeight = annBar.offsetHeight + 'px';
      annBar.offsetHeight; // reflow
      annBar.style.transition = 'max-height .3s, opacity .3s';
      annBar.style.maxHeight = '0';
      annBar.style.opacity = '0';
      annBar.style.overflow = 'hidden';
      setTimeout(() => { annBar.remove(); updateHeader(); }, 320);
    });
  }
}

/* ================================================================
   MOBILE MENU
   ================================================================ */
function initMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const openBtn = document.querySelector('.header-menu-btn');
  const closeBtn = document.getElementById('mm-close');
  const backdrop = menu?.querySelector('.mm-backdrop');
  if (!menu || !openBtn) return;

  function open() {
    menu.setAttribute('aria-hidden', 'false');
    openBtn.classList.add('open');
    document.body.classList.add('no-scroll');
    closeBtn?.focus();
  }
  function close() {
    menu.setAttribute('aria-hidden', 'true');
    openBtn.classList.remove('open');
    document.body.classList.remove('no-scroll');
    openBtn.focus();
  }

  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ================================================================
   SEARCH OVERLAY
   ================================================================ */
function initSearchOverlay() {
  const overlay = document.getElementById('search-overlay');
  const openBtns = document.querySelectorAll('[data-open-search]');
  const closeBtn = document.getElementById('so-close');
  const backdrop = overlay?.querySelector('.so-backdrop');
  const input = document.getElementById('so-input');
  const results = document.getElementById('so-results');
  if (!overlay) return;

  function open() {
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    setTimeout(() => input?.focus(), 400);
  }
  function close() {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (results) results.innerHTML = '';
    if (input) input.value = '';
  }

  openBtns.forEach(b => b.addEventListener('click', open));
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') close();
  });

  // Live search
  if (input && results) {
    input.addEventListener('input', () => {
      clearTimeout(UZ.searchTimer);
      const q = input.value.trim();
      if (q.length < 2) { results.innerHTML = ''; return; }
      UZ.searchTimer = setTimeout(() => liveSearch(q, results), 350);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (input.value.trim()) {
          window.location.href = `/search?type=product&q=${encodeURIComponent(input.value.trim())}`;
        }
      }
    });
  }
}

async function liveSearch(q, container) {
  try {
    container.innerHTML = '<p style="color:var(--grey-400);font-style:italic;padding:.5rem 0">Searching...</p>';
    const res = await fetch(`/search?type=product&q=${encodeURIComponent(q)}&view=json`, {
      headers: { 'Accept': 'application/json' }
    });
    // Fallback: use search suggestions API
    const res2 = await fetch(`/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=8`);
    const data = await res2.json();
    const products = data?.resources?.results?.products || [];

    if (!products.length) {
      container.innerHTML = '<p class="so-no-results">No products found for "<strong>' + q + '</strong>"</p>';
      return;
    }
    container.innerHTML = '<div class="so-result-grid">' + products.map(p => `
      <a href="${p.url}" class="so-result-card">
        <img src="${p.image || p.featured_image?.url || ''}" alt="${p.title}" loading="lazy" onerror="this.style.display='none'">
        <div class="so-result-card__info">
          <div class="so-result-card__name">${p.title}</div>
          <div class="so-result-card__price">${formatMoney(p.price)}</div>
        </div>
      </a>
    `).join('') + '</div>';
  } catch (e) {
    container.innerHTML = '<p class="so-no-results">Search unavailable. <a href="/search?q=' + encodeURIComponent(q) + '" style="color:var(--orange)">Try full search →</a></p>';
  }
}

/* ================================================================
   CART — core fetch/render
   ================================================================ */
async function fetchCart() {
  try {
    const res = await fetch('/cart.js');
    UZ.cart = await res.json();
    renderCartDrawer(UZ.cart);
    updateCartBadge(UZ.cart.item_count);
  } catch (e) { console.warn('Cart fetch failed', e); }
}

async function addToCart(variantId, qty = 1, btn = null) {
  if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }
  try {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(variantId), quantity: parseInt(qty) })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.description || 'Add failed'); }
    const item = await res.json();
    await fetchCart();
    openCartDrawer();
    showToast('Added to cart!', item.title, 'success');
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Add to Cart'; }
  } catch (e) {
    showToast('Could not add', e.message || 'Please try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Add to Cart'; }
  }
}

async function updateCartItem(key, qty) {
  try {
    await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: parseInt(qty) })
    });
    await fetchCart();
    if (document.querySelector('.cart-page')) renderCartPage();
  } catch (e) { showToast('Update failed', '', 'error'); }
}

async function removeCartItem(key) {
  await updateCartItem(key, 0);
}

/* ================================================================
   CART DRAWER
   ================================================================ */
function initCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const openBtns = document.querySelectorAll('[data-open-cart]');
  const closeBtn = document.getElementById('cd-close');
  const backdrop = drawer?.querySelector('.cd-backdrop');
  const shopBtn = drawer?.querySelector('.cd-shop-btn');
  const continueBtn = document.getElementById('cd-continue');
  if (!drawer) return;

  openBtns.forEach(b => b.addEventListener('click', openCartDrawer));
  closeBtn?.addEventListener('click', closeCartDrawer);
  backdrop?.addEventListener('click', closeCartDrawer);
  continueBtn?.addEventListener('click', closeCartDrawer);
  shopBtn?.addEventListener('click', () => { closeCartDrawer(); window.location.href = '/collections/all'; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') closeCartDrawer();
  });

  // Cart body events (delegated)
  const body = document.getElementById('cd-body');
  body?.addEventListener('click', async e => {
    const removeBtn = e.target.closest('.cd-item-remove');
    const qtyBtn = e.target.closest('.cd-qty-btn');
    if (removeBtn) {
      const key = removeBtn.dataset.key;
      removeBtn.textContent = 'Removing...';
      await removeCartItem(key);
    }
    if (qtyBtn) {
      const action = qtyBtn.dataset.action;
      const key = qtyBtn.dataset.key;
      const numEl = qtyBtn.parentElement.querySelector('.cd-qty-num');
      let qty = parseInt(numEl.textContent) || 1;
      qty = action === 'inc' ? qty + 1 : Math.max(0, qty - 1);
      numEl.textContent = qty;
      await updateCartItem(key, qty);
    }
  });
}

function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}
function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

function renderCartDrawer(cart) {
  const body = document.getElementById('cd-body');
  const foot = document.getElementById('cd-foot');
  const countEl = document.getElementById('cd-count');
  const totalEl = document.getElementById('cd-total');
  if (!body) return;

  if (countEl) countEl.textContent = cart.item_count;
  if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
  if (foot) foot.hidden = !cart.items.length;

  if (!cart.items.length) {
    body.innerHTML = `<div class="cd-empty">
      <div class="cd-empty-icon"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>
      <p>Nothing in your cart yet.</p>
      <button class="btn btn--primary cd-shop-btn" onclick="window.location.href='/collections/all'">Shop Now</button>
    </div>`;
    return;
  }

  body.innerHTML = cart.items.map(item => `
    <div class="cd-item">
      <div class="cd-item-img">
        ${item.image ? `<img src="${item.image}" alt="${item.title}" loading="lazy">` : ''}
      </div>
      <div class="cd-item-info">
        <div class="cd-item-name"><a href="${item.url}">${item.product_title}</a></div>
        ${item.variant_title && item.variant_title !== 'Default Title' ? `<div class="cd-item-variant">${item.variant_title}</div>` : ''}
        <div class="cd-item-row">
          <div class="cd-item-qty">
            <button class="cd-qty-btn" data-action="dec" data-key="${item.key}" aria-label="Decrease">−</button>
            <span class="cd-qty-num">${item.quantity}</span>
            <button class="cd-qty-btn" data-action="inc" data-key="${item.key}" aria-label="Increase">+</button>
          </div>
          <span class="cd-item-price">${formatMoney(item.final_line_price)}</span>
        </div>
        <button class="cd-item-remove" data-key="${item.key}">Remove</button>
      </div>
    </div>
  `).join('');
}

/* ================================================================
   CART BADGE
   ================================================================ */
function updateCartBadge(count) {
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = count;
    el.classList.toggle('hidden', count === 0);
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 400);
  });
}

/* ================================================================
   TOAST NOTIFICATIONS
   ================================================================ */
function initToastQueue() {}
function showToast(title, text, type = 'info') {
  const container = document.getElementById('uz-toast');
  if (!container) return;
  const item = document.createElement('div');
  item.className = `uz-toast-item ${type}`;
  item.innerHTML = `<div class="uz-toast-title">${title}</div>${text ? `<div>${text}</div>` : ''}`;
  container.appendChild(item);
  requestAnimationFrame(() => item.classList.add('show'));
  setTimeout(() => {
    item.classList.remove('show');
    setTimeout(() => item.remove(), 350);
  }, 3500);
}

/* ================================================================
   SCROLL REVEAL
   ================================================================ */
function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left');
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  els.forEach(el => io.observe(el));
}

/* ================================================================
   BACK TO TOP
   ================================================================ */
function initBackTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.hidden = window.scrollY < 400;
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ================================================================
   PRODUCT PAGE
   ================================================================ */
function initProductPage() {
  // Gallery
  const thumbs = document.querySelectorAll('.pg-thumb');
  const mainImg = document.querySelector('.pg-main-img img');
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      if (mainImg) {
        const src = thumb.querySelector('img')?.src;
        if (src) { mainImg.src = src.replace('_80x80', '_800x800'); }
      }
    });
  });

  // Size selector
  const sizeBtns = document.querySelectorAll('.size-btn');
  const variantInput = document.querySelector('input[name="id"]');
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('unavailable')) return;
      sizeBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (variantInput && btn.dataset.variantId) variantInput.value = btn.dataset.variantId;
      // Update price
      const price = btn.dataset.price;
      const priceEl = document.querySelector('.pg-price-main');
      if (price && priceEl) priceEl.textContent = formatMoney(parseInt(price));
    });
  });

  // Qty controls
  document.addEventListener('click', e => {
    const qtyBtn = e.target.closest('.qty-box-btn');
    if (!qtyBtn) return;
    const input = qtyBtn.closest('.qty-box')?.querySelector('.qty-box-input');
    if (!input) return;
    let val = parseInt(input.value) || 1;
    if (qtyBtn.dataset.action === 'inc') val = Math.min(val + 1, 99);
    if (qtyBtn.dataset.action === 'dec') val = Math.max(val - 1, 1);
    input.value = val;
  });

  // Add to cart form
  const addForm = document.querySelector('[data-add-to-cart-form]');
  if (addForm) {
    addForm.addEventListener('submit', async e => {
      e.preventDefault();
      const variantId = addForm.querySelector('[name="id"]')?.value;
      const qty = addForm.querySelector('[name="quantity"]')?.value || 1;
      const btn = addForm.querySelector('[type="submit"]');
      if (!variantId) { showToast('Select a size', 'Please choose your size first.', 'error'); return; }
      btn.dataset.originalText = btn.textContent;
      await addToCart(variantId, qty, btn);
    });
  }

  // Quick add buttons
  document.addEventListener('click', async e => {
    const quickBtn = e.target.closest('.quick-add-btn');
    if (!quickBtn) return;
    const variantId = quickBtn.dataset.variantId;
    if (!variantId) {
      window.location.href = quickBtn.dataset.productUrl || '#';
      return;
    }
    quickBtn.textContent = 'Adding...';
    quickBtn.disabled = true;
    await addToCart(variantId, 1);
    quickBtn.textContent = 'Added ✓';
    setTimeout(() => { quickBtn.textContent = 'Quick Add'; quickBtn.disabled = false; }, 2000);
  });

  // Accordion (product page)
  document.querySelectorAll('.pg-acc-head').forEach(head => {
    head.addEventListener('click', () => {
      const item = head.closest('.pg-acc-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.pg-acc-item.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Wishlist toggle (UI only, extend with app)
  document.querySelectorAll('.pg-wishlist-btn, .product-card-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      showToast(
        btn.classList.contains('active') ? 'Saved!' : 'Removed',
        btn.classList.contains('active') ? 'Added to your wishlist.' : 'Removed from wishlist.',
        btn.classList.contains('active') ? 'success' : 'info'
      );
    });
  });
}

/* ================================================================
   CART PAGE
   ================================================================ */
function initCartPage() {
  const cartPage = document.querySelector('.cart-page');
  if (!cartPage) return;

  // Quantity buttons
  cartPage.addEventListener('click', async e => {
    const qtyBtn = e.target.closest('.cart-qty-btn');
    if (!qtyBtn) return;
    const key = qtyBtn.dataset.key;
    const action = qtyBtn.dataset.action;
    const input = qtyBtn.parentElement.querySelector('.cart-qty-num');
    let qty = parseInt(input.value) || 1;
    qty = action === 'inc' ? qty + 1 : Math.max(0, qty - 1);
    input.value = qty;
    await updateCartItem(key, qty);
    renderCartPage();
  });

  // Remove
  cartPage.addEventListener('click', async e => {
    const removeBtn = e.target.closest('.cart-row-remove');
    if (!removeBtn) return;
    removeBtn.textContent = 'Removing...';
    await removeCartItem(removeBtn.dataset.key);
    renderCartPage();
  });

  // Promo form (UI placeholder)
  const promoForm = cartPage.querySelector('.cart-promo-form');
  promoForm?.addEventListener('submit', e => {
    e.preventDefault();
    showToast('Promo code', 'Discount codes are applied at checkout.', 'info');
  });
}

async function renderCartPage() {
  await fetchCart();
  const cart = UZ.cart;
  if (!cart) return;
  const itemsEl = document.querySelector('.cart-page-items-inner');
  if (!itemsEl) return;

  if (!cart.items.length) {
    document.querySelector('.cart-page-layout').innerHTML = `<div class="cart-empty-page">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      <h2>Your cart is empty</h2>
      <p>Looks like you haven't added anything yet.</p>
      <a href="/collections/all" class="btn btn--primary">Shop Now</a>
    </div>`;
    return;
  }

  itemsEl.innerHTML = cart.items.map(item => `
    <div class="cart-row">
      <div class="cart-row-product">
        <div class="cart-row-img"><a href="${item.url}"><img src="${item.image || ''}" alt="${item.title}" loading="lazy"></a></div>
        <div>
          <div class="cart-row-name"><a href="${item.url}">${item.product_title}</a></div>
          ${item.variant_title && item.variant_title !== 'Default Title' ? `<div class="cart-row-variant">${item.variant_title}</div>` : ''}
          <button class="cart-row-remove" data-key="${item.key}">Remove</button>
        </div>
      </div>
      <div class="cart-row-price">${formatMoney(item.price)}</div>
      <div class="cart-row-qty">
        <button class="cart-qty-btn" data-action="dec" data-key="${item.key}" aria-label="Decrease">−</button>
        <input class="cart-qty-num" type="number" value="${item.quantity}" min="0" max="99" readonly>
        <button class="cart-qty-btn" data-action="inc" data-key="${item.key}" aria-label="Increase">+</button>
      </div>
      <div class="cart-row-total">${formatMoney(item.final_line_price)}</div>
    </div>
  `).join('');

  // Update totals
  document.querySelectorAll('[data-cart-total]').forEach(el => el.textContent = formatMoney(cart.total_price));
  document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = cart.item_count);
}

/* ================================================================
   ACCORDIONS (global)
   ================================================================ */
function initAccordions() {
  document.querySelectorAll('[data-accordion]').forEach(wrap => {
    wrap.querySelectorAll('[data-accordion-trigger]').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('[data-accordion-item]');
        item?.classList.toggle('open');
      });
    });
  });
}

/* ================================================================
   FORMAT MONEY (Shopify style)
   ================================================================ */
function formatMoney(cents, format = '₹{{amount_no_decimals}}') {
  if (typeof cents === 'string') cents = cents.replace('.', '');
  const value = (parseInt(cents) / 100).toFixed(0);
  return format.replace('{{amount_no_decimals}}', numberWithCommas(value));
}
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Expose globally
window.UZ = UZ;
window.addToCart = addToCart;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.showToast = showToast;
