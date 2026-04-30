// ==UserScript==// @name         effinity// @namespace    http://tampermonkey.net/// @version      8.8// @author       alison// @match        https://pulse.sono.effinity.com.br/// @match        https://pulse.sono.effinity.com.br/whatsapp/agent*// @updateURL    https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js// @downloadURL  https://raw.githubusercontent.com/mtialison/effinity/main/effinity.user.js// @grant        none// @run-at       document-start// ==/UserScript==

(function () {'use strict';

if (!location.pathname.startsWith('/whatsapp/agent')) {return;}

/* ========================================================================

CONFIGURAÇÕES GERAIS

====================================================================== */const SCRIPT_NAME = 'TM effinity';const SCRIPT_VERSION = '8.8';

const STYLE_ID = 'tm-effinity-style';const HIDDEN_ATTR = 'data-tm-effinity-hidden';const DATE_APPLIED_ATTR = 'data-tm-date-applied';const UPPERCASE_NAME_ATTR = 'data-tm-uppercase-name';const BIRTH_AGE_ATTR = 'data-tm-birth-age';const PHONE_FORMATTED_ATTR = 'data-tm-phone-formatted';

const AGENT_AREA_ATTR = 'data-tm-agent-area';const AGENT_TOP_ATTR = 'data-tm-agent-top-row';const AGENT_BOTTOM_ATTR = 'data-tm-agent-bottom-row';const AGENT_ACTIONS_ATTR = 'data-tm-agent-actions-row';const AGENT_ACTIONS_MIRROR_ATTR = 'data-tm-agent-actions-mirror';const AGENT_PROXY_ATTR = 'data-tm-agent-proxy';const AGENT_VERSION_ATTR = 'data-tm-agent-version';const FAVORITE_STORAGE_KEY = 'tm-effinity-favorites';const FAVORITE_ATTR = 'data-tm-favorite';const FAVORITE_ACTIVE_ATTR = 'data-tm-favorite-active';const FAVORITE_STAR_ATTR = 'data-tm-favorite-star';

const TICKET_HEADER_ATTR = 'data-tm-ticket-header';const TICKET_INFO_ROW_HIDDEN_ATTR = 'data-tm-ticket-info-row-hidden';const TICKET_CREATED_HOST_ATTR = 'data-tm-ticket-created-host';const TICKET_CREATED_MOVED_ATTR = 'data-tm-ticket-created-moved';const TICKET_CONTACT_BLOCK_ATTR = 'data-tm-ticket-contact-block';

const COPY_CARD_ATTR = 'data-tm-copy-card';const COPY_VALUE_ATTR = 'data-tm-copy-value';const COPY_TOAST_ATTR = 'data-tm-copy-toast';const COPY_TOAST_VISIBLE_ATTR = 'data-tm-copy-toast-visible';

const QUEUE_TAG_ATTR = 'data-tm-queue-tag';const QUEUE_TAG_TYPE_ATTR = 'data-tm-queue-type';

const COPY_ICON_URL = 'https://i.imgur.com/0SJagfY.png';const UNREAD_ICON_URL = 'https://i.imgur.com/ZmW0yoP.png';const UNREAD_CARD_ATTR = 'data-tm-unread-card';const UNREAD_ICON_ATTR = 'data-tm-unread-icon';

const SIDEBAR_BOOT_STYLE_ID = 'tm-effinity-sidebar-boot-style';const SIDEBAR_BOOT_ATTR = 'data-tm-sidebar-booting';const SIDEBAR_COLLAPSED_READY_ATTR = 'data-tm-sidebar-collapsed-ready';
