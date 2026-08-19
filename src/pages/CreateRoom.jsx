import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { PlusCircle } from 'lucide-react'

export default function CreateRoom() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ room_name: '', subject: '', max_people: 5 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        room_name: form.room_name.trim(),
        subject: form.subject.trim(),
        max_people: Number(form.max_people),
        created_by: user.id,
        status: 'active',
      })
      .select()
      .single()

    if (roomError) {
      setError(roomError.message)
      setLoading(false)
      return
    }

    const { error: joinError } = await supabase
      .from('room_members')
      .insert({ room_id: room.id, user_id: user.id })

    if (joinError) {
      setError(joinError.message)
      setLoading(false)
      return
    }

    navigate(`/rooms/${room.id}`)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
          <PlusCircle size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create a Study Room</h1>
          <p className="text-sm text-slate-500">Others can discover and join your room</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Room Name</label>
          <input
            type="text"
            required
            maxLength={80}
            value={form.room_name}
            onChange={e => setForm(f => ({ ...f, room_name: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Calculus Exam Prep"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
          <input
            type="text"
            required
            maxLength={60}
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Organic Chemistry"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Max Members <span className="text-slate-400">({form.max_people})</span>
          </label>
          <input
            type="range"
            min={2}
            max={20}
            value={form.max_people}
            onChange={e => setForm(f => ({ ...f, max_people: e.target.value }))}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>2</span><span>20</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create Room'}
        </button>
      </form>
    </div>
  )
}