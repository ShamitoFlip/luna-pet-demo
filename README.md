# Luna Pet Shop — demo de propuesta web

Abre `index.html` directamente o usa Live Server. No requiere instalación ni backend.

- `js/productos.js`: 12 productos referenciales DEMO. Marcas vacías hasta confirmación real; la tarjeta muestra la categoría en su lugar. Precios y stock desconocidos (`null`). Todas las ofertas desactivadas hasta confirmación real.
- `js/main.js`: tarjetas, búsqueda sin recarga en catálogo, filtros URL y enlaces WhatsApp con mensajes codificados.
- `css/style.css`: diseño y reglas para móvil, tablet y escritorio. Bootstrap 5.3 se carga por CDN; navegación propia no depende del JavaScript de Bootstrap.
- `img/`: ilustraciones SVG originales de muestra. El logo proporcionado se utiliza desde img/logo/luna.png. Sustituir las ilustraciones del hero, productos e Instagram por fotografías autorizadas. Las rutas se encuentran en HTML y productos.js.

Confirmar con el negocio horarios, retiro, catálogo, promociones, precios y condiciones antes de publicar. No se han añadido precios ni promesas de delivery. La sección de Instagram es una maqueta, no un feed en vivo.

Los estilos personalizados, datos e imágenes funcionan localmente. Bootstrap, tipografías y mapa requieren internet. Para publicar, sustituir Open Graph por una fotografía con URL absoluta y agregar URL canónica real.

## Fotografías y fallback

En el hero, categorías e Instagram, completa `data-photo-src` con la ruta de una foto autorizada y actualiza su `alt`. El atributo `data-fallback` conserva la ilustración si la foto falla; no se solicitan fotos inexistentes por defecto. Las cards de Instagram enlazan al perfil y sus enlaces pueden reemplazarse por publicaciones reales, sin scraping.

En productos.js, cambia `imagen` por la fotografía y conserva `imagenFallback` como alternativa. Si ambas fallan, se muestra `img/productos/placeholder.svg`. Productos usan `object-fit: contain`; fotografías de categorías, hero e Instagram usan `cover`. Ajusta `object-position` en CSS si la fotografía requiere otro encuadre.

## Reseñas oficiales de Google Maps

La ficha comercial proporcionada está enlazada en `js/resenas-config.js`. El mapa y «Cómo llegar» apuntan al negocio. No se han inventado reseñas, estrellas o cantidades. La demo funciona sin API: enlaza a las opiniones en Google Maps.

`js/resenas.js` prepara la integración con Maps JavaScript API / Places (New). Para activarla, el responsable debe configurar un proyecto de Google Cloud con facturación y las APIs correspondientes habilitadas, obtener el Place ID de la ficha **Luna Pet Shop** y completar `apiKey`, `placeId` y `habilitado` en resenas-config.js. La clave para navegador es visible por diseño: restringirla al dominio y APIs necesarios, y configurar cuotas. Usar Live Server o el dominio autorizado para probarla. No introducir claves de servidor en estos archivos.

La conexión no está activada y no genera llamadas de API. Una vez configurada, las reseñas se cargan automáticamente al acercarse a la sección; el botón se utiliza para reintentar si ocurre un error. Places devuelve hasta cinco reseñas seleccionadas por Google, no un feed completo. Se muestran las tres mejor valoradas entre las reseñas devueltas por Google (configurable con maxResenas, hasta cinco). Los empates conservan el orden recibido. Se conserva el contenido, autor y enlace del perfil; no se almacenan reseñas. La selección se indica en la interfaz y no representa necesariamente las mejores de toda la ficha. Se muestran puntuación y cantidad únicamente si Google las devuelve, con atribución y enlace a la política de reseñas. Antes de publicar la integración, añadir los términos y la política de privacidad que exige Google Maps Platform para el sitio real.

Referencias oficiales: [reseñas](https://developers.google.com/maps/documentation/javascript/place-reviews), [atribuciones y políticas](https://developers.google.com/maps/documentation/javascript/policies).

## Material visual recomendado

Mantener un catálogo de consulta por WhatsApp. Usar fotografías propias o autorizadas: un perro y gato para el hero, productos reales con fondo claro para el catálogo y fotos del local/equipo/mascotas para Instagram. No usar fotos de Dani’s Sweetness ni hacer pasar imágenes generadas por fotos del negocio. Mientras no exista material confirmado se conservan las ilustraciones originales y sus fallbacks.
