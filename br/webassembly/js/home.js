'use strict';

import { domReadyPromise } from '../../compartilhado/js/utils.js';
import { Index } from '../../compartilhado/js/index.js';
import { HighlightEnhancer } from '../../compartilhado/js/highlightEnhancer.js';
import { /*HtmlLexer, CsLexer,*/ Highlighter } from '../../compartilhado/js/highlighter.js';



async function highlightHelper(selector, Lexer) {

	return Array.from(
		document.querySelectorAll(selector),
		async function(blocoDeCodigo) {
			const lexer = new Lexer();
			const highlighter = new Highlighter();
			const source = blocoDeCodigo.innerHTML;
			blocoDeCodigo.className += ' bubaloop';
			let tokens = await lexer.parseAsync(source);
			let highlightedSource = await highlighter.highlightAsync(source, tokens);
			blocoDeCodigo.innerHTML = highlightedSource;
			const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo); // TODO esse aqui poderia ser chamado como um novo map no retorno do primeiro map
		}
	);

}



(async function() {

	await domReadyPromise();

	try {

		const index = new Index('indice', 3, false);

		Array.from(
			document.querySelectorAll('div.codeblock'),
			divCodigo => divCodigo.className += ' bubaloop'
		);

		/*await Promise.all([
			// highlightHelper('code.tsql', TSQLLexer),
			// highlightHelper('code.cs', CsLexer),
			highlightHelper('code.html', HtmlLexer)
		]);*/

	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

})();