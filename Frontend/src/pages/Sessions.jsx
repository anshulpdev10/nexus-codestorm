import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSessions, getVideoUrl, getUploadUrl, getVideoDownloadUrl, downloadChallan, deleteSession } from '../api'
import {
  ClipboardList, Play, X, RefreshCw, Box, Clock,
  Camera, Upload, Film, AlertCircle, Search,
  FileText, Hash, Filter, CheckCircle, Activity,
  Download, Eye, Trash2, Pencil, ChevronDown, ChevronUp, QrCode
} from 'lucide-react'
import { FadeUp, ScalePop, StaggerList, StaggerItem, HoverCard } from '../components/Motion'
import Tooltip from '../components/Tooltip'

// ── Video Modal ───────────────────────────────────────────────
function VideoModal({ session, type, onClose }) {
  const [speed, setSpeed] = useState(1)
  const [activeSrc, setActiveSrc] = useState(
    type === 'upload' ? getUploadUrl(session._id, 1) : getVideoUrl(session._id, 1)
  )

  const changeSpeed = (s) => {
    // Briefly null out src to force browser to close the MJPEG connection,
    // then set the new URL — otherwise the stream keeps running at old speed
    setActiveSrc(null)
    setSpeed(s)
    setTimeout(() => {
      const newSrc = type === 'upload' ? getUploadUrl(session._id, s) : getVideoUrl(session._id, s)
      setActiveSrc(newSrc)
    }, 80)
  }

  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const SPEEDS = [0.5, 1, 1.5, 2]

  return (
    <div onClick={onBackdrop}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-950 border border-sky-800 rounded-lg flex items-center justify-center">
              <Film size={14} className="text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {type === 'upload' ? 'Source Video' : 'Session Recording'}
              </p>
              <p className="text-xs text-gray-500">{session.batch_id} · {session.operator_id}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* MJPEG stream */}
        <div className="bg-black flex items-center justify-center" style={{ minHeight: '360px' }}>
          {activeSrc ? (
            <img
              key={activeSrc}
              src={activeSrc}
              alt="Session playback"
              className="w-full max-h-[60vh] object-contain"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling?.style && (e.target.nextSibling.style.display = 'flex')
              }}
            />
          ) : (
            <div className="flex items-center justify-center py-16">
              <span className="w-6 h-6 border-2 border-gray-700 border-t-sky-500 rounded-full animate-spin" />
            </div>
          )}
          <div className="hidden items-center justify-center py-16 flex-col gap-3 text-gray-500">
            <Film size={32} />
            <p className="text-sm">Could not load video stream.</p>
            <p className="text-xs text-gray-600">Make sure the backend is running on port 5000.</p>
          </div>
        </div>

        {/* Footer: meta + speed controls */}
        <div className="px-5 py-3 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-800">
          <span className="flex items-center gap-1.5">
            <Box size={11} className="text-sky-400" />
            <span className="text-white font-semibold">{session.final_count ?? '—'}</span> boxes
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={11} />
            {session.started_at
              ? new Date(session.started_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
              : '—'}
          </span>

          {/* Speed selector */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-gray-600 text-xs">Speed</span>
            <div className="flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-lg p-0.5">
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    speed === s
                      ? 'bg-sky-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
            session.source_type === 'upload'
              ? 'bg-purple-950 text-purple-400 border border-purple-800'
              : 'bg-sky-950 text-sky-400 border border-sky-800'
          }`}>
            {session.source_type === 'upload' ? <Upload size={9} /> : <Camera size={9} />}
            {session.source_type === 'upload' ? 'Upload' : 'Live'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Challan Preview Modal ─────────────────────────────────────
function ChallanModal({ session, onClose }) {
  const [pdfUrl, setPdfUrl]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const defaultName = `${session.batch_id}_${session.operator_id}_challan`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
  const [fileName, setFileName] = useState(defaultName)

  // Keep the blob URL in a ref so the cleanup sees the latest value
  // (the closure over the `pdfUrl` state would always be null here).
  const pdfUrlRef = useRef(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading state before fetch
    setLoading(true)
    setError(false)
    downloadChallan(session._id)
      .then(({ data }) => {
        const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
        pdfUrlRef.current = url
        setPdfUrl(url)
      })
      .catch((err) => {
        console.error('Challan generation error:', err)
        setError(true)
      })
      .finally(() => setLoading(false))

    // Cleanup: revoke the blob URL when the session changes or the modal closes
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current)
        pdfUrlRef.current = null
      }
    }
  }, [session._id])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  const handleDownload = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${fileName || defaultName}.pdf`
    a.click()
  }

  const dur = (() => {
    if (!session.started_at || !session.ended_at) return null
    const secs = Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 1000)
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`
  })()

  return (
    <div onClick={onBackdrop}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col"
        style={{ height: '96vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-950 border border-indigo-800 rounded-xl flex items-center justify-center">
              <FileText size={15} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Challan Preview</p>
              <p className="text-xs text-gray-500">{session.batch_id} · {session.operator_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Editable filename */}
            <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5">
              <Pencil size={10} className="text-gray-500 shrink-0" />
              <input
                value={fileName}
                onChange={e => setFileName(e.target.value.replace(/[^a-zA-Z0-9_\-\s]/g, ''))}
                className="bg-transparent text-xs text-gray-200 outline-none w-44 placeholder:text-gray-600"
                placeholder="filename"
              />
              <span className="text-xs text-gray-600 shrink-0">.pdf</span>
            </div>
            <button onClick={handleDownload} disabled={!pdfUrl}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-colors font-medium">
              <Download size={12} /> Download
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Session summary strip */}
        <div className="grid grid-cols-4 gap-px bg-gray-800 border-b border-gray-800 shrink-0">
          {[
            { label: 'Boxes',    value: session.final_count ?? '—', color: 'text-sky-400' },
            { label: 'Duration', value: dur ?? '—',                  color: 'text-indigo-400' },
            { label: 'Source',   value: session.source_type === 'upload' ? 'Upload' : 'Live', color: 'text-purple-400' },
            { label: 'Status',   value: session.status,              color: session.status === 'completed' ? 'text-green-400' : 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 px-4 py-2.5 text-center">
              <p className={`text-base font-black tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* PDF viewer */}
        <div className="flex-1 bg-gray-950 overflow-hidden rounded-b-2xl" style={{ minHeight: 0 }}>
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
              <span className="w-6 h-6 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm">Generating challan...</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <AlertCircle size={28} className="text-red-500" />
              <p className="text-sm text-gray-400">Failed to generate challan.</p>
            </div>
          )}
          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-b-2xl"
              style={{ minHeight: 0, border: 'none' }}
              title="Challan PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Session Detail Modal (QR deep-link) ──────────────────────
function SessionDetailModal({ session, onClose, onChallan, onVideo }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  const dur = (() => {
    if (!session.started_at || !session.ended_at) return '—'
    const secs = Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 1000)
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`
  })()

  const fmt = (iso) => iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—'

  const fields = [
    { label: 'Session ID',  value: session._id,                                          mono: true },
    { label: 'Batch ID',    value: session.batch_id },
    { label: 'Operator',    value: session.operator_id },
    { label: 'Started',     value: fmt(session.started_at) },
    { label: 'Ended',       value: fmt(session.ended_at) },
    { label: 'Duration',    value: dur },
    { label: 'Final Count', value: `${session.final_count ?? '—'} boxes` },
    { label: 'Source',      value: session.source_type === 'upload' ? 'Uploaded Video' : 'Live Camera' },
    { label: 'Status',      value: session.status?.toUpperCase() },
  ]

  return (
    <div onClick={onBackdrop}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-950 border border-sky-800 rounded-xl flex items-center justify-center">
              <QrCode size={15} className="text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Session Details</p>
              <p className="text-xs text-gray-500">Opened via QR code scan</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Metric strip */}
        <div className="grid grid-cols-3 gap-px bg-gray-800">
          {[
            { label: 'Boxes',    value: session.final_count ?? '—', color: 'text-sky-400' },
            { label: 'Duration', value: dur,                         color: 'text-indigo-400' },
            { label: 'Status',   value: session.status,              color: session.status === 'completed' ? 'text-green-400' : 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 py-3 text-center">
              <p className={`text-lg font-black tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Fields */}
        <div className="flex flex-col divide-y divide-gray-800 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {fields.map(({ label, value, mono }) => (
            <div key={label} className="flex items-start gap-4 px-5 py-3">
              <span className="text-xs text-gray-500 w-28 shrink-0 pt-0.5">{label}</span>
              <span className={`text-xs font-semibold text-white break-all ${mono ? 'font-mono text-sky-300' : ''}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-800">
          {session.status === 'completed' && (
            <button onClick={() => { onClose(); onChallan(session) }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-2.5 rounded-xl transition-colors font-medium">
              <Eye size={12} /> View Challan
            </button>
          )}
          {session.video_path && (
            <button onClick={() => { onClose(); onVideo(session, 'recording') }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-2.5 rounded-xl transition-colors font-medium">
              <Play size={12} fill="white" /> Watch Recording
            </button>
          )}
          {session.source_type === 'upload' && session.upload_path && (
            <button onClick={() => { onClose(); onVideo(session, 'upload') }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-2.5 rounded-xl transition-colors font-medium">
              <Upload size={12} /> Source Video
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = 'sky' }) {
  const colors = {
    sky:    { bg: 'bg-sky-950',    border: 'border-sky-900',    icon: 'text-sky-400',    val: 'text-sky-400' },
    green:  { bg: 'bg-green-950',  border: 'border-green-900',  icon: 'text-green-400',  val: 'text-green-400' },
    purple: { bg: 'bg-purple-950', border: 'border-purple-900', icon: 'text-purple-400', val: 'text-purple-400' },
    amber:  { bg: 'bg-amber-950',  border: 'border-amber-900',  icon: 'text-amber-400',  val: 'text-amber-400' },
  }
  const c = colors[accent]
  return (
    <ScalePop>
      <HoverCard className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 flex items-center gap-3 h-full">
        <div className={`w-8 h-8 shrink-0 ${c.bg} border ${c.border} rounded-lg flex items-center justify-center`}>
          <Icon size={14} className={c.icon} />
        </div>
        <div className="min-w-0">
          <p className={`text-xl font-black tabular-nums leading-none ${c.val}`}>{value}</p>
          <p className="text-xs font-semibold text-white mt-0.5 leading-none">{label}</p>
          {sub && <p className="text-[10px] text-gray-600 mt-0.5 truncate">{sub}</p>}
        </div>
      </HoverCard>
    </ScalePop>
  )
}

// ── Filter Pill ───────────────────────────────────────────────
function FilterPill({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-900 border border-gray-800 rounded-xl p-1">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            value === o.value
              ? 'bg-gray-700 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}>{o.label}</button>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function Sessions() {
  const [searchParams] = useSearchParams()
  const [sessions, setSessions]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [fetchError, setFetchError]         = useState(false)
  const [modal, setModal]                   = useState(null)
  const [challanSession, setChallanSession] = useState(null)
  const [deepSession, setDeepSession]       = useState(null)
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [filterSource, setFilterSource]     = useState('all')
  const [deleteId, setDeleteId]             = useState(null)
  const [deleting, setDeleting]             = useState(null)
  const [expandedId, setExpandedId]         = useState(null)
  const highlightId = searchParams.get('id')
  const cardRefs = useRef({})

  const load = () => {
    setLoading(true)
    setFetchError(false)
    getSessions()
      .then(({ data }) => {
        setSessions(data)
        // If QR deep-link: find the session and open detail modal
        if (highlightId) {
          const found = data.find(s => s._id === highlightId)
          if (found) setDeepSession(found)
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  // Scroll highlighted card into view after sessions load
  useEffect(() => {
    if (highlightId && cardRefs.current[highlightId]) {
      setTimeout(() => {
        cardRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [sessions, highlightId])

  const stats = useMemo(() => {
    const completed = sessions.filter(s => s.status === 'completed')
    const totalBoxes = completed.reduce((sum, s) => sum + (s.final_count || 0), 0)
    const avg = completed.length ? Math.round(totalBoxes / completed.length) : 0
    const liveCount = sessions.filter(s => s.source_type === 'live').length
    return { total: sessions.length, completed: completed.length, totalBoxes, avg, liveCount }
  }, [sessions])

  const filtered = useMemo(() => sessions.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.batch_id?.toLowerCase().includes(q) || s.operator_id?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    const matchSource = filterSource === 'all' || s.source_type === filterSource
    return matchSearch && matchStatus && matchSource
  }), [sessions, search, filterStatus, filterSource])

  const fmt = (iso) => iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—'

  const duration = (s) => {
    if (!s.started_at || !s.ended_at) return null
    const secs = Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 1000)
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`
  }

  const filtersActive = filterStatus !== 'all' || filterSource !== 'all' || search

  const handleDelete = async (id) => {
    setDeleting(id); setDeleteId(null)
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s._id !== id))
    } catch {
      alert('Failed to delete session.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      {modal && <VideoModal session={modal.session} type={modal.type} onClose={() => setModal(null)} />}
      {challanSession && <ChallanModal session={challanSession} onClose={() => setChallanSession(null)} />}
      {deepSession && (
        <SessionDetailModal
          session={deepSession}
          onClose={() => setDeepSession(null)}
          onChallan={(s) => setChallanSession(s)}
          onVideo={(s, t) => setModal({ session: s, type: t })}
        />
      )}

      {/* ── Delete confirm dialog ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-10 h-10 bg-red-950 border border-red-800 rounded-xl flex items-center justify-center mb-4">
              <Trash2 size={16} className="text-red-400" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Delete this session?</p>
            <p className="text-xs text-gray-500 mb-5">
              This will permanently remove the session, all detection logs, the recording, and the challan PDF from the server. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-xl border border-gray-700 transition-colors font-medium">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 text-xs bg-red-700 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl transition-colors font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">

        {/* ── Page header ── */}
        <FadeUp className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold text-white">Sessions</h1>
            <p className="text-xs text-gray-500 mt-0.5">All packing sessions recorded by the system</p>
          </div>
          <Tooltip label="Refresh sessions">
            <button onClick={load}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-xl transition-colors">
              <RefreshCw size={11} /> Refresh
            </button>
          </Tooltip>
        </FadeUp>

        {/* ── Stat cards ── */}
        {!loading && !fetchError && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard icon={Hash}        label="Total Sessions"  value={stats.total}      sub="all time"                              accent="sky" />
            <StatCard icon={Box}         label="Boxes Detected"  value={stats.totalBoxes} sub="across completed sessions"             accent="purple" />
            <StatCard icon={CheckCircle} label="Completed"       value={stats.completed}  sub={`${stats.total - stats.completed} still active`} accent="green" />
            <StatCard icon={Activity}    label="Avg Box Count"   value={stats.avg}        sub="per completed session"                 accent="amber" />
          </div>
        )}

        {/* ── Search + filter bar ── */}
        {!loading && !fetchError && sessions.length > 0 && (
          <FadeUp delay={0.05} className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex-1 min-w-48 relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by batch ID or operator..."
                className="w-full bg-gray-900 border border-gray-800 focus:border-sky-600 rounded-xl pl-8 pr-4 py-2 text-xs text-gray-100 outline-none transition-colors placeholder:text-gray-600"
              />
            </div>
            <FilterPill
              value={filterStatus}
              onChange={setFilterStatus}
              options={[{ value: 'all', label: 'All' }, { value: 'completed', label: 'Completed' }, { value: 'active', label: 'Active' }]}
            />
            <FilterPill
              value={filterSource}
              onChange={setFilterSource}
              options={[{ value: 'all', label: 'All' }, { value: 'live', label: 'Live' }, { value: 'upload', label: 'Upload' }]}
            />
            {filtersActive && (
              <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterSource('all') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 transition-colors">
                <X size={11} /> Clear
              </button>
            )}
            <span className="text-xs text-gray-600 ml-auto">{filtered.length} of {sessions.length}</span>
          </FadeUp>
        )}

        {/* ── States ── */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-2 text-gray-600 text-sm">
            <span className="w-4 h-4 border-2 border-gray-700 border-t-sky-500 rounded-full animate-spin" />
            Loading sessions...
          </div>
        )}

        {!loading && fetchError && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 bg-red-950 border border-red-800 rounded-2xl flex items-center justify-center">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <p className="text-sm text-gray-400">Backend not reachable on port 5000</p>
            <button onClick={load}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 transition-colors">
              Retry
            </button>
          </div>
        )}

        {!loading && !fetchError && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center">
              <ClipboardList size={20} className="text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No sessions yet. Start one from the Dashboard.</p>
          </div>
        )}

        {!loading && !fetchError && sessions.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Filter size={24} className="text-gray-700" />
            <p className="text-sm text-gray-500">No sessions match your filters.</p>
            <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterSource('all') }}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
              Clear filters
            </button>
          </div>
        )}

        {/* ── Session cards ── */}
        {!loading && !fetchError && filtered.length > 0 && (
          <StaggerList className="flex flex-col gap-2">
            {filtered.map(s => {
              const isExpanded = expandedId === s._id
              const dur = duration(s)
              return (
                <StaggerItem key={s._id}>
                <div
                  ref={el => cardRefs.current[s._id] = el}
                  className={`bg-gray-900 border rounded-2xl transition-all ${
                    highlightId === s._id
                      ? 'border-sky-500 ring-2 ring-sky-500/30'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}>

                  {/* ── Collapsed row (always visible) ── */}
                  <HoverCard>
                  <div
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
                    onClick={() => setExpandedId(isExpanded ? null : s._id)}>

                    {/* Count badge */}
                    <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-xl flex flex-col items-center justify-center shrink-0">
                      <Box size={10} className="text-sky-500 mb-0.5" />
                      <span className="text-lg font-black text-sky-400 tabular-nums leading-none">
                        {s.final_count ?? '—'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-white">{s.batch_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.status === 'completed'
                            ? 'bg-green-950 text-green-400 border border-green-800'
                            : 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                        }`}>{s.status}</span>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.source_type === 'upload'
                            ? 'bg-purple-950 text-purple-400 border border-purple-800'
                            : 'bg-sky-950 text-sky-400 border border-sky-800'
                        }`}>
                          {s.source_type === 'upload' ? <Upload size={9} /> : <Camera size={9} />}
                          {s.source_type === 'upload' ? 'Upload' : 'Live'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Operator: <span className="text-gray-300">{s.operator_id}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1"><Clock size={10} /> {fmt(s.started_at)}</span>
                        {dur && <span>· {dur}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {s.status === 'completed' && (
                        <Tooltip label="View challan PDF">
                          <button onClick={() => setChallanSession(s)}
                            className="flex items-center gap-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 border border-indigo-600 text-white px-2.5 py-1.5 rounded-xl transition-colors font-medium">
                            <Eye size={11} /> Challan
                          </button>
                        </Tooltip>
                      )}
                      {s.video_path ? (
                        <>
                          <Tooltip label="Watch session recording">
                            <button onClick={() => setModal({ session: s, type: 'recording' })}
                              className="flex items-center gap-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1.5 rounded-xl transition-colors font-medium">
                              <Play size={11} fill="white" /> Recording
                            </button>
                          </Tooltip>
                          <Tooltip label="Download video file">
                            <button onClick={() => window.open(getVideoDownloadUrl(s._id), '_blank')}
                              className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-teal-700 border border-teal-600 text-teal-400 hover:text-white px-2.5 py-1.5 rounded-xl transition-colors font-medium">
                              <Download size={11} /> Video
                            </button>
                          </Tooltip>
                        </>
                      ) : (
                        <span className="text-xs text-gray-700">No recording</span>
                      )}
                      {s.source_type === 'upload' && s.upload_path && (
                        <Tooltip label="Play source video">
                          <button onClick={() => setModal({ session: s, type: 'upload' })}
                            className="flex items-center gap-1.5 text-xs bg-purple-700 hover:bg-purple-600 text-white px-2.5 py-1.5 rounded-xl transition-colors font-medium">
                            <Upload size={11} /> Source
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip label="Delete session">
                        <button
                          onClick={() => setDeleteId(s._id)}
                          disabled={deleting === s._id}
                          className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-red-950 hover:border-red-800 border border-gray-700 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40">
                          {deleting === s._id
                            ? <span className="w-3 h-3 border border-gray-600 border-t-red-400 rounded-full animate-spin" />
                            : <Trash2 size={11} />}
                        </button>
                      </Tooltip>
                    </div>

                    {/* Expand chevron */}
                    <div className="text-gray-600 shrink-0">
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </div>
                  </div>
                  </HoverCard>

                  {/* ── Expanded detail panel ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 bg-gray-950/50 px-5 py-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Key metrics strip */}
                      <div className="grid grid-cols-4 gap-3 mb-5">
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <Box size={12} className="text-sky-400" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Boxes</span>
                          </div>
                          <p className="text-2xl font-black text-sky-400 tabular-nums">{s.final_count ?? '—'}</p>
                        </div>
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <Clock size={12} className="text-indigo-400" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</span>
                          </div>
                          <p className="text-2xl font-black text-indigo-400 tabular-nums">{dur ?? '—'}</p>
                        </div>
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <Activity size={12} className={s.status === 'completed' ? 'text-green-400' : 'text-yellow-400'} />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
                          </div>
                          <p className={`text-sm font-black uppercase tracking-wide ${s.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {s.status}
                          </p>
                        </div>
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            {s.source_type === 'upload' ? <Upload size={12} className="text-purple-400" /> : <Camera size={12} className="text-sky-400" />}
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Source</span>
                          </div>
                          <p className={`text-sm font-black uppercase tracking-wide ${s.source_type === 'upload' ? 'text-purple-400' : 'text-sky-400'}`}>
                            {s.source_type === 'upload' ? 'Upload' : 'Live'}
                          </p>
                        </div>
                      </div>

                      {/* Detailed info grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { label: 'Session ID', value: s._id, icon: Hash, mono: true },
                          { label: 'Batch ID', value: s.batch_id, icon: Hash },
                          { label: 'Operator ID', value: s.operator_id, icon: Activity },
                          { label: 'Recording Available', value: s.video_path ? 'Yes' : 'No', icon: Film },
                          { label: 'Started At', value: fmt(s.started_at), icon: Clock },
                          { label: 'Ended At', value: fmt(s.ended_at), icon: Clock },
                        ].map(({ label, value, icon: Icon, mono }) => (
                          <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 flex items-start gap-3 hover:border-gray-700 transition-colors">
                            <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                              <Icon size={13} className="text-gray-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                              <p className={`text-xs font-semibold text-white break-all leading-relaxed ${mono ? 'font-mono text-sky-300 text-[10px]' : ''}`}>
                                {value}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
                </StaggerItem>
              )
            })}
          </StaggerList>
        )}

      </main>
    </>
  )
}
