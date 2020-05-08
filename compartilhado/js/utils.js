'use strict';

/**
 * Helper para uso de promessas. Permite que a decisão de como resolver a promessa seja feita após a criação da promessa.
 */
const Deferred = class Deferred {

	constructor() {

		Object.defineProperties(this, {
			_promise: {writable: true, value: null},
			_resolve: {writable: true, value: null},
			_reject: {writable: true, value: null}
		});

		Object.seal(this);

		this._promise = new Promise(((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		}).bind(this));

	}

	resolve(value) {
		return this._resolve(value);
	}

	reject(reason) {
		return this._reject(reason);
	}

	then(callbackAsync) {
		return this._promise.then(callbackAsync);
	}

};



/**
 * Wraps a node list to allow iterating it with for of loops
 */
const NodeListIterator = class NodeListIterator {

	constructor(nodeList) {
		Object.defineProperty(this, '_nodeList', {value: nodeList});
		Object.seal(this);
	}

	// iterador for of
	*[Symbol.iterator]() {
		for (let i = 0; i < this._nodeList.length; i++) {
			yield this._nodeList.item(i);
		}
	}

};



/**
 * Provides iterator to traverse strings
 */
const StringIterator = class StringIterator {

	constructor(rawString) {
		const pointerLimit = rawString.length;
		Object.defineProperties(this, {
				_string: {value: rawString},
				_pointer: {value: -1, writable: true},
				_pointerLimit: {value: pointerLimit}
		});
		Object.seal(this);
	}

	// iterador for of
	*[Symbol.iterator]() {
		while ((this._pointer + 1) < this._pointerLimit) {
			this._advancePointer();
			yield this._string.substr(this._pointer, 1);
		}
		this.reset();
	}

	hasNext() {
		if (this._pointer + 1 < this._pointerLimit) {
			return true;
		}
		return false;
	}

	next(numberOfCharacters) {
		if (!numberOfCharacters) {
			numberOfCharacters = 1;
		}
		this._advancePointer();
		return this._string.substr(this._pointer, numberOfCharacters);
	}

	reset() {
		this._pointer = -1;
	}

	get pointer() {
		return this._pointer;
	}

	_advancePointer() {
		if (this._pointer + 1 >= this._pointerLimit) {
			this._pointer = -1;
		}
		this._pointer += 1;
	}

};



const RangeIterator = class RangeIterator {

	/**
	 * Gera uma faixa de números inteiros. Inclusivo.
	 * @param {Number} rangeStart
	 * @param {Number} rangeEnd
	 */
	constructor(rangeStart, rangeEnd) {

		let iterateStart = rangeStart;
		let iterateEnd = rangeEnd;

		if (rangeStart > rangeEnd) {
			let iterateStart = rangeStart;
			let iterateEnd = rangeEnd;
		}

		Object.defineProperties(this, {
			_rangeStart: {value: rangeStart},
			_rangeEnd: {value: rangeEnd},
			_iterateStart: {value: iterateStart},
			_iterateEnd: {value: iterateEnd}
		});
		Object.seal(this);
	}

	// iterador for of
	*[Symbol.iterator]() {
		for (let i = this._iterateStart; i <= this._iterateEnd; i++) {
			yield i;
		}
	}

};



/**
 * Cross-browser "dom ready"
 */
async function domReadyPromise() {

	const domReadyPromise = new Promise((resolve, reject) => {

		if (document.readyState === 'interactive'
			|| document.readyState === 'complete'
			|| document.readyState === 'loaded'
			) {

			resolve();

		} else {
			document.addEventListener('DOMContentLoaded', resolve);
		}

	});

	return domReadyPromise;

}



/**
 * Escreve o email no link desejado
 */
function showEmail(linkId, user, domain) {
	try {
		const link = document.getElementById(linkId);
		link.href = "mailto:" + user + "@" + domain;
		link.innerHTML = user + "@" + domain;
	} catch (erro) {
		console.log('Erro ao mostrar o email:');
		console.log(erro);
	}
}



/**
 * Escreve o ano atual no elemento desejado
 */
function showCurrentYear(containerId) {
	try {
		const container = document.getElementById(containerId);
		container.innerHTML = new Date().getFullYear();
	} catch (erro) {
		console.log('Erro ao iniciar o ano atual:');
		console.log(erro);
	}
}



export { Deferred, NodeListIterator, StringIterator, RangeIterator, domReadyPromise, showEmail, showCurrentYear };