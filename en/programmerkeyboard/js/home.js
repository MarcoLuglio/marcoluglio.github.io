const AKey = class AKey extends HTMLElement {

	constructor() {

		super();

		const template = document.getElementById('a-key-template');
		const templateContent = template.content;
		const content = templateContent.cloneNode(true);

		if (this.className) {
			const cap = content.querySelector('.cap');
			for (const item of this.classList) {
				cap.classList.add(item);
			}
		}

		const shadowRoot = this
			.attachShadow({mode: 'open'})
			.appendChild(content);

	}

};



customElements.define('a-key', AKey);



export default AKey;