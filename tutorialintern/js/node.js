'use strict';


var node = Object.create(Object.prototype, {


	init: {
		enumerable: true,
		value: function(node) {
			Object.defineProperties(this, {
				node: {
					value: node
				}
			});
			return this;
		}
	},


	addClass: {
		enumerable: true,
		value: function(className) {
			if (!this.hasClass(className)) {
				this.node.className += ' ' + className;
			}
		}
	},


	removeClass: {
		enumerable: true,
		value: function(className) {
			var currentClass = ' ' + this.node.className + ' ';
			currentClass = currentClass.replace(' ' + className + ' ', ' ');
			currentClass = this.normalize(currentClass);
			// TODO if className != currentClass
			this.node.className = currentClass;
		}
	},


	toggleClass: {
		enumerable: true,
		value: function(className) {
			if (this.hasClass(className)) {
				this.removeClass(className);
				return;
			}
			this.addClass(className);
		}
	},


	hasClass: {
		enumerable: true,
		value: function(className) {
			var currentClass = ' ' + this.node.className + ' ';
			if (currentClass.indexOf(' ' + className + ' ') > -1) {
				return true;
			}
			return false;
		}
	},


	normalize: {
		value: function(classString) {
			// TODO if string has more than one space, convert to single space
			return classString;
		}
	},


	appendChild: {
		value: function(node) {
			return this.node.appendChild(node);
		}
	},


	innerHTML: {
		get: function() {
			return this.node.innerHTML;
		},
		set: function(value) {
			this.node.innerHTML = value;
		}
	},


	node: {
		value: null
	}


});