(() => {
  'use strict';
  function initReviews() {
    const carousel = document.querySelector('#reviews-carousel');
    if (!carousel) return;
    const allData = Array.isArray(window.resenasLunaPet) ? window.resenasLunaPet : [];
    const selected = allData.filter(review => !review.placeholder);
    // Cuando hay reseñas reales, los espacios pendientes permanecen solo en el archivo de datos.
    const data = selected.length ? selected : allData;
    const track = carousel.querySelector('.reviews-track');
    const viewport = carousel.querySelector('.reviews-viewport');
    const dots = carousel.querySelector('.reviews-pagination');
    const previous = carousel.querySelector('#review-prev');
    const next = carousel.querySelector('#review-next');
    const autoplay = carousel.querySelector('#review-autoplay');
    const position = carousel.querySelector('#reviews-position');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const pauses = new Set();
    let index = 0, moving = false, timer, interactionTimer, settle;
    const cards = [];
    function text(tag, className, value) {
      const node = document.createElement(tag); node.className = className; node.textContent = value; return node;
    }
    function safeUrl(value, allowLocal = false) {
      if (typeof value !== 'string' || !value.trim()) return null;
      try {
        const url = new URL(value, document.baseURI);
        const relative = !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value.trim());
        if (url.protocol === 'https:' || (allowLocal && relative && ['file:', 'http:', 'https:'].includes(url.protocol))) return url.href;
      } catch { /* Un enlace inválido no se muestra. */ }
      return null;
    }
    function externalLink(className, label, href) {
      const link = text('a', className, label);
      link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
    }
    function authorAvatar(review, name) {
      const avatar = document.createElement('span'); avatar.className = 'review-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      if (review.placeholder) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        const head = document.createElementNS(icon.namespaceURI, 'circle');
        head.setAttribute('cx', '12'); head.setAttribute('cy', '8'); head.setAttribute('r', '4');
        const body = document.createElementNS(icon.namespaceURI, 'path'); body.setAttribute('d', 'M4 21v-2a8 8 0 0 1 16 0v2');
        icon.append(head, body); avatar.append(icon);
      } else {
        avatar.textContent = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase('es-CL');
        const photo = safeUrl(review.foto, true);
        if (photo) {
          const image = document.createElement('img'); image.alt = ''; image.width = 52; image.height = 52;
          image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
          image.addEventListener('error', () => image.remove(), { once: true }); image.src = photo; avatar.append(image);
        }
      }
      return avatar;
    }
    data.forEach((review, number) => {
      const card = document.createElement('article'); card.className = 'review-card';
      card.dataset.reviewIndex = number;
      card.setAttribute('role', 'group'); card.setAttribute('aria-roledescription', 'reseña');
      card.setAttribute('aria-label', `${number + 1} de ${data.length}${review.placeholder ? ', placeholder' : ''}`);
      const name = review.nombre || 'Nombre pendiente';
      const header = document.createElement('div'); header.className = 'review-header';
      const person = document.createElement('div'); person.className = 'review-person';
      const identity = document.createElement('div'); identity.className = 'review-identity';
      const author = text('h3', 'review-name', name);
      const profile = !review.placeholder && safeUrl(review.perfilUrl);
      if (profile) author.replaceChildren(externalLink('review-author-link', name, profile));
      const rating = Math.max(0, Math.min(5, Number(review.estrellas) || 0));
      const ratingRow = document.createElement('div'); ratingRow.className = 'review-rating';
      ratingRow.setAttribute('role', 'img'); ratingRow.setAttribute('aria-label', `${rating} de 5 estrellas${review.placeholder ? ' de muestra' : ''}`);
      const score = text('span', 'review-score', rating.toFixed(1));
      const stars = text('span', 'review-stars', '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating)));
      score.setAttribute('aria-hidden', 'true'); stars.setAttribute('aria-hidden', 'true'); ratingRow.append(score, stars);
      identity.append(author, ratingRow); person.append(authorAvatar(review, name), identity);
      const quote = text('span', 'review-quote', '”'); quote.setAttribute('aria-hidden', 'true');
      header.append(person, quote); card.append(header);
      if (review.placeholder) card.append(text('span', 'review-placeholder', 'PLACEHOLDER · No es una opinión real'));
      const comment = text('p', 'review-text', review.comentario || 'Comentario pendiente');
      comment.id = `review-comment-${number}`;
      const expand = text('button', 'review-expand', 'Leer más'); expand.type = 'button'; expand.hidden = true;
      expand.setAttribute('aria-expanded', 'false'); expand.setAttribute('aria-controls', comment.id);
      expand.addEventListener('click', () => {
        const open = expand.getAttribute('aria-expanded') !== 'true';
        expand.setAttribute('aria-expanded', String(open)); expand.textContent = open ? 'Ver menos' : 'Leer más';
        comment.classList.toggle('is-expanded', open);
        updateExpandedPause(); syncAutoplay();
      });
      const footer = document.createElement('div'); footer.className = 'review-footer';
      footer.append(text('p', 'review-source-label', review.placeholder ? 'Google · fuente pendiente de verificar' : review.fuente || 'Google'));
      if (review.fecha) footer.append(text('p', 'review-date', review.fecha));
      const original = !review.placeholder && safeUrl(review.resenaUrl);
      if (original) footer.append(externalLink('review-original-link', 'Ver reseña ↗', original));
      else if (review.extracto && !review.placeholder) {
        const business = safeUrl(document.querySelector('#reviews-source')?.href);
        if (business) footer.append(externalLink('review-original-link', 'Ver en Google Maps ↗', business));
      }
      card.append(comment, expand);
      if (review.extracto && !review.placeholder) card.append(text('p', 'review-excerpt-note', 'Extracto de la reseña · Texto visible en la captura'));
      // Google no proporciona el producto comprado. Este dato se confirma manualmente.
      if (!review.placeholder && review.productoConfirmado === true && typeof review.producto === 'string' && review.producto.trim()) {
        const product = document.createElement('div'); product.className = 'review-product';
        product.append(text('span', 'review-product-label', 'Producto mencionado'), text('span', 'review-product-name', review.producto.trim()));
        card.append(product);
      }
      card.append(footer); track.append(card); cards.push(card);
    });
    const placeholders = data.filter(review => review.placeholder).length;
    document.querySelector('#reviews-recommendation').textContent = data.length > placeholders ? 'Clientes que nos recomiendan en Google' : 'Espacios preparados para opiniones de Google';
    const disclosure = document.querySelector('#reviews-disclosure');
    disclosure.hidden = false;
    disclosure.textContent = selected.length
      ? 'Reseñas seleccionadas de Google Maps · Fechas según las capturas compartidas.'
      : data.length ? `PLACEHOLDERS · ${placeholders} espacios pendientes de reseñas reales. Las estrellas de estos espacios son de muestra.` : 'Todavía no se han incorporado reseñas.';
    if (!data.length) { carousel.hidden = true; return; }
    // Cuatro grupos como máximo; las flechas y autoplay recorren una tarjeta a la vez.
    const groupSize = Math.ceil(data.length / Math.min(4, data.length));
    for (let start = 0; start < data.length; start += groupSize) {
      const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'review-dot';
      dot.dataset.start = start; dot.setAttribute('aria-label', `Ir al grupo desde la reseña ${start + 1}`);
      dot.addEventListener('click', () => {
        if (moving) return;
        track.classList.add('is-resetting');
        track.replaceChildren(...cards.slice(start), ...cards.slice(0, start));
        index = start; track.style.transform = ''; update(true); interact();
      }); dots.append(dot);
    }
    const visibleCount = () => Number(getComputedStyle(carousel).getPropertyValue('--reviews-visible')) || 1;
    function updateExpandedPause() {
      const expanded = [...track.children].slice(0, visibleCount()).some(card => card.querySelector('.review-expand').getAttribute('aria-expanded') === 'true');
      if (expanded) pauses.add('expanded'); else pauses.delete('expanded');
    }
    function update(manual = false) {
      const visible = visibleCount();
      [...track.children].forEach((card, offset) => {
        const hidden = offset >= visible; card.inert = hidden; card.setAttribute('aria-hidden', String(hidden));
        const button = card.querySelector('.review-expand'); const comment = card.querySelector('.review-text');
        button.hidden = button.getAttribute('aria-expanded') !== 'true' && comment.scrollHeight <= comment.clientHeight + 1;
      });
      dots.querySelectorAll('button').forEach(dot => {
        const active = Number(dot.dataset.start) === Math.floor(index / groupSize) * groupSize;
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
      position.setAttribute('aria-live', manual ? 'polite' : 'off');
      position.textContent = `Desde la reseña ${index + 1} de ${data.length}. ${Math.min(visible, data.length)} visibles.`;
      carousel.dataset.index = index; updateExpandedPause();
    }
    function syncAutoplay() {
      clearInterval(timer);
      if (!motion.matches && !pauses.size && data.length > visibleCount()) timer = setInterval(() => move(1), 5000);
      autoplay.disabled = motion.matches || data.length <= visibleCount();
      autoplay.textContent = motion.matches ? 'Movimiento reducido' : pauses.has('user') ? 'Reanudar' : 'Pausar';
      autoplay.setAttribute('aria-label', pauses.has('user') ? 'Reanudar carrusel' : 'Pausar carrusel');
      autoplay.setAttribute('aria-pressed', String(pauses.has('user')));
    }
    function interact() {
      pauses.add('interaction'); syncAutoplay(); clearTimeout(interactionTimer);
      interactionTimer = setTimeout(() => { pauses.delete('interaction'); syncAutoplay(); }, 8000);
    }
    function move(direction, manual = false) {
      if (moving || data.length <= visibleCount()) return;
      moving = true;
      const step = track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
      let fallback;
      settle = () => {
        if (!moving) return;
        clearTimeout(fallback); track.removeEventListener('transitionend', onEnd);
        track.classList.add('is-resetting');
        if (direction > 0) track.append(track.firstElementChild);
        track.style.transform = ''; index = (index + direction + data.length) % data.length;
        moving = false; settle = null; update(manual);
      };
      const onEnd = event => { if (event.target === track && event.propertyName === 'transform') settle?.(); };
      if (motion.matches) {
        if (direction < 0) track.prepend(track.lastElementChild);
        settle(); return;
      }
      if (direction < 0) {
        track.classList.add('is-resetting'); track.prepend(track.lastElementChild);
        track.style.transform = `translateX(${-step}px)`;
      }
      // Forzar la posición de inicio antes de activar la transición evita saltos al volver atrás.
      void track.offsetWidth;
      track.classList.remove('is-resetting'); track.addEventListener('transitionend', onEnd);
      track.style.transform = direction > 0 ? `translateX(${-step}px)` : 'translateX(0)';
      fallback = setTimeout(() => settle?.(), 600);
    }
    previous.addEventListener('click', () => { move(-1, true); interact(); });
    next.addEventListener('click', () => { move(1, true); interact(); });
    autoplay.addEventListener('click', () => {
      if (pauses.has('user')) { pauses.delete('user'); pauses.delete('focus'); pauses.delete('interaction'); }
      else pauses.add('user'); syncAutoplay();
    });
    carousel.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { pauses.add('hover'); syncAutoplay(); } });
    carousel.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { pauses.delete('hover'); syncAutoplay(); } });
    carousel.addEventListener('focusin', () => { pauses.add('focus'); syncAutoplay(); });
    carousel.addEventListener('focusout', event => { if (!carousel.contains(event.relatedTarget)) { pauses.delete('focus'); syncAutoplay(); } });
    carousel.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1, true); interact(); }
    });
    let gesture;
    viewport.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.target.closest('button,a') || (event.pointerType === 'mouse' && event.button !== 0)) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY }; interact();
    });
    viewport.addEventListener('pointerup', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y; gesture = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1, true);
      interact();
    });
    viewport.addEventListener('pointercancel', () => { gesture = null; interact(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauses.add('hidden'); else pauses.delete('hidden'); syncAutoplay(); });
    if (typeof IntersectionObserver === 'function') {
      pauses.add('outside');
      new IntersectionObserver(entries => { if (entries[0].isIntersecting) pauses.delete('outside'); else pauses.add('outside'); syncAutoplay(); }).observe(carousel);
    }
    const resize = () => { settle?.(); update(); syncAutoplay(); };
    if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(viewport);
    else window.addEventListener('resize', resize);
    motion.addEventListener('change', resize);
    if (document.hidden) pauses.add('hidden');
    update(); syncAutoplay();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initReviews, { once: true });
  else initReviews();
})();
