import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { executeTrade, fetchTicker } from '../services/api'

export default function ReviewOrder() {
  const {
    screen, setScreen,
    feed, curIdx, activeH,
    selA, tDir, tSz, tLev, slPct, tpPct, oType,
    setSucShow, setSucMsg,
  } = useAppStore()

  const [livePrice, setLivePrice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const d = feed[curIdx]
  const hk = ['short', 'mid', 'long'][activeH]
  const h = d?.analysis?.[hk]
  const a = selA || h?.assets?.[0]
  const mockPrice = a ? (d?.prices?.[a.ticker] || 67420) : 67420
  const price = livePrice || mockPrice

  // Fetch live mark price when screen opens
  useEffect(() => {
    if (screen !== 's3' || !a?.ticker) return
    fetchTicker(a.ticker)
      .then(t => setLivePrice(t.mark_price))
      .catch(() => {})
  }, [screen, a?.ticker])

  if (!d) return null

  const sp = tDir === 'long' ? price * (1 - slPct / 100) : price * (1 + slPct / 100)
  const tp = tDir === 'long' ? price * (1 + tpPct / 100) : price * (1 - tpPct / 100)
  const fee = tSz * 0.001
  const total = tSz + fee
  const rr = (tpPct / slPct).toFixed(2)
  const hmap = { short: 'SHORT TERM', mid: 'MID TERM', long: 'LONG TERM' }
  const cmap = { short: 'hb-s', mid: 'hb-m', long: 'hb-l' }

  async function confirmTrade() {
    setSubmitting(true)
    const btn = document.getElementById('cfmbtn')
    if (btn) { btn.textContent = '⏳ Placing order...'; btn.style.opacity = '0.7' }
    try {
      const result = await executeTrade({
        asset: a?.ticker || 'BTC',
        direction: tDir === 'long' ? 'Long' : 'Short',
        order_type: oType,
        quantity: tSz,          // USD notional
        price: oType === 'Market' ? null : price,
        leverage: tLev,
        tp_price: tp,
        sl_price: sp,
      })
      setSucMsg(`${tDir === 'long' ? 'Bought Long' : 'Sold Short'} $${tSz} ${a?.ticker} · Order ${result.order_id}`)
    } catch (e) {
      console.error('Trade failed:', e)
      setSucMsg(`[MOCK] ${tDir === 'long' ? 'Bought Long' : 'Sold Short'} $${tSz} ${a?.ticker || 'BTC'} via Liquid`)
    } finally {
      setSubmitting(false)
      setTimeout(() => setSucShow(true), 400)
    }
  }

  return (
    <div id="s3" className={`screen${screen === 's3' ? ' active' : ''}`}>
      <div className="s3nav">
        <div className="back-btn" onClick={() => setScreen('s2')}>‹</div>
        <div className="nav-title">Review Order</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="sa">
        <div className="ordcard">
          <div className={`ordstripe ${tDir}`} />
          <div className="ordinner">
            <div className="ordhdr">
              <div className={`dirbadge ${tDir}`}>{tDir === 'long' ? 'LONG ↑' : 'SHORT ↓'}</div>
              <div className="ordasset">
                <div className="oaico" style={{ background: a?.color || '#F7931A' }}>{a?.ticker || 'BTC'}</div>
                <div>
                  <div className="oaname">{a?.name || 'Bitcoin'}</div>
                  <div className="oasub">
                    {a?.ticker}-PERP · ${price.toLocaleString()}
                    {livePrice && <span style={{ color: '#4ADE80', fontSize: 10, marginLeft: 4 }}>● LIVE</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="odiv" />
            <div className="drow"><span className="dl">Order Type</span><span className="dv">{oType}</span></div>
            <div className="drow"><span className="dl">Direction</span><span className="dv">{tDir === 'long' ? 'Long ↑' : 'Short ↓'}</span></div>
            <div className="drow"><span className="dl">Leverage</span><span className="dv">{tLev}×</span></div>
            <div className="drow"><span className="dl">Size (USD notional)</span><span className="dv">${tSz.toFixed(2)}</span></div>
            <div className="drow"><span className="dl">Mark Price</span><span className="dv">${price.toLocaleString()}</span></div>
            <div className="drow"><span className="dl">Stop Loss</span><span className="dv" style={{ color: '#F87171' }}>${Math.round(sp).toLocaleString()} (-{slPct}%)</span></div>
            <div className="drow"><span className="dl">Take Profit</span><span className="dv" style={{ color: '#4ADE80' }}>${Math.round(tp).toLocaleString()} (+{tpPct}%)</span></div>
            <div className="drow"><span className="dl">R:R</span><span className="dv">{rr}</span></div>
            <div className="drow"><span className="dl">Fee (est.)</span><span className="dv">${fee.toFixed(2)}</span></div>
            <div className="odiv" />
            <div className={`drow tot ${tDir}`}>
              <span className="dl">Total Committed</span>
              <span className="dv">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="ctxcard">
          <div className="ctxbased">Based on this news:</div>
          <div className="ctxhl">{d.headline}</div>
          <span className={`ctxhb ${cmap[hk]}`}>{hmap[hk]}</span>
          <div className="ctxp">{h?.sum}</div>
        </div>

        <div className="disc">
          Trade executed via Liquid exchange. Crypto trading involves significant risk of loss.
          Analysis is for educational purposes only, not investment advice. Never trade more than you can afford to lose.
        </div>
      </div>

      <div className="cfmwrap">
        <button id="cfmbtn" className={`cfmbtn ${tDir}`} onClick={confirmTrade} disabled={submitting}>
          Confirm {tDir === 'long' ? 'Long' : 'Short'} → ${total.toFixed(2)}
        </button>
      </div>
    </div>
  )
}
