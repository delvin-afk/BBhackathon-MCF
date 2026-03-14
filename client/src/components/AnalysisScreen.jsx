import { useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import BottomSheet from './BottomSheet'
import DeepDive from './DeepDive'
import PredictSection from './PredictSection'

function AnalysisSkeleton() {
  return (
    <div className="apanel" style={{ gap: 12 }}>
      <div className="sk-block" style={{ height: 100, borderRadius: 14 }} />
      <div className="sk-block" style={{ height: 76, borderRadius: 14 }} />
      <div className="sk-block" style={{ height: 76, borderRadius: 14 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <div className="sk-spin" />
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>Analysing market impact…</div>
      </div>
    </div>
  )
}

function toggleCx(hdr) {
  hdr.querySelector('.cxch').classList.toggle('open')
  hdr.nextElementSibling.classList.toggle('open')
}

function renderPanels(d, setSelA, selA, bsExp, bsTab, setBsTab, setBsExp) {
  const hks = ['short', 'mid', 'long']
  const allTickers = [...new Set(
    hks.flatMap(hk => (d.analysis[hk]?.assets || []).map(a => a.ticker))
  )]

  const analysisPanels = hks.map((hk, i) => {
    const ha = d.analysis[hk]
    return (
      <div key={hk} className="apanel" id={`ap${i}`}>
        {/* Summary card */}
        <div className="sc">
          <div className={`hbadge ${ha.bc}`}>{ha.badge}</div>
          <div className="sum-txt">{ha.sum}</div>
          {ha.priced && <div className="pi">⚠️ Short-term move may already be priced in</div>}
          <div className="cr" style={{ marginTop: 10 }}>
            <div className="ct"><div className={`cf ${ha.fc}`} style={{ width: `${ha.conf}%` }} /></div>
            <div className="cl">{ha.conf}% confidence</div>
          </div>
        </div>

        {/* Asset cards */}
        {ha.assets.map(a => (
          <div key={a.ticker} className="ac" onClick={() => {
            if (bsExp && selA?.ticker === a.ticker) {
              setBsExp(false)
            } else {
              setSelA(a)
              setBsTab('trade')
              setBsExp(true)
            }
          }}>
            <div className="act">
              <div className="ai" style={{ background: a.color }}>{a.ticker}</div>
              <div className="aif">
                <div className="an">{a.name}</div>
                <div className="as">{a.ticker} · {a.mag}</div>
              </div>
              <div className="apd">
                {a.recommendation && (
                  <div className={`abg ${a.recommendation}`} style={{ marginBottom: 3 }}>{a.recommendation}</div>
                )}
                <div className={`pa ${a.dir}`}>{a.arrow}</div>
              </div>
            </div>
            {a.expl && <div className="ae">{a.expl}</div>}
            {a.hist && <div className="hr">💡 {a.hist}</div>}
          </div>
        ))}

        {/* Context accordion */}
        <div className="cxacc">
          <div className="cxhdr" onClick={e => toggleCx(e.currentTarget)}>
            <span>More Context</span>
            <span className="cxch">⌄</span>
          </div>
          <div className="cxbody">
            <div className="cxsec">
              <div className="cxtitle">🌍 Geopolitical</div>
              <div className="cxtext">{d.analysis.ctx.geo}</div>
              <div className="cxtitle">📜 Historical</div>
              <div className="cxtext">{d.analysis.ctx.hist}</div>
              <div className="cxtitle">🧠 Psychology</div>
              <div className="cxtext">{d.analysis.ctx.psych}</div>
            </div>
          </div>
        </div>
      </div>
    )
  })

  // 4th panel: Predict
  const predictPanel = (
    <div key="predict" className="apanel" id="ap3">
      <PredictSection headline={d.headline} assets={allTickers} />
    </div>
  )

  return [...analysisPanels, predictPanel]
}

export default function AnalysisScreen() {
  const slRef = useRef(null)
  const aoRef = useRef(null)

  const {
    screen, setScreen, feed, curIdx, activeH, setActiveH,
    selA, setSelA, bsTab, setBsTab, bsExp, setBsExp,
    setDdOpen,
    analysisLoading, loadAnalysis,
  } = useAppStore()

  const d = feed[curIdx]

  // Trigger real analysis when S2 opens
  useEffect(() => {
    if (screen === 's2') loadAnalysis()
  }, [screen, curIdx])

  // Sync slider position with activeH (25% per panel now)
  useEffect(() => {
    const sl = slRef.current
    if (sl) sl.style.transform = `translateX(-${activeH * 25}%)`
  }, [activeH])

  // Horizontal swipe on analysis panels
  useEffect(() => {
    const ao = aoRef.current
    const sl = slRef.current
    if (!ao || !sl) return

    let sx = 0, dr = false

    const start = x => { sx = x; dr = true; sl.style.transition = 'none' }
    const move = x => {
      if (!dr) return
      const dx = x - sx, b = -useAppStore.getState().activeH * 25
      sl.style.transform = `translateX(calc(${b}% + ${dx * 0.4}px))`
    }
    const end = x => {
      if (!dr) return
      dr = false
      const dx = x - sx
      sl.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)'
      const cur = useAppStore.getState().activeH
      if (dx < -50 && cur < 3) useAppStore.getState().setActiveH(cur + 1)
      else if (dx > 50 && cur > 0) useAppStore.getState().setActiveH(cur - 1)
      else {
        const b2 = -useAppStore.getState().activeH * 25
        sl.style.transform = `translateX(${b2}%)`
      }
    }

    ao.addEventListener('mousedown', e => start(e.clientX))
    window.addEventListener('mousemove', e => { if (dr) move(e.clientX) })
    window.addEventListener('mouseup', e => end(e.clientX))
    ao.addEventListener('touchstart', e => start(e.touches[0].clientX), { passive: true })
    ao.addEventListener('touchmove', e => { if (dr) move(e.touches[0].clientX) }, { passive: true })
    ao.addEventListener('touchend', e => end(e.changedTouches[0].clientX))

    return () => {
      ao.removeEventListener('mousedown', () => {})
    }
  }, [screen])

  if (!d) return null

  const hPillCls = ['s-a', 'm-a', 'l-a', 'p-a']
  const pillLabels = ['Short', 'Mid', 'Long', '🎯 Predict']

  return (
    <div id="s2" className={`screen${screen === 's2' ? ' active' : ''}`}>
      {/* Top nav */}
      <div className="top-nav">
        <div className="back-btn" onClick={() => { setScreen('s1'); setBsExp(false) }}>‹</div>
        <div className="nav-title">Impact Analysis</div>
        <div className="share-btn">↗</div>
      </div>

      {/* News strip */}
      <div className="news-strip">
        <div className="strip-meta">{d.source} · {d.time}</div>
        <div className="strip-hl">{d.headline}</div>
      </div>

      {/* Horizon pills */}
      <div className="horizon-row">
        <div className="h-pills">
          {pillLabels.map((label, i) => (
            <div key={i} className={`hpill${activeH === i ? ` ${hPillCls[i]}` : ''}`} onClick={() => setActiveH(i)}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Deep dive row */}
      <div className="dd-row">
        <div className="dd-meta">
          {analysisLoading
            ? <span style={{ color: '#A78BFA' }}>⚡ Claude is analysing…</span>
            : <>AI analysis · <span>Claude Sonnet 4.6</span></>
          }
        </div>
        <div className="dd-btn" onClick={() => setDdOpen(true)}>🔬 Deep Dive →</div>
      </div>

      {/* Panels */}
      <div id="ao" ref={aoRef}>
        <div id="asl" ref={slRef}>
          {analysisLoading
            ? <AnalysisSkeleton />
            : renderPanels(d, setSelA, selA, bsExp, bsTab, setBsTab, setBsExp)
          }
        </div>
      </div>

      {/* Bottom sheet */}
      <BottomSheet />

      {/* Deep dive overlay */}
      <DeepDive />
    </div>
  )
}
