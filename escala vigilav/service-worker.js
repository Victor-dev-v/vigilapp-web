// Uma versão para o nosso cache. Mude este número para forçar a atualização.
const CACHE_VERSION = 'v1.4';
const CACHE_NAME = `vigilav-cache-${CACHE_VERSION}`;

// Lista de arquivos essenciais para o app funcionar offline.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/registro.html',
  '/style.css',
  '/manifest.json',
  '/js/app.js',
  '/js/auth.js',
  '/js/firebase.js',
  '/js/router.js',
  '/js/ui.js',
  '/assets/vigilav-white.png',
  '/assets/vigilav-black.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

// Instala o Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache aberto. Armazenando arquivos principais.');
        // Usamos { cache: 'reload' } para garantir que estamos pegando a versão mais recente da rede durante a instalação.
        const requests = URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(requests);
      }).catch(error => {
        console.error('[Service Worker] Falha ao cachear arquivos:', error);
      })
  );
});

// Ativa o Service Worker e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepta as requisições de rede
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignora requisições do Firebase
  if (request.url.includes('firestore.googleapis.com') || request.url.includes('firebaseapp.com')) {
    return;
  }
  
  // Para a navegação principal, sempre tente a rede primeiro.
  // Isso garante que o usuário sempre pegue a versão mais recente do app.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Para todos os outros arquivos (CSS, JS, imagens), use a estratégia Cache First.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(networkResponse => {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});