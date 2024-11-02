import { EventEmitter } from "../events/EventEmitter";

export enum InputEventType {
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  POINTER_LOCK = 'pointerLock'
}

export interface InputEvent {
  type: InputEventType;
  code?: string;
  pressed?: boolean;
  movementX?: number;
  movementY?: number;
  locked?: boolean;
}

export class InputSystem extends EventEmitter {
  private keyStates: Map<string, boolean>;
  private mouseSensitivity: number;
  private isPointerLocked: boolean;

  constructor() {
    super();
    this.keyStates = new Map();
    this.mouseSensitivity = 0.5;
    this.isPointerLocked = false;
    this.init();
  }

  private init(): void {
    this.setupKeyboardEvents();
    this.setupMouseEvents();
    this.setupPointerLockEvents();
  }

  private setupKeyboardEvents(): void {
    document.addEventListener('keydown', (event) => {
      this.keyStates.set(event.code, true);
      this.emit(InputEventType.KEYBOARD, {
        type: InputEventType.KEYBOARD,
        code: event.code,
        pressed: true
      });
    });

    document.addEventListener('keyup', (event) => {
      this.keyStates.set(event.code, false);
      this.emit(InputEventType.KEYBOARD, {
        type: InputEventType.KEYBOARD,
        code: event.code,
        pressed: false
      });
    });
  }

  private setupMouseEvents(): void {
    document.addEventListener('mousemove', (event) => {
      if (this.isPointerLocked) {
        this.emit(InputEventType.MOUSE, {
          type: InputEventType.MOUSE,
          movementX: event.movementX * this.mouseSensitivity,
          movementY: event.movementY * this.mouseSensitivity
        });
      }
    });

    document.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        document.body.requestPointerLock();
      }
    });
  }

  private setupPointerLockEvents(): void {
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
      this.emit(InputEventType.POINTER_LOCK, {
        type: InputEventType.POINTER_LOCK,
        locked: this.isPointerLocked
      });
    });
  }

  public isKeyPressed(code: string): boolean {
    return this.keyStates.get(code) || false;
  }

  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }
} 