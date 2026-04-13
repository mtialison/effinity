// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Ajustes visuais e ocultação de elementos no Pulse Effinity
// @author       Alison
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /*
   * =========================================================
   * 1) CSS BASE
   * =========================================================
   */
  const baseCss = `
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
  `;

  /*
   * =========================================================
   * 2) SEÇÃO PARA OCULTAR ELEMENTOS POR CSS
   * =========================================================
   */
  const hiddenCssSelectors = [];

  /*
   * =========================================================
   * 3) SEÇÃO PARA OCULTAR ELEMENTOS POR TEXTO
   * =========================================================
   */
  const hiddenCardsByTitle = [
    'Informações do Cliente',
    'Resumo do Ticket'
  ];

  const hiddenButtonsByText = [
    'Meta'
  ];

  const hiddenLinksByText = [];

  const hiddenGenericText = [];

  const hiddenPartialTitles = [
    'Gestão de Tickets'
  ];

  function norm(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function buildHiddenCss() {
    if (!hiddenCssSelectors.length) return '';

    return hiddenCssSelectors
      .map((selector) => `${selector} { display: none !important; }`)
      .join('\n');
  }

  function applyCSS() {
    const fullCss = `${baseCss}\n${buildHiddenCss()}`;

    let style = document.getElementById('tm-effinity-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'tm-effinity-style';
      document.head.appendChild(style);
    }

    if (style.textContent !== fullCss) {
      style.textContent = fullCss;
    }
  }

  function hideElementsByText() {
    if (hiddenCardsByTitle.length) {
      document.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
        const text = norm(el.textContent);

        if (hiddenCardsByTitle.includes(text)) {
          const card = el.closest('.rounded-xl, .bg-card.border.border-border.rounded-lg');
          if (card) {
            card.style.display = 'none';
          }
        }
      });
    }

    if (hiddenButtonsByText.length) {
      document.querySelectorAll('button').forEach((el) => {
        const text = norm(el.textContent);
        if (hiddenButtonsByText.includes(text)) {
          el.style.display = 'none';
        }
      });
    }

    if (hiddenLinksByText.length) {
      document.querySelectorAll('a').forEach((el) => {
        const text = norm(el.textContent);
        if (hiddenLinksByText.includes(text)) {
          el.style.display = 'none';
        }
      });
    }

    if (hiddenGenericText.length) {
      document.querySelectorAll('div, span, p, strong').forEach((el) => {
        const text = norm(el.textContent);
        if (hiddenGenericText.includes(text)) {
          el.style.display = 'none';
        }
      });
    }
  }

  function hidePartialElements() {
    if (!hiddenPartialTitles.length) return;

    document.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
      const text = norm(el.textContent);

      if (hiddenPartialTitles.some((t) => text.includes(t))) {
        el.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = '';
          }
        });

        el.querySelectorAll('div').forEach((div) => {
          div.style.display = 'none';
        });
      }
    });
  }

  function rearrangeAgentHeader() {
    const card = document.querySelector('.bg-card.border.border-border.rounded-lg.px-3.py-2.shadow-sm.flex-shrink-0');
    if (!card) return;

    const rows = card.querySelectorAll(':scope > div');
    if (rows.length < 2) return;

    const topRow = rows[0];
    const bottomRow = rows[1];

    // 1) some com a linha de cima inteira
    topRow.style.display = 'none';

    // 2) encontrar os botões que estavam na linha de cima
    const rightGroup = topRow.querySelector('.ml-auto.flex.items-center.gap-4');
    if (!rightGroup) return;

    const buttons = [...rightGroup.querySelectorAll('button')];
    const onlineBtn = buttons.find(btn => norm(btn.textContent).includes('Online'));
    const hsmBtn = buttons.find(btn => norm(btn.textContent).includes('Enviar HSM'));

    const onlineWrapper = onlineBtn ? onlineBtn.closest('.relative.inline-block.text-left') : null;

    // 3) ajustar a linha das filas para ficar tudo à esquerda
    bottomRow.style.display = 'flex';
    bottomRow.style.alignItems = 'center';
    bottomRow.style.justifyContent = 'flex-start';
    bottomRow.style.gap = '12px';
    bottomRow.style.flexWrap = 'wrap';

    // 4) criar container dos botões móveis sem jogar para a direita
    let actionWrap = bottomRow.querySelector('.tm-agent-actions');
    if (!actionWrap) {
      actionWrap = document.createElement('div');
      actionWrap.className = 'tm-agent-actions';
      actionWrap.style.display = 'flex';
      actionWrap.style.alignItems = 'center';
      actionWrap.style.gap = '12px';
      actionWrap.style.flexShrink = '0';
      bottomRow.appendChild(actionWrap);
    }

    // evita duplicação
    actionWrap.innerHTML = '';

    // 5) manter ordem desejada: filas -> toggles -> online -> enviar hsm
    if (onlineWrapper) {
      onlineWrapper.style.display = '';
      actionWrap.appendChild(onlineWrapper);
    }

    if (hsmBtn) {
      hsmBtn.style.display = '';
      actionWrap.appendChild(hsmBtn);
    }

    // 6) garante que a área das filas fique antes dos botões
    const filasLabel = [...bottomRow.children].find(el => norm(el.textContent) === 'Filas:');
    if (filasLabel && actionWrap.previousElementSibling !== bottomRow.lastElementChild) {
      bottomRow.appendChild(actionWrap);
    }
  }

  function hideTopPageHeader() {
    const headers = document.querySelectorAll('header');
    headers.forEach((header) => {
      const text = norm(header.textContent);
      if (text.includes('Área do Agente') && text.includes('Fila de atendimento e conversas ativas')) {
        header.style.display = 'none';
      }
    });
  }

  function applyAll() {
    applyCSS();
    hideElementsByText();
    hidePartialElements();
    hideTopPageHeader();
    rearrangeAgentHeader();
  }

  function init() {
    applyAll();
    setTimeout(applyAll, 300);
    setTimeout(applyAll, 1000);
    setTimeout(applyAll, 2000);
    console.log('[TM effinity] ajustes aplicados');
  }

  const observer = new MutationObserver(() => {
    applyAll();
  });

  function startObserver() {
    if (!document.body) return;

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      startObserver();
    });
  } else {
    init();
    startObserver();
  }

  window.addEventListener('load', init);
  window.addEventListener('pageshow', init);
  window.addEventListener('focus', applyAll);
})();
