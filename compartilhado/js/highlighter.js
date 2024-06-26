import { StringIterator } from './utils.js';



// TODO Implementar os tokens html. Quais? Já não implementei isso?

const isLetterCharacterRegex = /[a-zA-Z]/i;
const isWordCharacterRegex = /\w/i;
const isNumberCharacterRegex = /\d/i;
const isSpaceCharacterRegex = /\s/i;
const isAlphaNumericCharacterRegex = /^[A-Za-z0-9]$/i; // TODO do I need gi instead?

// #region Base classes

/**
 * Base class for tokenizers
 */
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

	async parseAsync(source) {

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



const SourcePatternIterator = class SourcePatternIterator {

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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
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



/**
 * Base class for tokens
 * Como o código pode potencialmente ter muitos tokens, era melhor que eles fossem
 * como structs só com dados, e os métodos ficassem em outro lugar
 */
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



const SourcePatternIteratorToken = class SourcePatternIteratorToken extends Token {

	constructor(type, patternIterator) {

		super();

		Object.defineProperties(this, {
			type: {value: type},
			_characterPattern: {value: patternIterator}
		});

		Object.seal(this);

	}

	next(matchCharacter, index) {

		if (!this._characterPattern.next(matchCharacter, index)) {
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



const CLineCommentPatternIterator = class CLineCommentPatternIterator extends SourcePatternIterator {

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



const CBlockCommentPatternIterator = class CBlockCommentPatternIterator extends SourcePatternIterator {

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



const NestedBlockCommentPatternIterator = class NestedBlockCommentPatternIterator extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_nestingLevel: {value: 0, writable: true}
		});

		this._matchFunction = this._matchBeginSlash;
		Object.seal(this);

	}

	_matchBeginSlash(matchCharacter) {

		if (matchCharacter === '/') {
			this._matchFunction = this._matchBeginStar;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchBeginStar(matchCharacter) {

		if (matchCharacter === '*') {
			this._matchFunction = this._matchContent;
			this._nestingLevel++;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '/') {
			this._matchFunction = this._matchBeginStar;
		}

		if (matchCharacter === '*') {
			this._matchFunction = this._matchEndSlash;
		}

		return true;

	}

	_matchEndSlash(matchCharacter) {

		if (matchCharacter === '/') {
			this._nestingLevel--;
			if (this._nestingLevel === 0) {
				this._matchFunction = this._matchEnd;
			} else {
				this._matchFunction = this._matchContent;
			}
		} else if (matchCharacter === '*') {
			// não fazer nada
			// ou em outras palavras
			// this._matchFunction = this._matchEndSlash;
		} else {
			this._matchFunction = this._matchContent;
		}

		return true;

	}

};



const NestedBlockCommentToken = class NestedBlockCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment blockComment', new NestedBlockCommentPatternIterator());
	}
};



const CDirectivePatternIterator = class CDirectivePatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		this._matchFunction = this._matchHash;
		Object.seal(this);
	}

	_matchHash(matchCharacter) {
		if (matchCharacter === '#') {
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



const CDirectiveToken = class CDirectiveToken extends SourcePatternIteratorToken {
	constructor() {
		super('directive', new CDirectivePatternIterator());
	}
};



const CStringLiteralToken = class CStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new CStringPatternIterator());
	}
};



const CStringPatternIterator = class CStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
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
		if (matchCharacter === '"'
			|| this._matchLineBreak(matchCharacter)
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



const CCharLiteralToken = class CCharLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('char', new CCharPatternIterator());
	}
};



const CCharPatternIterator = class CCharPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === "'") {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContent(matchCharacter) {

		if (isAlphaNumericCharacterRegex.test(matchCharacter)) {
			this._matchFunction = this._matchEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchEndQuote(matchCharacter) {

		// TODO improve this later
		if (matchCharacter === "'") {
			this._matchFunction = this._matchEnd;
			return true;
		}

		this._hasNext = false;
		return false;

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



const TempDecimalPatternIterator = class TempDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
		});
		this._matchFunction = this._matchNumber;
		Object.seal(this);
	}

	_matchNumber(matchCharacter, index) {

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



const TempDecimalLiteralToken = class TempDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new TempDecimalPatternIterator());
	}
};



const SourceHtmlEmphasisPatternIterator = class SourceHtmlEmphasisPatternIterator extends SourcePatternIterator {

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



const SourceSimpleCharacterToken = class SourceSimpleCharacterToken extends Token {

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



/**
 * Token for keywords
 */
const SourceSimpleCharacterSequenceToken = class SourceSimpleCharacterSequenceToken extends Token {

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
		this._previousMatchedKeyword = false;
		//this._completeNextTurn = false;
		this._keyword = null;
		this._keywordPointer = 0;
		this._isComplete = false;
		this._hasNext = true;
		this._resetKeywords();
		this._isInitialized = false;
	}

	_matchKeywords(matchCharacter) {

		// FIXME ver o caso de &lt;&amp;str que ignora o match &lt; pq tem o &lt;&lt;

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



/**
 * Token for whitespace characters
 */
const WhitespaceToken = class WhitespaceToken extends SourceSimpleCharacterToken {

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



/**
 * Token for end of line characters
 */
const EndOfLineToken = class EndOfLineToken extends SourceSimpleCharacterToken {

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



/**
 * Token for C line comments
 */
const CLineCommentToken = class CLineCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment lineComment', new CLineCommentPatternIterator());
	}
};



/**
 * Token for C block comments
 */
const CBlockCommentToken = class CBlockCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment blockComment', new CBlockCommentPatternIterator());
	}
};



/**
 * Token for html markup inside code for emphasis
 */
const HtmlEmphasisToken = class HtmlEmphasisToken extends SourcePatternIteratorToken {
	constructor() {
		super('html', new SourceHtmlEmphasisPatternIterator());
		this.ignore = true;
	}
};



const END_OF_FILE = null;

// #endregion



// #region Html lexer

/**
 * Tokenizes Html source code
 */
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
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
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



// TODO reconhecer isso tb <?xml version="1.0"?> ?

const HtmlDocTypeToken = class HtmlDocTypeToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'doctype'},
			_matchFunction: {value: context._matchStartSequence, writable: true},
			_startSequence: {value: new SourceSimpleCharacterSequenceToken('docTypeStart', ['&lt;!DOCTYPE'])},
			_endSequence: {value: new SourceSimpleCharacterSequenceToken('docTypeEnd', ['&gt;'])}
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



const HtmlTagBeginToken = class HtmlTagBeginToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'tag', writable: true},
			_matchFunction: {value: context._matchStartSequence, writable: true},
			_startSequence: {value: new SourceSimpleCharacterSequenceToken('tagStart', ['&lt;'])},
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



const HtmlTagEndToken = class HtmlTagEndToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'tag', writable: true},
			_matchFunction: {value: context._matchStartSequence, writable: true},
			_endSequence: {value: new SourceSimpleCharacterSequenceToken('tagEnd', ['&gt;'])}
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
			&& (matchCharacter === '/' || matchCharacter === '?' || matchCharacter === '%') // ? e % não fazem parte do html, mas são usados no xml e no xaml, e por isso coloco aqui como um fix temporário
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



/**
 * Token for strings
 */
const HtmlAttributeValueToken = class HtmlAttributeValueToken extends SourcePatternIteratorToken {
	constructor() {
		super('attributeValue', new HtmlAttributeValuePatternIterator());
	}
};



const HtmlCommentToken = class HtmlCommentToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'comment'},
			_matchFunction: {value: context._matchStartSequence, writable: true},
			_startSequence: {value: new SourceSimpleCharacterSequenceToken('commentStart', ['&lt;!--'])},
			_endSequence: {value: new SourceSimpleCharacterSequenceToken('commentEnd', ['--&gt;'])}
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

// #endregion



// #region Rust lexer

const RustLexer = class RustLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new RustKeywordToken(),
			new RustTypesToken(),
			new RustPunctuationToken(),
			new RustAttributeToken(),
			new RustLifetimeToken(),

			// comments
			new CLineCommentToken(),
			new NestedBlockCommentToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		this._tokenPool.push(new RustLabelToken());
		this._tokenPool.push(new RustRawIdentifierSymbolToken());
		this._tokenPool.push(new RustSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new RustDecimalLiteralToken(),
			new RustNumericLiteralToken(),
			new RustStringLiteralToken(),
			new CCharLiteralToken() // TODO this is not the full implementation...
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



/**
 * Token for Rust keywords
 */
const RustKeywordToken = class RustKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'as',
			'async',
			// 'await',
			'break',
			'const',
			'continue',
			'crate',
			'else',
			'enum',
			'extern',
			'fn',
			'for',
			'if',
			'impl',
			'in',
			'let',
			'loop',
			'match',
			'mod',
			'move',
			'mut',
			'pub',
			'ref',
			'return',
			'Self',
			'self',
			'static',
			'struct',
			'super',
			'trait',
			'type',
			'unsafe',
			'use',
			'where',
			'while',

			// literals
			'true',
			'false',
			'None', // Option<T>
			'Some', // Option<T>
			// não tem null, usar ptr::null

			// known macros
			'macro_rules!',

			// std macros
			'assert!',
			'assert_eq!',
			'cfg!',
			'column!',
			'concat!',
			'concat_idents!',
			'debug_assert!',
			'debug_assert_eq!',
			'env!',
			'file!',
			'format!',
			'format_args!',
			'include!',
			'include_bytes!',
			'include_str!',
			'line!',
			'module_path!',
			'option_env!',
			'panic!',
			'print!',
			'println!',
			'scoped_thread_local!',
			'select!',
			'stringify!',
			'thread_local!',
			'try!',
			'unimplemented!',
			'unreachable!',
			'vec!',
			'write!',
			'writeln!'

			// reservadas para uso futuro
			/*
			abstract
			alignof
			become
			box
			do
			final
			macro
			offsetof
			override
			priv
			proc
			pure
			sizeof
			typeof
			unsized
			virtual
			yield
			*/

		]);

		Object.seal(this);

	}

};



/**
 * Token for Rust types
 */
const RustTypesToken = class RustTypesToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('type', [

			'bool',
			'char',
			'f32',
			'f64',
			'i8',
			'i16',
			'i32',
			'i64',
			'isize',
			'str',
			'u8',
			'u16',
			'u32',
			'u64',
			'usize',

			'Any',

			// enums and variants, worth putting in their owmn token
			'Option',
			'None',
			'Some',
			'Result',
			'Ok',
			'Err',

			'String',
			'thread',

			'VecDeque',
			'Sender',
			'Receiver',
			'&str',
			'&amp;str',
			'&lt;&amp;str&gt;',
			'Error',

			'Default',
			'Formatter',
			'Index',
			'IndexMut',

			'App',
			'HttpRequest',
			'HttpServer',
			'Responder',
			'TcpListener',
			'TcpStream',

			'T',
			'U',
			'V'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Rust punctuation
 */
const RustPunctuationToken = class RustPunctuationToken extends SourceSimpleCharacterSequenceToken {

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
			'::',
			';',

			'&amp;&amp;',
			'||',
			'&amp;', // bitwise and
			'|', // bitwise or
			'^', // bitwise xor
			'~', // bitwise not
			'&gt;&gt;', // bitwise left shift
			'&lt;&lt;', // bitwise right shift
			'+',
			'-',
			'*',
			'/',
			'%',
			'==',
			'!',
			'!=',
			'&gt;',
			'&gt;=',
			'=&gt;',
			'-&gt;',
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

			'_',
			'@',
			'..',
			'...',

			// namespaces actually
			'std::',
			'std::collections',
			'std::default',
			'std::fmt',
			'std::ops',
			'std::sync',
			'std::sync::mpsc'

		]);

	}

};



const RustDecimalPatternIterator = class RustDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex},
			_canUseSeparator: {value: false, writable: true},
			_sufficType:  {value: '', writable: true},
			_suffixBuffer: {value: '', writable: true},
			_suffixSizeSequence: {value: new SourceSimpleCharacterSequenceToken('', ['size'])}
		});
		this._matchFunction = this._matchNumber;
		Object.seal(this);
	}

	// pode ter i8, i16, i32, i64, u8, u16, u32, u64, f32, f64 no final
	// pode ter _ separando os números

	_matchNumber(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			this._canUseSeparator = true;
			this._isComplete = true;
			return true;
		}

		if (this._canUseSeparator && matchCharacter === '_') {
			this._isComplete = false;
			return true;
		}

		if (matchCharacter === '.' && !this._hasMantissa) { // FIXME se o range operator vem depois do número, esse match vai dar problema. Ex 1..5 Válido para Rust, Swift e Kotlin
			// this._canUseSeparator = false; // TODO verificar isso
			this._hasMantissa = true;
			this._isComplete = false;
			return true;
		}

		if (matchCharacter === 'i'
			|| matchCharacter === 'u'
			|| matchCharacter === 'f'
			) {

			this._sufficType += matchCharacter;
			this._canUseSeparator = false;
			this._matchFunction = this._matchSuffix1;
			this._isComplete = false;
			return true;
		}

		if (this._isComplete) {
			return this._matchEnd(matchCharacter);
		}

		this._hasNext = false;
		return false;

	}

	_matchSuffix1(matchCharacter) {

		if (matchCharacter == null) {
			return false;
		}

		// i, u, f
		if (matchCharacter == '3'
			|| matchCharacter == '6'
			) {

			this._suffixBuffer += matchCharacter;
			this._matchFunction = this._matchSuffix2;
			return true;
		}

		// i, u
		if (this._sufficType == 'i' || this._sufficType == 'u') {

			if (matchCharacter == '8') {
				this._matchFunction = this._matchEnd;
				return true;
			} else if (matchCharacter == '1') {
				this._suffixBuffer += matchCharacter;
				this._matchFunction = this._matchSuffix2;
				return true;
			} else if (matchCharacter == 's') {
				//this._suffixBuffer += matchCharacter;
				this._matchFunction = this._matchSuffixSize;
				return this._matchFunction(matchCharacter);
			}

			return false;

		}

		return false;

	}

	_matchSuffix2(matchCharacter) {

		if (matchCharacter == null) {
			return false;
		}

		if ((this._suffixBuffer == '1' && matchCharacter == '6')
			|| (this._suffixBuffer == '3' && matchCharacter == '2')
			|| (this._suffixBuffer == '6' && matchCharacter == '4')
			) {

			this._matchFunction = this._matchEnd;
			return true;
		}

		return false;

	}

	_matchSuffixSize(matchCharacter, index) {

		this._suffixSizeSequence.next(matchCharacter, index);

		if (this._suffixSizeSequence.isComplete) {
			this._matchFunction = this._matchEnd;
			return this._matchFunction(matchCharacter);
		}

		if (this._suffixSizeSequence.hasNext()) {
			return true;
		}

		return false;

	}

};



/**
 * Token for decimal numbers
 */
const RustDecimalLiteralToken = class RustDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new RustDecimalPatternIterator());
	}
};



const RustNumberPatternIterator = class RustNumberPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
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

	octal
	tem que ter 1 número depois do o
	só 0 até 7
	0o07

	hexadecimal
	tem que ter 1 número depois do x
	só 0 até 9 e A até F
	0x07
	0x07p1
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

		if (matchCharacter === 'b') {
			this._matchCheck = this._isBinary;
			return true;
		}

		if (matchCharacter === 'o') {
			this._matchCheck = this._isOctal;
			return true;
		}

		if (matchCharacter === 'x') {
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

		if (matchCharacter === '_') { // TODO melhorar isso
			return true;
		}

		return false;

	}

	_isOctal(matchCharacter) {

		// FIXME transformar matchCharacter em número
		if (this._isNumberCharacter.test(matchCharacter) && matchCharacter > -1 && matchCharacter < 8) {
			return true;
		}

		if (matchCharacter === '_') { // TODO melhorar isso
			return true;
		}

		return false;

	}

	_isHexadecimal(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		if (matchCharacter === '_') { // TODO melhorar isso
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



/**
 * Token for binary, octal and hexadecimal numbers
 */
const RustNumericLiteralToken = class RustNumericLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new RustNumberPatternIterator());
	}
};



const RustStringPatternIterator = class RustStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
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
		if (matchCharacter === '"') {
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



/**
 * Token for Rust strings
 */
const RustStringLiteralToken = class RustStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new RustStringPatternIterator());
	}
};



const RustAttributePatternIterator = class RustAttributePatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		this._matchFunction = this._matchHash;
		Object.seal(this);
	}

	_matchHash(matchCharacter) {
		if (matchCharacter === '#') {
			this._matchFunction = this._matchStartBracket;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchStartBracket(matchCharacter) {
		if (matchCharacter === '[') {
			this._matchFunction = this._matchContentOrEndBracket;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchContentOrEndBracket(matchCharacter) {

		if (matchCharacter === ']') {
			this._matchFunction = this._matchEnd;
		}

		if (this._matchLineBreak(matchCharacter)) {
			this._hasNext = false;
			return false;
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



/**
 * Token for Rust attributes
 */
const RustAttributeToken = class RustAttributeToken extends SourcePatternIteratorToken {
	constructor() {
		super('attribute', new RustAttributePatternIterator());
	}
};



/**
 * Token for Rust symbols
 */
const RustRawIdentifierSymbolToken = class RustRawIdentifierSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new RustRawIdentifierSymbolIterator());
	}
};



const RustRawIdentifierSymbolIterator = class RustRawIdentifierSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchR;

	}

	_matchR(matchCharacter) {

		if (matchCharacter === 'r') {
			this._matchFunction = this._matchHash;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchHash(matchCharacter) {

		if (matchCharacter === '#') {
			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
			|| this._isWordCharacter.test(matchCharacter)
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

};



/**
 * Token for Rust symbols
 */
const RustSymbolToken = class RustSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new RustSymbolIterator());
	}
};



const RustSymbolIterator = class RustSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchBeginningValidCharacter;

	}

	_matchBeginningValidCharacter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			this._matchFunction = this._matchValidCharacter;
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '_'
			|| matchCharacter === '@'
			) {

			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
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

};



const RustLifetimePatternIterator = class RustLifetimePatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isAlphaNumericCharacter: {value: isAlphaNumericCharacterRegex}
		});
		this._matchFunction = this._matchStartQuote;
		Object.seal(this);
	}

	_matchStartQuote(matchCharacter) {
		if (matchCharacter === "'") {
			this._matchFunction = this._matchLetter;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchLetter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			//this._isComplete = true;
			this._matchFunction = this._matchContentOrEnd;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEnd(matchCharacter) {

		if (!this._isAlphaNumericCharacter.test(matchCharacter)) {
			this._isComplete = true;
			return this._matchEnd(matchCharacter);
		}

		return true;

	}

};



/**
 * Token for lifetimes
 */
const RustLifetimeToken = class RustLifetimeToken extends SourcePatternIteratorToken {
	constructor() {
		super('lifetime', new RustLifetimePatternIterator());
	}
};



const RustLabelPatternIterator = class RustLabelPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex},
			_length: {value: 0, writable: true}
		});
		this._matchFunction = this._matchStartQuote;
		Object.seal(this);
	}

	_matchStartQuote(matchCharacter) {
		if (matchCharacter === "'") {
			this._matchFunction = this._matchLetter;
			return true;
		}
		this._hasNext = false;
		return false;
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

};



/**
 * Token for labels
 */
const RustLabelToken = class RustLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new RustLabelPatternIterator());
	}
};

// #endregion



// #region Go lexer

const GoLexer = class GoLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new GoKeywordToken(),
			new GoTypesToken(),
			new GoPunctuationToken(),

			// comments
			new GoDirectiveToken(),
			new GoLineDirectiveToken(),
			new GoLineBlockDirectiveToken(),
			new CLineCommentToken(),
			new CBlockCommentToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();
		// TODO melhorar isso, se não a cada token vai fazer um loop pra verificar se é o primeiro da linha
		/*if (this._isFirstTokenOfLine(tokenSequence)) {
			this._tokenPool.push(new GoLabelToken());
		}*/
		//this._tokenPool.push(new GoSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new GoDecimalLiteralToken(),
			new GoNumericLiteralToken(),
			new GoStringLiteralToken(),
			new CCharLiteralToken() // TODO this is not the full implementation...
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

	/**
	 * Checks if the line has only whitespace so far
	 * Used to identify labels
	 * @param tokenSequence Sequence of tokens parsed so far by the lexer
	 */
	_isFirstTokenOfLine(tokenSequence) {

		let lastToken = null;

		if (!tokenSequence) {
			return true;
		}

		for (let i = tokenSequence.length; i > 0; i--) {

			lastToken = tokenSequence[i - 1];

			if (lastToken.type === 'endOfLine') {
				return true;
			}

			if (lastToken.ignore) {
				continue;
			}

			return false;

		}

		return true;

	}

};



/**
 * Token for Go keywords
 */
const GoKeywordToken = class GoKeywordToken  extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			// TODO check if they are actually used, or just reserved
			'break',
			'case',
			'chan',
			'const',
			'continue',
			'default',
			'defer',
			'else',
			'fallthrough',
			'false',
			'for',
			'func',
			'go',
			'goto',
			'if',
			'import',
			'interface',
			'iota',
			'map',
			'nil',
			'select',
			'struct',
			'true',
			'package',
			'panic',
			'range',
			'recover',
			'return',
			'switch',
			'type',
			'var'
		]);

		Object.seal(this);

	}

};



/**
 * Token for Go types
 * TODO check arrays and pointers and other possible combining characters
 */
const GoTypesToken = class GoTypesToken  extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('type', [

			'uint8',
			'*uint8',
			'uint16',
			'*uint16',
			'uint32',
			'*uint32',
			'uint64',
			'*uint64',
			'uint',
			'*uint',
			'uintptr',
			'*uintptr',
			'int8',
			'*int8',
			'int16',
			'*int16',
			'int32',
			'*int32',
			'int64',
			'*int64',
			'int',
			'*int',
			'float32',
			'*float32',
			'float64',
			'*float64',
			'complex64',
			'*complex64',
			'complex128',
			'*complex128',
			'byte',
			'*byte',
			'rune',
			'*rune',
			'string',
			'*string',
			'bool',
			'*bool',
			'error',

		]);

		Object.seal(this);

	}

};



/**
 * Token for Go punctuation
 */
const GoPunctuationToken = class GoPunctuationToken  extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('operator', [

			'+',
			'&',
			'&amp;',
			'+=',
			'&=',
			'&amp;=',
			'&&',
			'&amp;&amp;',
			'==',
			'!=',
			'(',
			')',
			'-',
			'|',
			'-=',
			'|=',
			'||',
			'<',
			'&lt;',
			'<=',
			'&lt;=',
			'[',
			']',
			'*',
			'^',
			'*=',
			'^=',
			'<-',
			'&lt;-',
			'>',
			'&gt;',
			'>=',
			'&gt;=',
			'{',
			'}',
			'/',
			'<<',
			'&lt;&lt;',
			'/=',
			'<<=',
			'&lt;&lt;=',
			'++',
			'=',
			':=',
			',',
			';',
			'%',
			'>>',
			'&gt;&gt;',
			'%=',
			'>>=',
			'&gt;&gt;=',
			'--',
			'!',
			'...',
			'.',
			':',
			'&^',
			'&amp;^',
			'&^=',
			'&amp;^='

		]);

		Object.seal(this);

	}

};



/**
 * Token for decimal numbers
 */
const GoDecimalLiteralToken = class GoDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new GoDecimalPatternIterator());
	}
};

const GoDecimalPatternIterator = class GoDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
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



/**
 * Token for binary, octal and hexadecimal numbers
 */
const GoNumericLiteralToken = class GoNumericLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new GoNumberPatternIterator());
	}
};

const GoNumberPatternIterator = class GoNumberPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
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

		if (matchCharacter === '_') { // TODO melhorar isso
			return true;
		}

		return false;
	}

	_isOctal(matchCharacter) {

		// FIXME transformar matchCharacter em número
		if (this._isNumberCharacter.test(matchCharacter) && matchCharacter > -1 && matchCharacter < 8) {
			return true;
		}

		if (matchCharacter === '_') { // TODO melhorar isso
			return true;
		}

		return false;
	}

	_isHexadecimal(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		if (matchCharacter === '_') { // TODO melhorar isso
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



/**
 * Token for strings
 */
const GoStringLiteralToken = class GoStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new GoStringPatternIterator());
	}
};

const GoStringPatternIterator = class GoStringPatternIterator {

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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"'
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

		if (matchCharacter === '\\' && this._quoteType === '"') {
			this._isEscaped = true;
			return true;
		}

		let isLineBreak = this._matchLineBreak(matchCharacter);

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === this._quoteType
			|| (isLineBreak && this._quoteType === '"')
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



const GoDirectiveToken = class GoDirectiveToken extends SourcePatternIteratorToken {
	constructor() {
		super('directive', new GoDirectivePatternIterator());
	}
};

const GoDirectivePatternIterator = class GoDirectivePatternIterator extends SourcePatternIterator {

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
			this._matchFunction = this._matchG;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchG(matchCharacter) {
		if (matchCharacter === 'g') {
			this._matchFunction = this._matchO;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchO(matchCharacter) {
		if (matchCharacter === 'o') {
			this._matchFunction = this._matchColon;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchColon(matchCharacter) {
		if (matchCharacter === ':') {
			this._matchFunction = this._matchSameLine;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	/*_matchSpace(matchCharacter) {
		if (matchCharacter === ' ') {
			this._matchFunction = this._matchSameLine;
			return true;
		}
		this._hasNext = false;
		return false;
	}*/

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


const GoLineDirectiveToken = class GoLineDirectiveToken extends SourcePatternIteratorToken {
	constructor() {
		super('directive', new GoLineDirectivePatternIterator());
	}
};

const GoLineDirectivePatternIterator = class GoLineDirectivePatternIterator extends SourcePatternIterator {

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
			this._matchFunction = this._matchL;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchL(matchCharacter) {
		if (matchCharacter === 'l') {
			this._matchFunction = this._matchI;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchI(matchCharacter) {
		if (matchCharacter === 'i') {
			this._matchFunction = this._matchN;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchN(matchCharacter) {
		if (matchCharacter === 'n') {
			this._matchFunction = this._matchE;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchE(matchCharacter) {
		if (matchCharacter === 'e') {
			this._matchFunction = this._matchSameLine;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	/*_matchSpace(matchCharacter) {
		if (matchCharacter === ' ') {
			this._matchFunction = this._matchSameLine;
			return true;
		}
		this._hasNext = false;
		return false;
	}*/

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


const GoLineBlockDirectiveToken = class GoLineBlockDirectiveToken extends SourcePatternIteratorToken {
	constructor() {
		super('directive', new GoLineBlockDirectivePatternIterator());
	}
};

const GoLineBlockDirectivePatternIterator = class GoLineBlockDirectivePatternIterator extends SourcePatternIterator {

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
			this._matchFunction = this._matchL;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchL(matchCharacter) {
		if (matchCharacter === 'l') {
			this._matchFunction = this._matchI;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchI(matchCharacter) {
		if (matchCharacter === 'i') {
			this._matchFunction = this._matchN;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchN(matchCharacter) {
		if (matchCharacter === 'n') {
			this._matchFunction = this._matchE;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchE(matchCharacter) {
		if (matchCharacter === 'e') {
			this._matchFunction = this._matchSameLineOrEndStar;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	/*_matchSpace(matchCharacter) {
		if (matchCharacter === ' ') {
			this._matchFunction = this._matchSameLine;
			return true;
		}
		this._hasNext = false;
		return false;
	}*/

	_matchSameLineOrEndStar(matchCharacter) {

		// any except line break
		if (this._matchLineBreak(matchCharacter)) {
			this._hasNext = false;
			return false;
		}

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



/**
 * Token for Go labels
 */
const GoLabelToken = class GoLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new GoLabelIterator());
	}
};



const GoLabelIterator = class GoLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
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

};



// #endregion



// #region C++ lexer

const CppLexer = class CppLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new CDirectiveToken(),
			new CppKeywordToken(),
			new CppTypesToken(),
			new CppPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new CBlockCommentToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// TODO melhorar isso, se não a cada token vai fazer um loop pra verificar se é o primeiro da linha
		/*if (this._isFirstTokenOfLine(tokenSequence)) {
			this._tokenPool.push(new CppLabelToken());
		}*/
		this._tokenPool.push(new CppSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new CppDecimalLiteralToken(),
			//new CppNumericLiteralToken(),
			new CStringLiteralToken(),
			new CppStringLiteralToken(),
			new CCharLiteralToken() // TODO this is not the full implementation...
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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

	/**
	 * Checks if the line has only whitespace so far
	 * Used to identify labels
	 * @param tokenSequence Sequence of tokens parsed so far by the lexer
	 */
	_isFirstTokenOfLine(tokenSequence) {

		let lastToken = null;

		if (!tokenSequence) {
			return true;
		}

		for (let i = tokenSequence.length; i > 0; i--) {

			lastToken = tokenSequence[i - 1];

			if (lastToken.type === 'endOfLine') {
				return true;
			}

			if (lastToken.ignore) {
				continue;
			}

			return false;

		}

		return true;

	}

};





/**
 * Token for C++ keywords
 */
const CppKeywordToken = class CppKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'_Pragma',

			'alignas',
			'alignof', // operator
			'asm',

			//'atomic_cancel',
			//'atomic_commit',
			//'atomic_noexcept',

			'auto', // TODO auto ficaria melhor como um tipo e não keyword?
			'break',
			'case',
			'catch',
			'class',

			//'concept',

			'const',
			'constexpr',
			'const_cast',
			'continue',
			'decltype',
			'default',
			'delete',
			'do',
			'dynamic_cast',
			'else',
			'enum', // TODO enum ficaria melhor como um tipo e não keyword?
			'explicit',
			'export',
			'extern',
			'final',
			'for',
			'friend',
			'goto',
			'if',
			'import',
			'inline',

			'module',

			'mutable',
			'namespace',
			'new',
			'noexcept',
			'operator',
			'override',
			'private',
			'protected',
			'public',
			'register',
			'reinterpret_cast',

			//'requires',

			'return',
			'sizeof', // operator
			'static',
			'static_assert',
			'static_cast',
			'struct',
			'switch',

			//'synchronized',

			'template',
			'this',
			'thread_local',
			'throw',

			//'transaction_safe',
			//'transaction_safe_dynamic',

			'try',
			'typedef',
			'typeid',
			'typename',
			'union',
			'using',
			'virtual',
			// 'void', // vou realçar como tipo
			'volatile',
			'while',

			// alt operators
			'and',
			'and_eq',
			'bitand',
			'bitor',
			'compl',
			'not',
			'not_eq',
			'or',
			'or_eq',
			'xor',
			'xor_eq',
			/*'&lt;%',
			'%&gt;',
			'&lt;:',
			':&gt;',*/
			'%:',
			'%:%:',

			// literals
			'true',
			'false',
			'nullptr',
			'NULL',

			// std
			'cout',
			'endl',
			'make_unique',
			'make_shared',
			'ref',
			'async',
			'co_await',
			'co_yield',
			'co_return'
			// 'begin',
			// 'end'

		]);

		Object.seal(this);

	}

};



/**
 * Token for C++ types
 */
const CppTypesToken = class CppTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_ampersandSequence: {value: new SourceSimpleCharacterSequenceToken('type', ['&amp;'])},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'bool',
				'char',
				'double',
				'float',
				'int',
				'int8_t',
				'int16_t',
				'int32_t',
				'int64_t',
				'int_fast8_t',
				'int_fast16_t',
				'int_fast32_t',
				'int_fast64_t',
				'int_least8_t',
				'int_least16_t',
				'int_least32_t',
				'int_least64_t',
				'intptr_t',
				'long',
				'long double',
				'long long',
				'short',
				'size_t',

				'unsigned int',
				'uint8_t',
				'uint16_t',
				'uint32_t',
				'uint64_t',
				'uint_fast8_t',
				'uint_fast16_t',
				'uint_fast32_t',
				'uint_fast64_t',
				'uint_least8_t',
				'uint_least16_t',
				'uint_least32_t',
				'uint_least64_t',
				'unsigned long',
				'unsigned long long',
				'unsigned short',
				'uintptr_t',

				'wchar_t',
				'char16_t',
				'char32_t',
				'char8_t',

				'array',
				'default_random_engine',
				'exception',
				'lock_guard',
				'mutex',
				'nullptr_t',
				'optional',
				'ostringstream',
				'queue',
				'random_device',
				'string',
				'thread',
				'uniform_int_distribution',
				'vector',
				'void',

				'T',
				'U',
				'V'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			this._matchFunction = this._matchTypeOperator;
			return this._matchFunction(matchCharacter);
		}

		if (this._typesSequence.hasNext()) {
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchTypeOperator(matchCharacter, index) {

		if (matchCharacter === '*') {
			this._matchFunction = this._matchEnd;
			return true;
		} else if (matchCharacter === '&') { // FIXME pode repetir e misturar * e & quantas vezes quiser
			this._matchFunction = this._matchAmpersandSequence;
			return this._matchFunction(matchCharacter, index);
		}

		return this._matchEnd(matchCharacter, index);

	}

	_matchAmpersandSequence(matchCharacter, index) {

		this._ampersandSequence.next(matchCharacter, index);

		if (this._ampersandSequence.isComplete) {
			this._matchFunction = this._matchEnd;
			return true;
		}

		if (this._ampersandSequence.hasNext()) {
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



/**
 * Token for C++ punctuation
 */
const CppPunctuationToken = class CppPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [
			'.',
			'.*',
			'-&gt;',
			'->',
			'-&gt;*',
			'->*',
			'(',
			')',
			'{',
			'}',
			'[',
			']',
			',',
			'?',
			':',
			'::',
			';',

			'&amp;&amp;',
			'&&',
			'||',
			'&amp;', // bitwise and
			'&',
			'|', // bitwise or
			'^', // bitwise xor
			'~', // bitwise not
			'&gt;&gt;', // bitwise left shift
			'>>',
			'&lt;&lt;', // bitwise right shift
			'<<',
			'+',
			'++',
			'-',
			'--',
			'*',
			'/',
			'%',
			'==',
			'&lt;=&gt;', // spaceship operator <=>
			'<=>;', // spaceship operator <=>
			'!',
			'!=',
			'&gt;',
			'>',
			'&gt;=',
			'>=',
			'&lt;',
			'<',
			'&lt;=',
			'<=',

			'=',
			'+=',
			'-=',
			'*=',
			'/=',
			'%=',

			'&amp;=', // bitwise and
			'&=', // bitwise and
			'|=', // bitwise or
			'^=', // bitwise xor
			// '~=', // bitwise not não existe
			'&gt;&gt;=', // bitwise left shift
			'>>=', // bitwise left shift
			'&lt;&lt;=', // bitwise right shift
			'<<=', // bitwise right shift

			'...',

			'std::', // FIXME
			'boost::' // FIXME

		]);

	}

};



const CppLabelToken = class CppLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new CppLabelIterator());
	}
};



const CppLabelIterator = class CppLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_characterSequence: {value: '', writable: true},
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchLetter;

	}

	_matchLetter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			this._characterSequence += matchCharacter;
			this._matchFunction = this._matchWordOrColon;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchWordOrColon(matchCharacter) {

		if (matchCharacter !== null && this._isWordCharacter.test(matchCharacter)) {
			this._characterSequence += matchCharacter;
			return true;
		}

		if (matchCharacter === ':') {

			if (this._characterSequence == 'public' || this._characterSequence == 'protected' || this._characterSequence == 'private') {
				this._hasNext = false;
				return false;
			}

			this._matchFunction = this._matchEnd;
			return true;

		}

		this._hasNext = false;
		return false;

	}

};



const CppDecimalPatternIterator = class CppDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
		});
		this._matchFunction = this._matchNumber;
		Object.seal(this);
	}

	// pode ter u, l, ll, ul, ull, lu no final tanto em caixa alta quanto baixa
	// não sei se pode pode ter lu, llu, f, d no final
	// pode ter ' separando os números

	_matchNumber(matchCharacter, index) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '.' && !this._hasMantissa) {
			this._hasMantissa = true;
			this._isComplete = false;
			return true;
		}

		if (index > 0 && matchCharacter === "'") { // TODO melhorar isso
			this._isComplete = false;
			return true;
		}

		if (this._matchSuffix(matchCharacter)) {
			return true;
		}

		if (this._isComplete) {
			return this._matchEnd(matchCharacter);
		}

		this._hasNext = false;
		return false;

	}

	_matchSuffix(matchCharacter) {

		if (!this._isComplete) {
			return false;
		}

		if (matchCharacter == null) {
			return false;
		}

		let lowerMatchCharacter = matchCharacter.toLowerCase();

		if (lowerMatchCharacter == 'f'
			|| lowerMatchCharacter == 'l' // c++ tem long double ou long integer
			) {
			return true;
		}

		if (this._hasMantissa) {
			return false;
		}

		if (lowerMatchCharacter == 'u') {

			return true;
		}

		return false;

	}

	// TODO implementar para garantir a ordem e comprimento das letras nos sufixos , ver rust de exemplo
	/*_matchSuffix2(matchCharacter) {

		return false;

	}*/

};



/**
 * Token for decimal numbers
 */
const CppDecimalLiteralToken = class CppDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new CppDecimalPatternIterator());
	}
};



const CppStringPatternIterator = class CppStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_separator: {value: '', writable: true},
			_separatorSequence: {value: null, writable: true},
			_matchFunction: {value: context._matchR, writable: true}
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	/*
	R"custom(minhastring)custom";

	*/

	_matchR(matchCharacter) {

		if (matchCharacter === 'R') {
			this._matchFunction = this._matchStartQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchStartSeparatorSequenceOrBrace;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartSeparatorSequenceOrBrace(matchCharacter) {

		if (matchCharacter === '(') {
			if (this._separator) {
				this._separatorSequence = new SourceSimpleCharacterSequenceToken('endSeparator', [this._separator]);
			}
			this._matchFunction = this._matchContentOrEndBrace;
			return true;
		}

		this._separator += matchCharacter;
		return true;

	}

	_matchContentOrEndBrace(matchCharacter) {

		if (matchCharacter === ')') {

			if (this._separator) {
				this._matchFunction = this._matchEndSeparatorSequence;
			} else {
				this._matchFunction = this._matchEndQuote;
			}
		}

		return true;

	}

	_matchEndSeparatorSequence(matchCharacter, index) {

		this._separatorSequence.next(matchCharacter, index); // TODO verificar se recebe index

		if (this._separatorSequence.isComplete) {
			this._matchFunction = this._matchEndQuote;
			return this._matchFunction(matchCharacter);
		}

		if (this._separatorSequence.hasNext()) {
			return true;
		}

		// FIXME verificar se pode resetar separatorSequence e matchFunction volta pra _matchContentOrEndBrace

		this._hasNext = false;
		return false;

	}

	_matchEndQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		this._hasNext = false;
		return false;

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



/**
 * Token for raw strings
 */
const CppStringLiteralToken = class CppStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('rstring', new CppStringPatternIterator());
	}
};



const CppSymbolToken = class CppSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new CppSymbolIterator());
	}
};



const CppSymbolIterator = class CppSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchBeginningValidCharacter;

	}

	_matchBeginningValidCharacter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			this._matchFunction = this._matchValidCharacter;
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '_') {
			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
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

};



// #endregion



// #region Objective-C lexer



const ObjectiveCLexer = class ObjectiveCLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new CDirectiveToken(),
			new ObjCKeywordToken(),
			new ObjCTypesToken(),
			new ObjCPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new CBlockCommentToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new ObjCDecimalLiteralToken(),
			//new JSNumericLiteralToken(),
			new CStringLiteralToken(),
			new ObjCStringLiteralToken(),
			new ObjCCharLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



/**
 * Token for Objective-C keywords
 */
const ObjCKeywordToken = class ObjCKeywordToken extends SourceSimpleCharacterSequenceToken {

	/*
	TODO
	swift attributes
	@noescape
	@autoclosure
	@available
	@warn_unused_result
	@swift3_migration
	*/

	constructor() {
		super('keyword', [

			'@autoreleasepool',
			'@catch',
			'@class',
			'@dynamic',
			'@interface',
			'@implementation',
			'@end',
			'@finally',
			'@optional',
			'@package',
			'@private',
			'@property',
			'@protected',
			'@protocol',
			'@public',
			'@required',
			'@selector',
			'@synchronized',
			'@synthesize',
			'@throw',
			'@try',

			'@compatibility_alias',
			'@defs',
			'@encode',

			'IBAction',
			'IB_DESIGNABLE',
			'IBInspectable',
			'IBOutlet',

			'alloc',
			'assign',
			'break',
			'const',
			'copy',
			'dealloc',
			'fileprivate',
			'for',
			'free',
			'if',
			'in',
			'init',
			'nonatomic',
			'readonly',
			'return',
			'self',
			'strong',
			'struct',
			'super',
			'typedef',
			// 'void', // vou realçar como tipo
			'weak',
			'while',

			// literals
			'true',
			'false',
			'YES',
			'NO',
			'@YES',
			'@NO',
			'nil',
			'Nil',
			'NULL',

			'__block',

			// macros actually
			'va_list',
			'va_arg',
			'va_start',
			'va_end'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Objective-C types
 */
const ObjCTypesToken = class ObjCTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'bool',
				'BOOL', // TODO verificar bool e BOOL
				'char',
				'double',
				'float',
				'id',
				'int',
				'int8_t',
				'int16_t',
				'int32_t',
				'int64_t',
				'int_least8_t',
				'int_least16_t',
				'int_least32_t',
				'int_least64_t',
				'intptr_t',
				'long',
				'long double',
				'long long',
				'NSArray',
				'NSMutableArray',
				'NSInteger',
				'NSException',
				'NSNumber',
				'NSObject',
				'NSString',
				'NSMutableString',
				'NSUInteger',
				'short',

				'unsigned int',
				'uint8_t',
				'uint16_t',
				'uint32_t',
				'uint64_t',
				'uint_least8_t',
				'uint_least16_t',
				'uint_least32_t',
				'uint_least64_t',
				'unsigned long',
				'unsigned long long',
				'unsigned short',
				'uintptr_t',
				'void'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			this._matchFunction = this._matchTypeOperator;
			return this._matchFunction(matchCharacter);
		}

		if (this._typesSequence.hasNext()) {
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchTypeOperator(matchCharacter, index) {

		if (matchCharacter === '*') {
			return true;
		}

		return this._matchEnd(matchCharacter, index);

	}

	/**
	 * Indica que o pattern já terminou no caractere anterior
	 */
	_matchEnd(matchCharacter, index) {
		this._complete();
		return false;
	}

};



/**
 * Token for Objective-C punctuation
 */
const ObjCPunctuationToken = class ObjCPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [

			'.',
			'(',
			'@(',
			')',
			'{',
			'@{',
			'}',
			'[',
			'@[',
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
			'+',
			'++',
			'-',
			'--',
			'*',
			'/',
			'%',
			'==',
			'!',
			'!=',
			'&gt;',
			'&gt;=',
			'&lt;',
			'&lt;=',

			'=',
			'+=',
			'-=',
			'*=',
			'/=',
			'%='

		]);

	}

};



const ObjCDecimalPatternIterator = class ObjCDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
		});
		this._matchFunction = this._matchAtOrNumber;
		Object.seal(this);
	}

	// pode ter u, l, ll, f, no final tanto em caixa alta quanto baixa
	// não sei se pode ter ul ou lu no final

	_matchAtOrNumber(matchCharacter) {

		this._matchFunction = this._matchNumber;

		if (matchCharacter === '@') {
			return true;
		}

		return this._matchFunction(matchCharacter);

	}

	_matchNumber(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			this._isComplete = true;
			return true;
		}

		// TODO não sei se pode começçar com . mas provavelmente não
		if (matchCharacter === '.' && !this._hasMantissa) {
			this._hasMantissa = true;
			this._isComplete = false;
			return true;
		}

		if (this._matchSuffix(matchCharacter)) {
			return true;
		}

		if (this._isComplete) {
			return this._matchEnd(matchCharacter);
		}

		this._hasNext = false;
		return false;

	}

	_matchSuffix(matchCharacter) {

		if (!this._isComplete) {
			return false;
		}

		if (matchCharacter == null) {
			return false;
		}

		let lowerMatchCharacter = matchCharacter.toLowerCase();

		if (lowerMatchCharacter == 'f') {
			return true;
		}

		if (this._hasMantissa) {
			return false;
		}

		if (lowerMatchCharacter == 'u'
			|| lowerMatchCharacter == 'l'
			) {

			return true;
		}

		return false;

	}

};



/**
 * Token for decimal numbers
 */
const ObjCDecimalLiteralToken = class ObjCDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new ObjCDecimalPatternIterator());
	}
};



const ObjCCharPatternIterator = class ObjCCharPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchAt, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchAt(matchCharacter) {

		if (matchCharacter === '@') {
			this._matchFunction = this._matchStartQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === "'") {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContent(matchCharacter) {

		// FIXME verificar o comprimento do char
		if (this._isEscaped) {
			this._isEscaped = false;
			return true;
		}

		if (matchCharacter === '\\') {
			this._isEscaped = true;
			return true;
		}

		if (matchCharacter !== "'") {
			this._matchFunction = this._matchEndQuote;
			return true;
		}

		return false;

	}

	_matchEndQuote(matchCharacter) {

		if (matchCharacter === "'") {
			this._matchFunction = this._matchEnd;
			return true;
		}

		this._hasNext = false;
		return false;

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



/**
 * Token for strings
 */
const ObjCCharLiteralToken = class ObjCCharLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('objcchar', new ObjCCharPatternIterator());
	}
};



const ObjCStringPatternIterator = class ObjCStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchAt, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchAt(matchCharacter) {

		if (matchCharacter === '@') {
			this._matchFunction = this._matchStartQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
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
		if (matchCharacter === '"'
			|| this._matchLineBreak(matchCharacter)
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



/**
 * Token for strings
 */
const ObjCStringLiteralToken = class ObjCStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('objcstring', new ObjCStringPatternIterator());
	}
};



// #endregion



// #region Swift lexer

const SwiftLexer = class SwiftLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new SwiftKeywordToken(),
			new SwiftTypesToken(),
			new SwiftPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new NestedBlockCommentToken(),
			new SwiftDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// TODO melhorar isso, se não a cada token vai fazer um loop pra verificar se é o primeiro da linha
		/*if (this._isFirstTokenOfLine(tokenSequence)) {
			this._tokenPool.push(new SwiftLabelToken());
		}*/
		//this._tokenPool.push(new SwiftSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new SwiftNumericLiteralToken(),
			new SwiftDecimalLiteralToken(),
			new SwiftStringLiteralToken(),
			new SwiftMultilineStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

	/**
	 * Checks if the line has only whitespace so far
	 * Used to identify labels
	 * @param tokenSequence Sequence of tokens parsed so far by the lexer
	 */
	_isFirstTokenOfLine(tokenSequence) {

		let lastToken = null;

		if (!tokenSequence) {
			return true;
		}

		for (let i = tokenSequence.length; i > 0; i--) {

			lastToken = tokenSequence[i - 1];

			if (lastToken.type === 'endOfLine') {
				return true;
			}

			if (lastToken.ignore) {
				continue;
			}

			return false;

		}

		return true;

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



/**
 * Token for Swift keywords
 */
const SwiftKeywordToken = class SwiftKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'@escaping',
			'@IBAction',
			'@IBDesignable',
			'@IBInspectable',
			'@IBOutlet',
			'@objc',
			'@UIApplicationMain',

			'#selector',

			'actor',
			'as',
			'async',
			'await',
			'case',
			'catch',
			'class',
			'continue',
			'convenience',
			'default',
			'defer',
			'deinit',
			'didSet',
			'do',
			'else',
			'enum',
			'extension',
			'fallthrough',
			'fileprivate',
			'final',
			'for',
			'func',
			'get',
			'if',
			'import',
			'in',
			'infix',
			'init',
			'inout',
			'internal',
			'is',
			'lazy',
			'let',
			'mutating',
			'operator',
			'override',
			'postfix',
			'prefix',
			'private',
			'protocol',
			'public',
			'repeat',
			'required',
			'rethrows',
			'return',
			'self',
			'set',
			'static',
			'struct',
			'subscript',
			'super',
			'switch',
			'throw',
			'throws',
			'try',
			'typealias',
			'var',
			'weak',
			'while',

			// literals
			'true',
			'false',
			'nil',

			// build configurations
			'arch',
			'os',
			'swift'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Swift types
 */
const SwiftTypesToken = class SwiftTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'Any',
				'Array',
				'Bool',
				'Character',
				'Double',
				'Float',
				'Float32',
				'Float64',
				'Float80',
				'Int',
				'Int8',
				'Int16',
				'Int32',
				'Int64',
				'UInt',
				'UInt8',
				'UInt16',
				'UInt32',
				'UInt64',

				'Void',
				'NSObject',
				'NSString',
				'String',
				'NSException',
				'ErrorType',

				'UnsafePointer',
				'UnsafeMutablePointer',

				'NSThread',
				'pthread_t',
				'pthread_attr_t',

				'T',
				'U',
				'V'

				// TODO Coloco os compatibilidade com C?

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			this._matchFunction = this._matchTypeOperator;
			return this._matchFunction(matchCharacter);
		}

		if (this._typesSequence.hasNext()) {
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchTypeOperator(matchCharacter, index) {

		if (matchCharacter === '?') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		return this._matchEnd(matchCharacter, index);

	}

	/**
	 * Indica que o pattern já terminou no caractere anterior
	 */
	_matchEnd(matchCharacter, index) {
		this._complete();
		return false;
	}

};



/**
 * Token for Swift punctuation
 */
const SwiftPunctuationToken = class SwiftPunctuationToken extends SourceSimpleCharacterSequenceToken {

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
			'??',
			':',
			// ';', // TODO embora não recomendado eu acho que tem

			'&amp;&amp;',
			'&amp;&amp;=',
			'||',
			'||=',
			'&amp;', // bitwise and
			'|', // bitwise or
			'^', // bitwise xor
			'~', // bitwise not
			'&gt;&gt;', // bitwise left shift
			'&lt;&lt;', // bitwise right shift
			'+',
			'&amp;+', // + overflow
			'-',
			'&amp;-', // - overflow
			'*',
			'&amp;*', // * ignore overflow
			'/',
			//'&amp;/', // / ignore overflow não existe mais
			'%',
			//'&amp;%', // % ignore overflow não existe mais
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
			'~=', // pattern matching
			'&gt;&gt;=', // bitwise left shift
			'&lt;&lt;=', // bitwise right shift

			'..<',
			'...',

			'_' // omite nome do parâmetro na chamada, não é bem um operador, mas é pontuação

		]);

	}

};



const SwiftDecimalPatternIterator = class SwiftDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
		});
		this._matchFunction = this._matchNumber;
		Object.seal(this);
	}

	// pode ter _ separando os números

	_matchNumber(matchCharacter, index) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			this._isComplete = true;
			return true;
		}

		if (index > 0 && matchCharacter === '.' && !this._hasMantissa) { // FIXME se o range operator vem depois do número, esse match vai dar problema. Ex 1..5 Válido para Rust, Swift e Kotlin
			this._hasMantissa = true;
			this._isComplete = false;
			return true;
		}

		if (index > 0 && matchCharacter === '_') { // TODO melhorar isso
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



/**
 * Token for decimal numbers
 */
const SwiftDecimalLiteralToken = class SwiftDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new SwiftDecimalPatternIterator());
	}
};



const SwiftNumberPatternIterator = class SwiftNumberPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
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

	octal
	tem que ter 1 número depois do o
	só 0 até 7
	0o07

	hexadecimal
	tem que ter 1 número depois do x
	só 0 até 9 e A até F
	0x07
	0x07p1
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

		if (matchCharacter === 'b') {
			this._matchCheck = this._isBinary;
			return true;
		}

		if (matchCharacter === 'o') {
			this._matchCheck = this._isOctal;
			return true;
		}

		if (matchCharacter === 'x') {
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

		if (matchCharacter === '_') { // TODO melhorar isso
			return true;
		}

		return false;

	}

	_isOctal(matchCharacter) {

		// FIXME transformar matchCharacter em número
		if (this._isNumberCharacter.test(matchCharacter) && matchCharacter > -1 && matchCharacter < 8) {
			return true;
		}

		if (matchCharacter === '_') { // TODO melhorar isso
			return true;
		}

		return false;

	}

	_isHexadecimal(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		if (matchCharacter === '_') { // TODO melhorar isso
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

		// TODO se encontrar um p, ver notação científica hexadecimal

		return false;

	}

};



/**
 * Token for binary, octal and hexadecimal numbers
 */
const SwiftNumericLiteralToken = class SwiftNumericLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new SwiftNumberPatternIterator());
	}
};



const SwiftStringPatternIterator = class SwiftStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		let isLineBreak = this._matchLineBreak(matchCharacter);

		if (this._isEscaped && !isLineBreak) { // line break não é escapável em swift
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
		if (matchCharacter === '"'
			|| isLineBreak
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



/**
 * Token for Swift strings
 */
const SwiftStringLiteralToken = class SwiftStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new SwiftStringPatternIterator());
	}
};



const SwiftMultilineStringPatternIterator = class SwiftMultilineStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchStartQuote1, writable: true}
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote1(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchStartQuote2;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote2(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchStartQuote3;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote3(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote1;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote1(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote2;
		}

		return true;

	}

	_matchContentOrEndQuote2(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote3;
		}

		return true;

	}

	_matchContentOrEndQuote3(matchCharacter) {

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === '"') {
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



/**
 * Token for Swift strings
 */
const SwiftMultilineStringLiteralToken = class SwiftMultilineStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new SwiftMultilineStringPatternIterator());
	}
};



/**
 * Token for Swift directives
 */
const SwiftDirectiveToken = class SwiftDirectiveToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('directive', [
			'#if',
			'#else',
			'#elseif',
			'#endif'
		]);

		Object.seal(this);

	}

};



const SwiftLabelIterator = class SwiftLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
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

};



/**
 * Token for Swift labels
 */
const SwiftLabelToken = class SwiftLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new SwiftLabelIterator());
	}
};

// #endregion



// #region Kotlin lexer

const KotlinLexer = class KotlinLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new KotlinKeywordToken(),
			new KotlinTypesToken(),
			new KotlinPunctuationToken(),
			new KotlinAnnotationToken(),

			// comments
			new CLineCommentToken(),
			new CBlockCommentToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		this._tokenPool.push(new KotlinLabelToken());
		//this._tokenPool.push(new KotlinSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new KotlinDecimalLiteralToken(),
			new KotlinNumericLiteralToken(),
			new KotlinStringLiteralToken(),
			new KotlinRawStringLiteralToken(),
			new CCharLiteralToken() // TODO this is not the full implementation...
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



/**
 * Token for Kotlin keywords
 */
const KotlinKeywordToken = class KotlinKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'abstract',
			'annotation',
			'as',
			'break',
			'by',
			'catch',
			'class',
			'companion',
			'const',
			'continue',
			'constructor',
			'crossinline',
			'data',
			'do',
			'dynamic',
			'else',
			'enum',
			'extends',
			'external',
			'field',
			'final',
			'finally',
			'for',
			'fun',
			'get',
			'if',
			'import',
			'in',
			'inner',
			'init',
			'inline',
			'interface',
			'internal',
			'is',
			'lateinit',
			'new',
			'noinline',
			'null',
			'object',
			'open',
			'operator',
			'out',
			'override',
			'package',
			'private',
			'property',
			'protected',
			'public',
			'reified',
			'return',
			'sealed',
			'set',
			'super',
			'suspend',
			'synchronized',
			'tailrec',
			'this',
			'throw',
			'throws',
			'try',
			'typealias',
			'typeof',
			'val',
			'var',
			'vararg',
			'when',
			'where',
			'while',

			// ranges
			'downTo',
			'step',
			'until',

			'true',
			'false'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Kotlin types
 */
const KotlinTypesToken = class KotlinTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'Any',
				'Array',
				'Boolean',
				'Byte',
				'Char',
				'Double',
				'Float',
				'Int',
				'Long',
				'Nothing',
				'Short',
				'String',
				'CharSequence',
				'Unit',
				'void', // from Java only

				'ArrayList',
				'Pair',
				'Runnable',
				'StringBuilder',
				'Thread',
				'InterruptedException',

				'Exception',
				'Result',

				'T',
				'U',
				'V'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			this._matchFunction = this._matchTypeOperator;
			return this._matchFunction(matchCharacter);
		}

		if (this._typesSequence.hasNext()) {
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchTypeOperator(matchCharacter, index) {

		if (matchCharacter === '?') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		return this._matchEnd(matchCharacter, index);

	}

	/**
	 * Indica que o pattern já terminou no caractere anterior
	 */
	_matchEnd(matchCharacter, index) {
		this._complete();
		return false;
	}

};



/**
 * Token for Kotlin punctuation
 */
const KotlinPunctuationToken = class KotlinPunctuationToken extends SourceSimpleCharacterSequenceToken {

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
			// ';', // TODO embora não recomendado eu acho que tem

			'&amp;&amp;',
			//'&amp;&amp;=',
			'||',
			/*'||=',
			'&amp;', // bitwise and
			'|', // bitwise or
			'^', // bitwise xor
			'~', // bitwise not
			'&gt;&gt;', // bitwise left shift
			'&lt;&lt;', // bitwise right shift
			*/
			'+',
			'++',
			'-',
			'--',
			'*',
			'/',
			'%',
			'==',
			'===',
			'!',
			'!!',
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

			/*'&amp;=', // bitwise and
			'|=', // bitwise or
			'^=', // bitwise xor
			'~=', // pattern matching
			'&gt;&gt;=', // bitwise left shift
			'&lt;&lt;=', // bitwise right shift
			*/

			'..',
			'...'

		]);

	}

};



const KotlinDecimalPatternIterator = class KotlinDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
		});
		this._matchFunction = this._matchNumber;
		Object.seal(this);
	}

	// pode ter l, f, d no final tanto em caixa alta quanto baixa
	// pode ter _ separando os números

	_matchNumber(matchCharacter, index) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '.' && !this._hasMantissa) { // FIXME se o range operator vem depois do número, esse match vai dar problema. Ex 1..5 Válido para Rust, Swift e Kotlin
			this._hasMantissa = true;
			this._isComplete = false;
			return true;
		}

		if (index > 0 && matchCharacter === '_') { // TODO melhorar isso
			this._isComplete = false;
			return true;
		}

		if (this._matchSuffix(matchCharacter)) {
			return true;
		}

		if (this._isComplete) {
			return this._matchEnd(matchCharacter);
		}

		this._hasNext = false;
		return false;

	}

	_matchSuffix(matchCharacter) {

		if (!this._isComplete) {
			return false;
		}

		if (matchCharacter == null) {
			return false;
		}

		let lowerMatchCharacter = matchCharacter.toLowerCase();

		if (lowerMatchCharacter == 'f') {
			return true;
		}

		if (this._hasMantissa) {
			return false;
		}

		if (matchCharacter == 'L') {
			return true;
		}

		return false;

	}

};



/**
 * Token for decimal numbers
 */
const KotlinDecimalLiteralToken = class KotlinDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new KotlinDecimalPatternIterator());
	}
};



const KotlinNumberPatternIterator = class KotlinNumberPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
			_matchCheck: {value: null, writable: true}
		});
		this._matchFunction = this._matchFirstNumber;
		Object.seal(this);
	}

	/*
	números válidos

	binário
	tem que ter 1 número depois do b
	só 0 e 1
	0b10101110
	0B10101

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

	// TODO reaproveitar de uma classe base comum
	_matchSuffix(matchCharacter) {

		if (!this._isComplete) {
			return false;
		}

		if (matchCharacter == null) {
			return false;
		}

		let lowerMatchCharacter = matchCharacter.toLowerCase();

		if (lowerMatchCharacter == 'f'
			|| lowerMatchCharacter == 'd'
			) {

			return true;
		}

		if (this._hasMantissa) {
			return false;
		}

		if (lowerMatchCharacter == 'u'
			|| lowerMatchCharacter == 'l'
			) {

			return true;
		}

		return false;

	}

	_isBinary(matchCharacter) {

		if (matchCharacter === '0' || matchCharacter === '1') {
			return true;
		}

		if (matchCharacter === '_') { // TODO ver as regras dos separators
			return true;
		}

		// TODO ver se suporta sufixo nos binários

		return false;

	}

	_isHexadecimal(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		if (matchCharacter === '_') { // TODO ver as regras dos separators
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

		if (this._matchSuffix(matchCharacter)) {
			return true;
		}

		return false;

	}

};



/**
 * Token for hexadecimal numbers
 * Binary numbers are disabled for now
 */
const KotlinNumericLiteralToken = class KotlinNumericLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new KotlinNumberPatternIterator());
	}
};



const KotlinStringPatternIterator = class KotlinStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		let isLineBreak = this._matchLineBreak(matchCharacter);

		if (this._isEscaped && !isLineBreak) { // line break não é escapável em c#
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
		if (matchCharacter === '"'
			|| isLineBreak
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



/**
 * Token for Kotlin strings
 */
const KotlinStringLiteralToken = class KotlinStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new KotlinStringPatternIterator());
	}
};



const KotlinRawStringPatternIterator = class KotlinRawStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchStartQuote1, writable: true}
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote1(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchStartQuote2;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote2(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchStartQuote3;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote3(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote1;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote1(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote2;
		}

		return true;

	}

	_matchContentOrEndQuote2(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote3;
		}

		return true;

	}

	_matchContentOrEndQuote3(matchCharacter) {

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === '"') {
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



/**
 * Token for Kotlin strings
 */
const KotlinRawStringLiteralToken = class KotlinRawStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new KotlinRawStringPatternIterator());
	}
};



const KotlinAnnotationPatternIterator = class KotlinAnnotationPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_allowSpaceCharacter: {value: false, writable: true},
			_isSpaceCharacter: {value: isSpaceCharacterRegex}
		});
		this._matchFunction = this._matchAt;
		Object.seal(this);
	}

	_matchAt(matchCharacter) {
		if (matchCharacter === '@') {
			this._matchFunction = this._matchContent;
			this._isComplete = true; // TODO não é bem assim
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '(') {
			this._isComplete = false;
			this._allowSpaceCharacter = true;
			return true;
		}

		if (matchCharacter === ')') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === false
			) {

			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === true
			) {

			this._hasNext = false;
			return false;
		}

		if (this._matchLineBreak(matchCharacter)
			&& this._isComplete
			) {

			return this._matchEnd(matchCharacter);
		}

		if (this._matchLineBreak(matchCharacter)
			&& !this._isComplete
			) {

			this._hasNext = false;
			return false;
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



/**
 * Token for Kotlin annotations
 */
const KotlinAnnotationToken = class KotlinAnnotationToken extends SourcePatternIteratorToken {
	constructor() {
		super('annotation', new KotlinAnnotationPatternIterator());
	}
};



const KotlinLabelIterator = class KotlinLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchLetter;

	}

	_matchLetter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			this._matchFunction = this._matchWordOrAt;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchWordOrAt(matchCharacter) {

		if (matchCharacter !== null && this._isWordCharacter.test(matchCharacter)) {
			return true;
		}

		// FIXME não sei se o fix vai aqui, mas está fazendo match em this@, que não é umn label

		if (matchCharacter === '@') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		this._hasNext = false;
		return false;

	}

}



/**
 * Token for Kotlin labels
 */
const KotlinLabelToken = class KotlinLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new KotlinLabelIterator());
	}
};



// #endregion



// #region Java lexer

const JavaLexer = class JavaLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new JavaKeywordToken(),
			new JavaTypesToken(),
			new JavaPunctuationToken(),
			new JavaAnnotationToken(),

			// comments
			new CLineCommentToken(),
			new CBlockCommentToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		this._tokenPool.push(new JavaLabelToken());
		//this._tokenPool.push(new JavaSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new JavaDecimalLiteralToken(),
			new JavaNumericLiteralToken(),
			new JavaStringLiteralToken(),
			new JavaMultilineStringLiteralToken(),
			new CCharLiteralToken() // TODO this is not the full implementation...
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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




/**
 * Token for Java keywords
 */
const JavaKeywordToken = class JavaKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'abstract',
			'assert',
			'break',
			'case',
			'catch',
			'class',
			'continue',
			'default',
			'do',
			'else',
			'enum',
			'extends',
			'final',
			'finally',
			'for',
			'if',
			'implements',
			'import',
			'instanceof',
			'interface',
			'native',
			'new',
			'non-sealed',
			'package',
			'permits',
			'private',
			'protected',
			'public',
			'record',
			'return',
			'sealed',
			'static',
			'strictfp',
			'super',
			'switch',
			'synchronized',
			'this',
			'throw',
			'throws',
			'transient',
			'try',
			'var',
			// 'void', // vou realçar como tipo
			'volatile',
			'while',

			// reserved
			'const',
			'goto',

			// literals
			'true',
			'false',
			'null'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Java types
 */
const JavaTypesToken = class JavaTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'boolean',
				'byte',
				'char',
				'double',
				'float',
				'int',
				'long',
				'Object',
				'short',
				'String',
				'CharSequence',

				'Boolean',
				'Byte',
				'Character',
				'Double',
				'Float',
				'Integer',
				'Long',
				'Short',

				'BigInteger',
				'BigDecimal',

				'Class',
				'Field',
				'Exception',
				'RuntimeException',
				'void',

				'LinkedList',
				'Range',

				'Callable',
				'ClosureState',
				'Executors',
				'ExecutorService',
				'Future',
				'FutureTask',
				'Iterable',
				'Iterator',
				'Runnable',
				'StringBuilder',
				'Supplier',
				'Task',
				'Thread',

				'ExecutionException',
				'InterruptedException',

				'T',
				'U',
				'V'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			this._matchFunction = this._matchStartBracket;
			return this._matchFunction(matchCharacter);
		}

		if (this._typesSequence.hasNext()) {
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartBracket(matchCharacter, index) {

		if (matchCharacter === '[') {
			this._matchFunction = this._matchEndBracket;
			return true;
		}

		return this._matchEnd(matchCharacter, index);

	}

	_matchEndBracket(matchCharacter, index) {

		if (matchCharacter === ']') {
			this._matchFunction = this._matchStartBracket;
			return true;
		}

		return this._matchEnd(matchCharacter, index); // FIXME separar num outro token, pra reconhecer int e int[] mas não int[

	}

	/**
	 * Indica que o pattern já terminou no caractere anterior
	 */
	_matchEnd(matchCharacter, index) {
		this._complete();
		return false;
	}

};



/**
 * Token for Java punctuation
 */
const JavaPunctuationToken = class JavaPunctuationToken extends SourceSimpleCharacterSequenceToken {

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
			'&gt;&gt;&gt;', // bitwise left shift
			'&lt;&lt;', // bitwise right shift
			'+',
			'-',
			'*',
			'/',
			'%',
			'==',
			'!',
			'!=',
			'&gt;',
			'&gt;=',
			'-&gt;',
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
			'&gt;&gt;&gt;=', // bitwise left shift
			'&lt;&lt;=', // bitwise right shift

			'...',

			'System.out',
			'java.util',
			'java.util.concurrent',
			'java.util.function'

		]);

	}

};



const JavaDecimalPatternIterator = class JavaDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
		});
		this._matchFunction = this._matchNumber;
		Object.seal(this);
	}

	// pode ter l, f, d no final tanto em caixa alta quanto baixa
	// pode ter _ separando os números

	_matchNumber(matchCharacter, index) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '.' && !this._hasMantissa) {
			this._hasMantissa = true;
			this._isComplete = false;
			return true;
		}

		if (index > 0 && matchCharacter === '_') { // TODO melhorar isso
			this._isComplete = false;
			return true;
		}

		if (this._matchSuffix(matchCharacter)) {
			return true;
		}

		if (this._isComplete) {
			return this._matchEnd(matchCharacter);
		}

		this._hasNext = false;
		return false;

	}

	_matchSuffix(matchCharacter) {

		if (!this._isComplete) {
			return false;
		}

		if (matchCharacter == null) {
			return false;
		}

		let lowerMatchCharacter = matchCharacter.toLowerCase();

		if (lowerMatchCharacter == 'f'
			|| lowerMatchCharacter == 'd'
			) {

			return true;
		}

		if (this._hasMantissa) {
			return false;
		}

		if (lowerMatchCharacter == 'l') {
			return true;
		}

		return false;

	}

};



/**
 * Token for decimal numbers
 */
const JavaDecimalLiteralToken = class JavaDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new JavaDecimalPatternIterator());
	}
};



const JavaNumberPatternIterator = class JavaNumberPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
			_matchCheck: {value: null, writable: true}
		});
		this._matchFunction = this._matchFirstNumber;
		Object.seal(this);
	}

	/*
	números válidos

	binário
	tem que ter 1 número depois do b
	só 0 e 1
	0b10101110
	0B10101

	octal
	TODO

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

		if (this._isNumberCharacter.test(matchCharacter)) {
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

	// TODO reaproveitar de uma classe base comum
	_matchSuffix(matchCharacter) {

		if (!this._isComplete) {
			return false;
		}

		if (matchCharacter == null) {
			return false;
		}

		let lowerMatchCharacter = matchCharacter.toLowerCase();

		if (lowerMatchCharacter == 'f'
			|| lowerMatchCharacter == 'd'
			) {

			return true;
		}

		if (this._hasMantissa) {
			return false;
		}

		if (lowerMatchCharacter == 'l') {
			return true;
		}

		return false;

	}

	_isBinary(matchCharacter) {

		if (matchCharacter === '0' || matchCharacter === '1') {
			return true;
		}

		if (matchCharacter === '_') { // TODO ver as regras dos separators
			return true;
		}

		// TODO ver se suporta sufixo nos binários

		return false;

	}

	_isOctal(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		if (matchCharacter === '_') { // TODO ver as regras dos separators
			return true;
		}

		// TODO ver se suporta sufixo nos octais

		return false;

	}

	_isHexadecimal(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		if (matchCharacter === '_') { // TODO ver as regras dos separators
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

		if (this._matchSuffix(matchCharacter)) {
			return true;
		}

		return false;

	}

};



/**
 * Token for hexadecimal numbers
 * Binary numbers are disabled for now
 */
const JavaNumericLiteralToken = class JavaNumericLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new JavaNumberPatternIterator());
	}
};



const JavaStringPatternIterator = class JavaStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		let isLineBreak = this._matchLineBreak(matchCharacter);

		if (this._isEscaped && !isLineBreak) { // line break não é escapável em swift
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
		if (matchCharacter === '"'
			|| isLineBreak
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



/**
 * Token for Java strings
 */
const JavaStringLiteralToken = class JavaStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new JavaStringPatternIterator());
	}
};



const JavaMultilineStringPatternIterator = class JavaMultilineStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchStartQuote1, writable: true}
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

	_matchStartQuote1(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchStartQuote2;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote2(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchStartQuote3;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote3(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote1;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote1(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote2;
		}

		return true;

	}

	_matchContentOrEndQuote2(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote3;
		}

		return true;

	}

	_matchContentOrEndQuote3(matchCharacter) {

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === '"') {
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



/**
 * Token for Java strings
 */
const JavaMultilineStringLiteralToken = class JavaMultilineStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new JavaMultilineStringPatternIterator());
	}
};



const JavaAnnotationPatternIterator = class JavaAnnotationPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_allowSpaceCharacter: {value: false, writable: true},
			_isSpaceCharacter: {value: isSpaceCharacterRegex}
		});
		this._matchFunction = this._matchAt;
		Object.seal(this);
	}

	_matchAt(matchCharacter) {
		if (matchCharacter === '@') {
			this._matchFunction = this._matchContent;
			this._isComplete = true; // TODO não é bem assim
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '(') {
			this._isComplete = false;
			this._allowSpaceCharacter = true;
			return true;
		}

		if (matchCharacter === ')') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === false
			) {

			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === true
			) {

			this._hasNext = false;
			return false;
		}

		if (this._matchLineBreak(matchCharacter)
			&& this._isComplete
			) {

			return this._matchEnd(matchCharacter);
		}

		if (this._matchLineBreak(matchCharacter)
			&& !this._isComplete
			) {

			this._hasNext = false;
			return false;
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



/**
 * Token for Java annotations
 */
const JavaAnnotationToken = class JavaAnnotationToken extends SourcePatternIteratorToken {
	constructor() {
		super('annotation', new JavaAnnotationPatternIterator());
	}
};



const JavaLabelIterator = class JavaLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
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

};



/**
 * Token for Java labels
 */
const JavaLabelToken = class JavaLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new JavaLabelIterator());
	}
};



// #endregion



// #region C# lexer

const CsLexer = class CsLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		// FIXME tipos são esperados depois das palavras-chave new, is, as
		// e na assinatura das funções

		let mustBeType = false;

		if (tokenSequence) {
			let lastToken = this._getLastToken(tokenSequence);
			mustBeType = this._getMustBeType(lastToken);
		}

		// FIXME alterar o type token pra reconhecer tipos que não estão na lista
		/*if (mustBeType) {

			this._tokenPool.splice(
				0,
				this._tokenPool.length,
				new CSTypesToken()
			);

			return;

		}*/

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new CSKeywordToken(),
			new CSTypesToken(),
			new CSPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new CBlockCommentToken(),

			new CDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// TODO melhorar isso, se não a cada token vai fazer um loop pra verificar se é o primeiro da linha
		/*if (this._isFirstTokenOfLine(tokenSequence)) {
			this._tokenPool.push(new CSLabelToken());
		}*/
		this._tokenPool.push(new CSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new CSDecimalLiteralToken(),
			new CSNumericLiteralToken(),
			new CSStringLiteralToken(),
			new CSVerbatimStringLiteralToken(),
			new CSInterpolatedStringLiteralToken(),
			new CSAttributeToken(),
			new CCharLiteralToken() // TODO this is not the full implementation...
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

	_getMustBeType(lastToken) {

		if (lastToken
			&& lastToken.type === 'keyword'
			) {

			let keyword = lastToken.characterSequence.join('');

			if (keyword === 'as'
				|| keyword === 'is'
				|| keyword === 'new'
				) {

				return true;
			}

		}

		return false;

	}

	/**
	 * Checks if the line has only whitespace so far
	 * Used to identify labels
	 * @param tokenSequence Sequence of tokens parsed so far by the lexer
	 */
	_isFirstTokenOfLine(tokenSequence) {

		let lastToken = null;

		if (!tokenSequence) {
			return true;
		}

		for (let i = tokenSequence.length; i > 0; i--) {

			lastToken = tokenSequence[i - 1];

			if (lastToken.type === 'endOfLine') {
				return true;
			}

			if (lastToken.ignore) {
				continue;
			}

			return false;

		}

		return true;

	}

};



const CSKeywordToken = class CSKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'abstract',
			'add',
			'alias',
			'as',
			'async',
			'await',
			'base',
			'break',
			'case',
			'catch',
			'checked',
			'class',
			'const',
			'continue',
			'default',
			'delegate',
			'do',
			'dynamic',
			'else',
			'enum',
			'event',
			'explicit',
			'extern',
			'finally',
			'fixed',
			'for',
			'foreach',
			'get',
			'goto',
			'if',
			'implicit',
			'in', // FIXME está interferindo no tipo int, pq?
			'init',
			'interface',
			'internal',
			'is',
			'lock',
			'namespace',
			'new',
			'operator',
			'out',
			'override',
			'params',
			'partial',
			'private',
			'protected',
			'public',
			'readonly',
			'record',
			'ref',
			'remove',
			'return',
			'sealed',
			'set',
			'sizeof',
			'stackalloc',
			'static',
			'struct',
			'switch',
			'this',
			'throw',
			'try',
			'typeof',
			'unchecked',
			'unsafe',
			'using', // TODO ver se isso aqui não é melhor separar num token diferente
			'value',
			'var',
			'virtual',
			// 'void', // vou realçar como tipo
			'volatile',
			'while',
			'with',
			'yield',

			// linq TODO talvez mudar pra um token separado
			'ascending',
			'by',
			'descending',
			'from',
			'into',
			'group',
			'join',
			'let',
			'orderby',
			'select',
			'where',

			// literals
			'true',
			'false',
			'null'

		]);

		Object.seal(this);

	}

};



const CSTypesToken = class CSTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'bool',
				'byte',
				'decimal',
				'double',
				'float',
				'int',
				'nint',
				'long',
				'object',

				'sbyte',
				'short',
				'string',
				'ushort',
				'uint',
				'nuint',
				'ulong',
				'void',

				'Boolean',
				'Byte',
				'Decimal',
				'Double',
				'Single',
				'Int32',
				'Int64',
				'Object',

				'SByte',
				'Int16',
				'String',
				'UInt16',
				'UInt32',
				'UInt64',

				'BigInteger',
				'Complex',

				'Action',
				'Exception',
				'Func',
				'IEnumerable',
				'IEnumerator',
				'IObservable',
				'IObserver',
				'IDisposable',
				'StringBuilder',
				'Task',
				'Thread',
				'Console',

				'Attribute',
				'Queue',
				'List',
				'EventArgs',

				'T',
				'U',
				'V'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			this._matchFunction = this._matchTypeOperator;
			return this._matchFunction(matchCharacter);
		}

		if (this._typesSequence.hasNext()) {
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchTypeOperator(matchCharacter, index) {

		if (matchCharacter === '?') {
			this._matchFunction = this._matchEnd;
			return true;
		} else if (matchCharacter === '*') {
			return true;
		} else if (matchCharacter === '[') {
			this._matchFunction = this._matchCommaOrEndBracket;
			return true;
		}

		return this._matchEnd(matchCharacter, index);

	}

	_matchCommaOrEndBracket(matchCharacter, index) {

		if (matchCharacter === ']') {
			this._matchFunction = this._matchTypeOperator;
			return true;
		}

		if (matchCharacter === ',') {
			//
			return true;
		}

		return this._matchEnd(matchCharacter, index);// FIXME separar num outro token, pra reconhecer int e int[] mas não int[

	}

	/**
	 * Indica que o pattern já terminou no caractere anterior
	 */
	_matchEnd(matchCharacter, index) {
		this._complete();
		return false;
	}

};



const CSPunctuationToken = class CSPunctuationToken extends SourceSimpleCharacterSequenceToken {

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
			'??',
			':',
			'::',
			';',

			'&amp;&amp;',
			'||',
			'&amp;', // bitwise and
			'|', // bitwise or
			'^', // bitwise xor
			'~', // bitwise not
			'&gt;&gt;', // bitwise left shift
			'&lt;&lt;', // bitwise right shift
			'+',
			'-',
			'*',
			'/',
			'%',
			'==',
			'!',
			'!=',
			'&gt;',
			'&gt;=',
			'=&gt;',
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

			'System',
			'System.Collections',
			'System.Collections.Generic',
			'System.Threading.Tasks'

		]);

	}

};



const CSDecimalPatternIterator = class CSDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
		});
		this._matchFunction = this._matchNumber;
		Object.seal(this);
	}

	// pode ter u, l, ul, lu, f, d, m no final tanto em caixa alta quanto baixa
	// pode ter _ separando os números

	_matchNumber(matchCharacter, index) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '.' && !this._hasMantissa) {
			this._hasMantissa = true;
			this._isComplete = false;
			return true;
		}

		if (index > 0 && matchCharacter === '_') { // TODO melhorar isso
			this._isComplete = false;
			return true;
		}

		if (this._matchSuffix(matchCharacter)) {
			return true;
		}

		if (this._isComplete) {
			return this._matchEnd(matchCharacter);
		}

		this._hasNext = false;
		return false;

	}

	_matchSuffix(matchCharacter) {

		if (!this._isComplete) {
			return false;
		}

		if (matchCharacter == null) {
			return false;
		}

		let lowerMatchCharacter = matchCharacter.toLowerCase();

		if (lowerMatchCharacter == 'f'
			|| lowerMatchCharacter == 'd'
			|| lowerMatchCharacter == 'm' // TODO confirmar m
			) {

			return true;
		}

		if (this._hasMantissa) {
			return false;
		}

		if (lowerMatchCharacter == 'u'
			|| lowerMatchCharacter == 'l'
			) {

			return true;
		}

		return false;

	}

};



const CSDecimalLiteralToken = class CSDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new CSDecimalPatternIterator());
	}
};



const CSNumberPatternIterator = class CSNumberPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
			_matchCheck: {value: null, writable: true}
		});
		this._matchFunction = this._matchFirstNumber;
		Object.seal(this);
	}

	/*
	números válidos

	binário
	tem que ter 1 número depois do b
	só 0 e 1
	0b10101110
	0B10101

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

	// TODO reaproveitar de uma classe base comum
	_matchSuffix(matchCharacter) {

		if (!this._isComplete) {
			return false;
		}

		if (matchCharacter == null) {
			return false;
		}

		let lowerMatchCharacter = matchCharacter.toLowerCase();

		if (lowerMatchCharacter == 'f'
			|| lowerMatchCharacter == 'd'
			|| lowerMatchCharacter == 'm' // TODO confirmar m
			) {

			return true;
		}

		if (this._hasMantissa) {
			return false;
		}

		if (lowerMatchCharacter == 'u'
			|| lowerMatchCharacter == 'l'
			) {

			return true;
		}

		return false;

	}

	_isBinary(matchCharacter) {

		if (matchCharacter === '0' || matchCharacter === '1') {
			return true;
		}

		if (matchCharacter === '_') { // TODO ver as regras dos separators
			return true;
		}

		// TODO ver se suporta sufixo nos binários

		return false;

	}

	_isHexadecimal(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		if (matchCharacter === '_') { // TODO ver as regras dos separators
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

		if (this._matchSuffix(matchCharacter)) {
			return true;
		}

		return false;

	}

};



const CSNumericLiteralToken = class CSNumericLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new CSNumberPatternIterator());
	}
};



const CSStringPatternIterator = class CSStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		let isLineBreak = this._matchLineBreak(matchCharacter);

		if (this._isEscaped && !isLineBreak) { // line break não é escapável em c#
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
		if (matchCharacter === '"'
			|| isLineBreak
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



const CSStringLiteralToken = class CSStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new CSStringPatternIterator());
	}
};



const CSVerbatimStringPatternIterator = class CSVerbatimStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchAt, writable: true},
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

	_matchAt(matchCharacter) {

		if (matchCharacter === '@') {
			this._matchFunction = this._matchStartQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		if (matchCharacter === '"') {

			if (this._isEscaped) {
				this._isEscaped = false;
			} else {
				this._isEscaped = true;
			}

			return true;

		}

		// se aspas não foi seguido de outras aspas
		// termina a string imediatamente
		if (this._isEscaped) {
			return this._matchEnd(matchCharacter);
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



const CSVerbatimStringLiteralToken = class CSVerbatimStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('vstring', new CSVerbatimStringPatternIterator());
	}
};



const CSInterpolatedStringPatternIterator = class CSInterpolatedStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchCurrency, writable: true},
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

	_matchCurrency(matchCharacter) {

		if (matchCharacter === '$') {
			this._matchFunction = this._matchStartQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		let isLineBreak = this._matchLineBreak(matchCharacter);

		if (this._isEscaped && !isLineBreak) { // line break não é escapável em c#
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
		if (matchCharacter === '"'
			|| isLineBreak
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



const CSInterpolatedStringLiteralToken = class CSInterpolatedStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('istring', new CSInterpolatedStringPatternIterator());
	}
};



const CSAttributePatternIterator = class CSAttributePatternIterator extends SourcePatternIterator {

	constructor() {
		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isSpaceCharacter: {value: isSpaceCharacterRegex},
			_bracesNestingLevel: {value: 0, writable: true}
		});

		this._matchFunction = this._matchStartBracket;
		Object.seal(this);
	}

	_matchStartBracket(matchCharacter) {
		if (matchCharacter === '[') {
			this._matchFunction = this._matchAttributeNameBeginningOrStartBrace;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchAttributeNameBeginningOrStartBrace(matchCharacter) {

		// TODO talvez testar com regex se é uma letra ou identificador válido
		// não sei quais as regras para nomear atributos
		if (matchCharacter === ')'
			|| matchCharacter === ']'
			) {

			this._hasNext = false;
			return false;
		}

		if (matchCharacter === '(') { // TODO tem que ter um nome antes do ( ??
			this._bracesNestingLevel++;
			this._matchFunction = this._matchContentOrBrace;
			return true;
		}

		if (!this._isLetterCharacter.test(matchCharacter)
			&& !this._isSpaceCharacter.test(matchCharacter)
			) {

			this._hasNext = false;
			return false;
		}

		this._matchFunction = this._matchAttributeNameOrStartBrace;
		return true;

	}

	_matchAttributeNameOrStartBrace(matchCharacter) {

		// TODO talvez testar com regex se é uma letra ou identificador válido
		// não sei quais as regras para nomear atributos
		if (matchCharacter === ')') {
			this._hasNext = false;
			return false;
		}

		if (matchCharacter === '(') { // TODO tem que ter um nome antes do ( ??
			this._bracesNestingLevel++;
			this._matchFunction = this._matchContentOrBrace;
			return true;
		}

		if (matchCharacter === ']') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		if (!this._isLetterCharacter.test(matchCharacter)
			&& !this._isSpaceCharacter.test(matchCharacter)
			) {

			this._hasNext = false;
			return false;
		}

		return true;

	}

	_matchEndQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrBrace;
		}

		return true;

	}

	_matchContentOrBrace(matchCharacter) {

		if (matchCharacter === ']') {
			this._hasNext = false;
			return false;
		}

		if (matchCharacter === '(') {
			this._bracesNestingLevel++;
			return true;
		}

		if (matchCharacter === ')') { // TODO tem que ter um argumento antes do ) ??
			this._bracesNestingLevel--;
			if (this._bracesNestingLevel === 0) {
				this._matchFunction = this._matchEndBracket;
			}
			return true;
		}

		if (matchCharacter === '"') {
			this._matchFunction = this._matchEndQuote;
			return true;
		}

		// FIXME Melhorar isso
		// se tiver strings dentro do atributo, tenho que seguir as regras delas
		// ou então no lexer, só permito atributos depois de operadores
		if (matchCharacter !== '='
			&& matchCharacter !== '.'
			&& matchCharacter !== ','
			&& matchCharacter !== '"'
			&& matchCharacter !== '@'
			&& !this._isLetterCharacter.test(matchCharacter)
			&& !this._isSpaceCharacter.test(matchCharacter)
			) {

			this._hasNext = false;
			return false;
		}

		return true;

	}

	_matchEndBracket(matchCharacter) {
		if (matchCharacter === ']') {
			this._matchFunction = this._matchEnd;
			return true;
		}
		this._hasNext = false;
		return false;
	}

};



const CSAttributeToken = class CSAttributeToken extends SourcePatternIteratorToken {
	constructor() {
		super('attribute', new CSAttributePatternIterator());
	}
};



const CSLabelIterator = class CSLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
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

};



const CSLabelToken = class CSLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new CSLabelIterator());
	}
};



const CSSymbolToken = class CSSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new CSSymbolIterator());
	}
};



const CSSymbolIterator = class CSSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchBeginningValidCharacter;

	}

	_matchBeginningValidCharacter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			this._matchFunction = this._matchValidCharacter;
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '_'
			|| matchCharacter === '@'
			) {

			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
			//|| matchCharacter === '@' // confirmar isso
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

};



// #endregion



// #region JavaScript lexer

/**
 * Tokenizes JavaScript source code
 */
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
			new TypeScriptDecoratorToken(), // TODO
			new JSPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new CBlockCommentToken()

		);

		if (canBeLiteral) {
			this._pushLiteralTokens();
		}

		this._pushInvisibleTokens();

		// this._tokenPool.push(new JSLabelToken()); // Disabled until I have better rules for object properties
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
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
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



/**
 * Token for decimal numbers
 */
const JSDecimalLiteralToken = class JSDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new JSDecimalPatternIterator());
	}
};



/**
 * Token for binary, octal and hexadecimal numbers
 */
const JSNumericLiteralToken = class JSNumericLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new JSNumberPatternIterator());
	}
};



const JSRegexLiteralToken = class JSRegexLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('regex', new JSRegExpPatternIterator());
	}
};



/**
 * Token for strings
 */
const JSStringLiteralToken = class JSStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new JSStringPatternIterator());
	}
};



/**
 * Token for JavaScript labels
 */
const JSLabelToken = class JSLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new JSLabelIterator());
	}
};



/**
 * Token for symbols
 */
const JSSymbolToken = class JSSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new JSSymbolIterator());
	}
};



/**
 * Token for keywords
 */
const JSKeywordToken = class JSKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [
			'async',
			'await',
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



/**
 * Token for JavaScript types
 */
const JSTypesToken = class JSTypesToken extends SourceSimpleCharacterSequenceToken {

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
			'SharedWorker',
			'Set',
			'String',
			'Symbol',
			'SyntaxError',
			'TypeError',
			'URIError',
			'WeakMap',
			'WeakSet',
			'Worker',
			'XMLHttpRequest',

			// TyeScript TODO
			'any',
			'bigint',
			'boolean',
			'never',
			'number',
			'object',
			'string',
			'unknown',
			'void',

			// objetos conhecidos
			'document',
			'window'

		]);

		Object.seal(this);

	}

};



/**
 * Token for JavaScript punctuation
 */
const JSPunctuationToken = class JSPunctuationToken extends SourceSimpleCharacterSequenceToken {

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
			'=&gt;', // arrow function
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

			'&lt;&gt;', // TODO this is for jsx actually
			'&lt;/', // TODO this is for jsx actually
			'/&gt;', // TODO this is for jsx actually
			'&gt;&lt;', // TODO this is for jsx actually

			'...' // rest e spread
		]);

	}

};




const JSDecimalPatternIterator = class JSDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
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



const JSNumberPatternIterator = class JSNumberPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
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

		if (matchCharacter === '_') { // TODO melhorar isso
			return true;
		}

		return false;
	}

	_isOctal(matchCharacter) {

		// FIXME transformar matchCharacter em número
		if (this._isNumberCharacter.test(matchCharacter) && matchCharacter > -1 && matchCharacter < 8) {
			return true;
		}

		if (matchCharacter === '_') { // TODO melhorar isso
			return true;
		}

		return false;
	}

	_isHexadecimal(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		if (matchCharacter === '_') { // TODO melhorar isso
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



const JSRegExpPatternIterator = class JSRegExpPatternIterator extends SourcePatternIterator {

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

		//let flag = '';

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

		let isLineBreak = this._matchLineBreak(matchCharacter);

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === this._quoteType
			|| (isLineBreak && this._quoteType !== '`')
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



const JSLabelIterator = class JSLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
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

};



/**
 * Token for TypeScript decorators
 */
const TypeScriptDecoratorToken = class TypeScriptDecoratorToken extends SourcePatternIteratorToken {
	constructor() {
		super('decorator', new TypeScriptDecoratorPatternIterator());
	}
};



const TypeScriptDecoratorPatternIterator = class TypeScriptDecoratorPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_allowSpaceCharacter: {value: false, writable: true},
			_isSpaceCharacter: {value: isSpaceCharacterRegex}
		});
		this._matchFunction = this._matchAt;
		Object.seal(this);
	}

	_matchAt(matchCharacter) {
		if (matchCharacter === '@') {
			this._matchFunction = this._matchContent;
			this._isComplete = true; // TODO não é bem assim
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '(') {
			this._isComplete = false;
			this._allowSpaceCharacter = true;
			return true;
		}

		if (matchCharacter === ')') {
			this._allowSpaceCharacter = false;
			this._matchFunction = this._matchEnd;
			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === false
			) {

			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === true
			) {

			this._hasNext = false;
			return false;
		}

		if (this._matchLineBreak(matchCharacter)
			&& this._isComplete
			) {

			return this._matchEnd(matchCharacter);
		}

		if (this._matchLineBreak(matchCharacter)
			&& !this._isComplete
			) {

			this._hasNext = false;
			return false;
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



const JSSymbolIterator = class JSSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex}
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

};

// #endregion



// #region Dart lexer

const DartLexer = class DartLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		// FIXME tipos são esperados depois das palavras-chave new, is, as
		// e na assinatura das funções

		let mustBeType = false;

		if (tokenSequence) {
			let lastToken = this._getLastToken(tokenSequence);
			mustBeType = this._getMustBeType(lastToken);
		}

		// FIXME alterar o type token pra reconhecer tipos que não estão na lista
		/*if (mustBeType) {

			this._tokenPool.splice(
				0,
				this._tokenPool.length,
				new CSTypesToken()
			);

			return;

		}*/

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new DartKeywordToken(),
			new DartTypesToken(),
			new DartPunctuationToken(),
			new DartAnnotationToken(),

			// comments
			new CLineCommentToken(),
			new NestedBlockCommentToken(),

			new CDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// TODO melhorar isso, se não a cada token vai fazer um loop pra verificar se é o primeiro da linha
		/*if (this._isFirstTokenOfLine(tokenSequence)) {
			this._tokenPool.push(new DartLabelToken());
		}*/
		this._tokenPool.push(new DartSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			/*new DartDecimalLiteralToken(),
			new DartNumericLiteralToken(),*/
			new TempDecimalLiteralToken(),
			new DartStringLiteralToken()/*,
			new DartVerbatimStringLiteralToken(),
			new DartInterpolatedStringLiteralToken(),
			new DartAttributeToken(),
			new CCharLiteralToken() // TODO this is not the full implementation...
			*/
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

	_getMustBeType(lastToken) {

		if (lastToken
			&& lastToken.type === 'keyword'
			) {

			let keyword = lastToken.characterSequence.join('');

			if (keyword === 'as'
				|| keyword === 'is'
				|| keyword === 'new'
				) {

				return true;
			}

		}

		return false;

	}

	/**
	 * Checks if the line has only whitespace so far
	 * Used to identify labels
	 * @param tokenSequence Sequence of tokens parsed so far by the lexer
	 */
	_isFirstTokenOfLine(tokenSequence) {

		let lastToken = null;

		if (!tokenSequence) {
			return true;
		}

		for (let i = tokenSequence.length; i > 0; i--) {

			lastToken = tokenSequence[i - 1];

			if (lastToken.type === 'endOfLine') {
				return true;
			}

			if (lastToken.ignore) {
				continue;
			}

			return false;

		}

		return true;

	}

};



const DartKeywordToken = class DartKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'abstract',
			'as',
			'assert',
			'async',
			'async*',
			'await',
			'await*',
			'break',
			'case',
			'catch',
			'class',
			'const',
			'continue',
			'default',
			'deferred',
			'do',
			'dynamic',
			'else',
			'enum',
			'export',
			'extends',
			'extension',
			'factory',
			'final',
			'finally',
			'for',
			'get',
			'hide',
			'if',
			'implements',
			'import',
			'in',
			'is',
			'is!',
			'late',
			// 'library', // TODO check
			'mixin',
			'new',
			'on',
			'operator',
			'part',
			'required',
			'rethrow',
			'return',
			'set',
			'show',
			'static',
			'super',
			'switch',
			'this',
			'throw',
			'try',
			'typedef',
			'var',
			'while',
			'with',
			'yield',
			'yield*',

			// literals
			// TODO put in a separate token
			'null',
			'true',
			'false'

		]);

		Object.seal(this);

	}

};



const DartTypesToken = class DartTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'bool',
				'double',
				'int',
				'void',

				// c ffi
				'DynamicLibrary',
				'Int32',

				'Exception',
				'Function',
				'NativeFunction',
				'Future',
				'Iterable',
				'List', // List<Type>
				'Map', // Map<KeyType, ValueType>
				'Never',
				'Object',
				'Set', // <Type>{}
				'Stream',
				'String',
				'Symbol',

				'MaterialApp',
				'ThemeData',
				'Colors',
				'Widget',
				'StatelessWidget',
				'StatefulWidget',
				'Key',
				'BuildContext',
				'WidgetBuilder',
				'FutureBuilder',
				'ListView',
				'Text'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			this._matchFunction = this._matchTypeOperator;
			return this._matchFunction(matchCharacter);
		}

		if (this._typesSequence.hasNext()) {
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchTypeOperator(matchCharacter, index) {

		if (matchCharacter === '?') {
			this._matchFunction = this._matchEnd;
			return true;
		} else if (matchCharacter === '*') {
			return true;
		} else if (matchCharacter === '[') {
			this._matchFunction = this._matchCommaOrEndBracket;
			return true;
		}

		return this._matchEnd(matchCharacter, index);

	}

	_matchCommaOrEndBracket(matchCharacter, index) {

		if (matchCharacter === ']') {
			this._matchFunction = this._matchTypeOperator;
			return true;
		}

		if (matchCharacter === ',') {
			//
			return true;
		}

		return this._matchEnd(matchCharacter, index);// FIXME separar num outro token, pra reconhecer int e int[] mas não int[

	}

	/**
	 * Indica que o pattern já terminou no caractere anterior
	 */
	_matchEnd(matchCharacter, index) {
		this._complete();
		return false;
	}

};



const DartPunctuationToken = class DartPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [

			'.',
			':',
			'..',
			'?..',
			'...',
			'?.',
			'?',
			',',
			';',
			'=',
			'==',
			'*=',
			'/=',
			'~/=',
			'%=',
			'+=',
			'-=',
			'&=',
			'|=',
			'&amp;=',
			'^=',
			'>>=',
			'<<=',
			'!',
			'!=',
			'=>',
			'=&gt;',
			'<',
			'&lt;',
			'>',
			'&gt;',
			'<=',
			'&lt;=',
			'<<',
			'>>',
			'>>>',
			'&lt;&lt;',
			'&gt;&gt;',
			'&gt;&gt;&gt;',
			'&&',
			'&amp;&amp;',
			'||',
			'??',
			'&',
			'&amp;',
			'^',
			'|',
			'++',
			'--',
			'+',
			'-',
			'*',
			'/',
			'~/',
			'~',
			'%',
			'(',
			')',
			'[',
			']',
			'{',
			'}'

		]);

	}

};



// TODO
const DartStringPatternIterator = class DartStringPatternIterator {

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

		let isLineBreak = this._matchLineBreak(matchCharacter);

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === this._quoteType
			|| (isLineBreak && this._quoteType !== '`')
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



const DartStringLiteralToken = class DartStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new DartStringPatternIterator());
	}
};



const DartSymbolToken = class DartSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new DartSymbolIterator());
	}
};



const DartSymbolIterator = class DartSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchBeginningValidCharacter;

	}

	_matchBeginningValidCharacter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			this._matchFunction = this._matchValidCharacter;
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '_'
			|| matchCharacter === '@'
			) {

			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
			//|| matchCharacter === '@' // confirmar isso
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

};



const DartAnnotationPatternIterator = class DartAnnotationPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_allowSpaceCharacter: {value: false, writable: true},
			_isSpaceCharacter: {value: isSpaceCharacterRegex}
		});
		this._matchFunction = this._matchAt;
		Object.seal(this);
	}

	_matchAt(matchCharacter) {
		if (matchCharacter === '@') {
			this._matchFunction = this._matchContent;
			this._isComplete = true; // TODO não é bem assim
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '(') {
			this._isComplete = false;
			this._allowSpaceCharacter = true;
			return true;
		}

		if (matchCharacter === ')') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === false
			) {

			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === true
			) {

			this._hasNext = false;
			return false;
		}

		if (this._matchLineBreak(matchCharacter)
			&& this._isComplete
			) {

			return this._matchEnd(matchCharacter);
		}

		if (this._matchLineBreak(matchCharacter)
			&& !this._isComplete
			) {

			this._hasNext = false;
			return false;
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



/**
 * Token for Dart annotations
 */
const DartAnnotationToken = class DartAnnotationToken extends SourcePatternIteratorToken {
	constructor() {
		super('annotation', new DartAnnotationPatternIterator());
	}
};



// #endregion



// #region Python lexer

const PythonLexer = class PythonLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new PythonKeywordToken(),
			new PythonTypesToken(),
			new PythonPunctuationToken(),
			new PythonDecoratorToken(),

			// comments
			new PythonLineCommentToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();
		//this._tokenPool.push(new PythonSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new TempDecimalLiteralToken(),
			new PythonStringLiteralToken(),
			new PythonMultilineStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

};



/**
 * Token for Python keywords
 */
const PythonKeywordToken = class PythonKeywordToken  extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [
			'__await__',
			'__bool__',
			'__bytes__',
			'__call__',
			'__class_sel__',
			'__contains__',
			'__del__',
			'__delitem__',
			'__enter__',
			'__exit__',
			'__format__',
			'__get__',
			'__getitem__',
			'__hash__',
			'__init__',
			'__item__',
			'__len__',
			'__missing__',
			'__new__',
			'__prepare__',
			'__repr__',
			'__reversed__',
			'__set__',
			'__setitem__',
			'__slots__',
			'__str__',

			'__lt__',
			'__le__',
			'__eq__',
			'__ne__',
			'__gt__',
			'__ge__',

			'__add__',
			'__sub__',
			'__mul__',
			'__matmul__',
			'__truediv__',
			'__floordiv__',
			'__mod__',
			'__divmod__',
			'__pow__',
			'__lshift__',
			'__rshift__',
			'__and__',
			'__xor__',
			'__or__',

			'__radd__',
			'__rsub__',
			'__rmul__',
			'__rmatmul__',
			'__rtruediv__',
			'__rfloordiv__',
			'__rmod__',
			'__rdivmod__',
			'__rpow__',
			'__rlshift__',
			'__rrshift__',
			'__rand__',
			'__rxor__',
			'__ror__',

			'__iadd__',
			'__isub__',
			'__imul__',
			'__imatmul__',
			'__itruediv__',
			'__ifloordiv__',
			'__imod__',
			'__ipow__',
			'__ilshift__',
			'__irshift__',
			'__iand__',
			'__ixor__',
			'__ior__',

			'__neg__',
			'__pos__',
			'__abs__',
			'__invert__',

			'__complex__',
			'__int__',
			'__float__',

			'__index__',

			'__round__',
			'__trunc__',
			'__floor__',
			'__ceil__',

			'as',
			'async',
			'await',
			'break',
			'class',
			'continue',
			'def',
			'elif',
			'else',
			'except',
			'finally',
			'for',
			'from',
			'if',
			'import',
			'in',
			'is',
			'lambda',
			'None',
			'pass',
			'raise',
			'return',
			'self',
			'True',
			'try',
			'False',
			'while',
			'with',
			'yield'
		]);

		Object.seal(this);

	}

};



/**
 * Token for Python types
 * TODO check arrays and pointers and other possible combining characters
 */
const PythonTypesToken = class PythonTypesToken  extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('type', [

			'Exception',
			'int'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Python punctuation
 */
const PythonPunctuationToken = class PythonPunctuationToken  extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('operator', [

			'.',
			',',
			':',
			'+',
			'-',
			'*',
			'=',
			'&lt;',
			'&gt;',
			'(',
			')',
			'[',
			']',
			'{',
			'}',
			'and',
			'or',
			'not'

		]);

		Object.seal(this);

	}

};



const PythonLineCommentToken = class PythonLineCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment lineComment', new PythonLineCommentPatternIterator());
	}
};



const PythonLineCommentPatternIterator = class PythonLineCommentPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		this._matchFunction = this._matchHash;
		Object.seal(this);
	}

	_matchHash(matchCharacter) {
		if (matchCharacter === '#') {
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



const PythonStringPatternIterator = class PythonStringPatternIterator {

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
			|| matchCharacter === '"') {

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

		let isLineBreak = this._matchLineBreak(matchCharacter);

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === this._quoteType
			|| isLineBreak
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



/**
 * Token for Python strings
 */
const PythonStringLiteralToken = class PythonStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new PythonStringPatternIterator());
	}
};



const PythonMultilineStringPatternIterator = class PythonMultilineStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_quoteType: {value: null, writable: true},
			_matchFunction: {value: context._matchStartQuote1, writable: true}
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

	_matchStartQuote1(matchCharacter) {

		if (matchCharacter === "'"
			|| matchCharacter === '"') {

			this._quoteType = matchCharacter;
			this._matchFunction = this._matchStartQuote2;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote2(matchCharacter) {

		if (matchCharacter === this._quoteType) {
			this._matchFunction = this._matchStartQuote3;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchStartQuote3(matchCharacter) {

		if (matchCharacter === this._quoteType) {
			this._matchFunction = this._matchContentOrEndQuote1;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote1(matchCharacter) {

		if (matchCharacter === this._quoteType) {
			this._matchFunction = this._matchContentOrEndQuote2;
		}

		return true;

	}

	_matchContentOrEndQuote2(matchCharacter) {

		if (matchCharacter === this._quoteType) {
			this._matchFunction = this._matchContentOrEndQuote3;
		}

		return true;

	}

	_matchContentOrEndQuote3(matchCharacter) {

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



/**
 * Token for Python strings
 */
const PythonMultilineStringLiteralToken = class PythonMultilineStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new PythonMultilineStringPatternIterator());
	}
};



/**
 * Token for Python decorators
 */
const PythonDecoratorToken = class PythonDecoratorToken extends SourcePatternIteratorToken {
	constructor() {
		super('decorator', new PythonDecoratorPatternIterator());
	}
};



const PythonDecoratorPatternIterator = class PythonDecoratorPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_allowSpaceCharacter: {value: false, writable: true},
			_isSpaceCharacter: {value: isSpaceCharacterRegex}
		});
		this._matchFunction = this._matchAt;
		Object.seal(this);
	}

	_matchAt(matchCharacter) {
		if (matchCharacter === '@') {
			this._matchFunction = this._matchContent;
			this._isComplete = true; // TODO não é bem assim
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '(') {
			this._isComplete = false;
			this._allowSpaceCharacter = true;
			return true;
		}

		if (matchCharacter === ')') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === false
			) {

			return true;
		}

		if (!this._allowSpaceCharacter
			&& this._isSpaceCharacter.test(matchCharacter) === true
			) {

			this._hasNext = false;
			return false;
		}

		if (this._matchLineBreak(matchCharacter)
			&& this._isComplete
			) {

			return this._matchEnd(matchCharacter);
		}

		if (this._matchLineBreak(matchCharacter)
			&& !this._isComplete
			) {

			this._hasNext = false;
			return false;
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



// #endregion



// #region PHP lexer

/**
 * Tokenizes PHP source code
 */
 const PhpLexer = class PhpLexer extends Lexer {

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
			new PhpKeywordToken(),
			new PhpTypesToken(),
			new PhpPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new PythonLineCommentToken(),
			new CBlockCommentToken()

		);

		if (canBeLiteral) {
			this._pushLiteralTokens();
		}

		this._pushInvisibleTokens();

		// this._tokenPool.push(new PhpLabelToken()); // Disabled until I have better rules for object properties
		this._tokenPool.push(new PhpSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new PhpDecimalLiteralToken(),
			new PhpStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

	_getCanBeLiteral(lastToken) {

		if (lastToken
			&& (
				lastToken.type === 'number'
				|| lastToken.type === 'string'
				|| lastToken.type === 'symbol'
				)
			) {

			return false;
		}

		return true;

	}

};



/**
 * Token for decimal numbers
 */
const PhpDecimalLiteralToken = class PhpDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new PhpDecimalPatternIterator());
	}
};



/**
 * Token for strings
 */
const PhpStringLiteralToken = class PhpStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new PhpStringPatternIterator());
	}
};



/**
 * Token for symbols
 */
const PhpSymbolToken = class PhpSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new PhpSymbolIterator());
	}
};



/**
 * Token for keywords
 */
const PhpKeywordToken = class PhpKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('keyword', [
			'echo',
			'function',
			'return'
		]);

		Object.seal(this);

	}

};



/**
 * Token for PHP types
 */
const PhpTypesToken = class PhpTypesToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('type', [
			'int'
		]);

		Object.seal(this);

	}

};



/**
 * Token for PHP punctuation
 */
const PhpPunctuationToken = class PhpPunctuationToken extends SourceSimpleCharacterSequenceToken {

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
			':',
			';',

			'&amp;&amp;',
			'||',
			'+',
			'++',
			'-',
			'--',
			'*',
			'/',
			'%',
			'==',
			// '===',
			'!',
			'!=',
			// '!==',
			'&gt;',
			'&gt;=',
			'&lt;',
			'&lt;=',

			'=',
			'+=',
			'-=',
			'*=',
			'/=',
			'%='

		]);

	}

};




const PhpDecimalPatternIterator = class PhpDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
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



const PhpStringPatternIterator = class PhpStringPatternIterator {

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
			|| matchCharacter === '"' // TODO futuramente reimplementar isso com this.openType e this.closeType e as expressões
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

		let isLineBreak = this._matchLineBreak(matchCharacter);

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === this._quoteType
			|| (isLineBreak && this._quoteType !== '`')
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



const PhpSymbolIterator = class PhpSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex}
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

};

// #endregion



// #region ActionScript lexer

/**
 * Tokenizes ActionScript source code
 */
 const ActionScriptLexer = class ActionScriptLexer extends Lexer {

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
			new ASKeywordToken(),
			new ASTypesToken(),
			new ASPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new CBlockCommentToken()

		);

		if (canBeLiteral) {
			this._pushLiteralTokens();
		}

		this._pushInvisibleTokens();

		// this._tokenPool.push(new ASLabelToken()); // Disabled until I have better rules for object properties
		this._tokenPool.push(new ASSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new ASDecimalLiteralToken(),
			// new ASRegexLiteralToken(),
			new ASStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

	_getCanBeLiteral(lastToken) {

		if (lastToken
			&& (
				lastToken.type === 'number'
				// || lastToken.type === 'regex'
				|| lastToken.type === 'string'
				|| lastToken.type === 'symbol'
				)
			) {

			return false;
		}

		return true;

	}

};



/**
 * Token for decimal numbers
 */
const ASDecimalLiteralToken = class ASDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new ASDecimalPatternIterator());
	}
};



/**
 * Token for strings
 */
const ASStringLiteralToken = class ASStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new ASStringPatternIterator());
	}
};



/**
 * Token for symbols
 */
const ASSymbolToken = class ASSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new ASSymbolIterator());
	}
};



/**
 * Token for keywords
 */
const ASKeywordToken = class ASKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('keyword', [

			'as',
			'break',
			'case',
			'catch',
			'class',
			'const',
			'default',
			'delete',
			'do',
			'dynamic',
			'each',
			'else',
			'extends',
			'final',
			'finally',
			'for',
			'function',
			'get',
			'if',
			'implements',
			'import',
			'in',
			'include',
			'instanceof',
			'interface',
			'internal',
			'is',
			'namespace',
			'native',
			'new',
			'override',
			'package',
			'private',
			'protected',
			'public',
			'return',
			'set',
			'static',
			'super',
			'switch',
			'this',
			'throw',
			'to',
			'try',
			'typeof',
			'use',
			'var',
			'while',
			'with',

			// reserved
			'abstract',
			'export',
			'throws',
			'boolean',
			'float',
			'to',
			'byte',
			'goto',
			'transient',
			'cast',
			'intrinsic',
			'type',
			'char',
			'long',
			'let',
			'defer',
			'virtual',
			'debugger',
			'prototype',
			'volatile',
			'double',
			'short',
			'enum',
			'synchronized',

			// TODO put in a separate token
			'Infinity',
			'NaN',
			'null',
			'undefined',
			'true',
			'false'
		]);

		Object.seal(this);

	}

};



/**
 * Token for ActionScript types
 */
const ASTypesToken = class ASTypesToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('type', [

			'Array',
			'Boolean',
			'Class',
			'Date',
			'Error',
			'Function',
			'int',
			'Number',
			'Null',
			'Object',
			'RegExp',
			'String',
			'Vector',
			'uint',
			'void',
			'XML',
			'XMLList',

			'DisplayObject',
			'IEventDispatcher',
			'MovieClip',
			'Sprite',
			'TextField'

			// AS4
			// 'ArrayList'
			// 'double'

		]);

		Object.seal(this);

	}

};



/**
 * Token for ActionScript punctuation
 */
const ASPunctuationToken = class ASPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		// check https://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/operators.html
		super('operator', [

			'.',
			'(',
			')',
			'{',
			'}',
			'[',
			']',
			',',
			':',
			'::',
			';',

			'&amp;&amp;',
			'&amp;&amp;=',
			'||',
			'||=',
			'~',
			'&amp;',
			'&amp;=',
			'|',
			'|=',
			'^',
			'^=',
			'&gt;&gt;',
			'&gt;&gt;=',
			'&gt;&gt;&gt;',
			'&gt;&gt;&gt;=',
			'&lt;&lt;',
			'&lt;&lt;=',
			'+',
			'++',
			'-',
			'--',
			'*',
			'/',
			'%',
			'==',
			'===',
			'!',
			'?',
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
			'%='

		]);

	}

};




const ASDecimalPatternIterator = class ASDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_hasMantissa: {value: false, writable: true},
			_isNumberCharacter: {value: isNumberCharacterRegex}
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



const ASStringPatternIterator = class ASStringPatternIterator {

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
			|| matchCharacter === '"' // TODO futuramente reimplementar isso com this.openType e this.closeType e as expressões
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

		let isLineBreak = this._matchLineBreak(matchCharacter);

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === this._quoteType
			|| (isLineBreak && this._quoteType !== '`')
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



const ASSymbolIterator = class ASSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex}
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

};

// #endregion



// #region Visual Basic 6 lexer

const VisualBasic6Lexer = class VisualBasic6Lexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new VBKeywordToken(),
			new VBTypesToken(),
			new VBPunctuationToken(),

			// comments
			new VBLineCommentToken(),
			new VBDirectiveToken(),

			new CDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// FIXME não pode ter espaço em branco na frente dele
		this._tokenPool.push(new VBLabelToken());
		//this._tokenPool.push(new VBSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			//new VBNumericLiteralToken(),*/
			new TempDecimalLiteralToken(),
			new VBDateLiteralToken(),
			new VBStringLiteralToken(),
			new VBAttributeToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



const VBLineCommentPatternIterator = class VBLineCommentPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		this._matchFunction = this._matchSingleQuote;
		Object.seal(this);
	}

	_matchSingleQuote(matchCharacter) {
		if (matchCharacter === "'") {
			this._matchFunction = this._matchSameLine;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchSameLine(matchCharacter) {
		this._isComplete = true;
		// any except line break TODO ver line continuation _
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



/**
 * Token for Visual Basic line comments
 */
const VBLineCommentToken = class VBLineCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment lineComment', new VBLineCommentPatternIterator());
	}
};



/**
 * Token for Visual Basic keywords
 */
const VBKeywordToken = class VBKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'Alias',
			'As',
			'Binary',
			'ByVal',
			'ByRef',
			'Call',
			'Case',
			'Compare',
			'Const',
			'Declare',
			'Dim',
			'Do',
			'Each',
			'Else',
			'ElseIf',
			'End',
			'Enum',
			'Event',
			'Exit',
			'Explicit',
			'For',
			'Friend',
			'Function',
			'Get',
			'Global',
			'GoSub',
			'GoTo',
			'If',
			'Implements',
			'In',
			'Is',
			'Let',
			'Lib',
			'Like',
			'Loop',
			'Me',
			'New',
			'Next',

			'On Error',
			'Open',
			'Option',
			'Optional',
			'ParamArray',
			'Preserve',
			'Private',
			'Property',
			'Public',
			'ReDim',
			'Resume',
			'Return',
			'Select',
			'Set',
			'Static',
			'Step',
			'Sub',
			'Then',
			'To',
			'Type',
			'Until',
			'Wend',
			'While',
			'With',

			'Empty',
			'False',
			'Nothing',
			'True'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Visual Basic types
 */
const VBTypesToken = class VBTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [
				'Boolean',
				'Byte',
				'Currency',
				'Date',
				'Double',
				'Integer',
				'Long',
				'Single',
				'String',
				'Variant'
			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			return this._matchEnd(matchCharacter, index);
		}

		if (this._typesSequence.hasNext()) {
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



/**
 * Token for Visual Basic punctuation
 */
const VBPunctuationToken = class VBPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [
			'*',
			'+',
			'-',
			'/',
			'\\',
			'^',
			',',
			'.',
			':',
			'=',
			'>',
			'<',
			'&',
			'&gt;',
			'&lt;',
			'&amp;',
			'_',
			'(',
			')',
			'AddressOf',
			'And',
			'Or',
			'Xor',
			'Eqv',
			'Mod',
			'Not',
			'Imp'
		]);

	}

};



const VBStringPatternIterator = class VBStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		if (matchCharacter === '"') {

			if (this._isEscaped) {
				this._isEscaped = false;
			} else {
				this._isEscaped = true;
			}

			return true;

		}

		// se aspas não foi seguido de outras aspas
		// termina a string imediatamente
		if (this._isEscaped) {
			return this._matchEnd(matchCharacter);
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



/**
 * Token for Visual Basic strings
 */
const VBStringLiteralToken = class VBStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new VBStringPatternIterator());
	}
};



const VBDatePatternIterator = class VBDatePatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchStartHash, writable: true},
			_isDateCharacter: {value: /\d|-|\//},
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

	_matchStartHash(matchCharacter) {

		if (matchCharacter === '#') {
			this._matchFunction = this._matchContentOrEndHash;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndHash(matchCharacter) {

		if (matchCharacter === '#') { // TODO só se tiver conteúdo pode ir para o end
			this._matchFunction = this._matchEnd;
			return true;
		} else if (matchCharacter === '-' || matchCharacter === '/' || this._isDateCharacter.test(matchCharacter)) {
			return true;
		}

		this._hasNext = false;
		return false;

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



/**
 * Token for Visual Basic dates
 */
const VBDateLiteralToken = class VBDateLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('date', new VBDatePatternIterator());
	}
};



/**
 * Token for Visual Basic directives
 */
const VBDirectiveToken = class VBDirectiveToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('directive', [
			'#Const',
			'#If',
			'#Else',
			'#End If'
		]);

		Object.seal(this);

	}

};



const VBLabelIterator = class VBLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
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

};



/**
 * Token for VB labels
 */
const VBLabelToken = class VBLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new VBLabelIterator());
	}
};



const VBAttributePatternIterator = class VBAttributePatternIterator extends SourcePatternIterator {

	constructor() {
		super();

		Object.defineProperties(this, {
			_isAlphaNumericCharacter: {value: isAlphaNumericCharacterRegex},
			_isSpaceCharacter: {value: isSpaceCharacterRegex},
			_bracesNestingLevel: {value: 0, writable: true}
		});

		this._matchFunction = this._matchStartBracket;
		Object.seal(this);
	}

	_matchStartBracket(matchCharacter) {
		if (matchCharacter === '[') {
			this._matchFunction = this._matchAttributeNameBeginning;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchAttributeNameBeginning(matchCharacter) {

		// TODO talvez testar com regex se é uma letra ou identificador válido
		// não sei quais as regras para nomear atributos
		if (matchCharacter === ']') {
			this._hasNext = false;
			return false;
		}

		if (!this._isAlphaNumericCharacter.test(matchCharacter)
			&& !this._isSpaceCharacter.test(matchCharacter)
			&& matchCharacter != ':'
			&& matchCharacter != '.'
			&& matchCharacter != ','
			) {

			this._hasNext = false;
			return false;
		}

		this._matchFunction = this._matchAttributeName;
		return true;

	}

	_matchAttributeName(matchCharacter) {

		if (matchCharacter === ']') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		if (!this._isAlphaNumericCharacter.test(matchCharacter)
			&& !this._isSpaceCharacter.test(matchCharacter)
			&& matchCharacter != ':'
			&& matchCharacter != '.'
			&& matchCharacter != ','
			) {

			this._hasNext = false;
			return false;
		}

		return true;

	}

	_matchEndQuote(matchCharacter) {

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrBrace;
		}

		return true;

	}

	_matchContentOrBrace(matchCharacter) {

		if (matchCharacter === ']') {
			this._hasNext = false;
			return false;
		}

		if (matchCharacter === '"') {
			this._matchFunction = this._matchEndQuote;
			return true;
		}

		// FIXME Melhorar isso
		// se tiver strings dentro do atributo, tenho que seguir as regras delas
		// ou então no lexer, só permito atributos depois de operadores
		if (matchCharacter !== '"'
			&& !this._isAlphaNumericCharacter.test(matchCharacter)
			&& !this._isSpaceCharacter.test(matchCharacter)
			&& matchCharacter != ':'
			&& matchCharacter != '.'
			&& matchCharacter != ','
			) {

			this._hasNext = false;
			return false;
		}

		return true;

	}

	_matchEndBracket(matchCharacter) {
		if (matchCharacter === ']') {
			this._matchFunction = this._matchEnd;
			return true;
		}
		this._hasNext = false;
		return false;
	}

};



const VBAttributeToken = class VBAttributeToken extends SourcePatternIteratorToken {
	constructor() {
		super('attribute', new VBAttributePatternIterator());
	}
};



// #endregion



// #region Ada lexer

const AdaLexer = class AdaLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new AdaKeywordToken(),
			new AdaTypesToken(),
			new AdaPunctuationToken(),

			// comments
			new SimulaLineCommentToken(),
			// new AdaDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// FIXME não pode ter espaço em branco na frente dele
		//this._tokenPool.push(new AdaSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			//new AdaNumericLiteralToken(),*/
			new TempDecimalLiteralToken(),
			new AdaStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



const SimulaLineCommentPatternIterator = class SimulaLineCommentPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		this._matchFunction = this._matchDash1;
		Object.seal(this);
	}

	_matchDash1(matchCharacter) {
		if (matchCharacter === '-') {
			this._matchFunction = this._matchDash2;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchDash2(matchCharacter) {
		if (matchCharacter === '-') {
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



/**
 * Token for Ada line comments
 */
const SimulaLineCommentToken = class SimulaLineCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment lineComment', new SimulaLineCommentPatternIterator());
	}
};



/**
 * Token for Ada keywords
 */
const AdaKeywordToken = class AdaKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'abstract',
			'accept',
			'access',
			'aliased',
			'all',
			'begin',
			'body', // task body, package body
			'case',
			'constant',
			'declare',
			'delay',
			'do',
			'else',
			'elsif',
			'end',
			//'end case',
			'end if',
			//'end loop',
			'exit',
			'for',
			'function',
			'goto',
			'if',
			'in', // TODO debug why it is highlighting int
			'interface',
			'is',
			'loop',
			'new',
			'others',
			'out',
			'package',

			'pragma',
			'Convention',
			'Export',
			'Import',

			'private',
			'procedure',
			'protected',
			'record',
			'return',
			'reverse',
			'select',
			'subtype',
			'synchronized',
			'task',
			'terminate',
			'then',
			'type',
			'until',
			'use',
			'when',
			'while',
			'with',

			// literals
			// fazer num token à parte?
			'True',
			'False',
			'null'

			/*
			abort
			abs
			array
			at
			delta
			digits
			entry
			exception
			generic
			limited
			of
			others
			out
			overriding
			raise
			range
			rem
			renames
			requeue
			separate
			tagged
			*/

		]);

		Object.seal(this);

	}

};



/**
 * Token for Ada types
 */
const AdaTypesToken = class AdaTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [
				'Boolean',
				'range',
				'Integer',
				'integer',
				'Natural_Number',
				'Decimal_Number',
				'Float',
				'float',
				'character',
				'String',

				'C_float',

				// TODO check those, maybe imported from Interfaces.C
				'int',
				'long',
				'unsigned',
				'double',

				'JSON_Value',
				'JSON_Array'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			return this._matchEnd(matchCharacter, index);
		}

		if (this._typesSequence.hasNext()) {
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



/**
 * Token for Ada punctuation
 */
const AdaPunctuationToken = class AdaPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [
			'(',
			')',
			'<',
			'>',
			'<=',
			'>=',
			'&',
			'&lt;',
			'&gt;',
			'&lt;=',
			'&gt;=',
			'=>',
			'=&gt;',
			'&amp;',
			'|',
			':',
			':=',
			'=',
			'..',
			'.',
			';',
			'mod',
			'rem',
			'not',
			'and',
			'and then',
			'or',
			'or else',
			'xor',
			'+',
			'*',
			'**',
			'/',
			'/=' // not equal
		]);

	}

};



const AdaStringPatternIterator = class AdaStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		if (matchCharacter === '"') {

			if (this._isEscaped) {
				this._isEscaped = false;
			} else {
				this._isEscaped = true;
			}

			return true;

		}

		// se aspas não foi seguido de outras aspas
		// termina a string imediatamente
		if (this._isEscaped) {
			return this._matchEnd(matchCharacter);
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



/**
 * Token for Ada strings
 */
const AdaStringLiteralToken = class AdaStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new AdaStringPatternIterator());
	}
};



// #endregion



// #region ObjectPascal lexer

const ObjectPascalLexer = class ObjectPascalLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new ObjectPascalKeywordToken(),
			new ObjectPascalTypesToken(),
			new ObjectPascalPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new ObjectPascalNestedBlockCommentToken(),
			new ObjectPascalOldNestedBlockCommentToken(),
			new CLineCommentToken(),
			// new ObjectPascalDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// FIXME não pode ter espaço em branco na frente dele
		//this._tokenPool.push(new ObjectPascalSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizObjectPascals

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			//new ObjectPascalNumericLiteralToken(),*/
			new TempDecimalLiteralToken(),
			new ObjectPascalStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



const ObjectPascalNestedBlockCommentPatternIterator = class ObjectPascalNestedBlockCommentPatternIterator extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_nestingLevel: {value: 0, writable: true}
		});

		this._matchFunction = this._matchBeginSlash;
		Object.seal(this);

	}

	_matchBeginSlash(matchCharacter) {

		if (matchCharacter === '{') {
			this._nestingLevel++;
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '{') {
			this._nestingLevel++;
		} else if (matchCharacter === '}') {
			this._matchFunction = this._matchEndSlash;
			return this._matchFunction(matchCharacter);
		}

		return true;

	}

	_matchEndSlash(matchCharacter) {

		if (matchCharacter === '}') {
			this._nestingLevel--;
			if (this._nestingLevel === 0) {
				this._matchFunction = this._matchEnd;
			} else {
				this._matchFunction = this._matchContent;
			}
		} else {
			this._matchFunction = this._matchContent;
		}

		return true;

	}

};



const ObjectPascalNestedBlockCommentToken = class ObjectPascalNestedBlockCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment blockComment', new ObjectPascalNestedBlockCommentPatternIterator());
	}
};



const ObjectPascalOldNestedBlockCommentPatternIterator = class ObjectPascalOldNestedBlockCommentPatternIterator extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_nestingLevel: {value: 0, writable: true}
		});

		this._matchFunction = this._matchOpeningBrace;
		Object.seal(this);

	}

	_matchOpeningBrace(matchCharacter) {

		if (matchCharacter === '(') {
			this._matchFunction = this._matchBeginStar;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchBeginStar(matchCharacter) {

		if (matchCharacter === '*') {
			this._matchFunction = this._matchContent;
			this._nestingLevel++;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContent(matchCharacter) {

		if (matchCharacter === ')') {
			this._matchFunction = this._matchBeginStar;
		}

		if (matchCharacter === '*') {
			this._matchFunction = this._matchClosingBrace;
		}

		return true;

	}

	_matchClosingBrace(matchCharacter) {

		if (matchCharacter === ')') {
			this._nestingLevel--;
			if (this._nestingLevel === 0) {
				this._matchFunction = this._matchEnd;
			} else {
				this._matchFunction = this._matchContent;
			}
		} else if (matchCharacter === '*') {
			// não fazer nada
			// ou em outras palavras
			// this._matchFunction = this._matchClosingBrace;
		} else {
			this._matchFunction = this._matchContent;
		}

		return true;

	}

};



const ObjectPascalOldNestedBlockCommentToken = class ObjectPascalOldNestedBlockCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment blockComment', new ObjectPascalOldNestedBlockCommentPatternIterator());
	}
};



/**
 * Token for ObjectPascal keywords
 */
const ObjectPascalKeywordToken = class ObjectPascalKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'abstract',
			'at',
			'begin',
			'case',
			'class',
			'const',
			'constructor',
			'default',
			'delayed',
			'destructor',
			'do',
			'downto',
			'dynamic',
			'else',
			'end',
			'except',
			'final',
			'finally',
			'for',
			'forward',
			'function',
			'if',
			'implementation',
			'index',
			'inherited',
			'initialization',
			'interface',
			'message',
			'nodefault',
			'of',
			'on',
			'operator',
			'overload',
			'override',
			'out',
			'private',
			'procedure',
			'program',
			// 'project',
			'property',
			'protected',
			'public',
			'published',
			'program',
			'raise',
			'read',
			'record',
			'reintroduce',
			'repeat',
			'result',
			'Result',
			'sealed',
			'self',
			'Self',
			'set',
			'static',
			'stored',
			'strict',
			'then',
			'to',
			'try',
			'type',
			'unit',
			'until',
			'uses',
			'var',
			'varargs',
			'virtual',
			'while',
			'with',
			'write',

			'external',
			'framework',
			'name',
			'object',

			// literals
			// fazer num token à parte!
			'nil',
			'true',
			'True',
			'false',
			'False',

			// calling conventions
			// mudar pra diretivas de compilador?
			'register',
			'pascal',
			'cdecl',
			'stdcall',
			'safecall',
			'winapi',

			// warnings
			// create a separate token for that?
			'platform',
			'deprecated',
			'library'

		]);

		Object.seal(this);

	}

};



/**
 * Token for ObjectPascal types
 */
const ObjectPascalTypesToken = class ObjectPascalTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'boolean',
				'Boolean',
				'array',
				'array of',
				'Array',
				'Array of', // TODO

				'byte',
				'Byte',
				'ShortInt',
				'Word',
				'SmallInt',
				'LongWord',
				'Cardinal',
				'LongInt',
				'integer', // while the parser is still case sensitive
				'Integer',
				'Int64',

				'Single',
				'Double',
				'Extended',
				'Currency',

				'Variant',

				'Real', // obsolete

				'Char',
				'WideChar',
				'AnsiChar',
				'ShortString',
				'String',
				'AnsiString',
				'WideString',

				'Pointer',
				'PChar',
				'PExtended',
				'PInt64',

				'Exception',
				'EAbort',
				'EAbstractError',
				'AssertionFailed',
				'EBitsError',
				'ECommonCalendarError',
				'EDateTimeError',
				'EMonthCalError',
				'EConversionError',
				'EConvertError',
				'EDatabaseError',
				'EExternal',
				'EAccessViolation',
				'EControlC',
				'EExternalException',
				'EIntError',
				'EDivByZero',
				'EIntOverflow',
				'ERangeError',
				'EMathError',
				'EInvalidArgument',
				'EInvalidOp',
				'EOverflow',
				'EUnderflow',
				'EZeroDivide',
				'EStackOverflow',
				'EHeapException',
				'EInvalidPointer',
				'EOutOfMemory',
				'EInOutError',
				'EInvalidCast',
				'EInvalidOperation',
				'EMenuError',
				'EOSError',
				'EParserError',
				'EPrinter',
				'EPropertyError',
				'EPropReadOnly',
				'EPropWriteOnly',
				'EThread',
				'EVariantError',

				'TJSonValue'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			return this._matchEnd(matchCharacter, index);
		}

		if (this._typesSequence.hasNext()) {
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



/**
 * Token for ObjectPascal punctuation
 */
const ObjectPascalPunctuationToken = class ObjectPascalPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [
			'(',
			')',
			'.',
			'..',
			':',
			':=',
			'=',
			'+',
			'-',
			'*',
			'/',
			'div',
			'mod',
			'<',
			'>',
			'<=',
			'>=',
			'<>',
			'&lt;',
			'&gt;',
			'&lt;=',
			'&gt;=',
			'&lt;&gt;',
			'^',
			'@',
			'And',
			'Or',
			'Xor',
			'Not',
			'and',
			'or',
			'xor',
			'not',
			'shl',
			'shr',
			',',
			';'
		]);

	}

};



const ObjectPascalStringPatternIterator = class ObjectPascalStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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

		if (matchCharacter === "'") {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		if (matchCharacter === "'") {

			if (this._isEscaped) {
				this._isEscaped = false;
			} else {
				this._isEscaped = true;
			}

			return true;

		}

		// se aspas não foi seguido de outras aspas
		// termina a string imediatamente
		if (this._isEscaped) {
			return this._matchEnd(matchCharacter);
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



/**
 * Token for ObjectPascal strings
 */
const ObjectPascalStringLiteralToken = class ObjectPascalStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new ObjectPascalStringPatternIterator());
	}
};



// #endregion



// #region Ruby lexer

const RubyLexer = class RubyLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new RubyKeywordToken(),
			new RubyTypesToken(),
			new RubyPunctuationToken(),

			// comments
			new PythonLineCommentToken(),
			new RubyBlockCommentToken(),
			// new RubyDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// FIXME não pode ter espaço em branco na frente dele
		//this._tokenPool.push(new RubySymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizRubys

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			//new RubyNumericLiteralToken(),*/
			new TempDecimalLiteralToken(),
			new RubyStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



/**
 * Token for Ruby keywords
 */
const RubyKeywordToken = class RubyKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'alias',
			'case',
			'class',
			'def',
			'do',
			'else',
			'elsif',
			'end',
			'extend',
			'for',
			'if',
			'in',
			'lambda',
			'loop',
			'module',
			'private',
			'protected',
			'require',
			'return',
			'self',
			'undef',
			'unless',
			'until',
			'when',
			'while',
			'yield',

			'Struct',

			// literals
			// fazer num token à parte?
			'true',
			'false',
			'nil'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Ruby types
 */
const RubyTypesToken = class RubyTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [
				'Numeric',
				'String',
				'range', // TODO
				'OpenStruct',
				'JSON'
			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			return this._matchEnd(matchCharacter, index);
		}

		if (this._typesSequence.hasNext()) {
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



/**
 * Token for Ruby punctuation
 */
const RubyPunctuationToken = class RubyPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [
			'(',
			')',
			'{',
			'}',
			',',
			'.',
			'..',
			':',
			'...',
			'::',
			'&',
			'&amp;',
			// '&.', // not sure if and what this is
			// '&amp;.',
			'<',
			'>',
			'<=',
			'>=',
			'&lt;',
			'&gt;',
			'&lt;=',
			'&gt;=',
			'=',
			'==',
			'===',
			'!=',
			'=~',
			'!~',
			'<=>',
			'&lt;=&gt;',
			'+=',
			'-=',
			'*=',
			'**=',
			'/=',
			'%=',
			'||=',
			'&&=',
			'|=',
			'&=',
			'<<',
			'>>',
			'&lt;&lt;',
			'&gt;&gt;',
			'=<<',
			'=>>',
			'=&lt;&lt;',
			'=&gt;&gt;',
			'?',
			'!',
			'not',
			'&&',
			'&amp;&amp;',
			'||',
			'|',
			'~',
			'=~',
			'!~',
			'and',
			'or',
			'+',
			'-',
			'*',
			'**',
			'/',
			'%',
			'^',
			',',
			'defined?'
		]);

	}

};



const RubyStringPatternIterator = class RubyStringPatternIterator {

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
			) {

			this._quoteType = matchCharacter;
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		/*if (this._isEscaped) {
			this._isEscaped = false;
			return true;
		}

		if (matchCharacter === '\\') {
			this._isEscaped = true;
			return true;
		}*/

		let isLineBreak = this._matchLineBreak(matchCharacter);

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



/**
 * Token for Ruby strings
 */
const RubyStringLiteralToken = class RubyStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new RubyStringPatternIterator());
	}
};



const RubyBlockCommentToken = class RubyBlockCommentToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'comment blockComment'},
			_matchFunction: {value: context._matchStartSequence, writable: true},
			_startSequence: {value: new SourceSimpleCharacterSequenceToken('blockCommentStart', ['=begin'])},
			_endSequence: {value: new SourceSimpleCharacterSequenceToken('blockCommentEnd', ['=end'])}
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

		if (matchCharacter === '=') { // TODO improve this
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



// #endregion



// #region Common Lisp lexer

const CommonLispLexer = class CommonLispLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new CommonLispKeywordToken(),
			new CommonLispPunctuationToken(),

			// comments
			new CommonLispLineCommentToken(),
			new CommonLispBlockCommentToken()//,

			// new CDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		this._tokenPool.push(new CommonLispSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			//new CommonLispDecimalLiteralToken(),
			new TempDecimalLiteralToken(),
			//new CommonLispNumericLiteralToken(),
			new CommonLispStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

};



const CommonLispKeywordToken = class CommonLispKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'below',
			'case',
			// 'collect', // not sure what that is
			'cond',
			'defclass',
			'defconstant',
			'defmacro',
			'defpackage',
			'defparameter',
			'defun',
			'defvar',
			'do',
			'for',
			'from',
			'if',
			'in',
			// 'inspect',
			'iter',
			'lambda',
			'let',
			'let*',
			'loop',
			'not',
			'set',
			// 'decf',
			// 'incf',
			'setf',
			'setq',
			'over',
			'then',
			'to',
			'unless',
			'when',

			// literals
			// 'true',
			// 'false',
			// 't',
			'nil',
			'null'

		]);

		Object.seal(this);

	}

};



const CommonLispPunctuationToken = class CommonLispPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [

			'(',
			')',
			'>',
			'<',
			'&gt;',
			'&lt;'

		]);

	}

};



const CommonLispLineCommentPatternIterator = class CommonLispLineCommentPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		this._matchFunction = this._matchSemiColon;
		Object.seal(this);
	}

	_matchSemiColon(matchCharacter) {
		if (matchCharacter === ';') {
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

/**
 * Token for Common Lisp line comments
 */
 const CommonLispLineCommentToken = class CommonLispLineCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment lineComment', new CommonLispLineCommentPatternIterator());
	}
};



const CommonLispBlockCommentPatternIterator = class CommonLispBlockCommentPatternIterator extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_nestingLevel: {value: 0, writable: true}
		});

		this._matchFunction = this._matchBeginSlash;
		Object.seal(this);

	}

	_matchBeginSlash(matchCharacter) {

		if (matchCharacter === '#') {
			this._matchFunction = this._matchBeginStar;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchBeginStar(matchCharacter) {

		if (matchCharacter === '|') {
			this._matchFunction = this._matchContent;
			this._nestingLevel++;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '#') {
			this._matchFunction = this._matchBeginStar;
		}

		if (matchCharacter === '|') {
			this._matchFunction = this._matchEndSlash;
		}

		return true;

	}

	_matchEndSlash(matchCharacter) {

		if (matchCharacter === '#') {
			this._nestingLevel--;
			if (this._nestingLevel === 0) {
				this._matchFunction = this._matchEnd;
			} else {
				this._matchFunction = this._matchContent;
			}
		} else if (matchCharacter === '|') {
			// não fazer nada
			// ou em outras palavras
			// this._matchFunction = this._matchEndSlash;
		} else {
			this._matchFunction = this._matchContent;
		}

		return true;

	}

};

/**
 * Token for CommonLisp block comments
 */
 const CommonLispBlockCommentToken = class CommonLispBlockCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment blockComment', new CommonLispBlockCommentPatternIterator());
	}
};



const CommonLispStringPatternIterator = class CommonLispStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		let isLineBreak = this._matchLineBreak(matchCharacter);

		if (this._isEscaped && !isLineBreak) { // line break não é escapável em c#
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
		if (matchCharacter === '"'
			|| isLineBreak
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



const CommonLispStringLiteralToken = class CommonLispStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new CommonLispStringPatternIterator());
	}
};



const CommonLispSymbolToken = class CommonLispSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new CommonLispSymbolIterator());
	}
};



const CommonLispSymbolIterator = class CommonLispSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchBeginningValidCharacter;

	}

	_matchBeginningValidCharacter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			this._matchFunction = this._matchValidCharacter;
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '_'
			|| matchCharacter === '@'
			) {

			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
			//|| matchCharacter === '@' // confirmar isso
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

};



// #endregion



// #region Haskell lexer



const HaskellLexer = class HaskellLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new HaskellKeywordToken(),
			new HaskellTypesToken(),
			new HaskellPunctuationToken(),

			// comments
			new SimulaLineCommentToken(),
			new HaskellBlockCommentToken()
			// new HaskellDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		// FIXME não pode ter espaço em branco na frente dele
		//this._tokenPool.push(new HaskellSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			//new HaskellNumericLiteralToken(),*/
			new TempDecimalLiteralToken(),
			new CStringLiteralToken()
			//new HaskellStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



/**
 * Token for Haskell keywords
 */
 const HaskellKeywordToken = class HaskellKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'case',
			'ccall',
			'data',
			'do',
			'foreign',
			'if',
			'import',
			'else',
			'let',
			'module',
			'of',
			'return',
			'then',
			'type',
			'unsafe',
			'where',

			// literals
			// TODO separate in its own token
			'True',
			'False',
			'Just',
			'Nothing'

		]);

		Object.seal(this);

	}

};



/**
 * Token for Haskell types
 */
 const HaskellTypesToken = class HaskellTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [
				'Maybe',
				'Either',
				'Int',
				'Integral',
				'Float',
				'Double',
				'String',
				'Left',
				'Right'
			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			return this._matchEnd(matchCharacter, index);
		}

		if (this._typesSequence.hasNext()) {
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



/**
 * Token for Haskell punctuation
 */
 const HaskellPunctuationToken = class HaskellPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [
			'(',
			')',
			'[',
			']',
			'|',
			':',
			'::',
			'=',
			'==',
			'+',
			'-',
			'*',
			'**',
			'^',
			'/',
			'/=',
			'++',
			'^',
			'%',
			'<',
			'>',
			'<=',
			'>=',
			'&gt,&gt,=',
			'>>=',
			'=>',
			'->',
			'<-',
			'&lt;',
			'&gt;',
			'&lt;=',
			'&gt;=',
			'=&gt;',
			'-&gt;',
			'&lt;-',
			'&&',
			'&amp;&amp;',
			'||',
			'not',
			'div',
			'mod',
			'rem',
			// shiftL x 4
			// shiftR x 4
			'.&amp;.',
			'.&.',
			'.|.',
			'xor',
			'complement',
			':+',
			',',
			'..',
			'.'
		]);

	}

};



const HaskellBlockCommentPatternIterator = class HaskellBlockCommentPatternIterator extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_nestingLevel: {value: 0, writable: true}
		});

		this._matchFunction = this._matchBeginSlash;
		Object.seal(this);

	}

	_matchBeginSlash(matchCharacter) {

		if (matchCharacter === '{') {
			this._matchFunction = this._matchBeginStar;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchBeginStar(matchCharacter) {

		if (matchCharacter === '-') {
			this._matchFunction = this._matchContent;
			this._nestingLevel++;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '{') {
			this._matchFunction = this._matchBeginStar;
		}

		if (matchCharacter === '-') {
			this._matchFunction = this._matchEndSlash;
		}

		return true;

	}

	_matchEndSlash(matchCharacter) {

		if (matchCharacter === '}') {
			this._nestingLevel--;
			if (this._nestingLevel === 0) {
				this._matchFunction = this._matchEnd;
			} else {
				this._matchFunction = this._matchContent;
			}
		} else if (matchCharacter === '-') {
			// não fazer nada
			// ou em outras palavras
			// this._matchFunction = this._matchEndSlash;
		} else {
			this._matchFunction = this._matchContent;
		}

		return true;

	}

};

/**
 * Token for Haskell block comments
 */
 const HaskellBlockCommentToken = class HaskellBlockCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment blockComment', new HaskellBlockCommentPatternIterator());
	}
};



// #endregion



// #region F# lexer



const FsLexer = class FsLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new FSKeywordToken(),
			new FSTypesToken(),
			new FSPunctuationToken(),

			// comments
			new CLineCommentToken(),
			new FSBlockCommentToken()

		);

		// this._pushLiteralTokens();
		this._pushInvisibleTokens();

	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

}



/**
 * Token for F# instructions keywords
 */
const FSKeywordToken = class FsKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'as',
			'async',
			'class',
			'do',
			'do!',
			'end',
			'elif',
			'else',
			'finally',
			'for',
			'fun',
			'if',
			'in',
			'internal',
			'let',
			'let!',
			'match',
			'member',
			'module',
			'mutable',
			'new',
			'not',
			'of',
			'open',
			'private',
			'rec',
			'return',
			'then',
			'try',
			'type',
			'use',
			'with',

			'true',
			'false'

		]);

		Object.seal(this);

	}

};



/**
 * Token for F# types
 */
const FSTypesToken = class FSTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [
				'int'
			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			return this._matchEnd(matchCharacter, index);
		}

		if (this._typesSequence.hasNext()) {
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



const FSPunctuationToken = class CSPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [

			'.',
			':',
			';',
			',',
			'|>',
			'|&gt;',
			'->',
			'-&gt;',
			'<-',
			'&lt;-',
			'*',
			'%',
			'=',
			'<>',
			'&lt,&gt;',
			'&&',
			'&amp;&amp;',
			'||',

			'|',
			'(',
			')',
			'[',
			']',
			'{',
			'}'

		]);

	}

};



const FSBlockCommentPatternIterator = class FSBlockCommentPatternIterator extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_nestingLevel: {value: 0, writable: true}
		});

		this._matchFunction = this._matchBeginSlash;
		Object.seal(this);

	}

	_matchBeginSlash(matchCharacter) {

		if (matchCharacter === '(') {
			this._matchFunction = this._matchBeginStar;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchBeginStar(matchCharacter) {

		if (matchCharacter === '*') {
			this._matchFunction = this._matchContent;
			this._nestingLevel++;
			return true;
		}

		if (this._nestingLevel > 0) {
			this._matchFunction = this._matchContent;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContent(matchCharacter) {

		if (matchCharacter === '(') {
			this._matchFunction = this._matchBeginStar;
		}

		if (matchCharacter === '*') {
			this._matchFunction = this._matchEndSlash;
		}

		return true;

	}

	_matchEndSlash(matchCharacter) {

		if (matchCharacter === ')') {
			this._nestingLevel--;
			if (this._nestingLevel === 0) {
				this._matchFunction = this._matchEnd;
			} else {
				this._matchFunction = this._matchContent;
			}
		} else if (matchCharacter === '*') {
			// não fazer nada
			// ou em outras palavras
			// this._matchFunction = this._matchEndSlash;
		} else {
			this._matchFunction = this._matchContent;
		}

		return true;

	}

};

/**
 * Token for FS block comments
 */
 const FSBlockCommentToken = class FSBlockCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment blockComment', new FSBlockCommentPatternIterator());
	}
};



// #endregion



// #region WebAssembly lexer

const WebAssemblyLexer = class WebAssemblyLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new WebAssemblyKeywordToken(),
			new WebAssemblyTypesToken(),
			new WebAssemblyPunctuationToken(),

			// comments
			new WebAssemblyLineCommentToken()//,

			// new CDirectiveToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();

		this._tokenPool.push(new WebAssemblySymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			//new WebAssemblyDecimalLiteralToken(),
			new TempDecimalLiteralToken(),
			//new WebAssemblyNumericLiteralToken(),
			new WebAssemblyStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

};



const WebAssemblyKeywordToken = class WebAssemblyKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'module',
			'import',
			'export',
			'data',
			'memory',
			'local',
			'global',
			'func',
			'param',
			'mut',
			'return',
			'start',
			'block',
			'end',
			'if',
			'br_if',
			'br_table',
			'then',
			'else',
			'select',
			'call',
			'loop',
			'drop',
			'unreachable',
			'nop'

		]);

		Object.seal(this);

	}

};



const WebAssemblyTypesToken = class WebAssemblyTypesToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('type', [
			'i32',
			'i64',
			'f32',
			'f64',
			'v128',
			'externref'
		]);

		Object.seal(this);

	}

};



const WebAssemblyPunctuationToken = class WebAssemblyPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [

			'(',
			')',
			'.'

		]);

	}

};



const WebAssemblyLineCommentPatternIterator = class WebAssemblyLineCommentPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		this._matchFunction = this._matchSemiColon1;
		Object.seal(this);
	}

	_matchSemiColon1(matchCharacter) {
		if (matchCharacter === ';') {
			this._matchFunction = this._matchSemiColon2;
			return true;
		}
		this._hasNext = false;
		return false;
	}

	_matchSemiColon2(matchCharacter) {
		if (matchCharacter === ';') {
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

/**
 * Token for WebAssembly line comments
 */
 const WebAssemblyLineCommentToken = class WebAssemblyLineCommentToken extends SourcePatternIteratorToken {
	constructor() {
		super('comment lineComment', new WebAssemblyLineCommentPatternIterator());
	}
};



const WebAssemblyStringPatternIterator = class WebAssemblyStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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

		if (matchCharacter === '"') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		let isLineBreak = this._matchLineBreak(matchCharacter);

		if (this._isEscaped && !isLineBreak) { // line break não é escapável em c#
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
		if (matchCharacter === '"'
			|| isLineBreak
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



const WebAssemblyStringLiteralToken = class WebAssemblyStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new WebAssemblyStringPatternIterator());
	}
};



const WebAssemblySymbolToken = class WebAssemblySymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new WebAssemblySymbolIterator());
	}
};



const WebAssemblySymbolIterator = class WebAssemblySymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchBeginningValidCharacter;

	}

	_matchBeginningValidCharacter(matchCharacter) {


		if (matchCharacter === '$') {
			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
			//|| matchCharacter === '@' // confirmar isso
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

};



// #endregion



// #region LLVM lexer



const LlvmLexer = class LlvmLexer extends Lexer {

	constructor() {
		super();
		Object.seal(this);
	}

	_resetTokens(tokenSequence) {

		this._tokenPool.splice(

			0,
			this._tokenPool.length,

			// language
			new LlvmKeywordToken(),
			new LlvmTypesToken(),
			new LlvmPunctuationToken(),

			// comments
			new CommonLispLineCommentToken()
			// new SimulaLineCommentToken()

		);

		// this._pushLiteralTokens();
		this._pushInvisibleTokens();

		this._tokenPool.push(new LlvmLabelToken());
		this._tokenPool.push(new LlvmSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

	}

	/*
	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			//new HaskellNumericLiteralToken(),
			new TempDecimalLiteralToken(),
			new CStringLiteralToken()
			//new HaskellStringLiteralToken()
		);
	}
	*/

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
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



/**
 * Token for LLVM instructions keywords
 */
 const LlvmKeywordToken = class LlvmKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'external',
			'global',
			'private',

			'asm',
			'br',
			'byval',
			'callbr',
			'catchswitch',
			'catchret',
			'cleanupret',
			'declare',
			'define',
			'indirectbr',
			'invoke',
			'prefix',
			'resume',
			'ret',
			'sret',
			'switch',
			'unreachable',
			'unwind',

			'constant',
			'noalias',
			'nocapture',

			'add',
			'sub',
			'mult',
			'div',
			'rem',
			'setcc',

			'and',
			'or',
			'xor',
			'shl',
			'shr',

			'malloc',
			'free',
			'alloca',
			'load',
			'store',
			'getelementptr',
			'gc',

			'alignstack',
			'call',
			'cast',
			'inteldialect',
			'metadata',
			'phi',
			'sideeffect',
			'to',
			'vaarg',
			'vanext',

			'icmp',
			'eq',

			'true',
			'false',
			'none',
			'null',
			'undef'

		]);

		Object.seal(this);

	}

};



const LlvmTypesToken = class LlvmTypesToken extends Token {

	constructor() {

		super();

		const context = this;

		Object.defineProperties(this, {
			type: {value: 'type'},
			_matchFunction: {value: context._matchTypesSequence, writable: true},
			_typesSequence: {value: new SourceSimpleCharacterSequenceToken('type', [

				'half',
				'bfloat',
				'float',
				'double',
				'f128',
				'x86_fp80',
				'ppc_fp128',

				// iN - any bit width from 1 bit to 223(about 8 million) can be specified.
				'i1',
				'i8',
				'i16',
				'i32',
				'i64',

				'x86_amx',
				'x86_mmx',

				'label',
				'metadata',
				'ptr',
				'token',
				'void'

			])}
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

	_matchTypesSequence(matchCharacter, index) {

		this._typesSequence.next(matchCharacter, index);

		if (this._typesSequence.isComplete) {
			this._matchFunction = this._matchEnd;
			return this._matchFunction(matchCharacter);
		}

		if (this._typesSequence.hasNext()) {
			return true;
		}

		this._hasNext = false;
		return false;

	}

	/*_matchTypeOperator(matchCharacter, index) {

		if (matchCharacter === '?') {
			this._matchFunction = this._matchEnd;
			return true;
		} else if (matchCharacter === '*') {
			return true;
		} else if (matchCharacter === '[') {
			this._matchFunction = this._matchCommaOrEndBracket;
			return true;
		}

		return this._matchEnd(matchCharacter, index);

	}

	_matchCommaOrEndBracket(matchCharacter, index) {

		if (matchCharacter === ']') {
			this._matchFunction = this._matchTypeOperator;
			return true;
		}

		if (matchCharacter === ',') {
			//
			return true;
		}

		return this._matchEnd(matchCharacter, index);// FIXME separar num outro token, pra reconhecer int e int[] mas não int[

	}*/

	/**
	 * Indica que o pattern já terminou no caractere anterior
	 */
	_matchEnd(matchCharacter, index) {
		this._complete();
		return false;
	}

};



const LlvmPunctuationToken = class LlvmPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [

			';',
			',',
			'x',
			'!',
			'=',
			'(',
			')',
			'[',
			']',
			'<',
			'>',
			'{',
			'}'

		]);

	}

};



const LlvmLabelIterator = class LlvmLabelIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_isWordCharacter: {value: isWordCharacterRegex}
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

};



/**
 * Token for Llvm labels
 */
const LlvmLabelToken = class LlvmLabelToken extends SourcePatternIteratorToken {
	constructor() {
		super('label', new LlvmLabelIterator());
	}
};



const LlvmSymbolToken = class LlvmSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new LlvmSymbolIterator());
	}
};



const LlvmSymbolIterator = class LlvmSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchBeginningValidCharacter;

	}

	_matchBeginningValidCharacter(matchCharacter) {


		if (matchCharacter === '%') {
			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
			//|| matchCharacter === '@' // confirmar isso
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

};



// #endregion



// #region Licuid lexer



const LicuidParser = class LicuidParser {

	constructor(lexer, syntactic, semantic) {

		Object.defineProperties(this, {
			_lexerParser: {value: lexerParser},
			_syntacticParser: {value: syntacticParser},
			_semanticParser: {value: semanticParser}
		});

		Object.seal(this);

	}

	async parseAsync(source) {
		const tokenSequence = await this._lexerParser.parseAsync(source);
		const abstractSyntaxTree = await this._syntacticParser.parseAsync(tokenSequence);
		const actionTree = await this._semanticParser.parseAsync(abstractSyntaxTree);
		return actionTree;
	}

}


const LicuidLexerParser = class LicuidLexerParser {

	constructor() {

		Object.defineProperties(this, {
			_tokenPool: {value: []},
			_token: {value: null, writable: true},
			_completeToken: {value: null, writable: true},
			_characters: {value: null, writable: true},
			_index: {value: 0, writable: true},

			_lastToken: {value: null, writable: true},
			_lastNonWhitespaceToken: {value: null, writable: true}
		});

		Object.seal(this);

	}

	async parseAsync(source) {

		const context = this; // TODO arrow talvez não precise de context

		const tokenSequencePromise = new Promise((resolve, reject) => {
			try {
				const tokenSequence = context.parse(source);
				resolve(tokenSequence);
			} catch (erro) {
				reject(erro);
			}
		});

		return tokenSequencePromise;

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

	_iterate(tokenSequence) {

		this._matchTokens();
		this._cleanTokenPool();

		if (this._tokenPool.length === 0) {

			if (this._completeToken) {

				tokenSequence.push(this._completeToken);

				this._lastToken = this._completeToken;

				if (!this._completeToken.ignore
					&& this._completeToken.type !== 'whitespace'
					&& this._completeToken.type !== 'endOfLine'
					) {

					this._lastNonWhitespaceToken = this._completeToken;
				}

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

		if (this._lastNonWhitespaceToken !== null
			&& this._lastNonWhitespaceToken.type === 'keyword'
			&& (
				this._lastNonWhitespaceToken.characterSequence.join('') === 'name'
				|| this._lastNonWhitespaceToken.characterSequence.join('') === 'action'
				|| this._lastNonWhitespaceToken.characterSequence.join('') === 'type'
				|| this._lastNonWhitespaceToken.characterSequence.join('') === 'measure'
				|| this._lastNonWhitespaceToken.characterSequence.join('') === 'alias'
				)
			) {

			this._tokenPool.splice(

				0,
				this._tokenPool.length,

				new LicuidSymbolToken(),

				// language
				new LicuidKeywordToken(),
				new LicuidTypeSpecToken(),
				new LicuidAssignmentToken(),
				new LicuidPunctuationToken(),
				new LicuidMetaToken(),

				// comments
				new CLineCommentToken(),
				new NestedBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

		// number formats after
		} else if (this._lastToken !== null
			&& this._lastToken.type === 'type'
			) {

			this._tokenPool.splice(

				0,
				this._tokenPool.length,

				new LicuidDecimalBaseToken(),
				new LicuidStringI18nToken(),
				new LicuidNumberSpecToken(),

				// language
				new LicuidKeywordToken(),
				new LicuidTypeSpecToken(),
				new LicuidAssignmentToken(),
				new LicuidPunctuationToken(),
				new LicuidMetaToken(),

				// comments
				new CLineCommentToken(),
				new NestedBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

		// base or range right after number
		} else if (this._lastToken !== null
			&& this._lastToken.type === 'number'
			) {

			this._tokenPool.splice(

				0,
				this._tokenPool.length,

				new LicuidDecimalBaseToken(),
				new LicuidNumberSpecToken(),

				// language
				new LicuidKeywordToken(),
				new LicuidTypeSpecToken(),
				new LicuidAssignmentToken(),
				new LicuidPunctuationToken(),
				new LicuidMetaToken(),

				// comments
				new CLineCommentToken(),
				new NestedBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

		// i18n right after string
		} else if (this._lastToken !== null
			&& this._lastToken.type === 'string'
			) {

			this._tokenPool.splice(

				0,
				this._tokenPool.length,

				new LicuidStringI18nToken(),

				// language
				new LicuidKeywordToken(),
				new LicuidTypeSpecToken(),
				new LicuidAssignmentToken(),
				new LicuidPunctuationToken(),
				new LicuidMetaToken(),

				// comments
				new CLineCommentToken(),
				new NestedBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

		} else {

			this._tokenPool.splice(

				0,
				this._tokenPool.length,

				// language
				new LicuidKeywordToken(),
				new LicuidTypeSpecToken(),
				new LicuidAssignmentToken(),
				new LicuidPunctuationToken(),
				new LicuidMetaToken(),

				// comments
				new CLineCommentToken(),
				new NestedBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

			// FIXME não pode ter espaço em branco na frente dele
			// this._tokenPool.push(new LicuidSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

	}

	_pushLiteralTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new LicuidTypeToken(),
			new LicuidDecimalLiteralToken(),
			new LicuidStringLiteralToken()
		);
	}

	_pushInvisibleTokens() {
		this._tokenPool.splice(
			this._tokenPool.length,
			0,
			new HtmlEmphasisToken(),
			new WhitespaceToken(),
			new EndOfLineToken()
		);
	}

};



/**
 * AKA Scanner
 */
const LicuidSyntacticParser = class LicuidSyntacticParser {

	async parseAsync(tokenSequence) {

		const context = this; // TODO arrow talvez não precise de context

		const abstractSyntaxTreePromise = new Promise((resolve, reject) => {
			try {
				const abstractSyntaxTree = context.parse(tokenSequence);
				resolve(abstractSyntaxTree);
			} catch (erro) {
				reject(erro);
			}
		});

		return abstractSyntaxTreePromise;

	}

	parse(tokenSequence) {

		// return abstract syntax tree

	}

}



const LicuidSemanticParser = class LicuidSemanticParser {

	async parseAsync(abstractSyntaxTree) {

		const context = this; // TODO arrow talvez não precise de context

		const actionTreePromise = new Promise((resolve, reject) => {
			try {
				const actionTree = context.parse(abstractSyntaxTree);
				resolve(actionTree);
			} catch (erro) {
				reject(erro);
			}
		});

		return actionTreePromise;

	}

	parse(abstractSyntaxTree) {

		// return action tree

	}

}



/**
 * Token for Licuid keywords
 */
 const LicuidKeywordToken = class LicuidKeywordToken extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			'action',
			'alias',
			'and',
			'break',
			'continue',
			'else',
			'end',
			'for',
			'if',
			'in',
			'is',
			'measure',
			'name',
			'or',
			'type',
			'value',
			'while',
			'xor',

			// literals
			// TODO separate in its own token
			'true',
			'false'

		]);

		Object.seal(this);

	}

};


/**
 * Token for Licuid type specification
 */
 const LicuidTypeSpecToken = class LicuidTypeSpecToken extends SourceSimpleCharacterSequenceToken {
	constructor() {
		super('operator', [':']);
		Object.seal(this);
	}
};



/**
 * Token for Licuid assignment
 */
const LicuidAssignmentToken = class LicuidAssignmentToken extends SourceSimpleCharacterSequenceToken {
	constructor() {
		super('operator', ['=']);
		Object.seal(this);
	}
};



/**
 * Token for Licuid punctuation
 */
 const LicuidPunctuationToken = class LicuidPunctuationToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('operator', [
			'(',
			')',
			'>',
			'&gt;',
			'>=',
			'&gt;=',
			'<',
			'&lt;',
			'<=',
			'&lt;=',
			'<=>',
			'&lt;=&gt;',
			'.',
			':',
			'|',
			'…',
			'...'
		]);

	}

};



/**
 * Token for Licuid built-in types
 */
 const LicuidTypeToken = class LicuidTypeToken extends SourceSimpleCharacterSequenceToken {

	constructor() {

		super('type', [
			'i',
			'i8',
			'i16',
			'i32',
			'i64',
			'i128',
			'u',
			'u8',
			'u16',
			'u32',
			'u64',
			'u128',
			'number',
			'binary',
			'ternary',
			'text',
			'getSet',
			'bézier',
			'bezier'
		]);

	}

};



const LicuidDecimalLiteralToken = class LicuidDecimalLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('number', new LicuidDecimalPatternIterator());
	}
};



const LicuidDecimalPatternIterator = class LicuidDecimalPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
			_startIndex: {value: 0, writable: true}
		});
		this._matchFunction = this._matchNumber;
		Object.seal(this);
	}

	// pode ter _ . | separando os números

	_matchNumber(matchCharacter, index) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			this._isComplete = true;
			return true;
		}

		if (index > 0 && matchCharacter === '_') { // TODO melhorar isso
			this._isComplete = false;
			return true;
		}

		if (this._isComplete) {
			console.log('index: ' + index + ' char: ' + matchCharacter);
			return this._matchEnd(matchCharacter);
		}

		this._hasNext = false;
		return false;

	}

};



/**
 * Token for licuid decimal numbers base (2, 8, 10, 12, etc.)
 */
const LicuidDecimalBaseToken = class LicuidDecimalBaseToken extends SourcePatternIteratorToken {
	constructor() {
		super('numberBase', new LicuidDecimalBaseIterator());
	}
};



const LicuidDecimalBaseIterator = class LicuidDecimalBaseIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_isNumberCharacter: {value: isNumberCharacterRegex},
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchStartBrace, writable: true}
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartBrace(matchCharacter) {

		if (matchCharacter === '{') {
			this._matchFunction = this._matchContentOrEndBrace;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndBrace(matchCharacter) {

		if (this._isNumberCharacter.test(matchCharacter)) {
			return true;
		}

		// FIXME cannot mix numbers and letters

		if (matchCharacter === 'b'
			|| matchCharacter === 'q'
			|| matchCharacter === 's'
			|| matchCharacter === 'o'
			|| matchCharacter === 'd'
			|| matchCharacter === 'z'
			|| matchCharacter === 'x'
			|| matchCharacter === 'h'
			|| matchCharacter === 'm'
			|| matchCharacter === 'g'
			) {

			this._matchFunction = this._matchEndBrace;
			return true;
		}

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === '}') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		return false;

	}

	_matchEndBrace(matchCharacter) {

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === '}') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		this._hasNext = false;
		return false;

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



/**
 * Token for Licuid strings
 */
 const LicuidStringLiteralToken = class LicuidStringLiteralToken extends SourcePatternIteratorToken {
	constructor() {
		super('string', new LicuidStringPatternIterator());
	}
};



const LicuidStringPatternIterator = class LicuidStringPatternIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartQuote(matchCharacter) {

		if (matchCharacter === '`') {
			this._matchFunction = this._matchContentOrEndQuote;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndQuote(matchCharacter) {

		if (matchCharacter === '`') {
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



const LicuidNumberSpecToken = class LicuidNumberSpecToken extends SourcePatternIteratorToken {
	constructor() {
		super('numberDetails', new LicuidNumberSpecIterator());
	}
};



const LicuidNumberSpecIterator = class LicuidNumberSpecIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchStartBrace, writable: true}
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartBrace(matchCharacter) {

		if (matchCharacter === '{') {
			this._matchFunction = this._matchContentOrEndBrace;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndBrace(matchCharacter) {

		if (this._isLetterCharacter.test(matchCharacter)) {
			return true;
		}

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === '}') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		return false;

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



const LicuidStringI18nToken = class LicuidStringI18nToken extends SourcePatternIteratorToken {
	constructor() {
		super('i18n', new LicuidStringI18nIterator());
	}
};



const LicuidStringI18nIterator = class LicuidStringI18nIterator {

	constructor() {

		const context = this;

		Object.defineProperties(this, {
			_isLetterCharacter: {value: isLetterCharacterRegex},
			_hasNext: {value: true, writable: true},
			_isComplete: {value: false, writable: true},
			_matchFunction: {value: context._matchStartBrace, writable: true}
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
	next(matchCharacter, index) {
		return this._matchFunction(matchCharacter, index);
	}

	_matchStartBrace(matchCharacter) {

		if (matchCharacter === '{') {
			this._matchFunction = this._matchContentOrEndBrace;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchContentOrEndBrace(matchCharacter) {

		if (this._isLetterCharacter.test(matchCharacter)
			|| matchCharacter === '-' // TODO need some control over the placement of this
			) {

			return true;
		}

		// encontrou o caractere final
		// passa para a próxima função de match só pra fechar
		// no próximo next
		if (matchCharacter === '}') {
			this._matchFunction = this._matchEnd;
			return true;
		}

		return false;

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



/**
 * Token for Licuid meta information
 */
const LicuidMetaToken = class LicuidMetaToken extends SourcePatternIteratorToken {
	constructor() {
		super('meta', new LicuidMetaPatternIterator());
	}
};



/**
 * Token for Licuid symbols
 */
 const LicuidSymbolToken = class LicuidSymbolToken extends SourcePatternIteratorToken {
	constructor() {
		super('symbol', new LicuidSymbolIterator());
	}
};



const LicuidSymbolIterator = class LicuidSymbolIterator  extends SourcePatternIterator {

	constructor() {

		super();

		Object.defineProperties(this, {
			_isWordCharacter: {value: isWordCharacterRegex},
			_isLetterCharacter: {value: isLetterCharacterRegex}
		});

		Object.seal(this);

		this._matchFunction = this._matchBeginningValidCharacter;

	}

	_matchBeginningValidCharacter(matchCharacter) {

		if (matchCharacter !== null && this._isLetterCharacter.test(matchCharacter)) {
			this._matchFunction = this._matchValidCharacter;
			this._isComplete = true;
			return true;
		}

		if (matchCharacter === '_') {
			this._matchFunction = this._matchValidCharacter;
			return true;
		}

		this._hasNext = false;
		return false;

	}

	_matchValidCharacter(matchCharacter) {

		if (matchCharacter === '_'
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

};



const LicuidMetaPatternIterator = class LicuidMetaPatternIterator extends SourcePatternIterator {

	constructor() {
		super();
		this._matchFunction = this._matchHash;
		Object.seal(this);
	}

	_matchHash(matchCharacter) {
		if (matchCharacter === '#') {
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



// #endregion











/**
 * Highlights source code based on tokens map
 */
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

	async highlightAsync(source, tokens) {

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



export {
	HtmlLexer,
	RustLexer,
	GoLexer,
	CppLexer,
	ObjectiveCLexer,
	SwiftLexer,
	KotlinLexer,
	JavaLexer,
	CsLexer,
	JavaScriptLexer,
	// TypeScriptLexer,
	DartLexer,
	PythonLexer,
	PhpLexer,
	ActionScriptLexer,
	VisualBasic6Lexer,
	AdaLexer,
	ObjectPascalLexer,
	RubyLexer,
	// SmalltalkLexer,
	CommonLispLexer,
	HaskellLexer,
	FsLexer,
	WebAssemblyLexer,
	LlvmLexer,
	//AssemblyScriptLexer,
	//AssemblyLexer,
	LicuidLexerParser,
	LicuidSyntacticParser,
	LicuidSemanticParser,
	LicuidParser,
	Highlighter
};