'use strict';

/**
 * Entry point function
 */
define(

	[
		'Index',

		'CsLexer',
		'HtmlLexer',
		'JavaScriptLexer',

		'Highlighter',
		'HighlightEnhancer',
		'NodeListIterator',
		'domReadyPromise'

	], (

		Index,

		CsLexer,
		HtmlLexer,
		JavaScriptLexer,

		Highlighter,
		HighlightEnhancer,
		NodeListIterator,
		domReadyPromise

	) => {



	function* highlightThemeGenerator(blocosDeCodigo) {
		for (let blocoDeCodigo of blocosDeCodigo) {
			blocoDeCodigo.className += ' bubaloop';
			const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);
			yield; // yield blcoDeCodigo;??
		}
	}



	function* highlightGenerator(blocosDeCodigo, Lexer) {

		const lexer = new Lexer();
		const highlighter = new Highlighter();

		for (let blocoDeCodigo of blocosDeCodigo) {

			yield;

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

		}

	}


	function highlightWrapper(selector, Lexer, timeout) {

		try {

			if (timeout === null || timeout === undefined) {
				timeout = 0;
			}

			const blocosDeCodigo = new NodeListIterator(document.querySelectorAll(selector));

			const iterator = highlightGenerator(blocosDeCodigo, Lexer);
			function callback() {
				if (!iterator.next().done) {
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

		.then(() => {
			try {
				const blocosDeCodigo = new NodeListIterator(document.querySelectorAll('code.generic'));

				const iterator = highlightThemeGenerator(blocosDeCodigo);
				function callback() {
					if (!iterator.next().done) {
						setTimeout(callback, 0);
					}
				}
				setTimeout(callback, 0);

			} catch (erro) {
				console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
			}
		})

		.then(() => {
			highlightWrapper('code.cs', CsLexer);
		})
		.then(() => {
			highlightWrapper('code.html', HtmlLexer);
		})
		.then(() => {
			highlightWrapper('code.javascript', JavaScriptLexer);
		});

	}

);