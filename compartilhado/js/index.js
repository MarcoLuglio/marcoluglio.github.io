'use strict';

import { RangeIterator, NodeListIterator } from './utils.js';

/**
 * Gera um índice da estrutura da página (seções, títulos, etc.)
 */
//define('Index', ['RangeIterator', 'NodeListIterator'], (RangeIterator, NodeListIterator) => {

const Index = class Index {

	constructor(containerId, levels, showFirstLevel) {
		Object.seal(this);
		this.generate(containerId, levels, showFirstLevel);
	}

	/**
	 * Generates an html index with lists and links from the page headings
	 */
	generate(containerId, levels, showFirstLevel) {

		const container = document.getElementById(containerId);

		if (!container) {
			return;
		}

		let firstLevel = 2;
		if (showFirstLevel) {
			firstLevel = 1;
		}

		const headings = this.getHeadings(levels, firstLevel);
		const list = document.createElement('ul');
		const listBuffer = this.generateListBuffer(headings, firstLevel);

		list.innerHTML = listBuffer;

		container.appendChild(list);

	}

	/**
	 * Gets h1 - h6 dom heading elements
	 */
	getHeadings(levels, firstLevel) {

		let headingSelector = '';
		const levelRange = new RangeIterator(firstLevel, firstLevel + levels - 1);
		for (let level of levelRange) {
			headingSelector += ', h' + level;
		}
		headingSelector = headingSelector.substr(2);

		const headings = new NodeListIterator(document.querySelectorAll(headingSelector));

		return headings;

	}

	/**
	 * Generates the inner html of the index
	 */
	generateListBuffer(headings, firstLevel) {

		const levelStack = {
			stack: [],
			currentLevel: 0,
			previousLevel: 0
		};

		let heading = null;
		let headingId = '';
		let listBuffer = '';

		for (let heading of headings) {

			this.changeLevel(heading, levelStack);

			// close opened elements

			if (levelStack.currentLevel <= levelStack.previousLevel) {
				listBuffer += '</li>';
			}

			// anterior h2, atual h1 por exemplo
			if (levelStack.currentLevel < levelStack.previousLevel) {
				listBuffer += '</ul>';
			}

			// open new elements

			// anterior h1, atual h2 por exemplo
			if (levelStack.currentLevel > levelStack.previousLevel) {
				listBuffer += '<ul>';
			}

			headingId = this.getIndex(levelStack, firstLevel); // TODO melhorar pra não ter que chamar sempre
			headingId = heading.id || headingId;
			heading.id = headingId;
			listBuffer += '<li><a href="#' + headingId + '">' + heading.innerHTML + '</a>';

		}

		listBuffer += '</li></ul>';

		return listBuffer;

	}

	/**
	 * Changes the level of the stack to the level of the current dom heading element
	 */
	changeLevel(heading, levelStack) {

		levelStack.previousLevel = levelStack.currentLevel;
		levelStack.currentLevel = this.getLevel(heading);
		levelStack.stack[levelStack.currentLevel] = levelStack.stack[levelStack.currentLevel] || 0;

		//anterior h2, atual h1 por exemplo
		if (levelStack.currentLevel < levelStack.previousLevel) {
			this.resetCurrentLevel(levelStack);
		}

	}

	getLevel(title) {
		const stringLevel = title.tagName.substr(1);
		const level = parseInt(stringLevel, 10);
		return level;
	}

	resetCurrentLevel(levelStack) {
		levelStack.stack[levelStack.previousLevel] = 0;
	}

	getIndex(levelStack, firstLevel) {

		let headingId = 'indice';
		let stackLength = levelStack.stack.length;
		const levelRange = new RangeIterator(firstLevel, stackLength - 1);

		levelStack.stack[levelStack.currentLevel] += 1;

		for (let level of levelRange) {
			headingId += '-' + level + levelStack.stack[level];
		}

		return headingId;
	}

};