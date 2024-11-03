import { Game } from './core/Game';
import './style.css';

// Динамический импорт для ленивой загрузки
async function initGame() {
  const canvas = document.querySelector<HTMLCanvasElement>('.canvas');

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Инициализируем игру только после загрузки всех необходимых ресурсов
  const game = new Game(canvas);
  return game;
}

// Запускаем инициализацию только после полной загрузки страницы
window.addEventListener('load', () => {
  initGame().catch(console.error);
}); 