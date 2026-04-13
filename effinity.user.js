// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      3.1
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
  const SCRIPT_VERSION = '3.1';

  const STYLE_ID = 'tm-effinity-style';
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

  const MAX_SIDEBAR_ATTEMPTS = 10;
  const COPY_ICON_URL = 'https://i.imgur.com/0SJagfY.png';

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

    [${UPPERCASE_NAME_ATTR}="true"] {
      text-transform: uppercase !important;
    }

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

    /* ==========================================================================
       Dados do Atendimento - clique para copiar
       ========================================================================== */

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
  `;

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

    if (offlineControl && offlineControl.parentElement !== actionsWrapper) {
      actionsWrapper.appendChild(offlineControl);
    }

    if (sendHsmButton && sendHsmButton.parentElement !== actionsWrapper) {
      actionsWrapper.appendChild(sendHsmButton);
    }

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

    const spans = infoRow.querySelectorAll('span.flex.items-center.gap-1');
    for (const span of spans) {
      const text = normalizeText(span.textContent);
      if (text.includes('Criado há')) {
        return span;
      }
    }

    return null;
  }

  function findTicketInfoTarget(topRow) {
    if (!topRow) return null;
    return topRow.querySelector('div.min-w-0.flex-1');
  }

  function findTicketAvatar(topRow) {
    if (!topRow) return null;
    return topRow.querySelector('div.w-10.h-10.flex-shrink-0.rounded-full');
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
    const topRows = findTicketHeaderTopRows();

    for (const topRow of topRows) {
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

      hideElement(infoRow);

      const avatar = findTicketAvatar(topRow);
      hideElement(avatar);

      const ticketContainer = topRow.parentElement;
      if (ticketContainer) {
        ticketContainer.setAttribute(TICKET_HEADER_ATTR, 'true');
      }
    }
  }

  function isTicketListCard(card) {
    if (!card || !(card instanceof HTMLElement)) return false;

    const text = normalizeText(card.textContent);

    return (
      text.includes('Última atividade:') &&
      card.querySelector('.lucide-user') &&
      (
        card.querySelector('.lucide-phone') ||
        card.querySelector('.lucide-minus') ||
        card.querySelector('.lucide-arrow-down-left') ||
        card.querySelector('.lucide-arrow-up-right')
      )
    );
  }

  function getAllTicketListCards() {
    const candidates = document.querySelectorAll('div.p-2.border.rounded.cursor-pointer');
    return Array.from(candidates).filter(isTicketListCard);
  }

  function hideProtocolAndPriority(card) {
    const protocolRow = card.querySelector('div.flex.items-center.gap-1');
    if (!protocolRow) return;

    const children = Array.from(protocolRow.children);

    for (const child of children) {
      if (!(child instanceof HTMLElement)) continue;

      const text = normalizeText(child.textContent);

      if (child.matches('span.text-xs') && /^(✅|☑️|✔️)$/.test(text)) {
        hideElement(child);
        continue;
      }

      if (child.matches('span.font-medium.text-sm.truncate')) {
        hideElement(child);
        continue;
      }

      if (text === 'Normal' || text.includes('Normal')) {
        hideElement(child);
      }
    }

    const visibleChildren = children.filter(el => {
      if (!(el instanceof HTMLElement)) return false;
      return el.getAttribute(HIDDEN_ATTR) !== 'true';
    });

    if (visibleChildren.length === 0) {
      hideElement(protocolRow);
    }
  }

  function hidePhoneInCard(card) {
    const phoneIcons = card.querySelectorAll('.lucide-phone');

    for (const icon of phoneIcons) {
      const phoneWrapper = icon.closest('span.flex.items-center.gap-1.text-xs.text-muted-foreground');
      if (phoneWrapper) {
        hideElement(phoneWrapper);
      }
    }
  }

  function hideStatusTags(card) {
    const badgeCandidates = card.querySelectorAll('span.inline-flex, div.inline-flex');

    for (const badge of badgeCandidates) {
      if (!(badge instanceof HTMLElement)) continue;

      const text = normalizeText(badge.textContent);

      if (text === 'Contato' || text.includes('Contato')) {
        hideElement(badge);
        continue;
      }

      if (text === 'Em Atendimento' || text.includes('Em Atendimento')) {
        hideElement(badge);
        continue;
      }

      if (text === 'Normal' || text.includes('Normal')) {
        hideElement(badge);
      }
    }
  }

  function cleanTicketListCards() {
    const cards = getAllTicketListCards();

    for (const card of cards) {
      hideProtocolAndPriority(card);
      hidePhoneInCard(card);
      hideStatusTags(card);
    }
  }

  function uppercaseTicketHeaderNames() {
    const headerNames = document.querySelectorAll(
      'div.px-4.py-3.flex.items-center.justify-between.gap-4 h2.font-semibold.text-card-foreground.truncate'
    );

    for (const nameEl of headerNames) {
      markUppercase(nameEl);
    }
  }

  function uppercaseTicketListCardNames() {
    const cards = getAllTicketListCards();

    for (const card of cards) {
      const nameEls = card.querySelectorAll(
        'span.flex.items-center.gap-1.text-xs.text-card-foreground > span.font-medium'
      );

      for (const nameEl of nameEls) {
        markUppercase(nameEl);
      }
    }
  }

  function applyUppercaseToCustomerNames() {
    uppercaseTicketHeaderNames();
    uppercaseTicketListCardNames();
  }

  function normalizeAttendanceDataPhones() {
    const cards = document.querySelectorAll('div.rounded-xl.bg-card.border.border-border, div.rounded-lg.bg-card.border.border-border');

    for (const card of cards) {
      const title = card.querySelector('h3');
      if (!title) continue;

      const titleText = normalizeText(title.textContent);
      if (titleText !== 'Dados do Atendimento') continue;

      const labels = card.querySelectorAll('span');
      let phoneLabelFound = false;

      for (const span of labels) {
        const text = normalizeText(span.textContent);

        if (text === 'Telefone') {
          phoneLabelFound = true;
          continue;
        }

        if (!phoneLabelFound) continue;

        if (
          span.matches('span.text-sm.text-card-foreground.break-words.min-w-0') &&
          /^\d{12,14}$/.test(normalizeText(span.textContent))
        ) {
          const original = normalizeText(span.textContent);
          const normalized = removeCountryCode55(original);

          if (original !== normalized) {
            span.textContent = normalized;
          }

          span.setAttribute(PHONE_NORMALIZED_ATTR, 'true');
          break;
        }
      }
    }
  }

  function findAttendanceDataCards() {
    const cards = document.querySelectorAll('div.rounded-xl.bg-card.border.border-border, div.rounded-lg.bg-card.border.border-border');
    const result = [];

    for (const card of cards) {
      const title = card.querySelector('h3');
      if (!title) continue;

      if (normalizeText(title.textContent) === 'Dados do Atendimento') {
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

    if (toast._tmHideTimer) {
      clearTimeout(toast._tmHideTimer);
    }

    toast.setAttribute(COPY_TOAST_VISIBLE_ATTR, 'true');

    toast._tmHideTimer = setTimeout(() => {
      toast.removeAttribute(COPY_TOAST_VISIBLE_ATTR);
    }, 1300);
  }

  function findValueSpanByLabel(card, labelText) {
    const labelSpans = card.querySelectorAll('span');

    for (const label of labelSpans) {
      if (normalizeText(label.textContent) !== labelText) continue;

      let row = label.parentElement;
      while (row && row !== card) {
        const valueSpan = row.querySelector('span.text-sm.text-card-foreground.break-words.min-w-0');
        if (valueSpan) {
          return valueSpan;
        }
        row = row.parentElement;
      }
    }

    return null;
  }

  function bindCopyOnClick(valueEl, card, fieldName) {
    if (!valueEl || !(valueEl instanceof HTMLElement)) return;
    if (valueEl.getAttribute(COPY_VALUE_ATTR) === 'true') return;

    valueEl.setAttribute(COPY_VALUE_ATTR, 'true');
    valueEl.setAttribute('title', `Clique para copiar ${fieldName.toLowerCase()}`);

    valueEl.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const textToCopy = normalizeText(valueEl.textContent);
      if (!textToCopy) return;

      const copied = await copyTextToClipboard(textToCopy);
      if (copied) {
        showCopyToast(card);
      }
    });
  }

  function enableCopyOnAttendanceData() {
    const cards = findAttendanceDataCards();

    for (const card of cards) {
      card.setAttribute(COPY_CARD_ATTR, 'true');
      ensureCopyToast(card);

      const targets = [
        ['Nome', 'nome'],
        ['Nascimento', 'nascimento'],
        ['CPF', 'cpf'],
        ['Telefone', 'telefone']
      ];

      for (const [labelText, fieldName] of targets) {
        const valueEl = findValueSpanByLabel(card, labelText);
        if (!valueEl) continue;

        bindCopyOnClick(valueEl, card, fieldName);
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
  }

  function reapplyAll() {
    applyCSS();
    applyDynamicAdjustments();
  }

  let scheduledPasses = [];

  function scheduleReapplyPasses() {
    scheduledPasses.forEach(clearTimeout);
    scheduledPasses = [];

    const delays = [150, 400, 800, 1500, 2500, 4000];
    for (const delay of delays) {
      scheduledPasses.push(setTimeout(reapplyAll, delay));
    }
  }

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
