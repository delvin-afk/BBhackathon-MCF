import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { fetchAccount } from '../services/api'

export default function DesktopSidebar() {
  const { feed, curIdx, setCurIdx, setScreen } = useAppStore()
  const [account, setAccount] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    fetchAccount().then(setAccount).catch(() => {})
    const t = setInterval(() => setTick(n => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  // refetch account every 30s
  useEffect(() => {
    if (tick === 0) return
    fetchAccount().then(setAccount).catch(() => {})
  }, [tick])

  function selectCard(idx) {
    setCurIdx(idx)
    setScreen('s2')
  }

  return (
    <aside className="dt-sidebar">
      {/* Brand */}
      <div className="dt-brand">
        <div className="dt-logo">N</div>
        <div>
          <div className="dt-brand-name">NewsFi</div>
          <div className="dt-brand-sub">News-Driven Trading</div>
        </div>
        <div className="dt-live-dot" title="Live feed active" />
      </div>

      {/* Account strip */}
      {account && (
        <div className="dt-account">
          <div className="dt-acc-item">
            <span className="dt-acc-label">Equity</span>
            <span className="dt-acc-val">${account.equity?.toLocaleString()}</span>
          </div>
          <div className="dt-acc-sep" />
          <div className="dt-acc-item">
            <span className="dt-acc-label">Available</span>
            <span className="dt-acc-val dt-acc-green">${account.available_balance?.toLocaleString()}</span>
          </div>
          <div className="dt-acc-sep" />
          <div className="dt-acc-item">
            <span className="dt-acc-label">Margin</span>
            <span className="dt-acc-val dt-acc-red">${account.margin_used?.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Section label */}
      <div className="dt-section-label">
        <span>LIVE FEED</span>
        <span className="dt-count">{feed.length} stories</span>
      </div>

      {/* News list */}
      <div className="dt-news-list">
        {feed.map((item, i) => {
          const sentClass = item.sentiment === 'bullish' ? 'bull' : item.sentiment === 'bearish' ? 'bear' : 'neut'
          const active = i === curIdx
          return (
            <div
              key={item.id || i}
              className={`dt-news-card${active ? ' dt-news-card--active' : ''}`}
              onClick={() => selectCard(i)}
            >
              <div className="dt-nc-thumb">
                <img src={item.image} alt="" onError={e => { e.target.parentElement.style.background = '#1a2035'; e.target.style.display = 'none' }} />
              </div>
              <div className="dt-nc-body">
                <div className="dt-nc-meta">
                  <span className="dt-nc-source">{item.source}</span>
                  <span className="dt-nc-time">{item.time}</span>
                </div>
                <div className="dt-nc-hl">{item.headline}</div>
                <div className="dt-nc-tags">
                  {(item.tags || []).slice(0, 3).map(t => (
                    <span key={t} className="dt-tag">{t}</span>
                  ))}
                  <span className={`dt-sent dt-sent--${sentClass}`}>
                    {item.sentiment === 'bullish' ? '↑' : item.sentiment === 'bearish' ? '↓' : '↔'}{' '}
                    {item.sentiment}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="dt-footer">
        <span>Powered by</span>
        <span className="dt-footer-claude">Claude 3.5 Sonnet</span>
        <span>+ Liquid Exchange</span>
      </div>
    </aside>
  )
}
