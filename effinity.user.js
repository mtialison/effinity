// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  effinity otimizado anti-flicker + SPA + reaplicação eficiente
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
  const SCRIPT_VERSION = '4.1';

  const STYLE_ID = 'tm-effinity-style';
  const BOOT_STYLE_ID = 'tm-effinity-boot-style';

  const HIDDEN_ATTR = 'data-tm-effinity-hidden';
  const DATE_APPLIED_ATTR = 'data-tm-date-applied';

  const AGENT_AREA_ATTR = 'data-tm-agent-area';
  const AGENT_TOP_ATTR = 'data-tm-agent-top-row';
  const AGENT_BOTTOM_ATTR = 'data-tm-agent-bottom-row';
  const AGENT_ACTIONS_ATTR = 'data-tm-agent-actions-row';

  const TICKET_HEADER_ATTR = 'data-tm-ticket-header';
  const TICKET_INFO_ROW_HIDDEN_ATTR = 'data-tm-ticket-info-row-hidden';
  const TICKET_CREATED_HOST_ATTR = 'data-tm-ticket-created-host';
  const TICKET_CREATED_MOVED_ATTR = 'data-tm-ticket-created-moved';
  const TICKET_CONTACT_BLOCK_ATTR = 'data-tm-ticket-contact-block';
  const UPPERCASE_NAME_ATTR = 'data-tm-uppercase-name';
  const PHONE_NORMALIZED_ATTR = 'data-tm-phone-normalized';

  const COPY_CARD_ATTR = 'data-tm-copy-card';
  const COPY_VALUE_ATTR = 'data-tm-copy-value';
  const COPY_TOAST_ATTR = 'data-tm-copy-toast';
  const COPY_TOAST_VISIBLE_ATTR = 'data-tm-copy-toast-visible';

  const QUEUE_TAG_ATTR = 'data-tm-queue-tag';
  const QUEUE_TAG_TYPE_ATTR = 'data-tm-queue-type';

  const PROCESSING_ATTR = 'data-tm-processing';
  const MAX_SIDEBAR_ATTEMPTS = 10;
  const COPY_ICON_URL = 'https://i.imgur.com/0SJagfY.png';

  const TAB_TEXTS = [
    'Atribuído',
    'Atendimento',
    'Todos',
    'Pendentes',
    'Finalizados'
  ];

  const BOOT_CSS = `
    /* Pré-ocultação cedo para reduzir flicker de elementos que sempre devem sumir */
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > span.text-xs:first-child,
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > span.font-medium.text-sm.truncate,
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex:has(.lucide-minus),
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex.h-4,
    div.p-2.border.rounded.cursor-pointer
      span.flex.items-center.gap-1.text-xs.text-muted-foreground:has(.lucide-phone),
    div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]):has(+ *),
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1.mb-1
      > div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]),
    div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:has(.lucide-check-circle2),
    div.p-2.border.rounded.cursor-pointer
      span.inline-flex.items-center.gap-1.rounded-full.px-1\\.5.py-0\\.5.text-\\[10px\\].border.bg-blue-50 {
      display: none !important;
    }

    [data-tm-effinity-hidden="true"] {
      display: none !important;
    }

    [data-tm-uppercase-name="true"] {
      text-transform: uppercase !important;
    }
  `;

  const css = `
    /* ── Layout geral ─────────────────────────────────────────────────────── */
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

    /* ── Ocultar header ───────────────────────────────────────────────────── */
    header.glass.sticky.top-0.z-50 {
      display: none !important;
    }

    /* ── Ocultar cabeçalho "Gestão de Tickets / Tempo Real" ──────────────── */
    .flex.flex-col.space-y-1\\.5.pb-3:has(.lucide-clock) {
      display: none !important;
    }

    /* ── Ocultar botão "Meta" ─────────────────────────────────────────────── */
    button:has(.lucide-database) {
      display: none !important;
    }

    /* ── ANTI-FLICKER: Cards da fila — elementos sempre ocultos via CSS ───── */

    /* Emoji de status (✅ 🔵) — primeiro span.text-xs dentro da linha de protocolo */
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > span.text-xs:first-child {
      display: none !important;
    }

    /* Protocolo CS001... */
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > span.font-medium.text-sm.truncate {
      display: none !important;
    }

    /* Badge "Normal" (contém lucide-minus) */
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex:has(.lucide-minus) {
      display: none !important;
    }

    /* Badge "Novo" (pequeno, h-4) */
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex.h-4 {
      display: none !important;
    }

    /* Telefone (contém lucide-phone) */
    div.p-2.border.rounded.cursor-pointer
      span.flex.items-center.gap-1.text-xs.text-muted-foreground:has(.lucide-phone) {
      display: none !important;
    }

    /* Badge "Em Atendimento" */
    div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]):has(+ *),
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1.mb-1
      > div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]) {
      display: none !important;
    }

    /* Badge "No prazo" (contém lucide-check-circle2) */
    div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:has(.lucide-check-circle2) {
      display: none !important;
    }

    /* Badge "Contato" — tag azul no rodapé do card */
    div.p-2.border.rounded.cursor-pointer
      span.inline-flex.items-center.gap-1.rounded-full.px-1\\.5.py-0\\.5.text-\\[10px\\].border.bg-blue-50 {
      display: none !important;
    }

    /* ── Elementos marcados via JS (fallback para casos dinâmicos) ───────── */
    [${HIDDEN_ATTR}="true"] {
      display: none !important;
    }

    [${UPPERCASE_NAME_ATTR}="true"] {
      text-transform: uppercase !important;
    }

    /* ── Área do Agente ───────────────────────────────────────────────────── */
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

    /* ── Ticket header ────────────────────────────────────────────────────── */
    [${TICKET_INFO_ROW_HIDDEN_ATTR}="true"] {
      display: none !important;
    }

    [${TICKET_CONTACT_BLOCK_ATTR}="true"] {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: center !important;
      gap: 2px !important;
      min-width: 0 !important;
    }

    [${TICKET_CONTACT_BLOCK_ATTR}="true"] > h2,
    [${TICKET_CONTACT_BLOCK_ATTR}="true"] > a,
    [${TICKET_CONTACT_BLOCK_ATTR}="true"] > div {
      margin: 0 !important;
    }

    [${TICKET_CONTACT_BLOCK_ATTR}="true"] > a {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      width: fit-content !important;
      max-width: 100% !important;
    }

    [${TICKET_CREATED_HOST_ATTR}="true"] {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      margin-top: 0 !important;
      min-height: 14px !important;
      color: hsl(var(--muted-foreground)) !important;
      font-size: 11px !important;
      line-height: 1.2 !important;
      width: fit-content !important;
      max-width: 100% !important;
    }

    [${TICKET_CREATED_MOVED_ATTR}="true"] {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      margin: 0 !important;
      color: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
      white-space: nowrap !important;
    }

    [${TICKET_CREATED_MOVED_ATTR}="true"] svg {
      width: 12px !important;
      height: 12px !important;
      flex-shrink: 0 !important;
    }

    /* ── Copiar ao clicar ─────────────────────────────────────────────────── */
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

    /* ── Tags de fila ─────────────────────────────────────────────────────── */
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
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function ensureStyle(id, content) {
    const root = document.head || document.documentElement;
    if (!root) return null;

    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      root.appendChild(style);
    }

    if (style.textContent !== content) {
      style.textContent = content;
    }

    return style;
  }

  function applyBootCSS() {
    ensureStyle(BOOT_STYLE_ID, BOOT_CSS);
  }

  function applyCSS() {
    ensureStyle(STYLE_ID, css);
  }

  function getCurrentDateFormatted() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function hideElement(el) {
    if (!el || !(el instanceof HTMLElement)) return;
    if (el.getAttribute(HIDDEN_ATTR) !== 'true') {
      el.setAttribute(HIDDEN_ATTR, 'true');
    }
  }

  function markUppercase(el) {
    if (!el || !(el instanceof HTMLElement)) return;
    el.setAttribute(UPPERCASE_NAME_ATTR, 'true');
  }

  function removeCountryCode55(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length > 11) {
      return digits.slice(2);
    }
    return digits || String(value || '');
  }

  async function copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
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
        document.body.removeChild(textarea);
        return copied;
      } catch (fallbackError) {
        console.error(`[${SCRIPT_NAME}] falha ao copiar`, fallbackError);
        return false;
      }
    }
  }

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
      hideElement(card);
    }
  }

  function applyDateToMessages() {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-4.space-y-1.scroll-smooth.min-h-0');
    if (!chatContainer) return;

    const currentYear = new Date().getFullYear();
    const monthMap = {
      janeiro: 0, fevereiro: 1, março: 2, marco: 2,
      abril: 3, maio: 4, junho: 5, julho: 6,
      agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
    };

    function parseDaySeparator(text) {
      const normalized = normalizeText(text).toLowerCase();
      const match = normalized.match(/^(\d{1,2})\s+de\s+([a-zçãé]+)/i);
      if (!match) return null;
      const day = Number(match[1]);
      const monthIndex = monthMap[match[2]];
      if (Number.isNaN(day) || monthIndex === undefined) return null;
      return new Date(currentYear, monthIndex, day);
    }

    function formatDate(date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${date.getFullYear()}`;
    }

    function timeToMinutes(timeText) {
      const match = timeText.match(/^(\d{2}):(\d{2})$/);
      if (!match) return null;
      return Number(match[1]) * 60 + Number(match[2]);
    }

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

      const rawTime = normalizeText(timeSpan.textContent);
      const timeMatch = rawTime.match(/(\d{2}:\d{2})$/);
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

      const formatted = `${formatDate(activeDate)} ${timeText}`;
      if (timeSpan.textContent !== formatted) {
        timeSpan.textContent = formatted;
      }
      timeSpan.setAttribute(DATE_APPLIED_ATTR, 'true');
      lastMinutes = minutes;
    }
  }

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
      if (
        text.includes('Área do Agente') &&
        (text.includes('Offline') || text.includes('Online')) &&
        text.includes('Enviar HSM')
      ) {
        return child;
      }
    }
    return null;
  }

  function findBottomRow(agentContainer, topRow) {
    if (!agentContainer) return null;
    for (const child of Array.from(agentContainer.children)) {
      if (child === topRow) continue;
      if (!(child instanceof HTMLElement) || child.tagName !== 'DIV') continue;
      if (normalizeText(child.textContent).includes('Filas:')) return child;
    }
    return null;
  }

  function findOfflineControl(topRow) {
    if (!topRow) return null;
    for (const btn of topRow.querySelectorAll('button')) {
      const text = normalizeText(btn.textContent);
      if (
        text.includes('Offline') ||
        text.includes('Online') ||
        text.includes('Pausa') ||
        text.includes('Ausente')
      ) {
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

    if (offlineControl && offlineControl.parentElement !== actionsWrapper) {
      actionsWrapper.appendChild(offlineControl);
    }

    if (sendHsmButton && sendHsmButton.parentElement !== actionsWrapper) {
      actionsWrapper.appendChild(sendHsmButton);
    }

    for (const btn of topRow.querySelectorAll('button')) {
      const text = normalizeText(btn.textContent);
      if (
        text.includes('Enviar HSM') ||
        text.includes('Offline') ||
        text.includes('Online') ||
        text.includes('Pausa') ||
        text.includes('Ausente')
      ) {
        continue;
      }
      btn.classList.add('tm-agent-hidden');
    }

    topRow.querySelectorAll('.w-px').forEach((el) => el.classList.add('tm-agent-hidden'));
  }

  function findTicketHeaderTopRows() {
    return Array.from(document.querySelectorAll('div.px-4.py-3.flex.items-center.justify-between.gap-4'));
  }

  function findTicketInfoRowFromTopRow(topRow) {
    if (!topRow || !topRow.parentElement) return null;

    const siblings = Array.from(topRow.parentElement.children);
    const topIndex = siblings.indexOf(topRow);

    for (let i = topIndex + 1; i < siblings.length; i += 1) {
      const el = siblings[i];
      if (!(el instanceof HTMLElement)) continue;

      if (
        el.classList.contains('px-4') &&
        el.classList.contains('py-2') &&
        el.classList.contains('border-t') &&
        el.classList.contains('border-border') &&
        (
          el.classList.contains('bg-muted/30') ||
          el.className.includes('bg-muted/30')
        )
      ) {
        return el;
      }
    }

    return null;
  }

  function findCreatedSpan(infoRow) {
    if (!infoRow) return null;
    for (const span of infoRow.querySelectorAll('span.flex.items-center.gap-1')) {
      if (normalizeText(span.textContent).includes('Criado há')) return span;
    }
    return null;
  }

  function findTicketInfoTarget(topRow) {
    return topRow ? topRow.querySelector('div.min-w-0.flex-1') : null;
  }

  function findTicketAvatar(topRow) {
    return topRow ? topRow.querySelector('div.w-10.h-10.flex-shrink-0.rounded-full') : null;
  }

  function ensureCreatedHost(targetBlock) {
    let host = targetBlock.querySelector(`[${TICKET_CREATED_HOST_ATTR}="true"]`);
    if (host) return host;

    host = document.createElement('div');
    host.setAttribute(TICKET_CREATED_HOST_ATTR, 'true');
    targetBlock.appendChild(host);
    return host;
  }

  function moveCreatedDateToHeader() {
    for (const topRow of findTicketHeaderTopRows()) {
      const infoRow = findTicketInfoRowFromTopRow(topRow);
      const targetBlock = findTicketInfoTarget(topRow);

      if (!infoRow || !targetBlock) continue;

      targetBlock.setAttribute(TICKET_CONTACT_BLOCK_ATTR, 'true');

      const createdSpan = findCreatedSpan(infoRow);
      if (!createdSpan) continue;

      const host = ensureCreatedHost(targetBlock);

      if (createdSpan.parentElement !== host) {
        createdSpan.setAttribute(TICKET_CREATED_MOVED_ATTR, 'true');
        host.appendChild(createdSpan);
      }

      if (infoRow.getAttribute(TICKET_INFO_ROW_HIDDEN_ATTR) !== 'true') {
        infoRow.setAttribute(TICKET_INFO_ROW_HIDDEN_ATTR, 'true');
      }

      const avatar = findTicketAvatar(topRow);
      if (avatar && avatar.getAttribute(HIDDEN_ATTR) !== 'true') {
        avatar.setAttribute(HIDDEN_ATTR, 'true');
      }

      if (topRow.parentElement) {
        topRow.parentElement.setAttribute(TICKET_HEADER_ATTR, 'true');
      }
    }
  }

  function isTicketListCard(card) {
    if (!card || !(card instanceof HTMLElement)) return false;

    const hasUser = !!card.querySelector('.lucide-user');
    const hasQueueTag = !!Array.from(card.querySelectorAll('div.inline-flex.items-center.rounded-full')).find((el) => {
      const text = normalizeText(el.textContent).toLowerCase();
      return (
        text === 'clínica do sono' ||
        text === 'clinica do sono' ||
        text === 'samec' ||
        text === 'confirmação' ||
        text === 'confirmacao'
      );
    });

    const hasTimeInfo =
      normalizeText(card.textContent).includes('Última atividade:') ||
      !!card.querySelector('.lucide-clock');

    return hasUser && hasQueueTag && hasTimeInfo;
  }

  function getAllTicketListCards() {
    return Array.from(document.querySelectorAll('div.p-2.border.rounded.cursor-pointer')).filter(isTicketListCard);
  }

  function hideProtocolAndPriority(card) {
    const protocolRow = card.querySelector('div.flex.items-center.gap-1');
    if (!protocolRow) return;

    let allHidden = true;

    for (const child of Array.from(protocolRow.children)) {
      if (!(child instanceof HTMLElement)) continue;

      const text = normalizeText(child.textContent);

      if (
        child.matches('span.text-xs') ||
        child.matches('span.font-medium.text-sm.truncate') ||
        text === 'Normal' ||
        text.includes('Normal')
      ) {
        hideElement(child);
      } else {
        allHidden = false;
      }
    }

    if (allHidden) hideElement(protocolRow);
  }

  function hidePhoneInCard(card) {
    for (const icon of card.querySelectorAll('.lucide-phone')) {
      const wrapper = icon.closest('span.flex.items-center.gap-1.text-xs.text-muted-foreground');
      if (wrapper) hideElement(wrapper);
    }
  }

  function hideStatusTags(card) {
    for (const badge of card.querySelectorAll('span.inline-flex, div.inline-flex')) {
      if (!(badge instanceof HTMLElement)) continue;
      const text = normalizeText(badge.textContent);
      if (text === 'Contato' || text === 'Em Atendimento' || text === 'Normal') {
        hideElement(badge);
      }
    }
  }

  function cleanTicketListCards() {
    for (const card of getAllTicketListCards()) {
      hideProtocolAndPriority(card);
      hidePhoneInCard(card);
      hideStatusTags(card);
    }
  }

  function uppercaseTicketHeaderNames() {
    for (const nameEl of document.querySelectorAll('div.px-4.py-3.flex.items-center.justify-between.gap-4 h2.font-semibold.text-card-foreground.truncate')) {
      markUppercase(nameEl);
    }
  }

  function uppercaseTicketListCardNames() {
    for (const card of getAllTicketListCards()) {
      for (const nameEl of card.querySelectorAll('span.flex.items-center.gap-1.text-xs.text-card-foreground > span.font-medium')) {
        markUppercase(nameEl);
      }
    }
  }

  function applyUppercaseToCustomerNames() {
    uppercaseTicketHeaderNames();
    uppercaseTicketListCardNames();
  }

  function normalizeAttendanceDataPhones() {
    for (const card of document.querySelectorAll('div.rounded-xl.bg-card.border.border-border, div.rounded-lg.bg-card.border.border-border')) {
      const title = card.querySelector('h3');
      if (!title || normalizeText(title.textContent) !== 'Dados do Atendimento') continue;

      let phoneLabelFound = false;

      for (const span of card.querySelectorAll('span')) {
        const text = normalizeText(span.textContent);

        if (text === 'Telefone') {
          phoneLabelFound = true;
          continue;
        }

        if (!phoneLabelFound) continue;

        if (
          span.matches('span.text-sm.text-card-foreground.break-words.min-w-0') &&
          /^\d{12,14}$/.test(text)
        ) {
          const normalized = removeCountryCode55(text);
          if (text !== normalized) span.textContent = normalized;
          span.setAttribute(PHONE_NORMALIZED_ATTR, 'true');
          break;
        }
      }
    }
  }

  function findAttendanceDataCards() {
    const result = [];
    for (const card of document.querySelectorAll('div.rounded-xl.bg-card.border.border-border, div.rounded-lg.bg-card.border.border-border')) {
      const title = card.querySelector('h3');
      if (title && normalizeText(title.textContent) === 'Dados do Atendimento') {
        result.push(card);
      }
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
    toast._tmHideTimer = setTimeout(() => {
      toast.removeAttribute(COPY_TOAST_VISIBLE_ATTR);
    }, 1300);
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

      if (await copyTextToClipboard(text)) {
        showCopyToast(card);
      }
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
        ['Telefone', 'telefone']
      ]) {
        const valueEl = findValueSpanByLabel(card, labelText);
        if (valueEl) bindCopyOnClick(valueEl, card, fieldName);
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

  function applyDynamicAdjustments() {
    hideCardByExactTitle('Informações do Cliente');
    hideCardByExactTitle('Resumo do Ticket');
    applyDateToMessages();
    reorganizeAgentArea();
    moveCreatedDateToHeader();
    cleanTicketListCards();
    applyUppercaseToCustomerNames();
    normalizeAttendanceDataPhones();
    enableCopyOnAttendanceData();
    styleQueueTagsInTicketCards();
  }

  function reapplyAll() {
    applyBootCSS();
    applyCSS();
    applyDynamicAdjustments();
  }

  let rafScheduled = false;
  let timeoutScheduled = null;
  let scheduledPasses = [];
  let lastApplyTs = 0;

  function clearScheduledPasses() {
    for (const id of scheduledPasses) clearTimeout(id);
    scheduledPasses = [];
  }

  function runApply(reason = 'unknown') {
    rafScheduled = false;
    lastApplyTs = Date.now();
    reapplyAll();
  }

  function scheduleApply(reason = 'unknown', mode = 'normal') {
    const now = Date.now();
    const tooSoon = now - lastApplyTs < 12;

    if (mode === 'instant' && !tooSoon) {
      reapplyAll();
      lastApplyTs = Date.now();
      return;
    }

    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(() => runApply(reason));
    }

    if (timeoutScheduled) clearTimeout(timeoutScheduled);
    timeoutScheduled = setTimeout(() => {
      timeoutScheduled = null;
      reapplyAll();
      lastApplyTs = Date.now();
    }, mode === 'instant' ? 0 : 60);
  }

  function scheduleReapplyPasses(reason = 'passes') {
    clearScheduledPasses();

    const delays = [0, 80, 220, 500, 1000];
    for (const delay of delays) {
      scheduledPasses.push(setTimeout(() => {
        scheduleApply(`${reason}:${delay}`, delay === 0 ? 'instant' : 'normal');
      }, delay));
    }
  }

  function collapseSidebar() {
    const btn = document.querySelector('button[aria-label="Fechar menu"]');
    if (btn) {
      btn.click();
      log('sidebar recolhida');
      return;
    }

    if (document.querySelector('button[aria-label="Abrir menu"]')) return;

    collapseSidebar._attempts = (collapseSidebar._attempts || 0) + 1;
    if (collapseSidebar._attempts < MAX_SIDEBAR_ATTEMPTS) {
      setTimeout(collapseSidebar, 300);
    }
  }

  function mutationLooksRelevant(mutation) {
    if (!mutation) return false;

    if (mutation.type === 'childList') {
      if (mutation.addedNodes && mutation.addedNodes.length) return true;
      if (mutation.removedNodes && mutation.removedNodes.length) return true;
    }

    if (mutation.type === 'attributes') {
      const target = mutation.target;
      if (!(target instanceof HTMLElement)) return false;

      const attr = mutation.attributeName || '';
      if (
        attr === 'class' ||
        attr === 'style' ||
        attr === 'hidden' ||
        attr === 'aria-selected' ||
        attr === 'data-state' ||
        attr === 'aria-expanded'
      ) {
        return true;
      }
    }

    return false;
  }

  let observer = null;

  function startObserver() {
    const target = document.getElementById('app') || document.querySelector('[data-v-app]') || document.body;
    if (!target) return;

    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      let relevant = false;

      for (const mutation of mutations) {
        if (!mutationLooksRelevant(mutation)) continue;

        if (mutation.type === 'childList') {
          const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
          for (const node of nodes) {
            if (!(node instanceof HTMLElement)) {
              relevant = true;
              break;
            }

            const text = normalizeText(node.textContent);
            if (
              node.matches?.('div, span, button, h2, h3, a') ||
              text.includes('Área do Agente') ||
              text.includes('Dados do Atendimento') ||
              text.includes('Criado há') ||
              text.includes('Última atividade:') ||
              TAB_TEXTS.some((tab) => text.includes(tab))
            ) {
              relevant = true;
              break;
            }
          }
        } else {
          relevant = true;
        }

        if (relevant) break;
      }

      if (relevant) {
        scheduleApply('observer');
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-selected', 'data-state', 'aria-expanded']
    });
  }

  function handlePotentialTabInteraction(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const clickable = target.closest('button, [role="tab"], [role="button"], a, div');
    if (!(clickable instanceof HTMLElement)) return;

    const text = normalizeText(clickable.textContent);
    if (!text) return;

    if (TAB_TEXTS.some((tab) => text.includes(tab))) {
      scheduleApply('tab-interaction', 'instant');
      scheduleReapplyPasses('tab-interaction');
    }
  }

  function hookNavigation() {
    if (window.__tmEffinityHistoryHooked) return;
    window.__tmEffinityHistoryHooked = true;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      scheduleApply('pushState', 'instant');
      scheduleReapplyPasses('pushState');
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      scheduleApply('replaceState', 'instant');
      scheduleReapplyPasses('replaceState');
      return result;
    };

    window.addEventListener('popstate', () => {
      scheduleApply('popstate', 'instant');
      scheduleReapplyPasses('popstate');
    });

    window.addEventListener('hashchange', () => {
      scheduleApply('hashchange', 'instant');
      scheduleReapplyPasses('hashchange');
    });
  }

  function bindGlobalListeners() {
    document.addEventListener('pointerdown', handlePotentialTabInteraction, true);
    document.addEventListener('click', handlePotentialTabInteraction, true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        scheduleApply('visibilitychange', 'instant');
        scheduleReapplyPasses('visibilitychange');
      }
    });

    window.addEventListener('focus', () => {
      scheduleApply('focus', 'instant');
    });

    window.addEventListener('load', () => {
      scheduleApply('load', 'instant');
      scheduleReapplyPasses('load');
    });

    window.addEventListener('pageshow', () => {
      scheduleApply('pageshow', 'instant');
      scheduleReapplyPasses('pageshow');
    });
  }

  function init() {
    reapplyAll();
    scheduleReapplyPasses('init');
    log(`iniciado v${SCRIPT_VERSION} em ${getCurrentDateFormatted()}`);
  }

  function boot() {
    applyBootCSS();
    applyCSS();
    hookNavigation();
    bindGlobalListeners();
    init();
    startObserver();
    setTimeout(collapseSidebar, 800);
  }

  applyBootCSS();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
