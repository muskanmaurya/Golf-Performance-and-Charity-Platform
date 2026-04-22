'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Trophy, Heart, Crown, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/admin/analytics', label: 'Reports', icon: BarChart3, description: 'Users, prize pool, draws' },
  { href: '/admin/users', label: 'Users', icon: Users, description: 'Manage profiles, roles, subscriptions' },
  { href: '/admin/draws', label: 'Draws', icon: Trophy, description: 'Simulate & publish draw results' },
  { href: '/admin/charities', label: 'Charities', icon: Heart, description: 'Add, edit charity details' },
  { href: '/admin/winners', label: 'Winners', icon: Crown, description: 'Verify proofs & payouts' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-[#1e2a3a] bg-[#0a0f1a]/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex overflow-x-auto gap-0">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 sm:px-6 py-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all text-sm font-medium ${
                  isActive
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
