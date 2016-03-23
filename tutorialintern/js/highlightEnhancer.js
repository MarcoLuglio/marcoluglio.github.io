'use strict';


var highlightEnhancer = (function(){


	var _private = Object.create(Object.prototype, {
		nextId: {
			writable: true,
			value: -1
		}
	});


	var _public = Object.create(Object.prototype, {


		nextId: {
			enumeable: true,
			get: (function() {
				var boundNextId = function() {
					_private.nextId++;
					return _private.nextId;
				};
				boundNextId = boundNextId.bind(highlightEnhancer);
				return boundNextId;
			})()
		},


		init: {

			enumerable: true,

			value: function(codeNode) {

				Object.defineProperties(this, {
					node: {
						value: Object.create(node).init(codeNode)
					}
				});

				if (this.node.innerHTML.indexOf('<strong') > -1) {
					this.highlight();
					this.addControls();
				}

				Object.seal(this);

				return this;

			}

		},


		clickHandler: {
			value: function(event) {
				switch (event.target.value) {
					case 'all':
						this.node.toggleClass('highlight');
						break;
				}
			}
		},


		highlight: {
			value: function() {
				this.node.addClass('highlight');
			}
		},


		addControls: {
			value: function() {

				var container = document.createElement('div');
				var checkbox = document.createElement('input');
				var checkboxId = 'toggleHighlight' + this.nextId;
				var label = document.createElement('label');
				var labelText = document.createTextNode('Highlight');

				// TODO generate dynamic id for checkbox and associate label with it

				container.className = 'highlightControls';
				checkbox.type = 'checkbox';
				checkbox.value = 'all';
				checkbox.id = checkboxId;
				if (this.node.hasClass('highlight')) {
					checkbox.checked = true;
				}
				label.appendChild(labelText);
				label.setAttribute('for', checkboxId);
				container.appendChild(checkbox);
				container.appendChild(label);

				checkbox.addEventListener('click', this.clickHandler.bind(this));

				this.node.appendChild(container);

			}
		},


		node: {
			value: null
		}


	});


	return _public;


})();