import { useRef, useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { fetchTicker } from '../services/api'

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

const POSITION_COLORS = {
  'BTC-PERP': '#F7931A', 'ETH-PERP': '#627EEA', 'SOL-PERP': '#9945FF',
  'XRP-PERP': '#346AA9', 'LINK-PERP': '#375BD2', 'GOLD-PERP': '#F59E0B',
}

function PortfolioTab() {
  const { account, positions, setBsTab, setTDir, setSelA, feed, curIdx, activeH } = useAppStore()

  const { loadAccount } = useAppStore()
  useEffect(() => { loadAccount() }, [])

  const equity    = account?.equity            ?? '—'
  const available = account?.available_balance ?? '—'
  const margin    = account?.margin_used       ?? 0

  function openTrade(pos) {
    // Pre-fill trade tab with the position's asset
    const ticker = pos.symbol.replace('-PERP', '')
    const d = feed[curIdx]
    const hk = ['short', 'mid', 'long'][activeH]
    const asset = d?.analysis?.[hk]?.assets?.find(a => a.ticker === ticker) || {
      ticker,
      name: ticker,
      color: POSITION_COLORS[pos.symbol] || '#7C3AED',
      dir: pos.side === 'long' ? 'up' : 'down',
      arrow: pos.side === 'long' ? '↑' : '↓',
    }
    setSelA(asset)
    setTDir(pos.side === 'long' ? 'long' : 'short')
    setBsTab('trade')
  }

  return (
    <>
      {/* Account summary */}
      <div style={{ background: 'var(--sf2)', borderRadius: 12, border: '1px solid var(--bd)', padding: '10px 14px', marginBottom: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', color: 'var(--t3)', textTransform: 'uppercase' }}>Liquid Account</span>
          <span style={{ fontSize: 9, color: '#4ADE80', fontWeight: 600 }}>● Live</span>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>EQUITY</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 800, color: 'var(--t)' }}>${typeof equity === 'number' ? equity.toLocaleString() : equity}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>AVAILABLE</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 800, color: '#4ADE80' }}>${typeof available === 'number' ? available.toLocaleString() : available}</div>
          </div>
          {margin > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>MARGIN USED</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 800, color: '#F87171' }}>${typeof margin === 'number' ? margin.toFixed(2) : margin}</div>
            </div>
          )}
        </div>
      </div>

      {/* Open positions */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', color: 'var(--t3)', textTransform: 'uppercase', margin: '8px 0 4px' }}>
        Open Positions {positions.length > 0 && <span style={{ color: 'var(--pu)', background: 'var(--pu-d)', padding: '1px 7px', borderRadius: 10 }}>{positions.length}</span>}
      </div>

      {positions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--t3)' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 3 }}>No open positions</div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>Swipe a news card to find your next trade</div>
        </div>
      ) : (
        positions.map((pos, i) => {
          const ticker = pos.symbol.replace('-PERP', '')
          const color = POSITION_COLORS[pos.symbol] || '#7C3AED'
          const pnl = pos.unrealized_pnl ?? 0
          const isLong = pos.side === 'long' || pos.side === 'buy'
          return (
            <div key={i} className="hcard" onClick={() => openTrade(pos)}>
              <div className="hico" style={{ background: color }}>{ticker}</div>
              <div className="hinf">
                <div className="hname">{pos.symbol}</div>
                <div className="hdet">
                  {isLong ? 'Long' : 'Short'} · entry ${pos.entry_price?.toLocaleString()} · {pos.leverage}×
                </div>
                <div className={`hpnl ${pnl >= 0 ? 'p' : 'n'}`}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} unrealized
                </div>
              </div>
              <div className="hact">
                <div className={`abg ${isLong ? 'BUY' : 'SELL'}`}>{isLong ? 'LONG' : 'SHORT'}</div>
                <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 3 }}>${pos.margin_used?.toFixed(2)} margin</div>
              </div>
            </div>
          )
        })
      )}

      {/* CTA: go to trade tab */}
      <button className="pfcta" onClick={() => setBsTab('trade')} style={{ background: 'var(--pu)' }}>
        ⚡ Open a New Trade →
      </button>
    </>
  )
}

function TradeTab() {
  const { feed, curIdx, activeH, selA, tDir, tSz, tLev, slPct, tpPct, oType, setTDir, setTSz, setTLev, setSlPct, setTpPct, setOType, setScreen } = useAppStore()
  const [livePrice, setLivePrice] = useState(null)

  const d = feed[curIdx]
  const hk = ['short', 'mid', 'long'][activeH]
  const a = selA || d?.analysis?.[hk]?.assets?.[0]

  useEffect(() => {
    if (!a?.ticker) return
    setLivePrice(null)
    fetchTicker(a.ticker)
      .then(t => setLivePrice(t.mark_price))
      .catch(() => {})
  }, [a?.ticker])

  if (!d || !a) return null
  const price = livePrice || d.prices?.[a.ticker] || 67420
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
        <div style={{ fontSize: 11, color: 'var(--t3)' }}>
          ${price.toLocaleString()}
          {livePrice && <span style={{ color: '#4ADE80', fontSize: 9, marginLeft: 4 }}>● LIVE</span>}
        </div>
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
