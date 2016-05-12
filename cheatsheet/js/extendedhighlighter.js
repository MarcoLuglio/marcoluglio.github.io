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
 * Token for line comments
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
 * Token for block comments
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
				'nullptr',
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
				'false'

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
 * Token for basic punctuation. Far for the complete set :(
 */
define('CppPunctuationToken', ['JSSimpleCharacterSequenceToken'], (JSSimpleCharacterSequenceToken) => {

	const CppPunctuationToken = class CppPunctuationToken extends JSSimpleCharacterSequenceToken {

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



/**
 * Tokenizes C++ source code
 */
define(

	'CppLexer',

	[
		'Lexer',

		'CppKeywordToken',
		'CppTypesToken',
		'CppPunctuationToken',

		'CLineCommentToken',
		'CBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		CppKeywordToken,
		CppTypesToken,
		CppPunctuationToken,

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
			/*this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),
				new JSStringLiteralToken()
			);*/
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

				'break',
				'const',
				'for',
				'if',
				'return',
				'void',
				'while',

				// literals
				'true',
				'false'

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
 * Tokenizes Objective-C source code
 */
define(

	'ObjectiveCLexer',

	[
		'Lexer',

		'ObjCKeywordToken',
		'ObjCTypesToken',

		'CLineCommentToken',
		'CBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		ObjCKeywordToken,
		ObjCTypesToken,

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
				new ObjCKeywordToken(),
				new ObjCTypesToken(),
				// new CppPunctuationToken(),

				// comments
				new CLineCommentToken(),
				new CBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

			//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			/*this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),
				new JSStringLiteralToken()
			);*/
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

				'let',
				'var',

				// literals
				'true',
				'false'

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
 * Tokenizes Swift source code
 */
define(

	'SwiftLexer',

	[
		'Lexer',

		'SwiftKeywordToken',
		'SwiftTypesToken',

		'CLineCommentToken',
		//'NestedBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		SwiftKeywordToken,
		SwiftTypesToken,

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
				// new CppPunctuationToken(),

				// comments
				new CLineCommentToken()//,
				//new CBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

			//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			/*this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),
				new JSStringLiteralToken()
			);*/
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

				'fn',
				'let',
				'mut',

				// literals
				'true',
				'false'

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
				'f32',
				'f64',
				'i8',
				'i16',
				'i32',
				'i64',
				'isize',
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
 * Tokenizes Rust source code
 */
define(

	'RustLexer',

	[
		'Lexer',

		'RustKeywordToken',
		'RustTypesToken',

		'CLineCommentToken',
		//'NestedBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		RustKeywordToken,
		RustTypesToken,

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
				// new CppPunctuationToken(),

				// comments
				new CLineCommentToken()//,
				//new CBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

			//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			/*this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),
				new JSStringLiteralToken()
			);*/
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

				'class',
				'const',
				'dynamic',
				'private',
				'protected',
				'public',
				'static',
				'var',
				'void',

				// literals
				'true',
				'false'

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
 * Tokenizes C# source code
 */
define(

	'CsLexer',

	[
		'Lexer',

		'CSKeywordToken',
		'CSTypesToken',

		'CLineCommentToken',
		'CBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		CSKeywordToken,
		CSTypesToken,

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
				// new CppPunctuationToken(),

				// comments
				new CLineCommentToken(),
				new CBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

			//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			/*this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),
				new JSStringLiteralToken()
			);*/
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

				'class',
				'final',
				'private',
				'protected',
				'public',
				'static',
				'void',

				// literals
				'true',
				'false'

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
				'byte',
				'double',
				'float',
				'int',
				'long',
				'short',
				'String'
			]);

			Object.seal(this);

		}

	};

	return JavaTypesToken;

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

		'CLineCommentToken',
		'CBlockCommentToken',

		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'

	], (

		Lexer,

		JavaKeywordToken,
		JavaTypesToken,

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
				// new CppPunctuationToken(),

				// comments
				new CLineCommentToken(),
				new CBlockCommentToken()

			);

			this._pushLiteralTokens();
			this._pushInvisibleTokens();

			//this._tokenPool.push(new JSSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

		}

		_pushLiteralTokens() {
			/*this._tokenPool.splice(
				this._tokenPool.length,
				0,
				new JSDecimalLiteralToken(),
				new JSNumericLiteralToken(),
				new JSRegexLiteralToken(),
				new JSStringLiteralToken()
			);*/
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