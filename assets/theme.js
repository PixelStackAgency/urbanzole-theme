/* ============================================
   URBANZOLE — Theme JavaScript
   ============================================ */

(function () {
  'use strict';

  // ── Sticky Header ──
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ── Scroll Reveal ──
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => observer.observe(el));
  }

  // ── Cart Drawer ──
  const cartDrawer = document.getElementById('uz-cart-drawer');
  const cartCloseBtns = document.querySelectorAll('.cart-drawer__close, .cart-drawer__overlay');
  const cartBtns = document.querySelectorAll('[data-open-cart]');

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    fetchCart();
  }
  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  cartBtns.forEach(btn => btn.addEventListener('click', openCart));
  cartCloseBtns.forEach(btn => btn.addEventListener('click', closeCart));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  // ── Fetch Cart ──
  async function fetchCart() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      updateCartUI(cart);
    } catch (e) { console.warn('Cart fetch error', e); }
  }

  function updateCartUI(cart) {
    const countEls = document.querySelectorAll('#cart-count, .cart-badge');
    countEls.forEach(el => { el.textContent = cart.item_count; });

    const body = document.getElementById('cart-drawer-body');
    if (!body) return;

    if (!cart.items.length) {
      body.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
      return;
    }

    body.innerHTML = cart.items.map(item => `
      <div class="cart-item" style="display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--grey-border)">
        <div style="width:80px;height:80px;background:var(--grey-mid);border-radius:2px;overflow:hidden;flex-shrink:0">
          <img src="${item.image}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover">
        </div>
        <div style="flex:1">
          <p style="font-family:var(--font-display);font-size:0.95rem;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem">${item.product_title}</p>
          <p style="font-size:0.8rem;color:var(--grey-muted);font-family:var(--font-mono)">${item.variant_title || ''}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem">
            <span style="font-family:var(--font-mono);font-size:0.85rem">₹${(item.price / 100).toFixed(0)}</span>
            <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--grey-muted)">Qty: ${item.quantity}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ── Add to Cart ──
  const addForms = document.querySelectorAll('[data-product-form]');
  addForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const variantId = form.querySelector('[name="id"]')?.value;
      const qty = form.querySelector('[name="quantity"]')?.value || 1;
      if (!variantId) return;

      btn.textContent = 'Adding...';
      btn.disabled = true;

      try {
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: parseInt(qty) })
        });
        btn.textContent = 'Added!';
        setTimeout(() => { btn.textContent = 'Add to Cart'; btn.disabled = false; }, 2000);
        fetchCart();
        openCart();
      } catch (e) {
        btn.textContent = 'Error — Try Again';
        btn.disabled = false;
      }
    });
  });

  // ── Quick Add ──
  document.addEventListener('click', async (e) => {
    const quickBtn = e.target.closest('[data-quick-add]');
    if (!quickBtn) return;
    const variantId = quickBtn.dataset.quickAdd;
    if (!variantId) return;
    quickBtn.textContent = 'Adding...';
    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });
      quickBtn.textContent = 'Added ✓';
      fetchCart();
      setTimeout(() => { quickBtn.textContent = 'Quick Add'; }, 2000);
    } catch (e) { quickBtn.textContent = 'Error'; }
  });

  // ── Size Selector ──
  const sizeOptions = document.querySelectorAll('.size-option');
  const variantInput = document.querySelector('input[name="id"]');
  sizeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      if (opt.classList.contains('sold-out')) return;
      sizeOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      if (variantInput && opt.dataset.variantId) {
        variantInput.value = opt.dataset.variantId;
      }
    });
  });

  // ── Quantity Input ──
  document.addEventListener('click', e => {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;
    const input = btn.closest('.qty-input')?.querySelector('.qty-num');
    if (!input) return;
    let val = parseInt(input.value) || 1;
    if (btn.dataset.action === 'inc') val = Math.min(val + 1, 10);
    if (btn.dataset.action === 'dec') val = Math.max(val - 1, 1);
    input.value = val;
  });

  // ── Product Gallery Thumbnails ──
  const thumbs = document.querySelectorAll('.product-gallery__thumb');
  const mainImg = document.querySelector('.product-gallery__main img');
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      if (mainImg) {
        const src = thumb.querySelector('img')?.src;
        if (src) mainImg.src = src;
      }
    });
  });

  // ── Newsletter Form ──
  const newsletterForm = document.querySelector('.newsletter__form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input[type="email"]');
      const btn = newsletterForm.querySelector('button');
      if (!input?.value) return;
      btn.textContent = 'Done ✓';
      btn.disabled = true;
      input.value = '';
    });
  }

  // ── Mobile Menu ──
  const menuBtn = document.querySelector('.header__menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const open = mobileNav.getAttribute('aria-hidden') === 'false';
      mobileNav.setAttribute('aria-hidden', String(open));
      document.body.style.overflow = open ? '' : 'hidden';
    });
  }

  // ── Lazy image loading ──
  const lazyImgs = document.querySelectorAll('img[loading="lazy"]');
  if ('loading' in HTMLImageElement.prototype === false && 'IntersectionObserver' in window) {
    const imgObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const img = e.target;
          img.src = img.dataset.src || img.src;
          imgObserver.unobserve(img);
        }
      });
    });
    lazyImgs.forEach(img => imgObserver.observe(img));
  }

  // ── Filter buttons ──
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── Init ──
  fetchCart();

})();
