// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.0
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
  `;

  function applyCSS() {
    let style = document.getElementById('tm-effinity-style');

    if (!style) {
      style = document.createElement('style');
      style.id = 'tm-effinity-style';
      document.head.appendChild(style);
    }

    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  function init() {
    applyCSS();
    setTimeout(applyCSS, 300);
    setTimeout(applyCSS, 1000);
    setTimeout(applyCSS, 2000);
    console.log('[TM effinity] CSS aplicado');
  }

  const observer = new MutationObserver(() => {
    applyCSS();
  });

  function startObserver() {
    if (!document.body) return;

    observer.observe(document.body, {
      childList: true,
      subtree: true
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
  window.addEventListener('focus', applyCSS);
})();
