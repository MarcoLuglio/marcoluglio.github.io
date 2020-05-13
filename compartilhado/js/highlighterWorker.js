'use strict';

import { JavaScriptLexer, HtmlLexer, CsLexer, Highlighter } from './highlighter.js';



const highlighter = new Highlighter();

self.onmessage = function (message) {

	const codeBlocksIndex = message.data[0];
	const codeBlockIndex = message.data[1];
	const parser = message.data[2];
	const source = message.data[3];

	let lexer;

	// TODO avoid recreating lexers

	switch (parser) {
		
		case 'javascript':
			lexer = new JavaScriptLexer();
			break;

		case 'cs':
			lexer = new CsLexer();
			break;

		case 'html':
			lexer = new HtmlLexer();
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