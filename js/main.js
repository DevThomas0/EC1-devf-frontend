/* ==========================================================================
   WebCraft Solutions - Script unique (ES6+)
   Sommaire :
     1. Configuration & utilitaires
     2. Navigation (menu mobile)
   ========================================================================== */

'use strict';

/* ============ 1. CONFIGURATION & UTILITAIRES ============ */

/**
 * Raccourcis de selection DOM.
 */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/* ============ 2. NAVIGATION (MENU MOBILE) ============ */

/**
 * Gere l'ouverture / fermeture du menu burger en mobile.
 * L'attribut aria-expanded est tenu a jour pour les lecteurs d'ecran.
 */
const initNavigation = () => {
  const toggle = $('.nav-toggle');
  const nav = $('#main-nav');

  if (!toggle || !nav) {
    return;
  }

  const closeNav = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu de navigation');
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute(
      'aria-label',
      isOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'
    );
  });

  // Le menu se referme apres un clic sur un lien (navigation par ancre).
  $$('.nav-link', nav).forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  // La touche Echap referme egalement le menu.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      closeNav();
      toggle.focus();
    }
  });
};

/* ============ POINT D'ENTREE ============ */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
});
