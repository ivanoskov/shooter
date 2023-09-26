import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { GRAVITY } from "./settings";

export class Player {
  constructor(position, colliderHeight, colliderRadius, scene, camera) {
    this.position = position;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.onFloor = false;
    this.collider = new Capsule(
      this.position,
      new THREE.Vector3().copy(this.position).add(new THREE.Vector3(0, colliderHeight, 0)),
      colliderRadius
    );
    this.camera = camera;
    camera.rotation.order = "YXZ";
    scene.add(camera);
  }

  getForwardVector() {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();

    return this.direction;
  }

  getSideVector() {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();
    this.direction.cross(this.camera.up);

    return this.direction;
  }

  controls(deltaTime, keyStates) {
    // gives a bit of air control
    const speedDelta = deltaTime * (this.onFloor ? 25 : 8);

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

    if (this.onFloor) {
      if (keyStates["Space"]) {
        this.velocity.y = 15;
      }
    }
  }

  collisions(worldOctree) {
    const result = worldOctree.capsuleIntersect(this.collider);

    this.onFloor = false;

    if (result) {
      this.onFloor = result.normal.y > 0;

      if (!this.onFloor) {
        this.velocity.addScaledVector(
          result.normal,
          -result.normal.dot(this.velocity)
        );
      }

      this.collider.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  update(deltaTime, worldOctree) {
    let damping = Math.exp(-4 * deltaTime) - 1;

    if (!this.onFloor) {
      this.velocity.y -= GRAVITY * deltaTime;

      // small air resistance
      damping *= 0.1;
    }

    this.velocity.addScaledVector(this.velocity, damping);

    const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
    this.collider.translate(deltaPosition);

    this.collisions(worldOctree);

    this.camera.position.copy(this.collider.end);
  }
}
