// Type definitions for three.js (WebVR.js)
// Project: https://github.com/mrdoob/three.js/blob/master/examples/js/loaders/WebVR.js
// Definitions by: Darrin Massena <https://github.com/darrinm>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare var WEBVR: {
   isLatestAvailable(): any;
   isAvailable(): boolean;
   getMessage(): HTMLDivElement | undefined;
   getButton(effect): HTMLButtonElement;
}
