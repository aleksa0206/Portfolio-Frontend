import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789{}[]<>/=;:+*$#'.split(
  '',
);
const SIZE = 16; // px per glyph cell
const FRAME_MS = 50; // ~20 fps is plenty for the effect and keeps CPU usage low

// Matrix-style falling code behind the desktop. Purely decorative.
@Component({
  selector: 'app-matrix-rain',
  template: '<canvas #canvas aria-hidden="true"></canvas>',
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class MatrixRain {
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.start());
  }

  private start() {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const css = getComputedStyle(document.documentElement);
    const bg = css.getPropertyValue('--color-bg').trim();
    const green = css.getPropertyValue('--color-accent').trim();
    let drops: number[] = [];

    const resize = () => {
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      drops = Array.from(
        { length: Math.ceil(innerWidth / SIZE) },
        () => -Math.random() * (innerHeight / SIZE),
      );
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const draw = () => {
      // Translucent background over the last frame leaves fading trails
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${SIZE - 2}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = green;
      drops.forEach((y, i) => {
        ctx.globalAlpha = Math.random() < 0.03 ? 0.9 : 0.4;
        ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], i * SIZE, y * SIZE);
        drops[i] = y * SIZE > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
      });
      ctx.globalAlpha = 1;
    };

    resize();
    addEventListener('resize', resize);
    this.destroyRef.onDestroy(() => removeEventListener('resize', resize));

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i < 80; i++) draw(); // one static frame instead of an animation
      return;
    }

    let last = 0;
    let frame = 0;
    const loop = (time: number) => {
      if (time - last >= FRAME_MS) {
        last = time;
        draw();
      }
      frame = requestAnimationFrame(loop); // rAF pauses itself in background tabs
    };
    frame = requestAnimationFrame(loop);
    this.destroyRef.onDestroy(() => cancelAnimationFrame(frame));
  }
}
