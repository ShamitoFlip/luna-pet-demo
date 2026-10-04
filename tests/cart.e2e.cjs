// Prueba de navegador sin dependencias. Node sirve solo los archivos para esta prueba;
// la web publicada sigue siendo estática. Requiere Chrome y Node con WebSocket global.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const profile = path.join(root, '.browser-check', `cart-${Date.now()}`);
const chromePath = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
const clients = [];
let chrome;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/luna-pet-demo\//, '');
  const file = path.resolve(root, relative || 'index.html');
  const type = types[path.extname(file)];
  if (!file.startsWith(root + path.sep) || !type || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': type }); fs.createReadStream(file).pipe(response);
});
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callbacks = pending.get(message.id); pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(JSON.stringify(message.error))); else callbacks.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const client = { socket, send, evaluate }; clients.push(client);
  await send('Runtime.enable'); await send('Page.enable'); return client;
}
async function until(client, predicate) {
  for (let i = 0; i < 100; i++) { if (await client.evaluate(predicate)) return; await pause(100); }
  throw new Error(`Tiempo agotado: ${predicate}`);
}
const click = (client, selector) => client.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const fill = (client, selector, value) => client.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const count = client => client.evaluate(`Number(document.querySelector('[data-cart-count]').textContent)`);
async function ready(client) { await until(client, `!!window.LunaCart && document.querySelectorAll('.add-to-cart').length > 0`); }
async function open(client) { await client.evaluate(`document.querySelector('[data-cart-open]').focus();document.querySelector('[data-cart-open]').click()`); await pause(300); }
async function screenshot(client, name, drawerOnly = true) {
  let clip;
  if (drawerOnly) clip = await client.evaluate(`(()=>{const r=document.querySelector('#cart-drawer').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height,scale:1}})()`);
  const image = await client.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  fs.writeFileSync(path.join(root, `.preview-cart-${name}.png`), Buffer.from(image.data, 'base64'));
}
async function paginationChecks(page, base) {
  const ids = () => page.evaluate(`Array.from(document.querySelectorAll('.add-to-cart'), button => Number(button.dataset.productId))`);
  const go = number => click(page, `.pagination-number[data-page="${number}"]`);
  const range = (first, last) => Array.from({ length:last-first+1 }, (_, index) => first+index);
  const active = () => page.evaluate(`Number(document.querySelector('.pagination-number[aria-current="page"]')?.dataset.page || 1)`);
  const savedCart = await page.evaluate(`localStorage.getItem('luna-pet-cart-v1')`);
  assert.equal(await page.evaluate(`LUNA_PRODUCTOS.length`), 66);
  assert.deepEqual(await ids(), range(1,12));
  assert.equal(await page.evaluate(`document.querySelectorAll('.pagination-number').length`), 6);
  assert.equal(await page.evaluate(`document.querySelector('[data-direction="previous"]').disabled`), true);
  assert.equal(await page.evaluate(`document.querySelector('#result-count').textContent`), 'Mostrando 1–12 de 66 productos');
  await page.evaluate(`document.querySelector('#catalog-pagination').scrollIntoView()`);
  await go(2);
  await until(page, `Math.abs(document.querySelector('#catalog').getBoundingClientRect().top) < 2`);
  assert.deepEqual(await ids(), range(13,24));
  assert.equal(await page.evaluate(`document.activeElement.id`), 'catalog');
  assert.equal(await page.evaluate(`new URLSearchParams(location.search).get('page')`), '2');
  assert.equal(await page.evaluate(`document.querySelector('#result-count').textContent`), 'Mostrando 13–24 de 66 productos');
  await page.send('Emulation.setEmulatedMedia', { features:[{ name:'prefers-reduced-motion', value:'reduce' }] });
  for (const number of [3,4,5]) { await go(number); assert.deepEqual(await ids(), range((number-1)*12+1,number*12)); }
  await go(6); assert.deepEqual(await ids(),range(61,66));
  assert.equal(await page.evaluate(`document.querySelector('#result-count').textContent`),'Mostrando 61–66 de 66 productos');
  assert.equal(await page.evaluate(`document.querySelector('[data-direction="next"]').disabled`), true);
  await click(page, '[data-direction="next"]'); assert.equal(await active(),6);
  await go(3); await click(page, '[data-direction="previous"]'); assert.equal(await active(),2);
  await click(page, '[data-direction="next"]'); assert.equal(await active(),3);
  await go(1); assert.equal(await page.evaluate(`document.querySelector('[data-direction="previous"]').disabled`),true);
  console.log('OK: páginas 1–6, rangos/IDs, anterior/siguiente, límites, URL y scroll al catálogo.');

  await page.evaluate(`localStorage.removeItem('luna-pet-cart-v1')`); await page.send('Page.reload'); await ready(page);
  await click(page, '.add-to-cart[data-product-id="1"]'); await click(page, '.add-to-cart[data-product-id="3"]');
  await go(2); await click(page, '.add-to-cart[data-product-id="13"]');
  await go(4); for (const id of [37,38,39]) await click(page, `.add-to-cart[data-product-id="${id}"]`);
  assert.equal(await count(page),6);
  assert.deepEqual(await page.evaluate(`LunaCart.getItems().map(p=>p.id)`),[1,3,13,37,38,39]);
  await page.send('Page.reload'); await ready(page);
  assert.equal(await active(),4); assert.deepEqual(await ids(),range(37,48)); assert.equal(await count(page),6);
  assert.equal(await page.evaluate(`LunaCart.totals().knownSubtotal`),70960);
  await open(page);
  assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.cart-total')).color === getComputedStyle(document.querySelector('#cart-drawer')).color`),true);
  assert.equal(await page.evaluate(`document.querySelector('#cart-subtotal').textContent`),'Por confirmar');
  assert.match(await page.evaluate(`document.querySelector('#cart-pricing-note').textContent`),/\$70\.960/);
  await click(page,'.cart-close');
  await page.send('Page.navigate',{url:base+'index.html'}); await ready(page); assert.equal(await count(page),6);
  assert.equal(await page.evaluate(`document.querySelectorAll('.add-to-cart').length`),4);
  await page.evaluate(`localStorage.setItem('luna-pet-cart-v1',${JSON.stringify(savedCart)})`);
  await page.send('Page.navigate',{url:base+'productos.html'}); await ready(page); assert.equal(await count(page),3);
  console.log('OK: seis productos desde páginas 1/2/4, recarga en página 4, carrito entre HTML y precios mixtos.');

  await go(5); await click(page,'[data-category="gatos"]');
  assert.equal(await active(),1); assert.equal(await page.evaluate(`document.querySelectorAll('.pagination-number').length`),2);
  assert.equal(await page.evaluate(`document.querySelector('#result-count').textContent`),'Mostrando 1–12 de 20 productos');
  await go(2); assert.deepEqual(await ids(),range(33,40));
  assert.equal(await page.evaluate(`document.querySelector('#result-count').textContent`),'Mostrando 13–20 de 20 productos');
  await fill(page,'#catalog-search','gatito'); assert.equal(await active(),1); assert.deepEqual(await ids(),[6,26]);
  assert.equal(await page.evaluate(`document.querySelector('#catalog-pagination').hidden`),true);
  assert.equal(await page.evaluate(`new URLSearchParams(location.search).has('page')`),false);
  await fill(page,'#header-search','sin-coincidencias-123');
  assert.equal(await page.evaluate(`document.querySelector('#empty-state').hidden`),false);
  assert.equal(await page.evaluate(`document.querySelector('#catalog-pagination').hidden`),true); assert.deepEqual(await ids(),[]);
  assert.equal(await page.evaluate(`document.querySelector('#result-count').textContent`),'Mostrando 0 de 0 productos');
  await click(page,'#reset-filters'); await go(3); await fill(page,'#header-search','SALMON');
  assert.deepEqual(await ids(),[22,28,47]); assert.equal(await active(),1);
  assert.equal(await page.evaluate(`document.querySelector('#catalog-search').value`),'SALMON');
  await fill(page,'#header-search',''); await go(4); await fill(page,'#catalog-search','alimento');
  assert.equal(await page.evaluate(`document.querySelectorAll('.pagination-number').length`),3); await go(3); assert.equal((await ids()).length,1);
  await fill(page,'#catalog-search',''); await go(5); await click(page,'#offers-filter');
  assert.deepEqual(await ids(),[]); assert.equal(await page.evaluate(`document.querySelector('#catalog-pagination').hidden`),true);
  await page.evaluate(`LUNA_PRODUCTOS.forEach((p,index)=>p.oferta=index<13)`);
  await click(page,'#offers-filter'); await go(5); await click(page,'#offers-filter');
  assert.equal(await active(),1); assert.equal(await page.evaluate(`document.querySelectorAll('.pagination-number').length`),2);
  await go(2); assert.deepEqual(await ids(),[13]);
  await page.evaluate(`LUNA_PRODUCTOS.forEach(p=>p.oferta=false)`); await click(page,'#offers-filter');
  console.log('OK: 20 gatos en 12+8, búsqueda con acentos, cero resultados y ofertas; filtros reinician página.');

  await page.send('Page.navigate',{url:base+'productos.html?categoria=gatos&page=2'}); await ready(page);
  assert.deepEqual(await ids(),range(33,40)); await page.send('Page.reload'); await ready(page); assert.equal(await active(),2);
  for(const value of ['-1','texto','2.5','999']){
    await page.send('Page.navigate',{url:base+'productos.html?page='+value}); await ready(page);
    assert.equal(await active(),value==='999'?6:1);
  }
  await page.send('Page.navigate',{url:base+'productos.html?categoria=ropa'}); await ready(page);
  assert.deepEqual(await ids(),range(61,66));
  assert.equal(await page.evaluate(`document.querySelector('#catalog-pagination').hidden`),true);
  await click(page,'.add-to-cart[data-product-id="61"]'); await click(page,'.add-to-cart[data-product-id="65"]');
  assert.equal(await count(page),5);
  await fill(page,'#catalog-search','gatos'); assert.deepEqual(await ids(),[65,66]);
  await fill(page,'#catalog-search','perros'); assert.deepEqual(await ids(),[61,62,63,64]);
  await page.send('Page.reload'); await ready(page); assert.equal(await count(page),5);
  await page.send('Page.navigate',{url:base+'index.html'}); await ready(page);
  assert.equal(await count(page),5);
  assert.equal(await page.evaluate(`document.querySelectorAll('.category-card').length`),6);
  assert.equal(await page.evaluate(`document.querySelector('.category-card[href="productos.html?categoria=ropa"]').querySelector('img').getAttribute('src')`),'img/categorias/ropa.svg');
  for(const width of [1920,1366,768,390,360]){
    await page.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    assert.equal(await page.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Categorías del inicio a ${width}px`);
  }
  await page.evaluate(`localStorage.setItem('luna-pet-cart-v1',${JSON.stringify(savedCart)})`);
  await page.send('Page.navigate',{url:base+'productos.html?categoria=ropa'}); await ready(page); assert.equal(await count(page),3);
  await page.evaluate(`document.querySelectorAll('#product-grid img').forEach(img=>img.loading='eager')`);
  await page.evaluate(`Promise.all(Array.from(document.querySelectorAll('#product-grid img'),img=>img.decode())).then(()=>true)`);
  const clothingClip=await page.evaluate(`(()=>{document.activeElement.blur();document.querySelector('#catalog').scrollIntoView();const r=document.querySelector('#catalog').getBoundingClientRect();return {x:0,y:r.top+scrollY,width:innerWidth,height:r.height+20,scale:1}})()`);
  const clothingShot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:clothingClip});fs.writeFileSync(path.join(root,'.preview-ropa-mobile.png'),Buffer.from(clothingShot.data,'base64'));
  console.log('OK: ropa, búsquedas perros/gatos, carrito con prendas, enlace del inicio y seis categorías responsive.');
  await page.send('Page.navigate',{url:base+'productos.html'}); await ready(page);
  for(const total of [36,100,250]){
    await page.evaluate(`(()=>{window.paginationBaseProducts ||= LUNA_PRODUCTOS.slice();window.LUNA_PRODUCTOS=window.paginationBaseProducts.slice(0,${total});while(LUNA_PRODUCTOS.length<${total}){const id=LUNA_PRODUCTOS.length+1;LUNA_PRODUCTOS.push({...paginationBaseProducts[12],id,nombre:'Producto de prueba '+id});}})()`);
    await click(page,'[data-category="todos"]'); const lastPage=Math.ceil(total/12); await go(lastPage);
    assert.equal(await active(),lastPage); assert.equal((await ids()).length,total-(lastPage-1)*12);
    assert.equal(await page.evaluate(`document.querySelector('[data-direction="next"]').disabled`),true);
  }
  await go(1); for(const number of [3,5,7,9,11,13]) await go(number);
  for(const width of [1920,1366,768,390,360]){
    await page.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    assert.equal(await page.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Catálogo grande a ${width}px`);
    assert.equal(await page.evaluate(`document.querySelector('.pagination-pages').scrollWidth<=document.querySelector('.pagination-pages').clientWidth`),true);
  }
  await page.evaluate(`window.LUNA_PRODUCTOS=window.paginationBaseProducts;delete window.paginationBaseProducts`); await click(page,'[data-category="todos"]');
  for(const width of [1920,1366,768,390,360]){
    await page.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600}); await go(2);
    assert.equal(await page.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Catálogo a ${width}px`);
    assert.equal(await page.evaluate(`document.querySelectorAll('.add-to-cart').length`),12);
    assert.equal(await page.evaluate(`Array.from(document.querySelectorAll('.pagination-button')).every(b=>b.getBoundingClientRect().height>=44)`),true);
    if(width===1366||width===390){
      await page.evaluate(`document.querySelectorAll('#product-grid img').forEach(img=>img.loading='eager')`);
      await page.evaluate(`Promise.all(Array.from(document.querySelectorAll('#product-grid img'),img=>img.decode())).then(()=>true)`);
      await page.evaluate(`document.querySelector('#catalog-pagination').scrollIntoView({block:'center',behavior:'instant'})`);
      const clip=await page.evaluate(`(()=>{const a=document.querySelector('#product-grid').lastElementChild.getBoundingClientRect(),b=document.querySelector('#catalog-pagination').getBoundingClientRect();return {x:0,y:a.top+scrollY-15,width:innerWidth,height:b.bottom-a.top+35,scale:1}})()`);
      const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});fs.writeFileSync(path.join(root,`.preview-pagination-${width===1366?'desktop':'mobile'}.png`),Buffer.from(shot.data,'base64'));
    }
    await go(1);
  }
  await page.send('Page.navigate',{url:'file:///'+path.join(root,'productos.html').replaceAll('\\','/')+'?page=2'}); await ready(page);
  assert.deepEqual(await ids(),range(13,24));
  await page.send('Page.navigate',{url:base+'productos.html'}); await ready(page);
  console.log('OK: URL/recarga, páginas inválidas, 36/100/250 productos, 5 anchos, imágenes locales y apertura file://.');
}
(async () => {
  if (!fs.existsSync(chromePath)) throw new Error('Configura CHROME_BIN con la ruta de Chrome.');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/luna-pet-demo/`;
  chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const active = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(active); i++) await pause(150);
  const port = fs.readFileSync(active, 'utf8').split('\n')[0].trim();
  const targets = () => fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  const page = await connect((await targets()).find(target => target.type === 'page').webSocketDebuggerUrl);
  await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url: base + 'index.html' }); await ready(page);
  assert.equal(await count(page), 0);
  assert.equal(await page.evaluate(`document.querySelectorAll('.add-to-cart').length`), 4);
  assert.equal(await page.evaluate(`document.querySelectorAll('.instagram-card').length`), 5);
  await until(page, `document.querySelectorAll('.review-card').length === 5`);
  await open(page);
  assert.equal(await page.evaluate(`document.querySelector('#cart-empty').hidden`), false);
  await page.evaluate(`LunaCart.close();LunaCart.open()`); await pause(100);
  assert.equal(await page.evaluate(`document.documentElement.classList.contains('cart-is-open')`), true);
  assert.equal(await page.evaluate(`document.querySelector('[data-cart-open]').getAttribute('aria-expanded')`), 'true');
  await click(page, '#cart-browse');
  assert.equal(await page.evaluate(`document.querySelector('#cart-drawer').open`), false);
  await click(page, '.add-to-cart[data-product-id="1"]'); await click(page, '.add-to-cart[data-product-id="1"]'); await click(page, '.add-to-cart[data-product-id="3"]');
  assert.equal(await count(page), 3);
  assert.equal(await page.evaluate(`LunaCart.getItems().length`), 2);
  assert.match(await page.evaluate(`document.querySelector('#cart-toast').textContent`), /agregado al carrito/);
  await open(page);
  assert.equal(await page.evaluate(`document.documentElement.classList.contains('cart-is-open')`), true);
  assert.equal(await page.evaluate(`document.querySelector('#cart-subtotal').textContent`), 'Por confirmar');
  await click(page, '[data-cart-action="increase"][data-product-id="1"]');
  assert.equal(await count(page), 4);
  assert.equal(await page.evaluate(`document.activeElement.dataset.cartAction`), 'increase');
  await click(page, '[data-cart-action="decrease"][data-product-id="1"]');
  await click(page, '[data-cart-action="decrease"][data-product-id="3"]');
  assert.equal(await page.evaluate(`LunaCart.getItems().length`), 1);
  await click(page, '[data-cart-action="remove"]');
  assert.equal(await count(page), 0);
  assert.equal(await page.evaluate(`document.querySelector('#cart-footer').hidden`), true);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await page.evaluate(`document.activeElement.matches('[data-cart-open]')`), true);
  assert.equal(await page.evaluate(`document.documentElement.classList.contains('cart-is-open')`), false);
  await click(page, '.add-to-cart[data-product-id="1"]'); await click(page, '.add-to-cart[data-product-id="1"]'); await click(page, '.add-to-cart[data-product-id="3"]');
  await page.send('Page.reload'); await ready(page); assert.equal(await count(page), 3);
  await page.send('Page.navigate', { url: base + 'productos.html' }); await ready(page);
  assert.equal(await count(page), 3); assert.equal(await page.evaluate(`document.querySelectorAll('.add-to-cart').length`), 12);
  await paginationChecks(page, base);
  console.log('OK: agregar, agrupar, cantidades, eliminar, vacío, Escape, recarga y cambio de página.');

  const second = await page.send('Target.createTarget', { url: base + 'productos.html' });
  const secondPage = await connect((await targets()).find(target => target.id === second.targetId).webSocketDebuggerUrl);
  await ready(secondPage); await click(secondPage, '.add-to-cart[data-product-id="4"]'); await until(page, `Number(document.querySelector('[data-cart-count]').textContent) === 4`);
  await page.send('Target.closeTarget', { targetId: second.targetId }); secondPage.socket.close();
  await open(page); await click(page, '[data-cart-action="remove"][data-product-id="4"]');
  await click(page, '#cart-continue');
  assert.equal(await page.evaluate(`document.activeElement.id`), 'order-name');
  await page.evaluate(`window.openedOrders=[];window.open=(...args)=>{window.openedOrders.push(args);return null}`);
  await click(page, '#cart-send'); assert.equal(await page.evaluate(`openedOrders.length`), 0);
  await fill(page, '#order-name', '   '); await click(page, '#cart-send'); assert.equal(await page.evaluate(`openedOrders.length`), 0);
  await fill(page, '#order-name', 'Cliente Á & ñ'); await click(page, '#cart-send');
  let url = await page.evaluate(`openedOrders.at(-1)[0]`);
  let message = new URL(url).searchParams.get('text');
  assert.equal(new URL(url).pathname, '/56971582988');
  assert(message.includes('• 2x Alimento para perro adulto') && message.includes('• 1x Bocados de pollo') && message.includes('TOTAL: por confirmar'));
  assert(message.includes('Nombre: Cliente Á & ñ') && message.includes('Retiro en tienda'));
  assert.equal(await count(page), 3);
  await click(page, 'input[value="delivery"]');
  assert.equal(await page.evaluate(`document.querySelector('#cart-delivery-fields').hidden`), false);
  await fill(page, '#order-comuna', 'Maipú'); await fill(page, '#order-address', 'Av. de prueba 123, depto 4');
  await click(page, '#cart-send');
  message = new URL(await page.evaluate(`openedOrders.at(-1)[0]`)).searchParams.get('text');
  assert(message.includes('Comuna: Maipú') && message.includes('Dirección: Av. de prueba 123, depto 4') && message.includes('costo por confirmar'));
  assert.equal(await page.evaluate(`document.querySelector('#cart-whatsapp-link').href === openedOrders.at(-1)[0]`), true);
  assert.equal(await page.evaluate(`localStorage.getItem('luna-pet-cart-v1').includes('Cliente Á')`), false);
  console.log('OK: sincronización entre pestañas, validación, retiro, delivery, codificación y pedido completo sin enviar mensajes reales.');

  await click(page, '#cart-back');
  await page.evaluate(`while(document.querySelector('[data-cart-action="remove"]'))document.querySelector('[data-cart-action="remove"]').click();LUNA_PRODUCTOS.find(p=>p.id===1).precio=48990;LUNA_PRODUCTOS.find(p=>p.id===3).precio=4990;LunaCart.add(1);LunaCart.add(1);LunaCart.add(3)`);
  assert.equal(await page.evaluate(`LunaCart.totals().total`), 102970);
  assert.match(await page.evaluate(`document.querySelector('#cart-subtotal').textContent`), /\$102\.970/);
  await click(page, '[data-cart-action="increase"][data-product-id="3"]'); assert.equal(await page.evaluate(`LunaCart.totals().total`), 107960);
  await click(page, '[data-cart-action="decrease"][data-product-id="3"]');
  await page.evaluate(`LunaCart.add(2)`);
  assert.equal(await page.evaluate(`LunaCart.totals().total`), null); assert.equal(await page.evaluate(`LunaCart.totals().knownSubtotal`), 102970);
  await click(page, '[data-cart-action="remove"][data-product-id="2"]');
  await click(page, '#cart-continue'); await click(page, 'input[value="retiro"]'); await click(page, '#cart-send');
  message = new URL(await page.evaluate(`openedOrders.at(-1)[0]`)).searchParams.get('text');
  assert(message.includes('$48.990 c/u') && message.includes('Subtotal: $97.980') && message.includes('TOTAL PRODUCTOS: $102.970'));
  assert(!message.includes('Av. de prueba') && !message.includes('Comuna:'));
  // Estos precios son fixtures de la prueba en memoria. No se modifica productos.js.
  await page.send('Page.reload'); await ready(page); assert.equal(await page.evaluate(`LunaCart.totals().total`), null);
  console.log('OK: CLP, sumas, totales mixtos y actualización desde el catálogo sin inventar precios de la demo.');

  await click(page, '[data-category="gatos"]'); assert.equal(await page.evaluate(`document.querySelectorAll('.add-to-cart').length`), 12);
  await fill(page, '#catalog-search', 'gatito'); assert.equal(await page.evaluate(`document.querySelectorAll('.add-to-cart').length`), 2);
  await fill(page, '#catalog-search', ''); await click(page, '[data-category="todos"]');
  await click(page, '#offers-filter'); assert.equal(await page.evaluate(`document.querySelector('#empty-state').hidden`), false);
  await click(page, '#reset-filters'); assert.equal(await page.evaluate(`document.querySelectorAll('.product-inquiry').length`), 12);
  assert.equal(await page.evaluate(`document.querySelector('.floating-wa').href.startsWith('https://wa.me/56971582988?text=')`), true);

  for (const width of [1920,1366,768,390,360]) {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    assert.equal(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `Overflow a ${width}px`);
    assert.equal(await page.evaluate(`(()=>{const r=document.querySelector('[data-cart-open]').getBoundingClientRect();return r.width>=44&&r.height>=44&&r.right<=innerWidth})()`), true);
    await open(page);
    assert.equal(await page.evaluate(`Math.round(document.querySelector('#cart-drawer').getBoundingClientRect().width)`), Math.min(width,440));
    assert.equal(await page.evaluate(`document.querySelector('.cart-scroll').scrollWidth <= document.querySelector('.cart-scroll').clientWidth`), true);
    if (width === 1366) await screenshot(page, 'desktop');
    if (width === 390) await screenshot(page, 'mobile');
    await click(page, '#cart-continue');
    await fill(page, '#order-name', 'Cliente de prueba'); await click(page, 'input[value="delivery"]');
    assert.equal(await page.evaluate(`document.querySelector('.cart-scroll').scrollWidth <= document.querySelector('.cart-scroll').clientWidth`), true);
    if (width === 390) await screenshot(page, 'checkout-mobile');
    await click(page, '.cart-close');
  }
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await open(page);
  for (let i=0;i<20;i++) {
    await page.send('Input.dispatchKeyEvent', { type:'keyDown', key:'Tab', code:'Tab', windowsVirtualKeyCode:9 });
    await page.send('Input.dispatchKeyEvent', { type:'keyUp', key:'Tab', code:'Tab', windowsVirtualKeyCode:9 });
    assert.equal(await page.evaluate(`document.querySelector('#cart-drawer').contains(document.activeElement)`), true);
  }
  await page.send('Input.dispatchMouseEvent', { type:'mousePressed', x:40, y:200, button:'left', clickCount:1 });
  await page.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:40, y:200, button:'left', clickCount:1 });
  assert.equal(await page.evaluate(`document.querySelector('#cart-drawer').open`), false);
  console.log('OK: filtros, búsqueda, WhatsApp individual, 1920/1366/768/390/360px, foco atrapado y cierre exterior.');

  await page.evaluate(`localStorage.setItem('luna-pet-cart-v1','invalid JSON')`); await page.send('Page.reload'); await ready(page); assert.equal(await count(page), 0);
  await page.evaluate(`localStorage.setItem('luna-pet-cart-v1',JSON.stringify({version:1,items:[{id:1,cantidad:2,nombre:'FALSO',precio:0,imagen:'https://example.com/x'},{id:1,cantidad:1},{id:999,cantidad:1},{id:2,cantidad:-1}]}))`);
  await page.send('Page.reload'); await ready(page);
  assert.equal(await count(page), 3); assert.equal(await page.evaluate(`LunaCart.getItems()[0].nombre`), 'Alimento para perro adulto'); assert.equal(await page.evaluate(`LunaCart.getItems()[0].precio`), null);
  const denial = await page.send('Page.addScriptToEvaluateOnNewDocument', { source:`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage disabled','SecurityError')}})` });
  await page.send('Page.reload'); await ready(page); await click(page, '.add-to-cart[data-product-id="1"]');
  assert.equal(await count(page), 1); await open(page); assert.equal(await page.evaluate(`document.querySelector('#cart-storage-note').hidden`), false);
  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier:denial.identifier });
  await page.send('Page.navigate', { url:base+'index.html' }); await ready(page);
  await click(page, '#menu-toggle'); assert.equal(await page.evaluate(`document.querySelector('#menu-toggle').getAttribute('aria-expanded')`), 'true');
  await until(page, `document.querySelectorAll('.review-card').length === 5`);
  assert.equal(await page.evaluate(`Array.from(document.querySelectorAll('.instagram-card')).every(a=>a.href.includes('instagram.com/reel/')&&a.target==='_blank')`), true);
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('OK: datos inválidos, catálogo canónico, storage bloqueado, navegación, reseñas y Reels.');
  console.log('Todas las pruebas del carrito pasaron.');
})().catch(error => { console.error(error.stack); process.exitCode=1; }).finally(async () => {
  if (clients[0]?.socket.readyState === WebSocket.OPEN) {
    try { await Promise.race([clients[0].send('Browser.close'),pause(2000)]); } catch {}
  }
  clients.forEach(client=>client.socket.close());
  if (chrome && chrome.exitCode===null) { chrome.kill(); await pause(300); }
  server.close();
  const resolved = path.resolve(profile);
  if (!resolved.startsWith(path.join(root,'.browser-check') + path.sep)) throw new Error('Perfil de prueba fuera del proyecto.');
  try { fs.rmSync(resolved,{recursive:true,force:true}); } catch { /* Chrome puede tardar en liberar los archivos temporales. */ }
});
