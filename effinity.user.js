// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      2.1
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
  const SCRIPT_VERSION = '2.1';

  const STYLE_ID = 'tm-effinity-style';
  const HIDDEN_ATTR = 'data-tm-effinity-hidden';
  const DATE_APPLIED_ATTR = 'data-tm-date-applied';
  const AGENT_AREA_ATTR = 'data-tm-agent-area';
  const AGENT_TOP_ATTR = 'data-tm-agent-top-row';
  const AGENT_BOTTOM_ATTR = 'data-tm-agent-bottom-row';
  const AGENT_ACTIONS_ATTR = 'data-tm-agent-actions-row';
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

    /* ==========================================================================
       Área do Agente - reorganização
       ========================================================================== */

    [${AGENT_AREA_ATTR}="true"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
    }

    /* Remove visualmente a linha superior original */
    [${AGENT_TOP_ATTR}="true"] {
      display: none !important;
    }

    /* Linha inferior principal */
    [${AGENT_BOTTOM_ATTR}="true"] {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      flex-wrap: nowrap !important;
      gap: 24px !important;
      min-height: 40px !important;
      margin: 0 !important;
    }

    /* Grupo da esquerda: Filas */
    [${AGENT_BOTTOM_ATTR}="true"] > .tm-agent-left {
      display: flex !important;
      align-items: center !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
    }

    /* Grupo da direita: Offline + Enviar HSM */
    [${AGENT_ACTIONS_ATTR}="true"] {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 16px !important;
      flex: 0 0 auto !important;
      margin-left: auto !important;
      white-space: nowrap !important;
    }

    /* Mantém os botões alinhados verticalmente */
    [${AGENT_ACTIONS_ATTR}="true"] button,
    [${AGENT_ACTIONS_ATTR}="true"] > div,
    [${AGENT_ACTIONS_ATTR}="true"] > span {
      flex-shrink: 0 !important;
    }

    /* Ajuste fino para aproximar do mock */
    [${AGENT_BOTTOM_ATTR}="true"] .flex.items-center.gap-3.flex-wrap {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      flex-wrap: nowrap !important;
      min-width: 0 !important;
    }

    [${AGENT_BOTTOM_ATTR}="true"] .flex.items-center.gap-3.flex-wrap > span.text-xs.text-muted-foreground.mr-2 {
      margin-right: 4px !important;
      flex-shrink: 0 !important;
    }

    /* Oculta sobra visual antiga se reaproveitada */
    .tm-agent-hidden {
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
    return text.length <= 40 && /\d{2}:\d{2}/.test(text);
  }

  function applyDateToMessages() {
    const spans = document.querySelectorAll('span');
    const currentDate = getCurrentDateFormatted();

    for (const span of spans) {
      if (span.getAttribute(DATE_APPLIED_ATTR) === 'true') continue;

      const text = normalizeText(span.textContent);
      if (!isTimeText(text)) continue;

      const parent = span.parentElement;
      if (!looksLikeMessageMetaContainer(parent)) continue;

      const nearbyMessageBubble =
        span.closest('.rounded-2xl') ||
        span.closest('.rounded-xl') ||
        span.closest('[class*="max-w-"]') ||
        span.closest('[class*="break-words"]');

      if (!nearbyMessageBubble) continue;

      span.textContent = `${currentDate} ${text}`;
      span.setAttribute(DATE_APPLIED_ATTR, 'true');
    }
  }

  // ============================================================================
  // ÁREA DO AGENTE
  // ============================================================================
  function findAgentAreaContainer() {
    const spans = document.querySelectorAll('span');

    for (const span of spans) {
      if (normalizeText(span.textContent) !== 'Área do Agente') continue;

      const container = span.closest('.bg-card.border.border-border.rounded-lg');
      if (container) return container;
    }

    return null;
  }

  function findTopRow(agentContainer) {
    if (!agentContainer) return null;

    const directChildren = Array.from(agentContainer.children);
    for (const child of directChildren) {
      if (!child.matches || !child.matches('div')) continue;

      const text = normalizeText(child.textContent);
      if (
        text.includes('Área do Agente') &&
        text.includes('Offline') &&
        text.includes('Enviar HSM')
      ) {
        return child;
      }
    }

    return null;
  }

  function findBottomRow(agentContainer, topRow) {
    if (!agentContainer) return null;

    const directChildren = Array.from(agentContainer.children);
    for (const child of directChildren) {
      if (child === topRow) continue;
      if (!child.matches || !child.matches('div')) continue;

      const text = normalizeText(child.textContent);
      if (text.includes('Filas:')) {
        return child;
      }
    }

    return null;
  }

  function findOfflineControl(topRow) {
    if (!topRow) return null;

    const buttons = topRow.querySelectorAll('button');
    for (const btn of buttons) {
      const text = normalizeText(btn.textContent);
      if (/^(Offline|Online|Pausa|Ausente)/i.test(text) || text.includes('Offline')) {
        const wrapper = btn.closest('.relative.inline-block.text-left');
        return wrapper || btn;
      }
    }

    return null;
  }

  function findSendHsmButton(topRow) {
    if (!topRow) return null;

    const buttons = topRow.querySelectorAll('button');
    for (const btn of buttons) {
      const text = normalizeText(btn.textContent);
      if (text.includes('Enviar HSM')) {
        return btn;
      }
    }

    return null;
  }

  function ensureAgentActionsWrapper(bottomRow) {
    let wrapper = bottomRow.querySelector(`[${AGENT_ACTIONS_ATTR}="true"]`);
    if (wrapper) return wrapper;

    wrapper = document.createElement('div');
    wrapper.setAttribute(AGENT_ACTIONS_ATTR, 'true');
    bottomRow.appendChild(wrapper);

    return wrapper;
  }

  function ensureAgentLeftWrapper(bottomRow) {
    let left = bottomRow.querySelector(':scope > .tm-agent-left');
    if (left) return left;

    left = document.createElement('div');
    left.className = 'tm-agent-left';

    const currentChildren = Array.from(bottomRow.childNodes);
    for (const node of currentChildren) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.getAttribute &&
        node.getAttribute(AGENT_ACTIONS_ATTR) === 'true'
      ) {
        continue;
      }
      left.appendChild(node);
    }

    bottomRow.insertBefore(left, bottomRow.firstChild);
    return left;
  }

  function reorganizeAgentArea() {
    const agentContainer = findAgentAreaContainer();
    if (!agentContainer) return;

    agentContainer.setAttribute(AGENT_AREA_ATTR, 'true');

    const topRow = findTopRow(agentContainer);
    const bottomRow = findBottomRow(agentContainer, topRow);

    if (!topRow || !bottomRow) return;

    topRow.setAttribute(AGENT_TOP_ATTR, 'true');
    bottomRow.setAttribute(AGENT_BOTTOM_ATTR, 'true');

    const offlineControl = findOfflineControl(topRow);
    const sendHsmButton = findSendHsmButton(topRow);

    const actionsWrapper = ensureAgentActionsWrapper(bottomRow);
    ensureAgentLeftWrapper(bottomRow);

    // Ordem exata: 1 Filas | 2 Offline | 3 Enviar HSM
    if (offlineControl && offlineControl.parentElement !== actionsWrapper) {
      actionsWrapper.appendChild(offlineControl);
    }

    if (sendHsmButton && sendHsmButton.parentElement !== actionsWrapper) {
      actionsWrapper.appendChild(sendHsmButton);
    }

    // Oculta itens superiores antigos que não serão usados mais
    const buttons = topRow.querySelectorAll('button');
    for (const btn of buttons) {
      const text = normalizeText(btn.textContent);

      if (text.includes('Enviar HSM')) continue;
      if (text.includes('Offline') || text.includes('Online')) continue;

      btn.classList.add('tm-agent-hidden');
    }

    const separators = topRow.querySelectorAll('.w-px');
    separators.forEach(el => el.classList.add('tm-agent-hidden'));
  }

  // ============================================================================
  // APLICAÇÃO GERAL
  // ============================================================================
  function applyDynamicAdjustments() {
    hideCardByExactTitle('Informações do Cliente');
    hideCardByExactTitle('Resumo do Ticket');
    applyDateToMessages();
    reorganizeAgentArea();
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
