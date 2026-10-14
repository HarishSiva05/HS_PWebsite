export type Rect = { x: number; y: number; w: number; h: number }

/**
 * Paints the film's own light around it, the way a screen lights a dark room.
 *
 * The current frame is tiled outward from the film's rectangle, mirrored at every edge, into a tiny
 * canvas (about 64 px wide). Mirroring keeps the colour continuous across each edge, so once CSS
 * scales the canvas up, blurs and darkens it, the letterbox reads as light spilling off the picture.
 * With `alpha` < 1 each paint blends into the last one, so the glow eases between shots instead of
 * flashing on hard cuts.
 */
export function paintGlow(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  film: Rect,
  frame: { w: number; h: number },
  /** CSS px the canvas overhangs each frame edge (room for the blur to fade). */
  margin: number,
  alpha = 1,
) {
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  const k = cw / (frame.w + 2 * margin)
  const fx = (film.x + margin) * k
  const fy = (film.y + margin) * k
  const fw = film.w * k
  const fh = film.h * k
  if (fw < 0.5 || fh < 0.5) return

  const i0 = -Math.ceil(fx / fw)
  const i1 = Math.ceil((cw - fx - fw) / fw)
  const j0 = -Math.ceil(fy / fh)
  const j1 = Math.ceil((ch - fy - fh) / fh)

  ctx.globalAlpha = alpha
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const mx = i % 2 !== 0
      const my = j % 2 !== 0
      ctx.setTransform(mx ? -1 : 1, 0, 0, my ? -1 : 1, fx + i * fw + (mx ? fw : 0), fy + j * fh + (my ? fh : 0))
      ctx.drawImage(src, 0, 0, fw, fh)
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
}
