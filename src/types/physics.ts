import { Vector3 } from "three";

export interface IPhysicsSettings {
  octreeMaxDepth: number;
  octreeMinSize: number;
  octreeLoosenessFactor: number;
  collisionIterations: number;
  enableDynamicObjects: boolean;
  debugPhysics: boolean;
}

export interface IPhysicsObject {
  position: Vector3;
  velocity: Vector3;
  mass: number;
  isStatic: boolean;
}

export interface IOctreeOptions {
  maxDepth?: number;
  minSize?: number;
  looseness?: number;
}
