// TODO: three-vrcontrols.d.ts is out of date.
declare namespace THREE {
    export class VRControlsFixed extends VRControls {
        constructor(camera: Camera, callback?: (param: string)=>void);

		resetSensor(): void;
		resetPose(): void;
		getStandingMatrix(): THREE.Matrix4;

		standing: boolean;
		userHeight: number;
    }
}

if (WEBVR.isAvailable() === false) {
	document.body.appendChild(<Node>WEBVR.getMessage());
}

var container: HTMLDivElement;
var camera: THREE.PerspectiveCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer;
var effect: THREE.VREffect, controls: THREE.VRControlsFixed;
var controller1: THREE.ViveController, controller2: THREE.ViveController;

var raycaster: THREE.Raycaster, intersected: THREE.Object3D[] = [];
var tempMatrix = new THREE.Matrix4();

var group: THREE.Group;

init();
animate();

function init() {
	container = document.createElement('div');
	document.body.appendChild(container);

	scene = new THREE.Scene();
	window['scene'] = scene; // For three.js inspector
	scene.background = new THREE.Color(0x808080);

	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10);
	scene.add(camera);

	let geometry = new THREE.PlaneGeometry(4, 4);
	let material = new THREE.MeshStandardMaterial({
		color: 0xeeeeee,
		roughness: 1.0,
		metalness: 0.0
	});
	var floor = new THREE.Mesh(geometry, material);
	floor.rotation.x = - Math.PI / 2;
	floor.receiveShadow = true;
	scene.add(floor);

	scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

	var light = new THREE.DirectionalLight(0xffffff);
	light.position.set(0, 6, 0);
	light.castShadow = true;
	let shadowCamera = <THREE.OrthographicCamera>light.shadow.camera;
	shadowCamera.top = 2;
	shadowCamera.bottom = -2;
	shadowCamera.right = 2;
	shadowCamera.left = -2;
	light.shadow.mapSize.set(4096, 4096);
	scene.add(light);

	group = new THREE.Group();
	scene.add(group);

	var geometries: THREE.Geometry[] = [
		new THREE.BoxGeometry(0.2, 0.2, 0.2),
		new THREE.ConeGeometry(0.2, 0.2, 64),
		new THREE.CylinderGeometry(0.2, 0.2, 0.2, 64),
		new THREE.IcosahedronGeometry(0.2, 3),
		new THREE.TorusGeometry(0.2, 0.04, 64, 32)
	];

	for (var i = 0; i < 50; i++) {
		let geometry = geometries[Math.floor(Math.random() * geometries.length)];
		let material = new THREE.MeshStandardMaterial({
			color: Math.random() * 0xffffff,
			roughness: 0.7,
			metalness: 0.0
		});

		var object = new THREE.Mesh(geometry, material);

		object.position.x = Math.random() * 4 - 2;
		object.position.y = Math.random() * 2;
		object.position.z = Math.random() * 4 - 2;

		object.rotation.x = Math.random() * 2 * Math.PI;
		object.rotation.y = Math.random() * 2 * Math.PI;
		object.rotation.z = Math.random() * 2 * Math.PI;

		object.scale.setScalar(Math.random() + 0.5);

		object.castShadow = true;
		object.receiveShadow = true;

		group.add(object);
	}

	//

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	container.appendChild(renderer.domElement);

	controls = <THREE.VRControlsFixed>new THREE.VRControls(camera);
	controls.standing = true;

	// controllers

	controller1 = new THREE.ViveController(0);
	controller1.standingMatrix = controls.getStandingMatrix();
	controller1.addEventListener('triggerdown', onTriggerDown);
	controller1.addEventListener('triggerup', onTriggerUp);
	scene.add(controller1);

	controller2 = new THREE.ViveController(1);
	controller2.standingMatrix = controls.getStandingMatrix();
	controller2.addEventListener('triggerdown', onTriggerDown);
	controller2.addEventListener('triggerup', onTriggerUp);
	scene.add(controller2);

	var loader = new THREE.OBJLoader();
	loader.setPath('models/obj/vive-controller/');
	loader.load('vr_controller_vive_1_5.obj', function (object) {
		var loader = new THREE.TextureLoader();
		loader.setPath('models/obj/vive-controller/');

		var meshMaterial = <THREE.MeshBasicMaterial>(<THREE.Mesh>object.children[0]).material;
		meshMaterial.map = loader.load('onepointfive_texture.png');
		meshMaterial.specularMap = loader.load('onepointfive_spec.png');

		controller1.add(object.clone());
		controller2.add(object.clone());
	});

	//
	let geometry2 = new THREE.Geometry();
	geometry2.vertices.push(new THREE.Vector3(0, 0, 0));
	geometry2.vertices.push(new THREE.Vector3(0, 0, - 1));

	var line = new THREE.Line(geometry2);
	line.name = 'line';
	line.scale.z = 5;

	controller1.add(line.clone());
	controller2.add(line.clone());

	raycaster = new THREE.Raycaster();

	//
	effect = new THREE.VREffect(renderer);

	if (WEBVR.isAvailable() === true) {
		document.body.appendChild(WEBVR.getButton(effect));
	}

	//
	window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	effect.setSize(window.innerWidth, window.innerHeight);
}

function onTriggerDown(event) {
	var controller = <THREE.Object3D>event.target;
	var intersections = getIntersections(controller);

	if (intersections.length > 0) {
		var intersection = intersections[0];

		tempMatrix.getInverse(controller.matrixWorld);

		var object = <THREE.Mesh>intersection.object;
		object.matrix.premultiply(tempMatrix);
		object.matrix.decompose(object.position, object.quaternion, object.scale);
		(<THREE.MeshStandardMaterial>object.material).emissive.b = 1;
		controller.add(object);

		controller.userData.selected = object;
	}
}

function onTriggerUp(event) {
	var controller = <THREE.Object3D>event.target;
	if (controller.userData.selected !== undefined) {
		var object = <THREE.Mesh>controller.userData.selected;
		object.matrix.premultiply(controller.matrixWorld);
		object.matrix.decompose(object.position, object.quaternion, object.scale);
		(<THREE.MeshStandardMaterial>object.material).emissive.b = 0;
		group.add(object);

		controller.userData.selected = undefined;
	}
}

function getIntersections(controller): THREE.Intersection[] {
	tempMatrix.identity().extractRotation(controller.matrixWorld);

	raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
	raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

	return raycaster.intersectObjects(group.children);
}

function intersectObjects(controller) {
	// Do not highlight when already selected

	if (controller.userData.selected !== undefined) return;

	var line = controller.getObjectByName('line');
	var intersections = getIntersections(controller);

	if (intersections.length > 0) {
		var intersection = intersections[0];

		var object = <THREE.Mesh>intersection.object;
		(<THREE.MeshStandardMaterial>object.material).emissive.r = 1;
		intersected.push(object);

		line.scale.z = intersection.distance;
	} else {
		line.scale.z = 5;
	}
}

function cleanIntersected() {
	while (intersected.length) {
		var object = <THREE.Mesh>intersected.pop();
		(<THREE.MeshStandardMaterial>object.material).emissive.r = 0;
	}
}

//

function animate() {
	// TODO: three-vreffect.d.ts is out of date
	(<any>effect).requestAnimationFrame(animate);
	render();
}

function render() {
	controller1.update();
	controller2.update();

	controls.update();

	cleanIntersected();

	intersectObjects(controller1);
	intersectObjects(controller2);

	effect.render(scene, camera);
}

