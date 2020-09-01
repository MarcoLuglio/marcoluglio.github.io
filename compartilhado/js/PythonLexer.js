//



// workaround while I don't migrate AMD to ES6 modules

let Lexer;
let SourceSimpleCharacterSequenceToken;
let CStringLiteralToken;
let HtmlEmphasisToken;
let WhitespaceToken;
let EndOfLineToken;
let SourcePatternIteratorToken;
let SourcePatternIterator;

define(

	'PythonLegacyAMD',

	[
		'Lexer',
		'SourceSimpleCharacterSequenceToken',
		'CStringLiteralToken',
		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken',
		'SourcePatternIteratorToken',
		'SourcePatternIterator'
	], (
		AMDLexer,
		AMDSourceSimpleCharacterSequenceToken,
		AMDCStringLiteralToken,
		AMDHtmlEmphasisToken,
		AMDWhitespaceToken,
		AMDEndOfLineToken,
		AMDSourcePatternIteratorToken,
		AMDSourcePatternIterator
	) => {
		Lexer = AMDLexer;
		SourceSimpleCharacterSequenceToken = AMDSourceSimpleCharacterSequenceToken;
		CStringLiteralToken = AMDCStringLiteralToken;
		HtmlEmphasisToken = AMDHtmlEmphasisToken;
		WhitespaceToken = AMDWhitespaceToken;
		EndOfLineToken = AMDEndOfLineToken;
		SourcePatternIteratorToken = AMDSourcePatternIteratorToken;
		SourcePatternIterator = AMDSourcePatternIterator;
	}
);



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
			new CStringLiteralToken() // TODO check JavaScript string, looks more like it
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

			'def',
			'None',
			'True',
			'False'

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
			':',
			'=',
			'(',
			')',
			'[',
			']',
			'{',
			'}',
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



export { PythonLexer }