(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const labels = {todos:'Todos', perros:'Perros', gatos:'Gatos', snacks:'Snacks', accesorios:'Accesorios', higiene:'Higiene', ropa:'Ropa'};
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const whatsapp = (message) => window.LunaContact.whatsappUrl(message);
  const whatsappIcon = '<svg class="icon-whatsapp" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>';
  // data-photo-src admite una fotografía opcional; data-fallback conserva la ilustración.
  function prepareImage(img) {
    img.addEventListener('error', () => {
      const fallback = img.dataset.fallback;
      if (fallback && img.getAttribute('src') !== fallback) {
        img.src = fallback;
      } else if (img.getAttribute('src') !== 'img/productos/placeholder.svg') {
        img.src = 'img/productos/placeholder.svg';
      } else {
        img.hidden = true;
      }
    });
    if (img.dataset.photoSrc) img.src = img.dataset.photoSrc;
    else if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
  }
  document.querySelectorAll('img[data-fallback]').forEach(prepareImage);
  document.querySelectorAll('[data-whatsapp]').forEach(link => {
    link.href = whatsapp(link.dataset.whatsapp || 'Hola Luna 🐾, quisiera consultar por sus productos.');
    link.target = '_blank'; link.rel = 'noopener noreferrer';
  });
  const menu = $('#menu-toggle');
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); $('#main-nav').classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { menu?.setAttribute('aria-expanded','false'); $('#main-nav')?.classList.remove('is-open'); }
  });
  const grid = $('#product-grid');
  if (!grid) return;
  const catalog = document.body.dataset.page === 'catalog';
  const PRODUCTS_PER_PAGE = 12;
  const pagination = $('#catalog-pagination');
  const params = new URLSearchParams(location.search);
  let category = labels[params.get('categoria')] ? params.get('categoria') : 'todos';
  let query = params.get('q') || '';
  let offers = params.get('ofertas') === 'true';
  const requestedPage = Number(params.get('page'));
  let currentPage = catalog && Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = $('#catalog-search');
  if (search) search.value = query;
  const headerSearch = $('#header-search');
  if (catalog && headerSearch) headerSearch.value = query;
  const productCard = (product) => {
    const article = document.createElement('article'); article.className = 'product-card';
    const imageWrap = document.createElement('div'); imageWrap.className = 'product-image';
    const img = document.createElement('img'); img.alt = product.nombre; img.loading = 'lazy'; img.width = 500; img.height = 500;
    img.dataset.fallback = product.imagenFallback || 'img/productos/placeholder.svg';
    prepareImage(img); img.src = product.imagen || img.dataset.fallback; imageWrap.append(img);
    if (product.oferta) { const badge = document.createElement('span'); badge.className = 'offer-badge'; badge.textContent = product.demo ? 'Oferta DEMO' : 'Oferta'; imageWrap.append(badge); }
    const body = document.createElement('div'); body.className = 'product-body';
    const brand = document.createElement('p'); brand.className = 'brand-label'; brand.textContent = product.marca || labels[product.categoria];
    const name = document.createElement('h3'); name.textContent = product.nombre;
    const size = document.createElement('p'); size.className = 'product-size'; size.textContent = product.peso;
    const price = document.createElement('p'); price.className = 'product-price'; price.textContent = Number.isSafeInteger(product.precio) && product.precio >= 0 ? window.LunaCart.formatMoney(product.precio) : 'Consultar precio';
    const actions = document.createElement('div'); actions.className = 'product-actions';
    const add = document.createElement('button'); add.type = 'button'; add.className = 'consult-button add-to-cart'; add.dataset.productId = product.id;
    add.innerHTML = window.LunaCart.cartIcon;
    const addLabel = document.createElement('span'); addLabel.textContent = 'Agregar al carrito'; add.append(addLabel);
    add.setAttribute('aria-label', `Agregar al carrito: ${product.nombre} ${product.peso}`);
    add.addEventListener('click', () => window.LunaCart.add(product.id));
    const message = `Hola Luna 🐾, vi ${product.nombre} ${product.peso} en su página y quisiera consultar precio y disponibilidad.`;
    const consult = document.createElement('a'); consult.className = 'product-inquiry'; consult.innerHTML = whatsappIcon;
    const ctaLabel = document.createElement('span'); ctaLabel.textContent = 'Consultar por WhatsApp'; consult.append(ctaLabel);
    consult.href = whatsapp(message); consult.target = '_blank'; consult.rel = 'noopener noreferrer'; consult.setAttribute('aria-label', `Consultar por WhatsApp: ${product.nombre} ${product.peso}`);
    actions.append(add, consult); body.append(brand, name, size, price, actions); article.append(imageWrap,body); return article;
  };
  function renderPagination(totalPages) {
    if (!pagination) return;
    pagination.replaceChildren();
    pagination.hidden = totalPages <= 1;
    if (pagination.hidden) return;
    const makeButton = (page, label, className, disabled = false) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = `pagination-button ${className}`;
      button.dataset.page = page; button.textContent = label; button.disabled = disabled;
      return button;
    };
    const edgeButton = (direction, page, disabled) => {
      const previous = direction === 'previous';
      const label = previous ? 'Anterior' : 'Siguiente';
      const button = makeButton(page, '', 'pagination-edge', disabled);
      button.dataset.direction = direction; button.setAttribute('aria-label', `Página ${previous ? 'anterior' : 'siguiente'}`);
      const arrow = document.createElement('span'); arrow.textContent = previous ? '←' : '→'; arrow.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.className = 'pagination-label'; text.textContent = label;
      button.append(...(previous ? [arrow, text] : [text, arrow]));
      return button;
    };
    const pages = document.createElement('div'); pages.className = 'pagination-pages';
    // En catálogos grandes se conservan los extremos y las páginas próximas a la actual.
    const visiblePages = totalPages <= 7
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : [...new Set([1, totalPages, ...Array.from({ length: 5 }, (_, index) => currentPage - 2 + index)])]
        .filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    let lastPage = 0;
    visiblePages.forEach(page => {
      if (page - lastPage > 1) {
        const ellipsis = document.createElement('span'); ellipsis.className = 'pagination-ellipsis'; ellipsis.textContent = '…'; ellipsis.setAttribute('aria-hidden', 'true'); pages.append(ellipsis);
      }
      const button = makeButton(page, String(page), 'pagination-number');
      button.setAttribute('aria-label', `Página ${page}`);
      if (page === currentPage) button.setAttribute('aria-current', 'page');
      pages.append(button); lastPage = page;
    });
    pagination.append(edgeButton('previous', currentPage - 1, currentPage === 1), pages, edgeButton('next', currentPage + 1, currentPage === totalPages));
  }
  function scrollToCatalog() {
    $('#catalog')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  function render(updateURL = false) {
    const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
    const results = window.LUNA_PRODUCTOS.filter(p => (catalog || p.destacado) && (category === 'todos' || p.categoria === category) && (!offers || p.oferta) && words.every(word => normalize(`${p.nombre} ${p.marca} ${p.categoria} ${p.subcategoria} ${p.peso}`).includes(word)));
    const totalPages = Math.ceil(results.length / PRODUCTS_PER_PAGE);
    currentPage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const visibleProducts = catalog ? results.slice(start, start + PRODUCTS_PER_PAGE) : results;
    grid.replaceChildren(...visibleProducts.map(productCard));
    $('#empty-state').hidden = results.length > 0;
    if ($('#result-count')) $('#result-count').textContent = results.length
      ? `Mostrando ${start + 1}–${start + visibleProducts.length} de ${results.length} ${results.length === 1 ? 'producto' : 'productos'}`
      : 'Mostrando 0 de 0 productos';
    if (catalog) renderPagination(totalPages);
    document.querySelectorAll('[data-category]').forEach(button => { const active = button.dataset.category === category; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
    if ($('#offers-filter')) $('#offers-filter').checked = offers;
    if (catalog && updateURL) {
      const next = new URLSearchParams(); if (category !== 'todos') next.set('categoria',category); if (query.trim()) next.set('q',query.trim()); if (offers) next.set('ofertas','true');
      if (currentPage > 1) next.set('page', String(currentPage));
      try { history.replaceState(null,'',location.pathname + (next.size ? '?' + next : '') + location.hash); } catch (_) { /* file:// puede restringir History; los filtros siguen funcionando. */ }
    }
  }
  if (!catalog) { category = 'todos'; query = ''; offers = false; }
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { category = button.dataset.category; currentPage = 1; render(true); }));
  search?.addEventListener('input', () => { query = search.value; currentPage = 1; if (headerSearch) headerSearch.value = query; render(true); });
  $('#offers-filter')?.addEventListener('change', event => { offers = event.target.checked; currentPage = 1; render(true); });
  $('#reset-filters')?.addEventListener('click', () => { category = 'todos'; query = ''; offers = false; currentPage = 1; if (search) search.value = ''; if (headerSearch) headerSearch.value = ''; render(true); search?.focus(); });
  if (catalog) {
    pagination?.addEventListener('click', event => {
      const button = event.target.closest('button[data-page]');
      if (!button || !pagination.contains(button) || button.disabled) return;
      const page = Number(button.dataset.page);
      if (page === currentPage) return;
      currentPage = page; render(true);
      $('#catalog')?.focus({ preventScroll: true }); scrollToCatalog();
    });
    $('#header-search-form')?.addEventListener('submit', event => { event.preventDefault(); query = headerSearch.value; search.value = query; currentPage = 1; render(true); scrollToCatalog(); });
    headerSearch?.addEventListener('input', () => { query = headerSearch.value; search.value = query; currentPage = 1; render(true); });
  }
  render(catalog);
})();
