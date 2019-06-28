'use strict';

import { domReadyPromise, NodeListIterator, Node } from '../../compartilhado/js/utils.js';
import { Index } from '../../compartilhado/js/index.js';
import { HighlightEnhancer } from '../../compartilhado/js/highlightEnhancer.js';



(async function() {

	await domReadyPromise();

	try {
		const index = new Index('indice', 3, false);
	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

	try {
		const divsDeCodigo = new NodeListIterator(document.querySelectorAll('div.codeblock'));
		for (let divCodigo of divsDeCodigo) {
			divCodigo.className += ' bubaloop';
		}
	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

	const blocosDeCodigo = [];
	blocosDeCodigo[0] = document.querySelectorAll('code.html');
	blocosDeCodigo[1] = document.querySelectorAll('code.javascript');

	const highlighterWorker = new Worker('../../compartilhado/js/highlighterWorker.js', { type: 'module' });

	highlighterWorker.onmessage = (event) => {

		const codeBlocksIndex = event.data[0];
		const codeBlockIndex = event.data[1];
		const highlightedSource = event.data[2];

		let blocoDeCodigo = blocosDeCodigo[codeBlocksIndex][codeBlockIndex];
		blocoDeCodigo.className += ' bubaloop';
		blocoDeCodigo.innerHTML = highlightedSource;
		const highlightEnhancer = new HighlightEnhancer(new Node(blocoDeCodigo));

	};

	try {

		const blocosDeCodigoIt = new NodeListIterator(blocosDeCodigo[0]);

		let codeBlockIndex = 0;
		for (let blocoDeCodigo of blocosDeCodigoIt) {
			const source = blocoDeCodigo.innerHTML;
			highlighterWorker.postMessage([
				0,
				codeBlockIndex,
				'html',
				source
			]); // TODO posso passar um objeto ao invés de uma array??
			codeBlockIndex++;
		}

	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

	try {

		const blocosDeCodigoIt = new NodeListIterator(blocosDeCodigo[1]);

		let codeBlockIndex = 0;
		for (let blocoDeCodigo of blocosDeCodigoIt) {
			const source = blocoDeCodigo.innerHTML;
			highlighterWorker.postMessage([
				1,
				codeBlockIndex,
				'javascript',
				source
			]); // TODO posso passar um objeto ao invés de uma array??
			codeBlockIndex++;
		}

	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

})();