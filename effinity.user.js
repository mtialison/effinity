// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      10.2
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
  const SCRIPT_VERSION = '10.2';

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
    /* ── Aba Arquivos renomeada visualmente para Notas ────────────────
       CSS aplicado no document-start para evitar flicker do texto original. */
    button:has(svg.lucide-file.h-3.w-3.flex-shrink-0) {
      font-size: 0 !important;
    }

    button:has(svg.lucide-file.h-3.w-3.flex-shrink-0)::after {
      content: 'Notas' !important;
      display: inline !important;
      font-size: 11px !important;
      line-height: 1 !important;
      font-weight: inherit !important;
      color: inherit !important;
      white-space: nowrap !important;
    }

    button:has(svg.lucide-file.h-3.w-3.flex-shrink-0) svg {
      width: 0.75rem !important;
      height: 0.75rem !important;
      flex-shrink: 0 !important;
    }

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


    /* ── Troca Geral ↔ Arquivos: máscara discreta durante pré-carga ───── */
    html[data-tm-tab-swap-priming="true"] .hidden.xl\:flex.xl\:col-span-1 {
      opacity: 0 !important;
      transition: opacity 0.06s ease !important;
      pointer-events: none !important;
    }

    /* ── Troca Geral ↔ Arquivos: anti-stale imediato ao trocar ticket ─── */
    html[data-tm-tab-swap-ticket-switching="true"] [data-tm-tab-swap-role="file"],
    html[data-tm-tab-swap-ticket-switching="true"] [data-tm-tab-swap-role="notes"] {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }



    /* ── Troca Geral ↔ Arquivos: anti-flicker da aba Arquivos ───────────
       Enquanto Arquivos está ativa, os cards nativos de arquivo do SPA ficam
       ocultos no primeiro paint; o script insere apenas o card de Notas. */
    html[data-tm-side-active-tab="arquivos"] .hidden.xl\:flex.xl\:col-span-1
      .space-y-3 > .rounded-xl.bg-card.border.border-border:has(.lucide-external-link):not(:has(textarea)):not([data-tm-tab-swap-role="notes"]),
    html[data-tm-side-active-tab="arquivos"] .hidden.xl\:flex.xl\:col-span-1
      .space-y-3 > .rounded-xl.bg-card.border.border-border:has(img):not(:has(textarea)):not([data-tm-tab-swap-role="notes"]),
    html[data-tm-side-active-tab="arquivos"] .hidden.xl\:flex.xl\:col-span-1
      [data-tm-tab-swap-role="file-original"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }



    /* ── Troca Geral ↔ Arquivos: bloqueio total do conteúdo nativo da aba Arquivos ──
       v9.9: regra independente da aba ativa. Isso impede o primeiro paint dos
       arquivos/estado vazio nativos antes do JS atualizar data-tm-side-active-tab. */
    .hidden.xl\\:flex.xl\\:col-span-1
      .h-full.w-full.overflow-auto > .p-3 > .space-y-3 > .rounded-xl.bg-card.border.border-border:has(.lucide-external-link):not(:has(textarea)):not([data-tm-tab-swap-role="file"]):not([data-tm-tab-swap-role="notes"]),
    .hidden.xl\\:flex.xl\\:col-span-1
      .h-full.w-full.overflow-auto > .p-3 > .space-y-3 > .rounded-xl.bg-card.border.border-border:has(img):not(:has(textarea)):not([data-tm-tab-swap-role="file"]):not([data-tm-tab-swap-role="notes"]),
    .hidden.xl\\:flex.xl\\:col-span-1
      .h-full.w-full.overflow-auto > .p-3 > .flex.flex-col.items-center.justify-center.h-full.text-center.gap-3 {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    /* ── Troca Geral ↔ Arquivos: ocultar estado vazio nativo em Arquivos ──
       O card de Notas Internas é o conteúdo desejado nessa aba. O estado
       "Nenhum arquivo anexado" do SPA não deve aparecer junto com ele. */
    html[data-tm-side-active-tab="arquivos"] .hidden.xl\:flex.xl\:col-span-1
      .h-full.w-full.overflow-auto > .p-3 > .flex.flex-col.items-center.justify-center.h-full.text-center.gap-3,
    html[data-tm-side-active-tab="arquivos"] .hidden.xl\:flex.xl\:col-span-1
      .h-full.w-full.overflow-auto > .p-3 > [data-tm-tab-swap-role="file-empty"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }


    /* ── Aba Notas: garantir interação no card de Notas Internas ─────────
       v10.2: o conteúdo nativo da antiga aba Arquivos continua mascarado,
       mas o card real de Notas sempre fica clicável e acima da máscara. */
    html[data-tm-side-active-tab="arquivos"] [data-tm-tab-swap-role="notes"] {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      position: relative !important;
      z-index: 20 !important;
    }

    html[data-tm-side-active-tab="arquivos"] [data-tm-tab-swap-role="notes"] *,
    html[data-tm-side-active-tab="arquivos"] [data-tm-tab-swap-role="notes"] textarea,
    html[data-tm-side-active-tab="arquivos"] [data-tm-tab-swap-role="notes"] button {
      pointer-events: auto !important;
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
   * SEÇÃO: TROCA SEGURA ENTRE ABAS GERAL E ARQUIVOS (24)
   * Objetivo: exibir arquivos na aba Geral e Notas Internas na aba Arquivos.
   * Estratégia v9.9: arquivos renderizados direto da API /tickets/{id}/files.
   * Sem clique automático em aba, sem pré-carga visual e sem depender do DOM
   * da aba Arquivos para montar a aba Geral.
   * ====================================================================== */
  const TAB_SWAP_DEPOT_ID = 'tm-effinity-tab-swap-depot';
  const TAB_SWAP_READY_ATTR = 'data-tm-tab-swap-ready';
  const TAB_SWAP_ROLE_ATTR = 'data-tm-tab-swap-role';
  const TAB_SWAP_SOURCE_ATTR = 'data-tm-tab-swap-source';
  const TAB_SWAP_TICKET_ATTR = 'data-tm-tab-swap-ticket';
  const TAB_SWAP_API_FILE_ID_ATTR = 'data-tm-api-file-id';

  const TICKET_FILES_BY_KEY = new Map();
  const TICKET_FILES_CACHE_LIMIT = 80;

  let activeTabSwapTicketKey = '';

  function ensureTabSwapDepot() {
    let depot = document.getElementById(TAB_SWAP_DEPOT_ID);
    if (depot) return depot;

    depot = document.createElement('div');
    depot.id = TAB_SWAP_DEPOT_ID;
    depot.setAttribute('aria-hidden', 'true');
    depot.style.display = 'none';
    depot.style.position = 'fixed';
    depot.style.width = '0';
    depot.style.height = '0';
    depot.style.overflow = 'hidden';
    depot.style.pointerEvents = 'none';

    const parent = document.body || document.documentElement;
    parent.appendChild(depot);
    return depot;
  }

  function showElement(el) {
    if (!el || !(el instanceof HTMLElement)) return;
    el.removeAttribute(HIDDEN_ATTR);
  }

  function getCurrentTicketSwapKey() {
    try {
      const header = document.querySelector('div.px-4.py-3.flex.items-center.justify-between.gap-4');
      const name = normalizeText(header?.querySelector('h2')?.textContent || '');
      const phone = normalizeText(header?.querySelector('a[href^="tel:"]')?.getAttribute('href') || '');
      const selectedCard = document.querySelector('div.p-2.border.rounded.cursor-pointer.border-blue-500') ||
        document.querySelector('div.p-2.border.rounded.cursor-pointer.bg-blue-500');
      const protocol = normalizeText(selectedCard?.textContent || '').slice(0, 120);
      const key = [name, phone, protocol].filter(Boolean).join('|');
      return key || location.pathname;
    } catch (_) {
      return location.pathname;
    }
  }

  function ensureTabSwapTicketContext() {
    const key = getCurrentTicketSwapKey();
    if (key === activeTabSwapTicketKey) return;
    activeTabSwapTicketKey = key;
    hideVisibleTabSwapNodesNow();
  }

  function beginTicketSwapRefresh() {
    try {
      activeTabSwapTicketKey = '';
      hideVisibleTabSwapNodesNow();
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao iniciar troca visual de ticket`, error);
    }
  }

  function getButtonText(button) {
    const text = normalizeText(button?.textContent || '').toLowerCase();
    if (text === 'notas') return 'arquivos';
    return text;
  }

  function findSidePanelWithTabs() {
    for (const button of document.querySelectorAll('button')) {
      if (getButtonText(button) !== 'geral') continue;

      const panel = button.closest('.flex.flex-col.h-full.min-h-0') ||
        button.closest('.hidden.xl\\:flex') ||
        button.closest('.flex.flex-col');

      if (!panel) continue;

      const labels = Array.from(panel.querySelectorAll('button')).map(getButtonText);
      if (labels.includes('geral') && labels.includes('arquivos')) return panel;
    }

    return null;
  }

  function findActiveSideTabName(panel) {
    if (!panel) return '';

    for (const button of panel.querySelectorAll('button')) {
      const text = getButtonText(button);
      if (!['geral', 'arquivos', 'timeline', 'histórico', 'historico', 'msgs'].includes(text)) continue;

      const isActive =
        button.classList.contains('bg-background') &&
        button.classList.contains('text-foreground') &&
        button.classList.contains('shadow-sm');

      if (isActive) return text === 'historico' ? 'histórico' : text;
    }

    return '';
  }

  function syncSideActiveTabAttribute(tabName) {
    try {
      const normalized = String(tabName || '').toLowerCase();
      if (normalized) {
        document.documentElement.setAttribute('data-tm-side-active-tab', normalized);
      } else {
        document.documentElement.removeAttribute('data-tm-side-active-tab');
      }
    } catch (_) {}
  }

  function refreshSideActiveTabAttribute() {
    const panel = findSidePanelWithTabs();
    syncSideActiveTabAttribute(findActiveSideTabName(panel));
  }

  function findSidePanelContentShell(panel) {
    if (!panel) return null;

    for (const child of Array.from(panel.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (
        child.classList.contains('relative') &&
        child.classList.contains('overflow-hidden') &&
        child.classList.contains('flex-1')
      ) {
        return child;
      }
    }

    return panel.querySelector('.relative.overflow-hidden.flex-1');
  }

  function findGeneralContentHost(shell) {
    if (!shell) return null;

    for (const host of shell.querySelectorAll('div.flex.flex-col.gap-4.p-3')) {
      if (findNotesCardIn(host) || normalizeText(host.textContent).includes('Dados do Atendimento')) {
        return host;
      }
    }

    return null;
  }

  function findFilesContentHost(shell) {
    if (!shell) return null;

    for (const host of shell.querySelectorAll('div.space-y-3')) {
      const text = normalizeText(host.textContent);
      if (text.includes('Mídia WhatsApp') || text.includes('Arquivo recebido') || text.includes('Mídia recebida') || text.includes('Abrir')) {
        return host;
      }
    }

    const p3 = shell.querySelector('.h-full.w-full.overflow-auto > .p-3');
    return p3 instanceof HTMLElement ? p3 : null;
  }

  function getCurrentTabContentHost(panel) {
    const shell = findSidePanelContentShell(panel);
    const tab = findActiveSideTabName(panel);

    if (tab === 'geral') return findGeneralContentHost(shell);
    if (tab === 'arquivos') return findFilesContentHost(shell);

    return null;
  }

  function findCardByHeading(root, headingText) {
    if (!root) return null;

    for (const title of root.querySelectorAll('h3')) {
      if (normalizeText(title.textContent) !== headingText) continue;
      const card = title.closest('.rounded-xl.bg-card.border.border-border');
      if (card instanceof HTMLElement) return card;
    }

    return null;
  }

  function findNotesCardIn(root) {
    return findCardByHeading(root, 'Notas Internas');
  }

  function isSwappableFileNode(node) {
    if (!(node instanceof HTMLElement)) return false;
    if (node.getAttribute(TAB_SWAP_ROLE_ATTR) === 'notes') return false;
    if (findNotesCardIn(node)) return false;

    const text = normalizeText(node.textContent);
    const hasOpenButton = Array.from(node.querySelectorAll('button')).some(button => normalizeText(button.textContent) === 'Abrir');
    const hasFileMarker = text.includes('Mídia WhatsApp') || text.includes('Arquivo recebido') || text.includes('Mídia recebida') || !!node.querySelector('img');

    return hasOpenButton && hasFileMarker;
  }


  function isNativeFilesEmptyState(node) {
    if (!(node instanceof HTMLElement)) return false;
    if (findNotesCardIn(node)) return false;

    const text = normalizeText(node.textContent);
    return text.includes('Nenhum arquivo anexado') ||
      text.includes('Arquivos enviados durante o atendimento aparecerão aqui');
  }

  function hideNativeFilesEmptyState(host) {
    try {
      if (!host) return;

      for (const node of Array.from(host.children)) {
        if (!isNativeFilesEmptyState(node)) continue;
        node.setAttribute(TAB_SWAP_ROLE_ATTR, 'file-empty');
        hideElement(node);
      }
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao ocultar estado vazio de Arquivos`, error);
    }
  }

  function hideVisibleTabSwapNodesNow() {
    const panel = findSidePanelWithTabs();
    if (!panel) return;

    for (const node of panel.querySelectorAll(`[${TAB_SWAP_ROLE_ATTR}="file"], [${TAB_SWAP_ROLE_ATTR}="notes"]`)) {
      if (!(node instanceof HTMLElement)) continue;
      hideElement(node);
    }
  }

  function normalizeTicketFile(file) {
    if (!file || typeof file !== 'object') return null;

    const id = file.id || file.fileId || file.downloadUrl || file.fileName;
    const downloadUrl = String(file.downloadUrl || file.url || file.publicUrl || '').trim();
    const fileName = String(file.fileName || file.filename || file.name || file.filePath || 'Arquivo').trim();

    if (!id || !downloadUrl) return null;

    return {
      id: String(id),
      ticketId: file.ticketId || null,
      fileName,
      description: String(file.description || 'Arquivo recebido via WhatsApp').trim(),
      category: String(file.category || '').trim(),
      mimeType: String(file.mimeType || '').trim(),
      thumbnailUrl: String(file.thumbnailUrl || '').trim(),
      downloadUrl,
      createdAt: file.createdAt || null,
      formattedSize: String(file.formattedSize || '').trim(),
      icon: String(file.icon || '').trim()
    };
  }

  function processTicketFilesPayload(payload, requestUrl = '') {
    try {
      if (!payload || typeof payload !== 'object') return;
      if (!Array.isArray(payload.files) && !String(requestUrl || '').includes('/files')) return;

      const files = Array.isArray(payload.files)
        ? payload.files.map(normalizeTicketFile).filter(Boolean)
        : [];

      const currentKey = getCurrentTicketSwapKey();
      if (!currentKey) return;

      TICKET_FILES_BY_KEY.set(currentKey, files);

      if (TICKET_FILES_BY_KEY.size > TICKET_FILES_CACHE_LIMIT) {
        const overflow = TICKET_FILES_BY_KEY.size - TICKET_FILES_CACHE_LIMIT;
        Array.from(TICKET_FILES_BY_KEY.keys()).slice(0, overflow).forEach(key => TICKET_FILES_BY_KEY.delete(key));
      }

      scheduleGeneralFilesNotesSwap();
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao processar arquivos do ticket`, error);
    }
  }

  function formatTicketFileDate(value) {
    const date = parseApiDate(value);
    if (!date) return '';
    return `${date.toLocaleDateString('pt-BR')} às ${formatApiTime(date)}`;
  }

  function getTicketFileBadge(file) {
    const category = String(file?.category || '').toUpperCase();
    const mimeType = String(file?.mimeType || '').toLowerCase();

    if (category === 'WHATSAPP_MEDIA') return 'Mídia WhatsApp';
    if (category) return category;
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.includes('pdf')) return 'PDF';
    return 'Documento';
  }

  function isImageTicketFile(file) {
    const mimeType = String(file?.mimeType || '').toLowerCase();
    const icon = String(file?.icon || '').toLowerCase();
    return mimeType.startsWith('image/') || icon === 'image';
  }

  function buildFileThumb(file) {
    const box = document.createElement('div');
    box.className = 'relative h-12 w-12 rounded overflow-hidden bg-muted group flex items-center justify-center';

    if (isImageTicketFile(file) && file.thumbnailUrl) {
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

  function createApiFileCard(file) {
    const card = document.createElement('div');
    card.className = 'rounded-xl bg-card border border-border ease-in-out relative overflow-hidden shadow-sm hover:border-primary/20 duration-200 p-6 hover:shadow-md transition-shadow';
    card.setAttribute(TAB_SWAP_ROLE_ATTR, 'file');
    card.setAttribute(TAB_SWAP_SOURCE_ATTR, 'api-files');
    card.setAttribute(TAB_SWAP_TICKET_ATTR, activeTabSwapTicketKey);
    card.setAttribute(TAB_SWAP_READY_ATTR, 'true');
    card.setAttribute(TAB_SWAP_API_FILE_ID_ATTR, file.id);

    const outer = document.createElement('div');
    outer.className = 'p-4';

    const row = document.createElement('div');
    row.className = 'flex items-start gap-3';

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'shrink-0';
    thumbWrap.appendChild(buildFileThumb(file));

    const info = document.createElement('div');
    info.className = 'flex-1 min-w-0';

    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-start justify-between gap-2 mb-1';

    const title = document.createElement('p');
    title.className = 'text-sm font-medium truncate';
    title.textContent = file.fileName || 'Arquivo';
    titleRow.appendChild(title);

    const description = document.createElement('p');
    description.className = 'text-xs text-muted-foreground mb-1 line-clamp-1';
    description.textContent = file.description || 'Arquivo recebido via WhatsApp';

    const meta = document.createElement('div');
    meta.className = 'flex items-center gap-2 flex-wrap';

    const badge = document.createElement('div');
    badge.className = 'inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-border bg-card text-card-foreground hover:bg-muted text-xs';
    badge.textContent = getTicketFileBadge(file);
    meta.appendChild(badge);

    const dateText = formatTicketFileDate(file.createdAt);
    if (dateText) {
      const date = document.createElement('span');
      date.className = 'text-xs text-muted-foreground';
      date.textContent = dateText;
      meta.appendChild(date);
    }

    info.appendChild(titleRow);
    info.appendChild(description);
    info.appendChild(meta);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold ring-offset-background transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 transform-gpu border-2 border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md focus-visible:ring-gray-500 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:border-gray-600 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 h-8 px-3 text-sm shrink-0';
    button.textContent = '↗ Abrir';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.open(file.downloadUrl, '_blank', 'noopener,noreferrer');
    }, true);

    row.appendChild(thumbWrap);
    row.appendChild(info);
    row.appendChild(button);
    outer.appendChild(row);
    card.appendChild(outer);

    return card;
  }

  function getCurrentApiFiles() {
    ensureTabSwapTicketContext();
    return TICKET_FILES_BY_KEY.get(activeTabSwapTicketKey) || [];
  }

  function findApiFileCard(fileId) {
    const selector = `[${TAB_SWAP_ROLE_ATTR}="file"][${TAB_SWAP_API_FILE_ID_ATTR}="${CSS.escape(String(fileId))}"]`;
    return Array.from(document.querySelectorAll(selector))
      .find(node => node instanceof HTMLElement && node.getAttribute(TAB_SWAP_TICKET_ATTR) === activeTabSwapTicketKey) || null;
  }

  function syncApiFilesToGeneral(host) {
    if (!host) return;
    const files = getCurrentApiFiles();
    const wanted = new Set(files.map(file => file.id));

    for (const node of host.querySelectorAll(`[${TAB_SWAP_ROLE_ATTR}="file"]`)) {
      if (!(node instanceof HTMLElement)) continue;
      const id = node.getAttribute(TAB_SWAP_API_FILE_ID_ATTR) || '';
      const ticket = node.getAttribute(TAB_SWAP_TICKET_ATTR) || '';
      if (ticket !== activeTabSwapTicketKey || !wanted.has(id)) {
        hideElement(node);
        ensureTabSwapDepot().appendChild(node);
      }
    }

    for (const file of files) {
      let card = findApiFileCard(file.id);
      if (!card) card = createApiFileCard(file);
      showElement(card);
      host.appendChild(card);
    }
  }

  function cacheNotesCardFromHost(host) {
    try {
      const notesCard = findNotesCardIn(host);
      if (!notesCard) return null;

      const depot = ensureTabSwapDepot();
      notesCard.setAttribute(TAB_SWAP_ROLE_ATTR, 'notes');
      notesCard.setAttribute(TAB_SWAP_SOURCE_ATTR, 'geral');
      notesCard.setAttribute(TAB_SWAP_TICKET_ATTR, activeTabSwapTicketKey);
      showElement(notesCard);
      bindNotesCardInteractionSafety(notesCard);
      depot.appendChild(notesCard);
      return notesCard;
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao guardar Notas Internas`, error);
      return null;
    }
  }

  function cacheFileNodesFromHost(host) {
    try {
      if (!host) return [];

      hideNativeFilesEmptyState(host);
      const fileNodes = Array.from(host.children).filter(isSwappableFileNode);

      for (const node of fileNodes) {
        node.setAttribute(TAB_SWAP_ROLE_ATTR, 'file-original');
        hideElement(node);
      }

      return fileNodes;
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao ocultar Arquivos originais`, error);
      return [];
    }
  }

  function getCachedNotesCard() {
    return Array.from(ensureTabSwapDepot().querySelectorAll(`[${TAB_SWAP_ROLE_ATTR}="notes"]`))
      .find(node => node instanceof HTMLElement && node.getAttribute(TAB_SWAP_TICKET_ATTR) === activeTabSwapTicketKey) || null;
  }

  function appendApiFilesToGeneral(host) {
    if (!host) return;
    ensureTabSwapTicketContext();

    const notesCard = findNotesCardIn(host);
    if (notesCard) {
      notesCard.setAttribute(TAB_SWAP_ROLE_ATTR, 'notes');
      notesCard.setAttribute(TAB_SWAP_TICKET_ATTR, activeTabSwapTicketKey);
      hideElement(notesCard);
      cacheNotesCardFromHost(host);
    }

    syncApiFilesToGeneral(host);
  }


  function bindNotesCardInteractionSafety(notesCard) {
    try {
      if (!notesCard || !(notesCard instanceof HTMLElement)) return;

      notesCard.style.pointerEvents = 'auto';
      notesCard.style.position = notesCard.style.position || 'relative';
      notesCard.style.zIndex = notesCard.style.zIndex || '20';

      if (notesCard.getAttribute('data-tm-notes-interaction-bound') === 'true') {
        return;
      }

      notesCard.setAttribute('data-tm-notes-interaction-bound', 'true');

      const syncButtonState = () => {
        try {
          const textarea = notesCard.querySelector('textarea');
          const button = Array.from(notesCard.querySelectorAll('button')).find(btn =>
            normalizeText(btn.textContent).includes('Adicionar Nota')
          );

          if (!textarea || !button) return;

          const hasText = normalizeText(textarea.value).length > 0;
          if (hasText) {
            button.disabled = false;
            button.removeAttribute('disabled');
            button.style.pointerEvents = 'auto';
          }
        } catch (_) {}
      };

      notesCard.addEventListener('input', syncButtonState, true);
      notesCard.addEventListener('keyup', syncButtonState, true);
      notesCard.addEventListener('focusin', syncButtonState, true);

      window.setTimeout(syncButtonState, 0);
      window.setTimeout(syncButtonState, 120);
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao proteger interação das notas`, error);
    }
  }

  function appendCachedNotesToFiles(host) {
    if (!host) return;
    ensureTabSwapTicketContext();
    hideNativeFilesEmptyState(host);

    // v9.9: nunca remove/move os arquivos nativos da aba Arquivos.
    // Apenas oculta em CSS/atributo para não quebrar o ciclo de renderização do SPA
    // ao trocar de ticket com a aba Arquivos aberta.
    cacheFileNodesFromHost(host);

    const notesCard = getCachedNotesCard();
    if (!notesCard) return;

    if (notesCard.parentElement !== host) {
      showElement(notesCard);
      notesCard.setAttribute(TAB_SWAP_READY_ATTR, 'true');
      bindNotesCardInteractionSafety(notesCard);
      host.appendChild(notesCard);
    } else {
      showElement(notesCard);
      bindNotesCardInteractionSafety(notesCard);
    }
  }

  function cacheCurrentTabBeforeSwap() {
    try {
      const panel = findSidePanelWithTabs();
      if (!panel) return;

      const tab = findActiveSideTabName(panel);
      syncSideActiveTabAttribute(tab);
      const host = getCurrentTabContentHost(panel);
      if (!host) return;

      if (tab === 'geral') {
        cacheNotesCardFromHost(host);
      } else if (tab === 'arquivos') {
        cacheFileNodesFromHost(host);
      }
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha no cache pré-troca Geral/Arquivos`, error);
    }
  }

  function applyGeneralFilesNotesSwap() {
    try {
      ensureTabSwapTicketContext();
      const panel = findSidePanelWithTabs();
      if (!panel) return;

      const tab = findActiveSideTabName(panel);
      syncSideActiveTabAttribute(tab);
      const host = getCurrentTabContentHost(panel);
      if (!host) return;

      if (tab === 'geral') {
        appendApiFilesToGeneral(host);
      } else if (tab === 'arquivos') {
        appendCachedNotesToFiles(host);
      }
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] falha ao trocar Geral/Arquivos`, error);
    }
  }

  let tabSwapTimers = [];
  function scheduleGeneralFilesNotesSwap() {
    tabSwapTimers.forEach(clearTimeout);
    tabSwapTimers = [];

    for (const delay of [0, 40, 100, 220, 420]) {
      tabSwapTimers.push(window.setTimeout(applyGeneralFilesNotesSwap, delay));
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
