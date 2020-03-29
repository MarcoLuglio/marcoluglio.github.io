// generators (ver meu post no stackoverflow async await), arrow, for of, promise, symbol, web workers, Object.seal Object.preventExtensions
// eu podia fazer um profilling e nas operações mais demoradas fazer assíncrono se possível
// TODO corrigir Object.create({} para Object.create(Object.prototype ?



/**
 * Simple module system loosely based on Asynchronous Module Definition (AMD)
 * add a module calling define('newModuleId', () => { return newModuleContent });
 * add a module that depends of other modules calling define('newModuleId', ['dependencyModuleId1', 'dependencyModuleId2'], (dependendyModuleReference1, dependendyModuleReference2) => { return newModuleContent });
 * use already defined modules calling define(['moduleId1', 'moduleId2'], function(moduleContent1, moduleContent2) { use modules here });
 */
// object.observe TODO
/*define('Oo', ['Proxy'], (Proxy) => {


	if (Object.observe) {

		const nativeWrapper = Object.create({}, {

			observe: {
				enumerable: true,
				value: function(target, callback, acceptList) {
					Object.observe(target, callback, acceptList);
					return target;
				}
			},

			unobserve: {
				enumerable: true,
				value: function(target, callback) {
					Object.unobserve(target, callback);
					return target;
				}
			}

		});

		return nativeWrapper;

	}


	const defaultAcceptList = ["add", "update", "delete", "reconfigure", "setPrototype", "preventExtensions"];


	const Changes = class Changes {

		constructor(name, targetObject, type, oldValue) {
			Object.defineProperties(this, {
				name: {value: name},
				object: {value: targetObject},
				type: {value: type}
			});
			if (oldValue !== undefined) {
				Object.defineProperty(this, 'oldValue', oldValue);
			}
			Object.freeze(this);
		}

	};


	const ooProxy = function(target, callback, acceptList) {

		const ooProxyHandler = {};

		// vou fazer só o update, a maioria dos outros eu não deveria fazer com um objeto por questões de performance
		if ('update' in acceptList) {
			ooProxyHandler.set = function(target, key, value) {
				// TODO notificar observers.  Tenho que cuidar pra não criar uma dependência circular entre o proxy e Oo. Onde guardo os observers?
				return target[key] = value;
			};
		}

		return new Proxy(target, ooProxyHandler);

	}


	const Oo = Object.create({}, {

		observe: {
			enumerable: true,
			value: function(target, callback, acceptList) {
				if (!acceptList) {
					acceptList = defaultAcceptList;
				}
				// TODO ver https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
				return ooProxy(target);
			}
		},

		unobserve: {
			enumerable: true,
			value: function(target, callback) {
				// TODO ver https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/unobserve
			}
		}

	});


	return Object.freeze(Oo);


});*/



const converter = {

	/**
	 * Converte graus para pi radianos. Graus usados na tela e pi radianos usados no Box2D.
	 */
	toRadians: function(degrees) {
		let angular = (degrees * Math.PI) / 180
		return angular;
	},

	/**
	 * Converte pi radianos para graus. Pi radianos usados no Box2D e graus usados na tela.
	 */
	toDegrees: function(radians) {
		let angular = (180 * radians) / Math.PI;
		return angular;
	}

};

Object.seal(converter);



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



/**
 * Cross-browser "dom ready"
 */
function domReadyPromise() {
	
	return new Promise((resolve, reject) => {

		if (document.readyState === 'interactive'
			|| document.readyState === 'complete'
			|| document.readyState === 'loaded'
			) {

			resolve();

		} else {
			document.addEventListener('DOMContentLoaded', resolve);
		}

	});

}



/**
 * Escreve o email no link desejado
 */
function showEmail(linkId, user, domain) {
	try {
		const link = document.getElementById(linkId);
		link.href = "mailto:" + user + "@" + domain;
		link.innerHTML = user + "@" + domain;
	} catch (erro) {
		console.log('Erro ao mostrar o email:');
		console.log(erro);
	}
};



/**
 * Escreve o ano atual no elemento desejado
 */
function showCurrentYear(containerId)  {
	try {
		const container = document.getElementById(containerId);
		container.innerHTML = new Date().getFullYear();
	} catch (erro) {
		console.log('Erro ao iniciar o ano atual:');
		console.log(erro);
	}
};



/**
 * Helper para uso de promessas. Permite que a decisão de como resolver a promessa seja feita após a criação da promessa.
 */
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



const LoopManager = class LoopManager {

	static getInstance() {
		if (!this._instance) {
			const instance = new LoopManager();
			Object.defineProperty(this, '_instance', {value: instance});
			// Object.freeze(this); // TODO verificar necessidade
		}
		return this._instance;
	}

	constructor() {
		Object.defineProperty(this, '_parar', {
			writable: true,
			value: false
		});
		Object.defineProperty(this, '_previousTime', {
			writable: true,
			value: 0
		});
		Object.defineProperty(this, '_currentTime', {
			writable: true,
			value: 0
		});
		Object.defineProperty(this, '_deltaTime', {
			writable: true,
			value: 0
		});
		Object.defineProperty(this, 'quadrosPorSegundo', {value: 60});
		Object.defineProperty(this, 'tempoDeltaQuadro', {value: 1000 / this.quadrosPorSegundo});
		Object.seal(this);
	}

	loop(loopCallback) {

		// melhorar isso depois. quado chamar parar(), mudar a referência da função do loop, pra não ter que rodar a verificação toda a vez
		if (this._parar) {
			return;
		}

		// vou ter que salvar loopCallback pra poder pausar
		this._calcularTempoDoLaco();
		if (this._limitLoopTime()) {
			loopCallback(this._deltaTime);
		}
		requestAnimationFrame((() => {
			this.loop(loopCallback);
		}).bind(this)); // TODO ver se ainda precisa de bind com arrow functions

	}

	pausar() {
		// TODO
		// salvar loopCallback
		// quebrar requestAnimationFrame
	}

	resumir() {
		// TODO
		// restaurar loopCallback
		// loop
	}

	parar() {
		// quebrar requestAnimationFrame
		this._parar = true;
	}

	_calcularTempoDoLaco() {
		this._currentTime = performance.now();
		this._deltaTime = this._currentTime - this._previousTime;
	}

	/**
	 * Limita o tempo calculado caso a janela perca foco e o código seja afetado por throttling
	 * e garante um tempo mínimo e máximo entre os quadros de acordo com os quadros por segundo especificados
	 */
	_limitLoopTime() {
		/*
		Throttling enforces a maximum number of times a function can be called over time. As in "execute this function at most once every 100 milliseconds."
		Debouncing enforces that a function not be called again until a certain amount of time has passed without it being called. As in "execute this function only if 100 milliseconds have passed without it being called."
		*/
		if (this._deltaTime <= 0) {
			this._deltaTime = 1
		}
		if (this._deltaTime > 1000) {
			this._deltaTime = 1000;
		}
		// FIXME isso limita a animação a 60 fps ou menos. Minhas animações não são por quadro e sim tempo, então não teria pq limitar isso. Ver se removo ou altero, faco opcional, sei lá.
		if (this._deltaTime > this.tempoDeltaQuadro) {
			this._previousTime = this._currentTime;
			return true;
		}
		return false;
	}

};



	/*const toScreen = function(object3D, camera) {

		// screen dimensions
		var width = 640;
		var height = 480;
		var widthHalf = width / 2;
		var heightHalf = height / 2;

		var vector = new THREE.Vector3();
		var projector = new THREE.Projector();
		projector.projectVector(vector.setFromMatrixPosition(object.matrixWorld), camera);

		vector.x = (vector.x * widthHalf) + widthHalf;
		vector.y = - (vector.y * heightHalf) + heightHalf;

	}

	const toWorld = function() {

		var elem = renderer.domElement;
		var boundingRect = elem.getBoundingClientRect();
		var x = (event.clientX - boundingRect.left) * (elem.width / boundingRect.width);
		var y = (event.clientY - boundingRect.top) * (elem.height / boundingRect.height);

		var vector = new THREE.Vector3(
			(x / WIDTH) * 2 - 1,
			-(y / HEIGHT) * 2 + 1,
			0.5
		);

		projector.unprojectVector(vector, camera);
		var ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
		var intersects = ray.intersectObjects(scene.children);

	}*/



/**
 * Boilerplate
 */
// define('id', function() {

//	let SomeClass = SomeClass {

//		constructor() {
//			//
//		}

//	}

//	return SomeClass;

// });

// define('id', ['dependency1', 'dependency2'], function(dependency1, dependency2) {
// 	//
// });



export { converter, Node, domReadyPromise, showEmail, showCurrentYear, Deferred, LoopManager };