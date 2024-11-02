import { Vector3 } from "three";

export interface IStaticObject {
  position: Vector3;
  file: string;
}

export interface IThreeObject {
  type: 'box' | 'sphere' | 'cylinder';
  position: Vector3;
  geometry: Vector3;
  color: string;
}

export interface IMapConfig {
  STATIC_OBJECTS: {
    LOAD_OBJECTS: IStaticObject[];
    THREE_OBJESCTS: IThreeObject[];
  };
}

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
}

export interface IPlayerControls {
  speed: number;
  jumpPower: number;
  mouseSensitivity: number;
} 