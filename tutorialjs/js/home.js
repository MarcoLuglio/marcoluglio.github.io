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
		'domReadyPromise'

	], (

		Index,
		JavaScriptLexer,
		HtmlLexer,
		Highlighter,
		HighlightEnhancer,
		domReadyPromise

	) => {

		domReadyPromise()
			.then(() => {

				try {

					// TODO ver oq posso deixar async no indice
					// ver se o corpo laço pode rodar async com setTimeout
					// ou se consigo fazer um laço async já que são vários blocos...

					const divsDeCodigo = document.querySelectorAll('div.codeblock');
					const blocosDeCodigo = document.querySelectorAll('code.generic');
					const blocosDeJavaScript = document.querySelectorAll('code.javascript');
					const blocosDeHtml = document.querySelectorAll('code.html');

					const index = new Index('indice', 3, false);

					const highlighter = new Highlighter()
					// const highlighterWorker = new Worker('highlighterWorker.js'); // TODO testar num server

					for (let i = 0; i < divsDeCodigo.length; i++) {
						let divCodigo = divsDeCodigo.item(i);
						divCodigo.className += ' bubaloop';
					}

					for (let i = 0; i < blocosDeCodigo.length; i++) {
						let blocoDeCodigo = blocosDeCodigo.item(i);
						blocoDeCodigo.className += ' bubaloop';
						const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);
					}

					const javaScriptLexer = new JavaScriptLexer();

					for (let i = 0; i < blocosDeJavaScript.length; i++) {

						const blocoDeCodigo = blocosDeJavaScript.item(i);
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

					for (let i = 0; i < blocosDeHtml.length; i++) {

						const blocoDeHtml = blocosDeHtml.item(i);
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