# Luna Pet Shop — demo de propuesta web

Abre `index.html` directamente o usa Live Server. No requiere instalación ni backend.

Demo publicada: https://shamitoflip.github.io/luna-pet-demo/
Repositorio: https://github.com/ShamitoFlip/luna-pet-demo

- `js/productos.js`: 66 productos DEMO. Los 12 originales conservan todos sus datos y precios `null`; los 54 adicionales usan precios ficticios en CLP. Marcas vacías y stock desconocido (`null`). Todas las ofertas desactivadas hasta confirmación real.
- `js/main.js`: tarjetas, paginación de 12 productos, búsqueda sin recarga, filtros/estado en URL y enlaces WhatsApp con mensajes codificados.
- `js/cart.js`: estado, localStorage, panel lateral, cantidades, formulario y preparación del pedido.
- `js/config.js`: número de WhatsApp existente y generador de enlaces compartido.
- `css/cart.css`: estilos del carrito, sus botones y formulario, respetando los colores y tipografías del sitio.
- `css/style.css`: diseño y reglas para móvil, tablet y escritorio. Bootstrap 5.3 se carga por CDN; navegación propia no depende del JavaScript de Bootstrap.
- `img/`: ilustraciones SVG originales de muestra. El logo blanco con fondo transparente se utiliza desde `img/logo/logo.png`; `img/logo/logo-original.png` conserva el archivo recibido. El CSS muestra el símbolo oscuro sobre los fondos claros. Sustituir las ilustraciones del hero y productos por fotografías autorizadas. Las rutas se encuentran en HTML y productos.js.

Confirmar con el negocio horarios, retiro, catálogo, promociones, precios y condiciones antes de publicar como sitio oficial. Los precios de los productos adicionales son ficticios para probar la interfaz; no representan precios del negocio. Instagram muestra una selección manual de publicaciones, no un feed en vivo.

Los estilos personalizados, datos e imágenes funcionan localmente. Bootstrap, tipografías y mapa requieren internet. Para publicar, sustituir Open Graph por una fotografía con URL absoluta y agregar URL canónica real.

El icono de WhatsApp utiliza el SVG de [Bootstrap Icons](https://icons.getbootstrap.com/icons/whatsapp/), integrado en HTML y `js/main.js` sin cargar una biblioteca adicional. Su atribución y licencia MIT están en `THIRD_PARTY_NOTICES.md`.

## Catálogo y paginación

La paginación se aplica a `productos.html`. El inicio conserva sus cuatro productos destacados. Hay 66 productos en un solo archivo, `js/productos.js`: los IDs 1–12 son los objetos existentes sin cambios; los IDs 13–66 son 54 ejemplos nuevos con `demo: true`, precios ficticios y fotografías de muestra locales. Los originales también estaban identificados como DEMO; ninguno se presenta como un producto comercial confirmado. Las imágenes de ropa son ilustraciones SVG locales; no se incorporan servicios externos nuevos.

La distribución de categorías permite probar filtros con diferentes tamaños: 12 perros, 20 gatos, 10 snacks, 10 accesorios, 8 higiene y 6 ropa. Las ilustraciones existentes de alimentos, snacks, collares, pelotas, arena e higiene se reutilizan. Camas, transportadoras, rascadores y platos usan el placeholder local; cada producto conserva `imagenFallback`.

La categoría «Ropa» aparece en la navegación, en el inicio y en los filtros del catálogo. Los IDs 61–66 son seis prendas DEMO: cuatro para perros y dos para gatos, con tallas e importes ficticios e ilustraciones locales. La disponibilidad real de ropa para gatos queda pendiente de confirmar con el negocio. Para ver solo estas prendas, usa `productos.html?categoria=ropa`; dentro de Ropa puedes buscar «perros» o «gatos». Estos ejemplos se añadieron conservando los 60 productos anteriores.

`js/main.js` define `const PRODUCTS_PER_PAGE = 12`. Para cambiar el tamaño de página, modifica esa constante. Primero se filtra la lista completa por categoría, búsqueda y ofertas; luego se calcula `Math.ceil(results.length / PRODUCTS_PER_PAGE)` y se crean únicamente las tarjetas correspondientes a la página seleccionada. Con 66 productos hay seis páginas: IDs 1–12, 13–24, 25–36, 37–48, 49–60 y 61–66.

El texto «Mostrando 13–24 de 66 productos» se actualiza automáticamente. Los controles anterior/siguiente respetan los extremos; los números permiten cambiar directamente de página y `aria-current="page"` identifica la activa. En catálogos grandes aparecen los extremos, páginas cercanas y puntos suspensivos. En móvil las flechas conservan sus etiquetas accesibles y se ocultan los textos largos para ahorrar espacio. Con una sola página o cero resultados se oculta la navegación.

Cambiar de página mueve el foco al catálogo y hace scroll suave a su comienzo, respetando la preferencia de movimiento reducido. Cambiar categoría, búsqueda o filtro de ofertas vuelve a la página 1 y recalcula los resultados. Por ejemplo, «Gatos» muestra 12 + 8 productos en dos páginas. La URL conserva `categoria`, `q`, `ofertas` y, desde la segunda página, `page`; recargar mantiene la página y los filtros. Los valores de página inválidos se normalizan o se limitan al último resultado disponible. Se utiliza `replaceState`, por lo que estos cambios no crean entradas adicionales en el historial del navegador.

La paginación no modifica el estado del carrito ni su clave de localStorage. Todos los productos se cargan antes de inicializar el carrito; así reconoce también los IDs que no están visibles en la página actual. Las cantidades se conservan al navegar, filtrar, recargar y cambiar entre inicio y catálogo. El footer celeste se aplica únicamente al cierre de la web; el resumen del carrito mantiene su fondo claro y sus textos oscuros. Se protege también el estado del diálogo al cerrarlo y reabrirlo rápidamente.

Para agregar más productos, añade un objeto al bloque «Productos adicionales DEMO» de `js/productos.js` con un **ID único y estable**. Por ejemplo:

```js
{ id: 67, nombre: 'Juguete de cuerda', categoria: 'accesorios',
  subcategoria: 'juguetes', peso: '25 cm', precio: 4990,
  imagen: 'img/productos/placeholder.svg' }
```

El bloque completa las propiedades comunes (`marca`, `demo`, `destacado`, `oferta`, `disponible` e `imagenFallback`). Puedes sobreescribirlas en el objeto cuando tengas datos confirmados. Usa precios enteros en CLP o `null` si están pendientes; para fotografías, conserva una ruta local válida de fallback. Añadir productos recalcula las páginas sin cambiar los botones manualmente ni crear otros HTML. No reutilices un ID para un producto diferente, porque puede estar guardado en un carrito.

Antes de subir a GitHub Pages, revisa la página activa y los rangos, los extremos deshabilitados, el scroll al catálogo, «Gatos» en dos páginas, una búsqueda sin resultados y el carrito con productos de varias páginas. Comprueba el diseño en 1920/1366/768/390/360 px y los enlaces del mapa, los cinco Reels y WhatsApp. El sitio sigue siendo HTML/CSS/JavaScript estático: sin backend, base de datos, login, pagos ni dependencias nuevas. La demo debe conservar su indicación de datos y precios de muestra.

## Carrito y pedido por WhatsApp

Las tarjetas del inicio y del catálogo permiten «Agregar al carrito», conservando la consulta individual por WhatsApp como enlace secundario. El botón del header muestra el total de unidades. El panel lateral permite aumentar/disminuir cantidades, eliminar productos y continuar al formulario de nombre, retiro o delivery. Incluye cierre con X, Escape o clic en el fondo; el diálogo mantiene el foco dentro y bloquea el scroll del sitio mientras está abierto.

El carrito se guarda en `localStorage` bajo `luna-pet-cart-v1` y se comparte entre inicio y catálogo cuando se sirven desde el mismo origen, como Live Server o GitHub Pages. Incluye ID, nombre, presentación, precio, imagen y cantidad. Al recuperarlo se validan IDs y cantidades y se toman los datos actuales de `js/productos.js`, evitando precios antiguos o productos inexistentes. También se sincroniza entre pestañas. Si el navegador impide guardar datos, el carrito continúa en memoria y muestra el aviso correspondiente. No se guardan nombre ni dirección del cliente. Al abrir archivos con `file://`, la persistencia depende del navegador; para probar el cambio entre páginas se recomienda Live Server.

**Precios de la demo:** los 12 productos existentes mantienen `precio: null`; la tarjeta indica «Consultar precio» y el carrito «Por confirmar». Los 54 adicionales tienen importes ficticios para probar los cálculos. Para un catálogo real, completa o sustituye `precio` en `js/productos.js` con un número entero de pesos chilenos confirmado, por ejemplo `48990` (sin `$`, puntos ni comillas). El carrito calcula `precio × cantidad` y suma las líneas con `Intl.NumberFormat('es-CL', { currency: 'CLP' })`. Si hay alguna línea sin precio, el total queda pendiente y se informa por separado el subtotal conocido. El despacho nunca se calcula ni se incluye automáticamente.

El número existente **56971582988** se encuentra en `js/config.js`, propiedad `whatsappNumero`. Los enlaces dinámicos de consulta y pedido usan la misma configuración y `encodeURIComponent`. Los textos visibles con el teléfono y el enlace de fallback dentro de `<noscript>` conservan el número original; si el negocio lo cambia, actualízalos también en ambos HTML.

«Enviar pedido por WhatsApp» abre una pestaña con la lista completa, cantidades, precios/subtotales disponibles, nombre y modalidad. La comuna y dirección son opcionales y solo se incluyen con delivery. «Revisar mensaje del pedido» permite leer el contenido antes de abrir WhatsApp. El usuario completa el envío allí: abrir WhatsApp no confirma una compra, no procesa pagos y no vacía el carrito. Un enlace alternativo permite volver a abrir el mensaje si el navegador bloquea la pestaña.

La lógica pública `LunaCart.createOrder()` construye un pedido estructurado y `messageForOrder()` lo convierte en texto; una futura integración de pagos puede utilizar el pedido sin depender del formulario ni del formato de WhatsApp. La demo actual sigue usando solo HTML/CSS/JavaScript, sin dependencias nuevas ni backend, y es compatible con GitHub Pages.

Para probar: agrega el mismo producto dos veces y otro distinto → abre el carrito → ajusta `+`/`−` y elimina una línea → recarga y cambia entre inicio/catálogo → continúa el pedido → escribe tu nombre → prueba retiro y delivery → revisa el mensaje → abre WhatsApp. Comprueba también que un carrito vacío ofrece «Ver productos». El límite de 999 unidades por línea protege las cantidades guardadas; no representa stock disponible.

La prueba de navegador se ejecuta con `node tests/cart.e2e.cjs` (Node moderno y Google Chrome; admite `CHROME_BIN` para otra ruta). Comprueba las seis páginas, rangos, scroll, URL/recarga, filtros, seis productos agregados desde páginas distintas, catálogos temporales de 36/100/250 productos y los anchos 1920/1366/768/390/360 px. También conserva las pruebas del carrito: localStorage entre páginas/pestañas, totales, datos corruptos, storage bloqueado, teclado y cierre/reapertura rápida. Los catálogos ampliados y las ofertas de prueba existen solo en la memoria del navegador; no modifican los datos del proyecto. Se intercepta WhatsApp para evitar enviar mensajes reales. Node y el servidor local se usan únicamente para estas verificaciones, se cierran al terminar y no forman parte de la web publicada.

## Fotografías y fallback

En el hero y categorías, completa `data-photo-src` con la ruta de una foto autorizada y actualiza su `alt`. El atributo `data-fallback` conserva la ilustración si la foto falla; no se solicitan fotos inexistentes por defecto.

## Reels de Instagram

La sección de `index.html`, identificada por `id="instagram"`, tiene un encabezado centrado con el icono junto a «SÍGUENOS EN INSTAGRAM», el enlace grande al perfil real `@lunapetcl` y una línea discreta en el color de Luna. Incluye cinco tarjetas cuadradas con portadas reales, en el orden de los enlaces proporcionados: `Dd2ZZ40sjxN`, `DdZY3axqyJb`, `DdU__iWsNSP`, `Dc9H0VjKBUZ` y `Dcw8-PoMH3G`. Cada tarjeta abre su URL `/reel/` en una pestaña nueva. La selección es manual y no garantiza mostrar siempre los Reels más recientes.

La galería muestra cinco columnas sobre 1100 px, tres entre 601 y 1100 px y dos hasta 600 px. Todas las tarjetas conservan `aspect-ratio: 1 / 1` y `object-fit: cover`. Al pasar el mouse o enfocar con teclado, aparece el icono y «VER EN INSTAGRAM» sobre la fotografía, con una transición de 0,3 s. En dispositivos táctiles queda visible un icono pequeño en una esquina y toda la tarjeta es un enlace. Los colores y fuentes corresponden al diseño de Luna.

La portada pública obtenida para `DdU__iWsNSP` dice «Tu cachorro no te manipula». Se utiliza esa portada para que coincida con el enlace enviado, aunque la cuarta captura de referencia dice «¿Qué mascota tienes tú?».

Las portadas son archivos locales de la selección manual, sin claves, widgets, video automático ni solicitudes a Instagram al cargar la página. El video se reproduce en Instagram al abrir la publicación. Esta sección funciona con archivos estáticos y rutas relativas, incluyendo GitHub Pages; no incorpora JavaScript nuevo, APIs, tokens, backend ni scraping.

Para reemplazar imágenes y enlaces, busca `data-instagram-post="01"` a `"05"` en `index.html`. Guarda las fotografías en `img/instagram/` y cambia el `src` del `<img>`, su `alt`, sus dimensiones, el `href` del `<a>` y su `aria-label`. Conserva `data-fallback="img/instagram/reel-placeholder.svg"` como alternativa si falla una portada. En el enlace con clase `instagram-profile`, cambia el texto `@usuario`, `href` y `aria-label` si el negocio confirma otro perfil. Los comentarios del HTML marcan estos puntos de edición.

En productos.js, cambia `imagen` por la fotografía y conserva `imagenFallback` como alternativa. Si ambas fallan, se muestra `img/productos/placeholder.svg`. Productos usan `object-fit: contain`; fotografías de categorías, hero e Instagram usan `cover`. Ajusta `object-position` en CSS si la fotografía requiere otro encuadre.

## Reseñas destacadas: carrusel local

La demo utiliza `js/resenas-data.js` y `js/resenas.js`, sin Google Places, SDK de Maps, claves ni scraping para reseñas. El mapa existente de ubicación permanece como estaba. El botón del carrusel abre la ficha real de Luna Pet Shop en una nueva pestaña.

`resenas-data.js` contiene cinco reseñas reales únicas transcritas de las capturas compartidas por el usuario: roberto herrera, paula orostica, Carlos Antillanca, Maricha Gutierrez e Ian Sinclaire. Todas muestran cinco estrellas en las capturas. Las capturas repetidas de Carlos, Maricha e Ian no generan tarjetas duplicadas. Las fechas «Hace 6 meses / 2 años / 3 años» se conservan como referencias de las capturas; no son fechas calculadas ni se actualizan automáticamente.

Los comentarios de Roberto, Paula e Ian llevan `extracto: true` porque en la captura aparece texto incompleto o el control «Más». Se conserva solo el texto visible, sin completar frases ni corregir la redacción. Cada tarjeta identifica el extracto y permite abrir la ficha del negocio en Google Maps. «Leer más» despliega únicamente el texto transcrito disponible, no el contenido que Google ocultó en la captura. Al recibir el comentario completo, reemplaza `comentario` y cambia `extracto` a `false`.

Los siete objetos restantes siguen identificados como PLACEHOLDER para llegar posteriormente a 10–12 reseñas. Mientras exista al menos una reseña real, el carrusel muestra únicamente las reales. Si todavía no hay ninguna, muestra los placeholders con etiquetas y estrellas de muestra. Para agregar más reseñas, sustituye un objeto pendiente por el nombre, comentario literal, estrellas, fuente y fecha y cambia `placeholder` a `false`. No se ha inventado una puntuación general ni un número total de reseñas del negocio.

Las tarjetas muestran el autor en la cabecera, puntuación individual y estrellas, comentario en cursiva, fuente y fecha opcional. Cada objeto admite `foto` (URL HTTPS o ruta local), `perfilUrl` y `resenaUrl` (enlaces HTTPS). Sin foto se muestran las iniciales del autor; si la imagen falla, se mantienen esas iniciales. Los placeholders usan un icono neutro. Los enlaces del perfil y de la reseña se muestran únicamente cuando se completan con datos reales.

Google no entrega un campo con el producto comprado en una reseña. El campo opcional `producto` permanece vacío y se muestra solo con `productoConfirmado: true` y `placeholder: false`. Complétalo únicamente si aparece expresamente en el comentario o puedes confirmar el dato. La tarjeta lo presenta como «Producto mencionado», sin afirmar una compra verificada.

El carrusel avanza una tarjeta cada 5 segundos en bucle, con 3/2/1 tarjetas en escritorio/tablet/móvil. Incluye flechas, cuatro indicadores de grupo como máximo, navegación por teclado, swipe, pausa/reanudación y «Leer más / Ver menos» para comentarios largos. Pausa al pasar el mouse, al enfocar controles, al expandir una reseña, al tocar/deslizar (8 segundos), cuando sale del viewport o al ocultar la pestaña. Con `prefers-reduced-motion` no hay autoplay ni transición. Todas las tarjetas mantienen la misma altura de fila; al expandir, la fila se adapta al texto completo sin recortarlo.

`js/resenas-config.js` queda reservado, desactivado y sin cargar en HTML para una futura integración. No contiene una clave real.

## Material visual recomendado

Mantener un catálogo de consulta por WhatsApp. Usar fotografías propias o autorizadas: un perro y gato para el hero, productos reales con fondo claro para el catálogo y fotos del local/equipo/mascotas para Instagram. No usar fotos de Dani’s Sweetness ni hacer pasar imágenes generadas por fotos del negocio. Mientras no exista material confirmado se conservan las ilustraciones originales y sus fallbacks.
