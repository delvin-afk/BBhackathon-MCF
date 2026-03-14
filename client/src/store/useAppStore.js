import { create } from 'zustand'
import { fetchNewsFeed } from '../services/api'
import { MOCK_NEWS, PF } from '../data/mockNews'

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
    try {
      const items = await fetchNewsFeed(20)
      if (!items?.length) return
      // Overlay real headlines onto mock analysis structures
      const enriched = items.map((item, i) => ({
        ...MOCK_NEWS[i % MOCK_NEWS.length],
        id: item.id,
        headline: item.headline,
        summary: item.body || MOCK_NEWS[i % MOCK_NEWS.length].summary,
        source: item.source,
        time: new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: item.thumbnail || MOCK_NEWS[i % MOCK_NEWS.length].image,
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
  setActiveH: (activeH) => set({ activeH, selH: null }),
  setSelA: (selA) => set({ selA }),
  setSelH: (selH) => set({ selH }),

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

  // ── Portfolio ──
  pf: PF,

  // ── Derived helpers ──
  currentNews: () => {
    const { feed, curIdx } = get()
    return feed[curIdx]
  },
  currentAnalysis: () => {
    const { feed, curIdx, activeH } = get()
    const d = feed[curIdx]
    if (!d) return null
    const hk = ['short', 'mid', 'long'][activeH]
    return d.analysis[hk]
  },
}))

export default useAppStore
