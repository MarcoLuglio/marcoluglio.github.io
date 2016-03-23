'use strict';

/**
 * Gera um índice da estrutura da página (seções, títulos, etc.)
 */
var index = Object.create(Object.prototype, {


	init: {
		value: function() {
			Object.seal(this);
			return this;
		}
	},


	generate: {

		value: function(containerId, levels, showFirstLevel) {

			var container = document.getElementById(containerId);
			var titleSelector = '';
			var titles = null;
			var i = 0;
			var j = 0;
			var list = document.createElement('ul');
			var listBuffer = '';

			var levelStack = [];
			var currentLevel = 0;
			var previousLevel = 0;
			var stringIndex = '';

			i = 2;
			if (showFirstLevel) {
				i = 1;
			}

			for (i; i <= levels; i++) {
				titleSelector += ', h' + i;
			}
			titleSelector = titleSelector.substr(2);

			titles = document.querySelectorAll(titleSelector);

			for (i = 0; i < titles.length; i++) {

				previousLevel = currentLevel;
				currentLevel = this.getLevel(titles.item(i));

				levelStack[currentLevel] = levelStack[currentLevel] || 0;

				if (currentLevel <= previousLevel) {
					listBuffer += '</li>';
				}

				//anterior h2, atual h1 por exemplo
				if (currentLevel < previousLevel) {
					listBuffer += '</ul>';
					levelStack[previousLevel] = 0;
				}

				//anterior h1, atual h2 por exemplo
				if (currentLevel > previousLevel) {
					listBuffer += '<ul>';
				}

				levelStack[currentLevel]++;

				stringIndex = 'indice';
				j = 2;
				if (showFirstLevel) {
					j = 1;
				}
				for (j; j < levelStack.length; j++) {
					// + currentLevel + '-' + levelStack[currentLevel];
					stringIndex += '-' + j + levelStack[j];
				}
				titles.item(i).id = stringIndex;
				listBuffer += '<li><a href="#' + stringIndex + '">' + titles.item(i).innerHTML + '</a>';

			}

			listBuffer += '</li></ul>';

			list.innerHTML = listBuffer;

			container.appendChild(list);

		}

	},


	getLevel: {
		value: function(title) {
			var stringLevel = title.tagName.substr(1);
			var level = parseInt(stringLevel, 10);
			return level;
		}
	}


});