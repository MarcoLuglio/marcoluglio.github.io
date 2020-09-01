//



// workaround while I don't migrate AMD to ES6 modules

let Lexer;
let SourceSimpleCharacterSequenceToken;
let CLineCommentToken;
let CBlockCommentToken;
let CStringLiteralToken;
let HtmlEmphasisToken;
let WhitespaceToken;
let EndOfLineToken;

define(

	'GoLegacyAMD',

	[
		'Lexer',
		'SourceSimpleCharacterSequenceToken',
		'CLineCommentToken',
		'CBlockCommentToken',
		'CStringLiteralToken',
		'HtmlEmphasisToken',
		'WhitespaceToken',
		'EndOfLineToken'
	], (
		AMDLexer,
		AMDSourceSimpleCharacterSequenceToken,
		AMDCLineCommentToken,
		AMDCBlockCommentToken,
		AMDCStringLiteralToken,
		AMDHtmlEmphasisToken,
		AMDWhitespaceToken,
		AMDEndOfLineToken
	) => {
		Lexer = AMDLexer;
		SourceSimpleCharacterSequenceToken = AMDSourceSimpleCharacterSequenceToken;
		CLineCommentToken = AMDCLineCommentToken;
		CBlockCommentToken = AMDCBlockCommentToken;
		CStringLiteralToken = AMDCStringLiteralToken;
		HtmlEmphasisToken = AMDHtmlEmphasisToken;
		WhitespaceToken = AMDWhitespaceToken;
		EndOfLineToken = AMDEndOfLineToken;
	}
);



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
			new CLineCommentToken(),
			new CBlockCommentToken()

		);

		this._pushLiteralTokens();
		this._pushInvisibleTokens();
		//this._tokenPool.push(new GoSymbolToken()); //  DEIXE POR ÚLTIMO para garantir que alternativas mais específicas sejam priorizadas

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
 * Token for Go keywords
 */
const GoKeywordToken = class GoKeywordToken  extends SourceSimpleCharacterSequenceToken {

	constructor() {
		super('keyword', [

			// TODO check if they are actually used, or just reserved
			'break',
			'default',
			'func',
			'interface',
			'select',
			'case',
			'defer',
			'go',
			'map',
			'struct',
			'chan',
			'else',
			'goto',
			'package',
			'switch',
			'const',
			'fallthrough',
			'if',
			'range',
			'type',
			'continue',
			'for',
			'import',
			'return',
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
			'uint16',
			'uint32',
			'uint64',
			'int8',
			'int16',
			'int32',
			'int64',
			'float32',
			'float64',
			'complex64',
			'complex128',
			'byte',
			'rune',
			'uint',
			'int',
			'uintptr',
			'string',
			'bool'

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
			'+=',
			'&=',
			'&&',
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
			'<=',
			'[',
			']',
			'*',
			'^',
			'*=',
			'^=',
			'<-',
			'>',
			'>=',
			'{',
			'}',
			'/',
			'<<',
			'/=',
			'<<=',
			'++',
			'=',
			':=',
			',',
			';',
			'%',
			'>>',
			'%=',
			'>>=',
			'--',
			'!',
			'...',
			'.',
			':',
			'&^',
			'&^='

		]);

		Object.seal(this);

	}

};



export { GoLexer }