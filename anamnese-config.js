/* Configuração do Web App de anamnese.
 * Uma resposta só é confirmada pelo postMessage emitido pelo Apps Script
 * após FormResponse.submit(); nunca por fetch opaque ou load de iframe.
 */
window.ANAMNESE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbyVv6oY91ELP2of25NxPg1QyVPNo1y8CIc6PXrjrmQSxOraQzHfBQJpYepJm2LlglU/exec';
window.ANAMNESE_BUILD = '20261110-confirmed-response';
