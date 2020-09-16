'use strict';

import { NodeListIterator } from '../../../compartilhado/js/utils.js';
import { Index } from '../../../compartilhado/js/index.js';
import { HighlightEnhancer } from '../../../compartilhado/js/highlightEnhancer.js';



try {
	const index = new Index('indice', 3, false);
} catch (erro) {
	console.error('Erro ao criar o índice da página. ' + erro + '\n' + erro.stack);
}

try {
	const divsDeCodigo = new NodeListIterator(document.querySelectorAll('div.codeblock'));
	for (let divCodigo of divsDeCodigo) {
		divCodigo.classList.add('bubaloop');
	}
} catch (erro) {
	console.error('Erro ao aplicar um tema aos blocos de código. ' + erro + '\n' + erro.stack);
}

const blocosDeCodigo = [];
blocosDeCodigo[0] = document.querySelectorAll('code.shell');
blocosDeCodigo[1] = document.querySelectorAll('code.html');
blocosDeCodigo[2] = document.querySelectorAll('code.javascript');


const highlighterWorker = new Worker('../../../compartilhado/js/highlighterWorker.js', { type: 'module' });

highlighterWorker.addEventListener('message', (event) => {

	const codeBlocksIndex = event.data[0];
	const codeBlockIndex = event.data[1];
	const highlightedSource = event.data[2];

	let blocoDeCodigo = blocosDeCodigo[codeBlocksIndex][codeBlockIndex];
	blocoDeCodigo.classList.add('bubaloop');
	blocoDeCodigo.innerHTML = highlightedSource;
	const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);

});

try {

	let codeBlockIndex = 0;
	const blocosDeCodigoShellIt = new NodeListIterator(blocosDeCodigo[0]);

	for (let blocoDeCodigo of blocosDeCodigoShellIt) {
		const source = blocoDeCodigo.innerHTML;
		highlighterWorker.postMessage([
			0,
			codeBlockIndex,
			'shell',
			source
		]); // TODO passar um objeto ao invés de uma array
		codeBlockIndex++;
	}

	codeBlockIndex = 0;
	const blocosDeCodigoHtmlIt = new NodeListIterator(blocosDeCodigo[1]);

	for (let blocoDeCodigo of blocosDeCodigoHtmlIt) {
		const source = blocoDeCodigo.innerHTML;
		highlighterWorker.postMessage([
			1,
			codeBlockIndex,
			'html',
			source
		]); // TODO passar um objeto ao invés de uma array
		codeBlockIndex++;
	}

	codeBlockIndex = 0;
	const blocosDeCodigoJsIt = new NodeListIterator(blocosDeCodigo[2]);

	for (let blocoDeCodigo of blocosDeCodigoJsIt) {
		const source = blocoDeCodigo.innerHTML;
		highlighterWorker.postMessage([
			2,
			codeBlockIndex,
			'javascript',
			source
		]); // TODO passar um objeto ao invés de uma array
		codeBlockIndex++;
	}

} catch (erro) {
	console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
}