const CACHE_NAME = 'wordbook-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/app-icon-192.png',
  '/app-icon-512.png'
];

// インストール時にキャッシュを作成する
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// fetchイベントで、キャッシュがあればキャッシュから返す
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュ内に一致するリクエストがあれば、それを返す
        if (response) {
          return response;
        }
        // なければ、ネットワークにリクエストを送る
        return fetch(event.request);
      }
    )
  );
});