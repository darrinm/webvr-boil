// Type definitions for three.js (ViveController.js)
// Project: https://github.com/mrdoob/three.js/blob/master/examples/js/vr/ViveController.js
// Definitions by: Darrin Massena <https://github.com/darrinm>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped



declare namespace THREE {
    export class ViveController extends THREE.Object3D {
        constructor(id: number);
        findGamePad(id: string): Gamepad;
        getGamePad(): Gamepad;
        getButtonState(button: string): boolean;
        update(): void;

        matrixAutoUpdate: boolean;
        standingMatrix: THREE.Matrix4;
    }
}
