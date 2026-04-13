// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  veneno
// @author       raik
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
  const hiddenCssSelectors = [
    // Exemplo:
    // '.classe-do-elemento',
    // '#id-do-elemento',
    // 'button[aria-label="Alguma coisa"]',
  ];

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

  const hiddenLinksByText = [
    // Exemplo:
    // 'Histórico'
  ];

  const hiddenGenericText = [
    // Exemplo:
    // 'Msgs'
  ];

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
    // remover cards inteiros pelo título
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

    // botões
    if (hiddenButtonsByText.length) {
      document.querySelectorAll('button').forEach((el) => {
        const text = norm(el.textContent);
        if (hiddenButtonsByText.includes(text)) {
          el.style.display = 'none';
        }
      });
    }

    // links
    if (hiddenLinksByText.length) {
      document.querySelectorAll('a').forEach((el) => {
        const text = norm(el.textContent);
        if (hiddenLinksByText.includes(text)) {
          el.style.display = 'none';
        }
      });
    }

    // genéricos
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
        // remove apenas o texto solto do título
        el.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = '';
          }
        });

        // remove badges/divs internas como "⚡ Tempo Real"
        el.querySelectorAll('div').forEach((div) => {
          div.style.display = 'none';
        });
      }
    });
  }

  function rearrangeAgentHeader() {
    const rows = document.querySelectorAll('.bg-card.border.border-border.rounded-lg.px-3.py-2.shadow-sm.flex-shrink-0 > div');
    if (!rows || rows.length < 2) return;

    const topRow = rows[0];
    const bottomRow = rows[1];
    if (!topRow || !bottomRow) return;

    const rightGroup = topRow.querySelector('.ml-auto.flex.items-center.gap-4');
    if (!rightGroup) return;

    const buttons = [...rightGroup.querySelectorAll('button')];
    const onlineBtn = buttons.find((btn) => norm(btn.textContent).includes('Online'));
    const hsmBtn = buttons.find((btn) => norm(btn.textContent).includes('Enviar HSM'));
    const atenderProximoBtn = buttons.find((btn) => norm(btn.textContent).includes('Atender próximo'));

    [...rightGroup.children].forEach((child) => {
      const text = norm(child.textContent);

      const isOnlineContainer = onlineBtn && child === onlineBtn.closest('.relative.inline-block.text-left');
      const isHsm = hsmBtn && child === hsmBtn;
      const isAtender = atenderProximoBtn && child === atenderProximoBtn;

      const isAguardando = text.includes('Aguardando');
      const isDistribuidos = text.includes('Distribuídos');
      const isAtendendo = text.includes('Atendendo') && !text.includes('Atender próximo');
      const isDivider = child.classList.contains('w-px');
      const isRefresh = !!(child.querySelector && child.querySelector('.lucide-refresh-cw'));

      if (isAguardando || isDistribuidos || isAtendendo || isAtender || isDivider || isRefresh) {
        child.style.display = 'none';
      }

      // garante que Online e HSM não sejam ocultados
      if (isOnlineContainer || isHsm) {
        child.style.display = '';
      }
    });

    let actionWrap = bottomRow.querySelector('.tm-agent-actions');
    if (!actionWrap) {
      actionWrap = document.createElement('div');
      actionWrap.className = 'tm-agent-actions';
      actionWrap.style.display = 'flex';
      actionWrap.style.alignItems = 'center';
      actionWrap.style.gap = '8px';
      actionWrap.style.marginLeft = 'auto';
      actionWrap.style.flexShrink = '0';
      actionWrap.style.flexWrap = 'wrap';
      bottomRow.appendChild(actionWrap);
    }

    const onlineContainer = onlineBtn ? onlineBtn.closest('.relative.inline-block.text-left') : null;

    if (onlineContainer && !actionWrap.contains(onlineContainer)) {
      actionWrap.appendChild(onlineContainer);
    }

    if (hsmBtn && !actionWrap.contains(hsmBtn)) {
      actionWrap.appendChild(hsmBtn);
    }

    // remove o bloco esquerdo "Área do Agente"
    const leftTitle = topRow.querySelector('.flex.items-center.gap-2');
    if (leftTitle) {
      leftTitle.style.display = 'none';
    }

    // colapsa a primeira linha se ela ficar vazia
    const hasVisibleChildren = [...rightGroup.children].some((child) => getComputedStyle(child).display !== 'none');
    if (!hasVisibleChildren && leftTitle) {
      topRow.style.display = 'none';
    }

    // ajusta a segunda linha para receber os botões
    bottomRow.style.display = 'flex';
    bottomRow.style.alignItems = 'center';
    bottomRow.style.gap = '12px';
    bottomRow.style.flexWrap = 'wrap';
  }

  function applyAll() {
    applyCSS();
    hideElementsByText();
    hidePartialElements();
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
