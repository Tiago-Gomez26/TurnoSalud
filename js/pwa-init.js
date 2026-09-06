if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[PWA] Service Worker registrado'))
      .catch(err => console.error('[PWA] Error al registrar SW:', err));
  });
}