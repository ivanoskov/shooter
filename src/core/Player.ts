import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { Octree } from "three/addons/math/Octree.js";
import { GameSettings } from "../config/settings";

export class Player {
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private direction: THREE.Vector3;
  private onFloor: boolean;
  private speed: number;
  private jumpPower: number;
  public collider: Capsule;
  public camera: THREE.PerspectiveCamera;

  constructor(scene: THREE.Scene) {
    this.position = GameSettings.PLAYER.INITIAL_POSITION.clone();
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.onFloor = false;
    this.speed = GameSettings.PLAYER.INITIAL_SPEED;
    this.jumpPower = GameSettings.PLAYER.INITIAL_JUMP_POWER;

    this.collider = new Capsule(
      this.position.clone(),
      new THREE.Vector3().copy(this.position).add(new THREE.Vector3(0, GameSettings.PLAYER.COLLIDER_HEIGHT, 0)),
      GameSettings.PLAYER.COLLIDER_RADIUS
    );

    this.camera = new THREE.PerspectiveCamera(
      GameSettings.CAMERA.FOV,
      window.innerWidth / window.innerHeight,
      GameSettings.CAMERA.NEAR,
      GameSettings.CAMERA.FAR
    );
    this.camera.rotation.order = "YXZ";
    scene.add(this.camera);
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public setJumpPower(jumpPower: number): void {
    this.jumpPower = jumpPower;
  }

  private getForwardVector(): THREE.Vector3 {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();
    return this.direction;
  }

  private getSideVector(): THREE.Vector3 {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();
    this.direction.cross(this.camera.up);
    return this.direction;
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
    let damping = Math.exp(-4 * deltaTime) - 1;

    if (!this.onFloor) {
      this.velocity.y -= GameSettings.GRAVITY * deltaTime;
      damping *= 0.1;
    }

    this.velocity.addScaledVector(this.velocity, damping);
    const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
    this.collider.translate(deltaPosition);
    this.handleCollisions(worldOctree);
    this.camera.position.copy(this.collider.end);
  }
} 