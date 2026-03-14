import { useEffect, useState } from 'react'
import { fetchPredictMarkets } from '../services/api'

export default function PredictSection({ headline, assets }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!headline) return
    setLoading(true)
    setMarkets([])
    fetchPredictMarkets({ headline, assets, limit: 4 })
      .then(data => setMarkets(Array.isArray(data) ? data : []))
      .catch(() => setMarkets([]))
      .finally(() => setLoading(false))
  }, [headline])

  if (!loading && markets.length === 0) return null

  return (
    <div className="predict-section">
      <div className="predict-header">
        <span className="predict-title">🎯 Predict Markets</span>
        <span className="predict-sub">Related prediction markets</span>
      </div>

      {loading ? (
        <div className="predict-loading">
          <div className="sk-spin" style={{ width: 20, height: 20, borderWidth: 2 }} />
          <span>Finding related markets…</span>
        </div>
      ) : (
        <div className="predict-list">
          {(markets || []).map(m => {
            const yesHot  = m.yes_price > 65
            const noHot   = m.no_price > 65
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
