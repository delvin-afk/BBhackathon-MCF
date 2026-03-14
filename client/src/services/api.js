import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({ baseURL: BASE_URL, timeout: 30_000 })

export const fetchNewsFeed = (limit = 20) =>
  api.get('/news/feed', { params: { limit } }).then(r => r.data)

export const fetchButterflyAnalysis = ({ newsId, headline, body = '' }) =>
  api.post('/analysis/butterfly', { news_id: newsId, headline, body }).then(r => r.data)

export const executeTrade = (order) =>
  api.post('/trade/execute', order).then(r => r.data)

export const fetchBalances = () =>
  api.get('/trade/balances').then(r => r.data)

export const fetchAccount = () =>
  api.get('/trade/account').then(r => r.data)

export const fetchPositions = () =>
  api.get('/trade/positions').then(r => r.data)

export const fetchTicker = (asset) =>
  api.get('/trade/ticker', { params: { asset } }).then(r => r.data)

export const fetchMarkets = () =>
  api.get('/trade/markets').then(r => r.data)
