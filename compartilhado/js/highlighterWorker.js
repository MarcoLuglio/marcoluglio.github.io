import {
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
	//SmalltalkLexer,
	CommonLispLexer,
	HaskellLexer,
	FsLexer,
	/*AssemblyScriptLexer,
	LLVMLexer,
	AssemblyLexer,*/
	LicuidLexerParser,
	LicuidSyntacticParser,
	LicuidSemanticParser,
	LicuidParser,
	Highlighter
} from './highlighter.js';



const highlighter = new Highlighter();

self.onmessage = async function (message) {

	const codeBlocksIndex = message.data[0];
	const codeBlockIndex = message.data[1];
	const parser = message.data[2];
	const source = message.data[3];

	let lexerParser;

	// TODO avoid recreating lexers

	switch (parser) {

		case 'html':
			lexerParser = new HtmlLexer();
			break;

		case 'rust':
			lexerParser = new RustLexer();
			break;

		case 'go':
			lexerParser = new GoLexer();
			break;

		case 'cpp':
			lexerParser = new CppLexer();
			break;

		case 'objectivec':
			lexerParser = new ObjectiveCLexer();
			break;

		case 'swift':
			lexerParser = new SwiftLexer();
			break;

		case 'kotlin':
			lexerParser = new KotlinLexer();
			break;

		case 'java':
			lexerParser = new JavaLexer();
			break;

		case 'cs':
			lexerParser = new CsLexer();
			break;

		case 'javascript':
			lexerParser = new JavaScriptLexer();
			break;

		case 'actionscript':
			lexerParser = new ActionScriptLexer();
			break;

		/*case 'typescript':
			lexerParser = new TypeScriptLexer();
			break;*/

		case 'dart':
			lexerParser = new DartLexer();
			break;

		case 'python':
			lexerParser = new PythonLexer();
			break;

		case 'php':
			lexerParser = new PhpLexer();
			break;

		case 'visualbasic':
			lexerParser = new VisualBasic6Lexer();
			break;

		case 'ada':
			lexerParser = new AdaLexer();
			break;

		case 'objectpascal':
			lexerParser = new ObjectPascalLexer();
			break;

		case 'ruby':
			lexerParser = new RubyLexer();
			break;

		/*case 'smalltalk':
			lexerParser = new SmalltalkLexer();
			break;*/

		case 'commonlisp':
			lexerParser = new CommonLispLexer();
			break;

		case 'haskell':
			lexerParser = new HaskellLexer();
			break;

		case 'fs':
			lexerParser = new FsLexer();
			break;

		case 'licuid':
			lexerParser = new LicuidLexerParser();
			/*const syntacticParser = new LicuidSyntacticParser();
			const semanticParser = new LicuidSemanticParser();
			const licuidParser = new LicuidParser(lexerParser, syntacticParser, semanticParser);*/
			break;

		default:
			self.postMessage([codeBlocksIndex, codeBlockIndex, source]);
			return;

	}

	const tokens = await lexerParser.parseAsync(source);
	const highlightedSource = await highlighter.highlightAsync(source, tokens);
	self.postMessage([codeBlocksIndex, codeBlockIndex, highlightedSource]);

	/*
		.then((tokens) => {
			return highlighter.highlightAsync(source, tokens);
		})
		.then((highlightedSource) => {
			self.postMessage([codeBlocksIndex, codeBlockIndex, highlightedSource]);
		});
	*/

}