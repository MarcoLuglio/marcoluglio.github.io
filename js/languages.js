import { NodeListIterator } from './iterators.js';



const Languages = class Languages {

	constructor(meterWidth) {

		const meters = new NodeListIterator(document.querySelectorAll('.idiomas meter'));

		Object.defineProperties(this, {
			_meters: {value: meters},
			_meterWidth: {value: meterWidth}
		});

		Object.seal(this);

		this._formatMeters();

	}

	_formatMeters() {

		let meterParent = null;
		let prettyMeter = null;
		let prettyMeterWidth = 0;
		let amount = 0;

		for (let meter of this._meters) {
			amount = this._meterWidth / meter.max;
			prettyMeterWidth = meter.value * this._meterWidth / meter.max;
			//prettyMeterWidth = this._throttle(prettyMeterWidth, amount);
			meterParent = meter.parentNode;
			prettyMeter = document.createElement('div');
			prettyMeter.style.width = prettyMeterWidth + 'px';
			meter.style.visibility = 'hidden';
			meterParent.appendChild(prettyMeter);
		}

	}

	_throttle(value, amount) {
		//n = n + (10 - n % 10);
		// tinha que ver antes se já não está redondo, sem precisar de throttle
		let remaining = (amount - value % amount);
		/*if (remaining < (amount / 2)) {
			remaining = -remaining;
		}*/
		const newValue = value - remaining; // era +
		return newValue;
	}

};

export { Languages };
