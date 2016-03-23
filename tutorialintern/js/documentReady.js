'use strict';

/**
 * Cross-browser "dom ready"
 */
function documentReady(callback) {

	if (document.readyState === 'interactive'
		|| document.readyState === 'complete'
		|| document.readyState === 'loaded'
		) {

		callback(null);

	// se não, se registra para executar no evento
	} else {

		// registro do evento para navegadores legais
		if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', callback);

		// registro de evento para IE8-
		} else if (window.attachEvent) {
			window.attachEvent('onload', callback);
		}

	}


}