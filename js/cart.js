(() => {
  'use strict';
  const STORAGE_KEY = 'luna-pet-cart-v1';
  const MAX_QUANTITY = 999;
  const catalog = new Map((window.LUNA_PRODUCTOS || []).map(product => [String(product.id), product]));
  const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const priced = value => Number.isSafeInteger(value) && value >= 0;
  const text = (tag, className, content) => {
    const node = document.createElement(tag); node.className = className; node.textContent = content; return node;
  };
  const cartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 3h2l2.5 11.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 6H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>';
  const items = new Map();
  let storageFailed = false, activeStep = 'items', returnFocus, toastTimer;

  function lineFromProduct(product, quantity) {
    return { id: product.id, nombre: product.nombre, peso: product.peso || '', precio: priced(product.precio) ? product.precio : null,
      imagen: product.imagen, imagenFallback: product.imagenFallback || 'img/productos/placeholder.svg', cantidad: quantity };
  }

  // Solo se recuperan IDs y cantidades. Los precios y textos actuales vienen del catálogo,
  // nunca de datos antiguos o manipulados en localStorage.
  function restore(raw) {
    items.clear();
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved.version !== 1 || !Array.isArray(saved.items)) return;
      saved.items.slice(0, 1000).forEach(item => {
        if (!item || !Number.isSafeInteger(item.cantidad) || item.cantidad <= 0) return;
        const key = String(item.id), product = catalog.get(key);
        if (!product) return;
        const quantity = Math.min(MAX_QUANTITY, item.cantidad + (items.get(key)?.cantidad || 0));
        items.set(key, lineFromProduct(product, quantity));
      });
    } catch { /* Un carrito inválido se recupera como vacío. */ }
  }
  try { restore(localStorage.getItem(STORAGE_KEY)); }
  catch { storageFailed = true; }

  function getItems() { return [...items.values()].map(item => ({ ...item })); }
  function totals(lines = getItems()) {
    const quantity = lines.reduce((sum, item) => sum + item.cantidad, 0);
    const pending = lines.filter(item => !priced(item.precio));
    const knownSubtotal = lines.reduce((sum, item) => sum + (priced(item.precio) ? item.precio * item.cantidad : 0), 0);
    return { quantity, knownSubtotal, total: pending.length ? null : knownSubtotal, pending: pending.length };
  }
  function createOrder(customer) {
    const lines = getItems();
    return { items: lines, ...totals(lines), customer: { nombre: customer.nombre.trim(), modalidad: customer.modalidad,
      comuna: customer.modalidad === 'delivery' ? customer.comuna.trim() : '', direccion: customer.modalidad === 'delivery' ? customer.direccion.trim() : '' } };
  }
  function messageForOrder(order) {
    const lines = ['Hola Luna Pet Shop 🐾', '', 'Quiero realizar el siguiente pedido:', ''];
    order.items.forEach(item => {
      lines.push(`• ${item.cantidad}x ${item.nombre}${item.peso ? ` · ${item.peso}` : ''}`);
      lines.push(priced(item.precio) ? `  ${money.format(item.precio)} c/u\n  Subtotal: ${money.format(item.precio * item.cantidad)}` : '  Precio y subtotal por confirmar');
      lines.push('');
    });
    lines.push('--------------------', order.total === null ? 'TOTAL: por confirmar con Luna Pet Shop' : `TOTAL PRODUCTOS: ${money.format(order.total)}`);
    if (order.pending && order.knownSubtotal > 0) lines.push(`Subtotal de productos con precio: ${money.format(order.knownSubtotal)}`);
    lines.push('', `Nombre: ${order.customer.nombre}`, `Modalidad: ${order.customer.modalidad === 'delivery' ? 'Delivery / despacho' : 'Retiro en tienda'}`);
    if (order.customer.modalidad === 'delivery') {
      if (order.customer.comuna) lines.push(`Comuna: ${order.customer.comuna}`);
      if (order.customer.direccion) lines.push(`Dirección: ${order.customer.direccion}`);
      lines.push('Despacho: cobertura y costo por confirmar. No incluido en el total.');
    }
    lines.push('', '¿Me pueden confirmar disponibilidad, precios y forma de pago?', '', 'Gracias 🐶');
    return lines.join('\n');
  }

  const drawer = document.createElement('dialog');
  drawer.id = 'cart-drawer'; drawer.className = 'cart-drawer'; drawer.setAttribute('aria-labelledby', 'cart-title');
  drawer.innerHTML = `
    <div class="cart-shell">
      <header class="cart-heading"><div><p class="eyebrow">PEDIDO POR WHATSAPP</p><h2 id="cart-title">Tu carrito</h2></div>
        <button class="cart-close" type="button" aria-label="Cerrar carrito" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <div class="cart-scroll">
        <p class="cart-storage-note" id="cart-storage-note" hidden>No pudimos guardar el carrito en este navegador. Mantén esta pestaña abierta para conservar tu selección.</p>
        <section id="cart-items-step" aria-label="Productos del carrito">
          <p class="cart-items-caption" id="cart-items-caption" role="status" aria-live="polite"></p>
          <ul class="cart-items" id="cart-items"></ul>
          <div class="cart-empty" id="cart-empty"><span class="cart-empty-icon">${cartIcon}</span><h3>Tu carrito está vacío 🐾</h3><p>Agrega algunos productos para comenzar tu pedido.</p><button type="button" class="button button-dark" id="cart-browse">Ver productos <span aria-hidden="true">↗</span></button></div>
        </section>
        <form id="cart-checkout" hidden>
          <button type="button" class="cart-back" id="cart-back">← Volver al carrito</button>
          <p class="cart-form-intro">Cuéntanos cómo recibir tu pedido. Luna confirmará disponibilidad y coordinará el pago contigo.</p>
          <label class="cart-field" for="order-name">Nombre del cliente<input id="order-name" name="nombre" autocomplete="name" maxlength="80" required placeholder="Tu nombre"></label>
          <fieldset class="cart-delivery-options"><legend>Modalidad</legend>
            <label><input type="radio" name="modalidad" value="retiro" checked><span><strong>Retiro en tienda</strong><small>Av. El Rosal 4969, Maipú</small></span></label>
            <label><input type="radio" name="modalidad" value="delivery"><span><strong>Delivery / despacho</strong><small>Cobertura y costo por confirmar</small></span></label>
          </fieldset>
          <div id="cart-delivery-fields" hidden>
            <label class="cart-field" for="order-comuna">Comuna <span>(opcional)</span><input id="order-comuna" name="comuna" autocomplete="address-level2" maxlength="80" disabled placeholder="Ej. Maipú"></label>
            <label class="cart-field" for="order-address">Dirección <span>(opcional)</span><input id="order-address" name="direccion" autocomplete="street-address" maxlength="180" disabled placeholder="Calle y número"></label>
          </div>
          <details class="cart-message-review"><summary>Revisar mensaje del pedido</summary><pre id="cart-message-preview"></pre></details>
        </form>
      </div>
      <footer class="cart-footer" id="cart-footer" hidden>
        <div class="cart-total"><span>Subtotal</span><strong id="cart-subtotal"></strong></div>
        <p class="cart-pricing-note" id="cart-pricing-note" hidden></p>
        <p class="cart-payment-note">Stock y pago se confirman por WhatsApp. Despacho no incluido.</p>
        <button type="button" class="button button-dark" id="cart-continue">Continuar pedido <span aria-hidden="true">→</span></button>
        <button type="submit" form="cart-checkout" class="button cart-send" id="cart-send" hidden>Enviar pedido por WhatsApp <span aria-hidden="true">↗</span></button>
        <p id="cart-send-status" class="cart-send-status" hidden>Completa el envío en WhatsApp. Tu carrito se conserva hasta que decidas modificarlo. <a id="cart-whatsapp-link" target="_blank" rel="noopener noreferrer">Abrir WhatsApp con mi pedido ↗</a></p>
      </footer>
    </div>`;
  document.body.append(drawer);
  const toast = text('div', 'cart-toast', ''); toast.id = 'cart-toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); toast.setAttribute('aria-atomic', 'true'); document.body.append(toast);
  const $ = selector => drawer.querySelector(selector);
  const form = $('#cart-checkout');
  const headerButton = document.querySelector('[data-cart-open]');
  const closed = () => {
    // Un evento close pendiente no debe limpiar el estado de un diálogo ya reabierto.
    if (drawer.open) return;
    document.documentElement.classList.remove('cart-is-open'); headerButton?.setAttribute('aria-expanded', 'false');
  };

  function notify(message) {
    clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: getItems() })); storageFailed = false; }
    catch { storageFailed = true; }
  }
  function customerFromForm() {
    return { nombre: form.elements.nombre.value, modalidad: form.elements.modalidad.value,
      comuna: form.elements.comuna.value, direccion: form.elements.direccion.value };
  }
  function updatePreview() {
    $('#cart-message-preview').textContent = messageForOrder(createOrder(customerFromForm()));
    $('#cart-send-status').hidden = true;
  }
  function switchStep(step, focus = true) {
    activeStep = step;
    $('#cart-items-step').hidden = step !== 'items'; form.hidden = step !== 'checkout';
    $('#cart-continue').hidden = step !== 'items'; $('#cart-send').hidden = step !== 'checkout';
    $('#cart-title').textContent = step === 'checkout' ? 'Completa tu pedido' : 'Tu carrito';
    if (step === 'checkout') updatePreview();
    if (focus && drawer.open) (step === 'checkout' ? form.elements.nombre : $('.cart-close')).focus();
  }
  function quantityButton(label, action, item) {
    const button = text('button', 'cart-quantity-button', label); button.type = 'button';
    button.dataset.cartAction = action; button.dataset.productId = item.id;
    button.setAttribute('aria-label', `${action === 'increase' ? 'Aumentar' : 'Disminuir'} cantidad de ${item.nombre}`);
    button.disabled = action === 'increase' && item.cantidad >= MAX_QUANTITY;
    return button;
  }
  function itemNode(item) {
    const li = document.createElement('li'); li.className = 'cart-item'; li.dataset.productId = item.id;
    const image = document.createElement('img'); image.src = item.imagen; image.alt = item.nombre; image.width = 72; image.height = 72;
    image.addEventListener('error', () => {
      if (image.getAttribute('src') !== item.imagenFallback) image.src = item.imagenFallback;
      else if (image.getAttribute('src') !== 'img/productos/placeholder.svg') image.src = 'img/productos/placeholder.svg';
      else image.hidden = true;
    });
    const info = document.createElement('div'); info.className = 'cart-item-info';
    info.append(text('h3', 'cart-item-name', item.nombre));
    if (item.peso) info.append(text('p', 'cart-item-size', item.peso));
    info.append(text('p', 'cart-item-price', priced(item.precio) ? `${money.format(item.precio)} c/u` : 'Precio por confirmar'));
    const controls = document.createElement('div'); controls.className = 'cart-item-controls';
    const quantity = document.createElement('div'); quantity.className = 'cart-quantity';
    const count = text('span', 'cart-quantity-value', String(item.cantidad)); count.setAttribute('aria-label', `${item.cantidad} unidades de ${item.nombre}`);
    quantity.append(quantityButton('−', 'decrease', item), count, quantityButton('+', 'increase', item));
    const remove = text('button', 'cart-remove', 'Eliminar'); remove.type = 'button'; remove.dataset.cartAction = 'remove'; remove.dataset.productId = item.id;
    remove.setAttribute('aria-label', `Eliminar ${item.nombre} del carrito`); controls.append(quantity, remove); info.append(controls);
    const subtotal = text('p', 'cart-line-subtotal', priced(item.precio) ? money.format(item.precio * item.cantidad) : 'Por confirmar');
    subtotal.setAttribute('aria-label', `Subtotal de ${item.nombre}: ${subtotal.textContent}`);
    li.append(image, info, subtotal); return li;
  }
  function render(focusTarget) {
    const summary = totals();
    if (!items.size && activeStep === 'checkout') switchStep('items', false);
    headerButton?.setAttribute('aria-label', `Abrir carrito, ${summary.quantity} ${summary.quantity === 1 ? 'unidad' : 'unidades'}`);
    document.querySelectorAll('[data-cart-count]').forEach(counter => { counter.textContent = summary.quantity; });
    $('#cart-items-caption').textContent = `${summary.quantity} ${summary.quantity === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}`;
    $('#cart-items-caption').hidden = !items.size; $('#cart-items').replaceChildren(...getItems().map(itemNode));
    $('#cart-empty').hidden = !!items.size; $('#cart-footer').hidden = !items.size;
    $('#cart-subtotal').textContent = summary.total === null ? 'Por confirmar' : money.format(summary.total);
    $('#cart-pricing-note').hidden = !summary.pending;
    $('#cart-pricing-note').textContent = (summary.knownSubtotal > 0 ? `Productos con precio: ${money.format(summary.knownSubtotal)}. ` : '') + 'Luna confirmará los precios pendientes por WhatsApp.';
    $('#cart-storage-note').hidden = !storageFailed;
    if (activeStep === 'checkout') updatePreview();
    if (focusTarget && drawer.open) {
      const replacement = [...$('#cart-items').querySelectorAll('button')].find(button => button.dataset.productId === focusTarget.id && button.dataset.cartAction === focusTarget.action && !button.disabled);
      (replacement || $('#cart-items').querySelector('button') || $('#cart-browse')).focus({ preventScroll: true });
    }
  }
  function add(id) {
    const key = String(id), product = catalog.get(key); if (!product) return false;
    const quantity = (items.get(key)?.cantidad || 0) + 1;
    if (quantity > MAX_QUANTITY) { notify(`Máximo ${MAX_QUANTITY} unidades por producto.`); return false; }
    items.set(key, lineFromProduct(product, quantity)); save(); render();
    notify(`${product.nombre} agregado al carrito${storageFailed ? '. No se pudo guardar en este navegador.' : ''}`);
    return true;
  }
  function open() {
    if (drawer.open) return;
    returnFocus = document.activeElement; switchStep('items', false); render();
    drawer.showModal(); document.documentElement.classList.add('cart-is-open'); headerButton?.setAttribute('aria-expanded', 'true');
  }
  function close() {
    if (!drawer.open) return;
    drawer.close(); closed();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
  function browse() {
    close();
    const section = document.querySelector('#product-grid')?.closest('section');
    if (section) { section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      section.setAttribute('tabindex', '-1'); section.focus({ preventScroll: true }); }
    else location.href = 'productos.html';
  }
  headerButton?.addEventListener('click', open); $('.cart-close').addEventListener('click', close);
  drawer.addEventListener('cancel', event => { event.preventDefault(); close(); }); drawer.addEventListener('close', closed);
  drawer.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...drawer.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],summary,[tabindex="0"]')]
      .filter(control => control.getClientRects().length && !control.closest('[hidden]'));
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  let backdropDown = false;
  const outside = event => { const rect = drawer.getBoundingClientRect(); return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom; };
  drawer.addEventListener('pointerdown', event => { backdropDown = event.target === drawer && outside(event); });
  drawer.addEventListener('click', event => { if (backdropDown && event.target === drawer && outside(event)) close(); backdropDown = false; });
  $('#cart-browse').addEventListener('click', browse);
  $('#cart-continue').addEventListener('click', () => { if (items.size) switchStep('checkout'); });
  $('#cart-back').addEventListener('click', () => switchStep('items'));
  $('#cart-items').addEventListener('click', event => {
    const button = event.target.closest('[data-cart-action]'); if (!button) return;
    const key = button.dataset.productId, item = items.get(key); if (!item) return;
    const action = button.dataset.cartAction;
    if (action === 'remove' || (action === 'decrease' && item.cantidad === 1)) items.delete(key);
    else item.cantidad = Math.max(1, Math.min(MAX_QUANTITY, item.cantidad + (action === 'increase' ? 1 : -1)));
    save(); render({ id: key, action });
    notify(action === 'remove' || !items.has(key) ? `${item.nombre} eliminado del carrito` : `Cantidad de ${item.nombre}: ${item.cantidad}`);
  });
  form.addEventListener('input', () => { form.elements.nombre.setCustomValidity(''); updatePreview(); });
  form.addEventListener('change', () => {
    const delivery = form.elements.modalidad.value === 'delivery'; $('#cart-delivery-fields').hidden = !delivery;
    form.elements.comuna.disabled = !delivery; form.elements.direccion.disabled = !delivery; updatePreview();
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!items.size) { switchStep('items'); return; }
    if (!form.elements.nombre.value.trim()) { form.elements.nombre.setCustomValidity('Escribe tu nombre para preparar el pedido.'); form.reportValidity(); return; }
    const order = createOrder(customerFromForm());
    const url = window.LunaContact.whatsappUrl(messageForOrder(order));
    $('#cart-whatsapp-link').href = url; $('#cart-send-status').hidden = false;
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    const active = document.activeElement;
    const focusTarget = active?.dataset.cartAction ? { id: active.dataset.productId, action: active.dataset.cartAction } : null;
    restore(event.newValue); render(focusTarget);
  });
  window.LunaCart = Object.freeze({ add, open, close, getItems, totals, createOrder, messageForOrder, formatMoney: value => money.format(value), cartIcon });
  render();
})();
