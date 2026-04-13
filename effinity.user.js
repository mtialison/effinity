// ==UserScript==
// @name         effinity
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  envenenado
// @author       raik
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';

  // ─── CSS principal ───────────────────────────────────────────────────────────
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

  // ─── Injeta/atualiza o bloco de estilo ───────────────────────────────────────
  function applyCSS() {
    let style = document.getElementById('tm-effinity-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'tm-effinity-style';
      document.head.appendChild(style);
    }
    if (style.textContent !== css) {
      style.textCont
