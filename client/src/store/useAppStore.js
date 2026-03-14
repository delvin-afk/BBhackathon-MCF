import { create } from 'zustand'
import { fetchNewsFeed, fetchButterflyAnalysis, fetchAccount, fetchPositions } from '../services/api'
import { MOCK_NEWS } from '../data/mockNews'

// ── Asset colour lookup (fallback for unknown tickers) ──────────────────────
const ASSET_COLORS = {
  BTC:  '#F7931A', ETH:  '#627EEA', SOL:  '#9945FF', XRP:  '#346AA9',
  LINK: '#375BD2', GOLD: '#F59E0B', XAU:  '#F59E0B', OIL:  '#78716C',
  SPX:  '#6366F1', DOGE: '#C2A633', ADA:  '#0033AD', AVAX: '#E84142',
  BNB:  '#F3BA2F', DOT:  '#E6007A', MATIC:'#8247E5', UNI:  '#FF007A',
  AAPL: '#555555', MSFT: '#00A4EF', NVDA: '#76B900', TSLA: '#CC0000',
  GLD:  '#F59E0B', SLV:  '#C0C0C0', USO:  '#78716C',
}

function recToDir(recommendation) {
  if (recommendation === 'BUY')  return { dir: 'up',      arrow: '↑' }
  if (recommendation === 'SELL') return { dir: 'down',    arrow: '↓' }
  return                                { dir: 'neutral', arrow: '→' }
}

// Transform the new per-asset butterfly response into the panel format
function transformButterfly(butterfly) {
  const horizonDefs = [
    { key: 'short', apiKey: 'short_term', badge: 'SHORT TERM', bc: 'hb-s', fc: 'cf-s' },
    { key: 'mid',   apiKey: 'mid_term',   badge: 'MID TERM',   bc: 'hb-m', fc: 'cf-m' },
    { key: 'long',  apiKey: 'long_term',  badge: 'LONG TERM',  bc: 'hb-l', fc: 'cf-l' },
  ]

  const result = {}

  for (const { key, apiKey, badge, bc, fc } of horizonDefs) {
    const assets = butterfly.affected_assets.map(a => {
      const h = a[apiKey]
      const { dir, arrow } = recToDir(h.recommendation)
      const color = ASSET_COLORS[a.ticker] || '#7C3AED'
      return {
        ticker:         a.ticker,
        name:           a.name,
        color,
        dir,
        arrow,
        mag:            h.expected_move_pct || h.recommendation,
        expl:           h.thesis,
        hist:           a.impact_reason || null,
        recommendation: h.recommendation,
        confidence:     h.confidence,
      }
    })

    const avgConf = assets.length
      ? Math.round(assets.reduce((s, a) => s + a.confidence, 0) / assets.length * 100)
      : 60

    result[key] = {
      badge, bc, fc,
      sum:    butterfly.summary,
      conf:   avgConf,
      priced: key === 'short' && butterfly.already_priced_in,
      assets,
    }
  }

  const sentLabel = { Long: 'bullish', Short: 'bearish', Neutral: 'neutral' }[butterfly.primary_sentiment] || 'neutral'
  result.ctx = {
    geo:   butterfly.causal_chain,
    hist:  butterfly.already_priced_in
      ? 'This event may already be priced in — watch for mean-reversion setups rather than momentum entries.'
      : 'This appears to be fresh market-moving information not yet fully digested by the market.',
    psych: butterfly.key_risk || `Monitor ${butterfly.affected_assets.map(a => a.ticker).join(', ')} for contrary signals.`,
  }

  return result
}

const useAppStore = create((set, get) => ({
  // ── Navigation ──
  screen: 's1',
  setScreen: (screen) => set({ screen }),

  // ── Feed ──
  feed: MOCK_NEWS,
  curIdx: 0,
  isAnim: false,
  setCurIdx: (curIdx) => set({ curIdx }),
  setIsAnim: (isAnim) => set({ isAnim }),

  loadFeed: async () => {
    // Also kick off account load in parallel
    get().loadAccount()
    try {
      const items = await fetchNewsFeed(20)
      if (!items?.length) return
      // Real headlines + layout/prices from mock; analysis will be replaced by Claude
      const enriched = items.map((item, i) => ({
        ...MOCK_NEWS[i % MOCK_NEWS.length],
        id:       item.id,
        headline: item.headline,
        summary:  item.body || '',
        source:   item.source,
        time:     new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image:    item.thumbnail || MOCK_NEWS[i % MOCK_NEWS.length].image,
      }))
      set({ feed: enriched })
    } catch (e) {
      console.warn('[Feed] Using mock data:', e.message)
    }
  },

  // ── Analysis (S2) ──
  activeH: 0,
  selA: null,
  selH: null,
  analysisLoading: false,
  analysisCache: {},     // newsId → true (already fetched)
  setActiveH: (activeH) => set({ activeH, selH: null }),
  setSelA: (selA) => set({ selA }),
  setSelH: (selH) => set({ selH }),

  loadAnalysis: async () => {
    const { feed, curIdx, analysisCache } = get()
    const item = feed[curIdx]
    if (!item || analysisCache[item.id]) return   // skip only if already cached

    set({ analysisLoading: true })
    try {
      const result = await fetchButterflyAnalysis({
        newsId:   item.id,
        headline: item.headline,
        body:     item.summary || '',
      })
      const transformed = transformButterfly(result)
      const updatedFeed = feed.map((f, i) =>
        i === curIdx ? { ...f, analysis: transformed } : f
      )
      set({
        feed: updatedFeed,
        analysisCache: { ...analysisCache, [item.id]: true },
      })
    } catch (e) {
      console.warn('[Butterfly] Claude analysis failed — showing mock fallback:', e.message)
      // Mark as cached so we don't retry on every re-open
      set({ analysisCache: { ...get().analysisCache, [item.id]: 'failed' } })
    } finally {
      set({ analysisLoading: false })
    }
  },

  // ── Bottom sheet ──
  bsTab: 'portfolio',
  bsExp: false,
  setBsTab: (bsTab) => set({ bsTab }),
  setBsExp: (bsExp) => set({ bsExp }),
  toggleBsExp: () => set(s => ({ bsExp: !s.bsExp })),

  // ── Deep dive ──
  ddOpen: false,
  ddTab: 0,
  setDdOpen: (ddOpen) => set({ ddOpen }),
  setDdTab: (ddTab) => set({ ddTab }),

  // ── Trade form ──
  tDir: 'long',
  tSz: 100,
  tLev: 1,
  slPct: 5,
  tpPct: 8,
  oType: 'Market',
  setTDir: (tDir) => set({ tDir }),
  setTSz: (tSz) => set({ tSz }),
  setTLev: (tLev) => set({ tLev }),
  setSlPct: (slPct) => set({ slPct }),
  setTpPct: (tpPct) => set({ tpPct }),
  setOType: (oType) => set({ oType }),

  // ── Success ──
  sucShow: false,
  sucMsg: '',
  setSucShow: (sucShow) => set({ sucShow }),
  setSucMsg: (sucMsg) => set({ sucMsg }),

  // ── Portfolio (real Liquid account) ──
  account: null,     // { equity, available_balance, margin_used, account_value }
  positions: [],     // list of open positions from Liquid

  loadAccount: async () => {
    try {
      const [account, positions] = await Promise.all([fetchAccount(), fetchPositions()])
      set({ account, positions })
    } catch (e) {
      console.warn('[Account] Failed to load real account data:', e.message)
    }
  },

  currentNews: () => get().feed[get().curIdx],
  currentAnalysis: () => {
    const { feed, curIdx, activeH } = get()
    const d = feed[curIdx]
    if (!d) return null
    return d.analysis[['short', 'mid', 'long'][activeH]]
  },
}))

export default useAppStore
