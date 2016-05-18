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
				'NULL'

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
				'uintptr_t'

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
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),*/
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

				'@interface',
				'@implementation',
				'@end',
				'@synthesize',

				'break',
				'const',
				'for',
				'if',
				'return',
				'void',
				'while',

				// literals
				'true',
				'false',
				'YES',
				'NO',
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
				'NSInteger',
				'NSNumber',
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
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),*/
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
				'@UIApplicationMain',

				'as',
				'case',
				'class',
				'default',
				'deinit',
				'didSet',
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
				'var',
				'weak',

				// literals
				'true',
				'false',
				'nil'

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

				'Double',
				'Float',
				'Int',
				'Int8',
				'Int16',
				'Int32',
				'Int64',
				'UInt',
				'UInt8',
				'UInt16',
				'UInt32',
				'UInt64'

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
				'&amp;/', // / ignore overflow
				'%',
				'&amp;%', // % ignore overflow
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
				new CLineCommentToken()//,
				//new CBlockCommentToken()

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
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),*/
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
				'mut',
				'pub',
				'ref',
				'return',
				'self',
				'static',
				'struct',
				'trait',
				'type',
				'unsafe',
				'use',
				'while',

				// literals
				'true',
				'false',
				'None', // Option<T>
				'Some' // Option<T>
				// não tem null, usar ptr::null

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
				'usize'
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
		'RustStringLiteralToken',

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
		RustStringLiteralToken,

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

				// comments
				new CLineCommentToken()//,
				//new CBlockCommentToken()

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
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),*/
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
				'ulong'
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
		'CSStringLiteralToken',
		'CSVerbatimStringLiteralToken',
		'CSInterpolatedStringLiteralToken',

		'CLineCommentToken',
		'CBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		CSKeywordToken,
		CSTypesToken,
		CSPunctuationToken,
		CSStringLiteralToken,
		CSVerbatimStringLiteralToken,
		CSInterpolatedStringLiteralToken,

		CLineCommentToken,
		CBlockCommentToken,

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

			this._tokenPool.splice(

				0,
				this._tokenPool.length,

				// language
				new CSKeywordToken(),
				new CSTypesToken(),
				new CSPunctuationToken(),

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
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),*/
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
				'String'
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
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),*/
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