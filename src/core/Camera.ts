import * as THREE from "three";
import { GameSettings } from "../config/settings";

export class PlayerCamera {
  public camera: THREE.PerspectiveCamera;
  private mouseSensitivity: number;

  constructor(scene: THREE.Scene) {
    this.camera = new THREE.PerspectiveCamera(
      GameSettings.CAMERA.FOV,
      window.innerWidth / window.innerHeight,
      GameSettings.CAMERA.NEAR,
      GameSettings.CAMERA.FAR
    );
    
    this.camera.position.copy(GameSettings.PLAYER.INITIAL_POSITION);
    this.camera.position.y += GameSettings.PLAYER.COLLIDER_HEIGHT;
    
    this.camera.rotation.order = "YXZ";
    this.mouseSensitivity = 0.5;
    
    this.camera.updateMatrix();
    this.camera.updateMatrixWorld();
    
    // Оптимизируем камеру
    this.camera.matrixAutoUpdate = false;
    
    scene.add(this.camera);
  }

  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }

  public handleMouseMove(movementX: number, movementY: number): void {
    // Оптимизируем вычисления
    const sensitivity = 1000 * (1 - this.mouseSensitivity);
    this.camera.rotation.y -= movementX / sensitivity;
    this.camera.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.camera.rotation.x - movementY / sensitivity)
    );
    
    this.camera.updateMatrix();
  }

  public updateAspect(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public updatePosition(position: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.camera.updateMatrix();
  }
} 