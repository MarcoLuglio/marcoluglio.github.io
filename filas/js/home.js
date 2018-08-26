'use strict';

import { domReadyPromise, NodeListIterator } from '../../compartilhado/js/utils.js';

domReadyPromise()
	.then(() => {
		try {
			const index = new Index('indice', 3, false);
		} catch (erro) {
			console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
		}
	})
	.then(() => {
		try {
			const divsDeCodigo = new NodeListIterator(document.querySelectorAll('div.codeblock'));
			for (let divCodigo of divsDeCodigo) {
				divCodigo.className += ' bubaloop';
			}
		} catch (erro) {
			console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
		}
	})
	/*.then(() => {
		highlightWrapper('code.tsql', CsLexer);
	})*/
	.then(() => {
		highlightWrapper('code.cs', CsLexer);
	});