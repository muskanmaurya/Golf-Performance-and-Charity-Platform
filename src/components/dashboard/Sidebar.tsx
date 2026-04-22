'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Target, Trophy, Heart, Settings, LogOut, Zap, Menu, X, ChevronRight, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const baseNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/scores', icon: Target, label: 'My Scores' },
  { href: '/dashboard/draws', icon: Trophy, label: 'Prize Draws' },
  { href: '/dashboard/charities', icon: Heart, label: 'Charities' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navItems = isAdmin
    ? [...baseNavItems, { href: '/admin', icon: Shield, label: 'Admin Panel' }]
    : baseNavItems

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-[#1e2a3a]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base text-white">
            Digital <span className="gradient-text">Heroes</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group relative
                ${active
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
              {label}
              {active && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-sky-400/60" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#1e2a3a]">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 w-full"
        >
          <LogOut className="w-4.5 h-4.5" size={18} />
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex w-60 flex-col bg-[#0a0f1a] border-r border-[#1e2a3a] h-screen sticky top-0">
        <NavContent />
      </aside>

      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f1a] border-b border-[#1e2a3a]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-white">Digital <span className="gradient-text">Heroes</span></span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-slate-400 hover:text-white p-1"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="fixed inset-0 z-50 bg-[#0a0f1a]"
            >
              <NavContent />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
