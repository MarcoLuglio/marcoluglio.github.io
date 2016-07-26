'use strict';

/* globals performance */



/**
 * Simple module system
 * add a module calling define('id', moduleContent);
 * use a module calling define(['id1', 'id2'], function(moduleContent1, moduleContent2) { use contents here });
 */
var define = (function() {


	var modulesIndex = [];


	var createModule = function(moduleName, moduleDefinition) {
		var moduleResult = moduleDefinition();
		modulesIndex.push([moduleName, moduleResult]);
		return moduleResult;
	};


	var createModuleWithDependencies = function(moduleName, dependencies, moduleDefinition) {
		var moduleDefinitionWithDependencies = function() {
			return define(dependencies, moduleDefinition);
		};
		return createModule(moduleName, moduleDefinitionWithDependencies);
	};


	var useModules = function(modulesList, callback) {

		var modules = [];

		var moduleName = null;
		var listModuleName = null;
		var listModuleFunction = null;

		var i = 0;
		var j = 0;

		//assemble modules based on list
		for (i = 0; i < modulesList.length; i++) {

			moduleName = modulesList[i];

			for (j = 0; j < modulesIndex.length; j++) {

				listModuleName = modulesIndex[j][0];
				listModuleFunction = modulesIndex[j][1];

				if (moduleName === listModuleName) {
					modules.push(listModuleFunction);
					break;
				}

			}

		}

		return callback.apply(window, modules);

	};


	var defineOverload = function(arg1, arg2, arg3) {
		if (typeof arg1 === 'string') {
			if (Array.isArray(arg2)) {
				return createModuleWithDependencies(arg1, arg2, arg3);
			} else {
				return createModule(arg1, arg2);
			}
		} else {
			return useModules(arg1, arg2);
		}
	};


	return defineOverload;


})();



/*

// salva lambda com definição pra depois
define('lightbox', ['node'], function(node) {

	var _private;

	var _public;

	return _public;

});

// salva definição pra depois
define('lightbox', function() {
	// o que eu retornar disso deve ser salvo no 'lightbox'
});

// executa imediatamente
define(['node'], function(node) {
	define('lightbox', function(parametros) {
		//
	});
});

define('smoothScroll', function(idAncora, deslocamento) {
	return define(['tween', 'getElementOffset'], function(tween, getElementOffset) {
*/



/**
 * Retorna stack trace.
 * Como estamos usando funções em "strict mode", não existe um método genérico que possibilite
 * ler a tack de execução.
 * Note que alguns erros de javascript, como o SecurityError não herdam do objeto Error,
 * e consequentemente não terão o método getStack implementado.
 */
Error.prototype.getStack = function() {
	if (this.stack) {
		//Firefox / chrome
		return this.stack;
	} else if (this.stacktrace) {
		//Opera
		return this.stacktrace;
	} else if (console
		&& console.trace
		) {
		return console.trace();
	} else {
		//IE / Safari
		return 'Stack trace não disponível neste navegador. Use as ferramentas de desenvolvimento nativas.';
	}
};



(function() {

	//TODO melhorar isso, tem que registrar pra window e outros elementos tb
	//prototype ate chegar no Element
	//definir isso como módulo

	function padronizarEvento(elemento) {

		if (!elemento.addEventListener) {

			elemento.addEventListener = function(tipoDoEvento, callback) {

				var tipoDoEventoTraduzido = '';

				//TODO mouseup, mousedown, keyup, keydown, keypress, o que mais??
				switch(tipoDoEvento) {
					case 'DomContentLoaded':
						tipoDoEventoTraduzido = 'onload';
						break;
					default:
						tipoDoEventoTraduzido = 'on' + tipoDoEvento;
						break;
				}

				//TODO o target do evento vai sempre ser window, tem que fazer uma closure e alterar o originador do evento

				elemento.attachEvent(tipoDoEventoTraduzido, callback);

			};

		}

	}

	padronizarEvento(window);
	padronizarEvento(document);

}());



/**
 * Interpolates results in a given time span
 */
define('tween', function() {

	// da maneira com que este módulo está definido, não cria novos objetos a cada tween!
	// portanto e necessário resetar as propriedades sempre

	var _public = {

		init: function(elemento, propriedade, inicio, fim, tempo, easing, unidade) {
			_private.elemento = elemento;//TODO tem que fazer um controle pra não animar a mesma propriedade do mesmo objeto com tweens diferentes
			_private.propriedade = propriedade;
			_private.inicio = inicio;
			_private.fim = fim;
			_private.sentido = 1;
			if (inicio > fim) {
				_private.sentido = -1;
			}
			_private.tempo = tempo;
			_private.easing = easing;
			_private.unidade = unidade;
			_private.rodar = _private.closureRodar(_private);
			_private.iniciar();
			Object.seal(_private);
			Object.seal(this);
			return this;
		},

		parar: function() {
			if (window.requestAnimationFrame) {
				cancelAnimationFrame(_private.idAnimacao);
			} else {
				clearInterval(_private.idAnimacao);
			}
		}

	};


	var _private = {


		iniciar: function() {
			if (window.requestAnimationFrame && window.performance) {
				this.timestampInicio = performance.now();
				this.idAnimacao = requestAnimationFrame(this.rodar);
			} else {
				this.timestampEpoch = Date.now();
				this.timestampInicio = 0;
				this.idAnimacao = this.rodar(Date.now() - this.timestampEpoch);
			}
		},


		closureRodar: function(contexto) {
			return function(timestamp) {

				var valor1 = null;
				var valor2 = null;
				var parar = false;

				//calcula o progresso da animação (de 0 até 1);
				contexto.valor = (timestamp - contexto.timestampInicio) / contexto.tempo;

				//suaviza a animação de acordo com a equação escolhida
				switch (contexto.easing) {

					case 'swing':
						contexto.valor = 0.5 - Math.cos( contexto.valor * Math.PI ) / 2;
						break;

					//linear
					default:
						break;

				}

				//calcula o valor baseado no progresso da animação
				contexto.valor *= (Math.abs(contexto.fim - contexto.inicio) * contexto.sentido);

				contexto.valor += contexto.inicio;

				if ((timestamp - contexto.timestampInicio) > contexto.tempo) {
					parar = true;
					contexto.valor = contexto.fim;
				}

				if (contexto.elemento == window
					&& (contexto.propriedade == 'scrollY' || contexto.propriedade == 'scrollX')
					) {

					valor1 = contexto.elemento.scrollLeft;
					valor2 = contexto.elemento.scrollTop;

					if (contexto.propriedade == 'scrollY') {
						valor2 = contexto.valor;
					} else if (contexto.propriedade == 'scrollX') {
						valor1 = contexto.valor;
					}

					contexto.elemento.scrollTo(valor1, valor2);//+ contexto.unidade

				} else {

					contexto.elemento[contexto.propriedade] = contexto.valor;// + contexto.unidade;

				}

				if (!parar) {
					if (window.requestAnimationFrame) {
						contexto.idAnimacao = requestAnimationFrame(contexto.rodar);
					} else {
						contexto.idAnimacao = setTimeout(function() {
							contexto.rodar(Date.now() - contexto.timestampEpoch);
						},
						1000 / 30
						);
					}
				} else {
					_public.parar();
				}

			};
		},

		rodar: null,

		elemento: null,

		propriedade: null,

		inicio: 0,

		fim: 1,

		sentido: 1,

		tempo: 0,

		easing: null,

		unidade: 'px',

		idAnimacao: 0,

		timestampInicio: 0,

		valor: 0


	};


	return _public;


});



/**
 * Calcula a posição y do elemento relativo ao topo da página
 *
 * Baseado nas funções descritas em:
 * http://stackoverflow.com/q/123999
 * http://www.quirksmode.org/js/findpos.html
 */
define('getElementOffset', function() {
	return function(elemento) {
		var top = elemento.offsetTop;
		var el = elemento;
		while(el.offsetParent) {
			el = el.offsetParent;
			top += el.offsetTop;
		}
		return top;
	}
});



/**
 * Animates scrolling the page to an element
 */
define('smoothScroll', ['tween', 'getElementOffset'], function(tween, getElementOffset) {

	return function(idAncora, deslocamento) {

		var _public = {

			init: function(idAncora, deslocamento) {
				try {
					_private.idAncora = idAncora;
					_private.conteinerAncora = document.getElementById(idAncora);
					_private.idAlvo = _private.conteinerAncora.href.substring(_private.conteinerAncora.href.lastIndexOf('#') + 1);
					if (_private.idAlvo !== '') {
						_private.conteinerAlvo = document.getElementById(_private.idAlvo);
					}
					_private.deslocamento = deslocamento;
					_private.resizeHandler = _private.closureResizeHandler(_private);
					_private.clickHandler = _private.closureClickHandler(_private);
					_private.resizeHandler({});
					window.addEventListener('load', _private);
					window.addEventListener('resize', _private);
					_private.conteinerAncora.addEventListener('click', _private);
					Object.seal(_private);
					Object.seal(this);
					return this;
				} catch (erro) {
					console.error('Erro ao criar um elemento que realiza scroll suave.\n' + erro.message + '\n' + erro.getStack());
				}
			}

		};


		var _private = {


			closureClickHandler: function(contexto) {
				return function(evento) {
					try {
						evento.preventDefault();
						//this.resizeHandler({});
						var tweenScroll = Object.create(tween);
						tweenScroll.init(window, 'scrollY', window.scrollY, contexto.deslocamentoDoAlvo, contexto.tempoDeRolagem, 'swing', 'px');
					} catch (erro) {
						console.error('Erro ao clicar em um elemento que inicia uma rolagem suave.\n' + erro.message + '\n' + erro.getStack());
					}
				};
			},

			clickHandler: null,


			closureResizeHandler: function(contexto) {
				return function(/*evento*/) {
					if (contexto.idAlvo !== '') {
						contexto.deslocamentoDoAlvo = getElementOffset(contexto.conteinerAlvo) + contexto.deslocamento;
					}
				};
			},

			resizeHandler: null,


			handleEvent: function(evento) {
				switch(evento.type) {
					case 'click':
						this.clickHandler(evento);
						break;
					case 'load': // fallthrough
					case 'resize':
						this.resizeHandler(evento);
						break;
				}
			},


			idAncora: null,

			conteinerAncora: null,

			idAlvo: null,

			conteinerAlvo: null,

			deslocamentoDoAlvo: 0,

			tempoDeRolagem: 700,

			deslocamento: 0


		};


		_public.init(idAncora, deslocamento);

		return _public;


	};


});



/**
 * Escreve o ano atual no elemento desejado
 */
define('anoAtual', function() {


	var _public = Object.create(Object.prototype, {

		init: {
			enumerable: true,
			value: function(idConteiner) {
				try {
					_private.idConteiner = idConteiner;
					_private.data = new Date();
					_private.conteiner = document.getElementById(_private.idConteiner);
					_private.conteiner.innerHTML = _private.data.getFullYear();
					Object.seal(_private);
					Object.seal(this);
					return this;
				} catch (erro) {
					console.log('Erro ao iniciar o ano atual:');
					console.log(erro);
				}
			}
		}

	});


	var _private = Object.create(Object.prototype, {

		idConteiner: {
			writable: true,
			value: null
		},

		conteiner: {
			writable: true,
			value: null
		},

		data: {
			writable: true,
			value: null
		}

	});


	return _public;


});



/**
 * Wraps a dom node and adds method to manipulate its class attribute
 */
define('node', function() {

	return Object.create(Object.prototype, {


		init: {
			enumerable: true,
			value: function(node) {
				try {
					Object.defineProperties(this, {
						node: {
							value: node
						}
					});
					Object.seal(this);
					return this;
				} catch (erro) {
					console.log('Erro ao iniciar um nó');
					console.log(erro);
				}
			}
		},


		addClass: {
			enumerable: true,
			value: function(className) {
				if (!this.hasClass(className)) {
					this.node.className += ' ' + className;
				}
			}
		},


		removeClass: {
			enumerable: true,
			value: function(className) {
				var currentClass = ' ' + this.node.className + ' ';
				currentClass = currentClass.replace(' ' + className + ' ', ' ');
				currentClass = this.normalize(currentClass);
				// TODO if className != currentClass
				this.node.className = currentClass;
			}
		},


		toggleClass: {
			enumerable: true,
			value: function(className) {
				if (this.hasClass(className)) {
					this.removeClass(className);
					return;
				}
				this.addClass(className);
			}
		},


		hasClass: {
			enumerable: true,
			value: function(className) {
				var currentClass = ' ' + this.node.className + ' ';
				if (currentClass.indexOf(' ' + className + ' ') > -1) {
					return true;
				}
				return false;
			}
		},


		normalize: {
			value: function(classString) {
				// TODO if string has more than one space, convert to single space
				return classString;
			}
		},


		node: {
			value: null
		}


	});

});



/**
 * Cross-browser "dom ready"
 */
define('domReady', function() {

	return function(callback) {

		if (document.readyState === 'interactive'
			|| document.readyState === 'complete'
			|| document.readyState === 'loaded'
			) {

			callback(null);

		} else {
			document.addEventListener('DOMContentLoaded', callback);
		}

	};

});


/**
 * Boilerplate
 */
define('imageRecyclingQueue', function() {

	var _public = Object.create(Object.prototype, {

		/*init: {
			value: function() {
				//
				Object.seal(_private);
				Object.seal(this);
				return this;
			}
		},*/

		/**
		 * Puts an image in the recycle bin
		 */
		queue: {
			value: function(image) {
				// remove from parentNode
				if (image.parentNode) {
					image.parentNode.removeChild(image);
				}
				image.src = null;
				_private.queue.push(image);
			}
		},

		/**
		 * Picks a recycled image to use
		 */
		dequeue: {
			value: function() {
				var image = _private.queue.pop();
				if (!image) {
					image = document.createElement('img');
				}
				return image;
			}
		}

	});

	var _private = Object.create(Object.prototype, {
		queue: {
			value: []
		}
	});

	return _public;

});



/**
 * Expects an anchor with an image inside.
 * The anchor points to a higher resolution image and has an attribute called data-lightbox,
 * which is the group of the image
 */
define('lightbox', ['node', 'imageRecyclingQueue'], function(node, imageRecyclingQueue) {

	var _public = Object.create(Object.prototype, {

		init: {
			value: function(lightBoxGroup) {
				_private.initLightboxLayer();
				Object.seal(_private);
				Object.seal(this);
				return this;
			}
		}

	});

	var _private = Object.create(Object.prototype, {

		buildLightbox: {
			value: function() {

				var imageSource = null;
				var image = null;
				var length = this.lightboxItems.length;
				var i = 0;

				// TODO limpar miniaturas apenas, sem limpar a ampliação por exemplo
				for (i = this.lightboxLayer.node.childNodes.length; i > 0; i--) {
					image = this.lightboxLayer.node.childNodes[i - 1];
					image.removeEventListener('click', this.thumbnailClickHandler.bind(this));
					imageRecyclingQueue.queue(image);
					image = null;
				}

				for (i = 0; i < length; i++) {
					imageSource = this.lightboxItems[i].getAttribute('href');
					image = imageRecyclingQueue.dequeue();
					image.src = imageSource;
					image.addEventListener('click', this.thumbnailClickHandler.bind(this));
					this.lightboxLayer.node.appendChild(image);
				}

				this.lightboxLayer.addClass('opened');

			}
		},

		closeLightbox: {
			value: function() {
				this.lightboxLayer.removeClass('opened');
			}
		},

		initLightboxLayer: {
			value: function() {

				var lightboxElement = null;

				// lightboxIndex
				var item = null;
				var itemLightbox = null;
				var itemLightboxGroup = null;
				var allItems = document.querySelectorAll('[data-lightbox]');
				var length = allItems.length;
				var i = 0;

				this.lightboxIndex['lightbox'] = [];
				this.lightboxIndex['lightboxGroup'] = [];

				for (i = 0; i < length; i++) {

					item = allItems.item(i);
					itemLightbox = item.getAttribute('data-lightbox');
					itemLightboxGroup = item.getAttribute('data-lightbox-group');

					if (!this.lightboxIndex['lightbox'][itemLightbox]) {
						this.lightboxIndex['lightbox'][itemLightbox] = [];
					}
					if (!this.lightboxIndex['lightboxGroup'][itemLightbox]) {
						this.lightboxIndex['lightboxGroup'][itemLightboxGroup] = [];
					}

					// TODO index by id instead of references
					this.lightboxIndex['lightbox'][itemLightbox].push(item);
					this.lightboxIndex['lightboxGroup'][itemLightboxGroup].push(item);

					item.addEventListener('click', this.clickHandler.bind(this));

				}

				// lightbox layer
				lightboxElement = document.createElement('div');
				this.lightboxLayer = Object.create(node).init(lightboxElement);
				this.lightboxLayer.addClass('lightboxLayer');
				this.lightboxLayer.node.addEventListener('click', this.closeLightbox.bind(this));
				document.body.appendChild(this.lightboxLayer.node);

			}
		},

		clickHandler: {
			value: function(evento) {

				evento.preventDefault();

				var itemLightbox = evento.currentTarget.getAttribute('data-lightbox');
				this.lightboxItems = this.lightboxIndex['lightbox'][itemLightbox];
				this.buildLightbox();

			}
		},

		thumbnailClickHandler: {
			value: function(evento) {
				evento.preventDefault();
				evento.stopPropagation();
				// PAREI AQUI
				// TODO change big image
			}
		},

		lightboxIndex: {
			value: []
		},

		lightboxLayer: {
			writable: true,
			value: null
		},

		lightboxItems: {
			writable: true,
			value: []
		}

	});

	return _public;

});



/**
 * Boilerplate
 */
// define('id', function() {

// 	var _public = Object.create(Object.prototype, {

// 		init: {
// 			value: function() {
// 				//
// 				Object.seal(_private);
// 				Object.seal(this);
// 				return this;
// 			}
// 		}

// 	});

// 	var _private = Object.create(Object.prototype, {
// 		//
// 	});

// 	return _public;

// });



/**
 * Função de entrada
 */
define(

	[
		'domReady',
		'node',
		'lightbox',
		'smoothScroll',
		'anoAtual'
	],

	function(

		domReady,
		node,
		lightbox,
		smoothScroll,
		anoAtual

		) {

		domReady(function() {

			/*topoResponsivo.construct('topoImagem');
			elementoFlutuante.construct('menu');
			elementoFixo.construct('linkTopo');*/

			// currículo

			var botaoCurriculo = document.querySelector('button');
			var seletorCurriculo = '.curriculoExtenso';
			var classeCurriculo = 'fechado';
			var curriculo = document.querySelector(seletorCurriculo);
			var curriculoNode = Object.create(node).init(curriculo);

			botaoCurriculo.addEventListener('click', function(/*evento*/) {
				curriculoNode.toggleClass(classeCurriculo);
			});

			curriculoNode.addClass(classeCurriculo);

			// lightbox
			lightbox.init();

			// scroll suave
			// TODO scrollSuave é recriado toda a vez que é chamado, tinha que dar um jeito de fazer cache dos objetos, mas isso é implementação interna

			smoothScroll('linkHome', -100);
			smoothScroll('linkImpresso', -100);
			smoothScroll('linkImagem', -100);
			smoothScroll('linkCatalogos', -100);
			smoothScroll('linkIdentidade', -100);
			smoothScroll('linkInformacao', -100);

			smoothScroll('linkAnteriorImpresso', -100);
			smoothScroll('linkHomeImpresso', -100);
			smoothScroll('linkProximoImpresso', -100);

			smoothScroll('linkAnteriorImagem', -100);
			smoothScroll('linkHomeImagem', -100);
			smoothScroll('linkProximoImagem', -100);

			smoothScroll('linkAnteriorCatalogos', -100);
			smoothScroll('linkHomeCatalogos', -100);
			smoothScroll('linkProximoCatalogos', -100);

			smoothScroll('linkAnteriorIdentidade', -100);
			smoothScroll('linkHomeIdentidade', -100);
			smoothScroll('linkProximoIdentidade', -100);


			// ano atual

			anoAtual.init('ano');

		});

	}

);