'use strict';

// generators (ver meu post no stackoverflow async await), arrow, for of, promise, symbol, web workers, Object.seal Object.preventExtensions
// eu podia fazer um profilling e nas operações mais demoradas fazer assíncrono se possível
// TODO corrigir Object.create({} para Object.create(Object.prototype ?



/**
 * Simple module system loosely based on Asynchronous Module Definition (AMD)
 * add a module calling define('newModuleId', () => { return newModuleContent });
 * add a module that depends of other modules calling define('newModuleId', ['dependencyModuleId1', 'dependencyModuleId2'], (dependendyModuleReference1, dependendyModuleReference2) => { return newModuleContent });
 * use already defined modules calling define(['moduleId1', 'moduleId2'], function(moduleContent1, moduleContent2) { use modules here });
 */
const define = (() => {


	const modulesIndex = [];


	const createModule = (moduleName, moduleDefinition) => {
		const moduleResult = moduleDefinition();
		modulesIndex.push([moduleName, moduleResult]);
		return moduleResult;
	};


	const createModuleWithDependencies = (moduleName, dependencies, moduleDefinition) => {
		const moduleDefinitionWithDependencies = () => {
			return define(dependencies, moduleDefinition);
		};
		return createModule(moduleName, moduleDefinitionWithDependencies);
	};


	const useModules = (modulesList, callback) => {

		const modules = [];

		let moduleName = null;
		let listModuleName = null;
		let listModuleFunction = null;

		//assemble modules based on list
		for (let i = 0; i < modulesList.length; i++) {

			moduleName = modulesList[i];

			for (let j = 0; j < modulesIndex.length; j++) {

				listModuleName = modulesIndex[j][0];
				listModuleFunction = modulesIndex[j][1];

				if (moduleName === listModuleName) {
					modules.push(listModuleFunction);
					break;
				}

			}

		}

		return callback.apply(window, modules);

	};


	const defineOverload = (arg1, arg2, arg3) => {
		if (typeof arg1 === 'string') {
			if (Array.isArray(arg2)) {
				return createModuleWithDependencies(arg1, arg2, arg3);
			} else {
				return createModule(arg1, arg2);
			}
		} else {
			return useModules(arg1, arg2);
		}
	};


	return defineOverload;


})();



/**
 * Helper para uso de promessas. Permite que a decisão de como resolver a promessa seja feita após a criação da promessa.
 */
define('Deferred', function() {

	const Deferred = class Deferred {

		constructor() {

			Object.defineProperties(this, {
				_promise: {writable: true, value: null},
				_resolve: {writable: true, value: null},
				_reject: {writable: true, value: null}
			});

			Object.seal(this);

			this._promise = new Promise(((resolve, reject) => {
				this._resolve = resolve;
				this._reject = reject;
			}).bind(this));

		}

		resolve(value) {
			return this._resolve(value);
		}

		reject(reason) {
			return this._reject(reason);
		}

		then(callbackAsync) {
			return this._promise.then(callbackAsync);
		}

	};

	return Deferred;

});



/**
 * Wraps a dom node and adds method to manipulate its class attribute
 */
define('Node', () => {

	const Node = class Node {

		constructor(htmlNode) {
			Object.defineProperty(this, '_htmlNode', {value: htmlNode});
			Object.seal(this);
		}

		addClass(className) {
			if (!this.hasClass(className)) {
				this._htmlNode.className += ' ' + className;
			}
		}

		removeClass(className) {
			var currentClass = ' ' + this._htmlNode.className + ' ';
			currentClass = currentClass.replace(' ' + className + ' ', ' ');
			currentClass = this._normalize(currentClass);
			// TODO if className != currentClass
			this._htmlNode.className = currentClass;
		}

		toggleClass(className) {
			if (this.hasClass(className)) {
				this.removeClass(className);
				return;
			}
			this.addClass(className);
		}

		hasClass(className) {
			var currentClass = ' ' + this._htmlNode.className + ' ';
			if (currentClass.indexOf(' ' + className + ' ') > -1) {
				return true;
			}
			return false;
		}

		appendChild(node) {
			this._htmlNode.appendChild(node);
		}

		get innerHTML() {
			return this._htmlNode.innerHTML;
		}

		set innerHTML(source) {
			this._htmlNode.innerHTML = source;
		}

		_normalize(classString) {
			// TODO if string has more than one space, convert to single space
			return classString;
		}

	};

	return Node;

});



/**
 * Cross-browser "dom ready"
 */
define('domReadyPromise', () => {

	return () => {

		const domReadyPromise = new Promise((resolve, reject) => {

			if (document.readyState === 'interactive'
				|| document.readyState === 'complete'
				|| document.readyState === 'loaded'
				) {

				resolve();

			} else {
				document.addEventListener('DOMContentLoaded', resolve);
			}

		});

		return domReadyPromise;

	};

});



/**
 * Escreve o email no link desejado
 */
define('showEmail', () => {
	return (linkId, user, domain) => {
		try {
			const link = document.getElementById(linkId);
			link.href = "mailto:" + user + "@" + domain;
			link.innerHTML = user + "@" + domain;
		} catch (erro) {
			console.log('Erro ao mostrar o email:');
			console.log(erro);
		}
	}
});



/**
 * Escreve o ano atual no elemento desejado
 */
define('showCurrentYear', () => {
	return (containerId) => {
		try {
			const container = document.getElementById(containerId);
			container.innerHTML = new Date().getFullYear();
		} catch (erro) {
			console.log('Erro ao iniciar o ano atual:');
			console.log(erro);
		}
	};
});