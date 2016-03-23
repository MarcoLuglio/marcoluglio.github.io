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

		domReadyPromise()
			.then(() => {

				try {

					// TODO ver oq posso deixar async no indice
					// ver se o corpo laço pode rodar async com setTimeout
					// ou se consigo fazer um laço async já que são vários blocos...

					const divsDeCodigo = new NodeListIterator(document.querySelectorAll('div.codeblock'));
					const blocosDeCodigo = new NodeListIterator(document.querySelectorAll('code.generic'));
					const blocosDeJavaScript = new NodeListIterator(document.querySelectorAll('code.javascript'));
					const blocosDeHtml = new NodeListIterator(document.querySelectorAll('code.html'));

					const index = new Index('indice', 3, false);

					const highlighter = new Highlighter()
					// const highlighterWorker = new Worker('highlighterWorker.js'); // TODO testar num server

					for (let divCodigo of divsDeCodigo) {
						divCodigo.className += ' bubaloop';
					}

					for (let blocoDeCodigo of blocosDeCodigo) {
						blocoDeCodigo.className += ' bubaloop';
						const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);
					}

					const javaScriptLexer = new JavaScriptLexer();

					for (let blocoDeCodigo of blocosDeJavaScript) {

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

					const htmlLexer = new HtmlLexer();

					for (let blocoDeHtml of blocosDeHtml) {

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

				} catch (erro) {
					console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
				}

			});

	}

);