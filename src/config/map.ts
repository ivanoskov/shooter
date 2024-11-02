import { Vector3 } from "three";
import { IMapConfig } from "../types";

export const MapConfig: IMapConfig = {
  STATIC_OBJECTS: {
    LOAD_OBJECTS: [
      { position: new Vector3(0, 0, 0), file: "collision-world.glb" },
    ],
    THREE_OBJESCTS: [
      {
        type: "box",
        position: new Vector3(2, -1.4, 0),
        geometry: new Vector3(0.6, 0.3, 4),
        color: "red",
      }
    ],
  },
}; 