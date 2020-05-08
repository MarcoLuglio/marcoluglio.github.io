'use strict';

const HighlightEnhancer = class HighlightEnhancer {

	constructor(codeNode) {

		Object.defineProperties(
			this,
			{
				node: { value: codeNode }
			}
		);

		Object.seal(this);

		if (this.node.innerHTML.indexOf('<strong') > -1) {
			this.highlight();
			this.addControls();
		}

	}

	get nextId() {
		HighlightEnhancer._nextId += 1;
		return HighlightEnhancer._nextId;
	}

	highlight() {
		this.node.classList.add('highlight');
	}

	addControls() {

		const container = document.createElement('div');
		const checkbox = document.createElement('input');
		const checkboxId = 'toggleHighlight' + this.nextId;
		const label = document.createElement('label');
		const labelText = document.createTextNode('Highlight');

		// TODO generate dynamic id for checkbox and associate label with it

		container.className = 'highlightControls';
		checkbox.type = 'checkbox';
		checkbox.value = 'all';
		checkbox.id = checkboxId;
		if (this.node.classList.contains('highlight')) {
			checkbox.checked = true;
		}
		label.appendChild(labelText);
		label.setAttribute('for', checkboxId);
		container.appendChild(checkbox);
		container.appendChild(label);

		checkbox.addEventListener('click', this._clickHandler.bind(this));

		this.node.appendChild(container);

	}

	_clickHandler(event) {
		switch (event.target.value) {
			case 'all':
				this.node.classList.toggle('highlight');
				break;
		}
	}

};



Object.defineProperty(
	HighlightEnhancer,
	'_nextId',
	{
		writable: true,
		value: -1
	}
);



export { HighlightEnhancer };