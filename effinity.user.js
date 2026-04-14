// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  envenenado
// @author       raik
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_NAME    = 'TM effinity';
  const SCRIPT_VERSION = '4.0';

  // ── Atributos data-* ──────────────────────────────────────────────────────
  const STYLE_GUARDIAN_ID   = 'tm-effinity-guardian';   // CSS que nunca sai do DOM
  const STYLE_DYNAMIC_ID    = 'tm-effinity-dynamic';    // CSS que usa data-* attributes
  const HIDDEN_ATTR                = 'data-tm-effinity-hidden';
  const DATE_APPLIED_ATTR          = 'data-tm-date-applied';
  const AGENT_AREA_ATTR            = 'data-tm-agent-area';
  const AGENT_TOP_ATTR             = 'data-tm-agent-top-row';
  const AGENT_BOTTOM_ATTR          = 'data-tm-agent-bottom-row';
  const AGENT_ACTIONS_ATTR         = 'data-tm-agent-actions-row';
  const TICKET_HEADER_ATTR         = 'data-tm-ticket-header';
  const TICKET_INFO_ROW_HIDDEN_ATTR= 'data-tm-ticket-info-row-hidden';
  const TICKET_CREATED_HOST_ATTR   = 'data-tm-ticket-created-host';
  const TICKET_CREATED_MOVED_ATTR  = 'data-tm-ticket-created-moved';
  const TICKET_CONTACT_BLOCK_ATTR  = 'data-tm-ticket-contact-block';
  const UPPERCASE_NAME_ATTR        = 'data-tm-uppercase-name';
  const PHONE_NORMALIZED_ATTR      = 'data-tm-phone-normalized';
  const COPY_CARD_ATTR             = 'data-tm-copy-card';
  const COPY_VALUE_ATTR            = 'data-tm-copy-value';
  const COPY_TOAST_ATTR            = 'data-tm-copy-toast';
  const COPY_TOAST_VISIBLE_ATTR    = 'data-tm-copy-toast-visible';
  const QUEUE_TAG_ATTR             = 'data-tm-queue-tag';
  const QUEUE_TAG_TYPE_ATTR        = 'data-tm-queue-type';

  const MAX_SIDEBAR_ATTEMPTS = 10;
  const COPY_ICON_URL = 'https://i.imgur.com/0SJagfY.png';

  // ══════════════════════════════════════════════════════════════════════════
  // CSS GUARDIÃO — injetado em document-start, NUNCA é removido ou substituído
  // Cobre todos os seletores que causam flicker antes do JS processar o DOM.
  // Não usa atributos data-* pois estes ainda não foram aplicados.
  // ══════════════════════════════════════════════════════════════════════════
  const CSS_GUARDIAN = `
    /* ── Header global ──────────────────────────────────────────────────── */
    header.glass.sticky.top-0.z-50 {
      display: none !important;
    }

    /* ── Título "Gestão de Tickets / Tempo Real" ─────────────────────────── */
    .flex.flex-col.space-y-1\\.5.pb-3:has(.lucide-clock) {
      display: none !important;
    }

    /* ── Botão "Meta" ────────────────────────────────────────────────────── */
    button:has(.lucide-database) {
      display: none !important;
    }

    /* ── Cards da fila: elementos sempre ocultos ─────────────────────────── */

    /* Emoji de status (✅ 🔵) */
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

    /* Badge "Normal" (lucide-minus) */
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex:has(.lucide-minus) {
      display: none !important;
    }

    /* Badge "Novo" (h-4) */
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex.h-4 {
      display: none !important;
    }

    /* Telefone (lucide-phone) */
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

    /* Badge "No prazo" (lucide-check-circle2) */
    div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:has(.lucide-check-circle2) {
      display: none !important;
    }

    /* Badge "Contato" — tag azul no rodapé */
    div.p-2.border.rounded.cursor-pointer
      span.inline-flex.items-center.gap-1.rounded-full.px-1\\.5.py-0\\.5.text-\\[10px\\].border.bg-blue-50 {
      display: none !important;
    }
  `;

  // ══════════════════════════════════════════════════════════════════════════
  // CSS DINÂMICO — depende de atributos data-* aplicados pelo JS
  // ══════════════════════════════════════════════════════════════════════════
  const CSS_DYNAMIC = `
    /* ── Layout geral ────────────────────────────────────────────────────── */
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

    /* ── Elementos ocultos via JS ────────────────────────────────────────── */
    [${HIDDEN_ATTR}="true"] {
      display: none !important;
    }

    /* ── Uppercase em nomes ──────────────────────────────────────────────── */
    [${UPPERCASE_NAME_ATTR}="true"] {
      text-transform: uppercase !important;
    }

    /* ── Área do Agente ──────────────────────────────────────────────────── */
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

    /* ── Ticket header ───────────────────────────────────────────────────── */
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

    /* ── Copiar ao clicar ────────────────────────────────────────────────── */
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

    /* ── Tags de fila ────────────────────────────────────────────────────── */
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

  // ══════════════════════════════════════════════════════════════════════════
  // INJEÇÃO DE CSS
  // O guardião é injetado imediatamente (document-start), antes de qualquer
  // renderização. O dinâmico é separado para não invalidar o guardião.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Injeta o CSS guardião o mais cedo possível.
   * Usa document.head se disponível, senão documentElement.
   * Nunca substitui — só cria uma vez.
   */
  function injectGuardianCSS() {
    if (document.getElementById(STYLE_GUARDIAN_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_GUARDIAN_ID;
    style.textContent = CSS_GUARDIAN;
    // Em document-start o <head> pode não existir ainda
    (document.head || document.documentElement).appendChild(style);
  }

  /**
   * Injeta/atualiza o CSS dinâmico (data-* attributes).
   * Separado do guardião para não re-parsear o guardião a cada ciclo.
   */
  function applyDynamicCSS() {
    let style = document.getElementById(STYLE_DYNAMIC_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_DYNAMIC_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    if (style.textContent !== CSS_DYNAMIC) {
      style.textContent = CSS_DYNAMIC;
    }
  }

  // Injeta o guardião imediatamente — ainda em document-start
  injectGuardianCSS();

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ══════════════════════════════════════════════════════════════════════════

  function log(...args) {
    console.log(`[${SCRIPT_NAME}]`, ...args);
  }

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
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
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      } catch (err) {
        console.error(`[${SCRIPT_NAME}] falha ao copiar`, err);
        return false;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CARDS DA FILA — ocultar elementos residuais (fallback JS)
  // CSS já resolve a maior parte; JS cobre edge cases dinâmicos
  // ══════════════════════════════════════════════════════════════════════════

  function isTicketListCard(card) {
    if (!card || !(card instanceof HTMLElement)) return false;
    const hasUser = !!card.querySelector('.lucide-user');
    const hasQueueTag = !!Array.from(card.querySelectorAll('div.inline-flex.items-center.rounded-full')).find(el => {
      const text = normalizeText(el.textContent).toLowerCase();
      return text === 'clínica do sono' || text === 'clinica do sono' || text === 'samec' || text === 'confirmação' || text === 'confirmacao';
    });
    const hasTimeInfo = normalizeText(card.textContent).includes('Última atividade:') || !!card.querySelector('.lucide-clock');
    return hasUser && hasQueueTag && hasTimeInfo;
  }

  function getAllTicketListCards() {
    return Array.from(document.querySelectorAll('div.p-2.border.rounded.cursor-pointer')).filter(isTicketListCard);
  }

  function hideProtocolAndPriority(card) {
    const protocolRow = card.querySelector('div.flex.items-center.gap-1');
    if (!protocolRow) return;
    for (const child of Array.from(protocolRow.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const text = normalizeText(child.textContent);
      if (child.matches('span.text-xs') || child.matches('span.font-medium.text-sm.truncate') || text === 'Normal' || text.includes('Normal')) {
        hideElement(child);
      }
    }
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
      if (text === 'Contato' || text === 'Em Atendimento' || text === 'Normal') hideElement(badge);
    }
  }

  function cleanTicketListCards() {
    for (const card of getAllTicketListCards()) {
      hideProtocolAndPriority(card);
      hidePhoneInCard(card);
      hideStatusTags(card);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TAGS DE FILA — cores customizadas
  // ══════════════════════════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════════════════════════
  // UPPERCASE EM NOMES
  // ══════════════════════════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════════════════════════
  // CARDS "Informações do Cliente" e "Resumo do Ticket"
  // ══════════════════════════════════════════════════════════════════════════

  function findCardContainerFromTitle(titleEl) {
    let node = titleEl;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('rounded-xl') && node.classList.contains('bg-card')) return node;
      node = node.parentElement;
    }
    return null;
  }

  function hideCardByExactTitle(titleText) {
    for (const title of document.querySelectorAll('h3')) {
      if (normalizeText(title.textContent) !== titleText) continue;
      const card = findCardContainerFromTitle(title);
      if (card) hideElement(card);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DATAS NAS MENSAGENS
  // ══════════════════════════════════════════════════════════════════════════

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
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${date.getFullYear()}`;
    }

    function timeToMinutes(t) {
      const match = t.match(/^(\d{2}):(\d{2})$/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : null;
    }

    let activeDate = null;
    let lastMinutes = null;

    for (const child of Array.from(chatContainer.children)) {
      if (!(child instanceof HTMLElement)) continue;

      const daySep = child.querySelector('span.text-xs.text-muted-foreground.bg-muted\\/50.px-3.py-1.rounded-full');
      if (daySep) {
        const parsed = parseDaySeparator(daySep.textContent);
        if (parsed) { activeDate = parsed; lastMinutes = null; }
        continue;
      }

      const timeSpan = child.querySelector('.flex.items-center.gap-1\\.5.mt-1\\.5 span.text-\\[10px\\].opacity-60');
      if (!timeSpan || timeSpan.getAttribute(DATE_APPLIED_ATTR) === 'true') continue;

      const timeMatch = normalizeText(timeSpan.textContent).match(/(\d{2}:\d{2})$/);
      if (!timeMatch) continue;
      const timeText = timeMatch[1];
      const minutes = timeToMinutes(timeText);
      if (minutes === null) continue;

      if (!activeDate) { activeDate = new Date(); activeDate.setHours(0,0,0,0); }
      if (lastMinutes !== null && minutes < lastMinutes) {
        activeDate = new Date(activeDate);
        activeDate.setDate(activeDate.getDate() + 1);
      }

      timeSpan.textContent = `${formatDate(activeDate)} ${timeText}`;
      timeSpan.setAttribute(DATE_APPLIED_ATTR, 'true');
      lastMinutes = minutes;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÁREA DO AGENTE — reorganização de layout
  // ══════════════════════════════════════════════════════════════════════════

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
      if (text.includes('Área do Agente') && (text.includes('Offline') || text.includes('Online')) && text.includes('Enviar HSM')) return child;
    }
    return null;
  }

  function findBottomRow(agentContainer, topRow) {
    if (!agentContainer) return null;
    for (const child of Array.from(agentContainer.children)) {
      if (child === topRow) continue;
      if (!child.matches('div')) continue;
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
    for (const node of Array.from(bottomRow.childNodes)) {
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
    topRow.querySelectorAll('.w-px').forEach(el => el.classList.add('tm-agent-hidden'));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TICKET HEADER — mover "Criado há...", ocultar avatar e info row
  // ══════════════════════════════════════════════════════════════════════════

  function findTicketHeaderTopRows() {
    return Array.from(document.querySelectorAll('div.px-4.py-3.flex.items-center.justify-between.gap-4'));
  }

  function findTicketInfoRowFromTopRow(topRow) {
    if (!topRow || !topRow.parentElement) return null;
    const siblings = Array.from(topRow.parentElement.children);
    const topIndex = siblings.indexOf(topRow);
    for (let i = topIndex + 1; i < siblings.length; i++) {
      const el = siblings[i];
      if (!(el instanceof HTMLElement)) continue;
      if (el.classList.contains('px-4') && el.classList.contains('py-2') && el.classList.contains('border-t') && el.classList.contains('border-border') && el.classList.contains('bg-muted/30')) return el;
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
      if (infoRow.getAttribute(TICKET_INFO_ROW_HIDDEN_ATTR) !== 'true') infoRow.setAttribute(TICKET_INFO_ROW_HIDDEN_ATTR, 'true');
      const avatar = findTicketAvatar(topRow);
      if (avatar && avatar.getAttribute(HIDDEN_ATTR) !== 'true') avatar.setAttribute(HIDDEN_ATTR, 'true');
      if (topRow.parentElement) topRow.parentElement.setAttribute(TICKET_HEADER_ATTR, 'true');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DADOS DO ATENDIMENTO — normalizar telefone + copiar ao clicar
  // ══════════════════════════════════════════════════════════════════════════

  function normalizeAttendanceDataPhones() {
    for (const card of document.querySelectorAll('div.rounded-xl.bg-card.border.border-border, div.rounded-lg.bg-card.border.border-border')) {
      const title = card.querySelector('h3');
      if (!title || normalizeText(title.textContent) !== 'Dados do Atendimento') continue;
      let phoneLabelFound = false;
      for (const span of card.querySelectorAll('span')) {
        const text = normalizeText(span.textContent);
        if (text === 'Telefone') { phoneLabelFound = true; continue; }
        if (!phoneLabelFound) continue;
        if (span.matches('span.text-sm.text-card-foreground.break-words.min-w-0') && /^\d{12,14}$/.test(text)) {
          const normalized = removeCountryCode55(text);
          if (text !== normalized) span.textContent = normalized;
          span.setAttribute(PHONE_NORMALIZED_ATTR, 'true');
          break;
        }
      }
    }
  }

  function findAttendanceDataCards() {
    return Array.from(document.querySelectorAll('div.rounded-xl.bg-card.border.border-border, div.rounded-lg.bg-card.border.border-border'))
      .filter(card => {
        const title = card.querySelector('h3');
        return title && normalizeText(title.textContent) === 'Dados do Atendimento';
      });
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
    valueEl.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = normalizeText(valueEl.textContent);
      if (!text) return;
      if (await copyTextToClipboard(text)) showCopyToast(card);
    });
  }

  function enableCopyOnAttendanceData() {
    for (const card of findAttendanceDataCards()) {
      card.setAttribute(COPY_CARD_ATTR, 'true');
      ensureCopyToast(card);
      for (const [label, field] of [['Nome','nome'],['Nascimento','nascimento'],['CPF','cpf'],['Telefone','telefone']]) {
        bindCopyOnClick(findValueSpanByLabel(card, label), card, field);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SIDEBAR — recolher automaticamente
  // ══════════════════════════════════════════════════════════════════════════

  let sidebarAttempts = 0;
  function collapseSidebar() {
    const btn = document.querySelector('button[aria-label="Fechar menu"]');
    if (btn) { btn.click(); log('sidebar recolhida'); return; }
    if (document.querySelector('button[aria-label="Abrir menu"]')) return;
    sidebarAttempts += 1;
    if (sidebarAttempts < MAX_SIDEBAR_ATTEMPTS) setTimeout(collapseSidebar, 300);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CICLO PRINCIPAL — agrupamento de todas as funções de ajuste
  // ══════════════════════════════════════════════════════════════════════════

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
    applyDynamicCSS();        // garante CSS dinâmico no DOM (reaplicado se sumiu)
    applyDynamicAdjustments();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OBSERVER OTIMIZADO — throttle + detecção de troca de aba
  //
  // Estratégia:
  //   • Throttle de 80ms (era debounce 200ms) — reage mais rápido
  //   • Filtra mutações irrelevantes antes de executar reapplyAll
  //   • Detecta troca de aba (Atribuído ↔ Atendimento) para aplicação imediata
  // ══════════════════════════════════════════════════════════════════════════

  let throttleTimer = null;
  let pendingImmediate = false;

  /**
   * Verifica se alguma mutação contém um nó de card de ticket
   * (indicativo de troca de aba ou nova renderização de lista).
   * Se sim, dispara reapplyAll imediatamente sem esperar o throttle.
   */
  function mutationContainsTicketCards(mutations) {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        // Novo card de ticket na lista
        if (node.matches('div.p-2.border.rounded.cursor-pointer')) return true;
        if (node.querySelector('div.p-2.border.rounded.cursor-pointer')) return true;
        // Container que envolve a lista de tickets (troca de aba)
        if (node.querySelector('[role="tabpanel"]') || node.matches('[role="tabpanel"]')) return true;
      }
    }
    return false;
  }

  function handleMutations(mutations) {
    // Se detectou mudança relevante (troca de aba / novos cards), aplica imediatamente
    if (!pendingImmediate && mutationContainsTicketCards(mutations)) {
      pendingImmediate = true;
      // requestAnimationFrame garante que o DOM já foi pintado pelo browser
      requestAnimationFrame(() => {
        pendingImmediate = false;
        reapplyAll();
      });
      return; // evita enfileirar o throttle também
    }

    // Para todas as outras mutações: throttle de 80ms
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      reapplyAll();
    }, 80);
  }

  let observer = null;
  function startObserver() {
    const target = document.getElementById('app') || document.querySelector('[data-v-app]') || document.body;
    if (!target) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(handleMutations);
    observer.observe(target, { childList: true, subtree: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSES ESCALONADOS — cobre elementos que aparecem de forma assíncrona
  // Mantidos para robustez, mas com delays menores agora que o observer é mais ágil
  // ══════════════════════════════════════════════════════════════════════════

  let scheduledPasses = [];
  function scheduleReapplyPasses() {
    scheduledPasses.forEach(clearTimeout);
    scheduledPasses = [];
    for (const delay of [100, 300, 600, 1200, 2200]) {
      scheduledPasses.push(setTimeout(reapplyAll, delay));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BOOT
  // ══════════════════════════════════════════════════════════════════════════

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
