// Self-updating service worker. Bump CACHE on EVERY deploy, or phones keep the old version.
const CACHE = 'maesymorfa-v6';
// Alerts this phone has shown (see the push handler). Kept across versions, never bumped.
const SEEN_CACHE = 'maesymorfa-alerts-seen';
const ASSETS = ['/', '/manifest.webmanifest', '/logo-header.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SEEN_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Only good answers are kept: a passing server error must never become the saved copy
const keep = (request, res) => {
  if (!res.ok) return;
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
};

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // 1. Live data: never touch it. That is every other host (Firebase, Google, image hosts)
  //    plus this site's own API routes and Next's live data requests.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.searchParams.has('_rsc') || e.request.headers.get('RSC')) return;

  // 2. Pages: network-FIRST so new versions show at once; cache is the offline fallback.
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          keep(e.request, res);
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // 3. Build files and images: cache-first is safe, Next gives them new names when they change.
  //    App icons are left to the network: the phone reads them when it adds the app to the Home Screen.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image')) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        keep(e.request, res);
        return res;
      }))
    );
  }
});

// School alerts (src/lib/schoolAlerts.ts, sent by src/app/api/alerts/route.ts). Firebase delivers each
// alert as data only, and this worker shows it, so it looks the same on every phone. iPhones stop
// delivering to a site whose push arrives without a notification, so one is always shown.
// The last alert shown for each post is remembered for 10 minutes: if the same one arrives again (a
// retry), it is shown without a sound or buzz, even if the parent already swiped the first one away
// or the site updated meanwhile. One still on screen counts too.
const SEEN = '/__alerts/seen/';
const REPEAT_MS = 10 * 60 * 1000;

self.addEventListener('push', (e) => {
  let alert = {};
  try {
    const message = e.data ? e.data.json() : {};
    alert = message.data || message.notification || {};
  } catch (err) {}
  const title = alert.title || 'Ysgol Maes Y Morfa';
  const body = alert.body || '';
  const tag = alert.tag || 'school-alert';
  const key = SEEN + encodeURIComponent(tag);
  const show = (repeat) => self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    // A new alert for the same post replaces the old one and buzzes
    tag,
    renotify: !repeat,
    silent: repeat,
    data: { url: alert.url || '/' },
  });
  const onScreen = () => self.registration.getNotifications({ tag })
    .then((shown) => shown.some((n) => n.title === title && n.body === body))
    .catch(() => false);
  e.waitUntil(
    caches.open(SEEN_CACHE)
      .then((cache) => Promise.all([cache.match(key).then((hit) => (hit ? hit.json() : null)).catch(() => null), onScreen()])
        .then(([last, visible]) => {
          const remembered = !!last && last.title === title && last.body === body && Date.now() - last.at < REPEAT_MS;
          const repeat = remembered || visible;
          return Promise.all([
            show(repeat),
            cache.put(key, new Response(JSON.stringify({ title, body, at: remembered ? last.at : Date.now() }))).catch(() => {}),
          ]);
        }))
      .catch(() => onScreen().then(show))
  );
});

// Tapping the alert opens the story: in the app window that is already open, or a new one
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  let target = new URL('/', self.location.origin);
  try {
    const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin);
    if (url.origin === self.location.origin) target = url; // never send a parent to another site
  } catch (err) {}
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const story = wins.find((w) => w.url === target.href);
      if (story) return story.focus();
      // Never take over a page where staff may be halfway through typing (the admin area)
      const win = wins.find((w) => {
        const url = new URL(w.url);
        return url.origin === self.location.origin && !/^\/(admin|teacher|staff|login|signup)(\/|$)/.test(url.pathname);
      });
      if (!win) return self.clients.openWindow(target.href);
      return win.focus()
        .then((focused) => (focused || win).navigate(target.href))
        .catch(() => self.clients.openWindow(target.href));
    })
  );
});
