import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, BarChart3, Box, Radio, LogOut, User, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { useState, useEffect, useRef } from 'react'

export default function Header() {
  const navigate = useNavigate()
  const { status } = useSession()
  const isLive = status === 'running'
  const [user] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sessions',  icon: ClipboardList,   label: 'Sessions' },
    { to: '/stats',     icon: BarChart3,       label: 'Analytics' },
  ]

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 shadow-lg"
    >
      <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 flex-shrink-0"
            onClick={() => navigate('/')}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-purple-600 rounded-xl blur-md opacity-50" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-sky-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Box size={18} className="text-white" />
              </div>
            </div>
            <span className="text-xl font-black hidden sm:block">
              <span className="bg-gradient-to-r from-sky-400 to-purple-500 bg-clip-text text-transparent">
                Box
              </span>
              <span className="text-white">Guard</span>
            </span>
          </motion.button>

          {/* Center - Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {links.map((link, idx) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 + 0.2 }}
                      className="flex items-center gap-2 relative"
                    >
                      <Icon size={16} className={isActive ? 'text-sky-400' : ''} />
                      <span>{link.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-purple-500 rounded-full"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.div>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Right Side - Live Indicator & User Menu */}
          <div className="flex items-center gap-3">
            
            {/* Live Session Indicator */}
            <AnimatePresence>
              {isLive && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Radio size={12} className="text-emerald-400" />
                  </motion.div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Live
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Menu */}
            {user && (
              <div className="relative" ref={menuRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-white" />
                  </div>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-xs font-bold text-white leading-none">{user.warehouse_name}</span>
                    <span className="text-[10px] text-gray-400 leading-none mt-0.5">{user.warehouse_location}</span>
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform hidden sm:block ${showUserMenu ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-800/50 bg-gradient-to-br from-gray-800/50 to-transparent">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <User size={18} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user.warehouse_name}</p>
                            <p className="text-xs text-gray-400 truncate">{user.warehouse_location}</p>
                          </div>
                        </div>
                        <div className="px-3 py-2 bg-gray-950/50 rounded-lg border border-gray-800/50">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Email</p>
                          <p className="text-xs text-gray-300 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            navigate('/profile')
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800/80 rounded-lg transition-colors group mb-1"
                        >
                          <User size={16} className="group-hover:scale-110 transition-transform" />
                          <span className="font-semibold">Profile Settings</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group"
                        >
                          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
                          <span className="font-semibold">Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-xs transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/20 to-purple-500/20 text-white border border-sky-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={14} className={isActive ? 'text-sky-400' : ''} />
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </div>
    </motion.header>
  )
}
