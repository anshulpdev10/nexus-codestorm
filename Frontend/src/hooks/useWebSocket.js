import { useState, useRef, useCallback } from 'react'
import { WS_URL } from '../api'

export const STATUS = { IDLE: 'idle', RUNNING: 'running', STOPPED: 'stopped' }

export default function useWebSocket() {
  const [status, setStatus]       = useState(STATUS.IDLE)
  const [count, setCount]         = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [error, setError]         = useState(null)
  
  const wsRef      = useRef(null)
  const onFrameRef      = useRef(null)
  const onSessionEndRef = useRef(null)

  const setOnFrame      = useCallback((fn) => { onFrameRef.current = fn },      [])
  const setOnSessionEnd = useCallback((fn) => { onSessionEndRef.current = fn }, [])

  const start = useCallback(({ batchId, operatorId, cameraIndex, videoPath, confidence }) => {
    setError(null)
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      // The backend identifies the user from this signed token (not a client-sent id)
      const payload = {
        action: 'start',
        batch_id: batchId,
        operator_id: operatorId,
        token: localStorage.getItem('token') || '',
      }
      if (videoPath) payload.video_path = videoPath
      else payload.camera_index = cameraIndex ?? 0
      if (confidence !== undefined) payload.confidence = confidence
      ws.send(JSON.stringify(payload))
      setStatus(STATUS.RUNNING)
    }

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.error) { setError(data.error); setStatus(STATUS.IDLE); return }
      if (data.session_id) setSessionId(data.session_id)
      if (data.count !== undefined) setCount(data.count)
      if (data.frame) onFrameRef.current?.(data.frame)
      if (!data.session_active) {
        setStatus(STATUS.STOPPED)
        onSessionEndRef.current?.()
      }
    }

    ws.onerror = () => {
      // Only show error if we didn't intentionally stop
      setStatus(prev => {
        if (prev === STATUS.RUNNING) setError('Connection lost.')
        return prev === STATUS.RUNNING ? STATUS.IDLE : prev
      })
    }

    ws.onclose = () => {
      setStatus(prev => prev === STATUS.RUNNING ? STATUS.STOPPED : prev)
    }
  }, [])

  const stop = useCallback(() => {
    wsRef.current?.close()
    setStatus(STATUS.STOPPED)
    onSessionEndRef.current?.()
  }, [])

  const reset = useCallback(() => {
    setStatus(STATUS.IDLE)
    setCount(0)
    setSessionId(null)
    setError(null)
  }, [])

  return { status, count, sessionId, error, start, stop, reset, setOnFrame, setOnSessionEnd }
}
