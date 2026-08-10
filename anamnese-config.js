/*
 * Configuração da anamnese nativa.
 * Web App publicado no Google Apps Script para gravar respostas
 * no formulário oficial "Antes da nossa primeira sessão".
 */
window.ANAMNESE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbyVv6oY91ELP2of25NxPg1QyVPNo1y8CIc6PXrjrmQSxOraQzHfBQJpYepJm2LlglU/exec';
window.ANAMNESE_BUILD = '20260810-4';

(() => {
  'use strict';

  const BUILD = window.ANAMNESE_BUILD;
  const LEGACY_TIMEOUT = 'O envio demorou mais que o esperado. Suas respostas continuam nesta tela; tente novamente.';

  function showConfirmed(){
    window.__ANAMNESE_CONFIRMED__ = true;
    const form = document.getElementById('anamneseForm');
    const progress = document.querySelector('.progress-wrap');
    const success = document.getElementById('successPanel');
    if (form) form.classList.add('hidden');
    if (progress) progress.classList.add('hidden');
    if (success) {
      success.classList.remove('hidden');
      if (typeof success.focus === 'function') success.focus();
    }
  }

  function neutralizeLegacyTimeout(){
    document.querySelectorAll('.status').forEach((el) => {
      if ((el.textContent || '').trim() === LEGACY_TIMEOUT) {
        el.className = 'status show waiting';
        el.textContent = 'O envio está levando mais tempo que o habitual. Aguarde a confirmação antes de sair desta página.';
      }
    });
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type !== 'ANAMNESE_SUBMIT_RESULT') return;

    const origin = event.origin || '';
    const googleOrigin = origin === 'https://script.google.com' ||
      origin === 'https://script.googleusercontent.com' ||
      origin.endsWith('.googleusercontent.com') ||
      origin === 'null';

    if (!googleOrigin) return;
    if (data.ok) showConfirmed();
  }, true);

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    const url = new URL(window.location.href);
    url.searchParams.set('v', BUILD);
    window.location.replace(url.toString());
  });

  const startObserver = () => {
    neutralizeLegacyTimeout();
    const observer = new MutationObserver(neutralizeLegacyTimeout);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

  // Toda entrada sem versão é redirecionada para uma URL versionada. Isso força
  // o navegador a buscar a versão atual da página mesmo quando o link de origem
  // ou o histórico ainda apontam para uma cópia antiga.
  const current = new URL(window.location.href);
  if (current.pathname.endsWith('/anamnese.html') && current.searchParams.get('v') !== BUILD) {
    current.searchParams.set('v', BUILD);
    window.location.replace(current.toString());
  }
})();
