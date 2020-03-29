import { Css3DObjectBuilder, Menu, SceneManager } from './navigation3d.js';
import { DrawingCanvas } from './drawingCanvas.js';
import { Languages } from './languages.js';
import { Parallax } from './parallax.js';
import { converter, domReadyPromise, LoopManager } from './utils.js';



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

	const numeroDeObjetos = 8;
	const intervaloRotacaoBiografia = -(360 - (360 / numeroDeObjetos));
	const radiusB = -420;
	const offsetBX = -350;
	const offsetBZ = 390;
	const offsetEspiralBiografia = -180;

	const ancoraBiografia = new THREE.Object3D();
	ancoraBiografia.position.copy(objectB.position);
	ancoraBiografia.rotation.copy(objectB.rotation);
	ancoraBiografia.translateX(offsetBX);
	ancoraBiografia.translateZ(radiusB);

	const objectB1 = new Css3DObjectBuilder()
		.element('idiomas')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia)
		.translateX(offsetEspiralBiografia)
		.translateZ(offsetBZ)
		.build();

	const objectB2 = new Css3DObjectBuilder()
		.element('formacaoacademica')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia * 2)
		.translateX(offsetEspiralBiografia * 2)
		.translateZ(offsetBZ)
		.build();

	const objectB3 = new Css3DObjectBuilder()
		.element('dominiotecnico')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia * 3)
		.translateX(offsetEspiralBiografia * 3)
		.translateZ(offsetBZ)
		.build();

	const objectB4 = new Css3DObjectBuilder()
		.element('softwares')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia * 4)
		.translateX(offsetEspiralBiografia * 4)
		.translateZ(offsetBZ)
		.build();

	const objectB5 = new Css3DObjectBuilder()
		.element('experiencia')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia * 5)
		.translateX(offsetEspiralBiografia * 5)
		.translateZ(offsetBZ)
		.build();

	const objectB6 = new Css3DObjectBuilder()
		.element('antigamente')
		.copy(ancoraBiografia)
		.rotateX(intervaloRotacaoBiografia * 6)
		.translateX(offsetEspiralBiografia * 6)
		.translateZ(offsetBZ)
		.build();

	const objectC = new Css3DObjectBuilder()
		.element('mapas')
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
		.element('desenhos')
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

	sceneManager.frame(objectB, false); // FIXME ver melhor maneira de verificar enquadramento inicial
	window.location.hash = '_biografia';

};



/**
 * Entry point function
 */
domReadyPromise()
	.then(() => {

		// ver a melhor maneira de executar isso lazy
		const drawingCanvas = new DrawingCanvas('tangente');
		const parallax = new Parallax('paralaxe');
		const languages = new Languages(312);

		const loopManager = LoopManager.getInstance();
		const sceneManager = new SceneManager();
		const menuNav = new Menu('menuNav');
		const menuBiografia = new Menu('menuBiografia');
		const menuBio = new Menu('menuBio');

		// TODO refactor isso abaixo

		const domMenuBio = document.getElementById('menuBiografia');
		const domMenuArtigos = document.getElementById('menuArtigos');

		menuNav.addEventListener('click', (evento) => {
			let label = evento.target.innerText.toLowerCase();
			switch (label) {
				case 'biografia':
					domMenuArtigos.style.display = 'none';
					domMenuBio.style.display = 'flex';
					break;
				case 'artigos':
					domMenuBio.style.display = 'none';
					domMenuArtigos.style.display = 'flex';
					break;
				default:
					domMenuBio.style.display = 'none';
					domMenuArtigos.style.display = 'none';
					break;
			}
		});

		buildScene(sceneManager); // TODO não focar em um inicialmente, mas deixar o círculo rodando suavemente e posicionar a câmera no meio
		domMenuBio.style.display = 'flex'; // TODO melhorar isso

		// TODO loop manager deveria pausar o loop quando a janela perde foco ou não tem foco
		loopManager.loop((deltaTime) => {
			sceneManager.next(deltaTime);
		});

	});
