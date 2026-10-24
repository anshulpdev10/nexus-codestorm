import { useEffect, useState, useMemo } from 'react'
import { getSessions, getOperatorStats } from '../api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts'
import {
  RefreshCw, Box, Trophy, User, Clock, TrendingUp,
  Camera, Upload, AlertCircle, Package, Zap, Download, ChevronDown
} from 'lucide-react'
import { FadeUp, ScalePop, StaggerList, StaggerItem } from '../components/Motion'
import Tooltip from '../components/Tooltip'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function OperatorStats() {
  const [sessions, setSessions] = useState([])
  const [opStats, setOpStats]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState(false)
  const [activeOp, setActiveOp] = useState(null)
  const [chartTransitioning] = useState(false)
  const [chartKey] = useState(0)

  const load = () => {
    setLoading(true); setErr(false)
    Promise.all([getSessions(), getOperatorStats()])
      .then(([s, o]) => { setSessions(s.data); setOpStats(o.data) })
      .catch(() => setErr(true))
      .finally(() => setLoading(false))
  }
  const [countdown, setCountdown] = useState(300)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Countdown timer
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountdown(300)
    const tick = setInterval(() => setCountdown(c => c <= 1 ? 300 : c - 1), 1000)
    return () => clearInterval(tick)
  }, [sessions]) // resets when data refreshes

  const completed = useMemo(() => sessions.filter(s => s.status === 'completed'), [sessions])

  const kpis = useMemo(() => {
    const totalBoxes = completed.reduce((s, x) => s + (x.final_count || 0), 0)
    const best = completed.reduce((b, x) => (x.final_count || 0) > (b?.final_count || 0) ? x : b, null)
    const topOp = opStats[0]
    const durations = completed.filter(s => s.started_at && s.ended_at)
      .map(s => (new Date(s.ended_at) - new Date(s.started_at)) / 1000)
    const avgDur = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null
    const avgDurStr = avgDur ? (avgDur < 60 ? `${avgDur}s` : `${Math.floor(avgDur / 60)}m ${avgDur % 60}s`) : '—'
    return { totalBoxes, best, topOp, avgDurStr }
  }, [completed, opStats])

  const timelineData = useMemo(() => {
    const filtered = [...completed]
      .filter(s => (s.final_count || 0) > 0)
      .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    
    // Show all batches from 1 to latest
    const result = filtered.map((s, idx) => ({
      name: s.batch_id || '—',
      boxes: s.final_count || 0,
      operator: s.operator_id || '—',
      index: idx + 1,
      session: s,
    }))
    
    console.log(`📊 Showing all ${result.length} batches with detections`)
    return result
  }, [completed])

  // Dynamic chart height based on data points
  const chartHeight = useMemo(() => {
    if (timelineData.length === 0) return 160
    if (timelineData.length <= 10) return 140
    if (timelineData.length <= 25) return 160
    return 180
  }, [timelineData.length])

  const hourData = useMemo(() => {
    const now = new Date()
    // Build 24 slots: from 23 hours ago up to current hour
    return Array.from({ length: 24 }, (_, i) => {
      const slotTime = new Date(now)
      slotTime.setHours(now.getHours() - (23 - i), 0, 0, 0)
      const slotEnd = new Date(slotTime)
      slotEnd.setHours(slotTime.getHours() + 1)

      const count = sessions.filter(s => {
        if (!s.started_at) return false
        const t = new Date(s.started_at)
        return t >= slotTime && t < slotEnd
      }).length

      const h = slotTime.getHours()
      return {
        hour: `${h.toString().padStart(2, '0')}:00`,
        sessions: count,
        isCurrent: i === 23,
      }
    })
  }, [sessions])

  const sourceSplit = useMemo(() => {
    const live   = sessions.filter(s => s.source_type === 'live').length
    const upload = sessions.filter(s => s.source_type === 'upload').length
    return { live, upload, total: sessions.length }
  }, [sessions])

  const topBatches = useMemo(() => {
    const map = {}
    completed.forEach(s => {
      if (!map[s.batch_id]) map[s.batch_id] = { id: s.batch_id, total: 0, sessions: 0 }
      map[s.batch_id].total += s.final_count || 0
      map[s.batch_id].sessions++
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [completed])

  const maxOp    = opStats[0]?.total_boxes || 1
  const maxBatch = topBatches[0]?.total || 1
  const maxHour  = Math.max(...hourData.map(h => h.sessions), 1)

  const opTimeline = useMemo(() => {
    if (!activeOp) return []
    return [...completed]
      .filter(s => s.operator_id === activeOp)
      .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
      .map((s, i) => ({ name: `#${i + 1}`, boxes: s.final_count || 0 }))
  }, [activeOp, completed])

  const exportThroughputPDF = () => {
    if (completed.length === 0) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Calculate comprehensive stats for ALL completed sessions
    const allBoxes = completed.reduce((sum, s) => sum + (s.final_count || 0), 0)
    const allAvg = (allBoxes / completed.length).toFixed(1)
    const maxSession = completed.reduce((max, s) => (s.final_count || 0) > (max?.final_count || 0) ? s : max, completed[0])
    const minSession = completed.reduce((min, s) => (s.final_count || 0) < (min?.final_count || 0) ? s : min, completed[0])
    
    // Get ALL operators
    const allOperators = {}
    completed.forEach(s => {
      if (!allOperators[s.operator_id]) {
        allOperators[s.operator_id] = { name: s.operator_id, boxes: 0, sessions: 0 }
      }
      allOperators[s.operator_id].boxes += s.final_count || 0
      allOperators[s.operator_id].sessions++
    })
    const topOperators = Object.values(allOperators)
      .sort((a, b) => b.boxes - a.boxes)
      .slice(0, 10)
    
    // Get ALL batches
    const allBatches = {}
    completed.forEach(s => {
      if (!allBatches[s.batch_id]) {
        allBatches[s.batch_id] = { id: s.batch_id, boxes: 0, sessions: 0 }
      }
      allBatches[s.batch_id].boxes += s.final_count || 0
      allBatches[s.batch_id].sessions++
    })
    const topBatches = Object.values(allBatches)
      .sort((a, b) => b.boxes - a.boxes)
      .slice(0, 10)
    
    // Calculate durations for all
    const allDurations = completed
      .filter(s => s.started_at && s.ended_at)
      .map(s => (new Date(s.ended_at) - new Date(s.started_at)) / 1000)
    const avgDuration = allDurations.length 
      ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
      : 0
    const avgDurStr = avgDuration < 60 
      ? `${avgDuration}s` 
      : `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`
    
    // Source split for all
    const liveCount = completed.filter(s => s.source_type === 'live').length
    const uploadCount = completed.filter(s => s.source_type === 'upload').length
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(14, 165, 233)
    doc.text('BoxGuard Complete Analytics Report', pageWidth / 2, 20, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' })
    
    // Range info box
    doc.setFillColor(240, 249, 255)
    doc.rect(14, 35, pageWidth - 28, 12, 'F')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(`All Time Statistics (${completed.length} completed sessions)`, pageWidth / 2, 42, { align: 'center' })
    
    let yPos = 55
    
    // ═══ SECTION 1: KEY METRICS ═══
    doc.setFontSize(14)
    doc.setTextColor(14, 165, 233)
    doc.text('Overall Key Metrics', 14, yPos)
    yPos += 8
    
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const metrics = [
      ['Total Boxes Packed:', allBoxes.toString()],
      ['Average per Session:', `${allAvg} boxes`],
      ['Total Completed Sessions:', completed.length.toString()],
      ['Average Duration:', avgDurStr],
      ['Highest Session:', `${maxSession.final_count} boxes (${maxSession.batch_id})`],
      ['Lowest Session:', `${minSession.final_count} boxes (${minSession.batch_id})`],
    ]
    
    metrics.forEach(([label, value]) => {
      doc.setTextColor(80, 80, 80)
      doc.text(label, 20, yPos)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text(value, 90, yPos)
      doc.setFont(undefined, 'normal')
      yPos += 6
    })
    
    yPos += 5
    
    // ═══ SECTION 2: SOURCE BREAKDOWN ═══
    doc.setFontSize(14)
    doc.setTextColor(14, 165, 233)
    doc.text('Source Breakdown', 14, yPos)
    yPos += 8
    
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(`Live Camera: ${liveCount} sessions (${((liveCount / completed.length) * 100).toFixed(1)}%)`, 20, yPos)
    yPos += 6
    doc.text(`Uploaded Video: ${uploadCount} sessions (${((uploadCount / completed.length) * 100).toFixed(1)}%)`, 20, yPos)
    yPos += 10
    
    // ═══ SECTION 3: TOP OPERATORS ═══
    doc.setFontSize(14)
    doc.setTextColor(14, 165, 233)
    doc.text('Top 10 Operators (All Time)', 14, yPos)
    yPos += 8
    
    if (topOperators.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Operator', 'Total Boxes', 'Sessions', 'Avg/Session']],
        body: topOperators.map((op, i) => [
          `#${i + 1}`,
          op.name,
          op.boxes.toString(),
          op.sessions.toString(),
          (op.boxes / op.sessions).toFixed(1)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 2 },
      })
      yPos = doc.lastAutoTable.finalY + 10
    }
    
    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage()
      yPos = 20
    }
    
    // ═══ SECTION 4: TOP BATCHES ═══
    doc.setFontSize(14)
    doc.setTextColor(14, 165, 233)
    doc.text('Top 10 Batches (All Time)', 14, yPos)
    yPos += 8
    
    if (topBatches.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Batch ID', 'Total Boxes', 'Sessions', 'Avg/Session']],
        body: topBatches.map((b, i) => [
          `#${i + 1}`,
          b.id,
          b.boxes.toString(),
          b.sessions.toString(),
          (b.boxes / b.sessions).toFixed(1)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 2 },
      })
      yPos = doc.lastAutoTable.finalY + 10
    }
    
    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage()
      yPos = 20
    }
    
    // ═══ SECTION 5: ALL BATCHES DETAILED LOG ═══
    doc.setFontSize(14)
    doc.setTextColor(14, 165, 233)
    doc.text('Complete Batch History', 14, yPos)
    yPos += 8
    
    // Sort all completed sessions by date
    const allSessionsSorted = [...completed]
      .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    
    const tableData = allSessionsSorted.map((s, idx) => [
      `#${idx + 1}`,
      s.batch_id,
      s.operator_id,
      (s.final_count || 0).toString(),
      s.source_type === 'live' ? 'Live' : 'Upload',
      s.started_at ? new Date(s.started_at).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : '—'
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Batch ID', 'Operator', 'Boxes', 'Source', 'Started At']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 45 },
      },
    })
    
    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${i} of ${pageCount} | BoxGuard Analytics © ${new Date().getFullYear()}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }
    
    const filename = `boxguard_complete_stats_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-gray-950 gap-2 text-gray-600 text-sm">
      <span className="w-4 h-4 border-2 border-gray-700 border-t-sky-500 rounded-full animate-spin" />
      Loading analytics...
    </div>
  )

  if (err) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 gap-3">
      <div className="w-12 h-12 bg-red-950 border border-red-800 rounded-2xl flex items-center justify-center">
        <AlertCircle size={20} className="text-red-400" />
      </div>
      <p className="text-sm text-gray-400">Backend not reachable</p>
      <button onClick={load} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 transition-colors">Retry</button>
    </div>
  )

  return (
    <main className="flex-1 p-5 max-w-6xl mx-auto w-full flex flex-col gap-2 overflow-y-auto">

      {/* ── Header ── */}
      <FadeUp className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white">Analytics</h1>
          <p className="text-xs text-gray-500">{sessions.length} sessions · {completed.length} completed</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Stats Button */}
          <Tooltip label="Export complete analytics report">
            <button
              onClick={exportThroughputPDF}
              disabled={completed.length === 0}
              className="flex items-center gap-2 text-xs bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 border border-indigo-500/50 disabled:border-gray-700 text-white px-4 py-2 rounded-lg transition-all font-semibold shadow-lg shadow-indigo-500/20 disabled:shadow-none hover:scale-105 disabled:hover:scale-100">
              <Download size={13} /> Export Stats
            </button>
          </Tooltip>
          
          <Tooltip label="Refresh analytics">
            <button onClick={load}
              className="flex items-center gap-2 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 px-4 py-2 rounded-lg transition-all font-medium">
              <RefreshCw size={13} /> Refresh · {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </button>
          </Tooltip>
        </div>
      </FadeUp>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { icon: Box,      label: 'Total Boxes',   value: kpis.totalBoxes,              sub: 'all time',              color: '#38bdf8', bg: 'bg-sky-950',    border: 'border-sky-900', tip: 'Total boxes across all completed sessions' },
          { icon: Trophy,   label: 'Best Session',  value: kpis.best?.final_count ?? '—', sub: kpis.best?.batch_id ?? 'no data', color: '#fbbf24', bg: 'bg-amber-950',  border: 'border-amber-900', tip: 'Highest box count in a single session' },
          { icon: User,     label: 'Top Operator',  value: kpis.topOp?._id ?? '—',       sub: kpis.topOp ? `${kpis.topOp.total_boxes} boxes` : 'no data', color: '#a78bfa', bg: 'bg-purple-950', border: 'border-purple-900', tip: 'Operator with most boxes packed' },
          { icon: Clock,    label: 'Avg Duration',  value: kpis.avgDurStr,               sub: 'per session',           color: '#34d399', bg: 'bg-green-950',  border: 'border-green-900', tip: 'Average session duration' },
        ].map(({ icon: Icon, label, value, sub, color, bg, border, tip }, idx) => (
          <ScalePop key={label} delay={idx * 0.06}>
            <Tooltip label={tip}>
              <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 hover:border-gray-700 rounded-2xl p-4 flex items-center gap-3.5 h-full transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer group">
                <div className={`w-10 h-10 shrink-0 ${bg} border ${border} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-black tabular-nums leading-none mb-1" style={{ color }}>{value}</p>
                  <p className="text-xs font-bold text-white leading-none mb-1">{label}</p>
                  <p className="text-[10px] text-gray-500 truncate">{sub}</p>
                </div>
              </div>
            </Tooltip>
          </ScalePop>
        ))}
      </div>

      {/* ── Row 2: Trend + Source ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

        {/* Area chart */}
        <FadeUp delay={0.1} className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white leading-none">Throughput Trend</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Boxes per session · all {timelineData.length} batches with detections
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-sky-400" />
            </div>
          </div>
          {timelineData.length === 0
            ? <div className="flex items-center justify-center h-32 text-gray-700 text-xs">No completed sessions yet</div>
            : (
              <div className={`transition-all duration-300 ${chartTransitioning ? 'opacity-70' : 'opacity-100'}`} style={{ height: `${chartHeight}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    key={`chart-${chartKey}`}
                    data={timelineData} 
                    margin={{ top: 4, right: 4, bottom: 24, left: -22 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#4b5563', fontSize: 9 }} 
                      angle={-35} 
                      textAnchor="end" 
                      interval={timelineData.length > 15 ? Math.floor(timelineData.length / 10) : 0}
                      height={50}
                    />
                    <YAxis 
                      tick={{ fill: '#4b5563', fontSize: 10 }} 
                      domain={[0, 'auto']}
                      allowDataOverflow={false}
                    />
                    <RechartsTooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      return (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                          <p className="text-gray-300 font-semibold">{label}</p>
                          {d?.operator && <p className="text-gray-500">{d.operator}</p>}
                          <p style={{ color: '#38bdf8' }} className="font-bold mt-1">Boxes: {d?.boxes}</p>
                        </div>
                      )
                    }} />
                    <Area 
                      type="monotone" 
                      dataKey="boxes" 
                      name="Boxes"
                      stroke="#38bdf8" 
                      strokeWidth={2} 
                      fill="url(#grad)"
                      dot={timelineData.length <= 25 ? { fill: '#38bdf8', r: 2.5, strokeWidth: 0 } : false}
                      activeDot={{ r: 4, fill: '#38bdf8' }} 
                      animationDuration={500}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          }
        </FadeUp>

        {/* Source split */}
        <FadeUp delay={0.15} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white leading-none">Source Split</p>
            <Zap size={13} className="text-gray-600" />
          </div>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {[
              { label: 'Live Camera',    count: sourceSplit.live,   icon: Camera, color: '#38bdf8', track: 'bg-sky-500' },
              { label: 'Uploaded Video', count: sourceSplit.upload, icon: Upload, color: '#a78bfa', track: 'bg-purple-500' },
            ].map(({ label, count, icon: Icon, color, track }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon size={11} style={{ color }} />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                  <span className="text-sm font-black tabular-nums" style={{ color }}>{count}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-700 ${track}`}
                    style={{ width: sourceSplit.total ? `${(count / sourceSplit.total) * 100}%` : '0%' }} />
                </div>
                <p className="text-xs text-gray-700 mt-1">
                  {sourceSplit.total ? Math.round((count / sourceSplit.total) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-600">{sourceSplit.total} total sessions</p>
          </div>
        </FadeUp>
      </div>

      {/* ── Row 3: Leaderboard + Hour chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">

        {/* Operator leaderboard */}
        <FadeUp delay={0.1} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white leading-none">Operator Leaderboard</p>
              <p className="text-xs text-gray-500 mt-0.5">Tap to drill down</p>
            </div>
            <Trophy size={13} className="text-amber-400" />
          </div>

          {opStats.length === 0
            ? <p className="text-xs text-gray-600 py-6 text-center">No data yet</p>
            : (
              <StaggerList className="flex flex-col gap-1.5">
                {opStats.slice(0, 5).map((op, i) => (
                  <StaggerItem key={op._id}>
                    <button
                      onClick={() => setActiveOp(activeOp === op._id ? null : op._id)}
                      className={`w-full text-left rounded-xl px-3 py-2 transition-all border ${
                        activeOp === op._id ? 'bg-sky-950 border-sky-800' : 'bg-gray-800/40 border-transparent hover:border-gray-700'
                      }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black w-4 shrink-0 tabular-nums ${i === 0 ? 'text-amber-400' : 'text-gray-600'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white truncate">{op._id}</span>
                            <span className="text-xs font-black text-sky-400 tabular-nums ml-2 shrink-0">{op.total_boxes}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-0.5 mt-1.5">
                            <div className={`h-0.5 rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-sky-500'}`}
                              style={{ width: `${((op.total_boxes || 0) / maxOp) * 100}%` }} />
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{op.total_sessions} sessions · {op.avg_count?.toFixed(1)} avg</p>
                        </div>
                      </div>
                    </button>
                  </StaggerItem>
                ))}
              </StaggerList>
            )
          }

          {activeOp && opTimeline.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-400 mb-2">{activeOp}</p>
              <ResponsiveContainer width="100%" height={70}>
                <BarChart data={opTimeline} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
                  <XAxis dataKey="name" tick={{ fill: '#4b5563', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#4b5563', fontSize: 9 }} />
                  <RechartsTooltip content={<ChartTip />} />
                  <Bar dataKey="boxes" name="Boxes" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </FadeUp>

        {/* Hour distribution */}
        <FadeUp delay={0.15} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col min-h-[260px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white leading-none">Activity — Last 24 Hours</p>
              <p className="text-xs text-gray-500 mt-0.5">Sessions started per hour</p>
            </div>
            <Clock size={13} className="text-gray-600" />
          </div>
          {hourData.every(d => d.sessions === 0)
            ? <div className="flex-1 flex items-center justify-center text-gray-700 text-xs">No sessions in the last 24 hours</div>
            : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fill: '#4b5563', fontSize: 9 }} interval={3} />
                    <YAxis tick={{ fill: '#4b5563', fontSize: 9 }} allowDecimals={false} />
                    <RechartsTooltip content={<ChartTip />} />
                    <Bar dataKey="sessions" name="Sessions" radius={[3, 3, 0, 0]}>
                      {hourData.map((d, i) => (
                        <Cell key={i} fill={
                          d.isCurrent ? '#38bdf8' :
                          d.sessions === maxHour && d.sessions > 0 ? '#fbbf24' : '#1e3a5f'
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          }
        </FadeUp>
      </div>

      {/* ── Top batches ── */}
      {topBatches.length > 0 && (
        <FadeUp delay={0.1} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white leading-none">Top Batches</p>
              <p className="text-xs text-gray-500 mt-0.5">Highest box counts by batch ID</p>
            </div>
            <Package size={13} className="text-gray-600" />
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${topBatches.length}, minmax(0, 1fr))` }}>
            {topBatches.map((b, i) => (
              <ScalePop key={b.id} delay={i * 0.05}>
                <div
                  className={`rounded-xl p-3 border flex flex-col items-center text-center gap-1 ${
                    i === 0 ? 'bg-amber-950/60 border-amber-800' : 'bg-gray-800/50 border-gray-700'
                  }`}>
                  <span className={`text-xs font-bold ${i === 0 ? 'text-amber-400' : 'text-gray-600'}`}>#{i + 1}</span>
                  <span className="text-xs font-semibold text-white truncate w-full">{b.id}</span>
                  <span className={`text-2xl font-black tabular-nums leading-none ${i === 0 ? 'text-amber-400' : 'text-sky-400'}`}>{b.total}</span>
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                    <div className={`h-1 rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-sky-600'}`}
                      style={{ width: `${(b.total / maxBatch) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-600">{b.sessions} session{b.sessions !== 1 ? 's' : ''}</span>
                </div>
              </ScalePop>
            ))}
          </div>
        </FadeUp>
      )}

    </main>
  )
}

