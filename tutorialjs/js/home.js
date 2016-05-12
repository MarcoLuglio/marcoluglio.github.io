'use strict';

/**
 * Entry point function
 */
define(

	[
		'Index',
		'JavaScriptLexer',
		'HtmlLexer',
		'Highlighter',
		'HighlightEnhancer',
		'NodeListIterator',
		'domReadyPromise'

	], (

		Index,
		JavaScriptLexer,
		HtmlLexer,
		Highlighter,
		HighlightEnhancer,
		NodeListIterator,
		domReadyPromise

	) => {


		function* highlightGenerator(blocosDeCodigo) {
			for (let blocoDeCodigo of blocosDeCodigo) {
				blocoDeCodigo.className += ' bubaloop';
				const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);
				yield;
			}
		}


		function* highlightJavaScriptGenerator(blocosDeCodigo) {

			const javaScriptLexer = new JavaScriptLexer();
			const highlighter = new Highlighter();

			for (let blocoDeCodigo of blocosDeCodigo) {

				yield;

				const source = blocoDeCodigo.innerHTML;

				blocoDeCodigo.className += ' bubaloop';

				javaScriptLexer.parseAsync(source)
					.then((tokens) => {
						return highlighter.highlightAsync(source, tokens);
					})
					.then((highlightedSource) => {
						blocoDeCodigo.innerHTML = highlightedSource;
						const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);
					});

			}

		}


		function* highlightHtmlGenerator(blocosDeCodigo) {

			const htmlLexer = new HtmlLexer();
			const highlighter = new Highlighter();

			for (let blocoDeHtml of blocosDeCodigo) {

				yield;

				const source = blocoDeHtml.innerHTML;

				blocoDeHtml.className += ' bubaloop';

				htmlLexer.parseAsync(source)
					.then((tokens) => {
						return highlighter.highlightAsync(source, tokens);
					})
					.then((highlightedSource) => {
						blocoDeHtml.innerHTML = highlightedSource;
						const highlightEnhancer = new HighlightEnhancer(blocoDeHtml);
					});

			}

		}


		function highlightWrapper(selector, generator, timeout) {

			try {

				const blocosDeCodigo = new NodeListIterator(document.querySelectorAll(selector));

				let iterator = generator(blocosDeCodigo);
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


		const timeout = 0;

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
				highlightWrapper('code.generic', highlightGenerator, timeout);
			})

			.then(() => {
				highlightWrapper('code.html', highlightHtmlGenerator, timeout);
			})

			.then(() => {
				highlightWrapper('code.javascript', highlightJavaScriptGenerator, timeout);
			});

	}

);