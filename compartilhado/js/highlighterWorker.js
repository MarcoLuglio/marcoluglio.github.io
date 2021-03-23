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
	/*ActionScriptLexer,
	TypeScriptLexer,*/
	DartLexer,
	PythonLexer,
	// PhpLexer,
	VisualBasic6Lexer,
	AdaLexer,
	ObjectPascalLexer,
	/*RubyLexer,
	SmalltalkLexer,
	CommonLispLexer,
	HaskellLexer,
	AssemblyScriptLexer,
	LLVMLexer,
	AssemblyLexer,*/
	Highlighter
} from './highlighter.js';



const highlighter = new Highlighter();

self.onmessage = function (message) {

	const codeBlocksIndex = message.data[0];
	const codeBlockIndex = message.data[1];
	const parser = message.data[2];
	const source = message.data[3];

	let lexer;

	// TODO avoid recreating lexers

	switch (parser) {

		case 'html':
			lexer = new HtmlLexer();
			break;

		case 'rust':
			lexer = new RustLexer();
			break;

		case 'go':
			lexer = new GoLexer();
			break;

		case 'cpp':
			lexer = new CppLexer();
			break;

		case 'objectivec':
			lexer = new ObjectiveCLexer();
			break;

		case 'swift':
			lexer = new SwiftLexer();
			break;

		case 'kotlin':
			lexer = new KotlinLexer();
			break;

		case 'java':
			lexer = new JavaLexer();
			break;

		case 'cs':
			lexer = new CsLexer();
			break;

		case 'javascript':
			lexer = new JavaScriptLexer();
			break;

		case 'dart':
			lexer = new DartLexer();
			break;

		case 'python':
			lexer = new PythonLexer();
			break;

		case 'visualbasic':
			lexer = new VisualBasic6Lexer();
			break;

		case 'ada':
			lexer = new AdaLexer();
			break;

		case 'objectpascal':
			lexer = new ObjectPascalLexer();
			break;

		default:
			self.postMessage([codeBlocksIndex, codeBlockIndex, source]);
			return;

	}

	lexer.parseAsync(source) // TODO make async await
		.then((tokens) => {
			return highlighter.highlightAsync(source, tokens);
		})
		.then((highlightedSource) => {
			self.postMessage([codeBlocksIndex, codeBlockIndex, highlightedSource]);
		});

}