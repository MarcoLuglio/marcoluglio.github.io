'use strict';

import { domReadyPromise, NodeListIterator } from '../../compartilhado/js/utils.js';
import { Index } from '../../compartilhado/js/index.js';
import { HighlightEnhancer } from '../../compartilhado/js/highlightEnhancer.js';
import { HtmlLexer, CsLexer, Highlighter } from '../../compartilhado/js/highlighter.js';

/**
 * Firefox e Edge mostraram bugs em relação ao uso das novas funcionalidades
 * Generator e Promise quando utilizadas como aqui.
 * Usei closures para simular a funcionalidade e contornar tais bugs
 */
function highlightThemeClosure(blocosDeCodigo) {

	let i = 0;
	let blocoDeCodigo;
	let iterador = blocosDeCodigo[Symbol.iterator]();
	let iteradorTemp;

	return function() {

		iteradorTemp = iterador.next();
		if (iteradorTemp.done) {
			return;
		}
		blocoDeCodigo = iteradorTemp.value;

		blocoDeCodigo.className += ' bubaloop';
		const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);

		i++;
		return blocoDeCodigo;

	}

}



/**
 * Firefox e Edge mostraram bugs em relação ao uso das novas funcionalidades
 * Generator e Promise quando utilizadas como aqui.
 * Usei closures para simular a funcionalidade e contornar tais bugs
 */
function highlightClosure(blocosDeCodigo, Lexer) {

	const lexer = new Lexer();
	const highlighter = new Highlighter();
	let blocoDeCodigo;
	let iterador = blocosDeCodigo[Symbol.iterator]();
	let iteradorTemp;

	return function() {

		iteradorTemp = iterador.next();
		if (iteradorTemp.done) {
			return;
		}
		blocoDeCodigo = iteradorTemp.value;

		const source = blocoDeCodigo.innerHTML;

		blocoDeCodigo.className += ' bubaloop';

		lexer.parseAsync(source)
			.then((tokens) => {
				return highlighter.highlightAsync(source, tokens);
			})
			.then((highlightedSource) => {
				blocoDeCodigo.innerHTML = highlightedSource;
				const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);
			});

		return blocoDeCodigo;

	}

}


function highlightWrapper(selector, Lexer, timeout) {

	try {

		if (timeout === null || timeout === undefined) {
			timeout = 0;
		}

		const blocosDeCodigo = new NodeListIterator(document.querySelectorAll(selector));

		const iterator = highlightClosure(blocosDeCodigo, Lexer);
		function callback() {
			if (iterator()) {
				setTimeout(callback, timeout);
			}
		}
		setTimeout(callback, timeout);

	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

}

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
		highlightWrapper('code.tsql', TSQLLexer);
	})*/
	.then(() => {
		highlightWrapper('code.cs', CsLexer);
	})
	.then(() => {
		highlightWrapper('code.html', HtmlLexer);
	});