import {
  ToneMapping,
  ShadowMapType,
  BasicShadowMap,
  PCFShadowMap,
  PCFSoftShadowMap,
} from "three";

export interface IGraphicsSettings {
  SHADOW_MAP_SIZE: number;
  SHADOW_RADIUS: number;
  SHADOW_BIAS: number;
  ANISOTROPY: number;
  TONE_MAPPING: ToneMapping;
  EXPOSURE: number;
  GAMMA_FACTOR: number;
  MAX_LIGHTS: number;
}

export interface IQualityPreset {
  shadowMapSize: number;
  shadowType: ShadowMapType;
  shadowRadius: number;
  anisotropy: number;
  maxLights: number;
  pcfSoftShadows: boolean;
}

export const QualityPresets: { [key: string]: IQualityPreset } = {
  low: {
    shadowMapSize: 512,
    shadowType: BasicShadowMap,
    shadowRadius: 2,
    anisotropy: 1,
    maxLights: 2,
    pcfSoftShadows: false,
  },
  medium: {
    shadowMapSize: 1024,
    shadowType: PCFShadowMap,
    shadowRadius: 3,
    anisotropy: 4,
    maxLights: 4,
    pcfSoftShadows: false,
  },
  high: {
    shadowMapSize: 2048,
    shadowType: PCFSoftShadowMap,
    shadowRadius: 4,
    anisotropy: 8,
    maxLights: 8,
    pcfSoftShadows: true,
  },
};
