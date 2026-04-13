// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.7
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
  const SCRIPT_VERSION = '1.7';

  const STYLE_ID = 'tm-effinity-style';
  const HIDDEN_ATTR = 'data-tm-effinity-hidden';
  const MAX_SIDEBAR_ATTEMPTS = 10;

  // ============================================================================
  // CSS PRINCIPAL
  // ============================================================================
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

    /* Cards ocultados via JS */
    [${HIDDEN_ATTR}="true"] {
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
    let style = document.getElementById(STYLE_ID);

    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  let debounceTimer = null;
  function debounce(fn, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  }

  // ============================================================================
  // LOCALIZAÇÃO SEGURA DE CARD POR TÍTULO
  // ============================================================================

  function findCardContainerFromTitle(titleEl) {
    if (!titleEl) return null;

    // Tentativa 1: sobe até um card com estrutura típica
    let node = titleEl;
    while (node && node !== document.body) {
      if (
        node.nodeType === 1 &&
        node.classList &&
        node.classList.contains('rounded-xl') &&
        node.classList.contains('bg-card')
      ) {
        return node;
      }
      node = node.parentElement;
    }

    // Tentativa 2: fallback para qualquer ancestral visualmente compatível
    node = titleEl.parentElement;
    while (node && node !== document.body) {
      const className = typeof node.className === 'string' ? node.className : '';
      if (
        className.includes('rounded-xl') &&
        className.includes('border') &&
        className.includes('shadow')
      ) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  }

  function hideCardByExactTitle(titleText) {
    const titles = document.querySelectorAll('h3');
    let hiddenCount = 0;

    for (const title of titles) {
      const text = normalizeText(title.textContent);

      if (text !== titleText) continue;

      const card = findCardContainerFromTitle(title);
      if (!card) continue;

      if (card.getAttribute(HIDDEN_ATTR) !== 'true') {
        card.setAttribute(HIDDEN_ATTR, 'true');
        hiddenCount += 1;
      }
    }

    if (hiddenCount > 0) {
      log(`card ocultado com sucesso: "${titleText}" (${hiddenCount})`);
    }

    return hiddenCount;
  }

  // ============================================================================
  // AJUSTES DINÂMICOS
  // ============================================================================

  function applyDynamicAdjustments() {
    hideCardByExactTitle('Informações do Cliente');
  }

  function reapplyAll() {
    applyCSS();
    applyDynamicAdjustments();
  }

  // ============================================================================
  // REFORÇO CONTROLADO PARA SPA
  // ============================================================================
  // Evita loop infinito. Faz varreduras curtas após iniciar / navegar.

  let scheduledPasses = [];
  function clearScheduledPasses() {
    for (const timer of scheduledPasses) {
      clearTimeout(timer);
    }
    scheduledPasses = [];
  }

  function scheduleReapplyPasses() {
    clearScheduledPasses();

    const delays = [150, 400, 800, 1500, 2500, 4000];

    for (const delay of delays) {
      const timer = setTimeout(() => {
        reapplyAll();
      }, delay);

      scheduledPasses.push(timer);
    }
  }

  // ============================================================================
  // SIDEBAR
  // ============================================================================

  let sidebarAttempts = 0;

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
  // OBSERVER CONTROLADO
  // ============================================================================
  // Continua leve, mas com subtree true para pegar renderização interna da SPA.
  // O custo é reduzido pelo debounce e pela lógica curta de reaplicação.

  let observer = null;

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
      debounce(() => {
        reapplyAll();
      }, 200);
    });

    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }

  // ============================================================================
  // DETECÇÃO DE NAVEGAÇÃO INTERNA
  // ============================================================================

  let lastUrl = location.href;

  function startUrlWatcher() {
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        log('mudança interna de rota detectada');
        reapplyAll();
        scheduleReapplyPasses();
        sidebarAttempts = 0;
        setTimeout(collapseSidebar, 500);
      }
    }, 1000);
  }

  // ============================================================================
  // INICIALIZAÇÃO
  // ============================================================================

  function init() {
    reapplyAll();
    scheduleReapplyPasses();
    log(`iniciado v${SCRIPT_VERSION}`);
  }

  function boot() {
    init();
    startObserver();
    startUrlWatcher();
    setTimeout(collapseSidebar, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('load', () => {
    reapplyAll();
    scheduleReapplyPasses();
  });

  window.addEventListener('pageshow', () => {
    reapplyAll();
    scheduleReapplyPasses();
  });
})();
