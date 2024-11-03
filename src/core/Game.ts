import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Octree } from "three/addons/math/Octree.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Player } from "./Player";
import { GameSettings } from "../config/settings";
import { MapConfig } from "../config/map";
import { IPlayerControls, IThreeObject } from "../types";
import { InputSystem, InputEventType, InputEvent } from "./input/InputSystem";
import { BrowserController } from './browser/BrowserController';
import { ILoadObject, QualityPresets } from "../types/graphics";

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
  private inputSystem: InputSystem;
  private frameId: number = 0;
  private readonly CULL_DISTANCE: number = 100;
  private meshes: THREE.Mesh[] = [];
  private objectsToUpdate: Set<THREE.Object3D> = new Set();

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

    this.inputSystem = new InputSystem();

    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    THREE.Cache.enabled = true;

    // Инициализируем контроллер браузера
    BrowserController.init();

    this.initRenderer(canvas);
    this.initStats();
    this.initLights();
    this.initPlayer();
    this.initControls();
    this.loadMap();
    this.setupInputHandlers();
    this.animate();

    // Добавляем обработчик изменения полноэкранного режима
    document.addEventListener('fullscreenchange', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.player.getCamera().updateAspect(width, height);
      this.renderer.setSize(width, height);
    });
  }

  private initRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    this.renderer.useLegacyLights = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = GameSettings.GRAPHICS.TONE_MAPPING;
    this.renderer.toneMappingExposure = GameSettings.GRAPHICS.EXPOSURE;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    
    this.renderer.info.autoReset = false;
    this.renderer.capabilities.maxTextures = Math.min(this.renderer.capabilities.maxTextures, 16);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    THREE.Cache.enabled = true;
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
        this.inputSystem.setMouseSensitivity(value);
        this.player.getCamera().setMouseSensitivity(value);
      });

    const graphicsFolder = gui.addFolder("Graphics");
    
    graphicsFolder.add({ quality: 'high' }, 'quality', ['low', 'medium', 'high'])
      .onChange((value: string) => {
        this.applyQualityPreset(value);
      });

    folder1.close();
    folder2.open();
    folder3.close();
  }

  private setupInputHandlers(): void {
    this.inputSystem.on(InputEventType.KEYBOARD, (event: InputEvent) => {
      if (event.code && event.pressed !== undefined) {
        this.keyStates[event.code] = event.pressed;
      }
    });

    this.inputSystem.on(InputEventType.MOUSE, (event: InputEvent) => {
      if (event.movementX !== undefined && event.movementY !== undefined) {
        this.player.getCamera().handleMouseMove(event.movementX, event.movementY);
      }
    });

    this.inputSystem.on(InputEventType.POINTER_LOCK, (event: InputEvent) => {
      if (event.locked !== undefined) {
        console.log(event.locked ? 'Pointer Lock activated' : 'Pointer Lock deactivated');
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
    const loader = new GLTFLoader().setPath('./models/');
    
    const loadPromises = MapConfig.STATIC_OBJECTS.LOAD_OBJECTS.map((object: ILoadObject) => {
      return new Promise<void>((resolve, reject) => {
        loader.load(
          object.file,
          (gltf) => {
            try {
              gltf.scene.position.copy(object.position);
              
              gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  this.meshes.push(child);
                  
                  if (child.geometry) {
                    child.geometry.computeBoundingSphere();
                    child.geometry.computeBoundingBox();
                  }
                  
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach(this.optimizeMaterial);
                    } else {
                      this.optimizeMaterial(child.material);
                    }
                  }
                  
                  child.castShadow = true;
                  child.receiveShadow = true;
                  child.frustumCulled = true;
                }
              });

              this.worldGroup.add(gltf.scene);
              this.worldOctree.fromGraphNode(gltf.scene);
              
              resolve();
            } catch (error) {
              console.error('Error processing model:', error);
              reject(error);
            }
          },
          undefined,
          reject
        );
      });
    });

    MapConfig.STATIC_OBJECTS.THREE_OBJESCTS.forEach((object: IThreeObject) => {
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

    Promise.all(loadPromises).then(() => {
      console.log('All models loaded successfully');
      this.applyQualityPreset('high');
    }).catch((error) => {
      console.error('Error loading models:', error);
    });
  }

  private isInView(object: THREE.Mesh): boolean {
    if (!object || !object.geometry) return false;
    
    if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
    }
    
    if (!object.geometry.boundingSphere) return false;
    
    const cameraPosition = this.player.getCamera().camera.position;
    const objectPosition = object.position;
    
    const distance = cameraPosition.distanceTo(objectPosition);
    if (distance > this.CULL_DISTANCE) return false;
    
    const boundingSphere = object.geometry.boundingSphere.clone();
    boundingSphere.applyMatrix4(object.matrixWorld);
    
    const isVisible = this.frustum.intersectsSphere(boundingSphere);
    
    if (!isVisible) {
        boundingSphere.radius *= 1.1;
        return this.frustum.intersectsSphere(boundingSphere);
    }
    
    return true;
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1) / GameSettings.STEPS_PER_FRAME;

    for (let i = 0; i < GameSettings.STEPS_PER_FRAME; i++) {
      this.player.controls(delta, this.keyStates);
      this.player.update(delta, this.worldOctree);
    }

    const camera = this.player.getCamera().camera;
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    
    this.cameraViewProjectionMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);

    for (const mesh of this.meshes) {
      if (mesh instanceof THREE.Mesh) {
        const wasVisible = mesh.visible;
        mesh.visible = this.isInView(mesh);
        
        if (mesh.visible) {
          this.objectsToUpdate.add(mesh);
          if (!wasVisible) {
            mesh.updateMatrix();
            mesh.updateMatrixWorld();
          }
        } else {
          this.objectsToUpdate.delete(mesh);
        }
      }
    }

    this.renderer.render(this.scene, camera);
    this.stats.update();
  }

  public dispose(): void {
    BrowserController.dispose();
    cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  private optimizeMaterial(material: THREE.Material): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      material.envMapIntensity = 1.0;
      material.roughness = Math.max(0.4, material.roughness);
      material.metalness = Math.min(0.9, material.metalness);
      
      if (material.map) {
        material.map.anisotropy = GameSettings.GRAPHICS.ANISOTROPY;
        material.map.generateMipmaps = true;
      }
      
      if (material.normalMap) {
        material.normalMap.anisotropy = GameSettings.GRAPHICS.ANISOTROPY;
      }
    }
  }

  private applyQualityPreset(quality: string): void {
    const preset = QualityPresets[quality];
    if (!preset) return;

    console.log(`Applying ${quality} quality preset...`);

    // Обновляем настройки теней
    this.renderer.shadowMap.type = preset.shadowType;
    this.renderer.shadowMap.enabled = true;
    
    // Сначала обновим все источники света
    this.scene.traverse((object) => {
      if (object instanceof THREE.Light && object.shadow) {
        object.shadow.mapSize.width = preset.shadowMapSize;
        object.shadow.mapSize.height = preset.shadowMapSize;
        object.shadow.radius = preset.shadowRadius;
        
        if (object.shadow.map) {
          object.shadow.map.dispose();
          object.shadow.map = null;
        }
        
        if (object instanceof THREE.DirectionalLight) {
          const resolution = preset.shadowMapSize;
          const size = 10 * Math.max(1, Math.min(2, resolution / 1024));
          object.shadow.camera.left = -size;
          object.shadow.camera.right = size;
          object.shadow.camera.top = size;
          object.shadow.camera.bottom = -size;
          object.shadow.camera.updateProjectionMatrix();
        }
      }
    });

    // Затем обновим все материалы и текстуры
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material instanceof THREE.MeshStandardMaterial) {
            if (material.map) material.map.anisotropy = preset.anisotropy;
            if (material.normalMap) material.normalMap.anisotropy = preset.anisotropy;
            if (material.roughnessMap) material.roughnessMap.anisotropy = preset.anisotropy;
            if (material.metalnessMap) material.metalnessMap.anisotropy = preset.anisotropy;
            material.needsUpdate = true;
          }
        });
      }
    });

    // Принудительно обновляем тени
    this.renderer.shadowMap.needsUpdate = true;
    
    // Обновляем настройки в конфиге
    GameSettings.GRAPHICS.SHADOW_MAP_SIZE = preset.shadowMapSize;
    GameSettings.GRAPHICS.SHADOW_RADIUS = preset.shadowRadius;
    GameSettings.GRAPHICS.ANISOTROPY = preset.anisotropy;
    GameSettings.GRAPHICS.MAX_LIGHTS = preset.maxLights;

    console.log(`Quality preset ${quality} applied successfully`);
  }
} 