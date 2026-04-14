// ==UserScript==
// @name         Effinity Custom (Remove Blue Dot)
// @namespace    https://github.com/mtialison/effinity
// @version      4.3
// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*
// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js
// ==/UserScript==

(function() {
    'use strict';

    // =========================
    // CSS: REMOVE BOLINHA AZUL
    // =========================
    const style = document.createElement('style');
    style.textContent = `
    /* Remove bolinha azul do ticket selecionado */
    div.w-2.h-2.rounded-full.bg-blue-500 {
        display: none !important;
    }
    `;
    document.head.appendChild(style);

})();
