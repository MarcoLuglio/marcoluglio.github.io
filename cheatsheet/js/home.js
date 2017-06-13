'use strict';

/**
 * Entry point function
 */
define(

	[
		'Index',

		'CppLexer',
		'ObjectiveCLexer',
		'SwiftLexer',
		'KotlinLexer',
		'RustLexer',
		'CsLexer',

		'JavaLexer',
		'VbLexer',
		'HtmlLexer',
		'JavaScriptLexer',

		'Highlighter',
		'HighlightEnhancer',
		'NodeListIterator',
		'domReadyPromise'

	], (

		Index,

		CppLexer,
		ObjectiveCLexer,
		SwiftLexer,
		KotlinLexer,
		RustLexer,
		CsLexer,

		JavaLexer,
		VbLexer,
		HtmlLexer,
		JavaScriptLexer,

		Highlighter,
		HighlightEnhancer,
		NodeListIterator,
		domReadyPromise

	) => {



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

		.then(() => {
			try {
				const blocosDeCodigo = new NodeListIterator(document.querySelectorAll('code.generic'));

				const iterator = highlightThemeClosure(blocosDeCodigo);
				function callback() {
					if (iterator()) {
						setTimeout(callback, 0);
					}
				}
				setTimeout(callback, 0);

			} catch (erro) {
				console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
			}
		})

		.then(() => {
			highlightWrapper('code.rust', RustLexer);
		})
		.then(() => {
			highlightWrapper('code.cpp', CppLexer);
		})
		.then(() => {
			highlightWrapper('code.objectivec', ObjectiveCLexer);
		})
		.then(() => {
			highlightWrapper('code.swift', SwiftLexer);
		})
		.then(() => {
			highlightWrapper('code.kotlin', KotlinLexer);
		})
		.then(() => {
			highlightWrapper('code.java', JavaLexer);
		})
		.then(() => {
			highlightWrapper('code.cs', CsLexer);
		})
		.then(() => {
			highlightWrapper('code.html', HtmlLexer);
		})
		.then(() => {
			highlightWrapper('code.javascript', JavaScriptLexer);
		})
		.then(() => {
			highlightWrapper('code.visualbasic', VbLexer);
		});



	}

);