//import("./wasm_101.js")
//  .catch(e => console.error("Error importing `index.js`:", e));

import init from "./wasm_101.js";

(async () => {
	const wasm = await init("js/wasm_101_bg.wasm");
	// wasm.greet();
	// this module has an auto init function
})();