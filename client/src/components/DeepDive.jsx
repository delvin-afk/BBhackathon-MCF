import { useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'

const TABS = ['🌍 Geopolitical', '🧠 Psychology', '📊 Financial', '🏛 Pol. & Econ.', '📜 Historical']
const KEYS = ['geo', 'psych', 'fin', 'poliecon', 'hist']
const TAG_STYLES = {
  geo:      { background:'rgba(34,197,94,0.1)',  color:'#4ADE80', border:'1px solid rgba(34,197,94,0.2)' },
  psych:    { background:'rgba(124,58,237,0.1)', color:'#A78BFA', border:'1px solid rgba(124,58,237,0.2)' },
  fin:      { background:'rgba(59,130,246,0.1)', color:'#60A5FA', border:'1px solid rgba(59,130,246,0.2)' },
  poliecon: { background:'rgba(245,158,11,0.1)', color:'#FCD34D', border:'1px solid rgba(245,158,11,0.2)' },
  hist:     { background:'rgba(239,68,68,0.1)',  color:'#F87171', border:'1px solid rgba(239,68,68,0.2)' },
}

export default function DeepDive() {
  const { ddOpen, ddTab, setDdOpen, setDdTab, feed, curIdx } = useAppStore()
  const elRef = useRef(null)

  const d = feed[curIdx]

  // Animate open/close
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    if (ddOpen) {
      el.style.display = 'flex'
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')))
    } else {
      el.classList.remove('open')
      const t = setTimeout(() => { el.style.display = 'none' }, 380)
      return () => clearTimeout(t)
    }
  }, [ddOpen])

  if (!d) return null

  const secs = d.deepdive?.[KEYS[ddTab]] || []
  const tagStyle = TAG_STYLES[KEYS[ddTab]] || {}

  return (
    <div id="dd" ref={elRef} style={{ display: 'none' }}>
      <div className="ddtop">
        <div className="ddclose" onClick={() => setDdOpen(false)}>‹</div>
        <div className="ddtitle">🔬 Deep Dive</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="ddref">
        <div className="ddref-hl">{d.headline}</div>
      </div>

      <div className="ddtabrow">
        {TABS.map((label, i) => (
          <div key={i} className={`ddtab${ddTab === i ? ' active' : ''}`} onClick={() => setDdTab(i)}>
            {label}
          </div>
        ))}
      </div>

      <div className="ddcontent">
        {secs.map((s, i) => (
          <div key={i} className="ddcard">
            <div className="ddctitle">{s.title}</div>
            <div className="ddcbody" dangerouslySetInnerHTML={{ __html: s.body }} />
            {s.tags && (
              <div style={{ marginTop: 8 }}>
                {s.tags.map(t => (
                  <span key={t} className="ddtag" style={tagStyle}>{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
