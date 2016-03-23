'use strict';

(function() {
	documentReady(function(event) {

		try {

			// index.init();
			// index.generate('indice', 3, false);

			// TODO transformar isso num módulo
			(function() {

				var blocosDeCodigo = document.querySelectorAll('code');
				var i = 0;
				var highlight = null;

				//javaScriptParser.init();

				for (i = 0; i < blocosDeCodigo.length; i++) {
					// if (blocosDeCodigo.item(i).className === 'javascript') {//TODO melhorar essa verificação
					// 	blocosDeCodigo.item(i).innerHTML = javaScriptParser.parse(blocosDeCodigo.item(i).innerHTML);
					// }
					highlight = Object.create(highlightEnhancer);
					highlight.init(blocosDeCodigo.item(i));
				}

			})();

		} catch (erro) {
			console.error('Erro ao iniciar a página. ' + erro + '\n' + erro.stack);
		}

	});
})();