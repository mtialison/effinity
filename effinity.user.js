// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      4.8
// @description  Layout otimizado e funções selecionadas para o painel WhatsApp Agent
// @author       Alison + ChatGPT
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  /* ========================================================================
   * CONFIGURAÇÕES GERAIS
   * ====================================================================== */
  const SCRIPT_NAME = 'TM effinity';
  const SCRIPT_VERSION = '4.8';

  const STYLE_ID = 'tm-effinity-style';
  const HIDDEN_ATTR = 'data-tm-effinity-hidden';
  const DATE_APPLIED_ATTR = 'data-tm-date-applied';
  const UPPERCASE_NAME_ATTR = 'data-tm-uppercase-name';
  const PHONE_FORMATTED_ATTR = 'data-tm-phone-formatted';

  const AGENT_AREA_ATTR = 'data-tm-agent-area';
  const AGENT_TOP_ATTR = 'data-tm-agent-top-row';
  const AGENT_BOTTOM_ATTR = 'data-tm-agent-bottom-row';
  const AGENT_ACTIONS_ATTR = 'data-tm-agent-actions-row';

  const TICKET_HEADER_ATTR = 'data-tm-ticket-header';
  const TICKET_INFO_ROW_HIDDEN_ATTR = 'data-tm-ticket-info-row-hidden';
  const TICKET_CREATED_HOST_ATTR = 'data-tm-ticket-created-host';
  const TICKET_CREATED_MOVED_ATTR = 'data-tm-ticket-created-moved';
  const TICKET_CONTACT_BLOCK_ATTR = 'data-tm-ticket-contact-block';

  const COPY_CARD_ATTR = 'data-tm-copy-card';
  const COPY_VALUE_ATTR = 'data-tm-copy-value';
  const COPY_TOAST_ATTR = 'data-tm-copy-toast';
  const COPY_TOAST_VISIBLE_ATTR = 'data-tm-copy-toast-visible';

  const QUEUE_TAG_ATTR = 'data-tm-queue-tag';
  const QUEUE_TAG_TYPE_ATTR = 'data-tm-queue-type';

  const COPY_ICON_URL = 'https://i.imgur.com/0SJagfY.png';
  const UNREAD_ICON_URL = 'https://i.imgur.com/ZmW0yoP.png';
  const UNREAD_CARD_ATTR = 'data-tm-unread-card';
  const UNREAD_ICON_ATTR = 'data-tm-unread-icon';

  const SIDEBAR_BOOT_STYLE_ID = 'tm-effinity-sidebar-boot-style';
  const SIDEBAR_BOOT_ATTR = 'data-tm-sidebar-booting';
  const SIDEBAR_COLLAPSED_READY_ATTR = 'data-tm-sidebar-collapsed-ready';

  const CARD_BOOT_STYLE_ID = 'tm-effinity-card-boot-style';
  const CARD_BOOT_ATTR = 'data-tm-card-booting';
  const AGENT_BOOT_STYLE_ID = 'tm-effinity-agent-boot-style';
  const AGENT_BOOT_ATTR = 'data-tm-agent-booting';

  /* ========================================================================
   * SEÇÃO: ESTILOS / ELEMENTOS OCULTOS / AJUSTES VISUAIS
   * Mantém: 2, 3, 4, 5, 7, 9, 10+11, 19, 21, 22
   * ====================================================================== */
  const css = `
    /* ── 2. Layout geral ───────────────────────────────────────────────── */
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

    /* ── 3. Ocultar header principal ───────────────────────────────────── */
    header.glass.sticky.top-0.z-50 {
      display: none !important;
    }

    /* ── 4. Ocultar bloco Gestão de Tickets / Tempo Real ───────────────── */
    .flex.flex-col.space-y-1\\.5.pb-3:has(.lucide-clock) {
      display: none !important;
    }

    /* ── 5. Ocultar botão Meta ─────────────────────────────────────────── */
    button:has(.lucide-database) {
      display: none !important;
    }

    /* ── 7. Ocultações dos cards da fila (anti-flicker via CSS) ────────── */
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > span.text-xs:first-child {
      display: none !important;
    }

    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > span.font-medium.text-sm.truncate {
      display: none !important;
    }

    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex:has(.lucide-minus) {
      display: none !important;
    }

    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex.h-4 {
      display: none !important;
    }

    div.p-2.border.rounded.cursor-pointer
      span.flex.items-center.gap-1.text-xs.text-muted-foreground:has(.lucide-phone) {
      display: none !important;
    }

    div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]):has(+ *),
    div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1.mb-1
      > div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]) {
      display: none !important;
    }

    div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:has(.lucide-check-circle2) {
      display: none !important;
    }

    div.p-2.border.rounded.cursor-pointer
      span.inline-flex.items-center.gap-1.rounded-full.px-1\\.5.py-0\\.5.text-\\[10px\\].border.bg-blue-50 {
      display: none !important;
    }

    /* ── Remover bolinha azul do ticket selecionado ───────────────────── */
    div.w-2.h-2.rounded-full.bg-blue-500.flex-shrink-0 {
      display: none !important;
    }

    /* ── Indicador de mensagem não lida no canto do card ──────────────── */
    [${UNREAD_CARD_ATTR}="true"] {
      position: relative !important;
    }

    [${UNREAD_ICON_ATTR}="true"] {
      position: absolute !important;
      right: 8px !important;
      bottom: 8px !important;
      width: 22px !important;
      height: 22px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: none !important;
      user-select: none !important;
      z-index: 3 !important;
    }

    [${UNREAD_ICON_ATTR}="true"] img {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      pointer-events: none !important;
      user-select: none !important;
    }

    /* ── Sistema interno de ocultação ──────────────────────────────────── */
    [${HIDDEN_ATTR}="true"] {
      display: none !important;
    }

    /* ── 9. Uppercase controlado por atributo ──────────────────────────── */
    [${UPPERCASE_NAME_ATTR}="true"] {
      text-transform: uppercase !important;
    }

    /* ── Telefone formatado em Dados do Atendimento ───────────────────── */
    [${PHONE_FORMATTED_ATTR}="true"] {
      white-space: normal !important;
    }

    /* ── 10 + 11. Área do Agente reorganizada e ações enxutas ─────────── */
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

    /* ── Header do ticket: anti-flicker da versão sem script ──────────── */
    div.px-4.py-3.flex.items-center.justify-between.gap-4
      div.w-10.h-10.flex-shrink-0.rounded-full {
      display: none !important;
    }

    div.px-4.py-3.flex.items-center.justify-between.gap-4
      div.min-w-0.flex-1 {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: center !important;
      gap: 2px !important;
      min-width: 0 !important;
    }

    div.px-4.py-3.flex.items-center.justify-between.gap-4
      div.min-w-0.flex-1
      > h2.font-semibold.text-card-foreground.truncate {
      text-transform: uppercase !important;
      margin: 0 !important;
    }

    div.px-4.py-3.flex.items-center.justify-between.gap-4 + div.px-4.py-2.border-t.border-border.bg-muted\/30 {
      display: none !important;
    }

    /* ── Header do ticket: mover "Criado há" e ocultar linha inferior ── */
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

    /* ── 19. Feedback visual de cópia ──────────────────────────────────── */
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

    /* ── 21. Tags de fila com cor por tipo ─────────────────────────────── */
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



  /* ========================================================================
   * SEÇÃO: ANTI-FLICKER INICIAL DOS CARDS DE TICKET
   * Objetivo: ao trocar entre Espera / Atribuído / Atendimento, os elementos
   * ocultados pelo script já nascem invisíveis no primeiro paint.
   * ====================================================================== */
  const cardBootCSS = `
    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > span.text-xs:first-child {
      display: none !important;
    }

    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > span.font-medium.text-sm.truncate {
      display: none !important;
    }

    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex:has(.lucide-minus) {
      display: none !important;
    }

    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1
      > div.inline-flex.h-4 {
      display: none !important;
    }

    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      span.flex.items-center.gap-1.text-xs.text-muted-foreground:has(.lucide-phone) {
      display: none !important;
    }

    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]):has(+ *),
    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      div.flex.items-center.gap-1.mb-1
      > div.inline-flex.items-center.rounded-full:not([data-tm-queue-tag]) {
      display: none !important;
    }

    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      div.inline-flex.items-center.rounded-full:has(.lucide-check-circle2) {
      display: none !important;
    }

    html[${CARD_BOOT_ATTR}="true"] div.p-2.border.rounded.cursor-pointer
      span.inline-flex.items-center.gap-1.rounded-full.px-1\.5.py-0\.5.text-\[10px\].border.bg-blue-50 {
      display: none !important;
    }
  `;


  /* ========================================================================
   * SEÇÃO: SIDEBAR INICIANDO RECOLHIDA
   * Objetivo: a sidebar nasce visualmente recolhida sem remover o modo expandido.
   * ====================================================================== */
  const sidebarBootCSS = `
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) {
      width: 4rem !important;
      min-width: 4rem !important;
      max-width: 4rem !important;
      overflow: hidden !important;
    }

    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) > div:first-child {
      justify-content: center !important;
      padding-left: 0.75rem !important;
      padding-right: 0.75rem !important;
    }

    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) > div:first-child > div {
      display: none !important;
    }

    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) > div:first-child > button {
      margin: 0 auto !important;
    }

    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav h3,
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav span,
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav .lucide-chevron-right,
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav button:not([aria-label]),
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav a > span,
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav button > span {
      display: none !important;
    }

    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav a,
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav button {
      justify-content: center !important;
      padding-left: 0.625rem !important;
      padding-right: 0.625rem !important;
      min-height: 2.5rem !important;
    }

    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav .space-y-3,
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav .space-y-1,
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav .mb-8,
    html[${SIDEBAR_BOOT_ATTR}="true"] aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg:has(button[aria-label="Fechar menu"]) nav .mt-8 {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }
  `;

  const agentBootCSS = `
    html[${AGENT_BOOT_ATTR}="true"] .bg-card.border.border-border.rounded-lg:has(> div):has(> div + div) > div:first-child:has(button):has(.lucide-users),
    html[${AGENT_BOOT_ATTR}="true"] .bg-card.border.border-border.rounded-lg:has(> div):has(> div + div) > div:first-child:has(button):has(.lucide-headphones),
    html[${AGENT_BOOT_ATTR}="true"] .bg-card.border.border-border.rounded-lg:has(> div):has(> div + div) > div:first-child:has(button):has(.lucide-send),
    html[${AGENT_BOOT_ATTR}="true"] .bg-card.border.border-border.rounded-lg:has(> div):has(> div + div) > div:first-child:has(button):has(.lucide-message-square) {
      visibility: hidden !important;
      opacity: 0 !important;
      max-height: 0 !important;
      min-height: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      border: 0 !important;
      pointer-events: none !important;
    }
  `;


  /* ========================================================================
   * SEÇÃO: UTILITÁRIOS
   * ====================================================================== */
  function log(...args) {
    console.log(`[${SCRIPT_NAME}]`, ...args);
  }

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function applyCSS() {
    ensureStyleTag(STYLE_ID, css);
  }



  function ensureStyleTag(id, cssText) {
    const parent = document.head || document.documentElement;
    if (!parent) return null;

    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      parent.appendChild(style);
    }

    if (style.textContent !== cssText) {
      style.textContent = cssText;
    }

    return style;
  }

  function startCardBootMask() {
    document.documentElement.setAttribute(CARD_BOOT_ATTR, 'true');
    ensureStyleTag(CARD_BOOT_STYLE_ID, cardBootCSS);
  }

  function stopCardBootMask() {
    document.documentElement.removeAttribute(CARD_BOOT_ATTR);
    document.getElementById(CARD_BOOT_STYLE_ID)?.remove();
  }

  function startSidebarBootMask() {
    document.documentElement.setAttribute(SIDEBAR_BOOT_ATTR, 'true');
    ensureStyleTag(SIDEBAR_BOOT_STYLE_ID, sidebarBootCSS);
  }

  function stopSidebarBootMask() {
    document.documentElement.removeAttribute(SIDEBAR_BOOT_ATTR);
    document.documentElement.setAttribute(SIDEBAR_COLLAPSED_READY_ATTR, 'true');
    document.getElementById(SIDEBAR_BOOT_STYLE_ID)?.remove();
  }

  function startAgentBootMask() {
    document.documentElement.setAttribute(AGENT_BOOT_ATTR, 'true');
    ensureStyleTag(AGENT_BOOT_STYLE_ID, agentBootCSS);
  }

  function stopAgentBootMask() {
    document.documentElement.removeAttribute(AGENT_BOOT_ATTR);
    document.getElementById(AGENT_BOOT_STYLE_ID)?.remove();
  }


  function scheduleAgentBootFailsafe() {
    window.setTimeout(() => {
      if (!agentBootDone) {
        stopAgentBootMask();
      }
    }, 4000);
  }

  function getSidebarElement() {
    return document.querySelector('aside.fixed.left-0.top-0.h-full.transition-all.duration-300.z-40.border-r.shadow-lg');
  }

  function isSidebarCollapsed(sidebar) {
    if (!sidebar) return false;
    const openButton = sidebar.querySelector('button[aria-label="Abrir menu"]');
    return sidebar.classList.contains('w-16') || !!openButton;
  }

  function isSidebarExpanded(sidebar) {
    if (!sidebar) return false;
    const closeButton = sidebar.querySelector('button[aria-label="Fechar menu"]');
    return sidebar.classList.contains('w-64') || !!closeButton;
  }

  let sidebarBootDone = false;
  let sidebarBootFrame = 0;
  function ensureSidebarStartsCollapsed() {
    if (sidebarBootDone) return;

    const sidebar = getSidebarElement();
    if (!sidebar) {
      sidebarBootFrame = window.requestAnimationFrame(ensureSidebarStartsCollapsed);
      return;
    }

    if (isSidebarCollapsed(sidebar)) {
      sidebarBootDone = true;
      stopSidebarBootMask();
      return;
    }

    if (isSidebarExpanded(sidebar)) {
      const closeButton = sidebar.querySelector('button[aria-label="Fechar menu"]');
      if (closeButton) {
        closeButton.click();
      }
    }

    sidebarBootFrame = window.requestAnimationFrame(() => {
      const currentSidebar = getSidebarElement();
      if (isSidebarCollapsed(currentSidebar)) {
        sidebarBootDone = true;
        stopSidebarBootMask();
        return;
      }
      ensureSidebarStartsCollapsed();
    });
  }

  let debounceTimer = null;
  function debounce(fn, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
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

  /* ========================================================================
   * SEÇÃO: OCULTAR CARDS INTEIROS POR TÍTULO (22)
   * ====================================================================== */
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

  function hideSelectedCards() {
    hideCardByExactTitle('Informações do Cliente');
    hideCardByExactTitle('Resumo do Ticket');
  }

  /* ========================================================================
   * SEÇÃO: DATA NAS MENSAGENS DO CHAT (23)
   * ====================================================================== */
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

  /* ========================================================================
   * SEÇÃO: ÁREA DO AGENTE (10 + 11 mescladas)
   * Reorganiza e mantém apenas ações relevantes visíveis.
   * ====================================================================== */
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
      if (!child.matches('div')) continue;
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

  function primeAgentAreaBootState() {
    const agentContainer = findAgentAreaContainer();
    if (!agentContainer) return false;

    const topRow = findTopRow(agentContainer);
    const bottomRow = findBottomRow(agentContainer, topRow);
    if (!topRow || !bottomRow) return false;

    agentContainer.setAttribute(AGENT_AREA_ATTR, 'true');
    topRow.setAttribute(AGENT_TOP_ATTR, 'true');
    bottomRow.setAttribute(AGENT_BOTTOM_ATTR, 'true');
    return true;
  }

  let agentBootDone = false;

  function finalizeAgentBootMask() {
    if (agentBootDone) return;
    const agentContainer = findAgentAreaContainer();
    if (!agentContainer) return;
    const topRow = findTopRow(agentContainer);
    const bottomRow = findBottomRow(agentContainer, topRow);
    if (!topRow || !bottomRow) return;
    agentBootDone = true;
    stopAgentBootMask();
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
      if (text.includes('Enviar HSM') || text.includes('Offline') || text.includes('Online')) continue;
      btn.classList.add('tm-agent-hidden');
    }

    topRow.querySelectorAll('.w-px').forEach(el => el.classList.add('tm-agent-hidden'));

    finalizeAgentBootMask();
  }

  /* ========================================================================
   * SEÇÃO: HEADER DO TICKET
   * Oculta a linha inferior e move o campo "Criado há" para baixo do telefone.
   * ====================================================================== */
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
        el.classList.contains('bg-muted/30')
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

  /* ========================================================================
   * SEÇÃO: CARDS DA FILA / TAGS / NOMES
   * Mantém: 7, 15, 21
   * ====================================================================== */
  function isTicketListCard(card) {
    if (!card || !(card instanceof HTMLElement)) return false;

    const hasUser = !!card.querySelector('.lucide-user');
    const hasQueueTag = !!Array.from(card.querySelectorAll('div.inline-flex.items-center.rounded-full')).find(el => {
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

  function uppercaseTicketHeaderNames() {
    for (const nameEl of document.querySelectorAll('div.px-4.py-3.flex.items-center.justify-between.gap-4 h2.font-semibold.text-card-foreground.truncate')) {
      markUppercase(nameEl);
    }
  }

  function uppercaseTicketListCardNames() {
    for (const card of getAllTicketListCards()) {
      const selectors = [
        'span.flex.items-center.gap-1.text-xs.text-card-foreground > span.font-medium',
        'h4.font-medium',
        'span.font-medium.text-sm',
        'div.font-medium.text-sm',
        'div.text-sm.font-medium',
        'span.text-sm.font-medium'
      ];

      const found = new Set();
      for (const selector of selectors) {
        for (const nameEl of card.querySelectorAll(selector)) {
          found.add(nameEl);
        }
      }

      for (const nameEl of found) {
        const text = normalizeText(nameEl.textContent);
        if (!text) continue;
        if (text.includes('Última atividade:')) continue;
        if (text.toLowerCase() === 'clínica do sono' || text.toLowerCase() === 'clinica do sono') continue;
        if (text.toLowerCase() === 'samec' || text.toLowerCase() === 'confirmação' || text.toLowerCase() === 'confirmacao') continue;
        markUppercase(nameEl);
      }
    }
  }

  function applyUppercaseToCustomerNames() {
    uppercaseTicketHeaderNames();
    uppercaseTicketListCardNames();
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



  function findUnreadBadgeElement(card) {
    const candidates = card.querySelectorAll('span, div');
    for (const el of candidates) {
      if (!(el instanceof HTMLElement)) continue;
      const text = normalizeText(el.textContent).toLowerCase();
      if (text === 'não lida' || text === 'nao lida' || text === 'não lido' || text === 'nao lido') {
        return el;
      }
    }
    return null;
  }

  function findUnreadBadgeWrapper(el, card) {
    let node = el;
    while (node && node !== card) {
      if (!(node instanceof HTMLElement)) break;
      if (
        node.classList.contains('inline-flex') ||
        node.classList.contains('rounded-full') ||
        node.classList.contains('border')
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return el;
  }

  function ensureUnreadIcon(card) {
    let icon = card.querySelector(`[${UNREAD_ICON_ATTR}="true"]`);
    if (icon) return icon;

    icon = document.createElement('div');
    icon.setAttribute(UNREAD_ICON_ATTR, 'true');

    const img = document.createElement('img');
    img.src = UNREAD_ICON_URL;
    img.alt = 'Mensagem não lida';
    img.draggable = false;

    icon.appendChild(img);
    card.appendChild(icon);
    return icon;
  }

  function removeUnreadIcon(card) {
    card.removeAttribute(UNREAD_CARD_ATTR);
    card.querySelector(`[${UNREAD_ICON_ATTR}="true"]`)?.remove();
  }

  function applyUnreadMessageIndicators() {
    for (const card of getAllTicketListCards()) {
      const unreadBadge = findUnreadBadgeElement(card);

      if (!unreadBadge) {
        removeUnreadIcon(card);
        continue;
      }

      const wrapper = findUnreadBadgeWrapper(unreadBadge, card);
      hideElement(wrapper instanceof HTMLElement ? wrapper : unreadBadge);

      card.setAttribute(UNREAD_CARD_ATTR, 'true');
      ensureUnreadIcon(card);
    }
  }


  /* ========================================================================
   * SEÇÃO: FORMATAÇÃO DO TELEFONE EM DADOS DO ATENDIMENTO
   * Remove o 55 e exibe no padrão (DD) 99999-9999 sem flicker.
   * ====================================================================== */
  function stripCountryCode55(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length > 11) {
      return digits.slice(2);
    }
    return digits;
  }

  function formatBrazilPhoneDisplay(value) {
    const digits = stripCountryCode55(value);

    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return digits || String(value || '');
  }

  function formatAttendanceDataPhones() {
    for (const card of findAttendanceDataCards()) {
      const phoneValueEl = findValueSpanByLabel(card, 'Telefone');
      if (!phoneValueEl) continue;

      const currentText = normalizeText(phoneValueEl.textContent);
      if (!currentText) continue;

      const formatted = formatBrazilPhoneDisplay(currentText);
      if (formatted && currentText !== formatted) {
        phoneValueEl.textContent = formatted;
      }

      phoneValueEl.setAttribute(PHONE_FORMATTED_ATTR, 'true');
    }
  }

  function formatBrazilCpfDisplay(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length !== 11) return String(value || '');
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  function formatAttendanceDataCpfs() {
    for (const card of findAttendanceDataCards()) {
      const cpfValueEl = findValueSpanByLabel(card, 'CPF');
      if (!cpfValueEl) continue;

      const currentText = normalizeText(cpfValueEl.textContent);
      if (!currentText) continue;

      const formatted = formatBrazilCpfDisplay(currentText);
      if (formatted && currentText !== formatted) {
        cpfValueEl.textContent = formatted;
      }
    }
  }

  function calculateAgeFromBirthDate(day, month, year) {
    const birthDate = new Date(year, month - 1, day);
    if (
      Number.isNaN(birthDate.getTime()) ||
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day
    ) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - year;
    const hasHadBirthdayThisYear =
      today.getMonth() > (month - 1) ||
      (today.getMonth() === (month - 1) && today.getDate() >= day);

    if (!hasHadBirthdayThisYear) age -= 1;
    return age >= 0 ? age : null;
  }

  function formatBirthDateWithAgeDisplay(value) {
    const textValue = normalizeText(value);
    const match = textValue.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return textValue;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const age = calculateAgeFromBirthDate(day, month, year);
    if (age === null) return textValue;

    const yearsLabel = age === 1 ? 'ano' : 'anos';
    const baseDate = `${match[1]}/${match[2]}/${match[3]}`;
    return `${baseDate} - ${age} ${yearsLabel}`;
  }

  function formatAttendanceDataBirthDates() {
    for (const card of findAttendanceDataCards()) {
      const birthValueEl = findValueSpanByLabel(card, 'Nascimento');
      if (!birthValueEl) continue;

      const currentText = normalizeText(birthValueEl.textContent);
      if (!currentText) continue;

      const formatted = formatBirthDateWithAgeDisplay(currentText);
      if (formatted && currentText !== formatted) {
        birthValueEl.textContent = formatted;
      }
    }
  }

  /* ========================================================================
   * SEÇÃO: COPIAR DADOS DO ATENDIMENTO + TOAST (18 + 19 mescladas)
   * ====================================================================== */
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

  /* ========================================================================
   * SEÇÃO: APLICAÇÃO CENTRAL DAS FUNCIONALIDADES SELECIONADAS
   * ====================================================================== */
  function applySelectedFeatures() {
    hideSelectedCards();
    applyDateToMessages();
    reorganizeAgentArea();
    moveCreatedDateToHeader();
    applyUppercaseToCustomerNames();
    formatAttendanceDataPhones();
    formatAttendanceDataCpfs();
    formatAttendanceDataBirthDates();
    enableCopyOnAttendanceData();
    styleQueueTagsInTicketCards();
    applyUnreadMessageIndicators();
  }

  function applyFastAntiFlickerPass() {
    hideSelectedCards();
    moveCreatedDateToHeader();
    applyUppercaseToCustomerNames();
    formatAttendanceDataPhones();
    formatAttendanceDataCpfs();
    formatAttendanceDataBirthDates();
    styleQueueTagsInTicketCards();
    applyUnreadMessageIndicators();
  }

  function reapplyAll() {
    applyCSS();
    applySelectedFeatures();
  }

  /* ========================================================================
   * SEÇÃO: INFRAESTRUTURA SPA / REAPLICAÇÃO
   * Mantida apenas para estabilidade em re-renderizações.
   * ====================================================================== */
  let observer = null;
  let tabPassTimers = [];

  function scheduleTabAntiFlickerPasses() {
    tabPassTimers.forEach(clearTimeout);
    tabPassTimers = [];

    applyFastAntiFlickerPass();

    for (const delay of [0, 50, 120, 220]) {
      tabPassTimers.push(window.setTimeout(applyFastAntiFlickerPass, delay));
    }
  }

  function isSidePanelTabTrigger(target) {
    if (!(target instanceof Element)) return false;

    const trigger = target.closest('button, a, [role="tab"]');
    if (!trigger) return false;

    const text = normalizeText(trigger.textContent).toLowerCase();
    return ['geral', 'timeline', 'arquivos', 'histórico', 'historico', 'msgs'].includes(text);
  }

  function startObserver() {
    const target = document.getElementById('app') || document.querySelector('[data-v-app]') || document.body;
    if (!target) return;

    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      applyFastAntiFlickerPass();
      debounce(reapplyAll, 80);
    });

    observer.observe(target, { childList: true, subtree: true });

    document.addEventListener('click', (event) => {
      if (!isSidePanelTabTrigger(event.target)) return;
      scheduleTabAntiFlickerPasses();
    }, true);
  }

  function init() {
    applyFastAntiFlickerPass();
    reapplyAll();
    stopCardBootMask();
    ensureSidebarStartsCollapsed();
    finalizeAgentBootMask();
    log(`iniciado v${SCRIPT_VERSION}`);
  }

  function boot() {
    init();
    startObserver();
  }

  startCardBootMask();
  startSidebarBootMask();
  startAgentBootMask();
  scheduleAgentBootFailsafe();
  applyCSS();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('load', init);
  window.addEventListener('pageshow', init);
})();
