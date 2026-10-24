import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Building2, MapPin, Phone, Mail, Package, Truck, Save, ArrowLeft, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import { FadeUp } from '../components/Motion'

const api = axios.create({ 
  baseURL: import.meta.env.DEV ? '/api' : 'http://localhost:5000' 
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default function Profile() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    warehouse_name: '',
    warehouse_location: '',
    contact_name: '',
    contact_phone: '',
    ms_name: '',
    transporter_id: '',
    courier_partner: '',
    email: ''
  })

  useEffect(() => {
    fetchProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Not authenticated. Please login again.')
        setLoading(false)
        return
      }
      
      const { data } = await api.get('/profile')
      setFormData({
        warehouse_name: data.warehouse_name || '',
        warehouse_location: data.warehouse_location || '',
        contact_name: data.contact_name || '',
        contact_phone: data.contact_phone || '',
        ms_name: data.ms_name || '',
        transporter_id: data.transporter_id || '',
        courier_partner: data.courier_partner || '',
        email: data.email || ''
      })
      setError('')
    } catch (err) {
      console.error('Profile fetch error:', err)
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please ensure the backend is running on port 5000.')
      } else if (err.response?.status === 401) {
        setError('Session expired. Please login again.')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(err.response?.data?.error || 'Failed to load profile')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Not authenticated. Please login again.')
        setSaving(false)
        return
      }
      
      const { data } = await api.put('/profile', formData)
      
      // Update local storage
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const updatedUser = { ...user, ...data.user }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Profile update error:', err)
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please ensure the backend is running on port 5000.')
      } else if (err.response?.status === 401) {
        setError('Session expired. Please login again.')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(err.response?.data?.error || 'Failed to update profile')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <span className="w-8 h-8 border-4 border-gray-800 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-transparent p-6 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-3xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
        
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Back to Dashboard</span>
        </button>

        {/* Header */}
        <FadeUp className="flex flex-col items-center gap-5 mb-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-sky-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-sky-400 to-sky-700 rounded-3xl flex items-center justify-center shadow-2xl border border-sky-400/30">
              <User size={36} className="text-white drop-shadow-md" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight">Profile Settings</h1>
            <p className="text-[15px] text-gray-400 mt-2 font-medium">Update your warehouse and challan information</p>
          </div>
        </FadeUp>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="bg-gray-900/60 backdrop-blur-2xl border border-gray-800/80 shadow-[0_8px_40px_rgba(0,0,0,0.8)] rounded-[2rem] p-8 flex flex-col gap-6 relative overflow-hidden">
          {/* Subtle inside glow edge */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />

          {/* Success notification */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
              <p className="text-green-400 text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} /> Profile updated successfully
              </p>
            </div>
          )}

          {/* Error notification */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-in fade-in">
              <p className="text-red-400 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Warehouse Information Section */}
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 size={16} /> Warehouse Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                  <Building2 size={13} className="text-gray-500" /> Warehouse Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.warehouse_name}
                  onChange={(e) => handleChange('warehouse_name', e.target.value)}
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                  placeholder="e.g. Central Warehouse"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                  <MapPin size={13} className="text-gray-500" /> Location
                </label>
                <input
                  type="text"
                  required
                  value={formData.warehouse_location}
                  onChange={(e) => handleChange('warehouse_location', e.target.value)}
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                  placeholder="e.g. Mumbai, India"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="flex flex-col gap-6 border-t border-gray-800/60 pt-6">
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
              <User size={16} /> Contact Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                  <User size={13} className="text-gray-500" /> Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                  <Phone size={13} className="text-gray-500" /> Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                <Mail size={13} className="text-gray-500" /> Email
              </label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full bg-gray-950/50 border border-gray-800/50 rounded-2xl px-5 py-3.5 text-sm text-gray-500 outline-none shadow-inner cursor-not-allowed"
              />
              <p className="text-[11px] text-gray-500 font-medium">Email cannot be changed</p>
            </div>
          </div>

          {/* Challan Information Section */}
          <div className="flex flex-col gap-6 border-t border-gray-800/60 pt-6">
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
              <Package size={16} /> Challan Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                  <Building2 size={13} className="text-gray-500" /> M/S (Messrs)
                </label>
                <input
                  type="text"
                  required
                  value={formData.ms_name}
                  onChange={(e) => handleChange('ms_name', e.target.value)}
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                  placeholder="e.g. ABC Corporation"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                  <Truck size={13} className="text-gray-500" /> Transporter ID
                </label>
                <input
                  type="text"
                  required
                  value={formData.transporter_id}
                  onChange={(e) => handleChange('transporter_id', e.target.value.toUpperCase())}
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 uppercase shadow-inner"
                  placeholder="e.g. TRN-12345"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                <Package size={13} className="text-gray-500" /> Courier Partner
              </label>
              <input
                type="text"
                required
                value={formData.courier_partner}
                onChange={(e) => handleChange('courier_partner', e.target.value)}
                className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                placeholder="e.g. DHL, FedEx, Blue Dart"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-[15px] font-black tracking-wide shadow-lg shadow-sky-600/20 transition-all duration-300 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none"
          >
            {saving ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
