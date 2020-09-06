import { domReadyPromise } from '../../compartilhado/js/utils.js';
import { Index } from '../../compartilhado/js/index.js';
import { HighlightEnhancer } from '../../compartilhado/js/highlightEnhancer.js';



(async function() {

	const tiposBlocos = [
		'html',
		'rust',
		'go',
		'cpp',
		'objectivec',
		'swift',
		'kotlin',
		'java',
		'cs',
		'javascript',
		'python',
		'visualbasic'
	];

	const blocosDeCodigo = [];

	const highlighterWorker = new Worker('../../compartilhado/js/highlighterWorker.js', { type: 'module' });

	highlighterWorker.onmessage = (event) => {

		const codeBlocksIndex = event.data[0];
		const codeBlockIndex = event.data[1];
		const highlightedSource = event.data[2];

		let blocoDeCodigo = blocosDeCodigo[codeBlocksIndex][codeBlockIndex];
		blocoDeCodigo.classList.add('bubaloop')
		blocoDeCodigo.innerHTML = highlightedSource;
		const highlightEnhancer = new HighlightEnhancer(blocoDeCodigo);

	};

	await domReadyPromise();

	try {
		const index = new Index('indice', 3, false);
	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

	try {

		// Array.from is map

		Array.from(
			document.querySelectorAll('div.codeblock'),
			divCodigo => divCodigo.classList.add('bubaloop')
		);

		// TODO não vai bloquear a Ui por muito tempo se fizer assim de uma vez só?
		Array.from(
			tiposBlocos,
			(tipoBloco, tipoBlocoIndice) => {
				blocosDeCodigo[tipoBlocoIndice] = document.querySelectorAll(`code.${tipoBloco}`);
			}
		);

		// TODO refatorar, tá difícil de ler...
		Array.from(

			blocosDeCodigo,

			(blocosDeCodigoTipo, blocosDeCodigoTipoIndice) => {

				Array.from(

					blocosDeCodigoTipo,

					(blocoDeCodigo, blocoDeCodigoIndice) => {

						const source = blocoDeCodigo.innerHTML;
						highlighterWorker.postMessage([
							blocosDeCodigoTipoIndice,
							blocoDeCodigoIndice,
							tiposBlocos[blocosDeCodigoTipoIndice], // ugh...
							source
						]); // TODO posso passar um objeto ao invés de uma array??

					}

				);

			}

		);

		// TODO add bubaloop theme to code.generic and highlight it. will need to breakdown highlightHelper

	} catch (erro) {
		console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
	}

})();