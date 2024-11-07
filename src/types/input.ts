export interface IInputEvent {
  type: string;
  code?: string;
  pressed?: boolean;
  movementX?: number;
  movementY?: number;
  locked?: boolean;
}
