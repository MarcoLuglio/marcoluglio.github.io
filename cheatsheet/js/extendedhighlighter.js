/* global define */

'use strict';



define('SourcePatternIterator', () => {

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

	return SourcePatternIterator;

});



define('SourceHtmlEmphasisPatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

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

	return SourceHtmlEmphasisPatternIterator;

});



define('SourceSimpleCharacterToken', ['Token'], (Token) => {

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

	return SourceSimpleCharacterToken;

});



define('SourcePatternIteratorToken', ['Token'], (Token) => {

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

	return SourcePatternIteratorToken;

});



/**
 * Token for keywords
 */
define('SourceSimpleCharacterSequenceToken', ['Token'], (Token) => {

	const SourceSimpleCharacterSequenceToken = class SourceSimpleCharacterSequenceToken extends Token {

		constructor(type, characterSequences) {

			super();

			Object.defineProperties(this, {
				type: {value: type},
				_previousMatchedKeyword: {value: null, writable: true},
				_matchedKeyword: {value: null, writable: true},
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
			this._completeNextTurn = false;
			this._keyword = null;
			this._keywordPointer = 0;
			this._resetKeywords();
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

	return SourceSimpleCharacterSequenceToken;

});



/**
 * Token for html markup inside code for emphasis
 */
define('HtmlEmphasisToken', ['SourcePatternIteratorToken', 'SourceHtmlEmphasisPatternIterator'], (SourcePatternIteratorToken, SourceHtmlEmphasisPatternIterator) => {

	const HtmlEmphasisToken = class HtmlEmphasisToken extends SourcePatternIteratorToken {
		constructor() {
			super('html', new SourceHtmlEmphasisPatternIterator());
			this.ignore = true;
		}
	};

	return HtmlEmphasisToken;

});



/**
 * Token for whitespace characters
 */
define('WhitespaceToken', ['SourceSimpleCharacterToken'], (SourceSimpleCharacterToken) => {

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

	return WhitespaceToken;

});



/**
 * Token for end of line characters
 */
define('EndOfLineToken', ['SourceSimpleCharacterToken'], (SourceSimpleCharacterToken) => {

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

	return EndOfLineToken;

});



define('CDirectivePatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

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

	return CDirectivePatternIterator;

});



define('CStringPatternIterator', () => {

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

	return CStringPatternIterator;

});



define('CLineCommentPatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

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

	return CLineCommentPatternIterator;

});



define('CBlockCommentPatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

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

	return CBlockCommentPatternIterator;

});



/**
 * Token for C directives
 */
define('CDirectiveToken', ['SourcePatternIteratorToken', 'CDirectivePatternIterator'], (SourcePatternIteratorToken, CDirectivePatternIterator) => {

	const CDirectiveToken = class CDirectiveToken extends SourcePatternIteratorToken {
		constructor() {
			super('directive', new CDirectivePatternIterator());
		}
	};

	return CDirectiveToken;

});



/**
 * Token for C strings
 */
define('CStringLiteralToken', ['SourcePatternIteratorToken', 'CStringPatternIterator'], (SourcePatternIteratorToken, CStringPatternIterator) => {

	const CStringLiteralToken = class CStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('string', new CStringPatternIterator());
		}
	};

	return CStringLiteralToken;

});



/**
 * Token for C line comments
 */
define('CLineCommentToken', ['SourcePatternIteratorToken', 'CLineCommentPatternIterator'], (SourcePatternIteratorToken, CLineCommentPatternIterator) => {

	const CLineCommentToken = class CLineCommentToken extends SourcePatternIteratorToken {
		constructor() {
			super('comment lineComment', new CLineCommentPatternIterator());
		}
	};

	return CLineCommentToken;

});



/**
 * Token for C block comments
 */
define('CBlockCommentToken', ['SourcePatternIteratorToken', 'CBlockCommentPatternIterator'], (SourcePatternIteratorToken, CBlockCommentPatternIterator) => {

	const CBlockCommentToken = class CBlockCommentToken extends SourcePatternIteratorToken {
		constructor() {
			super('comment blockComment', new CBlockCommentPatternIterator());
		}
	};

	return CBlockCommentToken;

});



/**
 * Token for C++ keywords
 */
define('CppKeywordToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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
				'inline',

				//'import',
				//'module',

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
				'void',
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
				'&lt;%',
				'%&gt;',
				'&lt;:',
				':&gt;',
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
				'async'
				// 'begin',
				// 'end'

			]);

			Object.seal(this);

		}

	};

	return CppKeywordToken;

});



/**
 * Token for C++ types
 */
define('CppTypesToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const CppTypesToken = class CppTypesToken extends SourceSimpleCharacterSequenceToken {

		constructor() {
			super('type', [

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

				'exception',
				'lock_guard',
				'mutex',
				'nullptr_t',
				'optional',
				'queue',
				'string',
				'thread'

			]);

			Object.seal(this);

		}

	};

	return CppTypesToken;

});



/**
 * Token for C++ punctuation
 */
define('CppPunctuationToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const CppPunctuationToken = class CppPunctuationToken extends SourceSimpleCharacterSequenceToken {

		constructor() {

			super('operator', [
				'.',
				'.*',
				'-&gt;',
				'-&gt;*',
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
				'%=',

				'&amp;=', // bitwise and
				'|=', // bitwise or
				'^=', // bitwise xor
				// '~=', // bitwise not não existe
				'&gt;&gt;=', // bitwise left shift
				'&lt;&lt;=', // bitwise right shift

				'...'

			]);

		}

	};

	return CppPunctuationToken;

});



define('CppStringPatternIterator', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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

	return CppStringPatternIterator;

});



/**
 * Token for raw strings
 */
define('CppStringLiteralToken', ['SourcePatternIteratorToken', 'CppStringPatternIterator'], (SourcePatternIteratorToken, CppStringPatternIterator) => {

	const CppStringLiteralToken = class CppStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('rstring', new CppStringPatternIterator());
		}
	};

	return CppStringLiteralToken;

});



/**
 * Tokenizes C++ source code
 */
define(

	'CppLexer',

	[
		'Lexer',

		'CDirectiveToken',
		'CppKeywordToken',
		'CppTypesToken',
		'CppPunctuationToken',
		'CStringLiteralToken',
		'CppStringLiteralToken',

		'CLineCommentToken',
		'CBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		CDirectiveToken,
		CppKeywordToken,
		CppTypesToken,
		CppPunctuationToken,
		CStringLiteralToken,
		CppStringLiteralToken,

		CLineCommentToken,
		CBlockCommentToken,

		HtmlEmphasisToken,
		WhitespaceToken,
		EndOfLineToken

	) => {

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

			//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				/*new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),*/
				new CStringLiteralToken(),
				new CppStringLiteralToken()
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

	return CppLexer;

});



/**
 * Token for Objective-C keywords
 */
define('ObjCKeywordToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const ObjCKeywordToken = class ObjCKeywordToken extends SourceSimpleCharacterSequenceToken {

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

				'break',
				'const',
				'for',
				'if',
				'return',
				'typedef',
				'void',
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
				'NULL'

			]);

			Object.seal(this);

		}

	};

	return ObjCKeywordToken;

});



/**
 * Token for Objective-C types
 */
define('ObjCTypesToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const ObjCTypesToken = class ObjCTypesToken extends SourceSimpleCharacterSequenceToken {

		constructor() {
			super('type', [

				'bool',
				'BOOL', // TODO verificar bool e BOOL
				'char',
				'double',
				'float',
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
				'NSString',
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
				'uintptr_t'

			]);

			Object.seal(this);

		}

	};

	return ObjCTypesToken;

});



/**
 * Token for Objective-C punctuation
 */
define('ObjCPunctuationToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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

	return ObjCPunctuationToken;

});



define('ObjCStringPatternIterator', () => {

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

	return ObjCStringPatternIterator;

});



/**
 * Token for strings
 */
define('ObjCStringLiteralToken', ['SourcePatternIteratorToken', 'ObjCStringPatternIterator'], (SourcePatternIteratorToken, ObjCStringPatternIterator) => {

	const ObjCStringLiteralToken = class ObjCStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('objcstring', new ObjCStringPatternIterator());
		}
	};

	return ObjCStringLiteralToken;

});



/**
 * Tokenizes Objective-C source code
 */
define(

	'ObjectiveCLexer',

	[
		'Lexer',

		'CDirectiveToken',
		'ObjCKeywordToken',
		'ObjCTypesToken',
		'ObjCPunctuationToken',
		'CStringLiteralToken',
		'ObjCStringLiteralToken',

		'CLineCommentToken',
		'CBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		CDirectiveToken,
		ObjCKeywordToken,
		ObjCTypesToken,
		ObjCPunctuationToken,
		CStringLiteralToken,
		ObjCStringLiteralToken,

		CLineCommentToken,
		CBlockCommentToken,

		HtmlEmphasisToken,
		WhitespaceToken,
		EndOfLineToken

	) => {

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
				/*new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),*/
				new CStringLiteralToken(),
				new ObjCStringLiteralToken()
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

	return ObjectiveCLexer;

});



/**
 * Token for Swift keywords
 */
define('SwiftKeywordToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const SwiftKeywordToken = class SwiftKeywordToken extends SourceSimpleCharacterSequenceToken {

		constructor() {
			super('keyword', [

				'@IBAction',
				'@IBDesignable',
				'@IBInspectable',
				'@IBOutlet',
				'@objc',
				'@UIApplicationMain',

				'#selector',

				'as',
				'case',
				'catch',
				'class',
				'default',
				'defer',
				'deinit',
				'didSet',
				'do',
				'enum',
				'final',
				'for',
				'func',
				'get',
				'if',
				'import',
				'in',
				'init',
				'is',
				'lazy',
				'let',
				'override',
				'private',
				'public',
				'required',
				'return',
				'self',
				'set',
				'static',
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

	return SwiftKeywordToken;

});



/**
 * Token for Swift types
 */
define('SwiftTypesToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const SwiftTypesToken = class SwiftTypesToken extends SourceSimpleCharacterSequenceToken {

		constructor() {
			super('type', [

				'Any',
				'Array',
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
				'NSString',
				'String',
				'NSException',
				'ErrorType'

				// TODO Coloco os compatibilidade com C?

			]);

			Object.seal(this);

		}

	};

	return SwiftTypesToken;

});



/**
 * Token for Swift punctuation
 */
define('SwiftPunctuationToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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
				'...'

			]);

		}

	};

	return SwiftPunctuationToken;

});



define('SwiftStringPatternIterator', () => {

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

	return SwiftStringPatternIterator;

});



/**
 * Token for Swift strings
 */
define('SwiftStringLiteralToken', ['SourcePatternIteratorToken', 'SwiftStringPatternIterator'], (SourcePatternIteratorToken, SwiftStringPatternIterator) => {

	const SwiftStringLiteralToken = class SwiftStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('string', new SwiftStringPatternIterator());
		}
	};

	return SwiftStringLiteralToken;

});



/**
 * Token for Swift directives
 */
define('SwiftDirectiveToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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

	return SwiftDirectiveToken;

});



/**
 * Tokenizes Swift source code
 */
define(

	'SwiftLexer',

	[
		'Lexer',

		'SwiftKeywordToken',
		'SwiftTypesToken',
		'SwiftPunctuationToken',
		'SwiftStringLiteralToken',

		'CLineCommentToken',
		//'NestedBlockCommentToken',
		'SwiftDirectiveToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		SwiftKeywordToken,
		SwiftTypesToken,
		SwiftPunctuationToken,
		SwiftStringLiteralToken,

		CLineCommentToken,
		//NestedBlockCommentToken,
		SwiftDirectiveToken,

		HtmlEmphasisToken,
		WhitespaceToken,
		EndOfLineToken

	) => {

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
				//new CBlockCommentToken(),
				new SwiftDirectiveToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

			//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				/*new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),*/
				new SwiftStringLiteralToken()
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

	return SwiftLexer;

});



/**
 * Token for Rust keywords
 */
define('RustKeywordToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const RustKeywordToken = class RustKeywordToken extends SourceSimpleCharacterSequenceToken {

		constructor() {
			super('keyword', [

				'as',
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

			]);

			Object.seal(this);

		}

	};

	return RustKeywordToken;

});



/**
 * Token for Rust types
 */
define('RustTypesToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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
				'Option',
				'String',
				'thread'

			]);

			Object.seal(this);

		}

	};

	return RustTypesToken;

});



/**
 * Token for Rust punctuation
 */
define('RustPunctuationToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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
				//'?',
				':',
				'::',
				';',

				'&amp;&amp;',
				'||',
				'&amp;', // bitwise and
				'&amp;mut',
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
				'...'

			]);

		}

	};

	return RustPunctuationToken;

});



define('RustDecimalPatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

	const RustDecimalPatternIterator = class RustDecimalPatternIterator extends SourcePatternIterator {

		constructor() {
			super();
			Object.defineProperties(this, {
				_hasMantissa: {value: false, writable: true},
				_isNumberCharacter: {value: /\d/},
				_canUseSeparator: {value: false, writable: true},
				_sufficType:  {value: '', writable: true},
				_suffixBuffer: {value: '', writable: true}
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
				return true;
			}

			if (matchCharacter === '.' && !this._hasMantissa) {
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

	};

	return RustDecimalPatternIterator;

});



/**
 * Token for decimal numbers
 */
define('RustDecimalLiteralToken', ['SourcePatternIteratorToken', 'RustDecimalPatternIterator'], (SourcePatternIteratorToken, RustDecimalPatternIterator) => {

	const RustDecimalLiteralToken = class RustDecimalLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('number', new RustDecimalPatternIterator());
		}
	};

	return RustDecimalLiteralToken;

});



define('RustStringPatternIterator', () => {

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

	return RustStringPatternIterator;

});



/**
 * Token for Rust strings
 */
define('RustStringLiteralToken', ['SourcePatternIteratorToken', 'RustStringPatternIterator'], (SourcePatternIteratorToken, RustStringPatternIterator) => {

	const RustStringLiteralToken = class RustStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('string', new RustStringPatternIterator());
		}
	};

	return RustStringLiteralToken;

});



define('RustAttributePatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

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

	return RustAttributePatternIterator;

});



/**
 * Token for Rust attributes
 */
define('RustAttributeToken', ['SourcePatternIteratorToken', 'RustAttributePatternIterator'], (SourcePatternIteratorToken, RustAttributePatternIterator) => {

	const RustAttributeToken = class RustAttributeToken extends SourcePatternIteratorToken {
		constructor() {
			super('attribute', new RustAttributePatternIterator());
		}
	};

	return RustAttributeToken;

});



define('RustSymbolIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

	const RustSymbolIterator = class RustSymbolIterator  extends SourcePatternIterator {

		constructor() {

			super();

			Object.defineProperties(this, {
				_isWordCharacter: {value: /\w/},
				_isNumberCharacter: {value: /\d/}
			});

			Object.seal(this);

			this._matchFunction = this._matchValidCharacter;

		}

		_matchValidCharacter(matchCharacter) {

			if (matchCharacter === '_'
				|| this._isNumberCharacter.test(matchCharacter)
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

	return RustSymbolIterator;

});

/**
 * Token for Rust symbols
 */
define('RustSymbolToken', ['SourcePatternIteratorToken', 'RustSymbolIterator'], (SourcePatternIteratorToken, RustSymbolIterator) => {

	const RustSymbolToken = class RustSymbolToken extends SourcePatternIteratorToken {
		constructor() {
			super('symbol', new RustSymbolIterator());
		}
	};

	return RustSymbolToken;

});



define('RustLifetimePatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

	const RustLifetimePatternIterator = class RustLifetimePatternIterator extends SourcePatternIterator {

		constructor() {
			super();
			Object.defineProperties(this, {
				_isWordCharacter: {value: /\w/},
				_length: {value: 0, writable: true}
			});
			this._matchFunction = this._matchStartQuote;
			Object.seal(this);
		}

		_matchStartQuote(matchCharacter) {
			if (matchCharacter === "'") {
				this._matchFunction = this._matchContentOrEnd;
				return true;
			}
			this._hasNext = false;
			return false;
		}

		_matchContentOrEnd(matchCharacter) {

			if (!this._isWordCharacter.test(matchCharacter)
				&& this._length > 0
				) {

				this._isComplete = true;
				return this._matchEnd(matchCharacter);
			}

			this._length += 1;
			return true;

		}

	};

	return RustLifetimePatternIterator;

});



/**
 * Token for lifetimes
 */
define('RustLifetimeToken', ['SourcePatternIteratorToken', 'RustLifetimePatternIterator'], (SourcePatternIteratorToken, RustLifetimePatternIterator) => {

	const RustLifetimeToken = class RustLifetimeToken extends SourcePatternIteratorToken {
		constructor() {
			super('lifetime', new RustLifetimePatternIterator());
		}
	};

	return RustLifetimeToken;

});



/**
 * Tokenizes Rust source code
 */
define(

	'RustLexer',

	[
		'Lexer',

		'RustKeywordToken',
		'RustTypesToken',
		'RustPunctuationToken',
		'RustDecimalLiteralToken',
		'RustStringLiteralToken',
		'RustAttributeToken',
		'RustLifetimeToken',

		'RustSymbolToken',

		'CLineCommentToken',
		//'NestedBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		RustKeywordToken,
		RustTypesToken,
		RustPunctuationToken,
		RustDecimalLiteralToken,
		RustStringLiteralToken,
		RustAttributeToken,
		RustLifetimeToken,

		RustSymbolToken,

		CLineCommentToken,
		//NestedBlockCommentToken,

		HtmlEmphasisToken,
		WhitespaceToken,
		EndOfLineToken

	) => {

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
				new CLineCommentToken()//,
				//new CBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

			this._tokenPool.push(new RustSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new RustDecimalLiteralToken(),
				//new JSNumericLiteralToken(),
				new RustStringLiteralToken()
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

	return RustLexer;

});



/**
 * Token for C# keywords
 */
define('CSKeywordToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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
				'void',
				'volatile',
				'while',
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

	return CSKeywordToken;

});



/**
 * Token for C# types
 */
define('CSTypesToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const CSTypesToken = class CSTypesToken extends SourceSimpleCharacterSequenceToken {

		constructor() {
			super('type', [

				'bool',
				'byte',
				'decimal',
				'double',
				'float',
				'int',
				'long',
				'object',

				'sbyte',
				'short',
				'string',
				'ushort',
				'uint',
				'ulong',

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

				'Exception'

			]);

			Object.seal(this);

		}

	};

	return CSTypesToken;

});



/**
 * Token for C# punctuation
 */
define('CSPunctuationToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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
				'&lt;&lt;=' // bitwise right shift

			]);

		}

	};

	return CSPunctuationToken;

});



define('CSDecimalPatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

	const CSDecimalPatternIterator = class CSDecimalPatternIterator extends SourcePatternIterator {

		constructor() {
			super();
			Object.defineProperties(this, {
				_hasMantissa: {value: false, writable: true},
				_isNumberCharacter: {value: /\d/}
			});
			this._matchFunction = this._matchNumber;
			Object.seal(this);
		}

		// pode ter u, l, ul, lu, f, d, m no final tanto em caixa alta quanto baixa
		// pode ter _ separando os números

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

	return CSDecimalPatternIterator;

});



/**
 * Token for decimal numbers
 */
define('CSDecimalLiteralToken', ['SourcePatternIteratorToken', 'CSDecimalPatternIterator'], (SourcePatternIteratorToken, CSDecimalPatternIterator) => {

	const CSDecimalLiteralToken = class CSDecimalLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('number', new CSDecimalPatternIterator());
		}
	};

	return CSDecimalLiteralToken;

});



define('CSNumberPatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

	const CSNumberPatternIterator = class CSNumberPatternIterator extends SourcePatternIterator {

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

		binario só na próxima versão
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

			/*if (lowerMatchCharacter === 'b') {
				this._matchCheck = this._isBinary;
				return true;
			}*/

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

		/*_isBinary(matchCharacter) {

			if (matchCharacter === '0' || matchCharacter === '1') {
				return true;
			}

			let lowerMatchCharacter = matchCharacter.toLowerCase();
			if (this._isComplete
				&& (lowerMatchCharacter == 'u'
					|| lowerMatchCharacter == 'l'
					|| lowerMatchCharacter == 'f'
					|| lowerMatchCharacter == 'd'
					|| lowerMatchCharacter == 'm'
					)
				) {

				return true;
			}

			return false;

		}*/

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

			if (this._matchSuffix(matchCharacter)) {
				return true;
			}

			return false;

		}

	};

	return CSNumberPatternIterator;

});



/**
 * Token for hexadecimal numbers
 * Binary numbers are disabled for now
 */
define('CSNumericLiteralToken', ['SourcePatternIteratorToken', 'CSNumberPatternIterator'], (SourcePatternIteratorToken, CSNumberPatternIterator) => {

	const CSNumericLiteralToken = class CSNumericLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('number', new CSNumberPatternIterator());
		}
	};

	return CSNumericLiteralToken;

});



define('CSStringPatternIterator', () => {

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

	return CSStringPatternIterator;

});



/**
 * Token for C# strings
 */
define('CSStringLiteralToken', ['SourcePatternIteratorToken', 'CSStringPatternIterator'], (SourcePatternIteratorToken, CSStringPatternIterator) => {

	const CSStringLiteralToken = class CSStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('string', new CSStringPatternIterator());
		}
	};

	return CSStringLiteralToken;

});



define('CSVerbatimStringPatternIterator', () => {

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

	return CSVerbatimStringPatternIterator;

});



/**
 * Token for C# verbatim (@) strings
 */
define('CSVerbatimStringLiteralToken', ['SourcePatternIteratorToken', 'CSVerbatimStringPatternIterator'], (SourcePatternIteratorToken, CSVerbatimStringPatternIterator) => {

	const CSVerbatimStringLiteralToken = class CSVerbatimStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('vstring', new CSVerbatimStringPatternIterator());
		}
	};

	return CSVerbatimStringLiteralToken;

});



define('CSInterpolatedStringPatternIterator', () => {

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

	return CSInterpolatedStringPatternIterator;

});



/**
 * Token for C# interpolated ($) strings
 */
define('CSInterpolatedStringLiteralToken', ['SourcePatternIteratorToken', 'CSInterpolatedStringPatternIterator'], (SourcePatternIteratorToken, CSInterpolatedStringPatternIterator) => {

	const CSInterpolatedStringLiteralToken = class CSInterpolatedStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('istring', new CSInterpolatedStringPatternIterator());
		}
	};

	return CSInterpolatedStringLiteralToken;

});

// var names começam com letras _ ou @
// @ não pode colidir com nomes iguais sem @
// @ permite distinguir nomes de palavras-chave
// por exemplo @yield é um nome válido

define('CSSymbolIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

	const CSSymbolIterator = class CSSymbolIterator  extends SourcePatternIterator {

		constructor() {

			super();

			Object.defineProperties(this, {
				_isWordCharacter: {value: /\w/},
				_isNumberCharacter: {value: /\d/}
			});

			Object.seal(this);

			this._matchFunction = this._matchValidCharacter;

		}

		_matchValidCharacter(matchCharacter) {

			if (matchCharacter === '_'
				|| matchCharacter === '@'
				|| this._isNumberCharacter.test(matchCharacter)
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

	return CSSymbolIterator;

});

/**
 * Token for C# symbols
 */
define('CSSymbolToken', ['SourcePatternIteratorToken', 'CSSymbolIterator'], (SourcePatternIteratorToken, CSSymbolIterator) => {

	const CSSymbolToken = class CSSymbolToken extends SourcePatternIteratorToken {
		constructor() {
			super('symbol', new CSSymbolIterator());
		}
	};

	return CSSymbolToken;

});

/**
 * Tokenizes C# source code
 */
define(

	'CsLexer',

	[
		'Lexer',

		'CSKeywordToken',
		'CSTypesToken',
		'CSPunctuationToken',

		'CSDecimalLiteralToken',
		'CSNumericLiteralToken',

		'CSStringLiteralToken',
		'CSVerbatimStringLiteralToken',
		'CSInterpolatedStringLiteralToken',

		'CSSymbolToken',

		'CLineCommentToken',
		'CBlockCommentToken',
		'CDirectiveToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		CSKeywordToken,
		CSTypesToken,
		CSPunctuationToken,

		CSDecimalLiteralToken,
		CSNumericLiteralToken,

		CSStringLiteralToken,
		CSVerbatimStringLiteralToken,
		CSInterpolatedStringLiteralToken,

		CSSymbolToken,

		CLineCommentToken,
		CBlockCommentToken,
		CDirectiveToken,

		HtmlEmphasisToken,
		WhitespaceToken,
		EndOfLineToken

	) => {

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
				new CSInterpolatedStringLiteralToken()
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

	};

	return CsLexer;

});



/**
 * Token for Java keywords
 */
define('JavaKeywordToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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
				'package',
				'private',
				'protected',
				'public',
				'return',
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
				'void',
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

	return JavaKeywordToken;

});



/**
 * Token for Java types
 */
define('JavaTypesToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

	const JavaTypesToken = class JavaTypesToken extends SourceSimpleCharacterSequenceToken {

		constructor() {
			super('type', [

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
				'RuntimeException'

			]);

			Object.seal(this);

		}

	};

	return JavaTypesToken;

});



/**
 * Token for Java punctuation
 */
define('JavaPunctuationToken', ['SourceSimpleCharacterSequenceToken'], (SourceSimpleCharacterSequenceToken) => {

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

				'...'

			]);

		}

	};

	return JavaPunctuationToken;

});



define('JavaStringPatternIterator', () => {

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

	return JavaStringPatternIterator;

});



/**
 * Token for Java strings
 */
define('JavaStringLiteralToken', ['SourcePatternIteratorToken', 'JavaStringPatternIterator'], (SourcePatternIteratorToken, JavaStringPatternIterator) => {

	const JavaStringLiteralToken = class JavaStringLiteralToken extends SourcePatternIteratorToken {
		constructor() {
			super('string', new JavaStringPatternIterator());
		}
	};

	return JavaStringLiteralToken;

});



define('JavaAnnotationPatternIterator', ['SourcePatternIterator'], (SourcePatternIterator) => {

	const JavaAnnotationPatternIterator = class JavaAnnotationPatternIterator extends SourcePatternIterator {

		constructor() {
			super();
			Object.defineProperties(this, {
				_allowSpaceCharacter: {value: false, writable: true},
				_isSpaceCharacter: {value: /\s/}
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

			if (this._matchLineBreak(matchCharacter)
				&& this._isComplete
				) {

				return this._matchEnd(matchCharacter);
			}

			this._hasNext = false;
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

	return JavaAnnotationPatternIterator;

});



/**
 * Token for Java annotations
 */
define('JavaAnnotationToken', ['SourcePatternIteratorToken', 'JavaAnnotationPatternIterator'], (SourcePatternIteratorToken, JavaAnnotationPatternIterator) => {

	const JavaAnnotationToken = class JavaAnnotationToken extends SourcePatternIteratorToken {
		constructor() {
			super('annotation', new JavaAnnotationPatternIterator());
		}
	};

	return JavaAnnotationToken;

});



/**
 * Tokenizes Java source code
 */
define(

	'JavaLexer',

	[
		'Lexer',

		'JavaKeywordToken',
		'JavaTypesToken',
		'JavaPunctuationToken',
		'JavaStringLiteralToken',
		'JavaAnnotationToken',

		'CLineCommentToken',
		'CBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		JavaKeywordToken,
		JavaTypesToken,
		JavaPunctuationToken,
		JavaStringLiteralToken,
		JavaAnnotationToken,

		CLineCommentToken,
		CBlockCommentToken,

		HtmlEmphasisToken,
		WhitespaceToken,
		EndOfLineToken

	) => {

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

			//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			this._tokenPool.splice(
				this._tokenPool.length,
				0,
				/*new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),*/
				new JavaStringLiteralToken()
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

	return JavaLexer;

});