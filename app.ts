import * as THREE from 'three';

// TODO: three-vrcontrols.d.ts is out of date.
interface VRControlsFixed extends THREE.VRControls {
	constructor(camera: THREE.Camera, callback?: (param: string) => void);

	resetSensor(): void;
	resetPose(): void;
	getStandingMatrix(): THREE.Matrix4;

	standing: boolean;
	userHeight: number;
}

export class App {
	container: HTMLDivElement;
	camera: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	renderer: THREE.WebGLRenderer;
	effect: THREE.VREffect;
	controls: VRControlsFixed;
	controller1: THREE.ViveController;
	controller2: THREE.ViveController;
	raycaster = new THREE.Raycaster();
	intersected: THREE.Object3D[] = [];
	tempMatrix = new THREE.Matrix4();
	group = new THREE.Group();

	mouse = new THREE.Vector2();
	intersectedMesh?: THREE.Mesh;
	selectedMesh?: THREE.Mesh;
	intersectionOffset = new THREE.Vector3();
	intersectionPlane = new THREE.Plane();

	constructor() {
		if (WEBVR.isAvailable() === false) {
			document.body.appendChild(<Node>WEBVR.getMessage());
		}

		this.init();
		this.animate();
	}

	init() {
		let container = this.container = document.createElement('div');
		document.body.appendChild(container);

		let scene = this.scene = new THREE.Scene();
		window['scene'] = scene; // For three.js inspector
		scene.background = new THREE.Color(0x808080);

		let camera = this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10);
		scene.add(camera);

		let geometry = new THREE.PlaneGeometry(4, 4);
		let material = new THREE.MeshStandardMaterial({
			color: 0xeeeeee,
			roughness: 1.0,
			metalness: 0.0
		});
		let floor = new THREE.Mesh(geometry, material);
		floor.rotation.x = - Math.PI / 2;
		floor.receiveShadow = true;
		scene.add(floor);

		scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

		let light = new THREE.DirectionalLight(0xffffff);
		light.position.set(0, 6, 0);
		light.castShadow = true;
		let shadowCamera = <THREE.OrthographicCamera>light.shadow.camera;
		shadowCamera.top = 2;
		shadowCamera.bottom = -2;
		shadowCamera.right = 2;
		shadowCamera.left = -2;
		light.shadow.mapSize.set(4096, 4096);
		scene.add(light);

		let group = this.group;
		scene.add(group);

		let geometries: THREE.Geometry[] = [
			new THREE.BoxGeometry(0.2, 0.2, 0.2),
			new THREE.ConeGeometry(0.2, 0.2, 64),
			new THREE.CylinderGeometry(0.2, 0.2, 0.2, 64),
			new THREE.IcosahedronGeometry(0.2, 3),
			new THREE.TorusGeometry(0.2, 0.04, 64, 32)
		];

		for (let i = 0; i < 50; i++) {
			let geometry = geometries[Math.floor(Math.random() * geometries.length)];
			let material = new THREE.MeshStandardMaterial({
				color: Math.random() * 0xffffff,
				roughness: 0.7,
				metalness: 0.0
			});

			let object = new THREE.Mesh(geometry, material);

			object.position.x = Math.random() * 4 - 2;
			object.position.y = Math.random() * 2;
			object.position.z = Math.random() * 4 - 2;

			object.rotation.x = Math.random() * 2 * Math.PI;
			object.rotation.y = Math.random() * 2 * Math.PI;
			object.rotation.z = Math.random() * 2 * Math.PI;

			object.scale.setScalar(Math.random() + 0.5);

			object.castShadow = true;
			object.receiveShadow = true;

			object.name = 'geom' + i;

			this.scene.add(object);
		}

		//

		let renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.shadowMap.enabled = true;
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		container.appendChild(renderer.domElement);

		let controls = this.controls = <VRControlsFixed>new THREE.VRControls(camera);
		controls.standing = true;

		// controllers

		let controller1 = this.controller1 = new THREE.ViveController(0);
		controller1.standingMatrix = controls.getStandingMatrix();
		controller1.addEventListener('triggerdown', (event) => this.onTriggerDown(event));
		controller1.addEventListener('triggerup', (event) => this.onTriggerUp(event));
		scene.add(controller1);

		let controller2 = this.controller2 = new THREE.ViveController(1);
		controller2.standingMatrix = controls.getStandingMatrix();
		controller2.addEventListener('triggerdown', (event) => this.onTriggerDown(event));
		controller2.addEventListener('triggerup', (event) => this.onTriggerUp(event));
		scene.add(controller2);

		let loader = new THREE.OBJLoader();
		loader.setPath('models/obj/vive-controller/');
		loader.load('vr_controller_vive_1_5.obj', function (object) {
			let loader = new THREE.TextureLoader();
			loader.setPath('models/obj/vive-controller/');

			let meshMaterial = <THREE.MeshBasicMaterial>(<THREE.Mesh>object.children[0]).material;
			meshMaterial.map = loader.load('onepointfive_texture.png');
			meshMaterial.specularMap = loader.load('onepointfive_spec.png');

			controller1.add(object.clone());
			controller2.add(object.clone());
		});

		//
		let geometry2 = new THREE.Geometry();
		geometry2.vertices.push(new THREE.Vector3(0, 0, 0));
		geometry2.vertices.push(new THREE.Vector3(0, 0, - 1));

		let line = new THREE.Line(geometry2);
		line.name = 'line';
		line.scale.z = 5;

		controller1.add(line.clone());
		controller2.add(line.clone());

		// Mouse drag/drop stuff.

		renderer.domElement.addEventListener('mousemove', (event) => this.onDocumentMouseMove(event));
		renderer.domElement.addEventListener('mousedown', (event) => this.onDocumentMouseDown(event));
		renderer.domElement.addEventListener('mouseup', (event) => this.onDocumentMouseUp(event));

		//
		let effect = this.effect = new THREE.VREffect(renderer);

		if (WEBVR.isAvailable() === true) {
			document.body.appendChild(WEBVR.getButton(effect));
		}

		//
		window.addEventListener('resize', () => this.onWindowResize(), false);
	}

	private onDocumentMouseDown(event: MouseEvent) {
		event.preventDefault();

		this.raycaster.setFromCamera(this.mouse, this.camera);
		let intersects = this.raycaster.intersectObjects(this.scene.children, true);
		if (intersects.length > 0) {
			//controls.enabled = false;
			this.selectedMesh = <THREE.Mesh>intersects[0].object;
			let intersectionPoint = this.raycaster.ray.intersectPlane(this.intersectionPlane);
			if (intersectionPoint)
				this.intersectionOffset.copy(intersectionPoint).sub(this.selectedMesh.position);
			this.container.style.cursor = 'move';
		}
	}

	private onDocumentMouseMove(event: MouseEvent) {
		event.preventDefault();

		// Calculate mouse position in normalized device coordinates
		// (-1 to +1) for both components.
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);
		if (this.selectedMesh) {
			let intersectionPoint = this.raycaster.ray.intersectPlane(this.intersectionPlane);
			if (intersectionPoint)
				this.selectedMesh.position.copy(intersectionPoint.sub(this.intersectionOffset));
			return;
		}
		let intersects = this.raycaster.intersectObjects(this.scene.children, true);
		if (intersects.length > 0) {
			if (this.intersectedMesh != intersects[0].object) {
				if (this.intersectedMesh)
					(<THREE.MeshStandardMaterial>this.intersectedMesh.material).color.setHex(this.intersectedMesh['originalColor']);
				this.intersectedMesh = <THREE.Mesh>intersects[0].object;
				this.intersectedMesh['originalColor'] = (<THREE.MeshStandardMaterial>this.intersectedMesh.material).color.getHex();
				(<THREE.MeshStandardMaterial>this.intersectedMesh.material).color.setHex(0xffff00);
				this.intersectionPlane.setFromNormalAndCoplanarPoint(
					this.camera.getWorldDirection(this.intersectionPlane.normal),
					this.intersectedMesh.position);
			}
			this.container.style.cursor = 'pointer';
		} else {
			if (this.intersectedMesh)
				(<THREE.MeshStandardMaterial>this.intersectedMesh.material).color.setHex(this.intersectedMesh['originalColor']);
			this.intersectedMesh = undefined;
			this.container.style.cursor = 'auto';
		}
	}

	private onDocumentMouseUp(event: MouseEvent) {
		event.preventDefault();

		//controls.enabled = true;
		this.selectedMesh = undefined;
		this.container.style.cursor = 'auto';
	}

	private onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.effect.setSize(window.innerWidth, window.innerHeight);
	}

	private onTriggerDown(event) {
		let controller = <THREE.Object3D>event.target;
		let intersections = this.getIntersections(controller);

		if (intersections.length > 0) {
			let intersection = intersections[0];

			this.tempMatrix.getInverse(controller.matrixWorld);

			let object = <THREE.Mesh>intersection.object;
			object.matrix.premultiply(this.tempMatrix);
			object.matrix.decompose(object.position, object.quaternion, object.scale);
			(<THREE.MeshStandardMaterial>object.material).emissive.b = 1;
			controller.add(object);

			controller.userData.selected = object;
		}
	}

	private onTriggerUp(event) {
		let controller = <THREE.Object3D>event.target;
		if (controller.userData.selected !== undefined) {
			let object = <THREE.Mesh>controller.userData.selected;
			object.matrix.premultiply(controller.matrixWorld);
			object.matrix.decompose(object.position, object.quaternion, object.scale);
			(<THREE.MeshStandardMaterial>object.material).emissive.b = 0;
			this.group.add(object);

			controller.userData.selected = undefined;
		}
	}

	private getIntersections(controller): THREE.Intersection[] {
		this.tempMatrix.identity().extractRotation(controller.matrixWorld);

		this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
		this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

		return this.raycaster.intersectObjects(this.scene.children, true);
	}

	private intersectObjects(controller) {
		// Do not highlight when already selected

		if (controller.userData.selected !== undefined) return;

		let line = controller.getObjectByName('line');
		let intersections = this.getIntersections(controller);

		if (intersections.length > 0) {
			let intersection = intersections[0];

			let object = <THREE.Mesh>intersection.object;
			(<THREE.MeshStandardMaterial>object.material).emissive.r = 1;
			this.intersected.push(object);

			line.scale.z = intersection.distance;
		} else {
			line.scale.z = 5;
		}
	}

	private cleanIntersected() {
		while (this.intersected.length) {
			let object = <THREE.Mesh>this.intersected.pop();
			(<THREE.MeshStandardMaterial>object.material).emissive.r = 0;
		}
	}

	//

	private animate() {
		// TODO: three-vreffect.d.ts is out of date
		(<any>this.effect).requestAnimationFrame(() => this.animate());
		this.render();
	}

	private render() {
		this.controller1.update();
		this.controller2.update();

		this.controls.update();

		this.cleanIntersected();

		this.intersectObjects(this.controller1);
		this.intersectObjects(this.controller2);

		this.effect.render(this.scene, this.camera);
	}
}
