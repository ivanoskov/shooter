import {
  Vector3,
  ACESFilmicToneMapping,
  ColorManagement,
  ToneMapping,
} from "three";
import { IGameSettings } from "../types/game";
import { IGraphicsSettings } from "../types/graphics";

ColorManagement.enabled = true;

const graphicsSettings: IGraphicsSettings = {
  SHADOW_MAP_SIZE: 2048,
  SHADOW_RADIUS: 3,
  SHADOW_BIAS: -0.00005,
  ANISOTROPY: 8,
  TONE_MAPPING: ACESFilmicToneMapping as ToneMapping,
  EXPOSURE: 1.0,
  GAMMA_FACTOR: 2.2,
  MAX_LIGHTS: 4,
};

export const GameSettings: IGameSettings = {
  STEPS_PER_FRAME: 5,
  GRAVITY: 30,
  PLAYER: {
    INITIAL_POSITION: new Vector3(0, 0.35, 0),
    COLLIDER_RADIUS: 0.35,
    COLLIDER_HEIGHT: 0.65,
    INITIAL_SPEED: 25,
    INITIAL_JUMP_POWER: 15,
  },
  CAMERA: {
    FOV: 75,
    NEAR: 0.1,
    FAR: 1000,
  },
  GRAPHICS: graphicsSettings,
  PHYSICS: {
    octreeMaxDepth: 8,
    octreeMinSize: 0.5,
    octreeLoosenessFactor: 1.2,
    collisionIterations: 3,
    enableDynamicObjects: true,
    debugPhysics: false,
  },
};
