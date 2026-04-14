// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      3.7
// @description  Customizações Effinity - sidebar recolhida no carregamento
// @author       raik
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_NAME = 'TM effinity';
  const SCRIPT_VERSION = '3.7';

  const STYLE_ID = 'tm-effinity-style';
  const ROOT_COLLAPSED_ATTR = 'data-tm-sidebar-collapsed';
  const HIDDEN_ATTR = 'data-tm-effinity-hidden';
  const DATE_APPLIED_ATTR = 'data-tm-date-applied';
  const UPPERCASE_NAME_ATTR = 'data-tm-uppercase-name';
  const COPY_CARD_ATTR = 'data-tm-copy-card';
  const COPY_VALUE_ATTR = 'data-tm-copy-value';
  const COPY_TOAST_ATTR = 'data-tm-copy-toast';
  const COPY_TOAST_VISIBLE_ATTR = 'data-tm-copy-toast-visible';
  const QUEUE_TAG_ATTR = 'data-tm-queue-tag';
  const QUEUE_TAG_TYPE_ATTR = 'data-tm-queue-type';
  const AGENT_AREA_ATTR = 'data-tm-agent-area';
  const AGENT_TOP_ATTR = 'data-tm-agent-top-row';
  const AGENT_BOTTOM_ATTR = 'data-tm-agent-bottom-row';
  const AGENT_ACTIONS_ATTR = 'data-tm-agent-actions-row';

  const COPY_ICON_URL = 'https://i.imgur.com/0SJagfY.png';
  const SIDEBAR_EXPANDED_WIDTH = '16rem';
  const SIDEBAR_COLLAPSED_WIDTH = '4rem';

  const css = `
    /* =====================================================================
       SEÇÃO 1 — SIDEBAR INICIAL RECOLHIDA (PRÉ-PAINT / SEM FLICKER)
       ===================================================================== */

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg {
      width: ${SIDEBAR_COLLAPSED_WIDTH} !important;
      min-width: ${SIDEBAR_COLLAPSED_WIDTH} !important;
      max-width: ${SIDEBAR_COLLAPSED_WIDTH} !important;
      overflow: hidden !important;
      transition: none !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg * {
      transition-duration: 0ms !important;
      animation-duration: 0ms !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg > div:first-child {
      justify-content: center !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      position: relative !important;
      min-height: 64px !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg > div:first-child > div:first-child {
      display: none !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg button[aria-label="Fechar menu"],
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg button[aria-label="Abrir menu"] {
      width: 100% !important;
      height: 100% !important;
      border-radius: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      margin: 0 !important;
      opacity: 1 !important;
      background: transparent !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg nav {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg h3,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg a span,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg button span,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg .lucide-chevron-right {
      display: none !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg .mb-8,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg .mt-8,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg .space-y-3,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg .space-y-2 {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg a,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg nav > div > div > button,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg .space-y-3 > button {
      width: calc(${SIDEBAR_COLLAPSED_WIDTH} - 14px) !important;
      min-width: calc(${SIDEBAR_COLLAPSED_WIDTH} - 14px) !important;
      height: 40px !important;
      margin: 0 auto 8px auto !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0 !important;
      border-radius: 12px !important;
      overflow: hidden !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg a > svg,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg button > svg,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg button span > svg,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg a span > svg {
      margin: 0 !important;
      flex-shrink: 0 !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg .space-y-3 > button > span,
    html[${ROOT_COLLAPSED_ATTR}="true"] aside.fixed.left-0.top-0.h-full.z-40.border-r.shadow-lg .space-y-3 > button > span.mr-2 {
      display: inline-flex !important;
      margin: 0 !important;
    }

    /* tentativa de alinhar o conteúdo principal já no estado recolhido */
    html[${ROOT_COLLAPSED_ATTR}="true"] body [style*="margin-left: 16rem"] {
      margin-left: ${SIDEBAR_COLLAPSED_WIDTH} !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] body [style*="padding-left: 16rem"] {
      padding-left: ${SIDEBAR_COLLAPSED_WIDTH} !important;
    }

    html[${ROOT_COLLAPSED_ATTR}="true"] body [style*="width: calc(100% - 16rem)"] {
      width: calc(100% - ${SIDEBAR_COLLAPSED_WIDTH}) !important;
    }

    /* =====================================================================
       SEÇÃO 2 — LAYOUT GERAL
       ===================================================================== */

    .h-\[calc\(100vh-100px\)\] {
      height: 100vh !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }

    .grid.grid-cols-1.lg\:grid-cols-2.xl\:grid-cols-4.gap-3.flex-1.min-h-0.overflow-hidden {
      flex: 1 !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    /* =====================================================================
       SEÇÃO 3 — ELEMENTOS OCULTOS
       ===================================================================== */

    header.glass.sticky.top-0.z-50 {
      display: none !important;
    }

    .flex.flex-col.space-y-1\.5.pb-3:has(.lucide-clock) {
      display: none !important;
    }

    button:has(.lucide-database) {
      display: none !important;
    }

    div.p-2.border.rounded.cursor-pointer div.flex.items-center.gap-1 > span.text-xs:first-child,
    div.p-2.border.rounded.cursor-pointer div.flex.items-center.gap-1 > span.font-medium.text-sm.truncate,
    div.p-2.border.rounded.cursor-pointer div.flex.items-center.gap-1 > div.inline-flex:has(.lucide-minus),
    div.p-2.border.rounded.cursor-pointer div.flex.items-center.gap-1 > div.inline-flex.h-4,
    div.p-2.border.rounded.cursor-pointer span.flex.items-center.gap-1.text-xs.text-muted-foreground:has(.lucide-phone),
    div.p-2.border.rounded.cursor-pointer div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]):has(+ *),
    div.p-2.border.rounded.cursor-pointer div.flex.items-center.gap-1.mb-1 > div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]),
    div.p-2.border.rounded.cursor-pointer div.inline-flex.items-center.rounded-full:has(.lucide-check-circle2),
    div.p-2.border.rounded.cursor-pointer span.inline-flex.items-center.gap-1.rounded-full.px-1\.5.py-0\.5.text-\[10px\].border.bg-blue-50,
    [${HIDDEN_ATTR}="true"] {
      display: none !important;
    }

    /* =====================================================================
       SEÇÃO 4 — PADRONIZAÇÃO VISUAL DE NOMES
       ===================================================================== */

    [${UPPERCASE_NAME_ATTR}="true"] {
      text-transform: uppercase !important;
    }

    /* =====================================================================
       SEÇÃO 5 — ÁREA DO AGENTE (REORGANIZAÇÃO + LIMPEZA)
       ===================================================================== */

    [${AGENT_AREA_ATTR}="true"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
    }

    [${AGENT_TOP_ATTR}="true"] {
      display: none !important;
    }

    [${AGENT_BOTTOM_ATTR}="true"] {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      flex-wrap: nowrap !important;
      gap: 24px !important;
      min-height: 40px !important;
      margin: 0 !important;
    }

    [${AGENT_BOTTOM_ATTR}="true"] > .tm-agent-left {
      display: flex !important;
      align-items: center !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
    }

    [${AGENT_ACTIONS_ATTR}="true"] {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 16px !important;
      flex: 0 0 auto !important;
      margin-left: auto !important;
      white-space: nowrap !important;
    }

    [${AGENT_ACTIONS_ATTR}="true"] button,
    [${AGENT_ACTIONS_ATTR}="true"] > div,
    [${AGENT_ACTIONS_ATTR}="true"] > span {
      flex-shrink: 0 !important;
    }

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

    .tm-agent-hidden {
      display: none !important;
    }

    /* =====================================================================
       SEÇÃO 6 — CÓPIA DE DADOS + TOAST
       ===================================================================== */

    [${COPY_CARD_ATTR}="true"] {
      position: relative !important;
    }

    [${COPY_VALUE_ATTR}="true"] {
      cursor: pointer !important;
      user-select: none !important;
      transition: opacity 0.18s ease, transform 0.18s ease !important;
    }

    [${COPY_VALUE_ATTR}="true"]:hover {
      opacity: 0.88 !important;
    }

    [${COPY_VALUE_ATTR}="true"]:active {
      transform: scale(0.985) !important;
    }

    [${COPY_TOAST_ATTR}="true"] {
      position: absolute !important;
      top: 12px !important;
      right: 12px !important;
      width: 40px !important;
      height: 40px !important;
      opacity: 0 !important;
      transform: scale(0.96) !important;
      transition: opacity 0.18s ease, transform 0.18s ease !important;
      pointer-events: none !important;
      z-index: 30 !important;
    }

    [${COPY_TOAST_VISIBLE_ATTR}="true"] {
      opacity: 1 !important;
      transform: scale(1) !important;
    }

    [${COPY_TOAST_ATTR}="true"] img {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      pointer-events: none !important;
      user-select: none !important;
    }

    /* =====================================================================
       SEÇÃO 7 — TAGS DE FILA
       ===================================================================== */

    [${QUEUE_TAG_ATTR}="true"] {
      background-image: none !important;
      box-shadow: none !important;
      border-width: 1px !important;
      border-style: solid !important;
      font-weight: 600 !important;
      line-height: 1.1 !important;
    }

    [${QUEUE_TAG_TYPE_ATTR}="clinica_do_sono"] {
      background-color: #dbeafe !important;
      color: #1d4ed8 !important;
      border-color: #93c5fd !important;
    }

    [${QUEUE_TAG_TYPE_ATTR}="samec"] {
      background-color: #fef3c7 !important;
      color: #b45309 !important;
      border-color: #fcd34d !important;
    }

    [${QUEUE_TAG_TYPE_ATTR}="confirmacao"] {
      background-color: #fee2e2 !important;
      color: #b91c1c !important;
      border-color: #fca5a5 !important;
    }
  `;

  function log(...args) {
    console.log(`[${SCRIPT_NAME}]`, ...args);
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function markSidebarCollapsedPrePaint() {
    document.documentElement.setAttribute(ROOT_COLLAPSED_ATTR, 'true');
  }

  function applyCSS() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
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

  function hideElement(el) {
    if (!el || !(el instanceof HTMLElement)) return;
    el.setAttribute(HIDDEN_ATTR, 'true');
  }

  function markUppercase(el) {
    if (!el || !(el instanceof HTMLElement)) return;
    el.setAttribute(UPPERCASE_NAME_ATTR, 'true');
  }

  function copyTextToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const copied = document.execCommand('copy');
        textarea.remove();
        return copied;
      } catch (error) {
        console.error(`[${SCRIPT_NAME}] falha ao copiar`, error);
        return false;
      }
    });
  }

  function findCardContainerFromTitle(titleEl) {
    let node = titleEl;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('rounded-xl') && node.classList.contains('bg-card')) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  /* =======================================================================
     BLOCO FUNCIONAL — OCULTAR CARDS INTEIROS POR TÍTULO
     ======================================================================= */

  function hideCardByExactTitle(titleText) {
    for (const title of document.querySelectorAll('h3')) {
      if (normalizeText(title.textContent) !== titleText) continue;
      const card = findCardContainerFromTitle(title);
      if (card) hideElement(card);
    }
  }

  /* =======================================================================
     BLOCO FUNCIONAL — DATA COMPLETA NAS MENSAGENS
     ======================================================================= */

  function applyDateToMessages() {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-4.space-y-1.scroll-smooth.min-h-0');
    if (!chatContainer) return;

    const currentYear = new Date().getFullYear();
    const monthMap = {
      janeiro: 0, fevereiro: 1, março: 2, marco: 2,
      abril: 3, maio: 4, junho: 5, julho: 6,
      agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
    };

    const parseDaySeparator = (text) => {
      const normalized = normalizeText(text).toLowerCase();
      const match = normalized.match(/^(\d{1,2})\s+de\s+([a-zçãé]+)/i);
      if (!match) return null;
      const day = Number(match[1]);
      const monthIndex = monthMap[match[2]];
      if (Number.isNaN(day) || monthIndex === undefined) return null;
      return new Date(currentYear, monthIndex, day);
    };

    const formatDate = (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${date.getFullYear()}`;
    };

    const timeToMinutes = (timeText) => {
      const match = timeText.match(/^(\d{2}):(\d{2})$/);
      if (!match) return null;
      return Number(match[1]) * 60 + Number(match[2]);
    };

    let activeDate = null;
    let lastMinutes = null;

    for (const child of Array.from(chatContainer.children)) {
      if (!(child instanceof HTMLElement)) continue;

      const daySeparator = child.querySelector('span.text-xs.text-muted-foreground.bg-muted\\/50.px-3.py-1.rounded-full');
      if (daySeparator) {
        const parsedDate = parseDaySeparator(daySeparator.textContent);
        if (parsedDate) {
          activeDate = parsedDate;
          lastMinutes = null;
        }
        continue;
      }

      const timeSpan = child.querySelector('.flex.items-center.gap-1\\.5.mt-1\\.5 span.text-\\[10px\\].opacity-60');
      if (!timeSpan) continue;

      const timeMatch = normalizeText(timeSpan.textContent).match(/(\d{2}:\d{2})$/);
      if (!timeMatch) continue;

      const timeText = timeMatch[1];
      const minutes = timeToMinutes(timeText);
      if (minutes === null) continue;

      if (!activeDate) {
        activeDate = new Date();
        activeDate.setHours(0, 0, 0, 0);
      }

      if (lastMinutes !== null && minutes < lastMinutes) {
        activeDate = new Date(activeDate);
        activeDate.setDate(activeDate.getDate() + 1);
      }

      timeSpan.textContent = `${formatDate(activeDate)} ${timeText}`;
      timeSpan.setAttribute(DATE_APPLIED_ATTR, 'true');
      lastMinutes = minutes;
    }
  }

  /* =======================================================================
     BLOCO FUNCIONAL — ÁREA DO AGENTE
     ======================================================================= */

  function findAgentAreaContainer() {
    for (const span of document.querySelectorAll('span')) {
      if (normalizeText(span.textContent) !== 'Área do Agente') continue;
      const container = span.closest('.bg-card.border.border-border.rounded-lg');
      if (container) return container;
    }
    return null;
  }

  function findTopRow(agentContainer) {
    if (!agentContainer) return null;
    for (const child of Array.from(agentContainer.children)) {
      if (!(child instanceof HTMLElement) || child.tagName !== 'DIV') continue;
      const text = normalizeText(child.textContent);
      if (text.includes('Área do Agente') && (text.includes('Offline') || text.includes('Online')) && text.includes('Enviar HSM')) {
        return child;
      }
    }
    return null;
  }

  function findBottomRow(agentContainer, topRow) {
    if (!agentContainer) return null;
    for (const child of Array.from(agentContainer.children)) {
      if (child === topRow || !child.matches('div')) continue;
      if (normalizeText(child.textContent).includes('Filas:')) return child;
    }
    return null;
  }

  function findOfflineControl(topRow) {
    if (!topRow) return null;
    for (const btn of topRow.querySelectorAll('button')) {
      const text = normalizeText(btn.textContent);
      if (text.includes('Offline') || text.includes('Online') || text.includes('Pausa') || text.includes('Ausente')) {
        return btn.closest('.relative.inline-block.text-left') || btn;
      }
    }
    return null;
  }

  function findSendHsmButton(topRow) {
    if (!topRow) return null;
    for (const btn of topRow.querySelectorAll('button')) {
      if (normalizeText(btn.textContent).includes('Enviar HSM')) return btn;
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
      if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute && node.getAttribute(AGENT_ACTIONS_ATTR) === 'true') continue;
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

    if (offlineControl && offlineControl.parentElement !== actionsWrapper) actionsWrapper.appendChild(offlineControl);
    if (sendHsmButton && sendHsmButton.parentElement !== actionsWrapper) actionsWrapper.appendChild(sendHsmButton);

    for (const btn of topRow.querySelectorAll('button')) {
      const text = normalizeText(btn.textContent);
      if (text.includes('Enviar HSM') || text.includes('Offline') || text.includes('Online')) continue;
      btn.classList.add('tm-agent-hidden');
    }

    topRow.querySelectorAll('.w-px').forEach((el) => el.classList.add('tm-agent-hidden'));
  }

  /* =======================================================================
     BLOCO FUNCIONAL — CARDS DA FILA / NOMES EM UPPERCASE / TAGS
     ======================================================================= */

  function isTicketListCard(card) {
    if (!card || !(card instanceof HTMLElement)) return false;
    const hasUser = !!card.querySelector('.lucide-user');
    const hasQueueTag = !!Array.from(card.querySelectorAll('div.inline-flex.items-center.rounded-full')).find((el) => {
      const text = normalizeText(el.textContent).toLowerCase();
      return text === 'clínica do sono' || text === 'clinica do sono' || text === 'samec' || text === 'confirmação' || text === 'confirmacao';
    });
    const hasTimeInfo = normalizeText(card.textContent).includes('Última atividade:') || !!card.querySelector('.lucide-clock');
    return hasUser && hasQueueTag && hasTimeInfo;
  }

  function getAllTicketListCards() {
    return Array.from(document.querySelectorAll('div.p-2.border.rounded.cursor-pointer')).filter(isTicketListCard);
  }

  function uppercaseTicketListCardNames() {
    for (const card of getAllTicketListCards()) {
      for (const nameEl of card.querySelectorAll('span.flex.items-center.gap-1.text-xs.text-card-foreground > span.font-medium')) {
        markUppercase(nameEl);
      }
    }
  }

  function getQueueType(labelText) {
    const text = normalizeText(labelText).toLowerCase();
    if (text === 'clínica do sono' || text === 'clinica do sono') return 'clinica_do_sono';
    if (text === 'samec') return 'samec';
    if (text === 'confirmação' || text === 'confirmacao') return 'confirmacao';
    return '';
  }

  function styleQueueTagsInTicketCards() {
    for (const card of getAllTicketListCards()) {
      for (const badge of card.querySelectorAll('div.inline-flex.items-center.rounded-full')) {
        if (!(badge instanceof HTMLElement)) continue;
        const queueType = getQueueType(normalizeText(badge.textContent));
        if (!queueType) continue;
        badge.setAttribute(QUEUE_TAG_ATTR, 'true');
        badge.setAttribute(QUEUE_TAG_TYPE_ATTR, queueType);
        badge.style.backgroundColor = '';
        badge.style.color = '';
        badge.style.borderColor = '';
        badge.style.backgroundImage = 'none';
      }
    }
  }

  function applyUppercaseToCustomerNames() {
    for (const nameEl of document.querySelectorAll('div.px-4.py-3.flex.items-center.justify-between.gap-4 h2.font-semibold.text-card-foreground.truncate')) {
      markUppercase(nameEl);
    }
    uppercaseTicketListCardNames();
  }

  /* =======================================================================
     BLOCO FUNCIONAL — CÓPIA DE DADOS DO ATENDIMENTO + TOAST
     ======================================================================= */

  function findAttendanceDataCards() {
    const result = [];
    for (const card of document.querySelectorAll('div.rounded-xl.bg-card.border.border-border, div.rounded-lg.bg-card.border.border-border')) {
      const title = card.querySelector('h3');
      if (title && normalizeText(title.textContent) === 'Dados do Atendimento') result.push(card);
    }
    return result;
  }

  function ensureCopyToast(card) {
    let toast = card.querySelector(`[${COPY_TOAST_ATTR}="true"]`);
    if (toast) return toast;

    toast = document.createElement('div');
    toast.setAttribute(COPY_TOAST_ATTR, 'true');

    const img = document.createElement('img');
    img.src = COPY_ICON_URL;
    img.alt = 'Copiado';
    img.draggable = false;

    toast.appendChild(img);
    card.appendChild(toast);
    return toast;
  }

  function showCopyToast(card) {
    const toast = ensureCopyToast(card);
    if (toast._tmHideTimer) clearTimeout(toast._tmHideTimer);
    toast.setAttribute(COPY_TOAST_VISIBLE_ATTR, 'true');
    toast._tmHideTimer = setTimeout(() => toast.removeAttribute(COPY_TOAST_VISIBLE_ATTR), 1300);
  }

  function findValueSpanByLabel(card, labelText) {
    for (const label of card.querySelectorAll('span')) {
      if (normalizeText(label.textContent) !== labelText) continue;
      let row = label.parentElement;
      while (row && row !== card) {
        const valueSpan = row.querySelector('span.text-sm.text-card-foreground.break-words.min-w-0');
        if (valueSpan) return valueSpan;
        row = row.parentElement;
      }
    }
    return null;
  }

  function bindCopyOnClick(valueEl, card, fieldName) {
    if (!valueEl || valueEl.getAttribute(COPY_VALUE_ATTR) === 'true') return;

    valueEl.setAttribute(COPY_VALUE_ATTR, 'true');
    valueEl.setAttribute('title', `Clique para copiar ${fieldName.toLowerCase()}`);

    valueEl.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = normalizeText(valueEl.textContent);
      if (!text) return;
      if (await copyTextToClipboard(text)) showCopyToast(card);
    });
  }

  function enableCopyOnAttendanceData() {
    for (const card of findAttendanceDataCards()) {
      card.setAttribute(COPY_CARD_ATTR, 'true');
      ensureCopyToast(card);

      for (const [labelText, fieldName] of [
        ['Nome', 'nome'],
        ['Nascimento', 'nascimento'],
        ['CPF', 'cpf'],
        ['Telefone', 'telefone'],
      ]) {
        const valueEl = findValueSpanByLabel(card, labelText);
        if (valueEl) bindCopyOnClick(valueEl, card, fieldName);
      }
    }
  }

  /* =======================================================================
     BLOCO CENTRAL — REAPLICAÇÃO SEGURA PARA SPA
     ======================================================================= */

  function applyDynamicAdjustments() {
    hideCardByExactTitle('Informações do Cliente');
    hideCardByExactTitle('Resumo do Ticket');
    applyDateToMessages();
    reorganizeAgentArea();
    applyUppercaseToCustomerNames();
    enableCopyOnAttendanceData();
    styleQueueTagsInTicketCards();
  }

  function reapplyAll() {
    markSidebarCollapsedPrePaint();
    applyCSS();
    applyDynamicAdjustments();
  }

  let scheduledPasses = [];
  function scheduleReapplyPasses() {
    scheduledPasses.forEach(clearTimeout);
    scheduledPasses = [];
    for (const delay of [80, 180, 350, 700, 1200, 2200]) {
      scheduledPasses.push(setTimeout(reapplyAll, delay));
    }
  }

  let observer = null;
  function startObserver() {
    const target = document.getElementById('app') || document.querySelector('[data-v-app]') || document.body;
    if (!target) return;

    if (observer) observer.disconnect();

    observer = new MutationObserver(() => debounce(reapplyAll, 120));
    observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-label'] });
  }

  function init() {
    reapplyAll();
    scheduleReapplyPasses();
    log(`iniciado v${SCRIPT_VERSION}`);
  }

  function boot() {
    markSidebarCollapsedPrePaint();
    applyCSS();
    init();
    startObserver();
  }

  markSidebarCollapsedPrePaint();
  applyCSS();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('load', init);
  window.addEventListener('pageshow', init);
})();
