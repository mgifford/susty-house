/* =========================================================
   Sustainable House Evaluator — Service Worker Registration
   ========================================================= */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers not supported in this browser.');
    return;
  }

  const basePath = location.pathname.startsWith('/susty-house/') ? '/susty-house' : '';
  navigator.serviceWorker.register(`${basePath}/sw.js`)
    .then(registration => {
      console.log('[PWA] Service worker registered:', registration.scope);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — show update banner
            showUpdateBanner();
          }
        });
      });
    })
    .catch(err => console.warn('[PWA] Service worker registration failed:', err));
}

function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  window.App?.announceStatus?.('A new version is available. Reload to update.');
  banner.innerHTML = `
    <span>A new version is available.</span>
    <button class="btn btn-sm" onclick="location.reload()" type="button">
      Reload to update
    </button>
  `;
  document.body.prepend(banner);
}
