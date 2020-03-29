import { NodeListIterator } from './iterators.js';
import { easing2, Timeline } from './animation.js';
import { converter, Node } from './utils.js';



// só vai ter métodos estáticos, não precisa fazer uma classe

let _keyCode = 0;//0 = não identificado
let _key = '';
const _keysMap = [];

_keysMap[8]	= 'Backspace';
_keysMap[9]	= 'Tab';
_keysMap[13]	= 'Enter';
_keysMap[27]	= 'Escape';
_keysMap[32]	= 'Spacebar';
_keysMap[33]	= 'PageUp';
_keysMap[34]	= 'PageDown';
_keysMap[35]	= 'End';
_keysMap[36]	= 'Home';
_keysMap[37]	= 'ArrowLeft';
_keysMap[38]	= 'ArrowUp';
_keysMap[39]	= 'ArrowRight';
_keysMap[40]	= 'ArrowDown';
_keysMap[46]	= 'Delete';
_keysMap[49]	= '0';
_keysMap[49]	= '1';
_keysMap[50]	= '2';
_keysMap[51]	= '3';
_keysMap[52]	= '4';
_keysMap[53]	= '5';
_keysMap[54]	= '6';
_keysMap[55]	= '7';
_keysMap[56]	= '8';
_keysMap[57]	= '9';
_keysMap[65]	= 'a';
_keysMap[66]	= 'b';
_keysMap[67]	= 'c';
_keysMap[68]	= 'd';
_keysMap[69]	= 'e';
_keysMap[70]	= 'f';
_keysMap[71]	= 'g';
_keysMap[72]	= 'h';
_keysMap[73]	= 'i';
_keysMap[74]	= 'j';
_keysMap[75]	= 'k';
_keysMap[76]	= 'l';
_keysMap[77]	= 'm';
_keysMap[78]	= 'n';
_keysMap[79]	= 'o';
_keysMap[80]	= 'p';
_keysMap[81]	= 'q';
_keysMap[82]	= 'r';
_keysMap[83]	= 's';
_keysMap[84]	= 't';
_keysMap[85]	= 'u';
_keysMap[86]	= 'v';
_keysMap[87]	= 'w';
_keysMap[88]	= 'x';
_keysMap[89]	= 'y';
_keysMap[90]	= 'z';
_keysMap[96]	= 'Numpad0';
_keysMap[97]	= 'Numpad1';
_keysMap[98]	= 'Numpad2';
_keysMap[99]	= 'Numpad3';
_keysMap[100]	= 'Numpad4';
_keysMap[101]	= 'Numpad5';
_keysMap[102]	= 'Numpad6';
_keysMap[103]	= 'Numpad7';
_keysMap[104]	= 'Numpad8';
_keysMap[105]	= 'Numpad9';
_keysMap[106]	= 'NumpadMultiply';
_keysMap[107]	= 'NumpadAdd';
_keysMap[109]	= 'NumpadSubtract';
Object.freeze(_keysMap);

const getKey = (evento) => {
	try {
		if (evento) {
			if (evento.key) {
				return evento.key;
			} else {
				if (evento.which) {
					_keyCode = evento.which;
				} else if (evento.keyCode) {
					_keyCode = evento.keyCode;
				}
			}
		} else if (window.event) {
			_keyCode = window.event.keyCode; //ie
		}
		_key = 0;
		if (_keysMap[_keyCode]) {
			_key = _keysMap[_keyCode];
		}
	} catch (erro) {
		console.error('Erro ao identificar a tecla pressionada.\n' + erro.message + '\n' + erro.getStack());
	}
	return _key; // FIXME ñ estou vazando uma referência private?? ou é passado por valor? verificar
};



const KeysManager = class KeysManager {

	static getInstance() {
		if (!this._instance) {
			const instance = new KeysManager();
			Object.defineProperty(this, '_instance', {value: instance});
			// Object.freeze(this); // TODO verificar necessidade
		}
		return this._instance;
	}

	constructor() {

		const keys = {
			'Backspace': false,
			'Delete': false,
			'ArrowLeft': false,
			'ArrowRight': false,
			'ArrowUp': false,
			'ArrowDown': false,
			'Spacebar': false,
			'Enter': false,
			'Tab': false,
			'Escape': false,
			'PageUp': false,
			'PageDown': false,
			'End': false,
			'Home': false,
			'Alt': false,
			'Meta': false,
			'q': false,
			'w': false,
			'e': false,
			'r': false,
			't': false,
			'y': false,
			'u': false,
			'i': false,
			'o': false,
			'p': false,
			'a': false,
			's': false,
			'd': false,
			'f': false,
			'g': false,
			'h': false,
			'j': false,
			'k': false,
			'l': false,
			'z': false,
			'x': false,
			'c': false,
			'v': false,
			'b': false,
			'n': false,
			'm': false,
			'1': false,
			'2': false,
			'3': false,
			'4': false,
			'5': false,
			'6': false,
			'7': false,
			'8': false,
			'9': false,
			'0': false,
			'Numpad0': false,
			'Numpad1': false,
			'Numpad2': false,
			'Numpad3': false,
			'Numpad4': false,
			'Numpad5': false,
			'Numpad6': false,
			'Numpad7': false,
			'Numpad8': false,
			'Numpad9': false,
			'NumpadMultiply': false,
			'NumpadAdd': false,
			'NumpadSubtract': false,
			'ı': false // não sei qual tecla é essa
		};
		Object.seal(keys);
		Object.defineProperty(this, '_keys', {value: keys});

		window.addEventListener('keydown', this, false);
		window.addEventListener('keyup', this, false);

		Object.seal(this);

	}

	press(tecla) {
		this._keys[tecla] = true;
	}

	release(tecla) {
		this._keys[tecla] = false;
	}

	isPressed(tecla) {
		return this._keys[tecla];
	}

	handleEvent(evento) {

		try {

			let key = null;

			switch(evento.type) {

				case 'keydown':
					this._prevent(evento);
					key = getKey(evento);
					this.press(key);
					break;

				case 'keyup':
					this._prevent(evento);
					key = getKey(evento);
					if (this.isPressed(key)) { // talvez eu possar soltar sem verificar, não sei ainda
						this.release(key);
					}
					break;

			}

		} catch (ex) {
			console.log(ex);
		}

	}

	/**
	 * Se for algum atalho do próprio navegador, como Ctrl + T, deixa executar a ação padrão
	 */
	_prevent(evento) {

		if (evento.altKey
			|| evento.ctrlKey
			|| evento.metaKey
			|| evento.shiftKey
			) {

			return;
		}

		evento.preventDefault();

	}

};



const CinemaCamera = class CinemaCamera {

	// TODO acho que não precisa de um getter
	static get DEFAULT_CAMERA_OFFSET() {
		return 1098;
	}

	constructor(camera, targetOffset) {

		Object.defineProperties(this, {
			_camera: {
				value: camera
			},
			_target: {
				value: new THREE.Object3D()
			},
			targetOffset: {
				value: targetOffset
			}
		});

		Object.seal(this);

		this._target.position.copy(this._camera.position);
		this._target.rotation.copy(this._camera.rotation);
		this._target.translateZ(-this.targetOffset);

	}

	dolly(value) {
		this._camera.translateZ(value);
		this._target.translateZ(value);
	}

	tumble(horizontal, vertical) {

		// TODO rodar usando quaternions. tem que ver como fazer com o tween
		this._target.rotateY(horizontal);
		this._target.rotateX(vertical);

		this._camera.position.copy(this._target.position);
		this._camera.rotation.copy(this._target.rotation);
		this._camera.translateZ(this.targetOffset);

		// let quaternion = new THREE.Quaternion(x, y, z, w);
		// w é o angulo em radianos, x, y, e z é o eixo da rotação

		/*
		this.rotateCamera = ( function() {

	axis = new THREE.Vector3(),
	quaternion = new THREE.Quaternion(),
	eyeDirection = new THREE.Vector3(),
	objectUpDirection = new THREE.Vector3(),
	objectSidewaysDirection = new THREE.Vector3(),
	moveDirection = new THREE.Vector3(),
	angle;

	return function rotateCamera() {

		moveDirection.set( _moveCurr.x - _movePrev.x, _moveCurr.y - _movePrev.y, 0 );
		angle = moveDirection.length();

		if ( angle ) {

			_eye.copy( _this.object.position ).sub( _this.target );

			eyeDirection.copy( _eye ).normalize();
			objectUpDirection.copy( _this.object.up ).normalize();
			objectSidewaysDirection.crossVectors( objectUpDirection, eyeDirection ).normalize();

			objectUpDirection.setLength( _moveCurr.y - _movePrev.y );
			objectSidewaysDirection.setLength( _moveCurr.x - _movePrev.x );

			moveDirection.copy( objectUpDirection.add( objectSidewaysDirection ) );

			axis.crossVectors( moveDirection, _eye ).normalize();

			angle *= _this.rotateSpeed;
			quaternion.setFromAxisAngle( axis, angle );

			_eye.applyQuaternion( quaternion );
			_this.object.up.applyQuaternion( quaternion );

			_lastAxis.copy( axis );
			_lastAngle = angle;

		} else if ( ! _this.staticMoving && _lastAngle ) {

			_lastAngle *= Math.sqrt( 1.0 - _this.dynamicDampingFactor );
			_eye.copy( _this.object.position ).sub( _this.target );
			quaternion.setFromAxisAngle( _lastAxis, _lastAngle );
			_eye.applyQuaternion( quaternion );
			_this.object.up.applyQuaternion( quaternion );

		}

		_movePrev.copy( _moveCurr );

	};

}() );

		*/

	}

	track(x, y) {
		if (x) {
			this._camera.translateX(x);
			this._target.translateX(x);
		}
		if (y) {
			this._camera.translateY(y);
			this._target.translateY(y);
		}
	}

	roll(angle) {
		this._camera.rotateZ(angle);
		this._target.rotateZ(angle);
	}

	frame(target) {

		//this.camera.lookAt(objectVector);
		this._target.rotation.copy(target.rotation);
		this._camera.rotation.copy(target.rotation);

		this._target.position.copy(target.position);
		// TODO atribuir a posição em um passe. Acho que consigo fazer isso com vetores
		this._camera.position.copy(target.position);
		this._camera.translateZ(this.targetOffset); // TODO rever isso dependendo da altura da janela

	}

};



const Animation3DIterator = class Animation3DIterator {

	constructor(iterator) {
		Object.defineProperties(
			this,
			{
				_iterator: {value: iterator},
				_iteration: {writable: true, value: null},
				_animationTime: {writable: true, value: 0}
			}
		);
		Object.seal(this);
		this._iteration = this._iterator.next(); // prepara o iterador para receber valores
	}

	/**
	 * O next retorna os valores da animação INCLUINDO O VALOR INICIAL e final.
	 * Portanto a primeira chamada do next irá retornar o valor inicial passado na criação da animação.
	 */
	next(deltaTime) {
		if (!deltaTime) {
			throw new Error('Elapsed time must be greater than 0');
		}
		this._iteration = this._iterator.next(this._animationTime);
		this._animationTime += deltaTime;
		return this._iteration;
	}

	get value() {
		return this._iteration.value;
	}

	get done() {
		return this._iteration.done;
	}

};

// como vou fazer esses valores serem usados no objeto? Vou ter que guardar uma referência do iterador? ou encapsular o iterador?
const animation3DGenerator = function*(easing, startObject3D, finishObject3D, duration) {

	// animation

	let tempoAnimacao = 0;
	const start = 0;
	const finish = 1;
	const change = finish - start;
	let animationValue;
	let returnValue;

	// position

	const startPosition = new THREE.Vector3();
	const finishPosition = new THREE.Vector3();
	const intermediatePosition = new THREE.Vector3();

	startPosition.copy(startObject3D.position);
	finishPosition.copy(finishObject3D.position);

	// rotation

	const startRotation = new THREE.Quaternion();
	const finishRotation = new THREE.Quaternion();
	const intermediateRotation = new THREE.Quaternion();

	startRotation.copy(startObject3D.quaternion);
	finishRotation.copy(finishObject3D.quaternion);

	while(tempoAnimacao <= duration) {

		// animation
		animationValue = easing(tempoAnimacao, start, change, duration);

		//position
		intermediatePosition.x = startPosition.x + ((finishPosition.x - startPosition.x) * animationValue);
		intermediatePosition.y = startPosition.y + ((finishPosition.y - startPosition.y) * animationValue);
		intermediatePosition.z = startPosition.z + ((finishPosition.z - startPosition.z) * animationValue);

		// rotation
		THREE.Quaternion.slerp(startRotation, finishRotation, intermediateRotation, animationValue);
		intermediateRotation.normalize();

		returnValue = {position: intermediatePosition, rotation: intermediateRotation};

		if (animationValue < finish) {
			tempoAnimacao = yield returnValue;
		} else if (animationValue === finish) {
			return returnValue;
		}

	}

	if (animationValue < finish) {
		returnValue = {position: finishPosition, rotation: finishRotation};
		return returnValue;
	}

};

/**
 * Animação "manual". Devolve um iterador que deve ser chamado para obter cada valor da animação.
 */
const animate3D = (easing, startObject3D, finishObject3D, duration) => {
	if (!duration) {
		throw new Error('Duration must be greater than 0');
	}
	const iterator3D = animation3DGenerator(easing, startObject3D, finishObject3D, duration);
	const animation3DIterator = new Animation3DIterator(iterator3D);
	return animation3DIterator;
};



const _oneDegree = converter.toRadians(1); // TODO deixar esse nome mais genérico como offfset, sei lá

const Navigator3D = class Navigator3D {

	constructor(camera) {

		Object.defineProperties(this, {

			camera: {value: new CinemaCamera(camera, CinemaCamera.DEFAULT_CAMERA_OFFSET)},

			keysManager: {value: KeysManager.getInstance()},

			_controls: {
				writable: true,
				value: null
			}

		});

		Object.seal(this);

		this._controls = this._trackControls;

	}

	navigate(deltaTime) {

		// ajuda no debug

		// dolly
		if (this.keysManager.isPressed('w')) {
			this.camera.dolly(-5);
		} else if (this.keysManager.isPressed('s')) {
			this.camera.dolly(5);
		}

		// roll
		if (this.keysManager.isPressed('a')) {
			this.camera.roll(-_oneDegree)
		} else if (this.keysManager.isPressed('d')) {
			this.camera.roll(_oneDegree);
		}

		if (this.keysManager.isPressed('r')) {
			this._controls = this._tumbleControls;
			console.log('tumble enabled');
		} else if (this.keysManager.isPressed('t')) {
			this._controls = this._trackControls;
			console.log('track enabled');
		}

		this._controls();

		if (this.keysManager.isPressed('p')) {
			// TODO dar um jeito de soltar a tecla, ou silenciar ela até o key up. Um método pause quem sabe
			console.log('camera tx: ' + this.camera.position.x);
			console.log('camera ty: ' + this.camera.position.y);
			console.log('camera tz: ' + this.camera.position.z);
			console.log('camera rx: ' + this.camera.rotation.x);
			console.log('camera rx: ' + this.camera.rotation.y);
			console.log('camera rx: ' + this.camera.rotation.z);
		}

	}

	_trackControls() {

		// TODO não usar strings para as teclas especiais seria muito bom

		if (this.keysManager.isPressed('ArrowLeft')) {
			this.camera.track(1, 0);
		} else if (this.keysManager.isPressed('ArrowRight')) {
			this.camera.track(-1, 0);
		}

		if (this.keysManager.isPressed('ArrowUp')) {
			this.camera.track(0, -1);
		} else if (this.keysManager.isPressed('ArrowDown')) {
			this.camera.track(0, 1);
		}

	}

	_tumbleControls() {

		if (this.keysManager.isPressed('ArrowLeft')) {
			this.camera.tumble(-_oneDegree, 0);
		} else if (this.keysManager.isPressed('ArrowRight')) {
			this.camera.tumble(_oneDegree, 0);
		}

		if (this.keysManager.isPressed('ArrowUp')) {
			this.camera.tumble(0, _oneDegree);
		} else if (this.keysManager.isPressed('ArrowDown')) {
			this.camera.tumble(0, -_oneDegree);
		}

	}

};



const Css3DObjectBuilder = class Css3DObjectBuilder {

	constructor() {
		Object.defineProperties(this, {
			_elementId: {writable: true},
			_object3D: {value: new THREE.Object3D()}
		});
		Object.seal(this);
	}

	build() {
		let element = document.getElementById(this._elementId);
		let css3DObject = new THREE.CSS3DObject(element);
		css3DObject.position.copy(this._object3D.position);
		css3DObject.rotation.copy(this._object3D.rotation);
		return css3DObject;
	}

	/**
	 * @param {String} elementId Id do elemento html que será posicionado no espaço 3D
	 */
	element(elementId) {
		this._elementId = elementId;
		return this;
	}

	/**
	 * @param {Object} target Objeto do qual se deve copiar a posição e rotação
	 */
	copy(target) {
		this
			.position(target.position)
			.rotation(target.rotation);
		return this;
	}

	/**
	 * @param {Object|Number} arg1 Objeto do qual se deve copiar a posição ou coordenada x
	 * @param {Number} [y] Coordenada Y. Usar em Conjunto com a coordenada X.
	 * @param {Number} [z] Coordenada Z Usar em conjunto com a coordenada X.
	 */
	position(arg1, y, z) {
		if (arguments.length == 1) {
			this._object3D.position.copy(arg1);
			return this;
		}
		this._object3D.position.x = arg1;
		this._object3D.position.y = y;
		this._object3D.position.z = z;
		return this;
	}

	/**
	 * @param {Object|Number} arg1 Objeto do qual se deve copiar a rotação ou ângulo de rotação no eixo x em graus
	 * @param {Number} [y] Ângulo de rotação no eixo Y. Usar em Conjunto com a rotação X.
	 * @param {Number} [z] Ângulo de rotação no eixo Z. Usar em conjunto com a rotação X.
	 */
	rotation(arg1, y, z) {
		if (arguments.length == 1) {
			this._object3D.rotation.copy(arg1);
			return this;
		}
		this._object3D.rotation.arg1 = arg1;
		this._object3D.rotation.y = y;
		this._object3D.rotation.z = z;
		return this;
	}

	quaternion(quaternion) {
		this._object3D.quaternion = quaternion;
		return this;
	}

	/**
	 * @param {Number} value
	 */
	translateX(value) {
		this._object3D.translateX(value);
		return this;
	}

	/**
	 * @param {Number} value
	 */
	translateY(value) {
		this._object3D.translateY(value);
		return this;
	}

	/**
	 * @param {Number} value
	 */
	translateZ(value) {
		this._object3D.translateZ(value);
		return this;
	}

	/**
	 * @param {Number} degrees
	 */
	rotateX(degrees) {
		this._object3D.rotateX(converter.toRadians(degrees));
		return this;
	}

	/**
	 * @param {Number} degrees
	 */
	rotateY(degrees) {
		this._object3D.rotateY(converter.toRadians(degrees));
		return this;
	}

	/**
	 * @param {Number} degrees
	 */
	rotateZ(degrees) {
		this._object3D.rotateZ(converter.toRadians(degrees));
		return this;
	}

};



const SceneManager = class SceneManager {

	constructor() {

		Object.defineProperties(this, {

			_width: {
				writable: true,
				value: 0
			},

			_height: {
				writable: true,
				value: 0
			},

			_renderer: {
				value: new THREE.CSS3DRenderer()
			},

			_renderList: {
				value: []
			},

			_timeline: {
				value: new Timeline()
			},

			_scene: {
				value: new THREE.Scene()
			},

			_loopClosure: {
				writable: true,
				value: null
			},

			_currentFocus: {
				writable: true,
				value: null
			},

			_currentAnimation: {
				writable: true,
				value: null
			},

			camera: {
				writable: true,
				value: null
			},

			navigator3D: {
				writable: true,
				value: null
			},

			isAnimating: {
				writable: true,
				value: false
			}

		});

		Object.seal(this);

		this._width = window.innerWidth;
		this._height = window.innerHeight;

		this._iniciarEventos();
		this._iniciarRenderer();
		this._iniciarCamera();
		this._iniciarCena();
		this._encloseLoop();

	}

	frame(alvo, animarEnquadramento) {

		if (this.isAnimating) {
			this._timeline.remove(this._currentAnimation);
			this._currentAnimation = null;
			this.isAnimating = false;
		}

		if (this._currentFocus) {
			new Node(this._currentFocus.element)
				.removeClass('foco');
		}

		this._currentFocus = alvo;
		new Node(this._currentFocus.element)
			.addClass('foco');

		if (!animarEnquadramento) {
			this._moveCamera(Object.freeze({position: alvo.position, rotation: alvo.quaternion}));
			this.camera.translateZ(CinemaCamera.DEFAULT_CAMERA_OFFSET);
			return;
		}

		const duration = 1500;
		const alvoCamera = new THREE.Object3D();
		alvoCamera.position.copy(alvo.position);
		alvoCamera.rotation.copy(alvo.rotation);
		alvoCamera.translateZ(CinemaCamera.DEFAULT_CAMERA_OFFSET);

		const animation = animate3D(easing2.out, this.camera, alvoCamera, duration);
		const context = this;

		context.isAnimating = true;
		context._currentAnimation = animation;

		context._timeline.add(
			animation,
			0,
			context._moveCamera.bind(context)
		)
		.then(() => {
			context._currentAnimation = null;
			context.isAnimating = false;
			// TODO colocar foco programático no elemento
		});

	}

	add(object3D) {
		object3D.element.addEventListener('mousedown', this, true);
		object3D.element.addEventListener('mouseup', this, true);
		object3D.element.addEventListener('mousemove', this, true);
		object3D.element.addEventListener('click', this, true);
		// TODO touch events?
		this._renderList.push(object3D);
		this._scene.add(object3D);
	}

	next(deltaTime) {
		this._loopClosure(deltaTime);
	}

	handleEvent(evento) {
		switch (evento.type) {
			case 'hashchange':
				this._handleHashChangeEvent(evento);
				break;
			case 'click':
				this._handleClickEvent(evento);
				break;
			case 'mousedown': // fallthrough
			case 'mouseup': // fallthrough
			case 'mousemove':
				this._handleMouseEvents(evento);
				break;
			default:
				break;
		}
	}

	_handleHashChangeEvent(evento) {
		evento.preventDefault();
		this._preventSceneScroll();
		let targetId = this._getTargetId(evento.newURL);
		let targetObject = this._getTargetObject(targetId);
		if (targetObject) {
			this.frame(targetObject, true);
		}
	}

	_handleClickEvent(evento) {

		if (this.isAnimating) {
			evento.preventDefault();
			return;
		}

		let isFocused = false;

		let css3DObject = this._findSceneObject(evento.currentTarget);
		if (css3DObject && css3DObject === this._currentFocus) {
			isFocused = true;
		}


		// FIXME se o currentTarget não for focado, esquece isso...
		if (isFocused && evento.target.href) {

			let hash = evento.target.hash.substr(2);

			if (!hash) {
				return;
			}

			evento.preventDefault();

			if (hash === evento.currentTarget.id) {
				return;
			}

			// evento.stopImmediatePropagation();
			window.location.hash = '_' + hash;

			return;

		}

		if (!isFocused) {
			evento.preventDefault();
			evento.stopImmediatePropagation();
			// history.pushState({}, '', window.location.? + '#' + evento.currentTarget.id);
			window.location.hash = '_' + evento.currentTarget.id;
		}

	}

	_handleMouseEvents(evento) {
		if (evento.currentTarget.className.indexOf('foco') == -1) {
			evento.preventDefault();
			evento.stopPropagation();
		}
	}

	_moveCamera(value) {
		this.camera.position.copy(value.position);
		this.camera.quaternion.copy(value.rotation);
		// this._target.position.copy(target.position); // FIXME tenho que ver como mover o target
	}

	_iniciarEventos() {
		window.addEventListener('hashchange', this);
	}

	_iniciarRenderer() {
		this._renderer.setSize(this._width, this._height);
		//this._renderer.domElement.style.position = 'relative'; // será que precisa?
		document.body.appendChild(this._renderer.domElement);
	}

	_iniciarCamera() {
		const fieldOfView = 45;
		const aspect = this._width / this._height;
		const nearPlane = 1;
		const farPlane = 1000;
		// FIXME tem que converter pra uma CinemaCamera
		this.camera = new THREE.PerspectiveCamera(fieldOfView, aspect, nearPlane, farPlane);
		this.camera.position.set(450, 0, 767);
	}

	_iniciarCena() {
		this.navigator3D = new Navigator3D(this.camera);
		if (this._renderList.length) {
			this.navigator3D.camera.frame(this._renderList[0]); // TODO mudar quando converter pra CinemaCamera
			this._renderer.render(this._scene, this.camera);
		}
	}

	_encloseLoop() {

		if (this._loopClosure) {
			return;
		}

		/**
		 * Por enquanto não vou usar o tempoDelta pra nada
		 */
		const loopClosure = (deltaTime) => {
			this.navigator3D.navigate(deltaTime);
			if (this._timeline.isActive) {
				this._timeline.next(deltaTime);
			}
			this._renderer.render(this._scene, this.camera);
		}

		this._loopClosure = loopClosure;

	}

	_findSceneObject(element) {
		let css3DObject = null;
		for (let sceneObject of this._renderList) {
			if (sceneObject.element === element) {
				css3DObject = sceneObject;
				break;
			}
		}
		return css3DObject;
	}

	_getTargetId(url) {
		let hashIndex = url.indexOf('#');
		let targetId = url.substr(hashIndex + 2); // 2 elimina tb o _ inicial do hash que previne scroll
		return targetId;
	}

	_getTargetObject(targetId) {
		let targetObject = null;
		for (targetObject of this._renderList) {
			if (targetObject.element.id === targetId) {
				return targetObject;
			}
		}
		return;
	}

	_preventSceneScroll() {
		this._renderer.domElement.scrollTop = 0;
		this._renderer.domElement.scrollLeft = 0;
	}

};



/**
 * Modifica os links para que eles não apontem para os elementos, prevenindo scroll da página.
 * @param {string} containerId Id do contêiner que contém links apontando para ids
 */
const Menu = class Menu {

	constructor(containerId) {

		const linkRoot = document.getElementById(containerId);
		const links = document.querySelectorAll(`#${containerId} a`);

		Object.defineProperties(this, {
			_links: {value: new NodeListIterator(links)},
			_linkRoot: {value: linkRoot}
		});
		Object.seal(this);

		this._addSceneLinks();

	}

	addEventListener(type, listener, options) {
		this._linkRoot.addEventListener(type, listener, options);
	}

	removeEventListener(type, listener, options) {
		this._linkRoot.removeEventListener(type, listener, options);
	}

	_addSceneLinks() {

		let link = null;

		for (link of this._links) {
			link.href = link.href.replace('#', '#_');
		}

	}

};



export { Css3DObjectBuilder, Menu, SceneManager };