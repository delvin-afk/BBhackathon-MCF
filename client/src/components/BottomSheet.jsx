import { useRef } from 'react'
import useAppStore from '../store/useAppStore'

const OT_CYCLE = ['Market', 'Limit', 'Stop-Limit']

function calcTrade(price, tDir, tSz, tLev, slPct, tpPct) {
  const sp = tDir === 'long' ? price * (1 - slPct / 100) : price * (1 + slPct / 100)
  const tp = tDir === 'long' ? price * (1 + tpPct / 100) : price * (1 - tpPct / 100)
  const liqP = tLev > 1 ? (tDir === 'long' ? price * (1 - 0.9 / tLev) : price * (1 + 0.9 / tLev)) : null
  const rr = (tpPct / slPct).toFixed(2)
  const ml = (tSz * slPct / 100).toFixed(2)
  const mg = (tSz * tpPct / 100).toFixed(2)
  const margin = (tSz / tLev).toFixed(2)
  return { sp, tp, liqP, rr, ml, mg, margin }
}

function PortfolioTab() {
  const { feed, curIdx, activeH, pf, selH, setSelH, setBsTab, setTDir, setSelA, setScreen } = useAppStore()
  const d = feed[curIdx]
  if (!d) return null
  const hk = ['short', 'mid', 'long'][activeH]
  const pa = d.pa?.[hk] || {}
  const prices = d.prices || {}

  let tv = 0
  Object.entries(pf).forEach(([t, p]) => { tv += p.units * (prices[t] || p.avg) })

  let ti = 0
  Object.entries(pa).forEach(([t, a]) => {
    if (pf[t] && a.impact) {
      const n = parseFloat(a.impact.replace(/[^0-9.-]/g, ''))
      if (!isNaN(n)) ti += n
    }
  })

  const selAction = selH ? (pa[selH] || { action: 'HOLD' }) : null

  function handleCta() {
    if (!selH || !selAction) return
    if (selAction.action === 'HOLD' || selAction.action === 'WATCH') return
    const analysis = d.analysis[hk]
    const asset = analysis?.assets?.find(a => a.ticker === selH)
    if (asset) setSelA(asset)
    setTDir(selAction.action === 'ADD' ? 'long' : 'short')
    setBsTab('trade')
  }

  return (
    <>
      <div className="pfhdr">
        <div className="pftot">Portfolio: <span>${Math.round(tv).toLocaleString()}</span></div>
      </div>
      {ti !== 0 && (
        <div className="pfimp" style={{
          background: ti >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          color: ti >= 0 ? '#4ADE80' : '#F87171',
          border: `1px solid ${ti >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}>
          {ti >= 0 ? '↑' : '↓'} Est. impact: {ti >= 0 ? '+' : ''}${Math.abs(ti).toLocaleString()} this term
        </div>
      )}

      {Object.entries(pf).map(([ticker, pos]) => {
        const cp = prices[ticker] || pos.avg
        const cv = pos.units * cp
        const pnl = (cp - pos.avg) * pos.units
        const pnlp = ((cp - pos.avg) / pos.avg) * 100
        const action = pa[ticker] || { action: 'HOLD', note: 'Not directly affected', impact: '$0' }
        return (
          <div key={ticker} className={`hcard${selH === ticker ? ' sel' : ''}`} onClick={() => setSelH(ticker)}>
            <div className="hico" style={{ background: pos.color }}>{ticker}</div>
            <div className="hinf">
              <div className="hname">{ticker}</div>
              <div className="hdet">{pos.units} · avg ${pos.avg.toLocaleString()} · ${Math.round(cv).toLocaleString()}</div>
              <div className={`hpnl ${pnl >= 0 ? 'p' : 'n'}`}>{pnl >= 0 ? '+' : ''}${Math.round(pnl).toLocaleString()} ({pnlp.toFixed(1)}%)</div>
            </div>
            <div className="hact">
              <div className={`abg ${action.action}`}>{action.action}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 3 }}>{action.impact}</div>
            </div>
          </div>
        )
      })}

      <button className="pfcta" disabled={!selH} onClick={handleCta} style={{
        background: !selH ? 'var(--sf3)'
          : selAction?.action === 'REDUCE' ? 'linear-gradient(135deg,#DC2626,#EF4444)'
          : selAction?.action === 'ADD' ? 'linear-gradient(135deg,#16A34A,#22C55E)'
          : 'var(--pu)',
      }}>
        {!selH ? 'Select a position to act'
          : selAction?.action === 'ADD' ? `Buy More ${selH} ↑`
          : selAction?.action === 'REDUCE' ? `Sell ${selH} ↓`
          : selAction?.action === 'HOLD' ? `Hold ${selH}`
          : `Set Alert for ${selH}`}
      </button>
    </>
  )
}

function TradeTab() {
  const { feed, curIdx, activeH, selA, tDir, tSz, tLev, slPct, tpPct, oType, setTDir, setTSz, setTLev, setSlPct, setTpPct, setOType, setScreen } = useAppStore()
  const d = feed[curIdx]
  if (!d) return null
  const hk = ['short', 'mid', 'long'][activeH]
  const a = selA || d.analysis?.[hk]?.assets?.[0]
  if (!a) return null
  const price = d.prices?.[a.ticker] || 67420
  const { sp, tp, liqP, rr, ml, mg, margin } = calcTrade(price, tDir, tSz, tLev, slPct, tpPct)
  const rrG = parseFloat(rr) >= 1.5

  function editSLTP(which) {
    const cur = which === 'sl' ? slPct : tpPct
    const val = parseFloat(prompt(`${which === 'sl' ? 'Stop Loss' : 'Take Profit'} % (current: ${cur}%)`, cur))
    if (isNaN(val)) return
    if (which === 'sl') setSlPct(Math.max(0.5, Math.min(50, val)))
    else setTpPct(Math.max(0.5, Math.min(200, val)))
  }

  return (
    <div className="tform">
      {/* Asset row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)', fontSize: 9, fontWeight: 800, color: '#fff' }}>{a.ticker}</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 13, fontWeight: 700, color: 'var(--t)' }}>{a.name}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)' }}>${price.toLocaleString()}</div>
      </div>

      {/* Order type + direction */}
      <div className="tfr1">
        <div className="otsel" onClick={() => setOType(OT_CYCLE[(OT_CYCLE.indexOf(oType) + 1) % 3])}>
          <span>{oType}</span><span style={{ fontSize: 9, color: 'var(--t3)' }}>▾</span>
        </div>
        <div className="dtog">
          <div className={`db${tDir === 'long' ? ' lg' : ''}`} onClick={() => setTDir('long')}>↑ Long</div>
          <div className={`db${tDir === 'short' ? ' sh' : ''}`} onClick={() => setTDir('short')}>↓ Short</div>
        </div>
      </div>

      {/* Leverage */}
      <div className="levrow">
        <span className="levlbl">Leverage</span>
        <div className="levbtns">
          {[1, 2, 3, 5, 10].map(l => (
            <button key={l} className={`levb${l === tLev ? ' on' : ''}`} onClick={() => setTLev(l)}>{l}x</button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="szrow">
        <div className="szlr">
          <span className="szlbl">Size</span>
          <span className="szamt">${tSz}</span>
        </div>
        <input type="range" min={11} max={1000} step={1} value={tSz} onChange={e => setTSz(parseInt(e.target.value))} />
        <div className="szrange"><span>$11</span><span>$1,000</span></div>
      </div>

      {/* SL / TP */}
      <div className="sltprow">
        <div className="slb" onClick={() => editSLTP('sl')}>
          <div className="stlbl">STOP LOSS</div>
          <div className="stprice" style={{ color: '#F87171' }}>${Math.round(sp).toLocaleString()}</div>
          <div className="stpct">-{slPct}% · max -${ml}</div>
        </div>
        <div className="tpb" onClick={() => editSLTP('tp')}>
          <div className="stlbl">TAKE PROFIT</div>
          <div className="stprice" style={{ color: '#4ADE80' }}>${Math.round(tp).toLocaleString()}</div>
          <div className="stpct">+{tpPct}% · max +${mg}</div>
        </div>
      </div>

      {/* Risk grid */}
      <div className="rg">
        <div className="rgi"><div className="rgl">Risk:Reward</div><div className={`rgv ${rrG ? 'g' : 'w'}`}>1 : {rr}</div></div>
        <div className="rgi"><div className="rgl">Notional</div><div className="rgv">${(tSz * tLev).toLocaleString()}</div></div>
        <div className="rgi"><div className="rgl">Max Loss</div><div className="rgv d">-${ml}</div></div>
        <div className="rgi"><div className="rgl">Margin</div><div className="rgv">${margin}</div></div>
        {liqP && <div className="rgi"><div className="rgl">Liquidation</div><div className="rgv d">${Math.round(liqP).toLocaleString()}</div></div>}
        <div className="rgi"><div className="rgl">Entry</div><div className="rgv">${price.toLocaleString()}</div></div>
        <div className="rrbar"><div className="rrfill" style={{ width: `${Math.min(100, (parseFloat(rr) / 3) * 100)}%` }} /></div>
      </div>

      {/* CTA */}
      <button className="tcta" onClick={() => setScreen('s3')}>
        {tDir === 'long' ? 'Buy Long' : 'Sell Short'} ${tSz} {a.ticker}{tLev > 1 ? ` ×${tLev}` : ''} →
      </button>
    </div>
  )
}

export default function BottomSheet() {
  const { bsTab, bsExp, setBsTab, setBsExp, toggleBsExp } = useAppStore()
  const dragRef = useRef(null)
  let dragSy = 0, dragging = false

  function onDragStart(y) { dragSy = y; dragging = true }
  function onDragEnd(y) {
    if (!dragging) return
    dragging = false
    const dy = y - dragSy
    if (dy < -30) setBsExp(true)
    else if (dy > 20) setBsExp(false)
  }

  return (
    <div id="bs" className={bsExp ? 'exp' : ''}>
      {/* Handle + tabs */}
      <div className="bsh" ref={dragRef}
        onMouseDown={e => onDragStart(e.clientY)}
        onMouseUp={e => onDragEnd(e.clientY)}
        onTouchStart={e => onDragStart(e.touches[0].clientY)}
        onTouchEnd={e => onDragEnd(e.changedTouches[0].clientY)}
        onClick={() => { if (!bsExp) setBsExp(true) }}
      >
        <div className="bsbw"><div className="bsbar" /></div>
        <div className="bstabs">
          <div className={`bstab${bsTab === 'portfolio' ? ' active' : ''}`}
            onClick={e => { e.stopPropagation(); setBsTab('portfolio'); if (!bsExp) setBsExp(true) }}>
            💼 My Portfolio
          </div>
          <div className={`bstab${bsTab === 'trade' ? ' active' : ''}`}
            onClick={e => { e.stopPropagation(); setBsTab('trade'); if (!bsExp) setBsExp(true) }}>
            ⚡ Trade
          </div>
        </div>
      </div>

      {/* Content */}
      {bsExp && (
        <div className="bscontent">
          {bsTab === 'portfolio' ? <PortfolioTab /> : <TradeTab />}
        </div>
      )}
    </div>
  )
}
