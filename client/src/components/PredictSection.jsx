import { useEffect, useState } from 'react'
import { fetchPredictMarkets } from '../services/api'

export default function PredictSection({ headline, assets }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!headline) return
    setLoading(true)
    setMarkets([])
    setError(null)
    const tickers = Array.isArray(assets) ? assets : []
    console.log('[Predict] fetching for:', headline, 'assets:', tickers)
    fetchPredictMarkets({ headline, assets: tickers, limit: 4 })
      .then(data => {
        console.log('[Predict] got:', data)
        setMarkets(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        console.error('[Predict] error:', err)
        setError(err.message || 'Failed to load')
        setMarkets([])
      })
      .finally(() => setLoading(false))
  }, [headline])

  return (
    <div className="predict-section">
      <div className="predict-header">
        <span className="predict-title">Predict Markets</span>
        <span className="predict-sub">Related prediction markets</span>
      </div>

      {loading && (
        <div className="predict-loading">
          <div className="sk-spin" style={{ width: 20, height: 20, borderWidth: 2 }} />
          <span>Finding related markets…</span>
        </div>
      )}

      {!loading && error && (
        <div className="predict-empty">⚠️ {error}</div>
      )}

      {!loading && !error && markets.length === 0 && (
        <div className="predict-empty">No related prediction markets found</div>
      )}

      {!loading && markets.length > 0 && (
        <div className="predict-list">
          {markets.map(m => {
            const yesHot = m.yes_price > 65
            const noHot  = m.no_price > 65
            return (
              <a
                key={m.id}
                href={m.liquid_url}
                target="_blank"
                rel="noopener noreferrer"
                className="predict-card"
              >
                {m.image && (
                  <div className="predict-thumb">
                    <img src={m.image} alt="" onError={e => e.target.style.display='none'} />
                  </div>
                )}
                <div className="predict-body">
                  <div className="predict-q">{m.question || m.title}</div>
                  <div className="predict-prices">
                    <div className={`predict-yes${yesHot ? ' hot' : ''}`}>
                      Yes <strong>{m.yes_price}¢</strong>
                    </div>
                    <div className={`predict-no${noHot ? ' hot' : ''}`}>
                      No <strong>{m.no_price}¢</strong>
                    </div>
                    {m.volume_24h > 0 && (
                      <div className="predict-vol">
                        ${m.volume_24h >= 1000
                          ? `${(m.volume_24h / 1000).toFixed(1)}k`
                          : m.volume_24h} vol
                      </div>
                    )}
                  </div>
                </div>
                <div className="predict-arrow">↗</div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
