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
  private isLocked: boolean;

  constructor() {
    super();
    this.keyStates = new Map();
    this.mouseSensitivity = 0.5;
    this.isLocked = false;
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
      if (this.isLocked) {
        this.emit(InputEventType.MOUSE, {
          type: InputEventType.MOUSE,
          movementX: event.movementX * this.mouseSensitivity,
          movementY: event.movementY * this.mouseSensitivity
        });
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('.lil-gui')) {
        return;
      }

      if (!this.isLocked) {
        document.body.requestPointerLock();
      }
    });
  }

  private setupPointerLockEvents(): void {
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement !== null;
      this.emit(InputEventType.POINTER_LOCK, { locked: this.isLocked });
    });
  }

  public isKeyPressed(code: string): boolean {
    return this.keyStates.get(code) || false;
  }

  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }
} 