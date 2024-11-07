import { Vector3 } from "three";

export interface ILoadObject {
  file: string;
  position: Vector3;
}

export interface IThreeObject {
  type: "box" | "sphere" | "cylinder";
  position: Vector3;
  geometry: {
    x: number;
    y: number;
    z: number;
  };
  color: number | string;
}

export interface IMapConfig {
  STATIC_OBJECTS: {
    LOAD_OBJECTS: ILoadObject[];
    THREE_OBJESCTS: IThreeObject[];
  };
  name: string;
}

export interface IMapList {
  [key: string]: string;
}
