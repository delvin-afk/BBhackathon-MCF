import useAppStore from '../store/useAppStore'

export default function SuccessOverlay() {
  const { sucShow, sucMsg, setSucShow, setScreen, setCurIdx, feed, curIdx, setBsExp } = useAppStore()

  function goHome() {
    setSucShow(false)
    setBsExp(false)
    const next = (curIdx + 1) % feed.length
    setCurIdx(next)
    setScreen('s1')
  }

  return (
    <div id="sucov" className={sucShow ? 'show' : ''}>
      <div className="sucico">✓</div>
      <div className="suctit">Trade Placed!</div>
      <div className="sucsub">{sucMsg}</div>
      <div className="trackcard">
        <p>🦋 We'll track how this plays out.<br />Check predictions in <strong>48 hours</strong>.</p>
      </div>
      <button className="donebtn" onClick={goHome}>Done</button>
    </div>
  )
}
