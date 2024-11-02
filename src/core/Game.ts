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
  private frustum: THREE.Frustum;
  private cameraViewProjectionMatrix: THREE.Matrix4;

  constructor(canvas: HTMLCanvasElement) {
    this.frustum = new THREE.Frustum();
    this.cameraViewProjectionMatrix = new THREE.Matrix4();

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

    folder3.add(this.controls, "mouseSensitivity", 0, 1, 0.01)
      .onChange((value: number) => {
        this.player.getCamera().setMouseSensitivity(value);
      });

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

    document.addEventListener('click', () => {
      if (document.pointerLockElement !== document.body) {
        document.body.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockerror', () => {
      console.warn('Pointer Lock Error: Could not lock pointer');
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        console.log('Pointer Lock activated');
      } else {
        console.log('Pointer Lock deactivated');
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === document.body) {
        try {
          this.player.getCamera().handleMouseMove(event.movementX, event.movementY);
        } catch (error) {
          console.error('Error handling mouse movement:', error);
        }
      }
    });

    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.player.getCamera().updateAspect(width, height);
      this.renderer.setSize(width, height);
    });
  }

  private loadMap(): void {
    // Загрузка GLB объектов
    const loader = new GLTFLoader().setPath('./models/');
    
    const loadPromises = MapConfig.STATIC_OBJECTS.LOAD_OBJECTS.map(object => {
      return new Promise<void>((resolve, reject) => {
        loader.load(
          object.file, 
          (gltf) => {
            try {
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
              
              if (!this.octreeHelper) {
                this.octreeHelper = new OctreeHelper(this.worldOctree);
                this.octreeHelper.visible = false;
                this.scene.add(this.octreeHelper);
              }
              
              resolve();
            } catch (error) {
              console.error('Error processing loaded model:', error);
              reject(error);
            }
          },
          undefined, // onProgress callback
          (error) => {
            console.error('Error loading model:', error);
            reject(error);
          }
        );
      });
    });

    // Создание THREE.js объектов
    MapConfig.STATIC_OBJECTS.THREE_OBJESCTS.forEach(object => {
      if (object.type === 'box') {
        try {
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
        } catch (error) {
          console.error('Error creating THREE.js object:', error);
        }
      }
    });

    this.scene.add(this.worldGroup);

    // Ждем загрузки всех моделей
    Promise.all(loadPromises).then(() => {
      console.log('All models loaded successfully');
    }).catch((error) => {
      console.error('Error loading models:', error);
    });
  }

  private isInView(object: THREE.Object3D): boolean {
    const camera = this.player.getCamera().camera;
    
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    
    this.cameraViewProjectionMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    
    this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);
    
    if (object instanceof THREE.Mesh && object.geometry) {
      object.updateMatrix();
      object.updateMatrixWorld();
      
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      
      const boundingSphere = object.geometry.boundingSphere;
      if (boundingSphere) {
        const center = boundingSphere.center.clone().applyMatrix4(object.matrixWorld);
        const radius = boundingSphere.radius * Math.max(
          object.scale.x,
          object.scale.y,
          object.scale.z
        );
        return this.frustum.intersectsSphere(new THREE.Sphere(center, radius));
      }
    }
    
    return this.frustum.containsPoint(object.position);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1) / GameSettings.STEPS_PER_FRAME;

    // Обновление физики
    for (let i = 0; i < GameSettings.STEPS_PER_FRAME; i++) {
      this.player.controls(delta, this.keyStates);
      this.player.update(delta, this.worldOctree);
    }

    // Оптимизация рендеринга
    this.worldGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.visible = this.isInView(object);
        }
      }
    });

    this.renderer.render(this.scene, this.player.getCamera().camera);
    this.stats.update();
  }
} 