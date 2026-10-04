(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const labels = {todos:'Todos', perros:'Perros', gatos:'Gatos', snacks:'Snacks', accesorios:'Accesorios', higiene:'Higiene'};
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const whatsapp = (message) => `https://wa.me/56971582988?text=${encodeURIComponent(message)}`;
  const whatsappIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-12 7L3 20l1.5-5A8 8 0 1 1 20 11.5Z"/><path d="M8 7q0 7 7 7l1-2-3-1-1 1-2-2 1-1-1-3Z"/></svg>';
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
  const params = new URLSearchParams(location.search);
  let category = labels[params.get('categoria')] ? params.get('categoria') : 'todos';
  let query = params.get('q') || '';
  let offers = params.get('ofertas') === 'true';
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
    const price = document.createElement('p'); price.className = 'product-price'; price.textContent = product.precio == null ? 'Consultar precio' : new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(product.precio);
    const actions = document.createElement('div'); actions.className = 'product-actions';
    const message = `Hola Luna 🐾, vi ${product.nombre} ${product.peso} en su página y quisiera consultar precio y disponibilidad.`;
    const consult = document.createElement('a'); consult.className = 'consult-button'; consult.innerHTML = whatsappIcon;
    const ctaLabel = document.createElement('span'); ctaLabel.textContent = 'Consultar por WhatsApp'; consult.append(ctaLabel);
    consult.href = whatsapp(message); consult.target = '_blank'; consult.rel = 'noopener noreferrer'; consult.setAttribute('aria-label', `Consultar por WhatsApp: ${product.nombre} ${product.peso}`);
    actions.append(consult); body.append(brand, name, size, price, actions); article.append(imageWrap,body); return article;
  };
  function render(updateURL = false) {
    const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
    const results = window.LUNA_PRODUCTOS.filter(p => (catalog || p.destacado) && (category === 'todos' || p.categoria === category) && (!offers || p.oferta) && words.every(word => normalize(`${p.nombre} ${p.marca} ${p.categoria} ${p.subcategoria} ${p.peso}`).includes(word)));
    grid.replaceChildren(...results.map(productCard));
    $('#empty-state').hidden = results.length > 0;
    if ($('#result-count')) $('#result-count').textContent = `${results.length} ${results.length === 1 ? 'producto encontrado' : 'productos encontrados'}`;
    document.querySelectorAll('[data-category]').forEach(button => { const active = button.dataset.category === category; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
    if ($('#offers-filter')) $('#offers-filter').checked = offers;
    if (catalog && updateURL) {
      const next = new URLSearchParams(); if (category !== 'todos') next.set('categoria',category); if (query.trim()) next.set('q',query.trim()); if (offers) next.set('ofertas','true');
      try { history.replaceState(null,'',location.pathname + (next.size ? '?' + next : '') + location.hash); } catch (_) { /* file:// puede restringir History; los filtros siguen funcionando. */ }
    }
  }
  if (!catalog) { category = 'todos'; query = ''; offers = false; }
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { category = button.dataset.category; render(true); }));
  search?.addEventListener('input', () => { query = search.value; if (headerSearch) headerSearch.value = query; render(true); });
  $('#offers-filter')?.addEventListener('change', event => { offers = event.target.checked; render(true); });
  $('#reset-filters')?.addEventListener('click', () => { category = 'todos'; query = ''; offers = false; if (search) search.value = ''; if (headerSearch) headerSearch.value = ''; render(true); search?.focus(); });
  if (catalog) {
    $('#header-search-form')?.addEventListener('submit', event => { event.preventDefault(); query = headerSearch.value; search.value = query; render(true); $('#catalog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); });
    headerSearch?.addEventListener('input', () => { query = headerSearch.value; search.value = query; render(true); });
  }
  render();
})();
