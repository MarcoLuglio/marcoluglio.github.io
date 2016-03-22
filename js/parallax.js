'use strict';

define('Parallax', ['converter'], (converter) => {

	const Parallax = class Parallax {

		constructor(containerId) {

			const container = document.getElementById(containerId);

			Object.defineProperties(this, {

				container: {value: container},
				card1Array: {value: []},
				card2Array: {value: []},
				originalCard: {writable: true, value: null},
				card1: {value: document.createElement('p')},
				card2: {value: document.createElement('p')},
				lineWidth: {value: 40},

				anchorX: {writable: true, value: 0},
				anchorY: {writable: true, value: 0},
				isInitialized: {writable: true, value: false},
				rotationDegrees: {writable: true, value: 0},
				isActive: {writable: true, value: false}

			});

			Object.seal(this);

			this.originalCard = this.container.querySelector('p');

			this.card1.style.whiteSpace = 'pre';
			this.card2.style.whiteSpace = 'pre';

			this.card2.addEventListener('mousedown', this);
			document.body.addEventListener('mousemove', this);
			document.body.addEventListener('mouseup', this);
			// TODO touch events

			this.text = this.originalCard.innerText.trim();

			this.originalCard.parentNode.removeChild(this.originalCard);
			this.container.appendChild(this.card1);
			this.container.appendChild(this.card2);

		}

		set text(value) {
			this.originalCard.innerHTML = value;
			this._splitCharacters();
		}

		beginManipulation() {
			this.isActive = true;
		}

		endManipulation() {
			this.isActive = false;
		}

		handleEvent(event) {

			event.preventDefault();

			switch(event.type) {

				case 'mousedown':
					if (!this.isInitialized) {
						this._setAnchor(event);
					}
					this.beginManipulation();
					break;

				case 'mousemove':

					if (!this.isActive) {
						return;
					}
					this._rotate(event.pageX, event.pageY);
					break;

				case 'mouseup':
					this.endManipulation();
					break;

			}

		}

		_setAnchor(event) {
			this.isInitialized = true;
			this.anchorX = event.pageX;
			this.anchorY = event.pageY;
			// se o elemento não estiver em tamanho real, não vai funcionar, garantir no navegador3D que ele esteja em tamanho real
			this.anchorX -= Math.cos(converter.toRadians(this.rotationDegrees)) * event.offsetX;
			this.anchorY -= Math.sin(converter.toRadians(this.rotationDegrees)) * event.offsetY;
		}

		_rotate(x, y) {
			this.rotationDegrees = this._getDegrees(x - this.anchorX, y - this.anchorY);
			this.card2.style.transform = 'rotate3d(0, 0, 1, ' + this.rotationDegrees + 'deg)';
		}

		_getDegrees(x, y) {
			const radians = Math.atan2(y, x);
			return converter.toDegrees(radians);
		}

		_splitCharacters() {

			const text = this.container.innerText.trim();
			const textLength = text.length;
			let character = null;
			let buffer = [];
			let randomIndex = {
				firstIndex: 0,
				secondIndex: 1,
				repeatCounter: 0
			};

			for (let i = 0; i < textLength; i++) {
				character = text.substr(i, 1);
				randomIndex = this._randomize(randomIndex, 3);
				buffer[randomIndex.firstIndex] = character;
				buffer[randomIndex.secondIndex] = ' ';
				this.card1Array.push(buffer[0]);
				this.card2Array.push(buffer[1]);
				// TODO melhorar isso aqui pra fazer um wrap decente
				if (i && (i % this.lineWidth === 0)) {
					let lineBreak = '\n';
					this.card1Array.push(lineBreak);
					this.card2Array.push(lineBreak);
				}
			}
			this.card1.innerHTML = this.card1Array.join('');
			this.card2.innerHTML = this.card2Array.join('');

		}

		/**
		 * Previne que a ordem dos índices se repita mais que o limite especificado
		 * @param {Number} repeatLimit limite de repetições
		 */
		_randomize(randomIndex, repeatLimit) {

			let index = Math.round(Math.random());

			if (randomIndex.firstIndex === index) {
				randomIndex.repeatCounter++;
			}

			if (randomIndex.repeatCounter >= repeatLimit) {
				index = index ? 0 : 1;
				randomIndex.repeatCounter = 0;
			}

			randomIndex.firstIndex = index;
			randomIndex.secondIndex = index ? 0 : 1;
			return randomIndex;

		}

	};

	return Parallax;

});