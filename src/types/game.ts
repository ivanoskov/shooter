import { Vector3 } from "three";
import { IGraphicsSettings } from "./graphics";
import { IPhysicsSettings } from "./physics";

export interface IGameSettings {
  STEPS_PER_FRAME: number;
  GRAVITY: number;
  PLAYER: {
    INITIAL_POSITION: Vector3;
    COLLIDER_RADIUS: number;
    COLLIDER_HEIGHT: number;
    INITIAL_SPEED: number;
    INITIAL_JUMP_POWER: number;
  };
  CAMERA: {
    FOV: number;
    NEAR: number;
    FAR: number;
  };
  GRAPHICS: IGraphicsSettings;
  PHYSICS: IPhysicsSettings;
}

export interface IPlayerControls {
  speed: number;
  jumpPower: number;
  mouseSensitivity: number;
}

export interface IEventEmitter {
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  emit(event: string, ...args: any[]): void;
}
