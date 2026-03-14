import { useEffect, useRef, useState } from 'react'
import useAppStore from '../store/useAppStore'

export default function FeedScreen() {
  const vpRef = useRef(null)
  const [nudge, setNudge] = useState(false)
  const nudgeTimer = useRef(null)

  const { screen, feed, curIdx, isAnim, setCurIdx, setIsAnim, setScreen, setSelA } = useAppStore()

  // Build a card DOM node from data
  function buildCard(d) {
    const c = document.createElement('div')
    c.className = 'nc'
    c.innerHTML = `
      <div class="nc-bg"><img src="${d.image}" alt="" loading="lazy" onerror="this.parentElement.style.background='#1a2035'"></div>
      <div class="nc-shade-top"></div>
      <div class="nc-shade-bot"></div>
      <div class="nf t" id="nft"></div>
      <div class="nf b" id="nfb"></div>
      <div class="analyze-ov" id="av"><div class="av-lbl">Analyze ←</div></div>
      <div class="nc-content">
        <div class="nc-source-row">
          <div class="nc-src"><div class="nc-src-dot"></div><span class="nc-src-name">${d.source}</span></div>
          <span class="nc-time">${d.time}</span>
        </div>
        <div class="nc-hl">${d.headline}</div>
        <div class="nc-sum">${d.summary}</div>
        <div class="nc-tags-row">
          <div class="nc-tags">${(d.tags || []).map(t => `<div class="tpill"><span class="tdot ${(d.tag_sent || {})[t] || 'neut'}"></span>${t}</div>`).join('')}</div>
          <div class="sent ${d.sentiment}">${d.sentiment === 'bullish' ? '↑ Bullish' : d.sentiment === 'bearish' ? '↓ Bearish' : '↔ Mixed'}</div>
        </div>
      </div>`
    return c
  }

  function startNudge() {
    clearTimeout(nudgeTimer.current)
    setNudge(false)
    nudgeTimer.current = setTimeout(() => setNudge(true), 5000)
  }

  function goAnalysis() {
    clearTimeout(nudgeTimer.current)
    setNudge(false)
    const vp = vpRef.current
    const cur = vp?.querySelector('.nc')
    if (cur) {
      cur.style.transition = 'transform 0.26s ease,opacity 0.26s ease'
      cur.style.transform = 'translateX(-100%)'
      cur.style.opacity = '0'
    }
    setTimeout(() => {
      setScreen('s2')
    }, 280)
  }

  function slideCard(dir, newIdx) {
    const vp = vpRef.current
    if (!vp) return
    const cur = vp.querySelector('.nc')
    if (!cur) return

    setIsAnim(true)
    clearTimeout(nudgeTimer.current)
    setNudge(false)

    const nxt = buildCard(feed[newIdx])
    nxt.style.transform = dir === 'up' ? 'translateY(100%)' : 'translateY(-100%)'
    nxt.style.transition = 'none'
    vp.appendChild(nxt)

    cur.style.transition = 'transform 0.34s cubic-bezier(0.4,0,0.2,1)'
    cur.style.transform = dir === 'up' ? 'translateY(-100%)' : 'translateY(100%)'

    requestAnimationFrame(() => requestAnimationFrame(() => {
      nxt.style.transition = 'transform 0.34s cubic-bezier(0.4,0,0.2,1)'
      nxt.style.transform = ''
    }))

    setTimeout(() => {
      cur.remove()
      setCurIdx(newIdx)
      setupGestures(nxt)
      setIsAnim(false)
      startNudge()
    }, 380)
  }

  function setupGestures(card) {
    let sx = 0, sy = 0, dr = false, ax = null
    const nft = card.querySelector('#nft')
    const nfb = card.querySelector('#nfb')
    const av = card.querySelector('#av')

    const start = (x, y) => { sx = x; sy = y; dr = true; ax = null }

    const move = (x, y) => {
      if (!dr) return
      const dx = x - sx, dy = y - sy
      if (!ax && (Math.abs(dx) > 7 || Math.abs(dy) > 7))
        ax = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (!ax) return
      clearTimeout(nudgeTimer.current)
      setNudge(false)
      if (ax === 'h') {
        const cl = Math.min(0, dx), p = Math.min(1, Math.abs(cl) / 140)
        card.style.transform = `translateX(${cl * 0.4}px)`
        if (av) av.style.opacity = String(p)
      } else {
        card.style.transform = `translateY(${dy * 0.28}px)`
        if (dy < 0) {
          nft.style.opacity = String(Math.min(1, Math.abs(dy) / 45))
          nfb.style.opacity = '0'
        } else {
          nfb.style.opacity = String(Math.min(1, dy / 45))
          nft.style.opacity = '0'
        }
      }
    }

    const end = (x, y) => {
      if (!dr) return
      dr = false
      const dx = x - sx, dy = y - sy
      card.style.transition = 'transform 0.26s cubic-bezier(0.4,0,0.2,1)'

      const store = useAppStore.getState()
      const { feed: f, curIdx: ci, isAnim: ia } = store

      if (ax === 'h' && dx < -65) {
        goAnalysis()
      } else if (ax === 'v' && dy < -50 && !ia) {
        const ni = (ci + 1) % f.length
        slideCard('up', ni)
      } else if (ax === 'v' && dy > 50 && !ia) {
        const ni = (ci - 1 + f.length) % f.length
        slideCard('down', ni)
      } else {
        card.style.transform = ''
        if (av) av.style.opacity = '0'
        nft.style.opacity = '0'
        nfb.style.opacity = '0'
      }
      ax = null
      setTimeout(() => { card.style.transition = '' }, 280)
    }

    card.addEventListener('mousedown', ev => { ev.preventDefault(); start(ev.clientX, ev.clientY) })
    const mm = ev => { if (dr) move(ev.clientX, ev.clientY) }
    const mu = ev => { if (dr) end(ev.clientX, ev.clientY) }
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)

    card.addEventListener('touchstart', ev => start(ev.touches[0].clientX, ev.touches[0].clientY), { passive: true })
    card.addEventListener('touchmove', ev => move(ev.touches[0].clientX, ev.touches[0].clientY), { passive: true })
    card.addEventListener('touchend', ev => end(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY))

    // Cleanup on next render
    card._cleanup = () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', mu)
    }
  }

  // Render card whenever curIdx changes or we come back to feed
  useEffect(() => {
    if (screen !== 's1') return
    const vp = vpRef.current
    if (!vp || !feed.length) return

    // Cleanup previous listeners
    const old = vp.querySelector('.nc')
    if (old?._cleanup) old._cleanup()

    vp.innerHTML = ''
    const card = buildCard(feed[curIdx])
    vp.appendChild(card)
    setupGestures(card)
    startNudge()

    return () => {
      clearTimeout(nudgeTimer.current)
      if (card._cleanup) card._cleanup()
    }
  }, [curIdx, screen, feed])

  return (
    <div id="s1" className={`screen${screen === 's1' ? ' active' : ''}`} style={{ background: '#000' }}>
      <div id="card-vp" ref={vpRef} />
      <div id="analyze-nudge" className={nudge ? 'show' : ''}>
        <div className="nudge-label">Analyze Impact ←</div>
        <div className="nudge-hand">👆</div>
        <div className="nudge-trail">
          <div className="nudge-arrow" />
          <div className="nudge-arrow" style={{ width: 14, opacity: 0.6 }} />
          <div className="nudge-arrow" style={{ width: 8, opacity: 0.3 }} />
        </div>
      </div>
    </div>
  )
}
