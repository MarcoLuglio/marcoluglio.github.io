'use strict';



define('legacyHighlighter', () => {

	var realcador = Object.create(Object.prototype, {


		init: {
			value: function() {
				Object.seal(this);
			},
			writable: false
		},


		realcar: {
			value: function(input) {
				//
			},
			writable: false
		},


		splice: {
			value: function(indice, quantoRemover, oQueInserir) {
				var input = this.output.toString();
				this.output = input.substring(0, indice);
				this.output += oQueInserir;
				this.output += input.substring(indice + quantoRemover);
			},
			writable: false
		},


		verificarIndices: {
			value: function(indiceA, indiceB) {
				var indicesDisponiveis = this.procurarIndicesDisponiveis(indiceA, indiceB);
				if (indicesDisponiveis[0] > -1 || indicesDisponiveis[1] > -1) {
					return true;
				}
				return false;
			},
			writable: false
		},


		/**
		 * Salva as faixas de indices que não devem mais ser realçadas
		 *
		 * @param indiceA
		 * @param indiceB
		 * @param offset Deslocamento a ser aplicado aos indices posteriores à inserção deste indice
		 */
		bloquearIndices: {

			value: function(indiceA, indiceB, inicioRealce, fimRealce) {
				var indicesDisponiveis = this.procurarIndicesDisponiveis(indiceA, indiceB);
				this.indiceRealces[0].splice(indicesDisponiveis[0], 0, indiceA, indiceB);
				this.indiceRealces[1].splice(indicesDisponiveis[0], 0, inicioRealce, fimRealce);
			},

			writable: false

		},


		procurarIndicesDisponiveis: {

			value: function(indiceA, indiceB) {

				var indices = [-1, -1];
				var i = 0;
				var indice = 0;
				var ultimoIndice = 0;
				var penultimoIndice = 0;

				//se é o primeiro bloqueio
				if (this.indiceRealces[0].length === 0) {
					return [0, 0];
				}

				//se estou bloqueando indices maiores do que os já bloqueados
				if (indiceA > this.indiceRealces[0][this.indiceRealces[0].length - 1]) {
					return [this.indiceRealces[0].length, this.indiceRealces[0].length];
				}

				for (i = 0; i < this.indiceRealces[0].length; i = i + 2) {
					indice = this.indiceRealces[0][i + 1];
					if (indice < indiceA) {
						ultimoIndice = indice;
						penultimoIndice = this.indiceRealces[0][i];
					} else {
						if (this.indiceRealces[0][i] > indiceB) {
							indices[0] = i;
							indices[1] = i + 1;
						}
						break;
					}
					//colocar 4,5
					//colocar 3,4
					//2,3  6,7
				}

				return indices;

			},

			writable: false

		},


		efetuarRealces: {

			/**
			 * Substitui os realces indexados
			 */
			value: function() {
				var i = 0;
				//a substituição é feita de trás para frente para que não seja necessário recalcular os índices em cada substituição
				for (i = this.indiceRealces[0].length - 1; i > 0; i = i - 2) {
					this.splice(this.indiceRealces[0][i] + 1, 0, this.indiceRealces[1][i]);
					this.splice(this.indiceRealces[0][i - 1], 0, this.indiceRealces[1][i - 1]);
				}
			},

			writable: false

		},


		output: {
			value: '',
			writable: true
		},


		indiceRealces: {
			value: [[], []],
			writable: true
		},


		indiceA: {
			value: 0,
			writable: true
		},


		indiceB: {
			value: 0,
			writable: true
		}


	});



	var realcadorHtml = Object.create(realcador, {


		realcar: {

			value: function(input) {

				this.indiceRealces = [[], []];
				this.output = input;

				this.indexarRealceComentarios(0);
				this.indexarRealceTags(0);
				this.efetuarRealces();
				//this.indexarRealceAtributos();

				return this.output

			},

			writable: false

		},


		indexarRealceComentarios: {

			value: function(indice) {

				this.indiceA = -1;
				this.indiceB = -1;

				this.indiceA = this.output.indexOf('&lt;!--', indice);

				if (this.indiceA === -1) {
					return;
				}

				this.indiceB = this.output.indexOf('--&gt;', this.indiceA + '&lt;!--'.length);

				if (this.indiceB === -1) {
					this.indiceB = this.output.length - 1;
				} else {
					this.indiceB += '--&gt'.length;
				}

				if (!this.verificarIndices(this.indiceA, this.indiceB)) {
					this.indexarRealceComentarios(this.indiceB + 1);
					return;
				}

				this.bloquearIndices(this.indiceA, this.indiceB, '<span class="comment">', '</span>');

				this.indexarRealceComentarios(this.indiceB + 1);

			},

			writable: false


		},


		indexarRealceTags: {

			value: function(indice) {

				this.indiceA = -1;
				this.indiceB = -1;

				this.indiceA = this.output.indexOf('&lt;', indice);

				if (this.indiceA === -1) {
					return;
				}

				//TODO verificar se não são comentários

				this.indiceB = this.output.indexOf('&gt;', this.indiceA + '&lt;'.length);

				if (this.indiceB === -1) {
					this.indiceB = this.output.length - 1;
				} else {
					this.indiceB += '&gt'.length;
				}

				if (!this.verificarIndices(this.indiceA, this.indiceB)) {
					this.indexarRealceTags(this.indiceB + 1);
					return;
				}

				this.indexarRealceAtributos(this.indiceA, this.indiceB);

				this.bloquearIndices(this.indiceA, this.indiceB, '<span class="tag">', '</span>');

				this.indexarRealceTags(this.indiceB + 1);

			},

			writable: false


		},


		indexarRealceAtributos: {

			value: function() {

				//TODO
				//aumentar o this.indiceB e o this.offsetRealce

			},

			writable: false

		}


	});



	var realceSintaxe = {


		init: function() {
			Object.seal(this);
		},


		realcar: function() {

			var blocosDeCodigo = document.querySelectorAll('code.html, code.c');
			var i = 0;

			for (i = 0; i < blocosDeCodigo.length; i++) {
				if (blocosDeCodigo.item(i).className === 'html') {
					blocosDeCodigo.item(i).className += ' bubaloop';
					blocosDeCodigo.item(i).innerHTML = this.processadores[1][0].realcar(blocosDeCodigo.item(i).innerHTML);
				}
			}

		},


		processadores: [
			[
				'html'
			], [
				realcadorHtml
			]
		]


	};

	return realceSintaxe;

});