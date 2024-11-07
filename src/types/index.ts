import { Vector3 } from "three";

export interface IStaticObject {
  position: Vector3;
  file: string;
}

export interface IThreeObject {
  type: "box" | "sphere" | "cylinder";
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

export interface IInputEvent {
  type: string;
  code?: string;
  pressed?: boolean;
  movementX?: number;
  movementY?: number;
  locked?: boolean;
}

export interface IEventEmitter {
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  emit(event: string, ...args: any[]): void;
}

export * from "./game";
export * from "./graphics";
export * from "./physics";
export * from "./input";
export * from "./map";
