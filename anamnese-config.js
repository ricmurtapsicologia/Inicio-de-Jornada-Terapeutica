/* Configuração do Web App de anamnese.
 * Uma resposta só é confirmada pelo postMessage emitido pelo Apps Script
 * após FormResponse.submit(); nunca por fetch opaque ou load de iframe.
 */
window.ANAMNESE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbyVv6oY91ELP2of25NxPg1QyVPNo1y8CIc6PXrjrmQSxOraQzHfBQJpYepJm2LlglU/exec';
window.ANAMNESE_BUILD = '20261110-official-form-fallback';
window.ANAMNESE_BRIDGE_ENABLED = false; // Fail-closed após E2E: backend devolveu ok:false.
window.ANAMNESE_NATIVE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdq_O3PzOusN_Kn-hQm6B-MV6958Ry7VgR-kOTv9PZyaja8xA/viewform';
