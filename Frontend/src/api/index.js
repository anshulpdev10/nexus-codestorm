import axios from 'axios'

// Use proxy in development, direct URL in production
const baseURL = import.meta.env.DEV ? '/api' : 'http://localhost:5000'

const api = axios.create({ baseURL })

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Authentication
export const signup = (userData) => api.post('/auth/signup', userData)
export const login = (email, password) => api.post('/auth/login', { email, password })
export const verifyToken = () => api.get('/auth/verify')
export const getCurrentUser = () => api.get('/auth/me')

// Validation
export const validateBatch = (batch_id) => api.post('/validate/batch', { batch_id })
export const validateOperator = (operator_id) => api.post('/validate/operator', { operator_id })

// Sessions
export const getSessions      = ()    => api.get('/sessions')
export const getSession       = (id)  => api.get(`/sessions/${id}`)
export const getSessionLogs   = (id)  => api.get(`/sessions/${id}/logs`)
export const getOperatorStats = ()    => api.get('/stats/operators')
// <img>, <video> and window.open() cannot send an Authorization header, so media
// URLs carry the session token as a query parameter (the backend accepts this
// only on these media routes).
const tokenParam = () => `token=${encodeURIComponent(localStorage.getItem('token') || '')}`
export const getVideoUrl      = (id, speed = 1)  => `${baseURL}/sessions/${id}/video/stream?speed=${speed}&${tokenParam()}`
export const getUploadUrl     = (id, speed = 1)  => `${baseURL}/sessions/${id}/upload/stream?speed=${speed}&${tokenParam()}`
export const getVideoDownloadUrl = (id)          => `${baseURL}/sessions/${id}/video?${tokenParam()}`
export const uploadVideo      = (file) => {
  const form = new FormData()
  form.append('video', file)
  return api.post('/upload', form)
}
export const downloadChallan  = (id)  => api.post(`/sessions/${id}/challan`, {}, { responseType: 'blob' })
export const deleteSession    = (id)  => api.delete(`/sessions/${id}`)

// Control endpoints
export const updateConfidence = (value) => api.post('/settings/confidence', { value })
export const togglePause      = ()      => api.post('/control/pause')
export const resetSession     = ()      => api.post('/control/reset')

export const WS_URL = 'ws://localhost:5000/ws/stream'
