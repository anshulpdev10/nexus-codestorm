import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Mail, Lock, Building, MapPin, User, Phone, AlertCircle, Package, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { signup } from '../api'

export default function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    warehouse_name: '',
    warehouse_location: '',
    contact_name: '',
    contact_phone: '',
    ms_name: '',
    transporter_id: '',
    courier_partner: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const checkPasswordStrength = (password) => {
    let score = 0
    let messages = []

    if (password.length >= 8) score++
    else messages.push('at least 8 characters')

    if (/[a-z]/.test(password)) score++
    else messages.push('lowercase letter')

    if (/[A-Z]/.test(password)) score++
    else messages.push('uppercase letter')

    if (/\d/.test(password)) score++
    else messages.push('number')

    if (/[@$!%*?&]/.test(password)) score++
    else messages.push('special character (@$!%*?&)')

    return {
      score,
      message: score === 5 ? 'Strong password!' : `Missing: ${messages.join(', ')}`
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')

    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (passwordStrength.score < 5) {
      setError('Please use a stronger password')
      return
    }

    setLoading(true)

    try {
      const { data } = await signup({
        email: formData.email,
        password: formData.password,
        warehouse_name: formData.warehouse_name,
        warehouse_location: formData.warehouse_location,
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        ms_name: formData.ms_name,
        transporter_id: formData.transporter_id,
        courier_partner: formData.courier_partner
      })
      
      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.user.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Navigate to dashboard
        navigate('/dashboard')
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStrengthColor = (score) => {
    if (score <= 1) return 'bg-red-500'
    if (score === 2) return 'bg-orange-500'
    if (score === 3) return 'bg-yellow-500'
    if (score === 4) return 'bg-lime-500'
    return 'bg-green-500'
  }

  return (
    <div className="min-h-screen bg-[#02040a] text-gray-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Logo and title */}
        <div className="flex flex-col items-center gap-5 mb-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-sky-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-sky-400 to-sky-700 rounded-3xl flex items-center justify-center shadow-2xl border border-sky-400/30">
              <Package size={36} className="text-white drop-shadow-md" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight">Create Account</h1>
            <p className="text-[15px] text-gray-400 mt-2 font-medium">Register your warehouse for AI monitoring</p>
          </div>
        </div>

        {/* Signup form */}
        <form onSubmit={handleSubmit} className="bg-gray-900/60 backdrop-blur-2xl border border-sky-500/30 shadow-[0_0_50px_-12px_rgba(14,165,233,0.3)] rounded-[2rem] p-8 flex flex-col gap-6 relative overflow-hidden group transition-all duration-700 hover:shadow-[0_0_60px_-10px_rgba(14,165,233,0.4)]">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-indigo-500/5 opacity-50 pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 animate-in fade-in">
              <p className="text-red-400 text-sm font-semibold text-center flex items-center justify-center gap-2">
                <AlertCircle size={16}/> {error}
              </p>
            </div>
          )}

          {/* Account Information */}
          <div className="space-y-6">
            <h3 className="text-[11px] text-sky-400 font-bold tracking-widest uppercase">Account Information</h3>
            
            <div className="flex flex-col gap-2 group">
              <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                <Mail size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 group z-10">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                  <Lock size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 pr-12 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-sky-400 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 group z-10">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                  <Lock size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 pr-12 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-sky-400 transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {formData.password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i < passwordStrength.score ? getStrengthColor(passwordStrength.score) : 'bg-gray-800'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium flex items-center gap-1.5 ${
                  passwordStrength.score === 5 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {passwordStrength.score === 5 ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {passwordStrength.message}
                </p>
              </div>
            )}
          </div>

          {/* Warehouse Information */}
          <div className="space-y-6 pt-6 border-t border-gray-800/50">
            <h3 className="text-[11px] text-sky-400 font-bold tracking-widest uppercase">Warehouse Information</h3>
            
            <div className="flex flex-col gap-2 group">
              <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                <Building size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Warehouse Name
              </label>
              <input
                type="text"
                name="warehouse_name"
                required
                placeholder="e.g. Central Distribution Center"
                className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                value={formData.warehouse_name}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col gap-2 group">
              <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                <MapPin size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Location
              </label>
              <input
                type="text"
                name="warehouse_location"
                required
                placeholder="e.g. New York, NY"
                className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                value={formData.warehouse_location}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 group">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                  <User size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Contact Name
                </label>
                <input
                  type="text"
                  name="contact_name"
                  required
                  placeholder="John Doe"
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                  value={formData.contact_name}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-2 group">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                  <Phone size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Phone (Optional)
                </label>
                <input
                  type="tel"
                  name="contact_phone"
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                  value={formData.contact_phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Challan Information */}
          <div className="space-y-6 pt-6 border-t border-gray-800/50">
            <h3 className="text-[11px] text-sky-400 font-bold tracking-widest uppercase">Challan Information</h3>
            <p className="text-xs text-gray-500">This information will be automatically included in all generated challans</p>
            
            <div className="flex flex-col gap-2 group">
              <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                <Building size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> M/S (Messrs/Company Name)
              </label>
              <input
                type="text"
                name="ms_name"
                required
                placeholder="e.g. ABC Logistics Pvt. Ltd."
                className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                value={formData.ms_name}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 group">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                  <Package size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Transporter ID
                </label>
                <input
                  type="text"
                  name="transporter_id"
                  required
                  placeholder="e.g. TR-12345"
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner uppercase"
                  value={formData.transporter_id}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-2 group">
                <label className="text-[11px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 transition-colors group-focus-within:text-sky-400">
                  <Package size={13} className="text-gray-500 group-focus-within:text-sky-400 transition-colors" /> Courier Partner
                </label>
                <input
                  type="text"
                  name="courier_partner"
                  required
                  placeholder="e.g. FedEx, DHL, Blue Dart"
                  className="w-full bg-gray-950/80 border border-gray-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl px-5 py-3.5 text-sm text-gray-100 outline-none transition-all duration-300 placeholder:text-gray-700 shadow-inner"
                  value={formData.courier_partner}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || passwordStrength.score < 5}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-[15px] font-black tracking-wide shadow-lg shadow-sky-600/20 transition-all duration-300 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none">
            {loading
              ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</>
              : <><UserPlus size={18} /> CREATE ACCOUNT</>}
          </button>

          <div className="text-center pt-4 border-t border-gray-800/50">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-sky-400 hover:text-sky-300 font-bold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
