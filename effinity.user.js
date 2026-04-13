// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Customizações visuais e ajustes de interface no Effinity
// @author       raik
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_NAME = 'TM effinity';
  const SCRIPT_VERSION = '1.6';

  // ============================================================================
  // CSS PRINCIPAL
  // ============================================================================
  // Regras fixas e leves. Tudo que puder ser resolvido por CSS deve ficar aqui.
  const css = `
    /* ==========================================================================
       Layout geral
       ========================================================================== */
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

    /* ==========================================================================
       Ocultações fixas
       ========================================================================== */

    /* Ocultar header principal */
    header.glass.sticky.top-0.z-50 {
      display: none !important;
    }

    /* Ocultar cabeçalho "Gestão de Tickets / Tempo Real" */
    .flex.flex-col.space-y-1\\.5.pb-3:has(.lucide-clock) {
      display: none !important;
    }

    /* Ocultar botão "Meta" */
    button:has(.lucide-database) {
      display: none !important;
    }
  `;

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  function log(...args) {
    console.log(`[${SCRIPT_NAME}]`, ...args);
  }

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

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

  // Debounce simples para evitar várias execuções em sequência
  let debounceTimer = null;
  function debounce(fn, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  }

  // ============================================================================
  // AÇÕES VISUAIS POR JS
  // ============================================================================
  // Usado apenas quando CSS não consegue identificar com segurança pelo texto.

  function hideCardByTitle(titleText) {
    const titles = document.querySelectorAll('h3');

    for (const title of titles) {
      const text = normalizeText(title.textContent);

      if (text === titleText) {
        const card = title.closest('.rounded-xl');
        if (card && card.style.display !== 'none') {
          card.style.display = 'none';
          log(`card ocultado: "${titleText}"`);
        }
      }
    }
  }

  function applyDynamicAdjustments() {
    // Oculta o card "Informações do Cliente"
    hideCardByTitle('Informações do Cliente');
  }

  // ============================================================================
  // SIDEBAR
  // ============================================================================

  let sidebarAttempts = 0;
  const MAX_SIDEBAR_ATTEMPTS = 10;

  function collapseSidebar() {
    const btn = document.querySelector('button[aria-label="Fechar menu"]');

    if (btn) {
      btn.click();
      log('sidebar recolhida');
      return;
    }

    sidebarAttempts += 1;

    if (sidebarAttempts < MAX_SIDEBAR_ATTEMPTS) {
      setTimeout(collapseSidebar, 300);
    }
  }

  // ============================================================================
  // REAPLICAÇÃO CONTROLADA
  // ============================================================================
  // Observer continua restrito e leve, apenas como apoio para mudanças da app.

  let observer = null;

  function reapplyAll() {
    applyCSS();
    applyDynamicAdjustments();
  }

  function startObserver() {
    const target =
      document.getElementById('app') ||
      document.querySelector('[data-v-app]') ||
      document.body;

    if (!target) return;

    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(() => {
      debounce(reapplyAll, 200);
    });

    observer.observe(target, {
      childList: true,
      subtree: false
    });
  }

  // ============================================================================
  // INICIALIZAÇÃO
  // ============================================================================

  function init() {
    reapplyAll();

    // Reforços controlados para telas SPA / render tardio
    setTimeout(reapplyAll, 500);
    setTimeout(reapplyAll, 1500);

    log(`iniciado v${SCRIPT_VERSION}`);
  }

  function boot() {
    init();
    startObserver();
    setTimeout(collapseSidebar, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('load', init);
  window.addEventListener('pageshow', init);
})();
