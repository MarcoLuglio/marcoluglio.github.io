'use strict';

import { domReadyPromise, NodeListIterator, Node } from '../../compartilhado/js/utils.js';
import { Index } from '../../compartilhado/js/index.js';
import { HighlightEnhancer } from '../../compartilhado/js/highlightEnhancer.js';
import { CsLexer, HtmlLexer, Highlighter } from '../../compartilhado/js/highlighter.js';



async function highlightAsync(selector, Lexer) {

	try {

		const blocosDeCodigo = new NodeListIterator(document.querySelectorAll(selector));
		const lexer = new Lexer();
		const highlighter = new Highlighter();

		for (let blocoDeCodigo of blocosDeCodigo) {

			const source = blocoDeCodigo.innerHTML;
			blocoDeCodigo.className += ' bubaloop';

			let tokens = await lexer.parseAsync(source);
			let highlightedSource = await highlighter.highlightAsync(source, tokens);
			blocoDeCodigo.innerHTML = highlightedSource;
			const highlightEnhancer = new HighlightEnhancer(new Node(blocoDeCodigo));

		}

	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

}



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

	// await highlightAsync('code.tsql', TSQLLexer);
	await highlightAsync('code.cs', CsLexer);
	await highlightAsync('code.html', HtmlLexer);

})();