import React, { useEffect, useMemo, useRef, useState } from 'react'
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

  const pathFor = (connection: Connection) => {
    const a = nodes.find(n => n.id === connection.from)
    const b = nodes.find(n => n.id === connection.to)
    if (!a || !b) return ''
    const direction = b.x >= a.x ? 1 : -1
    const startX = a.x + (direction * 88)
    const endX = b.x - (direction * 88)
    const pull = Math.max(55, Math.abs(endX - startX) * .42)
    return `M ${startX} ${a.y} C ${startX + direction * pull} ${a.y}, ${endX - direction * pull} ${b.y}, ${endX} ${b.y}`
  }

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
            <svg className="connectors" viewBox="0 0 1120 620" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              {connections.map((c, index) => {
                const path = pathFor(c)
                return <g key={c.id} className="connection-group">
                  <path className="connector-shadow" d={path} />
                  <path className={`connector-line ${c.dashed ? 'dashed' : ''}`} d={path} style={{ stroke: c.color }} />
                  <circle r="3.5" fill={c.color} filter="url(#glow)" className="signal-dot">
                    <animateMotion dur={`${3.7 + (index % 4) * .8}s`} repeatCount="indefinite" path={path} />
                  </circle>
                </g>
              })}
            </svg>

            {nodes.map(node => {
              const isSelected = selectedId === node.id
              const isMatch = matchingIds.includes(node.id)
              return (
                <article
                  key={node.id}
                  className={`canvas-node type-${node.type} ${isSelected ? 'selected' : ''} ${!isMatch ? 'search-dim' : ''} ${connectingFrom === node.id ? 'connecting' : ''}`}
                  style={{ left: `${node.x / 11.2}%`, top: `${node.y / 6.2}%`, '--accent': node.color } as React.CSSProperties}
                  onPointerDown={e => nodePointerDown(e, node)}
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

          <div className="zoom-dock">
            <button onClick={() => setZoom(z => Math.max(.7, z - .1))} aria-label="Zoom out"><Minus size={15}/></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.25, z + .1))} aria-label="Zoom in"><Plus size={15}/></button>
            <i />
            <button onClick={() => { setZoom(1); notify('Canvas fitted to view') }} aria-label="Fit to view"><Maximize2 size={15}/></button>
          </div>

          <div className="view-dock">
            <button className={gridVisible ? 'active' : ''} onClick={() => setGridVisible(v => !v)} aria-label="Toggle grid"><Grid2X2 size={15}/></button>
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
