'use strict';


define('pathUtils', () => {

	const pathUtils = {


		distance: function() {

			let overload;

			if (arguments.length === 2) {
				overload = this._distanceOverloadPoints;
			} else {
				overload = this._distanceOverloadCoordinates;
			}

			return overload.apply(this, arguments);

		},


		_distanceOverloadPoints: function(point1, point2) {
			return this._distanceOverloadCoordinates(point1.x, point1.y, point2.x, point2.y);
		},


		_distanceOverloadCoordinates: function(x1, y1, x2, y2) {
			const distanceX = x1 - x2;
			const distanceY = y2 - y2;
			const distance = Math.sqrt((distanceX * distanceX) + (distanceY * distanceY));
			return distance;
		},


		circleIntersections: function() {

			let overload;

			if (arguments.length === 2) {
				overload = this._circleIntersectionsOverloadCircles;
			} else {
				overload = this._circleIntersectionsOverloadCoordinates;
			}

			return overload.apply(this, arguments);

		},


		_circleIntersectionsOverloadCircles: function(circle1, circle2) {
			return this._circleIntersectionsOverloadCoordinates(circle1.x, circle1.y, circle1.radius, circle2.x, circle2.y, circle2.radius);
		},


		_circleIntersectionsOverloadCoordinates: function(centerX1, centerY1, radius1, centerX2, centerY2, radius2) {

			const intersections = [];

			// no solutions, circles coincide
			if (radius1 === radius2
				&& centerX1 === centerX2
				&& centerY1 === centerY2
				) {

				return intersections;

			}

			const centerDistance = this.distance(centerX1, centerY1, centerX2, centerY2);

			// no solutions, circles too far apart
			if (centerDistance > radius1 + radius2) {
				return intersections;
			}

			// no solutions, one circle inside the other
			if (centerDistance < Math.abs(radius1 - radius2)) {
				return intersections;
			}

			const radius1Square = radius1 * radius1;
			const radius2Square = radius2 * radius2;
			const distanceSquare = centerDistance * centerDistance;
			const intersectionAxisDistanceFromRadius1 = (radius1Square - radius2Square + distanceSquare) / (2 * centerDistance);
			const intersectionAxisX = centerX1 + intersectionAxisDistanceFromRadius1 * (centerX2 - centerX1) / centerDistance;
			const intersectionAxisY = centerY1 + intersectionAxisDistanceFromRadius1 * (centerY2 - centerY1) / centerDistance;

			// only one solution, circles touch but do not "cross"
			if (centerDistance === (radius1 + radius2)) {

				intersections.push({
					degrees: 0,
					radians: 0,
					x: intersectionAxisX,
					y: intersectionAxisY
				});

				return intersections;

			}

			// two solutions, circles "cross"

			const intersectionAxisDistanceFromRadiiLine = Math.sqrt(radius1Square - (intersectionAxisDistanceFromRadius1 * intersectionAxisDistanceFromRadius1));

			const triangleBase = intersectionAxisDistanceFromRadius1;
			const triangleHeight = intersectionAxisDistanceFromRadiiLine;

			const intersectionX1 = (intersectionAxisX + triangleHeight * (centerY2 - centerY1) / centerDistance)
			const intersectionY1 = (intersectionAxisY - triangleHeight * (centerX2 - centerX1) / centerDistance);
			const intersectionAngle1 = Math.acos(triangleBase / radius1);

			const intersectionX2 = (intersectionAxisX - triangleHeight * (centerY2 - centerY1) / centerDistance);
			const intersectionY2 = (intersectionAxisY + triangleHeight * (centerX2 - centerX1) / centerDistance);
			const intersectionAngle2 = -intersectionAngle1;

			intersections.push({
				radians: intersectionAngle1,
				x: intersectionX1,
				y: intersectionY1
			});

			intersections.push({
				radians: intersectionAngle2,
				x: intersectionX2,
				y: intersectionY2
			});

			return intersections;

		}

	};

	return Object.seal(pathUtils);

});


define('MLArc', ['converter'], (converter) => {

	/**
	 * Ângulo simples. Permite pegar os componentes vertical e horizontal do ângulo. Funciona quase como um vetor na verdade.
	 */
	const MLAngle = class MLAngle {

		constructor(degrees) {
			Object.defineProperties(this, {
				_degrees: {writable: true, value: degrees},
				_xTemp: {writable: true, value: null},
				_yTemp: {writable: true, value: null}
			});
			Object.seal(this);
		}

		get degrees() {
			return this._degrees;
		}

		set degrees(value) {
			this._degrees = value;
		}

		get radians() {
			return converter.toRadians(this._degrees);
		}

		set radians(value) {
			this._degrees = converter.toDegrees(value);
		}

		get x() {
			return Math.cos(this.radians);
		}

		get y() {
			return Math.sin(this.radians);
		}

		set x(value) {
			this._xTemp = value;
			if (this._yTemp !== null) {
				this.radians = Math.atan2(this._yTemp, this._xTemp);
				this._xTemp = null;
				this._yTemp = null;
				return;
			}
			this.radians = Math.acos(value);
		}

		set y(value) {
			this._yTemp = value;
			if (this._xTemp !== null) {
				this.radians = Math.atan2(this._yTemp, this._xTemp);
				this._xTemp = null;
				this._yTemp = null;
				return;
			}
			this.radians = Math.asin(value);
		}

	};

	/**
	 * Âgulo que pode ser girado e possui um raio
	 */
	const MLAngleDecorator = class MLAngleDecorator {

		constructor(angle, arc) {
			Object.defineProperties(this, {
				_angle: {writable: true, value: angle},
				_arc:  {writable: true, value: arc}
			});
			Object.seal(this);
		}

		rotateDegrees(degrees) {
			this._angle += degrees;
		}

		get degrees() {
			return this._angle.degrees;
		}

		set degrees(value) {
			this._angle.degrees = value;
		}

		get radians() {
			return this._angle.radians;
		}

		set radians(value) {
			this._angle.radians = value;
		}

		get x() {
			return this._angle.x * this._arc.radius + this._arc.x;
		}

		get y() {
			return this._angle.y * this._arc.radius + this._arc.y;
		}

		set x(value) {
			this._angle.x = (value - this._arc.x) / this._arc.radius;
		}

		set y(value) {
			this._angle.y = (value - this._arc.y) / this._arc.radius;
		}

	}

	/**
	 * Arco com centro, raio e ângulo
	 */
	const MLArc = class MLArc {

		constructor(x, y, radius, startAngle, endAngle) {
			Object.defineProperties(this, {
				x: {writable: true, value: x},
				y: {writable: true, value: y},
				radius: {writable: true, value: radius},
				start: {value: new MLAngleDecorator(new MLAngle(startAngle), this)},
				end: {value: new MLAngleDecorator(new MLAngle(endAngle), this)}
			});
			Object.seal(this);
		}

	};

	return MLArc;

});


define('MLCanvasArc', ['MLArc'], (MLArc) => {

	const MLCanvasArc = class MLCanvasArc extends MLArc {

		// TODO set styles in the constructor?

		paint(context) {

			context.save();

			// context.strokeStyle = 'hsl(120, 100%, 50%)';
			// context.lineWidth = 3;

			context.beginPath();
			context.arc(
				this.x,
				this.y,
				this.radius,
				this.start.radians,
				this.end.radians
			);
			context.stroke();

			context.restore();

		}

	};

	return MLCanvasArc;

});


define('PinhaoPath', ['MLCanvasArc', 'pathUtils', 'converter'], (MLCanvasArc, pathUtils, converter) => {

	const TWO_PI = Math.PI * 2;

	const PinhaoPath = class PinhaoPath {

		constructor(context, x, y) {

			Object.defineProperties(this, {

				_context: {value: context},

				_x: {writable: true, value: 0},
				_y: {writable: true, value: 0},

				_bodyArc: {value: new MLCanvasArc(0, 0, 40, 0, 140)},

				// TODO seria tip length, pq não vou inclinar só a ponta, não há necessidade do y
				_tipPoint: {value: {
					x: 150,
					y: 0
				}},

				_headTopArc: {value: new MLCanvasArc(-50, 0, 35, 0, 180)},
				_headSideArc: {value: new MLCanvasArc(0, 0, 40, 0, 0)},

				_constructionLines: {value: {
					arcoCapazCorpo: new MLCanvasArc(0, 0, 0, 180, 0),
					sideCircleTriangle: {
						intersectionMiddlePoint:{
							x: 0,
							y: 0
						}
					}
				}}

			});

			Object.seal(this);

			this.headDegrees = 130;
			this.x = x;
			this.y = y;

			this._calculate();
			this.draw();

		}

		set x(value) {
			this._x = value;
		}

		set y(value) {
			this._y = value;
		}

		set headLength(length) {
			this._headTopArc.x = -length;
			this._calculate();
		}

		set headRadius(radius) {
			this._headTopArc.radius = radius;
			this._calculate();
		}

		set headDegrees(value) {
			const degrees = (360 - value) / 2;
			this._headTopArc.start.degrees = degrees;
			//this._headTopArc.end.degrees = 360 - degrees; // end é sempre 180 para mostrar as linhas de construção
			this._calculate();
		}

		set tipLength(length) {
			this._tipPoint.x = length;
			this._calculate();
		}

		draw() {

			this._context.clearRect(0, 0, 400, 400); // TODO ver a melhor maneira de calcular isso, tinha que ter um método getDimensions ou algo assim

			// move canvas to object position
			this._context.save();
			this._context.translate(this._x, this._y);

			this._drawShape();

			// restore canvas position
			this._context.restore();

			// construction lines
			this._context.shadowBlur = 10;
			this._debugDraw();

			/*

ctx.shadowColor = “red” // string
    Cor da sombra;  RGB, RGBA, HSL, HEX e outras entradas são válidas.
ctx.shadowOffsetX = 0; // integer
    Distância horizontal da sombra em relação ao texto.
ctx.shadowOffsetY = 0; // integer
    Distância vertical da sombra em relação ao texto.
ctx.shadowBlur = 10; // integer
    Efeito de mancha da sombra; quanto maior o valor, maior a mancha.
			*/

		}

		_debugDraw() {

			// move canvas to object position
			this._context.save();
			this._context.translate(this._x, this._y);

			this._drawConstructionBodyArcBase();
			this._drawConstructionBodyArc();
			this._drawConstructionBodyLine();

			this._drawConstructionHeadTopArc();
			this._drawConstructionHeadLines();
			this._drawConstructionHeadSideArc();

			// restore canvas position
			this._context.restore();

		}

		_calculate() {
			this._calculateBody();
			this._calculateHead();
		}

		_calculateBody() {

			// TODO podia fazer esses cálculos todos com vetores do threeJs http://threejs.org/docs/#Reference/Math/Vector3

			const offsetX = (this._tipPoint.x - this._bodyArc.x);
			const offsetY = (this._tipPoint.y - this._bodyArc.y);

			this._constructionLines.arcoCapazCorpo.x = this._bodyArc.x + (offsetX / 2);
			this._constructionLines.arcoCapazCorpo.y = this._bodyArc.y + (offsetY / 2);
			this._constructionLines.arcoCapazCorpo.radius = pathUtils.distance(this._bodyArc, this._tipPoint) / 2;

			const intersection = pathUtils.circleIntersections(this._bodyArc, this._constructionLines.arcoCapazCorpo);

			this._bodyArc.start.radians = intersection[0].radians;

		}

		_calculateHead() {

			const intersectionMiddlePoint = Object.seal({x: 0, y: 0});
			const xOffset = this._headTopArc.start.x - this._bodyArc.end.x;
			const yOffset = this._headTopArc.start.y - this._bodyArc.end.y;
			intersectionMiddlePoint.x = this._bodyArc.end.x + (xOffset / 2);
			intersectionMiddlePoint.y = this._bodyArc.end.y + (yOffset / 2);
			let intersectionAngleInRadians = Math.atan2(yOffset, xOffset);
			intersectionAngleInRadians += (Math.PI / 2);

			this._constructionLines.sideCircleTriangle.intersectionMiddlePoint.x = intersectionMiddlePoint.x;
			this._constructionLines.sideCircleTriangle.intersectionMiddlePoint.y = intersectionMiddlePoint.y;
			this._constructionLines.sideCircleTriangle.intersectionAngleInRadians = intersectionAngleInRadians;

			const hipotenusa = this._headSideArc.radius;
			const catetoOposto = pathUtils.distance(this._headTopArc.start, intersectionMiddlePoint);
			const angulo = Math.asin(catetoOposto / hipotenusa);
			const catetoAdjacente = Math.cos(angulo) * hipotenusa;
			const distance = catetoAdjacente;

			this._headSideArc.x = intersectionMiddlePoint.x - Math.cos(intersectionAngleInRadians) * distance;
			this._headSideArc.y = intersectionMiddlePoint.y - Math.sin(intersectionAngleInRadians) * distance;
			this._headSideArc.start.x = this._headTopArc.start.x;
			this._headSideArc.start.y = this._headTopArc.start.y;
			this._headSideArc.end.x = this._bodyArc.end.x;
			this._headSideArc.end.y = this._bodyArc.end.y;

		}

		_drawShape() {

			this._context.save();

			this._context.strokeStyle = 'hsl(0, 0%, 50%)';
			this._context.lineWidth = 4;

			// this._bodyArc.paint(this._context);
			// body arc mirror
			this._context.beginPath();
			this._context.arc(
				this._bodyArc.x,
				-this._bodyArc.y,
				this._bodyArc.radius,
				TWO_PI - this._bodyArc.end.radians,
				TWO_PI - this._bodyArc.start.radians
			);
			this._context.stroke();

			this._context.moveTo(this._bodyArc.start.x, -this._bodyArc.start.y);
			this._context.lineTo(this._tipPoint.x, this._tipPoint.y);
			// body line mirror
			// this._context.lineTo(this._bodyArc.start.x, this._bodyArc.start.y);
			this._context.stroke();

			// this._headTopArc.paint(this._context);
			// head top arc mirror
			this._context.beginPath();
			this._context.arc(
				this._headTopArc.x,
				-this._headTopArc.y,
				this._headTopArc.radius,
				TWO_PI - this._headTopArc.end.radians,
				TWO_PI - this._headTopArc.start.radians
			);
			this._context.stroke();

			// this._headSideArc.paint(this._context);
			// side arc mirror
			this._context.beginPath();
			this._context.arc(
				this._headSideArc.x,
				-this._headSideArc.y,
				this._headSideArc.radius,
				TWO_PI - this._headSideArc.end.radians,
				TWO_PI - this._headSideArc.start.radians
			);
			this._context.stroke();

			this._context.restore();

		}

		_drawConstructionBodyArcBase() {

			this._context.save();

			this._context.strokeStyle = 'hsl(195, 70%, 35%)';
			this._context.shadowColor = 'hsl(195, 70%, 35%)';
			//this._context.lineWidth = 3;

			this._context.beginPath();
			this._context.arc(
				this._bodyArc.x,
				this._bodyArc.y,
				this._bodyArc.radius,
				0,
				converter.toRadians(180)
			);
			this._context.stroke();

			this._context.beginPath();
			this._context.moveTo(this._bodyArc.x - this._bodyArc.radius - 10, this._bodyArc.y);
			this._context.lineTo(this._bodyArc.x + this._bodyArc.radius + 10, this._bodyArc.y);
			this._context.stroke();

			this._context.beginPath();
			this._context.moveTo(this._bodyArc.x, this._bodyArc.y - 5);
			this._context.lineTo(this._bodyArc.x, this._bodyArc.y + 5);
			this._context.stroke();

			this._context.restore();

		}

		_drawConstructionBodyArc() {

			this._context.save();

			this._context.strokeStyle = 'hsl(195, 100%, 50%)';
			this._context.shadowColor = 'hsl(195, 100%, 50%)';
			this._context.lineWidth = 1;
			//this._context.setLineDash([5, 5]);

			this._context.beginPath();
			this._context.arc(
				this._constructionLines.arcoCapazCorpo.x,
				this._constructionLines.arcoCapazCorpo.y,
				this._constructionLines.arcoCapazCorpo.radius,
				0,
				converter.toRadians(180)
			);
			this._context.stroke();

			this._context.beginPath();
			this._context.moveTo(this._bodyArc.x - 10, this._bodyArc.y);
			this._context.lineTo(this._tipPoint.x + 10, this._tipPoint.y);
			this._context.stroke();

			this._context.beginPath();
			this._context.moveTo(this._constructionLines.arcoCapazCorpo.x, this._constructionLines.arcoCapazCorpo.y - 5);
			this._context.lineTo(this._constructionLines.arcoCapazCorpo.x, this._constructionLines.arcoCapazCorpo.y + 5);
			this._context.stroke();

			this._context.restore();

		}

		_drawConstructionBodyLine() {

			this._context.save();

			this._context.strokeStyle = 'hsl(215, 100%, 50%)';
			this._context.shadowColor = 'hsl(215, 100%, 50%)';
			this._context.lineWidth = 1;

			this._context.beginPath();
			this._context.moveTo(this._bodyArc.x, this._bodyArc.y);
			this._context.lineTo(this._bodyArc.start.x, this._bodyArc.start.y);
			this._context.lineTo(this._tipPoint.x, this._tipPoint.y);
			this._context.stroke();

			// TODO desenhar o ângulo de 90 graus

			this._context.restore();

		}

		_drawConstructionHeadTopArc() {

			this._context.save();

			this._context.strokeStyle = 'hsl(245, 60%, 30%)';
			this._context.shadowColor = 'hsl(245, 60%, 30%)';
			this._context.lineWidth = 1;

			this._context.beginPath();
			this._context.arc(
				this._headTopArc.x,
				this._headTopArc.y,
				this._headTopArc.radius,
				converter.toRadians(0),
				converter.toRadians(180)
			);
			this._context.stroke();

			this._context.beginPath();
			this._context.moveTo(this._headTopArc.x - this._headTopArc.radius - 10, this._headTopArc.y);
			this._context.lineTo(this._headTopArc.x + this._headTopArc.radius + 10, this._headTopArc.y);
			this._context.stroke();

			this._context.beginPath();
			this._context.moveTo(this._headTopArc.x, this._headTopArc.y - 5);
			this._context.lineTo(this._headTopArc.x, this._headTopArc.y + 5);
			this._context.stroke();

			this._context.restore();

		}

		_drawConstructionHeadLines() {

			this._context.save();

			this._context.strokeStyle = 'hsl(270, 100%, 50%)';
			this._context.shadowColor = 'hsl(270, 100%, 50%)';
			this._context.lineWidth = 1;

			this._context.beginPath();
			this._context.moveTo(this._headTopArc.start.x, this._headTopArc.start.y);
			this._context.lineTo(this._bodyArc.end.x, this._bodyArc.end.y);
			this._context.stroke();

			this._context.restore();

		}

		_drawConstructionHeadSideArc() {

			this._context.save();

			this._context.strokeStyle = 'hsl(270, 100%, 50%)';
			this._context.shadowColor = 'hsl(270, 100%, 50%)';
			this._context.lineWidth = 1;

			this._context.beginPath();
			this._context.moveTo(
				this._constructionLines.sideCircleTriangle.intersectionMiddlePoint.x,
				this._constructionLines.sideCircleTriangle.intersectionMiddlePoint.y
			);
			this._context.lineTo(
				this._headSideArc.x,
				this._headSideArc.y
			);
			this._context.stroke();

			this._context.beginPath();
			this._context.arc(
				this._headSideArc.x,
				this._headSideArc.y,
				this._headSideArc.radius,
				converter.toRadians(0),
				converter.toRadians(360)
			);
			this._context.stroke();

			this._context.restore();

		}

	};

	return PinhaoPath;

});



// TODO rever arquitetura disso, talvez usar generator para pegar os pontos ao invés de passar o shader
define('lineTo', ['pathUtils'], (pathUtils) => {

	const lineToOverloadPoints = function(x1, y1, x2, y2, shader) {

		const distanceX = Math.abs(x1 - x2);
		const distanceY = Math.abs(y1 - y2);

		const stepX = (x1 < x2) ? 1 : -1;
		const stepY = (y1 < y2) ? 1 : -1;

		let currentX = x1;
		let currentY = y1;
		let err = (distanceX > distanceY ? distanceX : -distanceY) / 2;
		let currentErr;

		let i = 0;

		while (true)  {

			i += 1;
			if (i > 4097) {
				console.log('guarddog');
				break;
			}

			shader(currentX, currentY);

			if (currentX === x2
				&& currentY === y2
				) {

				break;
			}

			currentErr = err;

			if (currentErr > -distanceX) {
				err -= distanceY;
				currentX += stepX;
			}

			if (currentErr < distanceY) {
				err += distanceX;
				currentY += stepY;
			}

		}

	};

	const lineToOverloadCoordinates = function(point1, point2) {
		return lineToOverloadPoints(point1.x, point1.y, point2.x, point2.y);
	};

	const lineTo = function() {

		let overload;

		if (arguments.length === 5) {
			overload = lineToOverloadPoints;
		} else {
			overload = lineToOverloadCoordinates;
		}

		return overload.apply(this, arguments);

	};

	return lineTo;

});



define('ArrowTool', () => {

	const ArrowTool = class ArrowTool {

		constructor(context) {
			Object.defineProperty(this, '_context', {value: context});
			Object.seal(this);
		}

		// mudar ifs para strategy pattern
		handleEvent(event) {
			//
		}

	};

	return ArrowTool;

});



define('PencilTool', () => {

	const PencilTool =  class PencilTool {

		constructor(context) {
			Object.defineProperties(this, {
				_context: {value: context},
				_isMouseDown: {writable: true, value: false}
			});
			Object.seal(this);
		}

		// mudar ifs para strategy pattern
		handleEvent(event) {

			// abort mouse move early
			if (event.type == 'mousemove' && !this._isMouseDown) {
				return;
			}

			switch(event.type) {

				case 'mousedown':
					this._startDrawing(event.offsetX, event.offsetY);
					break;

				case 'mouseup':
					// TODO se não houve mouse move, tinha que desenhar um ponto mesmo assim
					this._stopDrawing();
					break;

				case 'mousemove':
					this._draw(event.offsetX, event.offsetY);
					break;

				case 'mouseover':
					this._resumeDrawing();
					break;

				case 'mouseout':
					this._stopDrawing();
					break;

				case 'click':
					event.preventDefault();
					event.stopPropagation();
					break;

			}

		}

		_startDrawing(x, y) {
			this._isMouseDown = true;
			this._context.save();
			this._context.beginPath();
			this._context.shadowColor = 'hsl(270, 100%, 0%)';
			this._context.shadowBlur = 10;
			this._context.moveTo(x, y);
		}

		_stopDrawing() {
			if (this._isMouseDown) {
				this._context.stroke();
			}
			this._context.restore();
			this._isMouseDown = false;
		}

		_draw(x, y) {
			this._context.lineTo(x, y);
			this._context.stroke();
			this._context.beginPath();
			this._context.moveTo(x, y);
		}

		_resumeDrawing() {
			// resume / suspend not implemented for this example
		}

		_suspendDrawing() {
			// resume / suspend not implemented for this example
			this._stopDrawing();
		}

	};

	return PencilTool;

});



define('BrushTool', ['lineTo'], (lineTo) => {

	const BrushTool = class BrushTool {

		constructor(context) {

			Object.defineProperties(this, {
				_context: {value: context},
				_isMouseDown: {writable: true, value: false},
				_brushTip: {value: document.createElement('canvas')},
				_brushTipContext: {writable: true, value: null},
				_radius: {writable: true, value: 0},
				_hardness: {writable: true, value: 0},
				_gradient: {writable: true, value: null},
				_startColor: {writable: true, value: 'hsla(0, 0%, 50%, 1)'},
				_endColor: {writable: true, value: 'hsla(0, 0%, 50%, 0)'},
				_previousX:  {writable: true, value: 0},
				_previousY:  {writable: true, value: 0},
				_currentX:  {writable: true, value: 0},
				_currentY:  {writable: true, value: 0},
			});

			const shader = (function(x, y) {
				this._context.drawImage(this._brushTip, x - this._radius, y - this._radius);
			}).bind(this);

			Object.defineProperty(this, '_shader', {value: shader});

			Object.seal(this);

			this.radius = 20;

			// TODO photoshop tem angulo da ponta e inclinação
			// flow é como aplicar uma transparência por cima da cor do pincel
			// opacity é como pintar num layer separado que tem transparência aplicada nele todo
			// opacity nunca vai ficar mais escuro se passarmos o pincel várias vezes pelo mesmo lugar, flow vai

		}

		set radius(radius) {
			// TODO só se for diferente do atual
			// TODO limitar de 0 a 200 ou 400
			this._radius = radius;
			const diameter = radius * 2;
			this._brushTip.width = diameter;
			this._brushTip.height = diameter;
			this._brushTipContext = this._brushTip.getContext('2d');
			this._drawTip();
		}

		set hardness(hardness) {
			// TODO
			// só se for diferente do atual
			// limitar de 0 a 100
			this._hardness = hardness;
			this._drawTip();
		}

		_drawTip() {

			this._gradient = this._brushTipContext.createRadialGradient(
				this._radius, this._radius, this._radius * this._hardness / 100,
				this._radius, this._radius, this._radius
			);

			// TODO gradiente linear parece não ser o adequado, teria que ver um outro método mais suave
			this._gradient.addColorStop(0, this._startColor);
			this._gradient.addColorStop(1, this._endColor);

			this._brushTipContext.save();
			this._brushTipContext.fillStyle = this._gradient;
			this._brushTipContext.beginPath();
			this._brushTipContext.arc(this._radius, this._radius, this._radius, 0, 2 * Math.PI);
			this._brushTipContext.fill();
			this._brushTipContext.restore();

		}

		// mudar ifs para strategy pattern
		handleEvent(event) {

			// abort mouse move early
			if (event.type == 'mousemove' && !this._isMouseDown) {
				return;
			}

			switch(event.type) {

				case 'mousedown':
					this._startDrawing(event.offsetX, event.offsetY);
					break;

				case 'mouseup':
					// TODO se não houve mouse move, tinha que desenhar um ponto mesmo assim
					this._stopDrawing();
					break;

				case 'mousemove':
					this._draw(event.offsetX, event.offsetY);
					break;

				case 'mouseover':
					this._resumeDrawing();
					break;

				case 'mouseout':
					this._stopDrawing();
					break;

				case 'click':
					event.preventDefault();
					event.stopPropagation();
					break;

			}

		}

		_startDrawing(x, y) {
			this._isMouseDown = true;
			this._context.save();
			this._previousX = x;
			this._previousY = y;
		}

		_stopDrawing() {
			this._context.restore();
			this._isMouseDown = false;
		}

		_draw(x, y) {

			this._currentX = Math.floor(x);
			this._currentY = Math.floor(y);

			if (this._currentX === this._previousX
				&& this._currentY === this._previousY
				) {

				return;
			}

			// FIXME o algoritmo vai desenhar a última coordenada tb?
			// se desenhar, vai dar redesenhar na próxima linha, ver melhor opção para isso
			// pq posso desenhar o último ponto no stop draw, mas aí o algoritmo ia ficar errado para dados apenas
			lineTo(this._previousX, this._previousY, this._currentX, this._currentY, this._shader);
			//this._context.drawImage(this._brushTip, x - this._radius, y - this._radius);

			this._previousX = this._currentX;
			this._previousY = this._currentY;

		}

		_resumeDrawing() {
			// resume / suspend not implemented for this example
		}

		_suspendDrawing() {
			// resume / suspend not implemented for this example
			this._stopDrawing();
		}

	};

	return BrushTool;

});



define('RubberTool', () => {

	const RubberTool = class RubberTool {

		constructor(context) {
			Object.defineProperty(this, '_context', {value: context});
			Object.seal(this);
		}

		// mudar ifs para strategy pattern
		handleEvent(event) {
			//
		}

	};

	return RubberTool;

});



define(

	'DrawingCanvas',

	[

		//paths
		'PinhaoPath',

		// tools
		'ArrowTool',
		'PencilTool',
		'BrushTool',
		'RubberTool'

	], (

		// paths
		PinhaoPath,

		// tools
		ArrowTool,
		PencilTool,
		BrushTool,
		RubberTool

	) => {

	let DrawingCanvas = class DrawingCanvas {

		constructor(canvasId) {

			const canvas = document.getElementById(canvasId);
			const context = canvas.getContext('2d');

			Object.defineProperties(this, {
				canvas: {value: canvas},
				context: {value: context},
				objects: {value: []},
				tools: {value: []},
				_activeTool: {writable: true}
			});

			Object.seal(this);

			this._startObjects();

			this._drawObjects();

			this._startTools();
			this._startEvents();

		}

		selectTool(toolIndex) {
			this._activeTool = this.tools[toolIndex];
		}

		// mudar ifs para strategy pattern
		handleEvent(event) {
			this._activeTool.handleEvent(event);
		}

		_startObjects() {
			this.objects.push(new PinhaoPath(this.context, 120, 70));
		}

		_startTools() {
			this.tools.push(new ArrowTool(this.context));
			this.tools.push(new PencilTool(this.context));
			this.tools.push(new BrushTool(this.context));
			this.tools.push(new RubberTool(this.context));
			this.selectTool(2);
		}

		_startEvents() {

			this.canvas.addEventListener('mousedown', this);
			this.canvas.addEventListener('mouseup', this);
			this.canvas.addEventListener('mousemove', this);

			this.canvas.addEventListener('mouseover', this);
			this.canvas.addEventListener('mouseout', this);

			this.canvas.addEventListener('click', this);

		}

		_drawObjects() {
			for (let obj of this.objects) {
				obj.draw();
			}
		}

	};

	return DrawingCanvas;

});



///////////////////////////

// bezier
// a fórmula é k = 4 / 3 * tan(angulo / 2n) // n é o número de segmentos, angulo em pi radianos, mudar a calculadora para radianos!
// ver http://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves
// ver http://stackoverflow.com/questions/33630415/which-are-the-control-points-to-createaproximate-a-circle-using-8-cubic-bezier/33672847#33672847

// bezier 4 segmentos
// startPoint = (1, 0) , controlPoint1 = (1, 0.55228) , controlPoint2 = (0.55228, 1) , endPoint E =(0, 1)

// bezier 8 segmentos
// startPoint = (1, 0) , controlPoint1 = (1, 0,26521648983954)

// girar canvas para os demais pontos de controle?
// se não tem que fazer seno e cosseno com o valor de k