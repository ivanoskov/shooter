import * as THREE from "three";
// import * as CANNON from "cannon-es";
import Stats from "three/examples/jsm/libs/stats.module";
import { Octree } from "three/addons/math/Octree.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import "../css/style.css";
import {
  STEPS_PER_FRAME,
  playerColliderHeight,
  playerColliderRadius,
  playerPos,
} from "./settings";
import { Player } from "./player";

// создание базовых классов и настроек игры

const canvas = document.querySelector(".canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);
const worldGroup = new THREE.Group();

// инициализация сцены

const worldOctree = new Octree();

const clock = new THREE.Clock();
let delta;

const stats = new Stats();
document.body.appendChild(stats.dom);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(sizes.width, sizes.height);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
fillLight1.position.set(2, 1, 1);
scene.add(fillLight1);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(-5, 25, -1);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.00006;
scene.add(directionalLight);

// обработка действий пользователя

canvas.addEventListener("mousedown", () => {
  document.body.requestPointerLock();
});

document.body.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    player.camera.rotation.y -= event.movementX / 500;
    player.camera.rotation.x -= event.movementY / 500;
  }
});

document.addEventListener("keydown", (event) => {
  keyStates[event.code] = true;
});

document.addEventListener("keyup", (event) => {
  keyStates[event.code] = false;
});

// переменные и настройки для игрока
const player = new Player(
  playerPos,
  playerColliderHeight,
  playerColliderRadius,
  scene,
  new THREE.PerspectiveCamera(75, sizes.width / sizes.height)
);
const keyStates = {};

// получение глобального вектора направления взгляда игрока

// floor

const geometryFloor = new THREE.BoxGeometry(1, 0.1, 1);
const materialFloor = new THREE.MeshBasicMaterial({
  color: "white",
  wireframe: true,
});

const meshFloor = new THREE.Mesh(geometryFloor, materialFloor);
worldGroup.add(meshFloor);
scene.add(worldGroup);

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
  worldOctree.fromGraphNode(worldGroup);

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
  gui.add({ OctreeDebug: false }, "OctreeDebug").onChange(function (value) {
    helper.visible = value;
  });
});

const tick = () => {
  delta = Math.min(clock.getDelta(), 0.1) / STEPS_PER_FRAME;

  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    player.controls(delta, keyStates);
    player.update(delta, worldOctree);
  }

  renderer.render(scene, player.camera);
  stats.update();
  requestAnimationFrame(tick);
};

tick();
