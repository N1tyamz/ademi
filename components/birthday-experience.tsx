'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Heart, Mail, Music2, PartyPopper, Pause, Play, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { bouquetCaption, finalMessage, noteMessage, trackGroups, type Track } from './birthday-data'

const stageLabels = ['Start', 'Make a wish', 'Flowers', 'Mixtape', 'A note for you']
const candlePositions = [13, 30, 47, 64, 81]
const ambientNotes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 392, 329.63]
const normalizeTrackTitle = (value: string) => value.toLocaleLowerCase('en-US').replace(/[^a-z0-9]/g, '')
const backgroundTrackId = 'arctic-secret-door'
const totalTrackCount = trackGroups.reduce((count, group) => count + group.tracks.length, 0)

type ItunesTrack = {
  previewUrl?: string
  artworkUrl100?: string
  trackName?: string
}

type ItunesResponse = {
  results?: ItunesTrack[]
}

export function BirthdayExperience() {
  const [stage, setStage] = useState(1)
  const [candlesOut, setCandlesOut] = useState(0)
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'fallback'>('idle')
  const [micMessage, setMicMessage] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [partyMode, setPartyMode] = useState(false)
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [isTrackPlaying, setIsTrackPlaying] = useState(false)
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null)
  const [trackError, setTrackError] = useState<{ id: string; message: string } | null>(null)
  const [artworkByTrack, setArtworkByTrack] = useState<Record<string, string>>({})
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogUnavailable, setCatalogUnavailable] = useState(false)
  const [backgroundTrackUrl, setBackgroundTrackUrl] = useState<string | null>(null)
  const [isBackgroundMusicPlaying, setIsBackgroundMusicPlaying] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const ambientGainRef = useRef<GainNode | null>(null)
  const ambientTimerRef = useRef<number | null>(null)
  const ambientIndexRef = useRef(0)
  const microphoneRef = useRef<MediaStream | null>(null)
  const microphoneStatusRef = useRef<'idle' | 'listening' | 'fallback'>('idle')
  const blowTimeRef = useRef(0)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewSourcesRef = useRef<Record<string, string>>({})
  const catalogPromiseRef = useRef<Promise<void> | null>(null)
  const previewRequestRef = useRef(0)

  const setMicMode = useCallback((mode: 'idle' | 'listening' | 'fallback', message = '') => {
    microphoneStatusRef.current = mode
    setMicStatus(mode)
    setMicMessage(message)
  }, [])

  const loadTrackCatalog = useCallback(() => {
    if (catalogPromiseRef.current) return catalogPromiseRef.current

    setCatalogLoading(true)
    setCatalogUnavailable(false)
    const request = (async () => {
      const groupMatches = await Promise.all(trackGroups.map(async (group) => {
        try {
          const query = new URLSearchParams({ term: group.artist, entity: 'song', limit: '200' })
          const response = await fetch(`https://itunes.apple.com/search?${query.toString()}`)
          if (!response.ok) return []
          const data = (await response.json()) as ItunesResponse
          return group.tracks.flatMap((track) => {
            const title = normalizeTrackTitle(track.title)
            const result = data.results?.find((candidate) => normalizeTrackTitle(candidate.trackName ?? '') === title)
            return result ? [{ trackId: track.id, result }] : []
          })
        } catch {
          return []
        }
      }))
      const initialMatches = groupMatches.flat()
      const foundTrackIds = new Set(initialMatches.map(({ trackId }) => trackId))
      const missingTracks = trackGroups.flatMap((group) => group.tracks).filter((track) => !foundTrackIds.has(track.id))
      const fallbackMatches = await Promise.all(missingTracks.map(async (track) => {
        try {
          const query = new URLSearchParams({ term: `${track.artist} ${track.title}`, media: 'music', limit: '1' })
          const response = await fetch(`https://itunes.apple.com/search?${query.toString()}`)
          if (!response.ok) return []
          const data = (await response.json()) as ItunesResponse
          const title = normalizeTrackTitle(track.title)
          const result = data.results?.find((candidate) => normalizeTrackTitle(candidate.trackName ?? '') === title) ?? data.results?.[0]
          return result ? [{ trackId: track.id, result }] : []
        } catch {
          return []
        }
      }))
      const matches = [...initialMatches, ...fallbackMatches.flat()]
      const nextArtwork: Record<string, string> = {}
      for (const { trackId, result } of matches) {
        if (result.artworkUrl100) nextArtwork[trackId] = result.artworkUrl100
        if (result.previewUrl) previewSourcesRef.current[trackId] = result.previewUrl
      }
      setArtworkByTrack((current) => ({ ...current, ...nextArtwork }))
      setCatalogUnavailable(Object.keys(nextArtwork).length < totalTrackCount)
      const backgroundPreview = matches.find(({ trackId }) => trackId === backgroundTrackId)?.result.previewUrl
      if (backgroundPreview) setBackgroundTrackUrl(backgroundPreview)
    })().finally(() => setCatalogLoading(false))

    catalogPromiseRef.current = request
    return request
  }, [])

  const startAmbientMusic = useCallback(async () => {
    try {
      let context = audioContextRef.current
      if (!context) {
        context = new window.AudioContext()
        const master = context.createGain()
        master.gain.value = 0.055
        master.connect(context.destination)
        ambientGainRef.current = master
        audioContextRef.current = context

        const lowDrone = context.createOscillator()
        const softDrone = context.createOscillator()
        const lowGain = context.createGain()
        const softGain = context.createGain()
        lowDrone.type = 'sine'
        lowDrone.frequency.value = 110
        softDrone.type = 'sine'
        softDrone.frequency.value = 164.81
        lowGain.gain.value = 0.2
        softGain.gain.value = 0.08
        lowDrone.connect(lowGain).connect(master)
        softDrone.connect(softGain).connect(master)
        lowDrone.start()
        softDrone.start()

        const playNote = () => {
          const currentContext = audioContextRef.current
          const currentMaster = ambientGainRef.current
          if (!currentContext || !currentMaster) return
          const oscillator = currentContext.createOscillator()
          const envelope = currentContext.createGain()
          oscillator.type = 'triangle'
          oscillator.frequency.value = ambientNotes[ambientIndexRef.current % ambientNotes.length]
          ambientIndexRef.current += 1
          envelope.gain.setValueAtTime(0.0001, currentContext.currentTime)
          envelope.gain.exponentialRampToValueAtTime(0.14, currentContext.currentTime + 0.035)
          envelope.gain.exponentialRampToValueAtTime(0.0001, currentContext.currentTime + 0.58)
          oscillator.connect(envelope).connect(currentMaster)
          oscillator.start()
          oscillator.stop(currentContext.currentTime + 0.6)
        }

        playNote()
        ambientTimerRef.current = window.setInterval(playNote, 760)
        audioContextRef.current = context
      }
      if (context.state === 'suspended') await context.resume()
    } catch {
      setMicMessage('Your browser could not start the ambient music, but the birthday surprise is still ready.')
    }
  }, [])

  useEffect(() => {
    const context = audioContextRef.current
    const master = ambientGainRef.current
    if (!context || !master) return
    const shouldPauseAmbient = muted || isTrackPlaying || isBackgroundMusicPlaying
    master.gain.setTargetAtTime(shouldPauseAmbient ? 0 : 0.055, context.currentTime, 0.12)
  }, [isBackgroundMusicPlaying, isTrackPlaying, muted, stage])

  useEffect(() => {
    const audio = backgroundAudioRef.current
    if (!audio) return
    audio.loop = true
    audio.volume = 0.14
    if (!backgroundTrackUrl) {
      audio.pause()
      return
    }
    if (audio.src !== backgroundTrackUrl) {
      audio.src = backgroundTrackUrl
      audio.load()
    }
    if (stage < 2 || muted || isTrackPlaying) {
      audio.pause()
      return
    }
    void audio.play().catch(() => setIsBackgroundMusicPlaying(false))
  }, [backgroundTrackUrl, isTrackPlaying, muted, stage])

  const requestMicrophone = useCallback(async () => {
    if (microphoneRef.current) {
      setMicMode('listening', 'Your mic is ready. Give the candles a gentle blow or tap them one by one.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicMode('fallback', 'Microphone access is not available here. Tap each candle flame to blow it out.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      microphoneRef.current = stream
      setMicMode('listening', 'Your mic is ready. Give the candles a gentle blow or tap them one by one.')
    } catch {
      setMicMode('fallback', 'No mic? No problem. Tap each candle flame to blow it out.')
    }
  }, [setMicMode])

  const openBirthday = useCallback(() => {
    setStage(2)
    void startAmbientMusic()
    void requestMicrophone()
    void loadTrackCatalog()
  }, [loadTrackCatalog, requestMicrophone, startAmbientMusic])

  const openMixtape = useCallback(() => {
    setNoteOpen(false)
    setStage(4)
    void loadTrackCatalog()
  }, [loadTrackCatalog])

  const blowOutCandle = useCallback(() => {
    setCandlesOut((count) => Math.min(count + 1, candlePositions.length))
  }, [])

  useEffect(() => {
    const stream = microphoneRef.current
    const context = audioContextRef.current
    if (stage !== 2 || !stream || !context) return
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    const source = context.createMediaStreamSource(stream)
    source.connect(analyser)
    const samples = new Uint8Array(analyser.fftSize)
    let frame = 0

    const inspectBreath = () => {
      analyser.getByteTimeDomainData(samples)
      let energy = 0
      for (const sample of samples) energy += Math.abs(sample - 128)
      const average = energy / samples.length
      const now = performance.now()
      if (average > 13 && now - blowTimeRef.current > 900) {
        blowTimeRef.current = now
        blowOutCandle()
      }
      frame = window.requestAnimationFrame(inspectBreath)
    }

    frame = window.requestAnimationFrame(inspectBreath)
    return () => {
      window.cancelAnimationFrame(frame)
      source.disconnect()
      analyser.disconnect()
    }
  }, [blowOutCandle, stage, micStatus])

  useEffect(() => {
    if (!microphoneRef.current) return
    return () => microphoneRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  useEffect(() => {
    return () => {
      if (ambientTimerRef.current !== null) window.clearInterval(ambientTimerRef.current)
      microphoneRef.current?.getTracks().forEach((track) => track.stop())
      void audioContextRef.current?.close()
      previewAudioRef.current?.pause()
      backgroundAudioRef.current?.pause()
    }
  }, [])

  const toggleTrack = useCallback(async (track: Track) => {
    const audio = previewAudioRef.current
    if (!audio) return

    if (activeTrackId === track.id && isTrackPlaying) {
      audio.pause()
      setIsTrackPlaying(false)
      return
    }

    setTrackError(null)
    if (activeTrackId === track.id && previewSourcesRef.current[track.id]) {
      try {
        await audio.play()
        setIsTrackPlaying(true)
      } catch {
        setIsTrackPlaying(false)
        setTrackError({ id: track.id, message: 'Tap play again to start this preview.' })
      }
      return
    }

    audio.pause()
    setIsTrackPlaying(false)
    setActiveTrackId(track.id)
    setLoadingTrackId(track.id)
    const requestId = ++previewRequestRef.current

    try {
      let previewUrl = previewSourcesRef.current[track.id]
      if (!previewUrl) {
        await (catalogPromiseRef.current ?? loadTrackCatalog())
        if (requestId !== previewRequestRef.current) return
        previewUrl = previewSourcesRef.current[track.id]
      }

      if (!previewUrl) {
        const query = new URLSearchParams({ term: `${track.artist} ${track.title}`, media: 'music', limit: '1' })
        const response = await fetch(`https://itunes.apple.com/search?${query.toString()}`)
        if (!response.ok) throw new Error('preview')
        const data = (await response.json()) as ItunesResponse
        if (requestId !== previewRequestRef.current) return
        const result = data.results?.[0]
        if (result?.artworkUrl100) {
          setArtworkByTrack((artwork) => ({ ...artwork, [track.id]: result.artworkUrl100 as string }))
        }
        const fetchedPreviewUrl = result?.previewUrl
        if (fetchedPreviewUrl) {
          previewUrl = fetchedPreviewUrl
          previewSourcesRef.current[track.id] = fetchedPreviewUrl
        }
      }

      if (!previewUrl) throw new Error('preview')
      audio.src = previewUrl
      audio.load()
      try {
        await audio.play()
        setIsTrackPlaying(true)
      } catch {
        setIsTrackPlaying(false)
        setTrackError({ id: track.id, message: 'Preview ready. Tap play once more to start it.' })
      }
    } catch {
      if (requestId === previewRequestRef.current) {
        setIsTrackPlaying(false)
        setTrackError({ id: track.id, message: 'A preview could not load right now. Try again in a moment.' })
      }
    } finally {
      if (requestId === previewRequestRef.current) setLoadingTrackId(null)
    }
  }, [activeTrackId, isTrackPlaying, loadTrackCatalog])

  const finishMixtape = useCallback(() => {
    previewRequestRef.current += 1
    previewAudioRef.current?.pause()
    setIsTrackPlaying(false)
    setLoadingTrackId(null)
    setStage(5)
  }, [])

  const replayFromStart = useCallback(() => {
    previewRequestRef.current += 1
    previewAudioRef.current?.pause()
    setIsTrackPlaying(false)
    setActiveTrackId(null)
    setLoadingTrackId(null)
    setTrackError(null)
    setCandlesOut(0)
    setNoteOpen(false)
    setStage(1)
  }, [])

  return (
    <main className={`birthday-shell stage-${stage} ${partyMode ? 'party-mode' : ''}`}>
      <audio ref={backgroundAudioRef} preload="none" loop onPlay={() => setIsBackgroundMusicPlaying(true)} onPause={() => setIsBackgroundMusicPlaying(false)} aria-label="Arctic Monkeys Secret Door background soundtrack" />
      <div className="paper-grain" aria-hidden="true" />
      {partyMode && <div className="party-confetti" aria-hidden="true">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `-${(index % 17) / 2}s`, animationDuration: `${2.3 + (index % 5) * 0.35}s`, backgroundColor: ['#dc766b', '#efd279', '#a4b89b', '#b4a4c7', '#9bb3c2', '#e9b793'][index % 6] }} />)}</div>}
      <div className="floating-spark spark-one" aria-hidden="true">*</div>
      <div className="floating-spark spark-two" aria-hidden="true">*</div>
      <div className="floating-spark spark-three" aria-hidden="true">*</div>

      <header className="topbar">
        <div className="brand-mark">
          <span className="brand-pixel" aria-hidden="true">A</span>
          <span>ADEMI.EXE</span>
        </div>
        <div className="topbar-actions">
          <button className={`party-toggle pixel-button ${partyMode ? 'is-on' : ''}`} type="button" onClick={() => setPartyMode((value) => !value)} aria-pressed={partyMode} aria-label={partyMode ? 'Turn party mode off' : 'Turn party mode on'}>
            {partyMode ? <Sparkles size={14} aria-hidden="true" /> : <PartyPopper size={14} aria-hidden="true" />}
            <span>{partyMode ? 'PARTY ON' : 'PARTY MODE'}</span>
          </button>
          {stage > 1 && (
            <button className="sound-toggle pixel-button" type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? 'Unmute background music' : 'Mute background music'}>
              {muted ? <VolumeX size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
              <span>{muted ? 'SOUND OFF' : 'SOUND ON'}</span>
            </button>
          )}
          <span className="version-label">BIRTHDAY BUILD <span>1.0</span></span>
        </div>
      </header>

      <div className="experience-frame" id="top">
        <div className="frame-topline">
          <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="frame-title">A LITTLE SOMETHING FOR YOU</span>
          <span className="frame-date">NOV 19, 2026</span>
        </div>

        {stage > 1 && (
          <nav className="stage-progress" aria-label="Birthday experience progress">
            {stageLabels.map((label, index) => {
              const current = index + 1 === stage
              const completed = index + 1 < stage
              return (
                <div className={`progress-stop ${current ? 'is-current' : ''} ${completed ? 'is-complete' : ''}`} key={label} aria-current={current ? 'step' : undefined}>
                  <span className="progress-number">{completed ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : `0${index + 1}`}</span>
                  <span className="progress-label">{label}</span>
                </div>
              )
            })}
          </nav>
        )}

        {stage === 1 && (
          <section className="start-stage" aria-labelledby="start-title">
            <div className="start-doodle doodle-sun" aria-hidden="true">*</div>
            <div className="start-doodle doodle-heart" aria-hidden="true"><Heart size={19} /></div>
            <div className="start-window">
              <div className="window-bar"><span>hello_ademi.txt</span><span aria-hidden="true">▢ ×</span></div>
              <div className="start-window-content">
                <div className="birthday-stamp"><span>19</span><small>NOV</small></div>
                <p className="eyebrow"><span className="tiny-star">*</span> A NOTE TO MY FAVORITE HUMAN</p>
                <h1 id="start-title">A little<br /><em>birthday</em><br />magic.</h1>
                <p className="start-copy">Hey Ademi. Someone made a little corner of the internet just for you today.</p>
                <button className="pixel-button primary-button" type="button" onClick={openBirthday}>
                  <span>OPEN IT</span><ArrowRight size={16} aria-hidden="true" />
                </button>
                <span className="button-hint">NO PASSWORD NEEDED <Heart size={10} aria-hidden="true" /></span>
                <ul className="birthday-vitals" aria-label="Birthday day details">
                  <li><Heart size={14} aria-hidden="true" /><span><small>THE DATE</small><strong>NOV 19</strong></span></li>
                  <li><Sparkles size={14} aria-hidden="true" /><span><small>VIBE CHECK</small><strong>100% ADEMI</strong></span></li>
                  <li><Music2 size={14} aria-hidden="true" /><span><small>SOUNDTRACK</small><strong>READY TO PLAY</strong></span></li>
                </ul>
              </div>
            </div>
            <div className="start-footnote"><span className="pixel-flower-mini" aria-hidden="true">*</span> MADE WITH A LITTLE TOO MUCH HEART <span className="footnote-line" /></div>
          </section>
        )}

        {stage === 2 && (
          <section className="cake-stage stage-content" aria-labelledby="cake-title">
            <div className="section-heading">
              <span className="eyebrow"><span className="eyebrow-square" /> LEVEL 01 <span className="eyebrow-divider">/</span> YOUR WISH</span>
              <h1 id="cake-title">Birthday protocol:<br /><em>make a wish.</em></h1>
              <p>Five little flames, one very big year ahead. Blow gently or tap each candle.</p>
            </div>

            <div className="cake-panel pixel-border">
              <div className="cake-panel-top"><span>WISH.EXE</span><span className="cake-status"><i /> READY</span></div>
              <div className="cake-scene">
                <div className="cake-spark cake-spark-a" aria-hidden="true">*</div>
                <div className="cake-spark cake-spark-b" aria-hidden="true">*</div>
                <div className="cake-spark cake-spark-c" aria-hidden="true">*</div>
                <div className="cake">
                  <div className="candles-row">
                    {candlePositions.map((position, index) => {
                      const isOut = index < candlesOut
                      return (
                        <button className={`candle ${isOut ? 'is-out' : ''}`} key={position} style={{ left: `${position}%` }} type="button" disabled={isOut} onClick={blowOutCandle} aria-label={`Blow out candle ${index + 1}${isOut ? ', already out' : ''}`}>
                          {!isOut && <span className="candle-flame" aria-hidden="true"><i /></span>}
                          {isOut && <span className="candle-smoke" aria-hidden="true">·</span>}
                          <span className="candle-wick" aria-hidden="true" />
                          <span className="candle-stick" aria-hidden="true"><i /></span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="cake-top"><span className="cake-frosting" /><span className="cake-drip drip-one" /><span className="cake-drip drip-two" /><span className="cake-drip drip-three" /></div>
                  <div className="cake-layer cake-layer-top"><span className="cake-layer-line" /><span className="cake-sprinkle sprinkle-one" /><span className="cake-sprinkle sprinkle-two" /><span className="cake-sprinkle sprinkle-three" /></div>
                  <div className="cake-layer cake-layer-bottom"><span className="cake-layer-line" /><span className="cake-cherry" /></div>
                  <div className="cake-plate"><span /></div>
                </div>
                <div className="cake-shadow" aria-hidden="true" />
                {candlesOut === candlePositions.length && <div className="wish-banner" role="status">MAKE A WISH, ADEMI! <span>*</span></div>}
                {candlesOut === candlePositions.length && <div className="confetti" aria-hidden="true">{Array.from({ length: 30 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `-${(index % 17) / 8}s` }} />)}</div>}
              </div>
              <div className="cake-panel-bottom">
                <span className="mic-status"><span className={`mic-indicator ${micStatus}`} />{micStatus === 'listening' ? 'MIC LISTENING' : micStatus === 'fallback' ? 'TAP MODE' : 'SETTING UP MIC'}</span>
                <span className="candle-count">{String(candlesOut).padStart(2, '0')} <i>/</i> 05 OUT</span>
              </div>
            </div>
            <p className="mic-message" aria-live="polite">{micMessage || 'Allow microphone access for hands-free candle magic. Tap-to-blow always works too.'}</p>
            {candlesOut === candlePositions.length && <button className="pixel-button primary-button next-button" type="button" onClick={() => setStage(3)}>NEXT <ArrowRight size={16} aria-hidden="true" /></button>}
          </section>
        )}

        {stage === 3 && (
          <section className="flowers-stage stage-content" aria-labelledby="flowers-title">
            <div className="section-heading">
              <span className="eyebrow"><span className="eyebrow-square" /> LEVEL 02 <span className="eyebrow-divider">/</span> A BOUQUET FOR YOU</span>
              <h1 id="flowers-title">Picked just<br /><em>for you.</em></h1>
            </div>
            <div className="bouquet-card">
              <div className="bouquet-spark spark-left" aria-hidden="true">*</div>
              <div className="bouquet-spark spark-right" aria-hidden="true">*</div>
              <div className="bouquet-scene" role="img" aria-label="A hand-drawn pixel bouquet tied with a ribbon for Ademi">
                <div className="bouquet-stems"><i /><i /><i /><i /><i /><i /><i /><i /></div>
                <div className="flower flower-one"><i /><b /></div>
                <div className="flower flower-two"><i /><b /></div>
                <div className="flower flower-three"><i /><b /></div>
                <div className="flower flower-four"><i /><b /></div>
                <div className="flower flower-five"><i /><b /></div>
                <div className="flower flower-six"><i /><b /></div>
                <div className="flower flower-seven"><i /><b /></div>
                <div className="flower flower-eight"><i /><b /></div>
                <div className="leaf leaf-one" /><div className="leaf leaf-two" /><div className="leaf leaf-three" />
                <div className="bouquet-wrap"><span /><i /><i /></div>
                <div className="bouquet-ribbon">ADEMI</div>
              </div>
              <div className="bouquet-message">
                <span className="little-label">A LITTLE DELIVERY</span>
                <p>{bouquetCaption}</p>
              </div>
              <button className="pixel-button note-button" type="button" onClick={() => setNoteOpen(true)}><Mail size={15} aria-hidden="true" /> READ NOTE <span className="note-pulse" aria-hidden="true" /></button>
            </div>
            <span className="flower-footer">SOME THINGS BLOOM RIGHT ON TIME <span aria-hidden="true">*</span></span>
          </section>
        )}

        {stage === 3 && noteOpen && (
          <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNoteOpen(false) }}>
            <section className="note-modal pixel-border" role="dialog" aria-modal="true" aria-labelledby="note-title">
              <div className="window-bar"><span>for_ademi.note</span><button type="button" onClick={() => setNoteOpen(false)} aria-label="Close note">×</button></div>
              <div className="note-modal-content">
                <span className="note-seal" aria-hidden="true">*</span>
                <span className="eyebrow">A NOTE FROM ME TO YOU</span>
                <h2 id="note-title">Happy birthday,<br /><em>Ademi.</em></h2>
                <p>{noteMessage}</p>
                <figure className="note-flower">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/PHOTO-2026-11-18-16-32-46-XilKcpKPhOs96JoqMViL6IqyzgfnA1.jpg" alt="A pastel bouquet illustration tied with a ribbon bearing Ademi’s name." />
                  <figcaption>This is the actual flower connected to the meaning of your name, Ademi.</figcaption>
                </figure>
                <button className="pixel-button primary-button modal-next" type="button" onClick={openMixtape}>CLOSE &amp; CONTINUE <ArrowRight size={14} aria-hidden="true" /></button>
              </div>
            </section>
          </div>
        )}

        {stage === 4 && (
          <section className="mixtape-stage stage-content" aria-labelledby="mixtape-title">
            <div className="section-heading mixtape-heading">
              <span className="eyebrow"><span className="eyebrow-square" /> LEVEL 03 <span className="eyebrow-divider">/</span> SIDE A + SIDE B</span>
              <h1 id="mixtape-title">A little<br /><em>mixtape.</em></h1>
              <p className="mixtape-intro">A mix of your favorites and the songs I dedicate to you, because every single one of these reminds me of your energy, your resilience, and the person you’re becoming.</p>
            </div>

            <div className={`mixtape-deck pixel-border ${isBackgroundMusicPlaying || isTrackPlaying ? 'is-playing' : ''}`}>
              <div className="deck-topline"><span><Music2 size={13} aria-hidden="true" /> PLAYLIST_19.NOV</span><span>{totalTrackCount} TRACKS</span></div>
              <div className="cassette-display">
                <div className="cassette-label"><span>FOR ADEMI</span><span>SIDE A <i>*</i> SIDE B</span></div>
                <div className="cassette-reels" aria-hidden="true"><span><i /></span><b /><span><i /></span></div>
                <div className="cassette-tape-line" aria-hidden="true" />
              </div>
              <div className="deck-footer"><span>NOW PLAYING</span><span>{isBackgroundMusicPlaying ? 'SECRET DOOR · ARCTIC MONKEYS' : activeTrackId ? trackGroups.flatMap((group) => group.tracks).find((track) => track.id === activeTrackId)?.title ?? 'YOUR MIX' : 'PRESS PLAY TO BEGIN'}</span></div>
            </div>
            <audio ref={previewAudioRef} preload="none" onEnded={() => setIsTrackPlaying(false)} aria-label="Song preview audio player" />
            {catalogLoading && <p className="catalog-status" role="status">Loading album covers and previews…</p>}
            {catalogUnavailable && !catalogLoading && <p className="catalog-status" role="status">Some album covers are unavailable right now, but the mix is ready.</p>}

            <div className="track-groups">
              {trackGroups.map((group, groupIndex) => (
                <section className="artist-group" key={group.artist} aria-labelledby={`artist-${groupIndex}`}>
                  <div className="artist-heading">
                    <div><span className="artist-index">0{groupIndex + 1}</span><h2 id={`artist-${groupIndex}`}>{group.artist}</h2></div>
                    {group.featured && <span className="featured-badge">* {group.featured}</span>}
                  </div>
                  <div className="track-grid">
                    {group.tracks.map((track, trackIndex) => {
                      const isActive = activeTrackId === track.id
                      const isPlaying = isActive && isTrackPlaying
                      const isLoading = loadingTrackId === track.id
                      const artwork = artworkByTrack[track.id]
                      return (
                        <article className={`track-card ${track.featured ? 'track-featured' : ''} ${isPlaying ? 'is-playing' : ''}`} key={track.id}>
                          <div className={`album-art album-${track.color}`}>
                            {artwork ? <img src={artwork} alt={`${track.album} album artwork`} loading="lazy" /> : <div className="fallback-art" role="img" aria-label={`${track.album} album art placeholder`}><span>{track.artist.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><i>*</i><b>{String(trackIndex + 1).padStart(2, '0')}</b></div>}
                            <span className="album-playing-indicator" aria-hidden="true"><i /><i /><i /></span>
                            <span className="album-chip">{track.album}</span>
                          </div>
                          <div className="track-details">
                            <div className="track-title-row"><h3>{track.title}</h3>{track.featured && <span className="main-song">* MAIN SONG</span>}</div>
                            {track.featured && <p className="track-feature-note">{track.dedication}</p>}
                            <blockquote>{track.lyric}</blockquote>
                            {!track.featured && <p className="track-dedication">{track.dedication}</p>}
                            <button className={`play-button ${isPlaying ? 'is-playing' : ''}`} type="button" onClick={() => void toggleTrack(track)} disabled={isLoading} aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title} preview`}>
                              {isLoading ? <span className="loading-pixels" aria-hidden="true"><i /><i /><i /></span> : isPlaying ? <Pause size={13} fill="currentColor" aria-hidden="true" /> : <Play size={13} fill="currentColor" aria-hidden="true" />}
                              <span>{isLoading ? 'FINDING PREVIEW' : isPlaying ? 'PAUSE PREVIEW' : 'PLAY PREVIEW'}</span>
                            </button>
                            {trackError?.id === track.id && <p className="track-error" role="status">{trackError.message}</p>}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="mixtape-endcap">
              <span>THAT&apos;S YOUR MIX <Heart size={12} fill="currentColor" aria-hidden="true" /></span>
              <button className="pixel-button primary-button" type="button" onClick={finishMixtape}>READ YOUR FINAL MESSAGE <ArrowRight size={15} aria-hidden="true" /></button>
            </div>
          </section>
        )}

        {stage === 5 && (
          <section className="final-stage stage-content" aria-labelledby="final-title">
            <div className="section-heading final-heading">
              <span className="eyebrow"><span className="eyebrow-square" /> LEVEL 04 <span className="eyebrow-divider">/</span> ONE LAST THING</span>
              <h1 id="final-title">A note to<br /><em>keep.</em></h1>
            </div>
            <article className="letter-card">
              <div className="letter-top"><span>PERSONAL_NOTE.TXT</span><span><i className="letter-heart" /> OPEN WITH CARE</span></div>
              <div className="letter-paper">
                <div className="letter-hole" aria-hidden="true"><i /><i /><i /><i /><i /></div>
                <div className="letter-date">NOVEMBER 19 <span>*</span> YOUR BIRTHDAY</div>
                <div className="letter-copy">{finalMessage.split('\n\n').map((paragraph, index) => index === 0 ? <p className="letter-salutation" key={paragraph}>{paragraph}</p> : <p key={paragraph}>{paragraph}</p>)}</div>
                <div className="letter-signoff"><span>cheering for you, always</span><Heart size={18} aria-hidden="true" /></div>
                <div className="letter-doodle" aria-hidden="true">*</div>
              </div>
              <div className="letter-bottom"><span>KEEP THIS SOMEWHERE SOFT</span><Heart size={11} fill="currentColor" aria-hidden="true" /></div>
            </article>
            <div className="replay-row"><span>THE END (BUT YOU CAN COME BACK ANYTIME)</span><button className="pixel-button replay-button" type="button" onClick={replayFromStart}>↺ REPLAY FROM START</button></div>
            <p className="final-signature">BUILT FOR ADEMI <span>*</span> WITH ALL THE GOOD THINGS</p>
          </section>
        )}
      </div>

      <footer className="site-footer"><span>© YOUR BIRTHDAY, YOUR RULES</span><span>MADE WITH <Heart size={11} fill="currentColor" aria-hidden="true" /> FROM AFAR</span></footer>
    </main>
  )
}
