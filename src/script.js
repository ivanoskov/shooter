import * as THREE from "three";
// import * as CANNON from "cannon-es";
import Stats from "three/examples/jsm/libs/stats.module";
import { Octree } from "three/addons/math/Octree.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Capsule } from "three/addons/math/Capsule.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
// import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
// import CannonDebugger from "cannon-es-debugger";
// import GameObject from "./gameObject.js";

import "./style.css";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);
// const world = new CANNON.World();
// world.gravity.set(0, -9.8, 0);
const canvas = document.querySelector(".canvas");

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const STEPS_PER_FRAME = 5;

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
// camera.position.z = 2;
camera.position.y = 1;
camera.rotation.order = "YXZ";
scene.add(camera);

const worldOctree = new Octree();




const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(- 5, 25, - 1);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = - 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = - 30;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = - 0.00006;
scene.add(directionalLight);


const stats = new Stats();
document.body.appendChild(stats.dom);

canvas.addEventListener("mousedown", () => {
  document.body.requestPointerLock();
});

document.body.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    camera.rotation.y -= event.movementX / 500;
    camera.rotation.x -= event.movementY / 500;
  }
});

document.addEventListener("keydown", (event) => {
  keyStates[event.code] = true;
});

document.addEventListener("keyup", (event) => {
  keyStates[event.code] = false;
});

const GRAVITY = 30;


const playerCollider = new Capsule(
  new THREE.Vector3(0, 0.35, 0),
  new THREE.Vector3(0, 1, 0),
  3
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;

const keyStates = {};

function getForwardVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();

  return playerDirection;
}

function controls(deltaTime) {
  // gives a bit of air control
  const speedDelta = deltaTime * (playerOnFloor ? 25 : 8);

  if (keyStates["KeyW"]) {
    playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
  }

  if (keyStates["KeyS"]) {
    playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
  }

  if (keyStates["KeyA"]) {
    playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
  }

  if (keyStates["KeyD"]) {
    playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
  }

  if (playerOnFloor) {
    if (keyStates["Space"]) {
      playerVelocity.y = 15;
    }
  }
}

function getSideVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  playerDirection.cross(camera.up);

  return playerDirection;
}

function updatePlayer(deltaTime) {
  let damping = Math.exp(-4 * deltaTime) - 1;

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * deltaTime;

    // small air resistance
    damping *= 0.1;
  }

  playerVelocity.addScaledVector(playerVelocity, damping);

  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerCollider.translate(deltaPosition);

  playerCollisions();

  camera.position.copy(playerCollider.end);
}

function playerCollisions() {

  const result = worldOctree.capsuleIntersect(playerCollider);

  playerOnFloor = false;

  if (result) {

    playerOnFloor = result.normal.y > 0;

    if (!playerOnFloor) {

      playerVelocity.addScaledVector(result.normal, - result.normal.dot(playerVelocity));

    }

    playerCollider.translate(result.normal.multiplyScalar(result.depth));

  }

}

// floor

const geometryFloor = new THREE.BoxGeometry(1, 0.1, 1);
const materialFloor = new THREE.MeshBasicMaterial({
  color: "white",
  wireframe: true,
});

const meshFloor = new THREE.Mesh(geometryFloor, materialFloor);
scene.add(meshFloor);

// box

const geometryBox = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const materialBox = new THREE.MeshBasicMaterial({
  color: "red",
  wireframe: true,
});

const meshBox = new THREE.Mesh(geometryBox, materialBox);
scene.add(meshBox);

//wall

const geometryWall = new THREE.BoxGeometry(1, 0.2, 0.05);
const materialWall = new THREE.MeshBasicMaterial({
  color: "red",
  wireframe: true,
});

const loader = new GLTFLoader().setPath("./models/");

loader.load("collision-world.glb", (gltf) => {
  scene.add(gltf.scene);

  worldOctree.fromGraphNode(gltf.scene);

  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material.map) {
        child.material.map.anisotropy = 4;
      }
    }
  });

  const helper = new OctreeHelper(worldOctree);
  helper.visible = false;
  scene.add(helper);

  const gui = new GUI({ width: 200 });
  gui.add({ OctreeDebug: false }, 'OctreeDebug')
    .onChange(function (value) {

      helper.visible = value;

    });
});

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(sizes.width, sizes.height);

const clock = new THREE.Clock();
let delta;

const tick = () => {

  delta = Math.min(clock.getDelta(), 0.1) / STEPS_PER_FRAME;

  for (let i = 0; i < STEPS_PER_FRAME; i++) {

    controls(delta);
    updatePlayer(delta);

  }


  renderer.render(scene, camera);
  stats.update();
  requestAnimationFrame(tick);
};

tick();
