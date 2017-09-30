/* global define */

'use strict';



define('JSPatternIterator', () => {

	const JSPatternIterator = class JSPatternIterator {

		constructor() {

			Object.defineProperties(this, {
				_hasNext: {value: true, writable: true},
				_isComplete: {value: false, writable: true},
				_matchFunction: {value: null, writable: true}
			});

			// Object.seal(this); só nas subclasses

		}

		get isComplete() {
			return this._isComplete;
		}

		hasNext() {
			return this._hasNext;
		}

		/**
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter) {
			return this._matchFunction(matchCharacter);
		}

		/**
		 * Indica que o pattern já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter) {
			this._hasNext = false;
			this._isComplete = true;
			return false;
		}

	};

	return JSPatternIterator;

});



define('JSLineCommentPatternIterator', ['JSPatternIterator'], (JSPatternIterator) => {

	const JSLineCommentPatternIterator = class JSLineCommentPatternIterator extends JSPatternIterator {

		constructor() {
			super();
			this._matchFunction = this._matchSlash1;
			Object.seal(this);
		}

		_matchSlash1(matchCharacter) {
			if (matchCharacter === '/') {
				this._matchFunction = this._matchSlash2;
				return true;
			}
			this._hasNext = false;
			return false;
		}

		_matchSlash2(matchCharacter) {
			if (matchCharacter === '/') {
				this._matchFunction = this._matchSameLine;
				return true;
			}
			this._hasNext = false;
			return false;
		}

		_matchSameLine(matchCharacter) {
			this._isComplete = true;
			// any except line break
			if (this._matchLineBreak(matchCharacter)) {
				return this._matchEnd(matchCharacter);
			}
			return true;
		}

		_matchLineBreak(matchCharacter) {

			if (matchCharacter === '\n'
				|| matchCharacter === '\r'
				|| matchCharacter === '\u2028'
				|| matchCharacter === '\u2029'
				|| matchCharacter === null // EOF
				) {

				return true;
			}

			return false;

		}

	};

	return JSLineCommentPatternIterator;


	// TODO ?? chamava complete, mas tem que fazer verificações extras
	// pra saber, como ter certeza que já passou do // inicial
	// colocar esse 'check point' como informação no pattern?
	// talvez não pq em casos como comentário de bloco não vai ajudar muito
	// ou meu pattern pode ser menos simplório, ter partes begin /*, content e end */
	// mas por exemplo com expressões regulares /pattern/flags ?
	// tinha que ser mais flexível que começo, meio e fim

	// tinha que ter strategies para cada segmento
	// cada segmento além da array de characteres tem uma flag completo
	// se vier um caractere que não pertence ao segmento, mas ele já estiver completo
	// tentar passar para o próximo segmento ^_^

	// ver interface e depois se preocupar com implementação externa

	// por outro lado, quase toda a lógica do token vai ficar no pattern
	// não seria melhor deixar o pattern só com dados e os métodos todos no token?
	// não, pois token ficaria muito complicado

});



define('JSBlockCommentPatternIterator', ['JSPatternIterator'], (JSPatternIterator) => {

	const JSBlockCommentPatternIterator = class JSBlockCommentPatternIterator extends JSPatternIterator {

		constructor() {
			super();
			this._matchFunction = this._matchBeginSlash;
			Object.seal(this);
		}

		_matchBeginSlash(matchCharacter) {
			if (matchCharacter === '/') {
				this._matchFunction = this._matchBeginStar;
				return true;
			}
			this._hasNext = false;
			return false;
		}

		_matchBeginStar(matchCharacter) {
			if (matchCharacter === '*') {
				this._matchFunction = this._matchContentOrEndStar;
				return true;
			}
			this._hasNext = false;
			return false;
		}

		_matchContentOrEndStar(matchCharacter) {
			if (matchCharacter === '*') {
				this._matchFunction = this._matchEndSlash;
			}
			return true;
		}

		_matchEndSlash(matchCharacter) {

			if (matchCharacter === '/') {
				this._matchFunction = this._matchEnd;
			} else if (matchCharacter === '*') {
				// não fazer nada
				// ou em outras palavras
				// this._matchFunction = this._matchEndSlash;
			} else {
				this._matchFunction = this._matchContentOrEndStar;
			}

			return true;

		}

	};

	return JSBlockCommentPatternIterator;

});



define('JSHtmlEmphasisPatternIterator', ['JSPatternIterator'], (JSPatternIterator) => {

	const JSHtmlEmphasisPatternIterator = class JSHtmlEmphasisPatternIterator extends JSPatternIterator {

		constructor() {
			super();
			this._matchFunction = this._matchStartAngleBracket;
			Object.seal(this);
		}

		_matchStartAngleBracket(matchCharacter) {
			if (matchCharacter === '<') {
				this._matchFunction = this._matchContentOrEndAngleBracket;
				return true;
			}
			this._hasNext = false;
			return false;
		}

		_matchContentOrEndAngleBracket(matchCharacter) {
			if (matchCharacter === '>') {
				this._matchFunction = this._matchEnd;
			}
			return true;
		}

	};

	return JSHtmlEmphasisPatternIterator;

});



define('JSDecimalPatternIterator', ['JSPatternIterator'], (JSPatternIterator) => {

	const JSDecimalPatternIterator = class JSDecimalPatternIterator extends JSPatternIterator {

		constructor() {
			super();
			Object.defineProperties(this, {
				_hasMantissa: {value: false, writable: true},
				_isNumberCharacter: {value: /\d/}
			});
			this._matchFunction = this._matchNumber;
			Object.seal(this);
		}

		_matchNumber(matchCharacter) {

			if (this._isNumberCharacter.test(matchCharacter)) {
				this._isComplete = true;
				return true;
			}

			if (matchCharacter === '.' && !this._hasMantissa) {
				this._hasMantissa = true;
				this._isComplete = false;
				return true;
			}

			if (this._isComplete) {
				return this._matchEnd(matchCharacter);
			}

			this._hasNext = false;
			return false;

		}

	};

	return JSDecimalPatternIterator;

});



define('JSNumberPatternIterator', ['JSPatternIterator'], (JSPatternIterator) => {

	const JSNumberPatternIterator = class JSNumberPatternIterator extends JSPatternIterator {

		constructor() {
			super();
			Object.defineProperties(this, {
				_isNumberCharacter: {value: /\d/},
				_matchCheck: {value: null, writable: true}
			});
			this._matchFunction = this._matchFirstNumber;
			Object.seal(this);
		}

		/*
		números válidos

		binario
		tem que ter 1 número depois do b
		só 0 e 1
		0b10101110
		0B10101

		octal
		tem que ter 1 número depois do o
		só 0 até 7
		0o07
		0O07

		hexadecimal
		tem que ter 1 número depois do x
		só 0 até 9 e A até F
		0x07
		0X07
		*/

		_matchFirstNumber(matchCharacter) {

			if (matchCharacter === '0') {
				this._matchFunction = this._matchIdentifier;
				return true;
			}

			this._hasNext = false;
			return false;

		}

		_matchIdentifier(matchCharacter) {

			if (matchCharacter === null) {
				this._hasNext = false;
				return false;
			}

			// o algoritmo da máquina de estados é o mesmo sempre a partir daqui
			// só muda o tipo de verificação para cada formato de número
			this._matchFunction = this._matchEndNumber;

			// verifica qual tipo de número

			const lowerMatchCharacter = matchCharacter.toLowerCase();

			if (lowerMatchCharacter === 'b') {
				this._matchCheck = this._isBinary;
				return true;
			}

			if (lowerMatchCharacter === 'o') {
				this._matchCheck = this._isOctal;
				return true;
			}

			if (lowerMatchCharacter === 'x') {
				this._matchCheck = this._isHexadecimal;
				return true;
			}

			this._hasNext = false;
			return false;

		}

		_matchEndNumber(matchCharacter) {

			if (matchCharacter === null) {
				this._hasNext = false;
				return false;
			}

			if (this._matchCheck(matchCharacter)) {
				this._isComplete = true;
				return true;
			}

			if (this._isComplete) {
				return this._matchEnd(matchCharacter);
			}

			this._hasNext = false;
			return false;

		}

		_isBinary(matchCharacter) {
			if (matchCharacter === '0' || matchCharacter === '1') {
				return true;
			}
			return false;
		}

		_isOctal(matchCharacter) {
			// FIXME transformar matchCharacter em número
			if (this._isNumberCharacter.test(matchCharacter) && matchCharacter > -1 && matchCharacter < 8) {
				return true;
			}
			return false;
		}

		_isHexadecimal(matchCharacter) {

			if (this._isNumberCharacter.test(matchCharacter)) {
				return true;
			}

			const lowerMatchCharacter = matchCharacter.toLowerCase();

			if (lowerMatchCharacter === 'a'
				|| lowerMatchCharacter === 'b'
				|| lowerMatchCharacter === 'c'
				|| lowerMatchCharacter === 'd'
				|| lowerMatchCharacter === 'e'
				|| lowerMatchCharacter === 'f'
				) {

				return true;
			}

			return false;

		}

	};

	return JSNumberPatternIterator;

});



define('JSRegExpPatternIterator', ['JSPatternIterator'], (JSPatternIterator) => {

	const JSRegExpPatternIterator = class JSRegExpPatternIterator extends JSPatternIterator {

		constructor() {

			super();

			Object.defineProperties(this, {
				_flags: {value: ['g', 'i', 'm', 'u', 'y']},
				_hasContent: {value: false, writable: true},
				_isEscaped: {value: false, writable: true}
			});

			Object.seal(this);

			this._matchFunction = this._matchStartSlash;

		}

		_matchStartSlash(matchCharacter) {

			if (matchCharacter === '/') {
				this._matchFunction = this._matchContent;
				return true;
			}
			this._hasNext = false;
			return false;
		}

		_matchContent(matchCharacter) {

			if (matchCharacter === null
				|| matchCharacter === '/'
				|| matchCharacter === '*'
				|| this._matchLineBreak(matchCharacter)
				) {

				this._hasNext = false;
				return false;
			}

			if (matchCharacter === '\\') {
				this._isEscaped = true;
			}

			this._matchFunction = this._matchEndSlash;
			return true;

		}

		_matchEndSlash(matchCharacter) {

			if (matchCharacter === null
				|| this._matchLineBreak(matchCharacter)
				) {

				this._hasNext = false;
				return false;
			}

			if (this._isEscaped) {
				this._isEscaped = false;
				return true;
			}

			if (matchCharacter === '\\') {
				this._isEscaped = true;
				return true;
			}

			if (matchCharacter === '/') {
				this._isComplete = true;
				this._matchFunction = this._matchFlags;
			}

			return true;

		}

		_matchFlags(matchCharacter) {

			let flag = '';

			//for (let i = 0; i < this._flags.length; i++) {
			for (let flag of this._flags) {
				//flag = this._flags[i];
				if (matchCharacter === flag) {
					return true;
				}
			}

			return this._matchEnd(matchCharacter);

		}

		_matchLineBreak(matchCharacter) {

			if (matchCharacter === '\n'
				|| matchCharacter === '\r'
				|| matchCharacter === '\u2028'
				|| matchCharacter === '\u2029'
				|| matchCharacter === null // EOF
				) {

				return true;
			}

			return false;

		}

	};

	return JSRegExpPatternIterator;

});



define('JSStringPatternIterator', () => {

	const JSStringPatternIterator = class JSStringPatternIterator {

		constructor() {

			const context = this;

			Object.defineProperties(this, {
				_hasNext: {value: true, writable: true},
				_isComplete: {value: false, writable: true},
				_quoteType: {value: null, writable: true},
				_matchFunction: {value: context._matchStartQuote, writable: true},
				_isEscaped: {value: false, writable: true}
			});

			Object.seal(this);

		}

		get isComplete() {
			return this._isComplete;
		}

		hasNext() {
			return this._hasNext;
		}

		/**
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter) {
			return this._matchFunction(matchCharacter);
		}

		_matchStartQuote(matchCharacter) {

			if (matchCharacter === "'"
				|| matchCharacter === '"'
				|| matchCharacter === '`' // TODO futuramente reimplementar isso com this.openType e this.closeType e as expressões
				) {

				this._quoteType = matchCharacter;
				this._matchFunction = this._matchContentOrEndQuote;
				return true;
			}

			this._hasNext = false;
			return false;

		}

		_matchContentOrEndQuote(matchCharacter) {

			if (this._isEscaped) {
				this._isEscaped = false;
				return true;
			}

			if (matchCharacter === '\\') {
				this._isEscaped = true;
				return true;
			}

			// encontrou o caractere final
			// passa para a próxima função de match só pra fechar
			// no próximo next
			if (matchCharacter === this._quoteType
				|| (this._matchLineBreak(matchCharacter) && this._quoteType !== '`')
				) {

				this._matchFunction = this._matchEnd;
			}

			return true;

		}

		/**
		 * Indica que a string já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter) {
			this._hasNext = false;
			this._isComplete = true;
			return false;
		}

		_matchLineBreak(matchCharacter) {

			if (matchCharacter === '\n'
				|| matchCharacter === '\r'
				|| matchCharacter === '\u2028'
				|| matchCharacter === '\u2029'
				|| matchCharacter === null // EOF
				) {

				return true;
			}

			return false;

		}

	};

	return JSStringPatternIterator;

});



define('JSLabelIterator', ['JSPatternIterator'], (JSPatternIterator) => {

	const JSLabelIterator = class JSLabelIterator  extends JSPatternIterator {

		constructor() {

			super();

			Object.defineProperties(this, {
				_isLetterCharacter: {value: /[a-zA-Z]/},
				_isWordCharacter: {value: /\w/}
			});

			Object.seal(this);

			this._matchFunction = this._matchLetter;

		}

		_matchLetter(matchCharacter) {

			if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
				this._matchFunction = this._matchWordOrColon;
				return true;
			}

			this._hasNext = false;
			return false;

		}

		_matchWordOrColon(matchCharacter) {

			if (matchCharacter !== null && this._isWordCharacter.test(matchCharacter)) {
				return true;
			}

			if (matchCharacter === ':') {
				this._matchFunction = this._matchEnd;
				return true;
			}

			this._hasNext = false;
			return false;

		}

	}

	return JSLabelIterator;

});



define('JSSymbolIterator', ['JSPatternIterator'], (JSPatternIterator) => {

	const JSSymbolIterator = class JSSymbolIterator  extends JSPatternIterator {

		constructor() {

			super();

			Object.defineProperties(this, {
				_isWordCharacter: {value: /\w/}
			});

			Object.seal(this);

			this._matchFunction = this._matchValidCharacter;

		}

		_matchValidCharacter(matchCharacter) {

			if (matchCharacter === '_'
				|| matchCharacter === '$'
				|| (matchCharacter !== null && this._isWordCharacter.test(matchCharacter))
				) {

				this._isComplete = true;
				return true;
			}

			if (this._isComplete) {
				return this._matchEnd(matchCharacter);
			}

			this._hasNext = false;
			return false;

		}

	}

	return JSSymbolIterator;

});



/**
 * Base class for tokens
 * Como o código pode potencialmente ter muitos tokens, era melhor que eles fossem
 * como structs só com dados, e os métodos ficassem em outro lugar
 */
define('Token', () => {

	const Token = class Token {

		constructor(type) {

			Object.defineProperties(this, {
				type: {value: '', enumerable: true, configurable: true},
				openType: {value: '', enumerable: true, writable: true},
				closeType: {value: '', enumerable: true, writable: true},
				characterSequence: {value: [], enumerable: true},
				begin: {value: 0, enumerable: true, writable: true},
				end: {value: 0, enumerable: true, writable: true},
				ignore: {value: false, enumerable: true, writable: true},
				_isInitialized: {value: false, writable: true},
				_hasNext: {value: true, writable: true},
				_isComplete: {value: false, writable: true}
			});

			// Object.seal(this); // só nos objetos finais

		}

		hasNext() {
			if (this._hasNext && !this._isComplete) {
				return true;
			}
			return false;
		}

		next(matchCharacter, index) {

			// implementado nas sub classes

			// basicamente
			// se matchCharacter ok
			// this.characterSequence.push(matchCharacter);
			// se terminou a sequencia, verificar próximo caractere
			// se for inválido, this._complete()

			//se matchCharacter not ok
			// this._hasNext = false

		}

		get isComplete() {
			return this._isComplete;
		}

		_complete() {
			this.end = this.begin + this.characterSequence.length;
			this._hasNext = false;
			this._isComplete = true;
		}

	};

	return Token;

});



define('JSSimpleCharacterToken', ['Token'], (Token) => {

	const JSSimpleCharacterToken = class JSSimpleCharacterToken extends Token {

		constructor(type, isSingle, characters) {
			super();
			Object.defineProperties(this, {
				type: {value: type},
				_isSingle: {value: isSingle},
				_characters: {value: characters},
				_completeNextTurn: {value: false, writable: true}
			});
			Object.seal(this);
		}

		next(matchCharacter, index) {

			if (!this._checkCharacter(matchCharacter) || this._completeNextTurn) {
				this._hasNext = false;
				if (this.characterSequence.length > 0) {
					this._complete();
				}
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

			this._completeNextTurn = this._isSingle;

		}

		_checkCharacter(matchCharacter) {

			for (let character of this._characters) {
				if (character === matchCharacter) {
					return true;
				}
			}

			return false;

		}

	};

	return JSSimpleCharacterToken;

});



define('JSPatternIteratorToken', ['Token'], (Token) => {

	const JSPatternIteratorToken = class JSPatternIteratorToken extends Token {

		constructor(type, patternIterator) {

			super();

			Object.defineProperties(this, {
				type: {value: type},
				_characterPattern: {value: patternIterator}
			});

			Object.seal(this);

		}

		next(matchCharacter, index) {

			if (!this._characterPattern.next(matchCharacter)) {
				this._hasNext = false;
				if (this._characterPattern.isComplete) {
					this._complete();
				}
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

		}

	};

	return JSPatternIteratorToken;

});



/**
 * Token for keywords
 */
define('JSSimpleCharacterSequenceToken', ['Token'], (Token) => {

	const JSSimpleCharacterSequenceToken = class JSSimpleCharacterSequenceToken extends Token {

		constructor(type, characterSequences) {

			super();

			Object.defineProperties(this, {
				type: {value: type},
				_previousMatchedKeyword: {value: null, writable: true},
				_matchedKeyword: {value: null, writable: true},
				//_completeNextTurn: {value: false, writable: true},
				_keywordsPool: {value: []},
				_keyword: {value: null, writable: true},
				_keywordPointer:  {value: 0, writable: true},
				_keywords: {value: characterSequences}
			});

			Object.seal(this);

			this._resetKeywords();

		}

		/**
		 * Tries to match the next character
		 * @param {String} matchCharacter
		 * @param {Number} index Character index relative to the whole string being parsed
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter, index) {

			if (!this._matchKeywords(matchCharacter)) {
				this._hasNext = false;
				if (this._matchedKeyword) {
					this._complete();
				}
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

		}

		reset() {
			this._matchedKeyword = false;
			//this._completeNextTurn = false;
			this._keyword = null;
			this._keywordPointer = 0;
			this._resetKeywords();
		}

		_matchKeywords(matchCharacter) {

			if (this._keywordsPool.length > 1) {
				this._previousMatchedKeyword = this._matchedKeyword;
				this._matchedKeyword = null;
			}

			for (let i = this._keywordsPool.length - 1; i > -1; i--) {

				this._keyword = this._keywordsPool[i];
				let character = this._keyword.substr(this._keywordPointer, 1);

				if (character !== matchCharacter) {
					this._keywordsPool.splice(i, 1);
					continue;
				}

				if ((this._keyword.length - 1) === this._keywordPointer) {
					this._matchedKeyword = this._keyword;
				}

			}

			this._keywordPointer += 1;

			if (this._keywordsPool.length > 0) {
				return true;
			} else if (this._previousMatchedKeyword) {
				this._matchedKeyword = this._previousMatchedKeyword;
			}

			return false;

		}

		_resetKeywords() {
			this._keywordsPool.splice(0);
			for (let keyword of this._keywords) {
				this._keywordsPool.push(keyword);
			}
		}

	};

	return JSSimpleCharacterSequenceToken;

});



/**
 * Token for JavaScript types
 */
define('JSTypesToken', ['JSSimpleCharacterSequenceToken'], (JSSimpleCharacterSequenceToken) => {

	const JSTypesToken = class JSTypesToken extends JSSimpleCharacterSequenceToken {

		constructor() {
			super('type', [

				'Array',
				'Boolean',
				'Date',
				'Error',
				'Function',
				'JSON',
				'Map',
				'Math',
				'Number',
				'Object',
				'Promise',
				'Proxy',
				'RangeError',
				'ReferenceError',
				'Reflect',
				'RegExp',
				'Set',
				'String',
				'Symbol',
				'SyntaxError',
				'TypeError',
				'URIError',
				'WeakMap',
				'WeakSet',
				'XMLHttpRequest',

				// objetos conhecidos
				'document',
				'window'

			]);

			Object.seal(this);

		}

	};

	return JSTypesToken;

});



/**
 * Token for JavaScript punctuation
 */
define('JSPunctuationToken', ['JSSimpleCharacterSequenceToken'], (JSSimpleCharacterSequenceToken) => {

	const JSPunctuationToken = class JSPunctuationToken extends JSSimpleCharacterSequenceToken {

		constructor() {

			super('operator', [
				'.',
				'(',
				')',
				'{',
				'}',
				'[',
				']',
				',',
				'?',
				':',
				';',

				'&amp;&amp;',
				'||',
				'&amp;', // bitwise and
				'|', // bitwise or
				'^', // bitwise xor
				'~', // bitwise not
				'&gt;&gt;', // bitwise left shift
				'&lt;&lt;', // bitwise right shift
				'&lt;&lt;&lt;', // bitwise unsigned right shift
				'+',
				'++',
				'-',
				'--',
				'*',
				'*', // exponential
				'/',
				'%',
				'==',
				'===',
				'!',
				'!=',
				'!==',
				'&gt;',
				'&gt;=',
				'&lt;',
				'&lt;=',

				'=',
				'+=',
				'-=',
				'*=',
				'/=',
				'%=',

				'&amp;=', // bitwise and
				'|=', // bitwise or
				'^=', // bitwise xor
				// '~=', // bitwise not não existe
				'&gt;&gt;=', // bitwise left shift
				'&lt;&lt;=', // bitwise right shift
				'&lt;&lt;&lt;=', // bitwise unsigned right shift

				'...' // rest e spread
			]);

		}

	};

	return JSPunctuationToken;

});



/**
 * Token for whitespace characters
 */
define('JSWhitespaceToken', ['JSSimpleCharacterToken'], (JSSimpleCharacterToken) => {

	const JSWhitespaceToken = class JSWhitespaceToken extends JSSimpleCharacterToken {

		constructor() {
			super('whitespace', false, [
				' ',
				'\t',
				'\v',
				'\f',
				'\u00A0'
			]);
			this.ignore = true;
		}

	};

	return JSWhitespaceToken;

});



/**
 * Token for end of line characters
 */
define('EndOfLineToken', ['JSSimpleCharacterToken'], (JSSimpleCharacterToken) => {

	const EndOfLineToken = class EndOfLineToken extends JSSimpleCharacterToken {

		constructor() {
			super('endOfLine', true, [
				'\n',
				'\r',
				'\u2028',
				'\u2029'
			]);
			this.ignore = true;
		}

	};

	return EndOfLineToken;

});



/**
 * Token for line comments
 */
define('JSLineCommentToken', ['JSPatternIteratorToken', 'JSLineCommentPatternIterator'], (JSPatternIteratorToken, JSLineCommentPatternIterator) => {

	const JSLineCommentToken = class JSLineCommentToken extends JSPatternIteratorToken {
		constructor() {
			super('comment lineComment', new JSLineCommentPatternIterator());
		}
	};

	return JSLineCommentToken;

});



/**
 * Token for block comments
 */
define('JSBlockCommentToken', ['JSPatternIteratorToken', 'JSBlockCommentPatternIterator'], (JSPatternIteratorToken, JSBlockCommentPatternIterator) => {

	const JSBlockCommentToken = class JSBlockCommentToken extends JSPatternIteratorToken {
		constructor() {
			super('comment blockComment', new JSBlockCommentPatternIterator());
		}
	};

	return JSBlockCommentToken;

});



/**
 * Token for html markup inside code for emphasis
 */
define('JSHtmlEmphasisToken', ['JSPatternIteratorToken', 'JSHtmlEmphasisPatternIterator'], (JSPatternIteratorToken, JSHtmlEmphasisPatternIterator) => {

	const JSHtmlEmphasisToken = class JSHtmlEmphasisToken extends JSPatternIteratorToken {
		constructor() {
			super('html', new JSHtmlEmphasisPatternIterator());
			this.ignore = true;
		}
	};

	return JSHtmlEmphasisToken;

});



/**
 * Token for decimal numbers
 */
define('JSDecimalLiteralToken', ['JSPatternIteratorToken', 'JSDecimalPatternIterator'], (JSPatternIteratorToken, JSDecimalPatternIterator) => {

	const JSDecimalLiteralToken = class JSDecimalLiteralToken extends JSPatternIteratorToken {
		constructor() {
			super('number', new JSDecimalPatternIterator());
		}
	};

	return JSDecimalLiteralToken;

});



/**
 * Token for binary, octal and hexadecimal numbers
 */
define('JSNumericLiteralToken', ['JSPatternIteratorToken', 'JSNumberPatternIterator'], (JSPatternIteratorToken, JSNumberPatternIterator) => {

	const JSNumericLiteralToken = class JSNumericLiteralToken extends JSPatternIteratorToken {
		constructor() {
			super('number', new JSNumberPatternIterator());
		}
	};

	return JSNumericLiteralToken;

});



define('JSRegexLiteralToken', ['JSPatternIteratorToken', 'JSRegExpPatternIterator'], (JSPatternIteratorToken, JSRegExpPatternIterator) => {

	const JSRegexLiteralToken = class JSRegexLiteralToken extends JSPatternIteratorToken {
		constructor() {
			super('regex', new JSRegExpPatternIterator());
		}
	};

	return JSRegexLiteralToken;

});



/**
 * Token for strings
 */
define('JSStringLiteralToken', ['JSPatternIteratorToken', 'JSStringPatternIterator'], (JSPatternIteratorToken, JSStringPatternIterator) => {

	const JSStringLiteralToken = class JSStringLiteralToken extends JSPatternIteratorToken {
		constructor() {
			super('string', new JSStringPatternIterator());
		}
	};

	return JSStringLiteralToken;

});



/**
 * Token for JavaScript labels
 */
define('JSLabelToken', ['JSPatternIteratorToken', 'JSLabelIterator'], (JSPatternIteratorToken, JSLabelIterator) => {

	const JSLabelToken = class JSLabelToken extends JSPatternIteratorToken {
		constructor() {
			super('label', new JSLabelIterator());
		}
	};

	return JSLabelToken;

});



/**
 * Token for symbols
 */
define('JSSymbolToken', ['JSPatternIteratorToken', 'JSSymbolIterator'], (JSPatternIteratorToken, JSSymbolIterator) => {

	const JSSymbolToken = class JSSymbolToken extends JSPatternIteratorToken {
		constructor() {
			super('symbol', new JSSymbolIterator());
		}
	};

	return JSSymbolToken;

});



/**
 * Token for keywords
 */
define('JSKeywordToken', ['JSSimpleCharacterSequenceToken'], (JSSimpleCharacterSequenceToken) => {

	const JSKeywordToken = class JSKeywordToken extends JSSimpleCharacterSequenceToken {

		constructor() {
			super('keyword', [
				'break',
				'case',
				'catch',
				'class',
				'const',
				'continue',
				'debugger',
				'delete',
				'do',
				'else',
				'extends',
				'finally',
				'for',
				'function',
				'function*',
				'get',
				'if',
				'in',
				'instanceof',
				'let',
				'new',
				'of',
				'return',
				'set',
				'static',
				'super',
				'switch',
				'this',
				'throw',
				'try',
				'typeof',
				'var',
				'void',
				'while',
				'with',
				'yield',
				'yield*',

				// modules
				'default',
				'from',
				'import',
				'export',

				// arrow function
				'=&gt;',

				// literals
				// fazer num token à parte?
				'true',
				'false',
				'null',
				'undefined',
				'NaN',

				// reserved words
				// TODO fazer num token à parte
				'abstract',
				'await',
				'boolean',
				'byte',
				'char',
				'double',
				'enum',
				'final',
				'float',
				'goto',
				'implements',
				'int',
				'interface',
				'long',
				'native',
				'package',
				'private',
				'protected',
				'public',
				'short',
				'synchronized',
				'throws',
				'transient',
				'volatile',

				// insteresting words
				// talvez criar uma categoria diferente para eles
				'activeTarget',
				'addEventListener',
				'apply',
				'arguments',
				'attachEvent',
				'attributes',
				'bind',
				'call',
				'clearInterval',
				'clearTimeout',
				'constructor',
				'configurable',
				'detachEvent',
				'enumerable',
				'forEach',
				'getElementById',
				'getElementsByTagName',
				'handleEvent',
				'hasOwnProperty',
				'innerHTML',
				'prototype',
				'querySelector',
				'querySelectorAll',
				'removeEventListener',
				'requestAnimationFrame',
				'setInterval',
				'setTimeout',
				'style',
				'target',
				'then',
				'value',
				'writable'

			]);

			Object.seal(this);

		}

	};

	return JSKeywordToken;

});



/**
 * Base class for tokenizers
 */
define('Lexer', ['StringIterator'], (StringIterator) => {

	const END_OF_FILE = null;

	const Lexer = class Lexer {

		constructor() {

			Object.defineProperties(this, {
				_tokenPool: {value: []},
				_token: {value: null, writable: true},
				_completeToken: {value: null, writable: true},
				_characters: {value: null, writable: true},
				_index:  {value: 0, writable: true}
			});

			// Object.seal(this); // só nos objetos finais

		}

		parse(source) {

			const sourceIterator = new StringIterator(source);
			let tokenSequence = [];

			tokenSequence.splice(0);

			this._resetTokens();

			while (sourceIterator.hasNext()) {
				this._characters = sourceIterator.next();
				this._index = sourceIterator.pointer;
				this._iterate(tokenSequence);
			}

			this._characters = END_OF_FILE;
			this._index += 1;
			this._iterate(tokenSequence);

			return tokenSequence;

		}

		parseAsync(source) {

			const context = this; // TODO arrow talvez não precise de context

			const parsePromise = new Promise((resolve, reject) => {
				try {
					const tokenSequence = context.parse(source);
					resolve(tokenSequence);
				} catch (erro) {
					reject(erro);
				}
			});

			return parsePromise;

		}

		_iterate(tokenSequence) {

			this._matchTokens();
			this._cleanTokenPool();

			if (this._tokenPool.length === 0) {

				// TODO
				// vou testar os que não foram testados, mas vou retestar o único que já foi rejeitado
				// tem como melhorar esse reset?
				// por enquanto vou deixar assim
				// podia salvar os tokens que não match numa array e só recolocá-los ao invés de resetar tudo
				if (this._completeToken) {
					tokenSequence.push(this._completeToken);
					this._completeToken = null;
				}

				this._resetTokens(tokenSequence);
				this._matchTokens();

			}

		}

		_matchTokens() {

			for (let i = this._tokenPool.length - 1; i > -1; i--) {

				this._token = this._tokenPool[i];

				if (this._token.hasNext()) {
					this._token.next(this._characters, this._index);
				}

			}

		}

		_cleanTokenPool() {

			for (let i = this._tokenPool.length - 1; i > -1; i--) {

				this._token = this._tokenPool[i];

				if (this._token.isComplete) {
					this._completeToken = this._token;
				}

				// tira do pool
				if (this._token.isComplete || !this._token.hasNext()) {
					this._tokenPool.splice(i, 1);
				}

			}

		}

		_resetTokens(tokenSequence) {
			this._tokenPool.splice(0);
		}

		/**
		 * Gets last meaningful token
		 * @param tokenSequence Sequence of tokens parsed so far by the lexer
		 */
		_getLastToken(tokenSequence) {

			let lastToken = null;

			for (let i = tokenSequence.length; i > 0; i--) {

				lastToken = tokenSequence[i - 1];

				if (!lastToken.ignore
					&& lastToken.type !== 'whitespace'
					&& lastToken.type !== 'endOfLine'
					) {

					return lastToken;
				}

			}

			return null;

		}

	};

	return Lexer;

});



/**
 * Tokenizes JavaScript source code
 */
define(

	'JavaScriptLexer',

	[
		'Lexer',

		'JSKeywordToken',
		'JSTypesToken',
		'JSLabelToken',
		'JSSymbolToken',
		'JSPunctuationToken',

		'JSDecimalLiteralToken',
		'JSNumericLiteralToken',
		'JSRegexLiteralToken',
		'JSStringLiteralToken',

		'JSLineCommentToken',
		'JSBlockCommentToken',

		'JSHtmlEmphasisToken',
		'JSWhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		JSKeywordToken,
		JSTypesToken,
		JSLabelToken,
		JSSymbolToken,
		JSPunctuationToken,

		JSDecimalLiteralToken,
		JSNumericLiteralToken,
		JSRegexLiteralToken,
		JSStringLiteralToken,

		JSLineCommentToken,
		JSBlockCommentToken,

		JSHtmlEmphasisToken,
		JSWhitespaceToken,
		EndOfLineToken

	) => {

	const JavaScriptLexer = class JavaScriptLexer extends Lexer {

		constructor() {
			super();
			Object.seal(this);
		}

		_resetTokens(tokenSequence) {

			// se o último token foi uma literal, não incluir outras iterais em seguida

			let lastToken = null;
			let canBeLiteral = true;

			if (tokenSequence) {
				lastToken = this._getLastToken(tokenSequence);
				canBeLiteral = this._getCanBeLiteral(lastToken);
			}

			this._tokenPool.splice(

				0,
				this._tokenPool.length,

				// language
				new JSKeywordToken(),
				new JSTypesToken(),
				new JSPunctuationToken(),

				// comments
				new JSLineCommentToken(),
				new JSBlockCommentToken()

			);

			if (canBeLiteral) {
				this._pushLiteralTokens();
			}

			this._pushInvisibleTokens();

			this._tokenPool.push(new JSLabelToken());
			this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),
				new JSStringLiteralToken()
			);
		}

		_pushInvisibleTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSHtmlEmphasisToken(),
				new JSWhitespaceToken(),
				new EndOfLineToken()
			);
		}

		_getCanBeLiteral(lastToken) {

			if (lastToken
				&& (
					lastToken.type === 'number'
					|| lastToken.type === 'regex'
					|| lastToken.type === 'string'
					|| lastToken.type === 'symbol'
					)
				) {

				return false;
			}

			return true;

		}

	};

	return JavaScriptLexer;

});



// PAREI AQUI
// Implementar os tokens html



define('HtmlAttributeValuePatternIterator', () => {

	const HtmlAttributeValuePatternIterator = class HtmlAttributeValuePatternIterator {

		constructor() {

			const context = this;

			Object.defineProperties(this, {
				_hasNext: {value: true, writable: true},
				_isComplete: {value: false, writable: true},
				_quoteType: {value: null, writable: true},
				_matchFunction: {value: context._matchStartQuote, writable: true}
			});

			Object.seal(this);

		}

		get isComplete() {
			return this._isComplete;
		}

		hasNext() {
			return this._hasNext;
		}

		/**
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter) {
			return this._matchFunction(matchCharacter);
		}

		_matchStartQuote(matchCharacter) {

			if (matchCharacter === "'"
				|| matchCharacter === '"'
				) {

				this._quoteType = matchCharacter;
				this._matchFunction = this._matchContentOrEndQuote;
				return true;
			}

			this._hasNext = false;
			return false;

		}

		_matchContentOrEndQuote(matchCharacter) {

			// encontrou o caractere final
			// passa para a próxima função de match só pra fechar
			// no próximo next
			if (matchCharacter === this._quoteType) {
				this._matchFunction = this._matchEnd;
			}

			return true;

		}

		/**
		 * Indica que a string já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter) {
			this._hasNext = false;
			this._isComplete = true;
			return false;
		}

	};

	return HtmlAttributeValuePatternIterator;

});


// TODO reconhecer isso tb <?xml version="1.0"?> ?

define('HtmlDocTypeToken', ['Token', 'JSSimpleCharacterSequenceToken'], (Token, JSSimpleCharacterSequenceToken) => {

	const HtmlDocTypeToken = class HtmlDocTypeToken extends Token {

		constructor() {

			super();

			const context = this;

			Object.defineProperties(this, {
				type: {value: 'doctype'},
				_matchFunction: {value: context._matchStartSequence, writable: true},
				_startSequence: {value: new JSSimpleCharacterSequenceToken('docTypeStart', ['&lt;!DOCTYPE'])},
				_endSequence: {value: new JSSimpleCharacterSequenceToken('docTypeEnd', ['&gt;'])}
			});

			Object.seal(this);

		}

		/**
		 * @param {String} matchCharacter
		 * @param {Number} index Character index relative to the whole string being parsed
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter, index) {

			if (!this._matchFunction(matchCharacter, index)) {
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

		}

		_matchStartSequence(matchCharacter, index) {

			this._startSequence.next(matchCharacter, index);

			if (this._startSequence.isComplete) {
				this._matchFunction = this._matchContent;
				return this._matchFunction(matchCharacter);
			}

			if (this._startSequence.hasNext()) {
				return true;
			}

			this._hasNext = false;
			return false;

		}

		_matchContent(matchCharacter, index) {

			if (matchCharacter === '&') {
				this._matchFunction = this._matchEndSequence;
				return this._matchFunction(matchCharacter);
			}

			return true;

		}

		_matchEndSequence(matchCharacter, index) {

			this._endSequence.next(matchCharacter, index);

			if (this._endSequence.isComplete) {
				this._matchFunction = this._matchEnd;
				return this._matchFunction(matchCharacter);
			}

			if (this._endSequence.hasNext()) {
				return true;
			}

			// FIXME resetar endSequence
			this._matchFunction = this._matchContent;
			return this._matchFunction(matchCharacter);

		}

		/**
		 * Indica que o pattern já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter, index) {
			this._complete();
			return false;
		}

	};

	return HtmlDocTypeToken;

});



define('HtmlTagBeginToken', ['Token', 'JSSimpleCharacterSequenceToken'], (Token, JSSimpleCharacterSequenceToken) => {

	const HtmlTagBeginToken = class HtmlTagBeginToken extends Token {

		constructor() {

			super();

			const context = this;

			Object.defineProperties(this, {
				type: {value: 'tag', writable: true},
				_matchFunction: {value: context._matchStartSequence, writable: true},
				_startSequence: {value: new JSSimpleCharacterSequenceToken('tagStart', ['&lt;'])},
				_isAllowedCharacter: {value: /(\w|-|_|\.|:|\?|%|@)/} // ?,% e @ não fazem parte do html, mas são usados no xml e no xaml, e por isso coloco aqui como um fix temporário
			});

			this.openType = 'tagWrapper';

			Object.seal(this);

		}

		/**
		 * @param {String} matchCharacter
		 * @param {Number} index Character index relative to the whole string being parsed
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter, index) {

			if (!this._matchFunction(matchCharacter, index)) {
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

		}

		/**
		 * Matches <tagname , </tagname
		 */
		_matchStartSequence(matchCharacter, index) {

			this._startSequence.next(matchCharacter, index);

			if (this._startSequence.isComplete) {
				this._matchFunction = this._matchSlashOrContent;
				return this._matchFunction(matchCharacter);
			}

			if (this._startSequence.hasNext()) {
				return true;
			}

			this._hasNext = false;
			return false;

		}

		_matchSlashOrContent(matchCharacter, index) {

			this._matchFunction = this._matchContent;

			if (matchCharacter === '/') {
				this.type += ' closeTag';
				this.openType = '';
				this.closeType = 'tagWrapper';
				return true;
			}

			this.type += ' openTag';

			return this._matchFunction(matchCharacter);

		}

		/*
		[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
		[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
		[5]   	Name	   ::=   	NameStartChar (NameChar)*
		[6]   	Names	   ::=   	Name (#x20 Name)*
		[7]   	Nmtoken	   ::=   	(NameChar)+
		[8]   	Nmtokens	   ::=   	Nmtoken (#x20 Nmtoken)*

		Element names are case-sensitive
		Element names must start with a letter or underscore (veja [4])
		Element names cannot start with the letters xml (or XML, or Xml, etc)
		Element names can contain letters, digits, hyphens, underscores, and periods
		Element names cannot contain spaces
		: para namespaces
		não achei regras para caracteres nos namespaces
		*/

		_matchContent(matchCharacter, index) {

			if (this._isAllowedCharacter.test(matchCharacter)) {
				return true;
			}

			if (this.characterSequence.length > 4) { // FIXME 5 se começar com /
				this._matchFunction = this._matchEnd;
				return this._matchFunction(matchCharacter);
			}

			this._hasNext = false;
			return false;

		}

		/**
		 * Indica que o pattern já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter, index) {
			this._complete();
			return false;
		}

	};

	return HtmlTagBeginToken;

});



define('HtmlTagEndToken', ['Token', 'JSSimpleCharacterSequenceToken'], (Token, JSSimpleCharacterSequenceToken) => {

	const HtmlTagEndToken = class HtmlTagEndToken extends Token {

		constructor() {

			super();

			const context = this;

			Object.defineProperties(this, {
				type: {value: 'tag', writable: true},
				_matchFunction: {value: context._matchStartSequence, writable: true},
				_endSequence: {value: new JSSimpleCharacterSequenceToken('tagEnd', ['&gt;'])}
			});

			Object.seal(this);

		}

		/**
		 * @param {String} matchCharacter
		 * @param {Number} index Character index relative to the whole string being parsed
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter, index) {

			if (!this._matchFunction(matchCharacter, index)) {
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

		}

		/**
		 * Matches > or />
		 */
		_matchStartSequence(matchCharacter, index) {

			if (this.characterSequence.length === 0
				&&  matchCharacter === '/'
				) {

				return true;
			}

			this._endSequence.next(matchCharacter, index);

			if (this._endSequence.isComplete) {
				this._matchFunction = this._matchEnd;
				return this._matchFunction(matchCharacter);
			}

			if (this._endSequence.hasNext()) {
				return true;
			}

			this._hasNext = false;
			return false;

		}

		/**
		 * Indica que o pattern já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter, index) {
			this._complete();
			return false;
		}

	};

	return HtmlTagEndToken;

});



define('HtmlAttributeToken', ['Token'], (Token) => {

	const HtmlAttributeToken = class HtmlAttributeToken extends Token {

		constructor() {

			super();

			const context = this;

			Object.defineProperties(this, {
				type: {value: 'attribute'},
				_matchFunction: {value: context._matchContent, writable: true},
				_isAllowedCharacter: {value: /(\w|\d|-|_|\.|:)/}
			});

			Object.seal(this);

		}

		/**
		 * @param {String} matchCharacter
		 * @param {Number} index Character index relative to the whole string being parsed
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter, index) {

			if (!this._matchFunction(matchCharacter, index)) {
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

		}

		/*
		[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
		[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
		[5]   	Name	   ::=   	NameStartChar (NameChar)*
		[6]   	Names	   ::=   	Name (#x20 Name)*
		[7]   	Nmtoken	   ::=   	(NameChar)+
		[8]   	Nmtokens	   ::=   	Nmtoken (#x20 Nmtoken)*

		Element names are case-sensitive
		Element names must start with a letter or underscore (veja [4])
		Element names cannot start with the letters xml (or XML, or Xml, etc)
		Element names can contain letters, digits, hyphens, underscores, and periods
		Element names cannot contain spaces
		: para namespaces
		não achei regras para caracteres nos namespaces
		*/

		_matchContent(matchCharacter, index) {

			if (this._isAllowedCharacter.test(matchCharacter)) {
				return true;
			}

			// TODO requerer que acabe em = ou reconhecer defer, async, html5 attr como required, readonly, disabled, novalidate, autofocus, multiple
			// isso é um chuncho
			if (matchCharacter === '=') {
				this._matchFunction = this._matchEnd;
				return true;
			}

			if (this.characterSequence.length > 1) {
				this._matchFunction = this._matchEnd;
				return this._matchFunction(matchCharacter);
			}

			this._hasNext = false;
			return false;

		}

		/**
		 * Indica que o pattern já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter, index) {
			this._complete();
			return false;
		}

	};

	return HtmlAttributeToken;

});



/**
 * Token for strings
 */
define('HtmlAttributeValueToken', ['JSPatternIteratorToken', 'HtmlAttributeValuePatternIterator'], (JSPatternIteratorToken, HtmlAttributeValuePatternIterator) => {

	const HtmlAttributeValueToken = class HtmlAttributeValueToken extends JSPatternIteratorToken {
		constructor() {
			super('attributeValue', new HtmlAttributeValuePatternIterator());
		}
	};

	return HtmlAttributeValueToken;

});



define('HtmlCommentToken', ['Token', 'JSSimpleCharacterSequenceToken'], (Token, JSSimpleCharacterSequenceToken) => {

	const HtmlCommentToken = class HtmlCommentToken extends Token {

		constructor() {

			super();

			const context = this;

			Object.defineProperties(this, {
				type: {value: 'comment'},
				_matchFunction: {value: context._matchStartSequence, writable: true},
				_startSequence: {value: new JSSimpleCharacterSequenceToken('commentStart', ['&lt;!--'])},
				_endSequence: {value: new JSSimpleCharacterSequenceToken('commentEnd', ['--&gt;'])}
			});

			Object.seal(this);

		}

		/**
		 * @param {String} matchCharacter
		 * @param {Number} index Character index relative to the whole string being parsed
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter, index) {

			if (!this._matchFunction(matchCharacter, index)) {
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

		}

		_matchStartSequence(matchCharacter, index) {

			this._startSequence.next(matchCharacter, index);

			if (this._startSequence.isComplete) {
				this._matchFunction = this._matchContent;
				return this._matchFunction(matchCharacter);
			}

			if (this._startSequence.hasNext()) {
				return true;
			}

			this._hasNext = false;
			return false;

		}

		_matchContent(matchCharacter, index) {

			if (matchCharacter === '-') {
				this._matchFunction = this._matchEndSequence;
				return this._matchFunction(matchCharacter);
			}

			return true;

		}

		_matchEndSequence(matchCharacter, index) {

			this._endSequence.next(matchCharacter, index);

			if (this._endSequence.isComplete) {
				this._matchFunction = this._matchEnd;
				return this._matchFunction(matchCharacter);
			}

			if (this._endSequence.hasNext()) {
				return true;
			}

			this._endSequence.reset();
			this._matchFunction = this._matchContent;
			return this._matchFunction(matchCharacter);

		}

		/**
		 * Indica que o pattern já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter, index) {
			this._complete();
			return false;
		}

	};

	return HtmlCommentToken;

});



define('HtmlTextToken', ['Token', 'JSSimpleCharacterSequenceToken'], (Token, JSSimpleCharacterSequenceToken) => {

	const HtmlTextToken = class HtmlTextToken extends Token {

		constructor() {

			super();

			const context = this;

			Object.defineProperties(this, {
				type: {value: 'text'},
				_matchFunction: {value: context._matchContent, writable: true}
			});

			Object.seal(this);

		}

		/**
		 * @param {String} matchCharacter
		 * @param {Number} index Character index relative to the whole string being parsed
		 * @retuns {Boolean} true se o caractere match, false se não
		 */
		next(matchCharacter, index) {

			if (!this._matchFunction(matchCharacter, index)) {
				return;
			}

			if (!this._isInitialized) {
				this._isInitialized = true;
				this.begin = index;
			}

			this.characterSequence.push(matchCharacter);

		}

		_matchContent(matchCharacter, index) {

			if (matchCharacter !== '&'
				&& matchCharacter !== '<'
				&& matchCharacter !== '>'
				) {

				return true;
			}

			if (this.characterSequence.length > 0) {
				this._matchFunction = this._matchEnd;
				return this._matchFunction(matchCharacter);
			}

			this._hasNext = false;
			return false;

		}

		/**
		 * Indica que o pattern já terminou no caractere anterior
		 */
		_matchEnd(matchCharacter, index) {
			this._complete();
			return false;
		}

	};

	return HtmlTextToken;

});



/**
 * Tokenizes Html source code
 */
define(

	'HtmlLexer',

	[
		'Lexer',

		'HtmlDocTypeToken',
		'HtmlTagBeginToken',
		'HtmlTagEndToken',
		// 'HtmlScriptTagToken',
		'HtmlAttributeToken',
		'HtmlAttributeValueToken',

		'HtmlCommentToken',

		'JSHtmlEmphasisToken', // TODO ver se muda o nome ou usa outro
		'JSWhitespaceToken', // TODO ver se muda o nome ou usa outro
		'EndOfLineToken',

		'HtmlTextToken'

	], (

		Lexer,

		HtmlDocTypeToken,
		HtmlTagBeginToken,
		HtmlTagEndToken,
		// HtmlScriptTagToken,
		HtmlAttributeToken,
		HtmlAttributeValueToken,

		HtmlCommentToken,

		JSHtmlEmphasisToken,
		JSWhitespaceToken,
		EndOfLineToken,

		HtmlTextToken

	) => {

	const HtmlLexer = class HtmlLexer extends Lexer {

		constructor() {
			super();
			Object.seal(this);
		}

		_resetTokens(tokenSequence) {

			let lastToken = null;
			let isTagAttribute = false;

			if (tokenSequence) {
				lastToken = this._getLastToken(tokenSequence);
				isTagAttribute = this._getIsTagAttribute(lastToken);
			}

			this._tokenPool.splice(0, this._tokenPool.length);

			if (!lastToken
				|| !isTagAttribute
				) {

				this._pushTagContentTokens();
			}

			if (!lastToken
				|| isTagAttribute
				) {

				this._pushAttributeTokens();
			}

			this._pushInvisibleTokens();

			//  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas
			if (lastToken
				&& !isTagAttribute
				) {

				this._tokenPool.push(new HtmlTextToken());
			}

		}

		_pushTagContentTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new HtmlDocTypeToken(),
				new HtmlTagBeginToken(),
				// TODO new HtmlScriptTagToken(),
				new HtmlCommentToken()
			);
		}

		_pushAttributeTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new HtmlAttributeToken(),
				new HtmlAttributeValueToken(),
				new HtmlTagEndToken()
			);
		}

		_pushInvisibleTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSHtmlEmphasisToken(),
				new JSWhitespaceToken(),
				new EndOfLineToken()
			);
		}

		_getIsTagAttribute(lastToken) {

			// TODO melhorar muito isso depois
			if (lastToken
				&& (
					(lastToken.type === 'tag openTag' && lastToken.openType === 'tagWrapper')
					|| (lastToken.type === 'tag closeTag' && lastToken.closeType === 'tagWrapper')
					|| lastToken.type === 'attribute'
					|| lastToken.type === 'attributeValue'
				)
				) {

				return true;

			}

			return false;

		}

		/**
		 * Gets last meaningful token
		 * @param tokenSequence Sequence of tokens parsed so far by the lexer
		 */
		_getLastToken(tokenSequence) {

			let lastToken = null;

			for (let i = tokenSequence.length; i > 0; i--) {

				lastToken = tokenSequence[i - 1];

				if (!lastToken.ignore
					&& lastToken.type !== 'whitespace'
					&& lastToken.type !== 'endOfLine'
					) {

					return lastToken;
				}

			}

			return null;

		}

	};

	return HtmlLexer;

});



/**
 * Highlights source code based on tokens map
 */
define('Highlighter', () => {

	const Highlighter = class Highlighter {

		constructor() {
			Object.seal(this);
		}

		/**
		 * Adds highlight markup to the source code based on the supplied tokens array
		 * @param {String} source
		 * @param tokens
		 */
		highlight(source, tokens) {

			// tem um jsdoc pra isso
			/*
			tokens = [{
				type: ''
				characterSequence: []
				begin: 0,
				end: 0
			}];
			*/

			let highlightedSource = source.toString(); // copy??
			let token = null;
			let nextToken = null;

			// a substituição é feita de trás para frente para que não seja necessário recalcular os índices em cada substituição
			for (let i = tokens.length; i > 0; i--) {

				// estou iterando na ordem reversa
				// por isso next é o que foi usado na iteração anterior
				nextToken = token;
				token = tokens[i - 1];

				// FIXME melhorar e deixar mais rápido tb
				// tem que verificar melhor que é a tag de abertura strong
				// enquanto não fechar o comment, tem que marcar os strong como comment
				if (token.ignore
					&& token.type === 'html'
					&& nextToken
					&& nextToken.type.indexOf('comment') > -1
					) {

					highlightedSource = this._splice(highlightedSource, token.end - 1, 0, ' class="comment"');
				}

				if (token.ignore) {
					continue;
				}

				// FIXME strong tem erros com comentários de bloco de qualquer maneira
				// teria que consertar no lexer trocando a ordem de strong
				highlightedSource = this._splice(highlightedSource, token.end, 0, '</span>');
				highlightedSource = this._splice(highlightedSource, token.begin, 0, '<span class="' + token.type + '">');

			}

			return highlightedSource;

		}

		highlightAsync(source, tokens) {

			const context = this; // TODO arrow talvez não precise de context

			const highlightPromise = new Promise((resolve, reject) => {
				try {
					const highlightedSource = context.highlight(source, tokens);
					resolve(highlightedSource);
				} catch (erro) {
					reject(erro);
				}
			});

			return highlightPromise;

		}

		_splice(source, index, deleteCount, text) {
			// FIXME melhorar isso. fazer isso com um tipo de string builder seria mais eficiente?
			var output = source.toString();
			output = source.substring(0, index);
			output += text;
			output += source.substring(index + deleteCount);
			return output;
		}

	};

	return Highlighter;

});



/**
 * Enhances code highlighting with toggle button
 */
define('HighlightEnhancer', ['Node'], (Node) => { // TODO ou fazer decorator, não sei

	let nextId = -1;

	const HighlightEnhancer = class HighlightEnhancer {

		static get nextId() {
			nextId += 1;
			return nextId;
		}

		constructor(codeNode) {

			Object.defineProperties(this, {
				_node: {value: new Node(codeNode)}
			});

			Object.seal(this);

			if (this._node.innerHTML.indexOf('<strong') > -1) {
				this.highlight();
				this.addControls();
			}

		}

		clickHandler(event) {
			switch (event.target.value) {
				case 'all':
					this._node.toggleClass('highlight');
					break;
			}
		}

		highlight() {
			this._node.addClass('highlight');
		}

		addControls() {

			const container = document.createElement('div');
			const checkbox = document.createElement('input');
			const checkboxId = 'toggleHighlight' + HighlightEnhancer.nextId;
			const label = document.createElement('label');
			const labelText = document.createTextNode('Destacar');

			container.className = 'highlightControls';
			checkbox.type = 'checkbox';
			checkbox.value = 'all';
			checkbox.id = checkboxId;
			if (this._node.hasClass('highlight')) {
				checkbox.checked = true;
			}
			label.appendChild(labelText);
			label.setAttribute('for', checkboxId);
			container.appendChild(checkbox);
			container.appendChild(label);

			checkbox.addEventListener('click', this.clickHandler.bind(this));

			this._node.appendChild(container);

		}

	};

	return HighlightEnhancer;

});