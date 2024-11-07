import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Octree } from "three/addons/math/Octree.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Player } from "./Player";
import { GameSettings } from "../config/settings";
import { MapConfig } from "../config/map";
import {
  IPlayerControls,
  IThreeObject,
  ILoadObject,
} from "../types";
import { InputSystem, InputEventType, InputEvent } from "./input/InputSystem";
import { BrowserController } from "./browser/BrowserController";
import { QualityPresets } from "../types/graphics";
import { MapList } from "../config/maps";

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
  private CULL_DISTANCE: number = 100;
  private meshes: THREE.Mesh[] = [];
  private objectsToUpdate: Set<THREE.Object3D> = new Set();
  private dynamicOctree: Octree = new Octree();
  private dynamicOctreeHelper: OctreeHelper | null = null;
  private dynamicObjects: THREE.Object3D[] = [];

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
      mouseSensitivity: 0.5,
    };

    this.inputSystem = new InputSystem();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
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
    document.addEventListener("fullscreenchange", () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.player.getCamera().updateAspect(width, height);
      this.renderer.setSize(width, height);
    });

    this.initPhysics();
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
    this.renderer.capabilities.maxTextures = Math.min(
      this.renderer.capabilities.maxTextures,
      16
    );

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    THREE.Cache.enabled = true;
  }

  private initStats(): void {
    this.stats = new Stats();
    this.stats.domElement.style.position = "absolute";
    this.stats.domElement.style.top = "0px";
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
    const gui = new GUI({ width: 350 });

    // Добавляем выбор карты в начало меню
    const mapFolder = gui.addFolder("Карта");
    const mapSettings = {
      currentMap: "Тестовый мир"
    };

    mapFolder.add(mapSettings, "currentMap", Object.keys(MapList))
      .name("Выбрать карту")
      .onChange((mapName: string) => {
        // Очищаем текущую карту
        this.worldGroup.clear();
        this.worldOctree = new Octree();
        this.meshes = [];
        
        // Удаляем старый помощник октодерева
        if (this.octreeHelper) {
          this.scene.remove(this.octreeHelper);
          this.octreeHelper = null;
        }

        // Загружаем новую карту
        const loader = new GLTFLoader().setPath("./models/");
        loader.load(
          MapList[mapName],
          (gltf) => {
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
            this.scene.add(this.worldGroup);

            // Создаем новый помощник октодерева
            this.octreeHelper = new OctreeHelper(this.worldOctree, 0xffff00);
            this.octreeHelper.visible = false;
            this.scene.add(this.octreeHelper);

            // Возвращаем игрока на начальную позицию
            this.player.collider.start.copy(GameSettings.PLAYER.INITIAL_POSITION);
            this.player.collider.end.copy(GameSettings.PLAYER.INITIAL_POSITION)
              .add(new THREE.Vector3(0, GameSettings.PLAYER.COLLIDER_HEIGHT, 0));

            // Применяем текущие настройки качества
            this.applyQualityPreset(graphicsSettings.quality);
          },
          undefined,
          (error) => {
            console.error("Error loading map:", error);
          }
        );
      });

    mapFolder.open();

    // Настройки игрока
    const playerFolder = gui.addFolder("Игрок");
    playerFolder
      .add(this.controls, "speed", 1, 20, 0.1)
      .name("Скорость передвижения")
      .onChange((value: number) => this.player.setSpeed(value));
    playerFolder
      .add(this.controls, "jumpPower", 1, 20, 0.1)
      .name("Сила прыжка")
      .onChange((value: number) => this.player.setJumpPower(value));
    playerFolder
      .add(this.controls, "mouseSensitivity", 0.1, 2, 0.05)
      .name("Чувствительность мыши")
      .onChange((value: number) => {
        this.inputSystem.setMouseSensitivity(value);
        this.player.getCamera().setMouseSensitivity(value);
      });

    // Настройки камеры
    const cameraFolder = gui.addFolder("Камера");
    const cameraSettings = {
      fov: this.player.getCamera().camera.fov,
      near: this.player.getCamera().camera.near,
      far: this.player.getCamera().camera.far,
    };

    cameraFolder
      .add(cameraSettings, "fov", 60, 120, 1)
      .name("Поле зрения")
      .onChange((value: number) => {
        this.player.getCamera().camera.fov = value;
        this.player.getCamera().camera.updateProjectionMatrix();
      });
    cameraFolder
      .add(cameraSettings, "near", 0.1, 1, 0.1)
      .name("Ближняя плоскость")
      .onChange((value: number) => {
        this.player.getCamera().camera.near = value;
        this.player.getCamera().camera.updateProjectionMatrix();
      });
    cameraFolder
      .add(cameraSettings, "far", 100, 1000, 10)
      .name("Дальняя плоскость")
      .onChange((value: number) => {
        this.player.getCamera().camera.far = value;
        this.player.getCamera().camera.updateProjectionMatrix();
      });

    // Настройки графики
    const graphicsFolder = gui.addFolder("Графика");
    const graphicsSettings = {
      quality: "high",
      shadowMapSize: GameSettings.GRAPHICS.SHADOW_MAP_SIZE,
      shadowRadius: 4,
      exposure: this.renderer.toneMappingExposure,
      gamma: 2.2,
      cullDistance: this.CULL_DISTANCE,
    };

    graphicsFolder
      .add({ quality: "high" }, "quality", ["low", "medium", "high"])
      .name("Пресет качества")
      .onChange((value: string) => this.applyQualityPreset(value));

    graphicsFolder
      .add(graphicsSettings, "shadowMapSize", [512, 1024, 2048, 4096])
      .name("Разрешение теней")
      .onChange((value: number) => {
        this.scene.traverse((object) => {
          if (object instanceof THREE.Light && object.shadow) {
            object.shadow.mapSize.set(value, value);
            object.shadow.map?.dispose();
            object.shadow.map = null;
            this.renderer.shadowMap.needsUpdate = true;
          }
        });
      });

    graphicsFolder
      .add(graphicsSettings, "shadowRadius", 0, 10, 0.1)
      .name("Размытие теней")
      .onChange((value: number) => {
        this.scene.traverse((object) => {
          if (object instanceof THREE.Light && object.shadow) {
            object.shadow.radius = value;
          }
        });
        this.renderer.shadowMap.needsUpdate = true;
      });

    graphicsFolder
      .add(graphicsSettings, "exposure", 0.1, 3, 0.1)
      .name("Экспозиция")
      .onChange((value: number) => {
        this.renderer.toneMappingExposure = value;
      });

    graphicsFolder
      .add(graphicsSettings, "cullDistance", 50, 500, 10)
      .name("Дистанция отрисовки")
      .onChange((value: number) => {
        this.CULL_DISTANCE = value;
      });

    // Настройки постобработки
    const postProcessFolder = gui.addFolder("Постобработка");
    const postProcessSettings = {
      toneMapping: this.renderer.toneMapping,
      antialiasing: true,
      bloom: false,
      bloomStrength: 1.5,
      bloomRadius: 0.4,
      bloomThreshold: 0.85,
    };

    type ToneMappingKey =
      | "Нет"
      | "Линейное"
      | "Reinhard"
      | "Cineon"
      | "ACES Filmic";

    const toneMappingOptions: Record<ToneMappingKey, THREE.ToneMapping> = {
      Нет: THREE.NoToneMapping,
      Линейное: THREE.LinearToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
      Cineon: THREE.CineonToneMapping,
      "ACES Filmic": THREE.ACESFilmicToneMapping,
    };

    postProcessFolder
      .add(
        { toneMapping: "Reinhard" },
        "toneMapping",
        Object.keys(toneMappingOptions) as ToneMappingKey[]
      )
      .name("Тональная компрессия")
      .onChange(
        function (this: any, value: string) {
          const toneMapping = toneMappingOptions[value as ToneMappingKey];
          if (toneMapping !== undefined) {
            this.renderer.toneMapping = toneMapping;
            this.renderer.shadowMap.needsUpdate = true;
          }
        }.bind(this)
      );

    postProcessFolder
      .add(postProcessSettings, "antialiasing")
      .name("Сглаживание")
      .onChange((value: boolean) => {
        // Сохраняем текущие настройки рендерера
        const currentSettings = {
          shadowMap: this.renderer.shadowMap.enabled,
          toneMapping: this.renderer.toneMapping,
          toneMappingExposure: this.renderer.toneMappingExposure,
          outputColorSpace: this.renderer.outputColorSpace
        };

        // Пересоздаем рендерер с новым значением antialias
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.renderer.domElement,
          antialias: value,
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        });

        // Восстанавливаем настройки
        this.renderer.shadowMap.enabled = currentSettings.shadowMap;
        this.renderer.toneMapping = currentSettings.toneMapping;
        this.renderer.toneMappingExposure = currentSettings.toneMappingExposure;
        this.renderer.outputColorSpace = currentSettings.outputColorSpace;

        // Обновляем размер и другие параметры
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      });

    // Настройки физики
    const physicsFolder = gui.addFolder("Физика");
    const physicsSettings = {
      gravity: GameSettings.GRAVITY,
      showOctree: false,
      showDynamicOctree: false,
      enableDynamicObjects: GameSettings.PHYSICS.enableDynamicObjects,
    };

    physicsFolder
      .add(physicsSettings, "gravity", -20, 50, 0.1)
      .name("Гравитация")
      .onChange((value) => {
        GameSettings.GRAVITY = value;
      });

    physicsFolder
      .add(physicsSettings, "enableDynamicObjects")
      .name("Динамические объекты")
      .onChange((value) => {
        GameSettings.PHYSICS.enableDynamicObjects = value;
        if (!value) {
          // Если отключаем динамические объекты, скрываем их октодерево
          if (this.dynamicOctreeHelper) {
            this.dynamicOctreeHelper.visible = false;
          }
        }
      });

    physicsFolder
      .add(physicsSettings, "showOctree")
      .name("Показать октодерево")
      .onChange((value) => {
        if (this.octreeHelper) {
          if (value) {
            // Добавляем в сцену только когда включаем отображение
            this.scene.remove(this.octreeHelper);
            this.octreeHelper = new OctreeHelper(this.worldOctree, 0xffff00);
            if (this.octreeHelper.material instanceof THREE.LineBasicMaterial) {
              this.octreeHelper.material.transparent = true;
              this.octreeHelper.material.opacity = 0.5;
              this.octreeHelper.material.depthTest = false;
            }
            this.scene.add(this.octreeHelper);
          } else {
            // Удаляем из сцены при выключении
            this.scene.remove(this.octreeHelper);
          }
        }
      });

    physicsFolder
      .add(physicsSettings, "showDynamicOctree")
      .name("Показать динамическое октодерево")
      .onChange((value) => {
        if (this.dynamicOctreeHelper && GameSettings.PHYSICS.enableDynamicObjects) {
          if (value) {
            // Добавляем в сцену только когда включаем отображение
            this.scene.remove(this.dynamicOctreeHelper);
            this.dynamicOctreeHelper = new OctreeHelper(this.dynamicOctree, 0x00ffff);
            if (this.dynamicOctreeHelper.material instanceof THREE.LineBasicMaterial) {
              this.dynamicOctreeHelper.material.transparent = true;
              this.dynamicOctreeHelper.material.opacity = 0.5;
              this.dynamicOctreeHelper.material.depthTest = false;
            }
            this.scene.add(this.dynamicOctreeHelper);
          } else {
            // Удаляем из сцены при выключении
            this.scene.remove(this.dynamicOctreeHelper);
          }
        }
      });

    physicsFolder.open();

    // Настройки отладки
    const debugFolder = gui.addFolder("Отладка");
    const debugSettings = {
      showStats: true,
      wireframe: false,
      showBoundingBoxes: false,
    };

    debugFolder
      .add(debugSettings, "showStats")
      .name("Показать статистику")
      .onChange((value: boolean) => {
        this.stats.domElement.style.display = value ? "block" : "none";
      });

    debugFolder
      .add(debugSettings, "wireframe")
      .name("Каркасный режим")
      .onChange((value: boolean) => {
        this.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => (m.wireframe = value));
            } else {
              object.material.wireframe = value;
            }
          }
        });
      });

    // Открываем нужные папки по умолчанию
    playerFolder.open();
    graphicsFolder.open();
    postProcessFolder.close();
    physicsFolder.close();
    debugFolder.close();
  }

  private setupInputHandlers(): void {
    this.inputSystem.on(InputEventType.KEYBOARD, (event: InputEvent) => {
      if (event.code && event.pressed !== undefined) {
        this.keyStates[event.code] = event.pressed;
      }
    });

    this.inputSystem.on(InputEventType.MOUSE, (event: InputEvent) => {
      if (event.movementX !== undefined && event.movementY !== undefined) {
        this.player
          .getCamera()
          .handleMouseMove(event.movementX, event.movementY);
      }
    });

    this.inputSystem.on(InputEventType.POINTER_LOCK, (event: InputEvent) => {
      if (event.locked !== undefined) {
        console.log(
          event.locked ? "Pointer Lock activated" : "Pointer Lock deactivated"
        );
      }
    });

    window.addEventListener("resize", () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.player.getCamera().updateAspect(width, height);
      this.renderer.setSize(width, height);
    });
  }

  private loadMap(): void {
    const loader = new GLTFLoader().setPath("./models/");

    const loadPromises = MapConfig.STATIC_OBJECTS.LOAD_OBJECTS.map(
      (object: ILoadObject) => {
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

                // Создаем OctreeHelper после формирования октодерева
                if (!this.octreeHelper) {
                  this.octreeHelper = new OctreeHelper(this.worldOctree);
                  this.octreeHelper.visible = false; // По умолчанию скрыт
                  this.scene.add(this.octreeHelper);
                }

                resolve();
              } catch (error) {
                console.error("Error processing model:", error);
                reject(error);
              }
            },
            undefined,
            reject
          );
        });
      }
    );

    MapConfig.STATIC_OBJECTS.THREE_OBJESCTS.forEach((object: IThreeObject) => {
      if (object.type === "box") {
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
          console.error("Error creating THREE.js object:", error);
        }
      }
    });

    this.scene.add(this.worldGroup);

    Promise.all(loadPromises)
      .then(() => {
        console.log("All models loaded successfully");
        this.rebuildOctree();
        if (this.octreeHelper) {
            this.octreeHelper.visible = false;
        }
        this.applyQualityPreset("high");
      })
      .catch((error) => {
        console.error("Error loading models:", error);
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

    this.updatePhysics(delta);

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
  };

  public dispose(): void {
    BrowserController.dispose();
    cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
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
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial) {
            if (material.map) material.map.anisotropy = preset.anisotropy;
            if (material.normalMap)
              material.normalMap.anisotropy = preset.anisotropy;
            if (material.roughnessMap)
              material.roughnessMap.anisotropy = preset.anisotropy;
            if (material.metalnessMap)
              material.metalnessMap.anisotropy = preset.anisotropy;
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

  private initPhysics(): void {
    this.worldOctree = new Octree();
    this.dynamicOctree = new Octree();

    this.rebuildOctree();

    this.octreeHelper = new OctreeHelper(this.worldOctree, 0xffff00);
    this.dynamicOctreeHelper = new OctreeHelper(this.dynamicOctree, 0x00ffff);
    this.octreeHelper.visible = false;
    this.dynamicOctreeHelper.visible = false;
  }

  private updatePhysics(deltaTime: number): void {
    if (GameSettings.PHYSICS.enableDynamicObjects) {
      this.dynamicOctree.clear();
      this.dynamicObjects.forEach((obj) => {
        this.dynamicOctree.fromGraphNode(obj);
      });
    }

    for (let i = 0; i < GameSettings.PHYSICS.collisionIterations; i++) {
      this.player.update(
        deltaTime / GameSettings.PHYSICS.collisionIterations,
        this.worldOctree
      );

      if (GameSettings.PHYSICS.enableDynamicObjects) {
        this.player.handleDynamicCollisions(this.dynamicOctree);
      }
    }
  }

  private rebuildOctree(): void {
    this.worldOctree = new Octree();

    this.worldGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        this.worldOctree.fromGraphNode(object);
      }
    });

    if (this.octreeHelper) {
      this.scene.remove(this.octreeHelper);
      this.octreeHelper = new OctreeHelper(this.worldOctree, 0xffff00);
      this.octreeHelper.visible = false;
    }
  }
}
