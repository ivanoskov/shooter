import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { Octree } from "three/addons/math/Octree.js";
import { GameSettings } from "../config/settings";
import { PlayerCamera } from "./Camera";

export class Player {
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private onFloor: boolean;
  private speed: number;
  private jumpPower: number;
  public collider: Capsule;
  private playerCamera: PlayerCamera;
  private readonly tempVector: THREE.Vector3;
  private readonly tempDirection: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.position = GameSettings.PLAYER.INITIAL_POSITION.clone();
    this.velocity = new THREE.Vector3();
    this.onFloor = false;
    this.speed = GameSettings.PLAYER.INITIAL_SPEED;
    this.jumpPower = GameSettings.PLAYER.INITIAL_JUMP_POWER;

    this.collider = new Capsule(
      this.position.clone(),
      new THREE.Vector3().copy(this.position).add(new THREE.Vector3(0, GameSettings.PLAYER.COLLIDER_HEIGHT, 0)),
      GameSettings.PLAYER.COLLIDER_RADIUS
    );

    this.playerCamera = new PlayerCamera(scene);

    this.tempVector = new THREE.Vector3();
    this.tempDirection = new THREE.Vector3();
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public setJumpPower(jumpPower: number): void {
    this.jumpPower = jumpPower;
  }

  private getForwardVector(): THREE.Vector3 {
    this.playerCamera.camera.getWorldDirection(this.tempDirection);
    this.tempDirection.y = 0;
    this.tempDirection.normalize();
    return this.tempDirection;
  }

  private getSideVector(): THREE.Vector3 {
    this.playerCamera.camera.getWorldDirection(this.tempDirection);
    this.tempDirection.y = 0;
    this.tempDirection.normalize();
    this.tempDirection.cross(this.playerCamera.camera.up);
    return this.tempDirection;
  }

  public controls(deltaTime: number, keyStates: { [key: string]: boolean }): void {
    const speedDelta = deltaTime * (this.onFloor ? this.speed : this.speed * 0.32);

    if (keyStates["KeyW"]) {
      this.velocity.add(this.getForwardVector().multiplyScalar(speedDelta));
    }
    if (keyStates["KeyS"]) {
      this.velocity.add(this.getForwardVector().multiplyScalar(-speedDelta));
    }
    if (keyStates["KeyA"]) {
      this.velocity.add(this.getSideVector().multiplyScalar(-speedDelta));
    }
    if (keyStates["KeyD"]) {
      this.velocity.add(this.getSideVector().multiplyScalar(speedDelta));
    }
    if (this.onFloor && keyStates["Space"]) {
      this.velocity.y = this.jumpPower;
    }
  }

  private handleCollisions(worldOctree: Octree): void {
    const result = worldOctree.capsuleIntersect(this.collider);
    this.onFloor = false;

    if (result) {
      this.onFloor = result.normal.y > 0;
      if (!this.onFloor) {
        this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity));
      }
      this.collider.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  public update(deltaTime: number, worldOctree: Octree): void {
    const damping = Math.exp(-4 * deltaTime) - 1;
    
    if (!this.onFloor) {
      this.velocity.y -= GameSettings.GRAVITY * deltaTime;
    }
    
    this.tempVector.copy(this.velocity).multiplyScalar(damping * (this.onFloor ? 1 : 0.1));
    this.velocity.add(this.tempVector);
    
    this.tempVector.copy(this.velocity).multiplyScalar(deltaTime);
    this.collider.translate(this.tempVector);
    
    this.handleCollisions(worldOctree);
    
    this.tempVector.copy(this.collider.end);
    this.tempVector.y += GameSettings.PLAYER.COLLIDER_HEIGHT * 0.5;
    this.playerCamera.updatePosition(this.tempVector);
  }

  public getCamera(): PlayerCamera {
    return this.playerCamera;
  }
} 