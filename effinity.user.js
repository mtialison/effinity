// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      2.0
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
  const SCRIPT_VERSION = '2.0';

  const STYLE_ID = 'tm-effinity-style';
  const HIDDEN_ATTR = 'data-tm-effinity-hidden';
  const DATE_APPLIED_ATTR = 'data-tm-date-applied';
  const MAX_SIDEBAR_ATTEMPTS = 10;

  // ============================================================================
  // CSS
  // ============================================================================
  const css = `
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

    header.glass.sticky.top-0.z-50 {
      display: none !important;
    }

    .flex.flex-col.space-y-1\\.5.pb-3:has(.lucide-clock) {
      display: none !important;
    }

    button:has(.lucide-database) {
      display: none !important;
    }

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

  function getCurrentDateFormatted() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // ============================================================================
  // OCULTAÇÃO DE CARDS
  // ============================================================================
  function findCardContainerFromTitle(titleEl) {
    let node = titleEl;

    while (node && node !== document.body) {
      if (
        node.classList &&
        node.classList.contains('rounded-xl') &&
        node.classList.contains('bg-card')
      ) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  }

  function hideCardByExactTitle(titleText) {
    const titles = document.querySelectorAll('h3');

    for (const title of titles) {
      const text = normalizeText(title.textContent);
      if (text !== titleText) continue;

      const card = findCardContainerFromTitle(title);
      if (!card) continue;

      if (card.getAttribute(HIDDEN_ATTR) !== 'true') {
        card.setAttribute(HIDDEN_ATTR, 'true');
        log(`card ocultado: "${titleText}"`);
      }
    }
  }

  // ============================================================================
  // DATA NAS MENSAGENS
  // ============================================================================
  function isTimeText(text) {
    return /^\d{2}:\d{2}$/.test(text);
  }

  function looksLikeMessageMetaContainer(el) {
    if (!el) return false;

    const text = normalizeText(el.textContent);

    // Normalmente esse rodapé tem hora e status de envio
    return (
      text.length <= 40 &&
      /\d{2}:\d{2}/.test(text)
    );
  }

  function applyDateToMessages() {
    const spans = document.querySelectorAll('span');

    let updated = 0;
    const currentDate = getCurrentDateFormatted();

    for (const span of spans) {
      if (span.getAttribute(DATE_APPLIED_ATTR) === 'true') continue;

      const text = normalizeText(span.textContent);
      if (!isTimeText(text)) continue;

      const parent = span.parentElement;
      if (!looksLikeMessageMetaContainer(parent)) continue;

      // evita alterar spans soltos fora do chat
      const nearbyMessageBubble =
        span.closest('.rounded-2xl') ||
        span.closest('.rounded-xl') ||
        span.closest('[class*="max-w-"]') ||
        span.closest('[class*="break-words"]');

      if (!nearbyMessageBubble) continue;

      span.textContent = `${currentDate} ${text}`;
      span.setAttribute(DATE_APPLIED_ATTR, 'true');
      updated += 1;
    }

    if (updated > 0) {
      log(`datas aplicadas em ${updated} mensagem(ns)`);
    }
  }

  // ============================================================================
  // APLICAÇÃO GERAL
  // ============================================================================
  function applyDynamicAdjustments() {
    hideCardByExactTitle('Informações do Cliente');
    hideCardByExactTitle('Resumo do Ticket');
    applyDateToMessages();
  }

  function reapplyAll() {
    applyCSS();
    applyDynamicAdjustments();
  }

  // ============================================================================
  // REFORÇOS SPA
  // ============================================================================
  let scheduledPasses = [];

  function scheduleReapplyPasses() {
    scheduledPasses.forEach(clearTimeout);
    scheduledPasses = [];

    const delays = [150, 400, 800, 1500, 2500, 4000];
    for (const delay of delays) {
      scheduledPasses.push(setTimeout(reapplyAll, delay));
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
  // OBSERVER
  // ============================================================================
  let observer = null;

  function startObserver() {
    const target =
      document.getElementById('app') ||
      document.querySelector('[data-v-app]') ||
      document.body;

    if (!target) return;

    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      debounce(reapplyAll, 200);
    });

    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }

  // ============================================================================
  // INIT
  // ============================================================================
  function init() {
    reapplyAll();
    scheduleReapplyPasses();
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
