// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      13.6
// @author       alison
// @match        https://pulse.sono.effinity.com.br/*
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  if (!location.pathname.startsWith('/whatsapp/agent')) {
    return;
  }

  /* ========================================================================
   * CONFIGURAÇÕES GERAIS
   * ====================================================================== */
  const SCRIPT_NAME = 'TM effinity';
  const SCRIPT_VERSION = '13.6';

  const STYLE_ID = 'tm-effinity-style';
  const HIDDEN_ATTR = 'data-tm-effinity-hidden';
  const DATE_APPLIED_ATTR = 'data-tm-date-applied';
  const UPPERCASE_NAME_ATTR = 'data-tm-uppercase-name';
  const BIRTH_AGE_ATTR = 'data-tm-birth-age';
  const PHONE_FORMATTED_ATTR = 'data-tm-phone-formatted';

  const AGENT_AREA_ATTR = 'data-tm-agent-area';
  const AGENT_TOP_ATTR = 'data-tm-agent-top-row';
  const AGENT_BOTTOM_ATTR = 'data-tm-agent-bottom-row';
  const AGENT_ACTIONS_ATTR = 'data-tm-agent-actions-row';
  const AGENT_ACTIONS_MIRROR_ATTR = 'data-tm-agent-actions-mirror';
  const AGENT_PROXY_ATTR = 'data-tm-agent-proxy';
  const AGENT_VERSION_ATTR = 'data-tm-agent-version';
  const FAVORITE_STORAGE_KEY = 'tm-effinity-favorites';
  const FAVORITE_ATTR = 'data-tm-favorite';
  const FAVORITE_ACTIVE_ATTR = 'data-tm-favorite-active';
  const FAVORITE_STAR_ATTR = 'data-tm-favorite-star';

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

  const MESSAGE_API_CACHE = new Map();
  const MESSAGE_API_CACHE_LIMIT = 1200;

  function normalizeApiMessageText(value) {
    return String(value || '')
      .replace(/\r/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\s+\|\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function getMessageTimestamp(message) {
    return (
      message?.sentAt ||
      message?.receivedAt ||
      message?.createdAt ||
      message?.deliveredAt ||
      message?.updatedAt ||
      null
    );
  }

  function parseApiDate(value) {
    if (!value) return null;
    const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatApiTime(date) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  function getApiDateLabel(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';

    return target.toLocaleDateString('pt-BR');
  }

  function compactForMatch(value) {
    return normalizeApiMessageText(value)
      .replace(/^alison:\s*/i, '')
      .replace(/[^\p{L}\p{N}@._-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cacheApiMessage(message) {
    if (!message || typeof message !== 'object') return;

    const timestampValue = getMessageTimestamp(message);
    const date = parseApiDate(timestampValue);
    if (!date) return;

    const content = message.content || message.mediaCaption || '';
    const id = message.id || message.gupshupMessageId || `${message.ticketId || ''}-${timestampValue}-${content}`;

    MESSAGE_API_CACHE.set(String(id), {
      id: String(id),
      ticketId: message.ticketId || null,
      direction: String(message.direction || '').toUpperCase(),
      content: String(content || ''),
      contentNorm: compactForMatch(content || ''),
      time: formatApiTime(date),
      dateLabel: getApiDateLabel(date),
      timestamp: date.getTime()
    });

    if (MESSAGE_API_CACHE.size > MESSAGE_API_CACHE_LIMIT) {
      const overflow = MESSAGE_API_CACHE.size - MESSAGE_API_CACHE_LIMIT;
      const keys = Array.from(MESSAGE_API_CACHE.keys()).slice(0, overflow);
      keys.forEach(key => MESSAGE_API_CACHE.delete(key));
    }
  }

  function extractApiMessages(payload) {
    if (!payload) return;

    if (Array.isArray(payload)) {
      payload.forEach(extractApiMessages);
      return;
    }

    if (typeof payload !== 'object') return;

    if (
      payload.createdAt &&
      payload.direction &&
      (
        Object.prototype.hasOwnProperty.call(payload, 'content') ||
        Object.prototype.hasOwnProperty.call(payload, 'mediaCaption') ||
        Object.prototype.hasOwnProperty.call(payload, 'messageType')
      )
    ) {
      cacheApiMessage(payload);
    }

    if (Array.isArray(payload.content)) payload.content.forEach(extractApiMessages);
    if (Array.isArray(payload.data)) payload.data.forEach(extractApiMessages);
    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) extractApiMessages(payload.data);
    if (payload.result && typeof payload.result === 'object') extractApiMessages(payload.result);
  }

  function processApiPayload(payload, requestUrl = '') {
    try {
      extractApiMessages(payload);
      processTicketFilesPayload(payload, requestUrl);
      window.setTimeout(() => {
        try {
          applyDateToMessages();
        } catch (error) {
          console.error(`[${SCRIPT_NAME}] falha ao reaplicar datas das mensagens`, error);
        }
      }, 80);
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao processar cache de mensagens`, error);
    }
  }

  function installMessageApiInterceptors() {
    if (window.__tmEffinityMessageInterceptorsInstalled) return;
    window.__tmEffinityMessageInterceptorsInstalled = true;

    const nativeFetch = window.fetch;
    if (typeof nativeFetch === 'function') {
      window.fetch = async function tmEffinityFetchProxy(...args) {
        const response = await nativeFetch.apply(this, args);

        try {
          const clone = response.clone();
          const contentType = clone.headers?.get?.('content-type') || '';
          if (contentType.includes('application/json')) {
            clone.json().then(payload => processApiPayload(payload, String(args?.[0]?.url || args?.[0] || ''))).catch(() => {});
          }
        } catch (_) {}

        return response;
      };
    }

    const NativeXHR = window.XMLHttpRequest;
    if (typeof NativeXHR === 'function') {
      const nativeOpen = NativeXHR.prototype.open;
      const nativeSend = NativeXHR.prototype.send;

      NativeXHR.prototype.open = function tmEffinityXhrOpen(...args) {
        this.__tmEffinityUrl = args[1];
        return nativeOpen.apply(this, args);
      };

      NativeXHR.prototype.send = function tmEffinityXhrSend(...args) {
        this.addEventListener('load', function tmEffinityXhrLoad() {
          try {
            const contentType = this.getResponseHeader?.('content-type') || '';
            if (!contentType.includes('application/json')) return;

            const payload = JSON.parse(this.responseText);
            processApiPayload(payload, String(this.__tmEffinityUrl || ''));
          } catch (_) {}
        });

        return nativeSend.apply(this, args);
      };
    }
  }


  /* ========================================================================
   * SEÇÃO: ESTILOS / ELEMENTOS OCULTOS / AJUSTES VISUAIS
   * Mantém: 2, 3, 4, 5, 7, 9, 10+11, 19, 21, 22
   * ====================================================================== */
  const css = `
    /* ── Aba Arquivos renomeada via JS real, sem ::after ───────────── */

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


    /* ── Badge de idade ao lado da data de nascimento ─────────────────── */
    span.text-sm.text-card-foreground.break-words.min-w-0[data-tm-birth-age]::after {
      content: attr(data-tm-birth-age);
      display: inline-flex !important;
      align-items: center !important;
      margin-left: 6px !important;
      padding: 2px 8px !important;
      border-radius: 999px !important;
      font-size: 0.875rem !important; line-height: inherit !important;
      line-height: 1.1 !important;
      font-weight: 600 !important;
      background-color: #dbeafe !important;
      color: #1d4ed8 !important;
      border: 1px solid #93c5fd !important;
      white-space: nowrap !important;
      vertical-align: middle !important;
    }

    /* ── Favoritos (estrela) ───────────────────────────────────────────── */
    div.p-2.border.rounded.cursor-pointer {
      position: relative !important;
    }

    [${FAVORITE_STAR_ATTR}="true"] {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      width: 22px !important;
      height: 22px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: transparent !important;
      border: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      color: #facc15 !important;
      font-size: 18px !important;
      line-height: 1 !important;
      font-weight: 700 !important;
      opacity: 0 !important;
      cursor: pointer !important;
      z-index: 8 !important;
      transition: opacity 0.16s ease, transform 0.16s ease !important;
      transform: scale(1) !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }

    div.p-2.border.rounded.cursor-pointer:hover [${FAVORITE_STAR_ATTR}="true"] {
      opacity: 0.55 !important;
      transform: scale(0.95) !important;
    }

    [${FAVORITE_ACTIVE_ATTR}="true"] [${FAVORITE_STAR_ATTR}="true"],
    div.p-2.border.rounded.cursor-pointer[${FAVORITE_ACTIVE_ATTR}="true"]:hover [${FAVORITE_STAR_ATTR}="true"] {
      opacity: 1 !important;
      transform: scale(1) !important;
    }

    
    /* ── Ajuste fino badge idade ─────────────────────────────────────── */
    [data-tm-birthdate] {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    [data-tm-birthdate] span:last-child {
      display: inline-flex !important;
      align-items: center !important;
      line-height: 1 !important;
      transform: translateY(-1px) !important;
    }

    /* ── Sistema interno de ocultação ──────────────────────────────────── */
    [${HIDDEN_ATTR}="true"] {
      display: none !important;
    }



    /* ── Geral ↔ Notas v11.9: visibilidade apenas, sem mover React ───── */
    [data-tm-side-view="geral"] [data-tm-native-notes-card="true"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    [data-tm-side-view="notas"] > *:not([data-tm-native-notes-card="true"]) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    [data-tm-side-view="notas"] [data-tm-native-notes-card="true"] {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    [data-tm-side-view="notas"] [data-tm-native-notes-card="true"] * {
      pointer-events: auto !important;
    }

    html[data-tm-notes-mode="true"] button[data-tm-side-tab="geral"] {
      background: transparent !important;
      box-shadow: none !important;
      color: hsl(var(--muted-foreground)) !important;
    }

    html[data-tm-notes-mode="true"] button[data-tm-side-tab="notas"] {
      background: hsl(var(--background)) !important;
      color: hsl(var(--foreground)) !important;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
      font-weight: 600 !important;
    }



    /* ── Visualizador flutuante de imagens dos arquivos ──────────────── */
    [data-tm-image-popup="true"] {
      position: fixed !important;
      width: 420px !important;
      height: 520px !important;
      max-width: calc(100vw - 40px) !important;
      max-height: calc(100vh - 40px) !important;
      background: #111827 !important;
      border: 1px solid rgba(148, 163, 184, 0.35) !important;
      border-radius: 12px !important;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45) !important;
      overflow: hidden !important;
      z-index: 99990 !important;
      color: #f9fafb !important;
    }

    [data-tm-image-popup="true"][data-tm-maximized="true"] {
      left: 16px !important;
      top: 16px !important;
      width: calc(100vw - 32px) !important;
      height: calc(100vh - 32px) !important;
    }

    [data-tm-image-popup-header="true"] {
      height: 42px !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto auto !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 0 10px 0 12px !important;
      background: rgba(15, 23, 42, 0.98) !important;
      border-bottom: 1px solid rgba(148, 163, 184, 0.25) !important;
      user-select: none !important;
      cursor: move !important;
    }

    [data-tm-image-popup-title="true"] {
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #e5e7eb !important;
    }

    [data-tm-image-popup-actions-center="true"],
    [data-tm-image-popup-actions-right="true"] {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    [data-tm-image-popup-actions-right="true"] {
      justify-content: flex-end !important;
    }

    [data-tm-image-popup-icon="true"] {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 0 !important;
      background: transparent !important;
      color: #cbd5e1 !important;
      cursor: pointer !important;
      padding: 4px !important;
      margin: 0 !important;
      border-radius: 6px !important;
      line-height: 1 !important;
      transition: background 0.12s ease, color 0.12s ease !important;
    }

    [data-tm-image-popup-icon="true"]:hover {
      background: rgba(148, 163, 184, 0.12) !important;
      color: #f8fafc !important;
    }

    [data-tm-image-popup-close="true"] {
      color: #f87171 !important;
    }

    [data-tm-image-popup-close="true"]:hover {
      color: #ef4444 !important;
      background: rgba(239, 68, 68, 0.12) !important;
    }

    [data-tm-image-popup-download="true"] {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      border: 1px solid rgba(34, 197, 94, 0.32) !important;
      background: rgba(34, 197, 94, 0.10) !important;
      color: #86efac !important;
      cursor: pointer !important;
      padding: 5px 9px !important;
      margin: 0 !important;
      border-radius: 8px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      line-height: 1 !important;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease !important;
    }

    [data-tm-image-popup-download="true"]:hover {
      background: rgba(34, 197, 94, 0.16) !important;
      border-color: rgba(34, 197, 94, 0.46) !important;
      color: #bbf7d0 !important;
    }

    [data-tm-image-popup-body="true"] {
      height: calc(100% - 42px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #020617 !important;
      padding: 10px !important;
      overflow: hidden !important;
      cursor: default !important;
      touch-action: none !important;
    }

    [data-tm-image-popup-body="true"][data-tm-pannable="true"] {
      cursor: grab !important;
    }

    [data-tm-image-popup-body="true"][data-tm-panning="true"] {
      cursor: grabbing !important;
    }

    [data-tm-image-popup-body="true"] img {
      max-width: none !important;
      max-height: none !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      border-radius: 6px !important;
      transform-origin: center center !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
      will-change: transform !important;
      transition: none !important;
    }

    [data-tm-image-popup-resize="true"] {
      position: absolute !important;
      z-index: 4 !important;
      background: transparent !important;
    }

    [data-tm-image-popup-resize-dir="n"] {
      top: 0 !important;
      left: 10px !important;
      right: 10px !important;
      height: 8px !important;
      cursor: ns-resize !important;
    }

    [data-tm-image-popup-resize-dir="s"] {
      bottom: 0 !important;
      left: 10px !important;
      right: 10px !important;
      height: 8px !important;
      cursor: ns-resize !important;
    }

    [data-tm-image-popup-resize-dir="e"] {
      top: 10px !important;
      right: 0 !important;
      bottom: 10px !important;
      width: 8px !important;
      cursor: ew-resize !important;
    }

    [data-tm-image-popup-resize-dir="w"] {
      top: 10px !important;
      left: 0 !important;
      bottom: 10px !important;
      width: 8px !important;
      cursor: ew-resize !important;
    }

    [data-tm-image-popup-resize-dir="ne"],
    [data-tm-image-popup-resize-dir="nw"],
    [data-tm-image-popup-resize-dir="se"],
    [data-tm-image-popup-resize-dir="sw"] {
      width: 12px !important;
      height: 12px !important;
    }

    [data-tm-image-popup-resize-dir="ne"] {
      top: 0 !important;
      right: 0 !important;
      cursor: nesw-resize !important;
    }

    [data-tm-image-popup-resize-dir="nw"] {
      top: 0 !important;
      left: 0 !important;
      cursor: nwse-resize !important;
    }

    [data-tm-image-popup-resize-dir="se"] {
      right: 0 !important;
      bottom: 0 !important;
      cursor: nwse-resize !important;
    }

    [data-tm-image-popup-resize-dir="sw"] {
      left: 0 !important;
      bottom: 0 !important;
      cursor: nesw-resize !important;
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

    [${AGENT_BOTTOM_ATTR}="true"] > span.text-xs.text-muted-foreground.mr-2 {
      margin-right: 4px !important;
      flex-shrink: 0 !important;
    }

    [${AGENT_BOTTOM_ATTR}="true"] > div:not([${AGENT_ACTIONS_MIRROR_ATTR}="true"]) {
      flex-shrink: 0 !important;
    }

    [${AGENT_ACTIONS_MIRROR_ATTR}="true"] {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 16px !important;
      flex: 0 0 auto !important;
      margin-left: auto !important;
      white-space: nowrap !important;
    }

    [${AGENT_ACTIONS_MIRROR_ATTR}="true"] > * {
      flex-shrink: 0 !important;
    }


    /* ── Área do Agente: ordem visual fixa sem mover nós do app ───────── */
    [${AGENT_BOTTOM_ATTR}="true"] > span.text-xs.text-muted-foreground.mr-2 {
      order: 0 !important;
    }

    [${AGENT_BOTTOM_ATTR}="true"] > div:not([${AGENT_ACTIONS_MIRROR_ATTR}="true"]) {
      order: 1 !important;
    }

    [${AGENT_ACTIONS_MIRROR_ATTR}="true"] {
      order: 99 !important;
      margin-left: auto !important;
    }

    [${AGENT_VERSION_ATTR}="true"] {
      order: 50 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 0.75rem !important;
      line-height: 1rem !important;
      font-weight: 600 !important;
      color: rgb(134 239 172) !important;
      white-space: nowrap !important;
      flex: 0 0 auto !important;
      margin-left: auto !important;
      margin-right: auto !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }

    [${AGENT_PROXY_ATTR}="true"] {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
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
      font-size: 0.875rem !important; line-height: inherit !important;
      line-height: inherit !important;
      white-space: nowrap !important;
    }

    [${TICKET_CREATED_MOVED_ATTR}="true"] svg {
      width: 12px !important;
      height: 12px !important;
      flex-shrink: 0 !important;
    }

    [${TICKET_CREATED_HOST_ATTR}="true"] span.flex.items-center.gap-1 {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      margin: 0 !important;
      color: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
      white-space: nowrap !important;
    }

    [${TICKET_CREATED_HOST_ATTR}="true"] svg {
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


  let favoriteApplyTimer = null;
  let favoriteIntervalId = null;

  function loadFavoriteTickets() {
    try {
      const raw = localStorage.getItem(FAVORITE_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao ler favoritos`, error);
      return {};
    }
  }

  function saveFavoriteTickets(favorites) {
    try {
      localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao salvar favoritos`, error);
    }
  }

  function getTicketProtocol(card) {
    if (!card) return '';

    for (const el of card.querySelectorAll('span')) {
      const value = normalizeText(el.textContent);
      if (/^CS\d+/i.test(value)) return value;
    }

    return '';
  }

  function isFavoriteTicket(protocol) {
    if (!protocol) return false;
    const favorites = loadFavoriteTickets();
    return !!favorites[protocol];
  }

  function setFavoriteTicket(protocol, isActive) {
    if (!protocol) return;
    const favorites = loadFavoriteTickets();

    if (isActive) {
      favorites[protocol] = true;
    } else {
      delete favorites[protocol];
    }

    saveFavoriteTickets(favorites);
  }

  function createFavoriteStarButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(FAVORITE_STAR_ATTR, 'true');
    button.setAttribute('aria-label', 'Favoritar ticket');
    button.setAttribute('title', 'Favoritar ticket');
    button.textContent = '☆';
    return button;
  }

  function updateFavoriteCardState(card, protocol) {
    if (!card || !protocol) return;

    const isActive = isFavoriteTicket(protocol);
    card.setAttribute(FAVORITE_ATTR, protocol);
    card.setAttribute(FAVORITE_ACTIVE_ATTR, isActive ? 'true' : 'false');

    const star = card.querySelector(`[${FAVORITE_STAR_ATTR}="true"]`);
    if (!star) return;

    star.textContent = isActive ? '★' : '☆';
    star.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    star.setAttribute('title', isActive ? 'Remover favorito' : 'Favoritar ticket');
    star.setAttribute('aria-label', isActive ? 'Remover favorito' : 'Favoritar ticket');
  }

  function ensureFavoriteStar(card) {
    const protocol = getTicketProtocol(card);
    if (!protocol) return;

    let star = card.querySelector(`[${FAVORITE_STAR_ATTR}="true"]`);
    if (!star) {
      star = createFavoriteStarButton();
      card.appendChild(star);

      star.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const currentProtocol = card.getAttribute(FAVORITE_ATTR) || getTicketProtocol(card);
        if (!currentProtocol) return;

        const nextState = !isFavoriteTicket(currentProtocol);
        setFavoriteTicket(currentProtocol, nextState);
        updateFavoriteCardState(card, currentProtocol);
      }, true);
    }

    updateFavoriteCardState(card, protocol);
  }

  function applyFavoriteStarsToTicketsSafe() {
    try {
      const cards = getAllTicketListCards();
      if (!cards.length) return;

      for (const card of cards) {
        ensureFavoriteStar(card);
      }
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha na camada de favoritos`, error);
    }
  }

  function scheduleFavoriteLayer(delay = 350) {
    clearTimeout(favoriteApplyTimer);
    favoriteApplyTimer = window.setTimeout(applyFavoriteStarsToTicketsSafe, delay);
  }

  let favoriteClickListenerStarted = false;

  function startFavoriteLayer() {
    scheduleFavoriteLayer(700);

    if (favoriteIntervalId) {
      clearInterval(favoriteIntervalId);
    }

    favoriteIntervalId = window.setInterval(() => {
      applyFavoriteStarsToTicketsSafe();
    }, 1500);

    if (!favoriteClickListenerStarted) {
      favoriteClickListenerStarted = true;

      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const trigger = target.closest('button, a, [role="tab"], div.p-2.border.rounded.cursor-pointer');
        if (!trigger) return;

        scheduleFavoriteLayer(450);
      }, true);
    }
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
  function normalizeMessageTimeText(text) {
    return normalizeText(text).replace(/\s+/g, ' ');
  }

  function getRawMessageTime(timeEl) {
    const current = normalizeMessageTimeText(timeEl.textContent);
    const attr = normalizeMessageTimeText(timeEl.getAttribute('data-tm-original-time') || '');

    const attrMatch = attr.match(/(\d{1,2}:\d{2})$/);
    if (attrMatch) return attrMatch[1];

    const currentMatch = current.match(/(\d{1,2}:\d{2})$/);
    return currentMatch ? currentMatch[1] : '';
  }

  function findMessageBubbleFromTime(timeEl) {
    return timeEl.closest('.max-w-\\[75\\%\\].rounded-2xl') ||
      timeEl.closest('div.max-w-\\[75\\%\\]') ||
      timeEl.closest('div.rounded-2xl');
  }

  function getBubbleTextForMatch(bubble, timeEl) {
    const contentParts = [];

    for (const el of bubble.querySelectorAll('p.whitespace-pre-wrap, p.text-xs.font-semibold, span')) {
      if (el === timeEl) continue;
      const text = normalizeMessageTimeText(el.textContent);
      if (!text) continue;
      if (/^(?:Hoje\s+|Ontem\s+|\d{2}\/\d{2}\/\d{4}\s+)?\d{1,2}:\d{2}$/i.test(text)) continue;
      if (text === '✓' || text === '✓✓') continue;
      contentParts.push(text);
    }

    return compactForMatch(contentParts.join(' '));
  }

  function getBubbleDirection(bubble) {
    const cls = String(bubble.className || '');
    if (cls.includes('bg-blue-500') || cls.includes('bg-blue-600') || cls.includes('text-white')) {
      return 'OUTBOUND';
    }
    return 'INBOUND';
  }

  function scoreApiMessageMatch(apiMessage, bubbleText, direction, time) {
    if (!apiMessage || apiMessage.time !== time) return -1;

    let score = 0;

    if (apiMessage.direction === direction) score += 40;

    if (apiMessage.contentNorm && bubbleText) {
      if (apiMessage.contentNorm === bubbleText) {
        score += 80;
      } else if (apiMessage.contentNorm.includes(bubbleText) || bubbleText.includes(apiMessage.contentNorm)) {
        score += 55;
      } else {
        const bubbleWords = bubbleText.split(' ').filter(word => word.length >= 3);
        const matchCount = bubbleWords.filter(word => apiMessage.contentNorm.includes(word)).length;
        if (matchCount > 0) score += Math.min(35, matchCount * 7);
      }
    }

    return score;
  }

  function findApiMessageForBubble(bubble, timeEl) {
    const time = getRawMessageTime(timeEl);
    if (!time) return null;

    const bubbleText = getBubbleTextForMatch(bubble, timeEl);
    const direction = getBubbleDirection(bubble);

    let best = null;
    let bestScore = -1;

    for (const message of MESSAGE_API_CACHE.values()) {
      const score = scoreApiMessageMatch(message, bubbleText, direction, time);
      if (score > bestScore) {
        best = message;
        bestScore = score;
      }
    }

    return bestScore >= 40 ? best : null;
  }

  function applyDateToMessages() {
    const timeNodes = Array.from(document.querySelectorAll('span.text-\\[10px\\].opacity-60')).filter(el => {
      if (!(el instanceof HTMLElement)) return false;

      const text = normalizeMessageTimeText(el.textContent);
      return /^(?:Hoje\s+|Ontem\s+|\d{2}\/\d{2}\/\d{4}\s+)?\d{1,2}:\d{2}$/.test(text);
    });

    for (const timeEl of timeNodes) {
      const bubble = findMessageBubbleFromTime(timeEl);
      if (!bubble) continue;

      const rawTime = getRawMessageTime(timeEl);
      if (!rawTime) continue;

      timeEl.setAttribute('data-tm-original-time', rawTime);

      const apiMessage = findApiMessageForBubble(bubble, timeEl);
      if (!apiMessage) {
        if (normalizeMessageTimeText(timeEl.textContent) !== rawTime) {
          timeEl.textContent = rawTime;
        }
        continue;
      }

      const formatted = `${apiMessage.dateLabel} ${rawTime}`;
      if (normalizeMessageTimeText(timeEl.textContent) !== formatted) {
        timeEl.textContent = formatted;
      }
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

  function createAgentProxyButton(sourceButton, proxyType) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(AGENT_PROXY_ATTR, 'true');
    button.setAttribute('data-tm-agent-proxy-type', proxyType);
    button.className = sourceButton.className || '';

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      sourceButton.click();
    }, true);

    return button;
  }

  function ensureAgentActionsMirror(bottomRow) {
    let mirror = bottomRow.querySelector(`[${AGENT_ACTIONS_MIRROR_ATTR}="true"]`);
    if (!mirror) {
      mirror = document.createElement('div');
      mirror.setAttribute(AGENT_ACTIONS_MIRROR_ATTR, 'true');
      bottomRow.appendChild(mirror);
    }
    return mirror;
  }


  function syncAgentProxyButton(mirror, sourceButton, proxyType) {
    if (!sourceButton) return;

    let proxy = mirror.querySelector(`[data-tm-agent-proxy-type="${proxyType}"]`);
    if (!proxy) {
      proxy = createAgentProxyButton(sourceButton, proxyType);
      mirror.appendChild(proxy);
    }

    if (proxy.className !== sourceButton.className) {
      proxy.className = sourceButton.className;
    }

    const sourceHtml = sourceButton.innerHTML;
    if (proxy.innerHTML !== sourceHtml) {
      proxy.innerHTML = sourceHtml;
    }

    proxy.setAttribute('title', sourceButton.getAttribute('title') || '');
    proxy.setAttribute('aria-label', sourceButton.getAttribute('aria-label') || sourceButton.textContent.trim() || proxyType);
    proxy.disabled = !!sourceButton.disabled;
  }

  function ensureAgentVersionBadge(agentContainer, bottomRow, mirror) {
    if (!agentContainer || !bottomRow) return;

    let badge = bottomRow.querySelector(`[${AGENT_VERSION_ATTR}="true"]`);
    if (!badge) {
      badge = document.createElement('span');
      badge.setAttribute(AGENT_VERSION_ATTR, 'true');
      bottomRow.insertBefore(badge, mirror || null);
    }

    const versionText = `🧪 V${SCRIPT_VERSION}`;
    if (badge.textContent !== versionText) {
      badge.textContent = versionText;
    }
  }

  function reorganizeAgentArea() {
    const agentContainer = findAgentAreaContainer();
    if (!agentContainer) return;

    const topRow = findTopRow(agentContainer);
    const bottomRow = findBottomRow(agentContainer, topRow);
    if (!topRow || !bottomRow) {
      finalizeAgentBootMask();
      return;
    }

    agentContainer.setAttribute(AGENT_AREA_ATTR, 'true');
    topRow.setAttribute(AGENT_TOP_ATTR, 'true');
    bottomRow.setAttribute(AGENT_BOTTOM_ATTR, 'true');

    const mirror = ensureAgentActionsMirror(bottomRow);
    ensureAgentVersionBadge(agentContainer, bottomRow, mirror);

    const offlineControl = findOfflineControl(topRow);
    const offlineButton = offlineControl?.querySelector?.('button') || (offlineControl?.tagName === 'BUTTON' ? offlineControl : null);
    const sendHsmButton = findSendHsmButton(topRow);

    if (offlineButton) {
      syncAgentProxyButton(mirror, offlineButton, 'status');
    }

    if (sendHsmButton) {
      syncAgentProxyButton(mirror, sendHsmButton, 'hsm');
    }

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
      const createdSignature = normalizeText(createdSpan.textContent);

      if (host.getAttribute('data-tm-created-signature') !== createdSignature) {
        host.innerHTML = '';
        const clone = createdSpan.cloneNode(true);
        clone.setAttribute(TICKET_CREATED_MOVED_ATTR, 'true');
        host.appendChild(clone);
        host.setAttribute('data-tm-created-signature', createdSignature);
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

  

  function formatAttendanceDataEmails() {
    for (const card of findAttendanceDataCards()) {
      const emailValueEl = findValueSpanByLabel(card, 'E-mail');
      if (!emailValueEl) continue;

      const currentText = normalizeText(emailValueEl.textContent);
      if (!currentText) continue;

      const upper = currentText.toUpperCase();

      // valor original para cópia
      emailValueEl.setAttribute('data-tm-copy-raw', currentText);

      if (currentText !== upper) {
        emailValueEl.textContent = upper;
      }

      bindCopyOnClick(emailValueEl, card, 'email');
    }
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
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const age = calculateAgeFromBirthDate(day, month, year);
    if (age === null) return null;

    const yearsLabel = age === 1 ? 'ano' : 'anos';
    const baseDate = `${match[1]}/${match[2]}/${match[3]}`;

    return {
      baseDate,
      ageText: `${age} ${yearsLabel}`
    };
  }

  function formatAttendanceDataBirthDates() {
    for (const card of findAttendanceDataCards()) {
      const birthValueEl = findValueSpanByLabel(card, 'Nascimento');
      if (!birthValueEl) continue;

      const visibleText = normalizeText(birthValueEl.textContent);
      const visibleMatch = visibleText.match(/^(\d{2}\/\d{2}\/\d{4})/);
      const rawAttr = normalizeText(birthValueEl.getAttribute('data-tm-copy-raw') || '');
      const sourceDate = visibleMatch ? visibleMatch[1] : rawAttr;

      if (!sourceDate) {
        birthValueEl.removeAttribute(BIRTH_AGE_ATTR);
        birthValueEl.removeAttribute('data-tm-copy-raw');
        continue;
      }

      const formatted = formatBirthDateWithAgeDisplay(sourceDate);
      if (!formatted) {
        birthValueEl.removeAttribute(BIRTH_AGE_ATTR);
        birthValueEl.setAttribute('data-tm-copy-raw', sourceDate);
        if (visibleText !== sourceDate) {
          birthValueEl.textContent = sourceDate;
        }
        continue;
      }

      birthValueEl.setAttribute('data-tm-copy-raw', formatted.baseDate);
      birthValueEl.setAttribute(BIRTH_AGE_ATTR, formatted.ageText);

      if (visibleText !== formatted.baseDate) {
        birthValueEl.textContent = formatted.baseDate;
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

      const text = normalizeText(valueEl.getAttribute('data-tm-copy-raw') || valueEl.textContent);
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
   * SEÇÃO: GERAL ↔ NOTAS ESTÁVEL (v11.9)
   * Regra: não mover, não clonar e não recriar o card nativo de Notas.
   * A aba "Notas" é visual: mantém a aba Geral real ativa por baixo e apenas
   * oculta os outros cards. Assim o React preserva textarea e botão original.
   * ====================================================================== */
  const SIDE_FILES_CACHE_LIMIT = 80;
  const SIDE_FILES_BY_TICKET_ID = new Map();
  let sideCurrentTicketId = '';
  let sideNotesMode = false;
  let sideRenderTimers = [];

  function sideExtractTicketIdFromUrl(value) {
    const match = String(value || '').match(/\/tickets\/(\d+)(?:\/|$)/);
    return match ? match[1] : '';
  }

  function sideSetCurrentTicketId(ticketId) {
    const id = String(ticketId || '').trim();
    if (!id || id === sideCurrentTicketId) return;

    sideCurrentTicketId = id;
    sideClearRenderedFilesImmediately();
    sideScheduleRender();
  }

  function sideGetCurrentTicketId() {
    if (sideCurrentTicketId) return sideCurrentTicketId;

    try {
      const entries = performance.getEntriesByType('resource') || [];
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const url = entries[i]?.name || '';
        if (!url.includes('/tickets/')) continue;
        const id = sideExtractTicketIdFromUrl(url);
        if (id) {
          sideCurrentTicketId = id;
          return id;
        }
      }
    } catch (_) {}

    return '';
  }

  function sideClearRenderedFilesImmediately() {
    try {
      const host = sideFindHost();
      if (host) {
        for (const node of Array.from(host.querySelectorAll('[data-tm-api-file-card="true"]'))) {
          if (node instanceof HTMLElement) {
            node.remove();
          }
        }
      }

      for (const node of Array.from(document.querySelectorAll('[data-tm-api-file-card="true"]'))) {
        if (node instanceof HTMLElement) {
          node.remove();
        }
      }
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao limpar arquivos renderizados`, error);
    }
  }

  function processTicketFilesPayload(payload, requestUrl = '') {
    try {
      if (!payload || typeof payload !== 'object') return;
      if (!Array.isArray(payload.files) && !String(requestUrl || '').includes('/files')) return;

      const ticketId = sideExtractTicketIdFromUrl(requestUrl) ||
        String(payload.files?.[0]?.ticketId || sideGetCurrentTicketId() || '').trim();

      if (!ticketId) return;

      const files = Array.isArray(payload.files)
        ? payload.files.map(sideNormalizeFile).filter(Boolean)
        : [];

      SIDE_FILES_BY_TICKET_ID.set(ticketId, files);
      sideSetCurrentTicketId(ticketId);

      if (SIDE_FILES_BY_TICKET_ID.size > SIDE_FILES_CACHE_LIMIT) {
        const overflow = SIDE_FILES_BY_TICKET_ID.size - SIDE_FILES_CACHE_LIMIT;
        Array.from(SIDE_FILES_BY_TICKET_ID.keys()).slice(0, overflow).forEach(key => SIDE_FILES_BY_TICKET_ID.delete(key));
      }

      sideScheduleRender();
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao processar arquivos`, error);
    }
  }

  function sideNormalizeFile(file) {
    if (!file || typeof file !== 'object') return null;

    const id = file.id || file.fileId || file.downloadUrl || file.fileName;
    const downloadUrl = String(file.downloadUrl || file.url || file.publicUrl || '').trim();
    const fileName = String(file.fileName || file.filename || file.name || file.filePath || 'Arquivo').trim();

    if (!id || !downloadUrl) return null;

    return {
      id: String(id),
      fileName,
      description: String(file.description || 'Arquivo recebido via WhatsApp').trim(),
      category: String(file.category || '').trim(),
      mimeType: String(file.mimeType || '').trim(),
      thumbnailUrl: String(file.thumbnailUrl || '').trim(),
      downloadUrl,
      createdAt: file.createdAt || null,
      icon: String(file.icon || '').trim()
    };
  }

  function sideFindPanel() {
    for (const button of document.querySelectorAll('button')) {
      const text = normalizeText(button.textContent).toLowerCase();
      if (text !== 'geral') continue;

      const panel = button.closest('.flex.flex-col.h-full.min-h-0') ||
        button.closest('.hidden.xl\\:flex') ||
        button.closest('.flex.flex-col');

      if (!panel) continue;

      const labels = Array.from(panel.querySelectorAll('button')).map(btn => normalizeText(btn.textContent).toLowerCase());
      if (labels.includes('geral') && (labels.includes('arquivos') || labels.includes('notas'))) {
        return panel;
      }
    }
    return null;
  }

  function findSidePanelWithTabs() {
    return sideFindPanel();
  }

  function sideFindTabButton(name) {
    const panel = sideFindPanel();
    if (!panel) return null;

    for (const button of panel.querySelectorAll('button')) {
      const text = normalizeText(button.textContent).toLowerCase();
      if (name === 'notas' && (text === 'arquivos' || text === 'notas')) return button;
      if (text === name) return button;
    }
    return null;
  }

  function sideMarkTabs() {
    const geral = sideFindTabButton('geral');
    const notas = sideFindTabButton('notas');

    if (geral) {
      geral.setAttribute('data-tm-side-tab', 'geral');
    }

    if (notas) {
      notas.setAttribute('data-tm-side-tab', 'notas');
      notas.setAttribute('aria-label', 'Notas');
      notas.setAttribute('title', 'Notas');

      // v12.4: o texto da aba precisa ser texto real do botão.
      // Não usar ::after, porque ele impede destaque confiável.
      let hasTextNode = false;
      for (const node of Array.from(notas.childNodes)) {
        if (node.nodeType !== Node.TEXT_NODE) continue;

        const value = normalizeText(node.nodeValue).toLowerCase();
        if (value === 'arquivos' || value === 'notas') {
          node.nodeValue = 'Notas';
          hasTextNode = true;
        }
      }

      if (!hasTextNode) {
        notas.appendChild(document.createTextNode('Notas'));
      }
    }

    if (!geral || !notas) return;

    if (sideNotesMode) {
      // v12.9: causa real do conflito:
      // a aba Geral continua sendo a aba real ativa do React por baixo da aba Notas virtual.
      // Portanto, não podemos remover as classes ativas reais da Geral.
      geral.classList.add('bg-background', 'text-foreground', 'shadow-sm');

      // Destaque virtual da aba Notas: somente texto/ícone branco, sem fundo, sem sombra.
      notas.classList.add('text-foreground');
      notas.classList.remove('hover:bg-background/50');

      notas.style.setProperty('color', 'rgb(255, 255, 255)', 'important');
      notas.style.setProperty('font-weight', '500', 'important');
      notas.style.setProperty('background', 'transparent', 'important');
      notas.style.setProperty('background-color', 'transparent', 'important');
      notas.style.setProperty('box-shadow', 'none', 'important');

      const notasSvg = notas.querySelector('svg');
      if (notasSvg) {
        notasSvg.style.setProperty('color', 'rgb(255, 255, 255)', 'important');
        notasSvg.style.setProperty('stroke', 'currentColor', 'important');
      }

      // Apenas esmaece a Geral temporariamente.
      // Ao sair de Notas, removemos esse inline e a Geral volta com suas classes nativas.
      geral.style.setProperty('color', 'hsl(var(--muted-foreground))', 'important');
      geral.style.setProperty('font-weight', '500', 'important');
    } else {
      notas.classList.remove('bg-background', 'text-foreground', 'shadow-sm');
      if (!notas.classList.contains('hover:bg-background/50')) {
        notas.classList.add('hover:bg-background/50');
      }

      notas.style.removeProperty('color');
      notas.style.removeProperty('font-weight');
      notas.style.removeProperty('color');
      notas.style.removeProperty('font-weight');
      notas.style.removeProperty('background');
      notas.style.removeProperty('background-color');
      notas.style.removeProperty('box-shadow');
      notas.style.removeProperty('transition');

      const notasSvg = notas.querySelector('svg');
      if (notasSvg) {
        notasSvg.style.removeProperty('color');
        notasSvg.style.removeProperty('stroke');
        notasSvg.style.removeProperty('transition');
      }

      geral.style.removeProperty('color');
      geral.style.removeProperty('font-weight');
      geral.style.removeProperty('background');
      geral.style.removeProperty('background-color');
      geral.style.removeProperty('box-shadow');
      geral.style.removeProperty('transition');
    }
  }

  function renameFilesTabLabelToNotes() {
    try {
      sideMarkTabs();
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao renomear aba`, error);
    }
  }

  function sideFindShell() {
    const panel = sideFindPanel();
    if (!panel) return null;

    for (const child of Array.from(panel.children)) {
      if (
        child instanceof HTMLElement &&
        child.classList.contains('relative') &&
        child.classList.contains('overflow-hidden') &&
        child.classList.contains('flex-1')
      ) {
        return child;
      }
    }

    return panel.querySelector('.relative.overflow-hidden.flex-1');
  }

  function sideFindHost() {
    const shell = sideFindShell();
    if (!shell) return null;

    for (const host of shell.querySelectorAll('div.flex.flex-col.gap-4.p-3')) {
      if (!(host instanceof HTMLElement)) continue;
      if (sideFindNativeNotesCard(host) || normalizeText(host.textContent).includes('Dados do Atendimento')) {
        return host;
      }
    }

    return null;
  }

  function sideFindNativeNotesCard(root) {
    if (!root) return null;

    for (const title of root.querySelectorAll('h3')) {
      if (normalizeText(title.textContent) !== 'Notas Internas') continue;
      const card = title.closest('.rounded-xl.bg-card.border.border-border');
      if (card instanceof HTMLElement) return card;
    }

    return null;
  }

  function sideMarkNativeCards(host) {
    if (!host) return;

    for (const child of Array.from(host.children)) {
      if (!(child instanceof HTMLElement)) continue;

      if (child.getAttribute('data-tm-api-file-card') === 'true') continue;

      if (sideFindNativeNotesCard(child)) {
        child.setAttribute('data-tm-native-notes-card', 'true');
      }
    }
  }

  function sideGetFiles() {
    const ticketId = sideCurrentTicketId;
    return ticketId ? (SIDE_FILES_BY_TICKET_ID.get(ticketId) || []) : [];
  }

  function sideFormatDate(value) {
    const date = parseApiDate(value);
    if (!date) return '';
    return `${date.toLocaleDateString('pt-BR')} às ${formatApiTime(date)}`;
  }

  function sideFileBadge(file) {
    const category = String(file?.category || '').toUpperCase();
    const mimeType = String(file?.mimeType || '').toLowerCase();

    if (category === 'WHATSAPP_MEDIA') return 'Mídia WhatsApp';
    if (category) return category;
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.includes('pdf')) return 'PDF';
    return 'Documento';
  }

  function sideIsImageFile(file) {
    const mimeType = String(file?.mimeType || '').toLowerCase();
    const icon = String(file?.icon || '').toLowerCase();
    return mimeType.startsWith('image/') || icon === 'image';
  }

  function sideCreateThumb(file) {
    const box = document.createElement('div');
    box.className = 'relative h-12 w-12 rounded overflow-hidden bg-muted group flex items-center justify-center';

    if (sideIsImageFile(file) && file.thumbnailUrl) {
      const img = document.createElement('img');
      img.src = file.thumbnailUrl;
      img.alt = file.fileName;
      img.className = 'h-full w-full object-cover';
      img.loading = 'lazy';
      box.appendChild(img);
      return box;
    }

    const icon = document.createElement('span');
    icon.className = 'text-muted-foreground text-xl leading-none';
    icon.textContent = '▯';
    box.appendChild(icon);
    return box;
  }



  let imagePopupCounter = 0;
  let imagePopupZIndex = 99990;

  function sideIsPreviewableImage(file) {
    const mimeType = String(file?.mimeType || '').toLowerCase();
    const fileName = String(file?.fileName || '').toLowerCase();
    const icon = String(file?.icon || '').toLowerCase();

    return mimeType.startsWith('image/') ||
      icon === 'image' ||
      /\.(png|jpe?g|webp|gif|bmp|avif)(\?|#|$)/i.test(fileName);
  }

  function sideDownloadFile(url, fileName) {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'imagem';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        try { link.remove(); } catch (_) {}
      }, 0);
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao baixar imagem`, error);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function sideGetPopupPanBounds(popup) {
    const body = popup.querySelector('[data-tm-image-popup-body="true"]');
    const img = body?.querySelector('img');
    if (!body || !img) return { maxX: 0, maxY: 0, pannableX: false, pannableY: false };

    const zoom = Number(popup.dataset.tmImageZoom || '1') || 1;
    const naturalW = Number(popup.dataset.tmImageNaturalW || img.naturalWidth || img.offsetWidth || 1);
    const naturalH = Number(popup.dataset.tmImageNaturalH || img.naturalHeight || img.offsetHeight || 1);
    const bodyRect = body.getBoundingClientRect();

    const scaledW = naturalW * zoom;
    const scaledH = naturalH * zoom;

    const overflowX = Math.max(0, scaledW - bodyRect.width);
    const overflowY = Math.max(0, scaledH - bodyRect.height);

    return {
      maxX: overflowX / 2,
      maxY: overflowY / 2,
      pannableX: overflowX > 1,
      pannableY: overflowY > 1
    };
  }

  function sideClampPopupPan(popup) {
    const bounds = sideGetPopupPanBounds(popup);

    let panX = Number(popup.dataset.tmImagePanX || '0') || 0;
    let panY = Number(popup.dataset.tmImagePanY || '0') || 0;

    panX = bounds.pannableX ? Math.max(-bounds.maxX, Math.min(bounds.maxX, panX)) : 0;
    panY = bounds.pannableY ? Math.max(-bounds.maxY, Math.min(bounds.maxY, panY)) : 0;

    popup.dataset.tmImagePanX = String(panX);
    popup.dataset.tmImagePanY = String(panY);

    const body = popup.querySelector('[data-tm-image-popup-body="true"]');
    if (body) {
      if (bounds.pannableX || bounds.pannableY) {
        body.setAttribute('data-tm-pannable', 'true');
      } else {
        body.removeAttribute('data-tm-pannable');
      }
    }

    return { panX, panY };
  }

  function sideApplyPopupImageTransform(popup) {
    try {
      const img = popup.querySelector('[data-tm-image-popup-body="true"] img');
      if (!img) return;

      const zoom = Number(popup.dataset.tmImageZoom || '1') || 1;
      const { panX, panY } = sideClampPopupPan(popup);

      img.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao aplicar transform da imagem`, error);
    }
  }

  function sideSetPopupImageZoom(popup, nextZoom) {
    try {
      const zoom = Math.max(0.25, Math.min(5, Number(nextZoom) || 1));
      popup.dataset.tmImageZoom = String(zoom);
      sideApplyPopupImageTransform(popup);
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao aplicar zoom`, error);
    }
  }

  function sideInstallPopupDrag(popup, header) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener('mousedown', (event) => {
      try {
        if (event.button !== 0) return;
        if (event.target.closest('button')) return;
        if (popup.getAttribute('data-tm-maximized') === 'true') return;

        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = popup.offsetLeft;
        startTop = popup.offsetTop;

        imagePopupZIndex += 1;
        popup.style.zIndex = String(imagePopupZIndex);

        event.preventDefault();
        event.stopPropagation();
      } catch (_) {}
    }, true);

    document.addEventListener('mousemove', (event) => {
      if (!dragging) return;

      try {
        const nextLeft = startLeft + (event.clientX - startX);
        const nextTop = startTop + (event.clientY - startY);

        const maxLeft = Math.max(0, window.innerWidth - popup.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - popup.offsetHeight);

        popup.style.left = `${Math.max(0, Math.min(maxLeft, nextLeft))}px`;
        popup.style.top = `${Math.max(0, Math.min(maxTop, nextTop))}px`;

        event.preventDefault();
      } catch (_) {}
    }, true);

    document.addEventListener('mouseup', () => {
      dragging = false;
    }, true);
  }


  function sideInstallImagePan(popup, body) {
    let panning = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let pendingX = 0;
    let pendingY = 0;
    let rafId = 0;

    const flushPan = () => {
      rafId = 0;
      popup.dataset.tmImagePanX = String(pendingX);
      popup.dataset.tmImagePanY = String(pendingY);
      sideApplyPopupImageTransform(popup);
    };

    body.addEventListener('mousedown', (event) => {
      try {
        if (event.button !== 0) return;
        if (event.target.closest('button')) return;

        const bounds = sideGetPopupPanBounds(popup);
        if (!bounds.pannableX && !bounds.pannableY) return;

        panning = true;
        body.setAttribute('data-tm-panning', 'true');

        startX = event.clientX;
        startY = event.clientY;
        startPanX = Number(popup.dataset.tmImagePanX || '0') || 0;
        startPanY = Number(popup.dataset.tmImagePanY || '0') || 0;
        pendingX = startPanX;
        pendingY = startPanY;

        imagePopupZIndex += 1;
        popup.style.zIndex = String(imagePopupZIndex);

        event.preventDefault();
        event.stopPropagation();
      } catch (_) {}
    }, true);

    document.addEventListener('mousemove', (event) => {
      if (!panning) return;

      try {
        const bounds = sideGetPopupPanBounds(popup);
        const rawX = startPanX + (event.clientX - startX);
        const rawY = startPanY + (event.clientY - startY);

        pendingX = bounds.pannableX ? Math.max(-bounds.maxX, Math.min(bounds.maxX, rawX)) : 0;
        pendingY = bounds.pannableY ? Math.max(-bounds.maxY, Math.min(bounds.maxY, rawY)) : 0;

        if (!rafId) {
          rafId = window.requestAnimationFrame(flushPan);
        }

        event.preventDefault();
        event.stopPropagation();
      } catch (_) {}
    }, true);

    document.addEventListener('mouseup', () => {
      if (!panning) return;
      panning = false;
      body.removeAttribute('data-tm-panning');
    }, true);
  }


  function sideInstallPopupResize(popup) {
    const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    let resizing = false;
    let dir = '';
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let startLeft = 0;
    let startTop = 0;

    const minW = 300;
    const minH = 260;

    const beginResize = (event, direction) => {
      try {
        if (event.button !== 0) return;
        if (popup.getAttribute('data-tm-maximized') === 'true') return;

        resizing = true;
        dir = direction;
        startX = event.clientX;
        startY = event.clientY;
        startW = popup.offsetWidth;
        startH = popup.offsetHeight;
        startLeft = popup.offsetLeft;
        startTop = popup.offsetTop;

        imagePopupZIndex += 1;
        popup.style.zIndex = String(imagePopupZIndex);

        event.preventDefault();
        event.stopPropagation();
      } catch (_) {}
    };

    for (const direction of directions) {
      const handle = document.createElement('div');
      handle.setAttribute('data-tm-image-popup-resize', 'true');
      handle.setAttribute('data-tm-image-popup-resize-dir', direction);
      handle.addEventListener('mousedown', (event) => beginResize(event, direction), true);
      popup.appendChild(handle);
    }

    document.addEventListener('mousemove', (event) => {
      if (!resizing) return;

      try {
        let nextLeft = startLeft;
        let nextTop = startTop;
        let nextW = startW;
        let nextH = startH;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        if (dir.includes('e')) {
          nextW = startW + dx;
        }

        if (dir.includes('s')) {
          nextH = startH + dy;
        }

        if (dir.includes('w')) {
          nextW = startW - dx;
          nextLeft = startLeft + dx;
        }

        if (dir.includes('n')) {
          nextH = startH - dy;
          nextTop = startTop + dy;
        }

        if (nextW < minW) {
          if (dir.includes('w')) nextLeft -= (minW - nextW);
          nextW = minW;
        }

        if (nextH < minH) {
          if (dir.includes('n')) nextTop -= (minH - nextH);
          nextH = minH;
        }

        const maxW = window.innerWidth - nextLeft - 8;
        const maxH = window.innerHeight - nextTop - 8;

        nextW = Math.min(nextW, Math.max(minW, maxW));
        nextH = Math.min(nextH, Math.max(minH, maxH));

        nextLeft = Math.max(0, Math.min(nextLeft, window.innerWidth - nextW));
        nextTop = Math.max(0, Math.min(nextTop, window.innerHeight - nextH));

        popup.style.left = `${nextLeft}px`;
        popup.style.top = `${nextTop}px`;
        popup.style.width = `${nextW}px`;
        popup.style.height = `${nextH}px`;

        sideApplyPopupImageTransform(popup);

        event.preventDefault();
        event.stopPropagation();
      } catch (_) {}
    }, true);

    document.addEventListener('mouseup', () => {
      resizing = false;
      dir = '';
    }, true);
  }

  function sideCloseTopImagePopup() {
    try {
      const popups = Array.from(document.querySelectorAll('[data-tm-image-popup="true"]'))
        .filter(node => node instanceof HTMLElement);

      if (!popups.length) return false;

      popups.sort((a, b) => {
        const za = Number(getComputedStyle(a).zIndex || a.style.zIndex || '0') || 0;
        const zb = Number(getComputedStyle(b).zIndex || b.style.zIndex || '0') || 0;
        return zb - za;
      });

      popups[0].remove();
      return true;
    } catch (_) {
      return false;
    }
  }

  function sideInstallPopupEscClose() {
    if (window.__tmEffinityImagePopupEscInstalled) return;
    window.__tmEffinityImagePopupEscInstalled = true;

    document.addEventListener('keydown', (event) => {
      try {
        if (event.key !== 'Escape') return;
        if (!sideCloseTopImagePopup()) return;

        event.preventDefault();
        event.stopPropagation();
      } catch (_) {}
    }, true);
  }

  function sideOpenImagePopup(file) {
    try {
      if (!sideIsPreviewableImage(file)) {
        window.open(file.downloadUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      imagePopupCounter += 1;
      imagePopupZIndex += 1;

      const popup = document.createElement('div');
      popup.setAttribute('data-tm-image-popup', 'true');
      popup.dataset.tmImageZoom = '1';
      popup.dataset.tmImagePanX = '0';
      popup.dataset.tmImagePanY = '0';
      popup.style.left = `${24 + ((imagePopupCounter - 1) % 8) * 28}px`;
      popup.style.top = `${24 + ((imagePopupCounter - 1) % 8) * 28}px`;
      popup.style.zIndex = String(imagePopupZIndex);

      const header = document.createElement('div');
      header.setAttribute('data-tm-image-popup-header', 'true');

      const title = document.createElement('div');
      title.setAttribute('data-tm-image-popup-title', 'true');
      title.title = file.fileName || 'Imagem';
      title.textContent = file.fileName || 'Imagem';

      const center = document.createElement('div');
      center.setAttribute('data-tm-image-popup-actions-center', 'true');

      const download = document.createElement('button');
      download.type = 'button';
      download.setAttribute('data-tm-image-popup-download', 'true');
      download.title = 'Download';
      download.innerHTML = '<span>Download</span><span aria-hidden="true">↓</span>';
      download.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        sideDownloadFile(file.downloadUrl, file.fileName);
      }, true);

      center.appendChild(download);

      const right = document.createElement('div');
      right.setAttribute('data-tm-image-popup-actions-right', 'true');

      const maximize = document.createElement('button');
      maximize.type = 'button';
      maximize.setAttribute('data-tm-image-popup-icon', 'true');
      maximize.title = 'Maximizar';
      maximize.textContent = '□';
      maximize.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const isMax = popup.getAttribute('data-tm-maximized') === 'true';
        if (isMax) {
          popup.removeAttribute('data-tm-maximized');
          maximize.textContent = '□';
          maximize.title = 'Maximizar';
        } else {
          popup.setAttribute('data-tm-maximized', 'true');
          maximize.textContent = '❐';
          maximize.title = 'Restaurar';
        }
      }, true);

      const close = document.createElement('button');
      close.type = 'button';
      close.setAttribute('data-tm-image-popup-icon', 'true');
      close.setAttribute('data-tm-image-popup-close', 'true');
      close.title = 'Fechar';
      close.textContent = '×';
      close.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        popup.remove();
      }, true);

      right.appendChild(maximize);
      right.appendChild(close);

      header.appendChild(title);
      header.appendChild(center);
      header.appendChild(right);

      const body = document.createElement('div');
      body.setAttribute('data-tm-image-popup-body', 'true');

      const img = document.createElement('img');
      img.src = file.downloadUrl;
      img.alt = file.fileName || 'Imagem';
      img.draggable = false;

      img.addEventListener('load', () => {
        try {
          const bodyRect = body.getBoundingClientRect();
          const maxW = Math.max(1, bodyRect.width - 20);
          const maxH = Math.max(1, bodyRect.height - 20);
          const naturalW = img.naturalWidth || 1;
          const naturalH = img.naturalHeight || 1;
          const fit = Math.min(maxW / naturalW, maxH / naturalH, 1);

          popup.dataset.tmImageNaturalW = String(naturalW);
          popup.dataset.tmImageNaturalH = String(naturalH);
          img.style.width = `${naturalW}px`;
          img.style.height = `${naturalH}px`;
          popup.dataset.tmImagePanX = '0';
          popup.dataset.tmImagePanY = '0';
          sideSetPopupImageZoom(popup, fit);
        } catch (_) {
          sideSetPopupImageZoom(popup, 1);
        }
      }, { once: true });

      body.addEventListener('wheel', (event) => {
        try {
          event.preventDefault();
          event.stopPropagation();

          const current = Number(popup.dataset.tmImageZoom || '1') || 1;
          const factor = event.deltaY < 0 ? 1.12 : 0.88;
          sideSetPopupImageZoom(popup, current * factor);
        } catch (error) {
          console.error(`[${SCRIPT_NAME}] falha no zoom por scroll`, error);
        }
      }, { passive: false, capture: true });

      sideInstallImagePan(popup, body);

      body.appendChild(img);
      popup.appendChild(header);
      popup.appendChild(body);

      popup.addEventListener('mousedown', () => {
        imagePopupZIndex += 1;
        popup.style.zIndex = String(imagePopupZIndex);
      }, true);

      sideInstallPopupDrag(popup, header);
      sideInstallPopupResize(popup);
      sideInstallPopupEscClose();
      document.body.appendChild(popup);

      window.addEventListener('resize', () => {
        try {
          if (document.body.contains(popup)) sideApplyPopupImageTransform(popup);
        } catch (_) {}
      });
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao abrir visualizador de imagem`, error);
      window.open(file.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }

  function sideCreateFileCard(file) {
    const card = document.createElement('div');
    card.className = 'rounded-xl bg-card border border-border ease-in-out relative overflow-hidden shadow-sm hover:border-primary/20 duration-200 p-6 hover:shadow-md transition-shadow';
    card.setAttribute('data-tm-api-file-card', 'true');
    card.setAttribute('data-tm-api-file-id', file.id);

    const outer = document.createElement('div');
    outer.className = 'p-4';

    const row = document.createElement('div');
    row.className = 'flex items-start gap-3';

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'shrink-0';
    thumbWrap.appendChild(sideCreateThumb(file));

    const info = document.createElement('div');
    info.className = 'flex-1 min-w-0';

    const title = document.createElement('p');
    title.className = 'text-sm font-medium truncate';
    title.textContent = file.fileName || 'Arquivo';

    const description = document.createElement('p');
    description.className = 'text-xs text-muted-foreground mb-1 line-clamp-1';
    description.textContent = file.description || 'Arquivo recebido via WhatsApp';

    const meta = document.createElement('div');
    meta.className = 'flex items-center gap-2 flex-wrap';

    const badge = document.createElement('div');
    badge.className = 'inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-border bg-card text-card-foreground hover:bg-muted text-xs';
    badge.textContent = sideFileBadge(file);
    meta.appendChild(badge);

    const dateText = sideFormatDate(file.createdAt);
    if (dateText) {
      const date = document.createElement('span');
      date.className = 'text-xs text-muted-foreground';
      date.textContent = dateText;
      meta.appendChild(date);
    }

    info.appendChild(title);
    info.appendChild(description);
    info.appendChild(meta);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold ring-offset-background transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 transform-gpu border-2 border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md focus-visible:ring-gray-500 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:border-gray-600 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 h-8 px-3 text-sm shrink-0';
    button.textContent = '↗ Abrir';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (sideIsPreviewableImage(file)) {
        sideOpenImagePopup(file);
        return;
      }

      window.open(file.downloadUrl, '_blank', 'noopener,noreferrer');
    }, true);

    row.appendChild(thumbWrap);
    row.appendChild(info);
    row.appendChild(button);
    outer.appendChild(row);
    card.appendChild(outer);

    return card;
  }

  function sideSyncFiles(host) {
    if (!host) return;

    if (!sideCurrentTicketId) {
      sideClearRenderedFilesImmediately();
      return;
    }

    const files = sideGetFiles();
    const wanted = new Set(files.map(file => file.id));

    for (const node of Array.from(host.querySelectorAll('[data-tm-api-file-card="true"]'))) {
      if (!(node instanceof HTMLElement)) continue;
      const id = node.getAttribute('data-tm-api-file-id') || '';
      if (!wanted.has(id)) node.remove();
    }

    for (const file of files) {
      let card = host.querySelector(`[data-tm-api-file-card="true"][data-tm-api-file-id="${CSS.escape(file.id)}"]`);
      if (!card) card = sideCreateFileCard(file);
      card.removeAttribute(HIDDEN_ATTR);
      host.appendChild(card);
    }
  }

  function sideApplyView() {
    try {
      sideMarkTabs();

      const host = sideFindHost();
      if (!host) return;

      sideMarkNativeCards(host);
      host.setAttribute('data-tm-side-view', sideNotesMode ? 'notas' : 'geral');

      if (!sideNotesMode) {
        sideSyncFiles(host);
      }

      const nativeNotes = sideFindNativeNotesCard(host);
      if (nativeNotes) {
        nativeNotes.setAttribute('data-tm-native-notes-card', 'true');
        if (sideNotesMode) nativeNotes.removeAttribute(HIDDEN_ATTR);
        else nativeNotes.setAttribute(HIDDEN_ATTR, 'true');
      }

      for (const fileCard of host.querySelectorAll('[data-tm-api-file-card="true"]')) {
        if (!(fileCard instanceof HTMLElement)) continue;
        if (sideNotesMode) fileCard.setAttribute(HIDDEN_ATTR, 'true');
        else fileCard.removeAttribute(HIDDEN_ATTR);
      }
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao aplicar visão Geral/Notas`, error);
    }
  }

  function sideScheduleRender() {
    sideRenderTimers.forEach(clearTimeout);
    sideRenderTimers = [];
    for (const delay of [0, 60, 180, 420]) {
      sideRenderTimers.push(window.setTimeout(sideApplyView, delay));
    }
  }

  function sideSetNotesMode(active) {
    sideNotesMode = !!active;
    if (sideNotesMode) {
      document.documentElement.setAttribute('data-tm-notes-mode', 'true');
    } else {
      document.documentElement.removeAttribute('data-tm-notes-mode');
    }

    sideScheduleRender();

    for (const delay of [0, 40, 100, 220, 420, 800]) {
      window.setTimeout(() => {
        try {
          sideMarkTabs();
          sideApplyView();
        } catch (_) {}
      }, delay);
    }
  }

  function sideEnsureNativeGeralActiveThenNotes() {
    const geral = sideFindTabButton('geral');
    if (geral) geral.click();
    sideSetNotesMode(true);
  }

  function sideInstallTabHandlers() {
    if (window.__tmEffinitySideTabsInstalled) return;
    window.__tmEffinitySideTabsInstalled = true;

    document.addEventListener('click', (event) => {
      try {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const button = target.closest('button');
        if (button) {
          const text = normalizeText(button.textContent).toLowerCase();

          if (text === 'arquivos' || text === 'notas') {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            sideEnsureNativeGeralActiveThenNotes();
            return;
          }

          if (['geral', 'timeline', 'histórico', 'historico', 'msgs'].includes(text)) {
            sideSetNotesMode(false);

            // v12.9: ao voltar de Notas para Geral, o React não reativa visualmente
            // porque a aba real já era Geral. Então apenas restauramos as classes
            // nativas da Geral e removemos estilos temporários.
            if (text === 'geral') {
              window.setTimeout(() => {
                try {
                  const geral = sideFindTabButton('geral');
                  if (geral) {
                    geral.classList.add('bg-background', 'text-foreground', 'shadow-sm');
                    geral.classList.remove('hover:bg-background/50');
                    geral.style.removeProperty('color');
                    geral.style.removeProperty('font-weight');
                    geral.style.removeProperty('background');
                    geral.style.removeProperty('background-color');
                    geral.style.removeProperty('box-shadow');
                  }
                } catch (_) {}
              }, 0);
            }

            return;
          }
        }

        if (target.closest('div.p-2.border.rounded.cursor-pointer')) {
          // v13.0: ao trocar ticket, nunca manter arquivos do ticket anterior.
          // Limpamos imediatamente e só renderizamos novamente quando chegar
          // o /tickets/{id}/files do ticket novo.
          sideCurrentTicketId = '';
          sideClearRenderedFilesImmediately();
          sideSetNotesMode(false);
          sideScheduleRender();

          for (const delay of [80, 180, 360, 700]) {
            window.setTimeout(() => {
              try {
                if (!sideCurrentTicketId) {
                  sideClearRenderedFilesImmediately();
                }
              } catch (_) {}
            }, delay);
          }
        }
      } catch (error) {
        console.error(`[${SCRIPT_NAME}] falha no handler Geral/Notas`, error);
      }
    }, true);
  }

  function refreshSideActiveTabAttribute() {
    sideApplyView();
  }

  function syncSideActiveTabAttribute() {}

  function beginTicketSwapRefresh() {
    sideCurrentTicketId = '';
    sideScheduleRender();
  }

  function ensureTabSwapTicketContext() {
    sideGetCurrentTicketId();
  }

  function cacheCurrentTabBeforeSwap() {}

  function scheduleGeneralFilesNotesSwap() {
    sideScheduleRender();
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
    formatAttendanceDataEmails();
    formatAttendanceDataCpfs();
    formatAttendanceDataEmails();
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
    formatAttendanceDataEmails();
    formatAttendanceDataCpfs();
    formatAttendanceDataEmails();
    formatAttendanceDataBirthDates();
    styleQueueTagsInTicketCards();
    applyUnreadMessageIndicators();
  }

  function reapplyAll() {
    applyCSS();
    renameFilesTabLabelToNotes();
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
    return ['geral', 'timeline', 'arquivos', 'notas', 'histórico', 'historico', 'msgs'].includes(text);
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
      const target = event.target;

      if (target instanceof Element && target.closest('div.p-2.border.rounded.cursor-pointer')) {
        refreshSideActiveTabAttribute();
        beginTicketSwapRefresh();
        scheduleTabAntiFlickerPasses();

        // v9.9: se a troca de ticket acontecer com Arquivos aberto, não forçamos
        // movimentação imediata de Notas/Arquivos. O SPA primeiro termina o render
        // do ticket novo; depois fazemos uma única reaplicação tardia e segura.
        window.setTimeout(() => {
          ensureTabSwapTicketContext();
          scheduleTabAntiFlickerPasses();
          scheduleGeneralFilesNotesSwap();
        }, 180);
      }

      if (!isSidePanelTabTrigger(target)) return;

      const clickedTab = normalizeText(target.closest('button, a, [role="tab"]')?.textContent || '').toLowerCase();
      if (clickedTab) syncSideActiveTabAttribute(clickedTab === 'historico' ? 'histórico' : (clickedTab === 'notas' ? 'arquivos' : clickedTab));

      cacheCurrentTabBeforeSwap();
      scheduleTabAntiFlickerPasses();
      scheduleGeneralFilesNotesSwap();
    }, true);
  }


  function renameFilesTabLabelToNotes() {
    try {
      const panel = findSidePanelWithTabs();
      if (!panel) return;

      for (const button of panel.querySelectorAll('button')) {
        if (!button.querySelector('svg.lucide-file')) continue;

        for (const node of Array.from(button.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE && normalizeText(node.nodeValue) === 'Arquivos') {
            node.nodeValue = 'Notas';
          }
        }

        button.setAttribute('aria-label', 'Notas');
        button.setAttribute('title', 'Notas');
      }
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao renomear aba Arquivos`, error);
    }
  }

  function init() {
    renameFilesTabLabelToNotes();
    refreshSideActiveTabAttribute();
    sideApplyView();
    applyFastAntiFlickerPass();
    reapplyAll();
    stopCardBootMask();
    ensureSidebarStartsCollapsed();
    finalizeAgentBootMask();
    scheduleFavoriteLayer(900);
    scheduleGeneralFilesNotesSwap();
    log(`iniciado v${SCRIPT_VERSION}`);
  }

  function boot() {
    sideInstallTabHandlers();
    init();
    startObserver();
    startFavoriteLayer();
  }

  installMessageApiInterceptors();

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
