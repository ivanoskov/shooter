export class BrowserController {
  private static preventedKeys = new Set([
    // Движение
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    // Бег
    'ShiftLeft', 'ShiftRight',
    // Прыжок
    'Space',
    // Полноэкранный режим
    'F11',
    // Комбинации клавиш
    'KeyD+ShiftLeft+ControlLeft',
    'KeyA+ShiftLeft+ControlLeft',
    'KeyW+ShiftLeft+ControlLeft',
    'KeyS+ShiftLeft+ControlLeft'
  ]);

  private static preventedDefaults = new Set([
    'contextmenu',
    'selectstart',
    'dragstart'
  ]);

  public static init(): void {
    // Предотвращаем стандартные действия браузера
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp, { passive: false });
    
    // Отключаем контекстное меню и выделение текста
    this.preventedDefaults.forEach(event => {
      document.addEventListener(event, (e) => e.preventDefault());
    });

    // Отключаем масштабирование на мобильных устройствах
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Предотвращаем двойной клик
    document.addEventListener('dblclick', (e) => e.preventDefault());

    // Добавляем обработчик F11
    window.addEventListener('keydown', this.handleFullscreen);
  }

  private static handleKeyDown = (e: KeyboardEvent): void => {
    // Проверяем, является ли комбинация клавиш игровой
    const keyCombo = this.getKeyCombo(e);
    
    if (this.preventedKeys.has(e.code) || this.preventedKeys.has(keyCombo)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private static handleKeyUp = (e: KeyboardEvent): void => {
    if (this.preventedKeys.has(e.code)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private static getKeyCombo(e: KeyboardEvent): string {
    const keys: string[] = [e.code];
    if (e.shiftKey) keys.push('ShiftLeft');
    if (e.ctrlKey) keys.push('ControlLeft');
    if (e.altKey) keys.push('AltLeft');
    return keys.sort().join('+');
  }

  private static handleFullscreen = (e: KeyboardEvent): void => {
    if (e.code === 'F11') {
      e.preventDefault();
      
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Ошибка при переходе в полноэкранный режим: ${err.message}`);
        });
      } else {
        document.exitFullscreen().catch(err => {
          console.error(`Ошибка при выходе из полноэкранного режима: ${err.message}`);
        });
      }
    }
  };

  public static dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('keydown', this.handleFullscreen); // Удаляем обработчик при очистке
  }
} 