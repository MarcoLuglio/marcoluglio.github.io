'use strict';

/**
 * Entry point function
 */
define(

	[
		'Index',

		'CppLexer',
		'RustLexer',
		'CsLexer',
		'JavaScriptLexer',

		'Highlighter',
		'HighlightEnhancer',
		'NodeListIterator',
		'domReadyPromise'

	], (

		Index,

		CppLexer,
		RustLexer,
		CsLexer,
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
			highlightWrapper('code.cpp', CppLexer);
		})
		.then(() => {
			highlightWrapper('code.rust', RustLexer);
		})
		.then(() => {
			highlightWrapper('code.cs', CsLexer);
		})
		.then(() => {
			highlightWrapper('code.javascript', JavaScriptLexer);
		});

	}

);




function gerarInscricaoEstadualPR() {

	let soma = 0;
	let resto = 0;
	const multiplicadores = [4, 3, 2, 7, 6, 5, 4, 3, 2];
	let semente = Math.round(Math.random() * 100000000).toString();
	semente = semente.substr(0, 8);

	for (let i = 1; i < multiplicadores.length; i++) {
		soma += parseInt(semente[i - 1], 10) * multiplicadores[i];
	}

	resto = soma % 11;
	if (resto < 2) {
		resto = 0;
	} else {
		resto = 11 - resto;
	}

	semente += resto;
	soma = 0;

	for (let i = 0; i < multiplicadores.length; i++) {
		soma += parseInt(semente[i], 10) * multiplicadores[i];
	}

	resto = soma % 11;
	if (resto < 2) {
		resto = 0;
	} else {
		resto = 11 - resto;
	}

	semente += resto;

	return semente;

}

console.log(gerarInscricaoEstadualPR());