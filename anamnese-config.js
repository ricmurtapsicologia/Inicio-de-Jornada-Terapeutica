/*
 * Configuração da anamnese nativa.
 * Web App publicado no Google Apps Script para gravar respostas
 * no formulário oficial "Antes da nossa primeira sessão".
 */
window.ANAMNESE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbyVv6oY91ELP2of25NxPg1QyVPNo1y8CIc6PXrjrmQSxOraQzHfBQJpYepJm2LlglU/exec';
window.ANAMNESE_BUILD = '20260810-5';

(() => {
  'use strict';

  const BUILD = window.ANAMNESE_BUILD;
  const LEGACY_TIMEOUT = 'O envio demorou mais que o esperado. Suas respostas continuam nesta tela; tente novamente.';
  const nativeSubmit = HTMLFormElement.prototype.submit;
  let transportStarted = false;
  let fallbackIframeInFlight = false;

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

  function dispatchInternalConfirmation(){
    if (window.__ANAMNESE_CONFIRMED__) return;
    const iframe = document.getElementById('anamneseTransport');
    try {
      const event = new MessageEvent('message', {
        data: { type: 'ANAMNESE_SUBMIT_RESULT', ok: true },
        origin: 'null',
        source: iframe?.contentWindow || window
      });
      window.dispatchEvent(event);
    } catch (_) {
      showConfirmed();
    }
    window.setTimeout(() => {
      if (!window.__ANAMNESE_CONFIRMED__) showConfirmed();
    }, 50);
  }

  function neutralizeLegacyTimeout(){
    document.querySelectorAll('.status').forEach((el) => {
      if ((el.textContent || '').trim() === LEGACY_TIMEOUT) {
        el.className = 'status show waiting';
        el.textContent = 'O envio está levando mais tempo que o habitual. Aguarde a confirmação antes de sair desta página.';
      }
    });
  }

  // Intercepta somente o formulário técnico invisível da anamnese. O envio é
  // realizado por fetch no-cors: o navegador não precisa ler a resposta do
  // Google; basta a requisição concluir para encerrar o estado "Enviando...".
  HTMLFormElement.prototype.submit = function(){
    if (this.id !== 'transportForm' || !this.action || !this.action.startsWith('https://script.google.com/macros/s/')) {
      return nativeSubmit.call(this);
    }

    transportStarted = true;
    fallbackIframeInFlight = false;

    const body = new URLSearchParams();
    new FormData(this).forEach((value, key) => body.append(key, String(value)));

    fetch(this.action, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      body
    })
      .then(() => dispatchInternalConfirmation())
      .catch(() => {
        // Fallback para o transporte anterior caso o navegador bloqueie fetch.
        // O mesmo submissionId é preservado pelo payload, evitando duplicidade.
        fallbackIframeInFlight = true;
        nativeSubmit.call(this);
      });
  };

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

    const iframe = document.getElementById('anamneseTransport');
    if (iframe) {
      iframe.addEventListener('load', () => {
        if (transportStarted && fallbackIframeInFlight) {
          fallbackIframeInFlight = false;
          dispatchInternalConfirmation();
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

  const current = new URL(window.location.href);
  if (current.pathname.endsWith('/anamnese.html') && current.searchParams.get('v') !== BUILD) {
    current.searchParams.set('v', BUILD);
    window.location.replace(current.toString());
  }
})();
