// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  envenenado
// @author       raik
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';

  // ─── CSS principal ───────────────────────────────────────────────────────────
  const css = `
    /* Layout geral */
    .h-\\[calc\\(100vh-100px\\)\\] {
      height: 100vh !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }
    .grid.grid-cols-1.lg\\:grid-cols-2.xl\\:grid-cols-4.gap-3.flex-1.min-h-0.overflow-hidden {
      flex: 1 !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    /* Ocultar header */
    header.glass.sticky.top-0.z-50 {
      display: none !important;
    }
  `;

  // ─── Injeta/atualiza o bloco de estilo ───────────────────────────────────────
  function applyCSS() {
    let style = document.getElementById('tm-effinity-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'tm-effinity-style';
      document.head.appendChild(style);
    }
    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  // ─── Debounce: evita chamadas em rajada do MutationObserver ──────────────────
  let debounceTimer = null;
  function debouncedApply() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyCSS, 200);
  }

  // ─── Inicialização: CSS + 2 timeouts para cobrir hidratação do SPA ───────────
  function init() {
    applyCSS();
    setTimeout(applyCSS, 500);
    setTimeout(applyCSS, 1500);
    console.log('[TM effinity] iniciado v1.2');
  }

  // ─── Observer restrito ao container da app, sem subtree ──────────────────────
  let observer = null;
  function startObserver() {
    const target =
      document.getElementById('app') ||
      document.querySelector('[data-v-app]') ||
      document.body;

    if (observer) observer.disconnect();

    observer = new MutationObserver(debouncedApply);
    observer.observe(target, {
      childList: true,
      subtree: false
    });
  }

  // ─── Entrada ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      startObserver();
    });
  } else {
    init();
    startObserver();
  }

  window.addEventListener('load', init);
  window.addEventListener('pageshow', init);

})();
