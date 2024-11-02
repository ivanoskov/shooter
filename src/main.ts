import { Game } from './core/Game';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('.canvas');

if (!canvas) {
  throw new Error('Canvas element not found');
}

new Game(canvas); 