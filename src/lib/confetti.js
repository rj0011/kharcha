// Lightweight confetti burst (no library)
export function celebrate(power = 1) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const c = document.createElement('canvas')
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200'
  document.body.appendChild(c)
  const ctx = c.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1)
  const W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr)
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#a855f7', '#f43f5e']
  const N = Math.round(140 * power)
  const ps = Array.from({ length: N }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.2, y: H * 0.35,
    vx: (Math.random() - 0.5) * 18 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
    r: (4 + Math.random() * 5) * dpr, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
    col: colors[(Math.random() * colors.length) | 0], shape: Math.random() < 0.5,
  }))
  let f = 0
  const tick = () => {
    ctx.clearRect(0, 0, W, H)
    for (const p of ps) {
      p.vy += 0.45 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.col
      ctx.globalAlpha = Math.max(0, 1 - f / 140)
      if (p.shape) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.6, 0, 7); ctx.fill() }
      ctx.restore()
    }
    if (++f < 140) requestAnimationFrame(tick); else c.remove()
  }
  if (navigator.vibrate) navigator.vibrate([20, 40, 20])
  tick()
}
