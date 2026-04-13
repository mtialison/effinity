// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.4
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

    /* Ocultar cabeçalho "Gestão de Tickets / Tempo Real" */
    .flex.flex-col.space-y-1\\.5.pb-3:has(.lucide-clock) {
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

  // ─── Recolher sidebar automaticamente ao carregar ────────────────────────────
  let sidebarAttempts = 0;
  function collapseSidebar() {
    const btn = document.querySelector('button[aria-label="Fechar menu"]');
    if (btn) {
      btn.click();
      console.log('[TM effinity] sidebar recolhida');
      return;
    }
    sidebarAttempts++;
    if (sidebarAttempts < 10) {
      setTimeout(collapseSidebar, 300);
    }
  }

  // ─── Inicialização ───────────────────────────────────────────────────────────
  function init() {
    applyCSS();
    setTimeout(applyCSS, 500);
    setTimeout(applyCSS, 1500);
    console.log('[TM effinity] iniciado v1.4');
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
      setTimeout(collapseSidebar, 800);
    });
  } else {
    init();
    startObserver();
    setTimeout(collapseSidebar, 800);
  }

  window.addEventListener('load', init);
  window.addEventListener('pageshow', init);

})();
