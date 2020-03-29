'use strict';

/**
 * Wraps a node list to allow iterating it with for of loops
 */
const NodeListIterator = class NodeListIterator {

	constructor(nodeList) {
		Object.defineProperties(this, {
			_currentIndex: {value: 0, writable: true},
			_nodeList: {value: nodeList}
		});
		Object.seal(this);
	}

	get currentIndex() {
		return this._currentIndex;
	}

	// iterador for of
	*[Symbol.iterator]() {
		for (let i = 0; i < this._nodeList.length; i++) {
			this._currentIndex = i;
			yield this._nodeList.item(i);
		}
	}

}



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

	get currentIndex() {
		return this._pointer;
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
			_currentIndex: {value: 0, writable: true},
			_rangeStart: {value: rangeStart},
			_rangeEnd: {value: rangeEnd},
			_iterateStart: {value: iterateStart},
			_iterateEnd: {value: iterateEnd}
		});
		Object.seal(this);
	}

	get currentIndex() {
		return this._currentIndex;
	}

	// iterador for of
	*[Symbol.iterator]() {
		for (let i = this._iterateStart; i <= this._iterateEnd; i++) {
			this._currentIndex = i;
			yield i;
		}
	}

};



/**
 * Wraps an array to allow iterating it backwards with for of loops
 */
const ArrayReverseIterator = class ArrayReverseIterator {

	constructor(array) {
		Object.defineProperties(this, {
			_currentIndex: {value: 0, writable: true},
			_array: {value: array}
		});
		Object.seal(this);
	}

	get currentIndex() {
		return this._currentIndex;
	}

	// iterador for of
	*[Symbol.iterator]() {
		for (let i = this._array.length - 1; i >= 0; i--) {
			this._currentIndex = i;
			yield this._array[i];
		}
	}

};

export { NodeListIterator, StringIterator, RangeIterator, ArrayReverseIterator };