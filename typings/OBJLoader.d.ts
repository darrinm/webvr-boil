// Type definitions for three.js (OBJLoader.js)
// Project: https://github.com/mrdoob/three.js/blob/master/examples/js/loaders/OBJLoader.js
// Definitions by: Darrin Massena <https://github.com/darrinm>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped



declare namespace THREE {
    export class OBJLoader {
        constructor();
        load(url: string, onLoad: (object: any) => void, onProgress?, onError?): void;
        setPath(value: string): void;
    }
}
