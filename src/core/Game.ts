import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Octree } from "three/addons/math/Octree.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Player } from "./Player";
import { GameSettings } from "../config/settings";
import { MapConfig } from "../config/map";
import { IPlayerControls } from "../types";

interface StatsWithDOM extends Stats {
  domElement: HTMLDivElement;
}

export class Game {
  private scene: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private worldOctree: Octree;
  private worldGroup: THREE.Group;
  private player!: Player;
  private clock: THREE.Clock;
  private stats!: StatsWithDOM;
  private keyStates: { [key: string]: boolean };
  private controls: IPlayerControls;
  private octreeHelper: OctreeHelper | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x88ccee);
    this.scene.fog = new THREE.Fog(0x88ccee, 0, 50);
    
    this.worldGroup = new THREE.Group();
    this.worldOctree = new Octree();
    this.clock = new THREE.Clock();
    this.keyStates = {};
    
    this.controls = {
      speed: GameSettings.PLAYER.INITIAL_SPEED,
      jumpPower: GameSettings.PLAYER.INITIAL_JUMP_POWER,
      mouseSensitivity: 0.5
    };

    this.initRenderer(canvas);
    this.initStats();
    this.initLights();
    this.initPlayer();
    this.initControls();
    this.loadMap();
    this.setupEventListeners();
    this.animate();
  }

  private initRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }

  private initStats(): void {
    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.top = '0px';
    document.body.appendChild(this.stats.domElement);
  }

  private initLights(): void {
    const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
    fillLight1.position.set(2, 1, 1);
    this.scene.add(fillLight1);

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
    this.scene.add(directionalLight);
  }

  private initPlayer(): void {
    this.player = new Player(this.scene);
  }

  private initControls(): void {
    const gui = new GUI({ width: 310 });
    const folder1 = gui.addFolder("Physics");
    const folder2 = gui.addFolder("Player");
    const folder3 = gui.addFolder("Input");

    folder1.add({ "show Octree sheet": false }, "show Octree sheet")
      .onChange((value: boolean) => {
        if (this.octreeHelper) {
          this.octreeHelper.visible = value;
        }
      });

    folder2.add(this.controls, "speed", 0, this.controls.speed * 2, 0.01)
      .onChange((value: number) => {
        this.player.setSpeed(value);
      });

    folder2.add(this.controls, "jumpPower", 0, this.controls.jumpPower * 2, 0.01)
      .onChange((value: number) => {
        this.player.setJumpPower(value);
      });

    folder3.add(this.controls, "mouseSensitivity", 0, 1, 0.01);

    folder1.close();
    folder2.open();
    folder3.close();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      this.keyStates[event.code] = true;
    });

    document.addEventListener('keyup', (event) => {
      this.keyStates[event.code] = false;
    });

    document.addEventListener('mousedown', () => {
      document.body.requestPointerLock();
    });

    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === document.body) {
        this.player.camera.rotation.y -= event.movementX / (1000 * (1 - this.controls.mouseSensitivity));
        this.player.camera.rotation.x -= event.movementY / (1000 * (1 - this.controls.mouseSensitivity));
      }
    });

    window.addEventListener('resize', () => {
      this.player.camera.aspect = window.innerWidth / window.innerHeight;
      this.player.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private loadMap(): void {
    // Загрузка GLB объектов
    const loader = new GLTFLoader().setPath('./models/');
    
    MapConfig.STATIC_OBJECTS.LOAD_OBJECTS.forEach(object => {
      loader.load(object.file, (gltf) => {
        gltf.scene.position.copy(object.position);
        this.worldGroup.add(gltf.scene);
        
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material.map) {
              child.material.map.anisotropy = 4;
            }
          }
        });

        this.worldOctree.fromGraphNode(this.worldGroup);
        
        this.octreeHelper = new OctreeHelper(this.worldOctree);
        this.octreeHelper.visible = false;
        this.scene.add(this.octreeHelper);
      });
    });

    // Создание THREE.js объектов
    MapConfig.STATIC_OBJECTS.THREE_OBJESCTS.forEach(object => {
      if (object.type === 'box') {
        const geometry = new THREE.BoxGeometry(
          object.geometry.x,
          object.geometry.y,
          object.geometry.z
        );
        const material = new THREE.MeshPhongMaterial({ color: object.color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(object.position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.worldGroup.add(mesh);
      }
    });

    this.scene.add(this.worldGroup);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1) / GameSettings.STEPS_PER_FRAME;

    for (let i = 0; i < GameSettings.STEPS_PER_FRAME; i++) {
      this.player.controls(delta, this.keyStates);
      this.player.update(delta, this.worldOctree);
    }

    this.renderer.render(this.scene, this.player.camera);
    this.stats.update();
  }
} 