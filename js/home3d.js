'use strict';



define('buildScene', ['converter', 'Css3DObjectBuilder'], (converter, Css3DObjectBuilder) => {

	const buildScene = (sceneManager) => {

		const objectA = new Css3DObjectBuilder()
			.element('contato')
			.position(0, 0, 0)
			.rotation(0, 0, 0)
			.build();

		const objectB = new Css3DObjectBuilder()
			.element('biografia')
			.copy(objectA)
			.translateX(-350)
			.translateY(380)
			.rotateZ(35)
			.rotateX(-35)
			.build();

		const numeroDeObjetos = 5.3;
		const intervaloRotacaoB = 360 - (360 / numeroDeObjetos);
		const radiusB = -320;
		const offsetBX = 250;
		const offsetBZ = 260;
		const bioSpiralOffset = 250;

		const ancoraB = new THREE.Object3D();
		ancoraB.position.copy(objectB.position);
		ancoraB.rotation.copy(objectB.rotation);
		ancoraB.translateX(offsetBX);
		ancoraB.translateZ(radiusB);

		const objectB1 = new Css3DObjectBuilder()
			.element('idiomas')
			.copy(ancoraB)
			.rotateX(intervaloRotacaoB)
			.translateX(bioSpiralOffset)
			.translateZ(offsetBZ)
			.build();

		const objectB2 = new Css3DObjectBuilder()
			.element('formacaoacademica')
			.copy(ancoraB)
			.rotateX(intervaloRotacaoB * 2)
			.translateX(bioSpiralOffset * 2)
			.translateZ(offsetBZ)
			.build();

		const objectB3 = new Css3DObjectBuilder()
			.element('dominiotecnico')
			.copy(ancoraB)
			.rotateX(intervaloRotacaoB * 3)
			.translateX(bioSpiralOffset * 3)
			.translateZ(offsetBZ)
			.build();

		const objectB4 = new Css3DObjectBuilder()
			.element('softwares')
			.copy(ancoraB)
			.rotateX(intervaloRotacaoB * 4)
			.translateX(bioSpiralOffset * 4)
			.translateZ(offsetBZ)
			.build();

		const objectB5 = new Css3DObjectBuilder()
			.element('experiencia')
			.copy(ancoraB)
			.rotateX(intervaloRotacaoB * 5)
			.translateX(bioSpiralOffset * 5)
			.translateZ(offsetBZ)
			.build();

		const objectB6 = new Css3DObjectBuilder()
			.element('etc')
			.copy(ancoraB)
			.rotateX(intervaloRotacaoB * 6)
			.translateX(bioSpiralOffset * 6)
			.translateZ(offsetBZ)
			.build();

		const objectC = new Css3DObjectBuilder()
			.element('desenhos')
			.copy(objectB)
			.translateX(-350)
			.translateY(380)
			.rotateZ(35)
			.rotateX(-35)
			.build();

		const objectD = new Css3DObjectBuilder()
			.element('interacoes')
			.copy(objectC)
			.translateX(-350)
			.translateY(380)
			.rotateZ(35)
			.rotateX(-35)
			.build();

		const objectE = new Css3DObjectBuilder()
			.element('mapas')
			.copy(objectD)
			.translateX(-350)
			.translateY(380)
			.rotateZ(35)
			.rotateX(-35)
			.build();

		sceneManager.add(objectA);
		sceneManager.add(objectB);

		sceneManager.add(objectB1);
		sceneManager.add(objectB2);
		sceneManager.add(objectB3);
		sceneManager.add(objectB4);
		sceneManager.add(objectB5);
		sceneManager.add(objectB6);
		sceneManager.add(objectC);
		sceneManager.add(objectD);
		sceneManager.add(objectE);

		// sceneManager.frame(objectA, false); // TODO ver melhor maneira de verificar enquadramento inicial

	};

	return buildScene;

});



/**
 * Entry point function
 */
define(

	[
		'domReadyPromise',

		'DrawingCanvas',
		'Parallax',
		'Map',

		// navegação
		'LoopManager',
		'SceneManager',
		'Menu',
		'buildScene'

	],

	(
		domReadyPromise,

		DrawingCanvas,
		Parallax,
		Map,

		// navegação
		LoopManager,
		SceneManager,
		Menu,
		buildScene

	) => {

		domReadyPromise()
			.then(() => {

				// ver a melhor maneira de executar isso lazy
				const drawingCanvas = new DrawingCanvas('tangente');
				const parallax = new Parallax('paralaxe');
				const map = new Map('mapa');

				const loopManager = LoopManager.getInstance();
				const sceneManager = new SceneManager();
				const menu = new Menu('menuNav');

				buildScene(sceneManager); // TODO não focar em um inicialmente, mas deixar o círculo rodando suavemente e posicionar a câmera no meio

				// TODO loop manager pára quando a janela perde foco ou não tem foco
				loopManager.loop((deltaTime) => {
					sceneManager.next(deltaTime);
				});

			});

	}

);