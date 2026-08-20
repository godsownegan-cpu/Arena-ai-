import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, ArrowUpRight, Bell, Box, Check, ChevronDown, CircleHelp, Command,
  Copy, Crosshair, Database, Ellipsis, Eye, FileText, Focus, Frame, Gauge,
  Globe2, Grid2X2, Hash, Image, Layers3, Link2, ListFilter, Lock, Maximize2,
  MessageCircle, Minus, MousePointer2, Network, PanelRightClose, Play, Plus,
  Radar, Redo2, Search, Send, Settings2, Share2, Sparkles, SquareDashed,
  Type, Undo2, Users, WandSparkles, X, Zap
} from 'lucide-react'
import './styles.css'

type NodeType = 'brief' | 'data' | 'visual' | 'people' | 'core' | 'web' | 'launch' | 'note'
type NodeItem = {
  id: string
  title: string
  eyebrow: string
  x: number
  y: number
  type: NodeType
  color: string
  meta: string
  progress?: number
  avatar?: string
  live?: boolean
}
type Connection = { id: string; from: string; to: string; color?: string; dashed?: boolean }

const INITIAL_NODES: NodeItem[] = [
  { id: 'brief', title: 'Project brief', eyebrow: 'START HERE', x: 100, y: 310, type: 'brief', color: '#ff714b', meta: 'Updated 12m ago', progress: 100 },
  { id: 'research', title: 'Market signals', eyebrow: 'RESEARCH', x: 315, y: 160, type: 'data', color: '#b9dc7c', meta: '24 sources', progress: 76, live: true },
  { id: 'mood', title: 'Visual language', eyebrow: 'MOODBOARD', x: 555, y: 95, type: 'visual', color: '#a497f8', meta: '18 references', progress: 62 },
  { id: 'audience', title: 'Future audience', eyebrow: 'INSIGHT', x: 485, y: 430, type: 'people', color: '#f0cc6a', meta: '4 segments', progress: 84 },
  { id: 'core', title: 'Brand nucleus', eyebrow: 'SYNTHESIS', x: 730, y: 280, type: 'core', color: '#ff714b', meta: 'Ready to evolve', progress: 91, live: true },
  { id: 'website', title: 'Digital home', eyebrow: 'EXPERIENCE', x: 995, y: 130, type: 'web', color: '#5ec9c1', meta: '12 frames', progress: 48 },
  { id: 'launch', title: 'Launch system', eyebrow: 'ACTIVATION', x: 985, y: 455, type: 'launch', color: '#f59cbb', meta: '7 touchpoints', progress: 35 },
]

const INITIAL_CONNECTIONS: Connection[] = [
  { id: 'b-r', from: 'brief', to: 'research', color: '#b9dc7c' },
  { id: 'b-a', from: 'brief', to: 'audience', color: '#f0cc6a', dashed: true },
  { id: 'r-m', from: 'research', to: 'mood', color: '#a497f8' },
  { id: 'r-c', from: 'research', to: 'core', color: '#b9dc7c' },
  { id: 'm-c', from: 'mood', to: 'core', color: '#a497f8' },
  { id: 'a-c', from: 'audience', to: 'core', color: '#f0cc6a' },
  { id: 'c-w', from: 'core', to: 'website', color: '#5ec9c1' },
  { id: 'c-l', from: 'core', to: 'launch', color: '#f59cbb' },
  { id: 'w-l', from: 'website', to: 'launch', color: '#5ec9c1', dashed: true },
]

const iconForType: Record<NodeType, React.ReactNode> = {
  brief: <FileText size={16} />,
  data: <Activity size={16} />,
  visual: <Image size={16} />,
  people: <Users size={16} />,
  core: <Sparkles size={17} />,
  web: <Globe2 size={16} />,
  launch: <Zap size={16} />,
  note: <Type size={16} />,
}

const reactions = [
  { initials: 'MK', color: '#f1a67a' },
  { initials: 'AL', color: '#9f95df' },
  { initials: 'JS', color: '#9bc3a5' },
]

function Logo() {
  return (
    <div className="logo-mark" aria-label="Nexus home">
      <i /><i /><i /><i />
    </div>
  )
}

function RailButton({ children, label, active = false, onClick }: { children: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`rail-button ${active ? 'active' : ''}`} aria-label={label} title={label} onClick={onClick}>{children}</button>
}

/* ══════════════════════════════════════════════════════════════════
   CONNECTOR ENERGY ENGINE
   A real-time canvas renderer that turns every connection into a
   living signal: flowing gradient filaments, comet pulses, sparkle
   trails, glowing ports, drifting dust and shockwave bursts.
   ══════════════════════════════════════════════════════════════════ */

type Vec = { x: number; y: number }
type ConnGeom = { id: string; p0: Vec; c1: Vec; c2: Vec; p1: Vec; from: string; to: string; fromColor: string; toColor: string; dashed: boolean; hash: number }
type EnergyMode = 'flow' | 'calm'
type Burst = { connId: string; start: number; dur: number; reverse: boolean; strength: number }
type Comet = { connId: string; role: 'main' | 'echo' | 'back'; t: number; dur: number; reverse: boolean; size: number; alpha: number }
type Mote = { connId: string; t: number; speed: number; r: number; tw: number; alpha: number; reverse: boolean }
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: string }
type Dust = { x: number; y: number; vx: number; vy: number; r: number; tw: number; color: string }

type EngineState = {
  nodes: NodeItem[]
  connections: Connection[]
  geoms: (ConnGeom | null)[]
  selectedId: string | null
  hoveredNodeId: string | null
  dimmed: Set<string>
  energy: EnergyMode
  hovered: string | null
  bursts: Burst[]
  comets: Comet[]
  motes: Mote[]
  sparks: Spark[]
  dust: Dust[]
  t: number
  initialized: boolean
  prevSelected: string | null
  prevEnergy: EnergyMode
  known: Set<string>
}

const DUST_COLORS = ['#ff714b', '#b9dc7c', '#a497f8', '#f0cc6a', '#5ec9c1', '#f59cbb', '#7fb4ff']

const hashStr = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const lerpColor = (a: string, b: string, t: number): string => {
  const A = hexToRgb(a), B = hexToRgb(b)
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`
}

const hexA = (hex: string, alpha: number) => `rgba(${hexToRgb(hex).join(', ')},${alpha})`

const cubicAt = (p0: Vec, c1: Vec, c2: Vec, p1: Vec, t: number): Vec => {
  const u = 1 - t
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p1.x, y: a * p0.y + b * c1.y + c * c2.y + d * p1.y }
}

const geometryFor = (nodes: NodeItem[], conn: Connection): ConnGeom | null => {
  const a = nodes.find(n => n.id === conn.from)
  const b = nodes.find(n => n.id === conn.to)
  if (!a || !b) return null
  const direction = b.x >= a.x ? 1 : -1
  const startX = a.x + direction * 88
  const endX = b.x - direction * 88
  const pull = Math.max(55, Math.abs(endX - startX) * .42)
  return {
    id: conn.id,
    p0: { x: startX, y: a.y },
    c1: { x: startX + direction * pull, y: a.y },
    c2: { x: endX - direction * pull, y: b.y },
    p1: { x: endX, y: b.y },
    from: conn.from,
    to: conn.to,
    fromColor: a.color,
    toColor: b.color,
    dashed: !!conn.dashed,
    hash: hashStr(conn.id),
  }
}

const makeDust = (): Dust[] => Array.from({ length: 72 }, (_, i) => {
  const r = Math.random()
  return {
    x: Math.random() * 1120, y: Math.random() * 620,
    vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9,
    r: 0.5 + r * 1.1, tw: Math.random() * 6.28,
    color: DUST_COLORS[i % DUST_COLORS.length],
  }
})

const freshEngine = (): EngineState => ({
  nodes: [], connections: [], geoms: [],
  selectedId: null, hoveredNodeId: null, dimmed: new Set(), energy: 'flow',
  hovered: null, bursts: [], comets: [], motes: [], sparks: [], dust: makeDust(),
  t: 0, initialized: false, prevSelected: null, prevEnergy: 'flow', known: new Set(),
})

const addComets = (en: EngineState, conn: Connection) => {
  const h = hashStr(conn.id)
  const base = 2.9 + (h % 7) / 2.2
  en.comets.push(
    { connId: conn.id, role: 'main', t: ((h >>> 3) % 100) / 100, dur: base, reverse: false, size: 2.3, alpha: 0.95 },
    { connId: conn.id, role: 'echo', t: ((h >>> 5) % 100) / 100, dur: base * 1.9, reverse: false, size: 1.7, alpha: 0.5 },
    { connId: conn.id, role: 'back', t: ((h >>> 7) % 100) / 100, dur: base * 1.35, reverse: true, size: 1.5, alpha: 0.2 },
  )
}

const addMotes = (en: EngineState, conn: Connection) => {
  const h = hashStr(conn.id + '·motes')
  for (let i = 0; i < 3; i++) {
    en.motes.push({
      connId: conn.id,
      t: ((h >>> (i * 4)) % 97) / 97,
      speed: 0.045 + ((h >>> (i * 3 + 2)) % 10) / 90,
      r: 0.75 + ((h >>> (i * 2 + 5)) % 10) / 12,
      tw: ((h >>> (i * 5 + 1)) % 628) / 100,
      alpha: i === 2 ? 0.3 : 0.55,
      reverse: i === 2,
    })
  }
}

const surgeFrom = (en: EngineState, id: string | null) => {
  if (!id) return
  en.geoms.forEach((g, i) => {
    if (g && (g.from === id || g.to === id)) {
      en.bursts.push({ connId: g.id, start: en.t + i * 0.085, dur: 0.85, reverse: g.to === id, strength: g.from === id ? 1 : 0.55 })
    }
  })
}

const ripple = (en: EngineState) => {
  en.comets.forEach(c => { c.t = 0.22 })
  en.motes.forEach(m => { m.t = 0.15 })
  en.geoms.forEach((g, i) => { if (g) en.bursts.push({ connId: g.id, start: en.t + i * 0.06, dur: 0.9, reverse: false, strength: 0.8 }) })
}

const INTRO_ORDER = ['b-r', 'b-a', 'r-m', 'r-c', 'a-c', 'm-c', 'c-w', 'c-l', 'w-l']
const introCascade = (en: EngineState) => {
  INTRO_ORDER.forEach((id, i) => {
    if (en.geoms.some(g => g?.id === id)) en.bursts.push({ connId: id, start: en.t + 0.2 + i * 0.15, dur: 0.9, reverse: false, strength: 1 })
  })
}

function ConnectorEngine({
  nodes, connections, selectedId, hoveredNodeId, dimmedIds, energy, boardRef, onHover, onSurge,
}: {
  nodes: NodeItem[]
  connections: Connection[]
  selectedId: string
  hoveredNodeId: string | null
  dimmedIds: Set<string>
  energy: EnergyMode
  boardRef: { current: HTMLDivElement | null }
  onHover: (info: { conn: Connection; x: number; y: number } | null) => void
  onSurge: (conn: Connection) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const enRef = useRef<EngineState | null>(null)
  if (!enRef.current) enRef.current = freshEngine()
  const en = enRef.current
  const cbRef = useRef({ onHover, onSurge })
  cbRef.current = { onHover, onSurge }
  const staticRedraw = useRef<(() => void) | null>(null)
  const reducedRef = useRef(false)

  // Sync React state into the engine before paint so lines stay glued to nodes while dragging.
  useLayoutEffect(() => {
    en.nodes = nodes
    en.connections = connections
    en.selectedId = selectedId
    en.hoveredNodeId = hoveredNodeId
    en.dimmed = dimmedIds
    en.energy = energy
    en.geoms = connections.map(c => geometryFor(nodes, c))

    const nowIds = new Set(connections.map(c => c.id))
    const fresh = connections.filter(c => !en.known.has(c.id))
    if (en.initialized) {
      fresh.forEach(conn => {
        addComets(en, conn)
        addMotes(en, conn)
        en.bursts.push({ connId: conn.id, start: en.t, dur: 0.95, reverse: false, strength: 1 })
      })
    }
    en.comets = en.comets.filter(c => nowIds.has(c.connId))
    en.motes = en.motes.filter(m => nowIds.has(m.connId))
    en.bursts = en.bursts.filter(b => nowIds.has(b.connId))
    en.known = nowIds

    if (en.initialized && selectedId !== en.prevSelected) surgeFrom(en, selectedId)
    if (en.initialized && energy !== en.prevEnergy) ripple(en)
    if (!en.initialized) { introCascade(en); en.initialized = true }
    en.prevSelected = selectedId
    en.prevEnergy = energy

    if (reducedRef.current) staticRedraw.current?.()
  }, [nodes, connections, selectedId, hoveredNodeId, dimmedIds, energy])

  // Render loop + pointer interaction.
  useEffect(() => {
    const canvas = canvasRef.current
    const board = boardRef.current
    if (!canvas || !board) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedRef.current = reduced

    let rafId = 0
    let last = performance.now()
    let running = true
    const stage = canvas.parentElement

    const resize = () => {
      if (!stage) return
      const w = stage.clientWidth, h = stage.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (stage) ro.observe(stage)

    const geomMap = () => new Map(en.geoms.filter((g): g is ConnGeom => !!g).map(g => [g.id, g]))

    const hitConn = (dx: number, dy: number): ConnGeom | null => {
      let best: ConnGeom | null = null
      let bestD = 13
      for (const g of en.geoms) {
        if (!g) continue
        for (let i = 0; i <= 24; i++) {
          const p = cubicAt(g.p0, g.c1, g.c2, g.p1, i / 24)
          const dxp = p.x - dx, dyp = p.y - dy
          const d = Math.sqrt(dxp * dxp + dyp * dyp)
          if (d < bestD) { bestD = d; best = g }
        }
      }
      return best
    }

    const designPoint = (e: PointerEvent | MouseEvent): Vec => {
      if (!stage) return { x: 0, y: 0 }
      const r = stage.getBoundingClientRect()
      return { x: (e.clientX - r.left) / Math.max(1, r.width) * 1120, y: (e.clientY - r.top) / Math.max(1, r.height) * 620 }
    }

    const clearHover = () => {
      if (en.hovered) {
        en.hovered = null
        cbRef.current.onHover(null)
        board.style.cursor = ''
        if (reduced) staticRedraw.current?.()
      }
    }

    const onMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.closest('.canvas-node, .tool-dock, .zoom-dock, .view-dock, button')) { clearHover(); return }
      const p = designPoint(e)
      const g = hitConn(p.x, p.y)
      if (g) {
        const changed = g.id !== en.hovered
        en.hovered = g.id
        const conn = en.connections.find(c => c.id === g.id)
        if (conn) cbRef.current.onHover({ conn, x: e.clientX, y: e.clientY })
        board.style.cursor = 'pointer'
        if (reduced && changed) staticRedraw.current?.()
      } else {
        clearHover()
      }
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.closest('.canvas-node, button')) return
      const p = designPoint(e)
      const g = hitConn(p.x, p.y)
      if (g) {
        en.bursts.push({ connId: g.id, start: en.t, dur: 0.9, reverse: false, strength: 1.15 })
        en.sparks.push(...Array.from({ length: 8 }, (): Spark => ({
          x: p.x, y: p.y,
          vx: (Math.random() - .5) * 90, vy: (Math.random() - .5) * 90,
          life: .7 + Math.random() * .5, max: 1.2,
          r: .8 + Math.random() * 1.3,
          color: lerpColor(g.fromColor, g.toColor, Math.random()),
        })))
        const conn = en.connections.find(c => c.id === g.id)
        if (conn) cbRef.current.onSurge(conn)
      }
    }

    board.addEventListener('pointermove', onMove)
    board.addEventListener('pointerleave', clearHover)
    board.addEventListener('click', onClick)

    function spawnArrival(p: Vec, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2
        const sp = 14 + Math.random() * 40
        en.sparks.push({ x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.5 + Math.random() * 0.5, max: 1, r: 0.7 + Math.random() * 1.2, color })
      }
    }

    const update = (dt: number) => {
      en.t += dt
      const map = geomMap()
      const calm = en.energy === 'calm'
      for (const m of en.motes) {
        if (!map.has(m.connId)) continue
        m.t += dt * m.speed * (calm ? 0.4 : 1) * (m.reverse ? -1 : 1)
        if (m.t > 1) m.t -= 1
        else if (m.t < 0) m.t += 1
      }
      for (const c of en.comets) {
        const g = map.get(c.connId)
        if (!g) continue
        const dir = c.reverse ? -1 : 1
        c.t += (dt * dir) / (c.dur * (calm ? 2.1 : 1))
        if (c.t > 1) { c.t = 0; if (!calm || c.role === 'main') spawnArrival(g.p1, g.toColor, c.role === 'main' ? 3 : 1) }
        else if (c.t < 0) { c.t = 1; spawnArrival(g.p0, g.fromColor, 1) }
      }
      for (const s of en.sparks) {
        s.x += s.vx * dt; s.y += s.vy * dt
        const damp = Math.max(0, 1 - 1.8 * dt)
        s.vx *= damp; s.vy *= damp
        s.life -= dt
      }
      en.sparks = en.sparks.filter(s => s.life > 0)
      for (const du of en.dust) {
        du.x += du.vx * dt; du.y += du.vy * dt
        if (du.x < -24) du.x = 1144; else if (du.x > 1144) du.x = -24
        if (du.y < -24) du.y = 644; else if (du.y > 644) du.y = -24
      }
      en.bursts = en.bursts.filter(b => en.t - b.start < b.dur)
    }

    const draw = (time: number) => {
      if (!stage) return
      const w = stage.clientWidth, h = stage.clientHeight
      if (w < 2 || h < 2) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const sx = w / 1120, sy = h / 620
      const px = (x: number) => x * sx
      const py = (y: number) => y * sy
      const T = (p: Vec): Vec => ({ x: px(p.x), y: py(p.y) })
      const map = geomMap()

      const dimOf = (g: ConnGeom): number => {
        const isSel = en.selectedId != null && (g.from === en.selectedId || g.to === en.selectedId)
        const isDim = en.dimmed.has(g.from) || en.dimmed.has(g.to)
        const isNodeHover = en.hoveredNodeId != null && (g.from === en.hoveredNodeId || g.to === en.hoveredNodeId)
        let d = 1
        if (en.selectedId && !isSel) d = 0.32
        if (!en.selectedId && en.hoveredNodeId && !isNodeHover) d = 0.5
        if (isDim) d = 0.1
        if (en.energy === 'calm') d *= 0.6
        return d
      }
      const boostOf = (g: ConnGeom): number => {
        let b = 1
        if (g.from === en.selectedId || g.to === en.selectedId) b = 1.3
        if (en.hoveredNodeId && (g.from === en.hoveredNodeId || g.to === en.hoveredNodeId)) b = Math.max(b, 1.2)
        if (en.hovered === g.id) b = Math.max(b, 1.85)
        return b
      }

      const dims = new Map<string, number>()
      const boosts = new Map<string, number>()
      for (const g of en.geoms) if (g) { dims.set(g.id, dimOf(g)); boosts.set(g.id, boostOf(g)) }

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      /* ── pass 1 · halo + filament (normal blending) ── */
      for (const g of en.geoms) {
        if (!g) continue
        const d = dims.get(g.id)!, b = boosts.get(g.id)!
        const P0 = T(g.p0), C1 = T(g.c1), C2 = T(g.c2), P1 = T(g.p1)
        const path = new Path2D()
        path.moveTo(P0.x, P0.y)
        path.bezierCurveTo(C1.x, C1.y, C2.x, C2.y, P1.x, P1.y)

        const pulse = 0.5 + 0.5 * Math.sin(time * 1.4 + g.hash * 0.017)
        ctx.strokeStyle = g.fromColor
        ctx.globalAlpha = (0.05 + 0.03 * pulse) * d
        ctx.lineWidth = en.hovered === g.id ? 13 : 9
        ctx.stroke(path)
        ctx.globalAlpha = 0.085 * d * b
        ctx.lineWidth = 4.2
        ctx.stroke(path)

        const grad = ctx.createLinearGradient(P0.x, P0.y, P1.x, P1.y)
        grad.addColorStop(0, g.fromColor)
        grad.addColorStop(1, g.toColor)
        ctx.strokeStyle = grad
        ctx.globalAlpha = (g.dashed ? 0.4 : 0.62) * d * b
        ctx.lineWidth = en.hovered === g.id ? 2.2 : 1.35
        ctx.setLineDash(g.dashed ? [2.5, 7] : [10, 17])
        ctx.lineDashOffset = -(time * (en.energy === 'calm' ? 12 : 32) + (g.hash % 97))
        ctx.stroke(path)
        ctx.strokeStyle = '#ffffff'
        ctx.globalAlpha = 0.13 * d * b
        ctx.lineWidth = 0.6
        ctx.lineDashOffset = -(time * 21 + (g.hash % 53))
        ctx.stroke(path)
        ctx.setLineDash([])
      }
      ctx.globalAlpha = 1

      /* ── pass 2 · luminous layer (additive) ── */
      ctx.globalCompositeOperation = 'lighter'

      // drifting signal dust
      for (const du of en.dust) {
        const tw = 0.5 + 0.5 * Math.sin(time * 0.6 + du.tw * 7)
        ctx.fillStyle = du.color
        ctx.globalAlpha = (0.05 + 0.13 * tw) * (en.energy === 'calm' ? 0.5 : 1)
        ctx.beginPath(); ctx.arc(px(du.x), py(du.y), du.r, 0, 6.2832); ctx.fill()
      }

      // aura beneath the focused / hovered node
      for (const n of en.nodes) {
        if (n.id !== en.selectedId && n.id !== en.hoveredNodeId) continue
        const X = px(n.x), Y = py(n.y)
        const gd = ctx.createRadialGradient(X, Y, 0, X, Y, 64)
        gd.addColorStop(0, hexA(n.color, n.id === en.selectedId ? 0.09 : 0.05))
        gd.addColorStop(1, hexA(n.color, 0))
        ctx.fillStyle = gd
        ctx.beginPath(); ctx.arc(X, Y, 64, 0, 6.2832); ctx.fill()
      }

      // twinkling motes riding the lines
      for (const m of en.motes) {
        const g = map.get(m.connId)
        if (!g) continue
        if (en.energy === 'calm' && m.alpha < 0.4) continue
        const d = dims.get(g.id)!
        const p = cubicAt(g.p0, g.c1, g.c2, g.p1, clamp01(m.t))
        const tw = 0.55 + 0.45 * Math.sin(time * 2.1 + m.tw)
        ctx.fillStyle = lerpColor(g.fromColor, g.toColor, clamp01(m.t))
        ctx.globalAlpha = m.alpha * tw * d
        ctx.beginPath(); ctx.arc(px(p.x), py(p.y), m.r, 0, 6.2832); ctx.fill()
      }

      // comet pulses with fading sparkle tails
      for (const c of en.comets) {
        const g = map.get(c.connId)
        if (!g) continue
        const d = dims.get(g.id)!
        const color = lerpColor(g.fromColor, g.toColor, clamp01(c.t))
        const dir = c.reverse ? -1 : 1
        const tail = c.role === 'main' ? 0.16 : 0.11
        const n = c.role === 'main' ? 12 : 8
        for (let i = 1; i <= n; i++) {
          const tt = clamp01(c.t - dir * tail * (i / n))
          const q = cubicAt(g.p0, g.c1, g.c2, g.p1, tt)
          const fade = 1 - i / n
          ctx.fillStyle = color
          ctx.globalAlpha = c.alpha * d * fade * fade * 0.5 * (en.energy === 'calm' ? 0.5 : 1)
          ctx.beginPath(); ctx.arc(px(q.x), py(q.y), c.size * fade * 0.85, 0, 6.2832); ctx.fill()
        }
        const p = cubicAt(g.p0, g.c1, g.c2, g.p1, clamp01(c.t))
        const X = px(p.x), Y = py(p.y)
        const r = c.size * (en.hovered === g.id ? 1.3 : 1)
        const glow = ctx.createRadialGradient(X, Y, 0, X, Y, r * 3.4)
        glow.addColorStop(0, '#ffffff')
        glow.addColorStop(0.35, color)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        ctx.globalAlpha = c.alpha * d * 0.85
        ctx.beginPath(); ctx.arc(X, Y, r * 3.4, 0, 6.2832); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.globalAlpha = Math.min(1, c.alpha * d)
        ctx.beginPath(); ctx.arc(X, Y, r * 0.55, 0, 6.2832); ctx.fill()
      }

      // burst sparks
      for (const s of en.sparks) {
        ctx.fillStyle = s.color
        ctx.globalAlpha = Math.max(0, s.life / s.max) * 0.9
        ctx.beginPath(); ctx.arc(px(s.x), py(s.y), s.r, 0, 6.2832); ctx.fill()
      }

      // shockwave bursts
      for (const b of en.bursts) {
        if (time < b.start) continue
        const g = map.get(b.connId)
        if (!g) continue
        const t = clamp01((time - b.start) / b.dur)
        const e = 1 - Math.pow(1 - t, 3)
        const p = cubicAt(g.p0, g.c1, g.c2, g.p1, b.reverse ? 1 - e : e)
        const X = px(p.x), Y = py(p.y)
        const col = lerpColor(g.fromColor, g.toColor, clamp01(b.reverse ? 1 - e : e))
        const R = 3 + 17 * (1 - e)
        ctx.strokeStyle = col
        ctx.globalAlpha = (1 - t) * 0.85 * b.strength
        ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.arc(X, Y, R, 0, 6.2832); ctx.stroke()
        const gd = ctx.createRadialGradient(X, Y, 0, X, Y, R * 0.9)
        gd.addColorStop(0, '#ffffff')
        gd.addColorStop(0.4, col)
        gd.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gd
        ctx.globalAlpha = (1 - t * 0.55) * b.strength
        ctx.beginPath(); ctx.arc(X, Y, R * 0.9, 0, 6.2832); ctx.fill()
      }

      // breathing ports where lines dock into nodes
      for (const g of en.geoms) {
        if (!g) continue
        const d = Math.max(dims.get(g.id)!, 0.1)
        const ends: [Vec, string][] = [[g.p0, g.fromColor], [g.p1, g.toColor]]
        for (const [end, col] of ends) {
          const X = px(end.x), Y = py(end.y)
          const pulse = 0.5 + 0.5 * Math.sin(time * 2.3 + g.hash * 0.013)
          ctx.strokeStyle = col
          ctx.globalAlpha = (0.25 + 0.4 * pulse) * d
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(X, Y, 2.3 + 1.7 * pulse, 0, 6.2832); ctx.stroke()
          ctx.fillStyle = col
          ctx.globalAlpha = 0.95 * d
          ctx.beginPath(); ctx.arc(X, Y, 1.1, 0, 6.2832); ctx.fill()
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      if (!running) return
      rafId = requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      update(dt)
      draw(en.t)
    }

    const drawOnce = () => {
      if (!reduced) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => draw(en.t))
    }
    staticRedraw.current = drawOnce

    if (reduced) {
      draw(en.t)
    } else {
      last = performance.now()
      rafId = requestAnimationFrame(frame)
    }

    return () => {
      running = false
      cancelAnimationFrame(rafId)
      ro.disconnect()
      board.removeEventListener('pointermove', onMove)
      board.removeEventListener('pointerleave', clearHover)
      board.removeEventListener('click', onClick)
      staticRedraw.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={canvasRef} className="connector-canvas" aria-hidden="true" />
}

function App() {
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS)
  const [selectedId, setSelectedId] = useState('core')
  const [zoom, setZoom] = useState(1)
  const [gridVisible, setGridVisible] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [insights, setInsights] = useState(true)
  const [energy, setEnergy] = useState<EnergyMode>('flow')
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [connTip, setConnTip] = useState<{ conn: Connection; x: number; y: number } | null>(null)
  const tipMemo = useRef<{ id: string; x: number; y: number } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const selected = nodes.find(n => n.id === selectedId) ?? nodes[0]

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setSearchOpen(v => !v)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setShareOpen(false); setConnectingFrom(null) }
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(1.25, z + .1))
      if (e.key === '-') setZoom(z => Math.max(.7, z - .1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const nodePointerDown = (e: React.PointerEvent, node: NodeItem) => {
    if (connectingFrom) return
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const start = { clientX: e.clientX, clientY: e.clientY, x: node.x, y: node.y }
    const handleMove = (event: PointerEvent) => {
      const board = boardRef.current?.getBoundingClientRect()
      if (!board) return
      const dx = (event.clientX - start.clientX) / board.width * 1120 / zoom
      const dy = (event.clientY - start.clientY) / board.height * 620 / zoom
      setNodes(current => current.map(n => n.id === node.id ? {
        ...n,
        x: Math.max(90, Math.min(1030, start.x + dx)),
        y: Math.max(72, Math.min(548, start.y + dy)),
      } : n))
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const handleNodeClick = (id: string) => {
    if (connectingFrom) {
      if (connectingFrom !== id) {
        const exists = connections.some(c => (c.from === connectingFrom && c.to === id) || (c.from === id && c.to === connectingFrom))
        if (!exists) {
          setConnections(c => [...c, { id: `${connectingFrom}-${id}-${Date.now()}`, from: connectingFrom, to: id, color: nodes.find(n => n.id === id)?.color }])
          notify('New connection created')
        } else notify('These nodes are already connected')
      }
      setConnectingFrom(null)
      return
    }
    setSelectedId(id)
  }

  const addNode = () => {
    const count = nodes.filter(n => n.type === 'note').length + 1
    const next: NodeItem = {
      id: `note-${Date.now()}`,
      title: `New direction ${count}`,
      eyebrow: 'IDEA',
      x: 350 + Math.random() * 280,
      y: 250 + Math.random() * 180,
      type: 'note',
      color: '#7fb4ff',
      meta: 'Just now',
      progress: 10,
    }
    setNodes(n => [...n, next]); setSelectedId(next.id); notify('A fresh node joined the canvas')
  }

  const startConnection = () => {
    setConnectingFrom(selectedId)
    notify(`Choose a node to connect with ${selected.title}`)
  }

  const deleteSelected = () => {
    if (nodes.length <= 1) return
    setNodes(list => list.filter(n => n.id !== selectedId))
    setConnections(list => list.filter(c => c.from !== selectedId && c.to !== selectedId))
    setSelectedId(nodes.find(n => n.id !== selectedId)?.id ?? '')
    notify('Node removed from canvas')
  }

  const matchingIds = useMemo(() => query ? nodes.filter(n => `${n.title} ${n.eyebrow}`.toLowerCase().includes(query.toLowerCase())).map(n => n.id) : nodes.map(n => n.id), [query, nodes])
  const dimmedIds = useMemo(() => query ? new Set(nodes.filter(n => !matchingIds.includes(n.id)).map(n => n.id)) : new Set<string>(), [query, matchingIds, nodes])

  const handleConnHover = (info: { conn: Connection; x: number; y: number } | null) => {
    if (!info) { tipMemo.current = null; setConnTip(null); return }
    const last = tipMemo.current
    if (!last || last.id !== info.conn.id || Math.hypot(last.x - info.x, last.y - info.y) > 16) {
      tipMemo.current = { id: info.conn.id, x: info.x, y: info.y }
      setConnTip(info)
    }
  }

  const handleSurge = (conn: Connection) => {
    const a = nodes.find(n => n.id === conn.from)
    const b = nodes.find(n => n.id === conn.to)
    if (a && b) notify(`Signal surged through ${a.title} → ${b.title}`)
    setSelectedId(conn.from)
  }

  return (
    <div className={`app-shell ${focusMode ? 'focus-mode' : ''}`}>
      <aside className="left-rail">
        <Logo />
        <nav className="rail-nav">
          <RailButton active label="Canvas" onClick={() => notify('You’re on the living canvas')}><Network size={19} /></RailButton>
          <RailButton label="Library" onClick={() => notify('Library synced — 42 items')}><Box size={19} /></RailButton>
          <RailButton label="Signals" onClick={() => notify('Signal monitor is live')}><Radar size={19} /></RailButton>
          <RailButton label="Activity" onClick={() => notify('No unseen activity')}><Gauge size={19} /></RailButton>
        </nav>
        <div className="rail-bottom">
          <RailButton label="Help" onClick={() => notify('Press ⌘K to move at the speed of thought')}><CircleHelp size={18} /></RailButton>
          <RailButton label="Settings" onClick={() => notify('Workspace settings')}><Settings2 size={18} /></RailButton>
          <button className="profile-dot" aria-label="Your profile">EG<span /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="workspace-switcher">NEXUS LAB <ChevronDown size={13} /></button>
            <span>/</span>
            <div className="project-title"><i /> Project Halcyon</div>
          </div>
          <div className="top-actions">
            <div className="presence" aria-label="3 collaborators online">
              {reactions.map(a => <span key={a.initials} style={{ background: a.color }}>{a.initials}</span>)}
              <b>+2</b>
            </div>
            <button className="icon-button" onClick={() => notify('You’re all caught up')} aria-label="Notifications"><Bell size={17} /><i /></button>
            <button className="share-button" onClick={() => setShareOpen(true)}><Share2 size={15} /> Share</button>
          </div>
        </header>

        <section className="canvas-header">
          <div>
            <div className="overline"><span>ACTIVE CANVAS</span><i /> AUTO-SAVED</div>
            <h1>Where ideas<br/><em>find each other.</em></h1>
          </div>
          <p className="canvas-intro">Shape the system, not the slide deck.<br/>Drag anything. Connect everything.</p>
        </section>

        <section className={`board-wrap ${gridVisible ? 'show-grid' : ''}`} ref={boardRef}>
          <div className="ambient-orb orb-one"/><div className="ambient-orb orb-two"/>
          <div className="board-meta">
            <span><i /> LIVE SYSTEM</span>
            <span>{nodes.length} NODES</span>
            <span>{connections.length} LINKS</span>
            <span className={`flow-meta ${energy === 'flow' ? 'on' : ''}`}>FLOW {energy === 'flow' ? 'FULL' : 'CALM'}</span>
          </div>

          <div className="tool-dock">
            <button className="tool active" aria-label="Select tool"><MousePointer2 size={17} /></button>
            <button className="tool" onClick={addNode} aria-label="Add node"><Plus size={18} /></button>
            <button className={`tool ${connectingFrom ? 'active' : ''}`} onClick={startConnection} aria-label="Connect nodes"><Link2 size={17} /></button>
            <span />
            <button className="tool" onClick={() => notify('Text note tool ready')} aria-label="Text tool"><Type size={17} /></button>
            <button className="tool" onClick={() => notify('Frame the next chapter')} aria-label="Frame tool"><Frame size={17} /></button>
          </div>

          <div className="stage" style={{ transform: `scale(${zoom})` }}>
            <ConnectorEngine
              nodes={nodes}
              connections={connections}
              selectedId={selectedId}
              hoveredNodeId={hoveredNodeId}
              dimmedIds={dimmedIds}
              energy={energy}
              boardRef={boardRef}
              onHover={handleConnHover}
              onSurge={handleSurge}
            />

            {nodes.map(node => {
              const isSelected = selectedId === node.id
              const isMatch = matchingIds.includes(node.id)
              return (
                <article
                  key={node.id}
                  className={`canvas-node type-${node.type} ${isSelected ? 'selected' : ''} ${!isMatch ? 'search-dim' : ''} ${connectingFrom === node.id ? 'connecting' : ''}`}
                  style={{ left: `${node.x / 11.2}%`, top: `${node.y / 6.2}%`, '--accent': node.color } as React.CSSProperties}
                  onPointerDown={e => nodePointerDown(e, node)}
                  onPointerEnter={() => setHoveredNodeId(node.id)}
                  onPointerLeave={() => setHoveredNodeId(null)}
                  onClick={() => handleNodeClick(node.id)}
                >
                  <div className="node-port port-left"/><div className="node-port port-right"/>
                  <div className="node-topline">
                    <span className="node-icon">{iconForType[node.type]}</span>
                    <span className="node-eyebrow">{node.eyebrow}</span>
                    {node.live && <span className="live-pip" />}
                    <button className="node-menu" aria-label="More node options"><Ellipsis size={16}/></button>
                  </div>
                  {node.type === 'visual' && <div className="visual-swatch"><b/><b/><b/><b/></div>}
                  {node.type === 'people' && <div className="people-row"><span>RJ</span><span>SK</span><span>+1.8k</span></div>}
                  {node.type === 'core' && <div className="nucleus-mark"><i/><i/><i/></div>}
                  <h3>{node.title}</h3>
                  <div className="node-footer">
                    <span>{node.meta}</span>
                    {node.progress !== undefined && <b>{node.progress}%</b>}
                  </div>
                  {node.progress !== undefined && <div className="progress-track"><i style={{ width: `${node.progress}%` }}/></div>}
                </article>
              )
            })}
          </div>

          {connTip && (() => {
            const a = nodes.find(n => n.id === connTip.conn.from)
            const b = nodes.find(n => n.id === connTip.conn.to)
            if (!a || !b) return null
            return (
              <div className="connector-tip" style={{ left: connTip.x + 16, top: connTip.y + 14 }}>
                <i style={{ background: a.color, boxShadow: `0 0 8px ${a.color}` }} />
                <b>{a.title}</b>
                <span className="tip-arrow">→</span>
                <i style={{ background: b.color, boxShadow: `0 0 8px ${b.color}` }} />
                <b>{b.title}</b>
                <small>SIGNAL {Math.round(((a.progress ?? 50) + (b.progress ?? 50)) / 2)}% · CLICK TO SURGE</small>
              </div>
            )
          })()}

          <div className="zoom-dock">
            <button onClick={() => setZoom(z => Math.max(.7, z - .1))} aria-label="Zoom out"><Minus size={15}/></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.25, z + .1))} aria-label="Zoom in"><Plus size={15}/></button>
            <i />
            <button onClick={() => { setZoom(1); notify('Canvas fitted to view') }} aria-label="Fit to view"><Maximize2 size={15}/></button>
          </div>

          <div className="view-dock">
            <button className={gridVisible ? 'active' : ''} onClick={() => setGridVisible(v => !v)} aria-label="Toggle grid"><Grid2X2 size={15}/></button>
            <button className={`energy ${energy === 'flow' ? 'on' : ''}`} onClick={() => setEnergy(e => (e === 'flow' ? 'calm' : 'flow'))} aria-label="Toggle signal energy" title={energy === 'flow' ? 'Signal energy: full flow' : 'Signal energy: calm'}><Zap size={15}/></button>
            <button onClick={() => setFocusMode(v => !v)} aria-label="Focus mode"><Focus size={15}/></button>
          </div>
        </section>
      </main>

      <aside className="inspector">
        <div className="inspector-head">
          <span>DETAILS</span>
          <button onClick={() => setFocusMode(true)} aria-label="Close inspector"><PanelRightClose size={17}/></button>
        </div>
        <div className="selection-card">
          <div className="selection-icon" style={{ '--accent': selected.color } as React.CSSProperties}>{iconForType[selected.type]}</div>
          <div><span>{selected.eyebrow}</span><h2>{selected.title}</h2></div>
          <button aria-label="More options"><Ellipsis size={17}/></button>
        </div>
        <div className="status-row">
          <span>STATUS</span><button><i/> In progress <ChevronDown size={12}/></button>
        </div>
        <div className="inspector-section">
          <div className="section-title"><span>SIGNAL STRENGTH</span><b>{selected.progress ?? 50}%</b></div>
          <div className="strength-bars">{[1,2,3,4,5,6,7,8,9,10].map(i => <i key={i} className={i <= Math.round((selected.progress ?? 50) / 10) ? 'filled' : ''} style={{ height: `${7 + i * 1.4}px` }}/>)}</div>
          <p>Strong alignment across connected inputs. This direction is gaining momentum.</p>
        </div>
        <div className="inspector-section connections-list">
          <div className="section-title"><span>CONNECTIONS</span><button onClick={startConnection}><Plus size={14}/> Add</button></div>
          {connections.filter(c => c.from === selected.id || c.to === selected.id).slice(0, 4).map(c => {
            const otherId = c.from === selected.id ? c.to : c.from
            const other = nodes.find(n => n.id === otherId)
            return other && <button className="linked-item" key={c.id} onClick={() => setSelectedId(other.id)}>
              <i style={{ background: other.color }}>{iconForType[other.type]}</i>
              <span><b>{other.title}</b><small>{other.eyebrow.toLowerCase()}</small></span>
              <ArrowUpRight size={14}/>
            </button>
          })}
          {connections.every(c => c.from !== selected.id && c.to !== selected.id) && <p className="empty-copy">No connections yet. Link this idea to make it useful.</p>}
        </div>
        <div className="inspector-section intelligence">
          <div className="section-title"><span>AI PERSPECTIVE</span><button onClick={() => setInsights(v => !v)}>{insights ? 'Hide' : 'Show'}</button></div>
          {insights && <div className="ai-note"><WandSparkles size={16}/><p>Consider linking this with <b>Future audience</b>. They share three emerging themes.</p></div>}
        </div>
        <div className="inspector-bottom">
          <button className="comment-button" onClick={() => notify('Comment thread opened')}><MessageCircle size={15}/> Comment <span>3</span></button>
          <button className="delete-button" onClick={deleteSelected}>Remove</button>
        </div>
      </aside>

      <div className="floating-actions">
        <button onClick={() => { setSearchOpen(true); setQuery('') }}><Search size={16}/><span>Find anything</span><kbd>⌘ K</kbd></button>
        <button className="present-button" onClick={() => notify('Story mode is ready')}><Play size={15} fill="currentColor"/> Present</button>
      </div>

      {connectingFrom && <div className="connect-hint"><Link2 size={16}/><span>Choose another node to create a connection</span><button onClick={() => setConnectingFrom(null)}><X size={14}/></button></div>}
      {toast && <div className="toast"><Check size={15}/>{toast}</div>}

      {searchOpen && <div className="modal-backdrop" onMouseDown={() => setSearchOpen(false)}>
        <div className="command-panel" onMouseDown={e => e.stopPropagation()}>
          <div className="command-input"><Search size={19}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a node or run a command…"/><kbd>ESC</kbd></div>
          <div className="command-body">
            <span className="command-label">{query ? 'MATCHING NODES' : 'QUICK ACTIONS'}</span>
            {!query && <>
              <button onClick={() => { addNode(); setSearchOpen(false) }}><i><Plus size={16}/></i><span><b>Create a new node</b><small>Add a thought to this canvas</small></span><kbd>N</kbd></button>
              <button onClick={() => { setFocusMode(v => !v); setSearchOpen(false) }}><i><Focus size={16}/></i><span><b>Toggle focus mode</b><small>Clear away every distraction</small></span><kbd>F</kbd></button>
              <button onClick={() => { setGridVisible(v => !v); setSearchOpen(false) }}><i><Grid2X2 size={16}/></i><span><b>Toggle canvas grid</b><small>Show or hide spatial guides</small></span><kbd>G</kbd></button>
            </>}
            {query && nodes.filter(n => matchingIds.includes(n.id)).map(n => <button key={n.id} onClick={() => { setSelectedId(n.id); setSearchOpen(false); setQuery('') }}><i style={{ color: n.color }}>{iconForType[n.type]}</i><span><b>{n.title}</b><small>{n.eyebrow} · {n.meta}</small></span><ArrowUpRight size={14}/></button>)}
            {query && matchingIds.length === 0 && <div className="empty-search">No signals found for “{query}”</div>}
          </div>
          <footer><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> select</span><b><Command size={12}/> NEXUS COMMAND</b></footer>
        </div>
      </div>}

      {shareOpen && <div className="modal-backdrop" onMouseDown={() => setShareOpen(false)}>
        <div className="share-modal" onMouseDown={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShareOpen(false)}><X size={17}/></button>
          <div className="share-glyph"><Share2 size={20}/></div>
          <span className="overline">INVITE COLLABORATORS</span>
          <h2>Great ideas get better<br/>when they move.</h2>
          <p>Share this living canvas with your team. Everyone sees changes in real time.</p>
          <div className="invite-field"><input placeholder="name@studio.com"/><button onClick={() => { setShareOpen(false); notify('Invitation sent') }}><Send size={15}/> Invite</button></div>
          <div className="access-row"><Globe2 size={16}/><span><b>Anyone with the link</b><small>Can view and comment</small></span><button><ChevronDown size={14}/></button></div>
          <button className="copy-link" onClick={() => { navigator.clipboard?.writeText(window.location.href); setShareOpen(false); notify('Canvas link copied') }}><Copy size={15}/> Copy canvas link</button>
        </div>
      </div>}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
