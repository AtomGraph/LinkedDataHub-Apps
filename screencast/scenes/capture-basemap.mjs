// A clean basemap raster for the mock: the app's own OpenLayers map, pins hidden, view
// framed on the south-central US at a zoom that leaves room for a new pin. Read-only.
import { chromium } from 'playwright';
import { resolve } from '../lib/harness.mjs';
const opts = await resolve('/'); const { base, identity } = opts;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true, clientCertificates: identity ?? [] });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
await ctx.addInitScript(() => { let ol; Object.defineProperty(window, 'ol', { configurable: true, get() { return ol; }, set(v) { if (v && v.Map && !v.Map.__captured) { const Orig = v.Map; const C = function (...a) { const m = new Orig(...a); (window.__olMaps ||= []).push(m); return m; }; C.prototype = Orig.prototype; Object.setPrototypeOf(C, Orig); C.__captured = true; v.Map = C; } ol = v; } }); });
const p = await ctx.newPage();
await p.goto(base + '/territories/', { waitUntil: 'load' }); await p.waitForSelector('.ol-viewport canvas', { timeout: 30_000 }); await p.waitForTimeout(3000);
await p.evaluate(() => { const m = (window.__olMaps || []).at(-1); for (const l of m.getLayers().getArray()) if (l.getSource && l.getSource() && l.getSource().getFeatures) l.setVisible(false); m.getView().setCenter(ol.proj.fromLonLat([-96.5, 36.5])); m.getView().setZoom(4.6); });
await p.waitForTimeout(4000);
const vp = p.locator('.ldh-pane.is-active .ol-viewport').first();
await vp.screenshot({ path: 'mock/assets/basemap-us.png' });
console.log('  basemap:', JSON.stringify(await vp.boundingBox()));
// project a few made-up cities on this view for the pin list
const cities = { Dallas: [-96.797, 32.777], Houston: [-95.369, 29.760], Austin: [-97.743, 30.267], 'San Antonio': [-98.494, 29.424], 'El Paso': [-106.485, 31.762], Amarillo: [-101.831, 35.222], 'Oklahoma City': [-97.516, 35.468], Tulsa: [-95.993, 36.154], 'Little Rock': [-92.289, 34.746], Memphis: [-90.049, 35.150], 'New Orleans': [-90.071, 29.951], 'Baton Rouge': [-91.187, 30.451], Jackson: [-90.185, 32.299], Birmingham: [-86.802, 33.521], Nashville: [-86.781, 36.163], Atlanta: [-84.388, 33.749], 'Kansas City': [-94.579, 39.100], 'St. Louis': [-90.199, 38.627], Denver: [-104.990, 39.739], Albuquerque: [-106.650, 35.084], Phoenix: [-112.074, 33.448], 'Santa Fe': [-105.938, 35.687], Wichita: [-97.330, 37.687], Omaha: [-95.934, 41.257], Chicago: [-87.630, 41.878], Indianapolis: [-86.158, 39.768], Louisville: [-85.758, 38.253], Charlotte: [-80.843, 35.227], Jacksonville: [-81.656, 30.332], Tampa: [-82.457, 27.951], Miami: [-80.192, 25.762], Savannah: [-81.099, 32.084], Columbia: [-81.035, 34.000], Raleigh: [-78.639, 35.780], Richmond: [-77.436, 37.541], Cincinnati: [-84.512, 39.103], Columbus: [-82.999, 39.961], Detroit: [-83.046, 42.331], Minneapolis: [-93.265, 44.978], 'Salt Lake City': [-111.891, 40.761], 'Las Vegas': [-115.139, 36.172], 'Los Angeles': [-118.244, 34.052], 'San Diego': [-117.161, 32.716] };
const pins = await p.evaluate((cities) => { const m = (window.__olMaps || []).at(-1); return Object.entries(cities).map(([label, ll]) => { const [x, y] = m.getPixelFromCoordinate(ol.proj.fromLonLat(ll)); return { label, x: Math.round(x), y: Math.round(y) }; }); }, cities);
await import('node:fs/promises').then((fs) => fs.writeFile('mock/assets/pins-us.json', JSON.stringify(pins, null, 1)));
console.log(`  ${pins.length} pins projected`);
await b.close();
