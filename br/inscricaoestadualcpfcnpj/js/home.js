import { domReadyPromise, NodeListIterator } from '../../../compartilhado/js/utils.js';
import { Index } from '../../../compartilhado/js/index.js';
import { HighlightEnhancer } from '../../../compartilhado/js/highlightEnhancer.js';
import { RustLexer, CppLexer, CsLexer, JavaScriptLexer, HtmlLexer, Highlighter } from '../../../compartilhado/js/highlighter.js';
import { gerarInscricaoEstadualPR, gerarCpf, validarCpf, gerarCnpj } from './geradores.js';



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

	const geradorcpfinput = document.getElementById('geradorcpfinput');
	const geradorcpfbtn = document.getElementById('geradorcpfbtn');
	geradorcpfbtn.addEventListener('click', evento => {
		let cpf = gerarCpf(geradorcpfinput.value);
		cpf = `${cpf.substr(0, 3)}.${cpf.substr(3, 3)}.${cpf.substr(6, 3)}-${cpf.substr(9, 2)}`;
		geradorcpfinput.value = cpf;
	});

	const validadorcpfinput = document.getElementById('validadorcpfinput');
	const validadorcpfbtn = document.getElementById('validadorcpfbtn');
	validadorcpfbtn.addEventListener('click', evento => {
		let valido = validarCpf(validadorcpfinput.value);
		console.log(`valido: ${valido}`);
	});

})();
