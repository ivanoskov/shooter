import { Vector3 } from "three";
import { IGameSettings } from "../types";

export const GameSettings: IGameSettings = {
  STEPS_PER_FRAME: 5,
  GRAVITY: 30,
  PLAYER: {
    INITIAL_POSITION: new Vector3(0, 0.35, 0),
    COLLIDER_RADIUS: 0.35,
    COLLIDER_HEIGHT: 0.65,
    INITIAL_SPEED: 25,
    INITIAL_JUMP_POWER: 15
  },
  CAMERA: {
    FOV: 75,
    NEAR: 0.1,
    FAR: 1000
  }
}; 