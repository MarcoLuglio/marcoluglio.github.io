import { Css3DObjectBuilder, Menu, SceneManager } from './navigation3d.js';
import { DrawingCanvas } from './drawingCanvas.js';
import { Languages } from './languages.js';
import { Parallax } from './parallax.js';
import { domReadyPromise, LoopManager } from './utils.js';



const buildScene = (sceneManager) => {

	const objectA = new Css3DObjectBuilder()
		.element('contato')
		.position(0, 0, 0)
		.rotation(0, 0, 0)
		.build();

	const objectC = new Css3DObjectBuilder()
		.element('interacoes')
		.copy(objectA)
		.translateX(-350)
		.translateY(380)
		.rotateZ(35)
		.rotateX(-35)
		.build();

	const objectD = new Css3DObjectBuilder()
		.element('desenhos')
		.copy(objectC)
		.translateX(-350)
		.translateY(380)
		.rotateZ(35)
		.rotateX(-35)
		.build();

	const objectE = new Css3DObjectBuilder()
		.element('artigos')
		.copy(objectD)
		.translateX(-350)
		.translateY(380)
		.rotateZ(35)
		.rotateX(-35)
		.build();

	const objectF = new Css3DObjectBuilder()
		.element('biografia')
		.copy(objectE)
		.translateX(-350)
		.translateY(380)
		.rotateZ(35)
		.rotateX(-35)
		.build();

	const numeroDeObjetos = 8;
	const intervaloRotacaoBiografia = -(360 - (360 / numeroDeObjetos));
	const radiusF = -420;
	const offsetFX = -350;
	const offsetFZ = 390;
	const offsetEspiralBiografia = -180;

	const ancoraBiografia = new THREE.Object3D();
	ancoraBiografia.position.copy(objectF.position);
	ancoraBiografia.rotation.copy(objectF.rotation);
	ancoraBiografia.translateX(offsetFX);
	ancoraBiografia.translateZ(radiusF);

	const objectF1 = new Css3DObjectBuilder()
		.element('idiomas')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia)
		.translateX(offsetEspiralBiografia - 200)
		.translateZ(offsetFZ)
		.build();

	const objectF2 = new Css3DObjectBuilder()
		.element('formacaoacademica')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia * 2)
		.translateX(offsetEspiralBiografia * 2)
		.translateZ(offsetFZ + 40)
		.build();

	const objectF5 = new Css3DObjectBuilder()
		.element('experiencia')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia * 5)
		.translateX(offsetEspiralBiografia * 5)
		.translateZ(offsetFZ + 30)
		.build();

	const objectF6 = new Css3DObjectBuilder()
		.element('antigamente')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia * 6)
		.translateX(offsetEspiralBiografia * 6)
		.translateZ(offsetFZ)
		.build();

	sceneManager.add(objectA);
	sceneManager.add(objectC);
	sceneManager.add(objectD);
	sceneManager.add(objectE);
	sceneManager.add(objectF);

	sceneManager.add(objectF1);
	sceneManager.add(objectF2);
	sceneManager.add(objectF5);
	sceneManager.add(objectF6);

	sceneManager.frame(objectF, false); // FIXME ver melhor maneira de verificar enquadramento inicial
	window.location.hash = '_biografia';

};



/**
 * Entry point function
 */
(async function(){

	await domReadyPromise();

	// ver a melhor maneira de executar isso lazy
	const drawingCanvas = new DrawingCanvas('tangente');
	const parallax = new Parallax('paralaxe');
	const languages = new Languages(312);

	const loopManager = LoopManager.getInstance();
	const sceneManager = new SceneManager();
	const menuNav = new Menu('menuNav');
	const menuBiografia = new Menu('menuBiografia');
	const menuBio = new Menu('menuBio'); // inline menu in hte tl;dr content

	buildScene(sceneManager);

	// TODO loop manager deveria pausar o loop quando a janela perde foco ou não tem foco
	loopManager.loop((deltaTime) => {
		sceneManager.next(deltaTime);
	});

})();