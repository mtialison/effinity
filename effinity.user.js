// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  envenenado
// @author       alison
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

    header.glass.sticky.top-0.z-50.shadow-sm.px-6.py-4 {
      display: none !important;
    }
  `;

  /*
   * =========================================================
   * 2) SEÇÃO PARA OCULTAR ELEMENTOS POR CSS
   *    Adicione aqui os seletores que quiser esconder.
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
    'Resumo do Ticket',
    'Área do Agente'
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

  function buildHiddenCss() {
    if (!hiddenCssSelectors.length) return '';

    return hiddenCssSelectors
      .map(selector => `${selector} { display: none !important; }`)
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

  function norm(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function hideElementsByText() {
    // 🔴 remover cards inteiros pelo título
    if (hiddenCardsByTitle.length) {
      document.querySelectorAll('h1, h2, h3, h4').forEach(el => {
        const text = norm(el.textContent);

        if (hiddenCardsByTitle.includes(text)) {
          const card = el.closest('.rounded-xl, .bg-card.border.border-border.rounded-lg');
          if (card) {
            card.style.display = 'none';
          }
        }
      });
    }

    // 🔴 botões
    if (hiddenButtonsByText.length) {
      document.querySelectorAll('button').forEach(el => {
        const text = norm(el.textContent);
        if (hiddenButtonsByText.includes(text)) {
          el.style.display = 'none';
        }
      });
    }

    // 🔴 links
    if (hiddenLinksByText.length) {
      document.querySelectorAll('a').forEach(el => {
        const text = norm(el.textContent);
        if (hiddenLinksByText.includes(text)) {
          el.style.display = 'none';
        }
      });
    }

    // 🔴 genéricos
    if (hiddenGenericText.length) {
      document.querySelectorAll('div, span, p, strong').forEach(el => {
        const text = norm(el.textContent);
        if (hiddenGenericText.includes(text)) {
          el.style.display = 'none';
        }
      });
    }
  }

  function hidePartialElements() {
    if (!hiddenPartialTitles.length) return;

    document.querySelectorAll('h1, h2, h3, h4').forEach(el => {
      const text = norm(el.textContent);

      if (hiddenPartialTitles.some(t => text.includes(t))) {
        // remove apenas o texto solto do título
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = '';
          }
        });

        // remove badges/divs internas como "⚡ Tempo Real"
        el.querySelectorAll('div').forEach(div => {
          div.style.display = 'none';
        });
      }
    });
  }

  function applyAll() {
    applyCSS();
    hideElementsByText();
    hidePartialElements();
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
