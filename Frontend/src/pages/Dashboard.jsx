import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Square, RotateCcw, Camera, User, Hash, Box, Package, Upload, Video, BarChart2, List, Activity, Maximize2, Settings2, Download } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { getSessions, uploadVideo, validateBatch, validateOperator, updateConfidence, togglePause, resetSession, getVideoDownloadUrl } from '../api'
import { FadeUp, ScalePop } from '../components/Motion'
import Tooltip from '../components/Tooltip'

const BATCH_RE = /^[A-Z][A-Z0-9]*-\d{3,}$/
const OPERATOR_RE = /^OP-\d{3,}$/

export default function Dashboard() {
  const navigate = useNavigate()
  const [batchId, setBatchId] = useState('')
  const [operatorId, setOperatorId] = useState('')
  const [source, setSource] = useState('camera')
  const [videoFile, setVideoFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [batchError, setBatchError] = useState('')
  const [batchChecking, setBatchChecking] = useState(false)
  const [operatorError, setOperatorError] = useState('')
  const [operatorChecking, setOperatorChecking] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Interactive mockup state
  const [confidence, setConfidence] = useState(35) // Default 35% to match backend
  const [isPaused, setIsPaused] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetNotification, setResetNotification] = useState(false)

  const imgRef = useRef(null)
  const batchDebounce = useRef(null)
  const operatorDebounce = useRef(null)

  const { status, count, error, start, stop, reset, setOnFrame, setOnSessionEnd } = useSession()

  const isIdle = status === 'idle'
  const isRunning = status === 'running'
  const isStopped = status === 'stopped'

  const fetchSessions = useCallback(() =>
    getSessions().then(({ data }) => setSessions(data)).catch(() => { }), [])

  useEffect(() => {
    setOnFrame((f) => { if (imgRef.current) imgRef.current.src = `data:image/jpeg;base64,${f}` })
    setOnSessionEnd(fetchSessions)
  }, [setOnFrame, setOnSessionEnd, fetchSessions])

  // Send confidence threshold to backend when it changes during a session
  useEffect(() => {
    if (isRunning) {
      // Debounce confidence updates
      const timer = setTimeout(async () => {
        try {
          await updateConfidence(confidence / 100)
          console.log('Confidence threshold updated to:', confidence)
        } catch (error) {
          console.error('Failed to update confidence:', error)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [confidence, isRunning])

  const handlePause = useCallback(async () => {
    try {
      const { data } = await togglePause()
      setIsPaused(data.paused)
    } catch (error) {
      console.error('Failed to toggle pause:', error)
    }
  }, [])

  const handleReset = useCallback(async () => {
    setIsResetting(true)
    try {
      await resetSession()
      // After reset, keep paused state so user can resume
      setIsPaused(true)
      // Show notification
      setResetNotification(true)
      setTimeout(() => setResetNotification(false), 3000)
    } catch (error) {
      console.error('Failed to reset:', error)
    } finally {
      setIsResetting(false)
    }
  }, [])

  // Auto-uppercase + debounced duplicate check for Batch ID
  const handleBatchChange = useCallback((raw) => {
    const val = raw.toUpperCase()
    setBatchId(val)
    setBatchError('')
    clearTimeout(batchDebounce.current)

    if (!val) return

    if (!BATCH_RE.test(val)) {
      setBatchError('Format: WORD-XXX (e.g. BATCH-001). Min 3 digits required.')
      return
    }

    // Check duplicate against backend
    setBatchChecking(true)
    batchDebounce.current = setTimeout(async () => {
      try {
        await validateBatch(val)
        setBatchError('')
      } catch (e) {
        setBatchError(e.response?.data?.error || 'Invalid batch ID')
      } finally {
        setBatchChecking(false)
      }
    }, 400)
  }, [])

  // Auto-uppercase + validation for Operator ID
  const handleOperatorChange = useCallback((raw) => {
    const val = raw.toUpperCase()
    setOperatorId(val)
    setOperatorError('')
    clearTimeout(operatorDebounce.current)

    if (!val) return

    // Only validate after user stops typing (debounced)
    setOperatorChecking(true)
    operatorDebounce.current = setTimeout(async () => {
      // Check format first
      if (!OPERATOR_RE.test(val)) {
        setOperatorError('Format: OP-XXX (e.g. OP-001). Min 3 digits required.')
        setOperatorChecking(false)
        return
      }

      // Validate format against backend
      try {
        await validateOperator(val)
        setOperatorError('')
      } catch (e) {
        setOperatorError(e.response?.data?.error || 'Invalid operator ID')
      } finally {
        setOperatorChecking(false)
      }
    }, 400)
  }, [])

  const batchValid = BATCH_RE.test(batchId) && !batchError && !batchChecking
  const operatorValid = OPERATOR_RE.test(operatorId) && !operatorError && !operatorChecking
  const canStart = batchValid && operatorValid && (source === 'camera' || videoFile)

  const handleStart = useCallback(async () => {
    if (source === 'video' && videoFile) {
      setUploading(true)
      setUploadError('')
      try {
        const { data } = await uploadVideo(videoFile)
        start({ batchId, operatorId, videoPath: data.path, confidence: confidence / 100 })
      } catch (e) {
        // Previously swallowed silently; show why the upload failed
        setUploadError(e.response?.data?.error || 'Video upload failed. Is the backend running?')
      } finally {
        setUploading(false)
      }
    } else {
      start({ batchId, operatorId, cameraIndex: 0, confidence: confidence / 100 })
    }
  }, [source, videoFile, batchId, operatorId, confidence, start])

  // ── STEP 1: Setup screen ──────────────────────────────────
  if (isIdle) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-transparent p-6 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">

        {/* Icon + title */}
        <FadeUp className="flex flex-col items-center gap-5 mb-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-sky-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-sky-400 to-sky-700 rounded-3xl flex items-center justify-center shadow-2xl border border-sky-400/30">
              <Package size={36} className="text-white drop-shadow-md" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight">Packing Session</h1>
            <p className="text-[15px] text-gray-400 mt-2 font-medium">Configure session details to activate AI monitoring</p>
          </div>
        </FadeUp>

        {/* Form card */}
        <div className="bg-gray-900/60 backdrop-blur-2xl border border-gray-800/80 shadow-[0_8px_40px_rgba(0,0,0,0.8)] rounded-[2rem] p-8 flex flex-col gap-6 relative overflow-hidden">
          {/* Subtle inside glow edge */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />

          <div className="flex flex-col gap-2 relative group">
            <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
              <Hash size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Batch ID
            </label>
            <div className="relative">
              <input
                autoFocus
                placeholder="e.g. BATCH-001"
                className={`w-full bg-gray-950/80 border rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 uppercase shadow-inner
                  ${batchError ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : batchValid && batchId ? 'border-green-500/30 focus:border-green-500 focus:ring-2 focus:ring-green-500/20' : 'border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'}`}
                value={batchId}
                onChange={e => handleBatchChange(e.target.value)}
              />
              {batchChecking && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-600 border-t-sky-500 rounded-full animate-spin" />
              )}
            </div>
            {batchError
              ? <p className="text-xs text-red-400 font-medium animate-in fade-in">{batchError}</p>
              : <p className="text-[11px] text-gray-500 font-medium tracking-wide">Uppercase only · format: WORD-NUMBER (e.g. BATCH-001)</p>
            }
          </div>

          <div className="flex flex-col gap-2 group">
            <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
              <User size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Operator ID
            </label>
            <div className="relative">
              <input
                placeholder="e.g. OP-001"
                className={`w-full bg-gray-950/80 border rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 uppercase shadow-inner
                  ${operatorError ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : operatorValid && operatorId ? 'border-green-500/30 focus:border-green-500 focus:ring-2 focus:ring-green-500/20' : 'border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'}`}
                value={operatorId}
                onChange={e => handleOperatorChange(e.target.value)}
              />
              {operatorChecking && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-600 border-t-sky-500 rounded-full animate-spin" />
              )}
            </div>
            {operatorError
              ? <p className="text-xs text-red-400 font-medium animate-in fade-in">{operatorError}</p>
              : <p className="text-[11px] text-gray-500 font-medium tracking-wide">Uppercase only · format: OP-XXX (e.g. OP-001, OP-123)</p>
            }
          </div>

          {/* Source toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase">Video Source</label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-gray-950/80 rounded-2xl border border-gray-800">
              <Tooltip label="Use live webcam feed">
                <button type="button" onClick={() => setSource('camera')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm w-full
                    ${source === 'camera' ? 'bg-sky-600 text-white shadow-sky-600/20 scale-[0.98]' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}>
                  <Camera size={16} /> Live Camera
                </button>
              </Tooltip>
              <Tooltip label="Upload a pre-recorded video">
                <button type="button" onClick={() => setSource('video')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm w-full
                    ${source === 'video' ? 'bg-sky-600 text-white shadow-sky-600/20 scale-[0.98]' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}>
                  <Video size={16} /> Upload Video
                </button>
              </Tooltip>
            </div>
          </div>

          {/* File picker */}
          {source === 'video' && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                <Upload size={13} className="text-gray-500" /> Video File
              </label>
              <label className="flex items-center gap-4 bg-gray-950/80 border-2 border-dashed border-gray-700 hover:border-sky-500/50 rounded-2xl px-5 py-4 cursor-pointer transition-all duration-300 hover:bg-sky-500/5 group">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                  <Upload size={18} className="text-gray-400 group-hover:text-sky-400 transition-colors" />
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-bold truncate transition-colors ${videoFile ? 'text-sky-400' : 'text-gray-300 group-hover:text-sky-300'}`}>
                    {videoFile ? videoFile.name : 'Click to browse'}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">MP4, AVI, MOV, WEBM</span>
                </div>
                <input type="file" accept=".mp4,.avi,.mov,.mkv,.webm" className="hidden"
                  onChange={e => setVideoFile(e.target.files[0] || null)} />
              </label>
            </div>
          )}

          <Tooltip label={!canStart ? 'Fill in all fields to start' : 'Start AI monitoring session'}>
            <button
              onClick={handleStart}
              disabled={!canStart || uploading}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-[15px] font-black tracking-wide shadow-lg shadow-sky-600/20 transition-all duration-300 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none">
              {uploading
                ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
                : <><Play size={18} fill="currentColor" /> START SESSION</>}
            </button>
          </Tooltip>

          {(error || uploadError) && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 animate-in fade-in">
              <p className="text-red-400 text-sm font-semibold text-center flex items-center justify-center gap-2"><Activity size={16} /> {error || uploadError}</p>
            </div>
          )}
        </div>

        {/* Recent sessions below form */}
        {sessions.length > 0 && (
          <ScalePop delay={0.2} className="mt-6 bg-gray-900/40 backdrop-blur-lg border border-gray-800/80 rounded-3xl p-6 flex flex-col gap-3 shadow-xl hover:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 flex items-center gap-2">
                <List size={14} /> Recent Sessions
              </p>
              <button onClick={fetchSessions} className="text-gray-500 hover:text-sky-400 transition-colors hover:rotate-180 duration-500 p-1">
                <RotateCcw size={14} />
              </button>
            </div>
            {sessions.slice(0, 4).map(s => (
              <div key={s._id} className="flex items-center justify-between text-sm border-t border-gray-800/50 pt-3 group">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{s.batch_id}</span>
                  <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded-md font-medium">{s.operator_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sky-400 font-extrabold tabular-nums bg-sky-400/10 px-2.5 py-0.5 rounded-lg border border-sky-400/20">{s.final_count ?? '—'} <span className="text-[10px] text-sky-500 uppercase tracking-widest">box</span></span>
                  {s.video_path && (
                    <Tooltip label="Download video">
                      <button onClick={() => window.open(getVideoDownloadUrl(s._id), '_blank')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-teal-700 border border-gray-700 hover:border-teal-600 text-gray-500 hover:text-teal-400 transition-colors">
                        <Download size={12} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </ScalePop>
        )}

      </div>
    </div>
  )

  // ── STEP 2: Live feed screen ──────────────────────────────
  if (isRunning) return (
    <div className="flex-1 flex flex-col bg-transparent p-4 lg:p-6 lg:px-8 gap-6 min-h-0 overflow-y-auto w-full animate-in fade-in duration-700 relative">
      {/* Background glow for Live Layout */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-sky-600/[0.08] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-indigo-600/[0.06] blur-[100px] pointer-events-none" />

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 max-w-[1920px] mx-auto w-full flex-1 z-10">

        {/* --- LEFT COLUMN --- */}
        <div className="flex flex-col gap-6 w-full">

          {/* Live Feed Container */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800/70 shadow-[0_8px_40px_rgba(0,0,0,0.5)] rounded-[2rem] flex flex-col overflow-hidden w-full relative group hover:border-gray-700/70 transition-all duration-500">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 z-10 bg-gray-900/60 relative">
              <div className="flex items-center gap-3 text-sm text-sky-400 font-bold tracking-wide">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-3 h-3 bg-sky-500 rounded-full animate-ping opacity-75" />
                  <span className="relative w-2 h-2 bg-sky-400 rounded-full" />
                </div>
                <Video size={18} />
                <span className="text-white">Live Feed</span>
                <span className="text-gray-500">—</span>
                <span className="text-gray-400 text-xs">{source === 'camera' ? 'Warehouse Cam 01' : 'Video Upload'}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 font-bold tracking-wider relative">
                <span className="font-mono bg-gray-950/60 px-3 py-1.5 rounded-lg border border-gray-800/60">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <Maximize2 size={16} className="cursor-pointer text-gray-500 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95" />
              </div>
            </div>

            {/* Feed Area */}
            <div className="aspect-video bg-[#02040a] w-full rounded-b-[2rem] relative flex items-center justify-center overflow-hidden border-t border-gray-800/60 shadow-inner">

              <img ref={imgRef} className="absolute inset-0 w-full h-full object-cover bg-transparent z-0 transition-opacity duration-500" alt="live-feed" />

              {/* REC Badge */}
              <div className="absolute top-5 left-5 flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/60 backdrop-blur-lg border border-red-500/30 z-20 shadow-xl shadow-black/50 animate-in fade-in zoom-in">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <span className="text-[11px] font-black text-white tracking-[0.2em] leading-none mt-0.5">REC</span>
              </div>

              {/* Box Count Overlay */}
              <div className="absolute top-5 right-5 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur-lg border border-amber-500/40 z-20 shadow-xl">
                <Box size={16} className="text-amber-400" />
                <span className="text-2xl font-black text-amber-400 tabular-nums">{count}</span>
              </div>
            </div>
          </div>

          {/* Boxes Detected Widget (Enhanced UI) */}
          <div className="bg-gray-900/60 backdrop-blur-2xl border border-sky-500/30 shadow-[0_0_50px_-12px_rgba(14,165,233,0.3)] rounded-[2rem] p-8 flex flex-col gap-4 w-full relative overflow-hidden group transition-all duration-700 hover:shadow-[0_0_60px_-10px_rgba(14,165,233,0.4)]">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10 opacity-50 pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse duration-1000" />

            <div className="flex items-center justify-between w-full relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-400/30 shadow-[inset_0_0_20px_rgba(14,165,233,0.2)]">
                  <Box size={28} strokeWidth={2.5} className="text-sky-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                </div>
                <span className="text-xl font-bold text-white tracking-widest uppercase">Verified Count</span>
              </div>
              <div className="flex items-center gap-2 bg-sky-950/80 text-sky-400 border border-sky-500/40 px-4 py-2 rounded-full text-xs font-black tracking-[0.2em] shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_10px_rgba(14,165,233,1)]" /> ACTIVE
              </div>
            </div>

            <div className="flex items-baseline gap-5 mt-4 w-full relative z-10 pt-4">
              <span key={count} className="text-8xl sm:text-[140px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-sky-100 to-sky-300 leading-none tabular-nums tracking-tighter drop-shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-2">
                {count}
              </span>
              <span className="text-2xl text-sky-400 font-black tracking-widest uppercase opacity-90 drop-shadow-[0_2px_10px_rgba(14,165,233,0.5)]">boxes</span>
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-400 font-medium flex items-center gap-2 bg-red-400/10 w-max px-4 py-2.5 rounded-xl border border-red-400/20 shadow-inner animate-in fade-in">
                <Activity size={16} /> {error}
              </div>
            )}
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="flex flex-col gap-6 w-full">

          {/* Dashboard Control Panel */}
          <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-800/80 hover:border-sky-500/30 transition-colors duration-500 rounded-[2rem] p-7 flex flex-col gap-6 w-full relative overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-gray-300 tracking-[0.2em] uppercase flex items-center gap-2">
                <Settings2 size={16} className="text-sky-400" />
                Session Control
              </h3>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-bold tracking-widest uppercase shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> Running
              </span>
            </div>

            {/* Input Displays */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase flex items-center gap-1.5"><Hash size={12} /> Batch ID</label>
                <div className="w-full bg-gray-950/80 border border-gray-800/80 rounded-xl px-4 py-3 text-[15px] text-gray-300 font-extrabold uppercase shadow-inner">
                  {batchId}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase flex items-center gap-1.5"><User size={12} /> Operator ID</label>
                <div className="w-full bg-gray-950/80 border border-gray-800/80 rounded-xl px-4 py-3 text-[15px] text-gray-300 font-extrabold shadow-inner">
                  {operatorId}
                </div>
              </div>

              <button
                onClick={stop}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-900/40 to-red-800/40 hover:from-red-800/60 hover:to-red-700/60 border border-red-700/60 hover:border-red-600/80 text-red-400 hover:text-red-300 py-4 rounded-xl text-[15px] font-black tracking-wide transition-all duration-300 shadow-lg shadow-red-900/20 hover:shadow-red-800/30 hover:-translate-y-0.5 active:translate-y-0.5 group">
                <Square size={16} fill="currentColor" strokeWidth={0} className="group-hover:scale-110 transition-transform" /> STOP SESSION
              </button>

              {/* Pause and Reset buttons */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  onClick={handlePause}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 shadow-md ${isPaused
                      ? 'bg-green-600/30 border-2 border-green-500/70 text-green-300 hover:bg-green-600/50 shadow-green-500/20'
                      : 'bg-gray-800/80 border border-gray-700 text-gray-300 hover:bg-gray-700/80 hover:border-gray-600'
                    }`}>
                  {isPaused ? <Play size={15} fill="currentColor" /> : <Square size={15} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="flex items-center justify-center gap-2 bg-gray-800/80 hover:bg-red-900/40 border border-gray-700 hover:border-red-700/60 text-gray-400 hover:text-red-400 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50 shadow-md">
                  {isResetting ? (
                    <span className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                  ) : (
                    <RotateCcw size={15} />
                  )}
                  Reset
                </button>
              </div>

              {/* Reset Notification */}
              {resetNotification && (
                <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 animate-in fade-in slide-in-from-top-2 shadow-lg shadow-sky-500/10">
                  <p className="text-sky-400 text-sm font-semibold text-center flex items-center justify-center gap-2">
                    <RotateCcw size={16} /> Count reset - Press Resume to continue
                  </p>
                </div>
              )}
            </div>

            {/* Interactive Toggles & Sliders */}
            <div className="flex flex-col gap-6 border-t border-gray-800/80 pt-6">

              {/* Confidence Slider */}
              <div className="flex flex-col gap-3 group">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 transition-colors group-hover:text-gray-300">
                  <div className="flex items-center gap-2 uppercase tracking-wide">
                    <Activity size={15} className="text-sky-400" /> Confidence Threshold
                  </div>
                  <div className="flex items-center gap-1 bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-lg text-sky-400 font-black text-sm shadow-inner tracking-wider">
                    {confidence}%
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer outline-none transition-all duration-300 hover:h-2.5 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] focus:ring-2 focus:ring-sky-500/40"
                  style={{ accentColor: '#0ea5e9' }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )

  // ── STEP 3: Session ended screen ──────────────────────────
  if (isStopped) return (
    <div className="flex-1 flex items-center justify-center bg-transparent p-6 relative overflow-hidden">
      {/* Background glowing rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none duration-1000 animate-pulse" />

      <div className="w-full max-w-md flex flex-col items-center gap-8 relative z-10 animate-in fade-in zoom-in-95 duration-700 ease-out">

        <div className="relative group">
          <div className="absolute inset-0 bg-sky-500 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/80 rounded-[2rem] flex items-center justify-center shadow-2xl">
            <Box size={40} className="text-sky-400 drop-shadow-md" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight">Session Complete</h2>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs tracking-widest uppercase text-gray-400 font-bold bg-gray-900/60 backdrop-blur-md py-2 px-5 rounded-full border border-gray-800/80 shadow-inner inline-flex">
            <span className="text-gray-300">{batchId}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <span className="text-gray-300">{operatorId}</span>
          </div>
        </div>

        {/* Final count */}
        <div className="bg-gray-900/60 backdrop-blur-2xl border border-gray-800/80 shadow-[0_8px_40px_rgba(2,132,199,0.15)] rounded-[2.5rem] p-10 flex flex-col items-center gap-2 w-full relative overflow-hidden group hover:border-sky-900/50 transition-colors">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-60" />

          <p className="text-[11px] text-sky-500 font-black uppercase tracking-[0.3em] mb-2">Final Count</p>
          <span className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 tabular-nums tracking-tighter leading-none pb-2 drop-shadow-md group-hover:scale-105 transition-transform duration-500">{count}</span>
          <p className="text-[13px] text-gray-500 font-bold tracking-wide mt-3 uppercase">Verified Boxes Detected</p>
        </div>

        <button onClick={reset}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white py-4.5 rounded-2xl text-[15px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(2,132,199,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(2,132,199,0.5)] hover:-translate-y-1 active:translate-y-0.5">
          <RotateCcw size={18} strokeWidth={2.5} /> Start New Session
        </button>

        <div className="grid grid-cols-2 gap-4 w-full">
          <button onClick={() => navigate('/sessions')}
            className="flex items-center justify-center gap-2 bg-gray-900/80 backdrop-blur-md hover:bg-gray-800/80 border border-gray-800 hover:border-gray-700 text-gray-300 py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/20 group">
            <List size={16} className="text-gray-500 group-hover:text-gray-300 transition-colors" /> Details
          </button>
          <button onClick={() => navigate('/stats')}
            className="flex items-center justify-center gap-2 bg-gray-900/80 backdrop-blur-md hover:bg-gray-800/80 border border-gray-800 hover:border-gray-700 text-gray-300 py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/20 group">
            <BarChart2 size={16} className="text-gray-500 group-hover:text-gray-300 transition-colors" /> Analytics
          </button>
        </div>

      </div>
    </div>
  )
}
