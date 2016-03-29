'use strict';



/*

time, begin, change, duration
time tempo desde o início do tween. vai de 0 até duração
begin valor inicial
change valor final - inicial
duration duração total to tween


// quartic
public static function easeInQuart (t:Number, b:Number, c:Number, d:Number):Number
{
	return c*(t/=d)*t*t*t + b;
}
public static function easeOutQuart (t:Number, b:Number, c:Number, d:Number):Number
{
	return -c * ((t=t/d-1)*t*t*t - 1) + b;
}
public static function easeInOutQuart (t:Number, b:Number, c:Number, d:Number):Number
{
	if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
	return -c/2 * ((t-=2)*t*t*t - 2) + b;
}

// Exponential
public static function easeInExpo (t:Number, b:Number, c:Number, d:Number):Number
{
	return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
}
public static function easeOutExpo (t:Number, b:Number, c:Number, d:Number):Number
{
	return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
}
public static function easeInOutExpo (t:Number, b:Number, c:Number, d:Number):Number
{
	if (t==0) return b;
	if (t==d) return b+c;
	if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
	return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
}


class mx.transitions.easing.Elastic {

	static function easeIn (t:Number, b:Number, c:Number, d:Number, a:Number, p:Number):Number {
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (!a || a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	}
	static function easeOut (t:Number, b:Number, c:Number, d:Number, a:Number, p:Number):Number {
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (!a || a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return (a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b);
	}
	static function easeInOut (t:Number, b:Number, c:Number, d:Number, a:Number, p:Number):Number {
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (!a || a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	}
}

class mx.transitions.easing.Bounce {

	static function easeOut (t:Number, b:Number, c:Number, d:Number):Number {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	}
	static function easeIn (t:Number, b:Number, c:Number, d:Number):Number {
		return c - mx.transitions.easing.Bounce.easeOut (d-t, 0, c, d) + b;
	}
	static function easeInOut (t:Number, b:Number, c:Number, d:Number):Number {
		if (t < d/2) return mx.transitions.easing.Bounce.easeIn (t*2, 0, c, d) * .5 + b;
		else return mx.transitions.easing.Bounce.easeOut (t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
}

// é como um elastic, mas só faz uma vez
class mx.transitions.easing.Back {

	static function easeIn (t:Number, b:Number, c:Number, d:Number, s:Number):Number {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	}
	static function easeOut (t:Number, b:Number, c:Number, d:Number, s:Number):Number {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	}
	static function easeInOut (t:Number, b:Number, c:Number, d:Number, s:Number):Number {
		if (s == undefined) s = 1.70158;
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	}
}











*/



define('easingLinear', () => {

	const easingFunction = (t, b, c, d) => {
		return c * t / d + b;
	};

	const easingLinear = Object.create({}, {

		in: {
			enumerable: true,
			value: easingFunction
		},

		out: {
			enumerable: true,
			value: easingFunction
		},

		inOut: {
			enumerable: true,
			value: easingFunction
		},

	});

	return Object.freeze(easingLinear);

});

// ActionScript naming
define('easingNone', ['easingLinear'], (easingLinear) => {
	return easingLinear;
});

define('easingSine', () => {

	const halfPi = Math.PI / 2;

	const easingSine = Object.create({}, {
		in: {
			enumerable: true,
			value: (t, b, c, d) => {
				return -c * Math.cos(t / d * (halfPi)) + c + b;
			}
		},
		out: {
			enumerable: true,
			value: (t, b, c, d) => {
				return c * Math.sin(t / d * (halfPi)) + b;
			}
		},
		inOut: {
			enumerable: true,
			value: (t, b, c, d) => {
				return -c/2 * (Math.cos(Math.PI * t / d) - 1) + b;
			}
		}
	});

	return Object.freeze(easingSine);

});

// jQuery naming
define('easingSwing', ['easingSine'], (easingSine) => {
	return easingSine;
});

define('easing2', () => {

	const easing2 = Object.create({}, {
		in: {
			enumerable: true,
			value: (t, b, c, d) => {
				return c * (t /= d) * t + b;
			}
		},
		out: {
			enumerable: true,
			value: (t, b, c, d) => {
				return -c * (t /= d) * (t - 2) + b;
			}
		},
		inOut: {
			enumerable: true,
			value: (t, b, c, d) => {
				if ((t /= d/2) < 1) {
					return c / 2 * t * t + b;
				}
				return -c / 2 * ((t - 1) * (t - 2) - 1) + b;
			}
		}
	});

	return Object.freeze(easing2);

});

// ActionScript naming
define('easingRegular', ['easing2'], (easing2) => {
	return easing2;
});

define('easing3', () => {
	/*
	easeInCubic: function (t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	*/
});

define('easing4', () => {
	/*
	easeInQuart: function (t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	*/
});

define('easing5', () => {

	const easing5 = Object.create({}, {
		in: {
			enumerable: true,
			value: (t, b, c, d) => {
				return c * (t /= d) * t * t * t * t + b;
			}
		},
		out: {
			enumerable: true,
			value: (t, b, c, d) => {
				return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
			}
		},
		inOut: {
			enumerable: true,
			value: (t, b, c, d) => {
				if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
				return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
			}
		}
	});

	return Object.freeze(easing5);

});

// ActionScript naming
define('easingStrong', ['easing5'], (easing5) => {
	return easing5;
});

define('easingExponetial', () => {
	/*
	easeInExpo: function (t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * (t - 1) + 2) + b;
	},
	*/
});

define('easingCircular', () => {
	/*
	easeInCirc: function (t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	*/
});

// igual elastic mas só faz uma vez
define('easingBack', () => {
	/*
	easeInBack: function (t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	*/
});

define('easingElastic', () => {

	const twoPi = 2 * Math.PI;

	/*
	easeInElastic: function (t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(twoPi) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(twoPi)/p )) + b;
	},
	easeOutElastic: function (t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(twoPi) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(twoPi)/p ) + c + b;
	},
	easeInOutElastic: function (t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(twoPi) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(twoPi)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(twoPi)/p )*.5 + c + b;
	},
	*/
});

define('easingBounce', () => {
	/*
	easeInBounce: function (t, b, c, d) {
		return c - this.easeOutBounce (d-t, 0, c, d) + b;
	},
	easeOutBounce: function (t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (t, b, c, d) {
		if (t < d/2) return this.easeInBounce (t*2, 0, c, d) * .5 + b;
		return this.easeOutBounce (t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
	*/
});



define('animate', () => {

	const AnimationIterator = class AnimationIterator {

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
	const animationGenerator = function*(easing, start, finish, duration) {

		let animationValue = start;

		let animationTime = 0;
		const change = finish - start;

		while(animationTime <= duration) {
			animationValue = easing(animationTime, start, change, duration);
			animationTime = yield animationValue;
		}

		if (animationValue < finish) {
			return finish;
		}

	};

	/**
	 * Animação "manual". Devolve um iterador que deve ser chamado para obter cada valor da animação.
	 */
	const animate = (easing, start, finish, duration) => {
		if (!duration) {
			throw new Error('Duration must be greater than 0');
		}
		const iterator = animationGenerator(easing, start, finish, duration);
		const animationIterator = new AnimationIterator(iterator);
		return animationIterator;
	}

	return animate;

});



// TODO fazer um tween que modifica diretamente as propriedades de um objeto como o flash fazia?
// obj:Object, prop:String, easingFunction:Function, begin:Number, finish:Number, duration:Number, useSeconds:Boolean = false



define('AnimationDispatcher', () => { // TODO ver o nome de acordo com convenção JavaScript, se dispatcher, broadcaster, EventRaiser, sei lá

	/**
	 * Evento da animação
	 */
	const AnimationEvent = class AnimationEvent {
		constructor(tempo, valor, seiLa) {
			// TODO
			Object.seal(this);
		}
	};

	/**
	 * Animação que dispara eventos
	 */
	const AnimationDispatcher = class AnimationDispatcher {
		constructor(easing, start, finish, duration) {
			// TODO criar animacao, chamar next dentro de um requestAnimationFrame e disparar AnimacaoEvent
		}
	};

	return AnimationDispatcher;

});



define('Timeline', ['ArrayReverseIterator', 'Deferred'], (ArrayReverseIterator, Deferred) => {


	const TimelineArray = class {

		// TODO ver se extendo Array nativo ou wrap um nativo com Symbol.iterator
		// de qualquer maneira vou ter que usar Symbol.iterator

	}


	const TimelineAnimation = class TimelineAnimation {

		constructor(animationIterator, startTime, callback, deferred) {

			Object.defineProperties(this, {
				animationIterator: {value: animationIterator},
				startTime: {value: startTime},
				callback: {value: callback},
				deferred: {value: deferred}
			});

			Object.seal(this);

		}

	};


	const Timeline = class Timeline {

		constructor() {

			Object.defineProperties(this, {
				_animations: {value: []},
				_activeAnimations: {value: []},
				_timelineTime: {writable: true, value: 0}
			});

			Object.seal(this);

		}

		next(deltaTime) {
			if (!deltaTime) {
				throw new Error('Elapsed time must be greater than 0');
			}
			this._timelineTime += deltaTime;
			this._checkAnimations();
			this._iterate(deltaTime);
		}

		/**
		 * TODO pq fiz async?
		 */
		add(animationIterator, startTime, callback) {

			const deferred = new Deferred();

			const newTimelineAnimation = new TimelineAnimation(animationIterator, startTime, callback, deferred);

			if (!startTime || startTime < this._timelineTime) {
				this._activeAnimations.push(newTimelineAnimation);
				return deferred;
			}

			// insere ordenado pelo startTime

			if (!this._animations.length) {
				this._animations.push(newTimelineAnimation);
				return deferred;
			}

			let timelineAnimation;
			for (let i = this._animations.length - 1; i >= 0; i--) {
				timelineAnimation = this._animations[i];
				if (timelineAnimation.startTime < startTime || i === 0) {
					if (i === 0) {
						i = -1;
					}
					this._animations.splice(i + 1, 0, new TimelineAnimation(animationIterator, startTime));
					break;
				}
			}

			return deferred;

		}

		remove(animationIterator) {

			let removed = this._removeFrom(animationIterator, this._activeAnimations);
			if (!removed) {
				removed = this._removeFrom(animationIterator, this._animations);
			}

			return removed;

		}

		get isActive() {
			if (this._animations.length || this._activeAnimations.length) {
				return true;
			}
			return false;
		}

		_checkAnimations() {

			// TODO otimizar o uso dessas variáveis depois
			let timelineAnimation;
			let activeAnimations = [];
			let animation;

			for (let timelineAnimation of this._animations) {

				// como a array é ordenada pelo startTime, posso abortar cedo
				if (timelineAnimation.startTime > this._timelineTime) {
					break;
				}

				activeAnimations.push(i);

			}

			for (let index of activeAnimations) {
				animation = this._animations.splice(index, 1)[0];
				this._activeAnimations.push(animation);
			}

		}

		_iterate(tempoDelta) {

			let animation;
			let animationValue; // TODO reutilizar isso entre as chamadas se for ficar aqui

			for (let i = this._activeAnimations.length - 1; i >= 0; i--) {

				animation = this._activeAnimations[i];

				if (!animation.animationIterator.done) {
					animationValue = animation.animationIterator.next(tempoDelta);
					animation.callback(animationValue.value);
				} else {
					this._activeAnimations.splice(i, 1);
					animation.deferred.resolve(animation.animationIterator.value);
				}

			}

		}

		_removeFrom(animationIterator, array) {

			const activeAnimationsReverseIterator = new ArrayReverseIterator(array);

			for (let timelineAnimation of activeAnimationsReverseIterator) {
				if (timelineAnimation.animationIterator === animationIterator) {
					array.splice(activeAnimationsReverseIterator.currentIndex, 1);
					return true;
				}
			}

			return false;

		}

	};

	return Timeline;

});