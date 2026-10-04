(() => {
  'use strict';
  const section = document.querySelector('#resenas');
  if (!section) return;
  const config = window.LUNA_RESENAS_CONFIG || {};
  const grid = section.querySelector('.reviews-grid');
  const status = section.querySelector('#reviews-status');
  const summary = section.querySelector('#reviews-summary');
  const sourceLink = section.querySelector('#reviews-source');
  const empty = section.querySelector('#reviews-empty');
  const loadButton = section.querySelector('#load-reviews');
  const safeURL = value => {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
    catch (_) { return ''; }
  };
  const link = safeURL(config.fichaUrl);
  if (link) { sourceLink.href = link; sourceLink.hidden = false; }
  if (!config.habilitado || !config.apiKey || !config.placeId) return;
  // Sin credenciales no se consulta Google; con configuración se carga al entrar a la sección.
  status.textContent = 'Consulta las opiniones publicadas en Google Maps.';
  let apiPromise;
  function loadAPI() {
    if (window.google?.maps?.importLibrary) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const callback = '__lunaGoogleReviewsReady';
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('timeout')), 15000);
      function finish(error) {
        clearTimeout(timer); window[callback] = () => {};
        if (error) { apiPromise = null; script.remove(); reject(error); } else resolve();
      }
      window[callback] = () => finish(); script.async = true;
      script.src = 'https://maps.googleapis.com/maps/api/js?' + new URLSearchParams({
        key: config.apiKey, loading: 'async', libraries: 'places', v: 'weekly', callback
      });
      script.onerror = () => finish(new Error('network')); document.head.append(script);
    });
    return apiPromise;
  }
  function text(tag, className, value) {
    const element = document.createElement(tag); element.className = className;
    element.textContent = value; return element;
  }
  function reviewCard(review) {
    const card = document.createElement('article'); card.className = 'review-card';
    const author = review.authorAttribution || {};
    const header = document.createElement('div'); header.className = 'review-author';
    const initials = text('span', 'review-avatar', (author.displayName || 'G').slice(0, 1));
    initials.setAttribute('aria-hidden', 'true');
    const profile = safeURL(author.uri);
    const name = text(profile ? 'a' : 'span', 'review-name', author.displayName || 'Usuario de Google');
    if (profile) { name.href = profile; name.target = '_blank'; name.rel = 'noopener noreferrer'; }
    const business = document.createElement('div'); business.className = 'review-business';
    business.append(text('h3', '', 'Luna Pet Shop'), text('span', 'review-source-label', 'Reseña de Google Maps'));
    const quote = text('span', 'review-quote', '”'); quote.setAttribute('aria-hidden', 'true');
    header.append(initials, business, quote); card.append(header);
    if (Number.isFinite(review.rating)) {
      const rating = document.createElement('div'); rating.className = 'review-rating';
      rating.setAttribute('aria-label', `${review.rating} de 5 estrellas`);
      const stars = text('span', 'review-stars', '★'.repeat(Math.max(0, Math.min(5, Math.round(review.rating)))) + '☆'.repeat(5 - Math.max(0, Math.min(5, Math.round(review.rating)))));
      stars.setAttribute('aria-hidden', 'true');
      const score = text('span', 'review-rating-value', review.rating.toFixed(1)); score.setAttribute('aria-hidden', 'true');
      rating.append(score, stars); card.append(rating);
    }
    card.append(text('p', 'review-text', review.text || 'Valoración sin comentario.'));
    const footer = document.createElement('div'); footer.className = 'review-footer'; footer.append(name);
    if (review.relativePublishTimeDescription) footer.append(text('p', 'review-date', review.relativePublishTimeDescription));
    card.append(footer);
    const original = safeURL(review.googleMapsURI);
    if (original) {
      const anchor = text('a', 'review-original', 'Ver reseña en Google Maps ↗');
      anchor.href = original; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; card.append(anchor);
    }
    return card;
  }
  async function loadReviews() {
    loadButton.disabled = true; loadButton.textContent = 'Cargando opiniones…';
    status.textContent = 'Consultando Google Maps…'; section.setAttribute('aria-busy', 'true');
    try {
      await loadAPI();
      const { Place } = await google.maps.importLibrary('places');
      const place = new Place({ id: config.placeId });
      await place.fetchFields({ fields: ['displayName', 'rating', 'userRatingCount', 'reviews', 'googleMapsURI', 'attributions'] });
      const actualLink = safeURL(place.googleMapsURI);
      if (actualLink) { sourceLink.href = actualLink; sourceLink.hidden = false; }
      summary.replaceChildren();
      if (Number.isFinite(place.rating)) summary.append(text('strong', 'review-score', `${place.rating.toLocaleString('es-CL')} / 5`));
      if (Number.isFinite(place.userRatingCount)) summary.append(text('span', '', `${place.userRatingCount.toLocaleString('es-CL')} valoraciones en Google Maps`));
      summary.hidden = summary.childElementCount === 0;
      // Destacados: las mejor valoradas entre las reseñas devueltas por Google.
      // En empates se conserva el orden de relevancia original. No se inventan reseñas.
      const limit = Math.max(1, Math.min(5, Math.floor(Number(config.maxResenas) || 3)));
      const reviews = [...(place.reviews || [])].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit);
      grid.replaceChildren(...reviews.map(reviewCard));
      empty.hidden = reviews.length > 0;
      status.textContent = reviews.length ? 'Destacadas por valoración entre las reseñas proporcionadas por Google.' : 'Google no devolvió reseñas para esta ficha.';
      const credits = section.querySelector('#reviews-attributions'); credits.replaceChildren();
      for (const attribution of place.attributions || []) {
        const url = safeURL(attribution.providerURI);
        const credit = text(url ? 'a' : 'span', '', attribution.provider || '');
        if (url) { credit.href = url; credit.target = '_blank'; credit.rel = 'noopener noreferrer'; }
        credits.append(credit);
      }
      section.querySelector('#reviews-policy').hidden = false; loadButton.hidden = true;
    } catch (_) {
      status.textContent = 'No pudimos cargar las opiniones. Puedes consultarlas en la ficha de Google Maps.';
      loadButton.textContent = 'Volver a intentar'; loadButton.disabled = false; loadButton.hidden = false;
    } finally { section.setAttribute('aria-busy', 'false'); }
  }
  loadButton.addEventListener('click', loadReviews);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); loadReviews(); }
    }, { rootMargin: '200px' });
    observer.observe(section);
  } else { loadReviews(); }
})();
