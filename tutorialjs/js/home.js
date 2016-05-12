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

				yield;

			}

		}


		function* highlightHtmlGenerator(blocosDeCodigo) {

			const htmlLexer = new HtmlLexer();
			const highlighter = new Highlighter();

			for (let blocoDeHtml of blocosDeCodigo) {

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

				yield;

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

					let highlightIterator = highlightGenerator(blocosDeCodigo);
					function highlightCallback() {
						if (!highlightIterator.next().done) {
							setTimeout(highlightCallback, 100);
						}
					}
					setTimeout(highlightCallback, 100);

				} catch (erro) {
					console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
				}
			})

			.then(() => {
				try {

					const blocosDeJavaScript = new NodeListIterator(document.querySelectorAll('code.javascript'));

					let highlightIterator = highlightJavaScriptGenerator(blocosDeJavaScript);
					function highlightCallback() {
						if (!highlightIterator.next().done) {
							setTimeout(highlightCallback, 100);
						}
					}
					setTimeout(highlightCallback, 100);

				} catch (erro) {
					console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
				}
			})

			.then(() => {
				try {

					const blocosDeHtml = new NodeListIterator(document.querySelectorAll('code.html'));

					let highlightIterator = highlightHtmlGenerator(blocosDeHtml);
					function highlightCallback() {
						if (!highlightIterator.next().done) {
							setTimeout(highlightCallback, 100);
						}
					}
					setTimeout(highlightCallback, 100);

				} catch (erro) {
					console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
				}
			})

			.then((sucesso) => {
				console.log('terminou');
			},
			(erro) => {
				console.log(erro);
			});

	}

);