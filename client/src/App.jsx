import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import useAppStore from './store/useAppStore'
import FeedScreen from './components/FeedScreen'
import AnalysisScreen from './components/AnalysisScreen'
import ReviewOrder from './components/ReviewOrder'
import SuccessOverlay from './components/SuccessOverlay'
import DesktopSidebar from './components/DesktopSidebar'
import './styles/global.css'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function App() {
  const loadFeed = useAppStore(s => s.loadFeed)
  const isDesktop = useIsDesktop()

  useEffect(() => { loadFeed() }, [])

  const toasterOpts = {
    style: {
      background: '#1E2538',
      color: '#F0F4FF',
      border: '1px solid #2A3347',
      fontFamily: 'DM Sans, sans-serif',
    },
  }

  if (isDesktop) {
    return (
      <div className="dt-root">
        <DesktopSidebar />
        <div className="dt-phone-wrap">
          <div className="dt-phone-label">
            <span className="dt-phone-label-dot" />
            Swipe to trade in &lt;30s
          </div>
          <div className="phone">
            <FeedScreen />
            <AnalysisScreen />
            <ReviewOrder />
            <SuccessOverlay />
          </div>
          <div className="dt-phone-hint">← swipe left to analyze · swipe up/down to browse</div>
        </div>
        <Toaster position="top-center" toastOptions={toasterOpts} />
      </div>
    )
  }

  return (
    <div className="mobile-root">
      <div className="phone">
        <FeedScreen />
        <AnalysisScreen />
        <ReviewOrder />
        <SuccessOverlay />
      </div>
      <Toaster position="top-center" toastOptions={toasterOpts} />
    </div>
  )
}
