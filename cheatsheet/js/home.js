import { domReadyPromise } from '../../compartilhado/js/utils.js';
import { Index } from '../../compartilhado/js/index.js';
import { GoLexer } from '../../compartilhado/js/GoLexer.js';
import { PythonLexer } from '../../compartilhado/js/PythonLexer.js';
import { HighlightEnhancer } from '../../compartilhado/js/highlightEnhancer.js';
import { Highlighter } from '../../compartilhado/js/highlighter.js';



// workaround while I don't migrate AMD to ES6 modules

let HtmlLexer;
let RustLexer;
let CppLexer;
let ObjectiveCLexer;
let SwiftLexer;
let KotlinLexer;
let JavaLexer;
let CsLexer;
let JavaScriptLexer;
let VbLexer;

define(

	'HomeLegacyAMD',

	[
		'HtmlLexer',
		'RustLexer',
		'CppLexer',
		'ObjectiveCLexer',
		'SwiftLexer',
		'KotlinLexer',
		'JavaLexer',
		'CsLexer',
		'JavaScriptLexer',
		'VbLexer'
	], (
		AMDHtmlLexer,
		AMDRustLexer,
		AMDCppLexer,
		AMDObjectiveCLexer,
		AMDSwiftLexer,
		AMDKotlinLexer,
		AMDJavaLexer,
		AMDCsLexer,
		AMDJavaScriptLexer,
		AMDVbLexer
	) => {
		HtmlLexer = AMDHtmlLexer;
		RustLexer = AMDRustLexer;
		CppLexer = AMDCppLexer;
		ObjectiveCLexer = AMDObjectiveCLexer;
		SwiftLexer = AMDSwiftLexer;
		KotlinLexer = AMDKotlinLexer;
		JavaLexer = AMDJavaLexer;
		CsLexer = AMDCsLexer;
		JavaScriptLexer = AMDJavaScriptLexer;
		VbLexer = AMDVbLexer;
	}
);



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

		// Array.from is map
		Array.from(
			document.querySelectorAll('div.codeblock'),
			divCodigo => divCodigo.classList.add('bubaloop')
		);

		await Promise.all([
			highlightHelper('code.html', HtmlLexer),
			highlightHelper('code.rust', RustLexer),
			highlightHelper('code.go', GoLexer),
			highlightHelper('code.cpp', CppLexer),
			highlightHelper('code.objectivec', ObjectiveCLexer),
			highlightHelper('code.swift', SwiftLexer),
			highlightHelper('code.kotlin', KotlinLexer),
			highlightHelper('code.java', JavaLexer),
			highlightHelper('code.cs', CsLexer),
			highlightHelper('code.javascript', JavaScriptLexer),
			highlightHelper('code.python', PythonLexer),
			highlightHelper('code.visualbasic', VbLexer)
		]);

		// TODO add bubaloop theme to code.generic and highlight it. will need to breakdown highlightHelper

	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

})();