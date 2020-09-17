import { domReadyPromise, NodeListIterator } from '../../../compartilhado/js/utils.js';
import { Index } from '../../../compartilhado/js/index.js';
import { HighlightEnhancer } from '../../../compartilhado/js/highlightEnhancer.js';
import { RustLexer, CppLexer, CsLexer, JavaScriptLexer, HtmlLexer, Highlighter } from '../../../compartilhado/js/highlighter.js';



async function highlightAsync(selector, Lexer) {

	try {

		const blocosDeCodigo = new NodeListIterator(document.querySelectorAll(selector));
		const lexer = new Lexer();
		const highlighter = new Highlighter();

		for (let blocoDeCodigo of blocosDeCodigo) {

			const source = blocoDeCodigo.innerHTML;
			blocoDeCodigo.className += ' bubaloop';

			let tokens = await lexer.parseAsync(source);
			let highlightedSource = await highlighter.highlightAsync(source, tokens);
			blocoDeCodigo.innerHTML = highlightedSource;
			const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);

		}

	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

}



(async function() {

	await domReadyPromise();

	try {
		const index = new Index('indice', 3, false);
	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

	try {
		const divsDeCodigo = new NodeListIterator(document.querySelectorAll('div.codeblock'));
		for (let divCodigo of divsDeCodigo) {
			divCodigo.className += ' bubaloop';
		}
	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

	await highlightAsync('code.rust', RustLexer);
	await highlightAsync('code.cpp', CppLexer);
	await highlightAsync('code.cs', CsLexer);
	await highlightAsync('code.javascript', JavaScriptLexer);
	await highlightAsync('code.html', HtmlLexer);

})();



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