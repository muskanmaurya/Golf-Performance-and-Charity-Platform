'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Plus, Edit2, Trash2, Image as ImageIcon, Globe } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { adminAddCharity, adminUpdateCharity, adminDeleteCharity } from '@/app/actions/admin'
import type { Charity } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  charities: Charity[]
}

export default function CharitiesPageClient({ charities: initialCharities }: Props) {
  const router = useRouter()
  const [charities, setCharities] = useState(initialCharities)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [newCharity, setNewCharity] = useState({
    name: '',
    description: '',
    logoUrl: '',
    websiteUrl: '',
    isActive: true,
  })

  const [editingCharity, setEditingCharity] = useState<Partial<Charity> | null>(null)
  const activeCount = useMemo(() => charities.filter((charity) => charity.is_active).length, [charities])
  const totalRaised = useMemo(() => charities.reduce((sum, charity) => sum + (charity.total_raised_pence || 0), 0), [charities])

  async function handleAddCharity() {
    if (!newCharity.name.trim()) return
    setLoading(true)
    const result = await adminAddCharity(newCharity)
    setLoading(false)
    if (result.ok) {
      router.refresh()
      setNewCharity({
        name: '',
        description: '',
        logoUrl: '',
        websiteUrl: '',
        isActive: true,
      })
    }
  }

  async function handleUpdateCharity(charityId: string) {
    if (!editingCharity?.name?.trim()) return
    setLoading(true)
    const result = await adminUpdateCharity({
      charityId,
      name: editingCharity.name!,
      description: editingCharity.description,
      logoUrl: editingCharity.logo_url,
      websiteUrl: editingCharity.website_url,
      isActive: editingCharity.is_active,
    })
    setLoading(false)
    if (result.ok) {
      router.refresh()
      setEditingId(null)
      setEditingCharity(null)
    }
  }

  async function handleDeleteCharity(charityId: string) {
    if (!confirm('Delete this charity? This cannot be undone.')) return
    setLoading(true)
    const result = await adminDeleteCharity(charityId)
    setLoading(false)
    if (result.ok) {
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#070b12] via-[#0b1220] to-[#070b12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Charity Management</h1>
              <p className="text-slate-400 text-sm mt-1">Add, edit, and manage charity partners</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Charities</p>
              <p className="text-2xl font-bold text-white mt-1">{charities.length}</p>
            </Card>
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Active</p>
              <p className="text-2xl font-bold text-white mt-1">{activeCount}</p>
            </Card>
            <Card className="p-4 border border-[#1e2a3a] bg-[#0b1220]/80">
              <p className="text-xs text-slate-400">Total raised</p>
              <p className="text-2xl font-bold text-white mt-1">£{(totalRaised / 100).toFixed(2)}</p>
            </Card>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add New Charity */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Charity
              </h2>
              <div className="space-y-4">
                <Input
                  label="Name"
                  value={newCharity.name}
                  onChange={(e) => setNewCharity((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Charity name"
                />
                <Input
                  label="Description"
                  value={newCharity.description}
                  onChange={(e) => setNewCharity((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                />
                <Input
                  label="Logo URL"
                  value={newCharity.logoUrl}
                  onChange={(e) => setNewCharity((prev) => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://..."
                />
                {newCharity.logoUrl && (
                  <div className="rounded-xl border border-[#1e2a3a] bg-[#0a0f1a] p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#101826] flex items-center justify-center shrink-0">
                      {newCharity.logoUrl ? (
                        <img src={newCharity.logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-white">Logo preview</p>
                      <p className="text-xs text-slate-400">This will help admins confirm the brand asset before saving.</p>
                    </div>
                  </div>
                )}
                <Input
                  label="Website URL"
                  value={newCharity.websiteUrl}
                  onChange={(e) => setNewCharity((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://..."
                />
                {newCharity.websiteUrl && (
                  <a href={newCharity.websiteUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Open website
                  </a>
                )}
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newCharity.isActive}
                    onChange={(e) => setNewCharity((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active
                </label>
                <Button onClick={handleAddCharity} loading={loading} className="w-full">
                  <Plus className="w-4 h-4" />
                  Add Charity
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Charities List */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-4">
              {charities.map((charity) => (
                <Card key={charity.id} className="p-5">
                  {editingId === charity.id ? (
                    <div className="space-y-3">
                      <Input
                        label="Name"
                        value={editingCharity?.name ?? ''}
                        onChange={(e) => setEditingCharity((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <Input
                        label="Description"
                        value={editingCharity?.description ?? ''}
                        onChange={(e) => setEditingCharity((prev) => ({ ...prev, description: e.target.value }))}
                      />
                      <Input
                        label="Logo URL"
                        value={editingCharity?.logo_url ?? ''}
                        onChange={(e) => setEditingCharity((prev) => ({ ...prev, logo_url: e.target.value }))}
                      />
                      {editingCharity?.logo_url && (
                        <div className="rounded-xl border border-[#1e2a3a] bg-[#0a0f1a] p-3">
                          <img src={editingCharity.logo_url} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover" />
                        </div>
                      )}
                      <Input
                        label="Website URL"
                        value={editingCharity?.website_url ?? ''}
                        onChange={(e) => setEditingCharity((prev) => ({ ...prev, website_url: e.target.value }))}
                      />
                      <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingCharity?.is_active ?? true}
                          onChange={(e) => setEditingCharity((prev) => ({ ...prev, is_active: e.target.checked }))}
                        />
                        Active
                      </label>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateCharity(charity.id)}
                          loading={loading}
                          size="sm"
                          className="flex-1"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingId(null)
                            setEditingCharity(null)
                          }}
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#0a0f1a] border border-[#1e2a3a] shrink-0 flex items-center justify-center">
                            {charity.logo_url ? <img src={charity.logo_url} alt={charity.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
                          </div>
                          <div>
                          <h3 className="font-semibold text-white">{charity.name}</h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{charity.description}</p>
                        </div>
                        </div>
                        <Badge variant={charity.is_active ? 'success' : 'default'}>{charity.is_active ? 'Active' : 'Hidden'}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mb-4">
                        Raised: £{(charity.total_raised_pence / 100).toFixed(2)}
                      </div>
                      {charity.website_url && (
                        <a href={charity.website_url} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 mb-4">
                          <Globe className="w-3 h-3" />
                          Open website
                        </a>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingId(charity.id)
                            setEditingCharity(charity)
                          }}
                          className="flex-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteCharity(charity.id)}
                          loading={loading}
                          className="flex-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
