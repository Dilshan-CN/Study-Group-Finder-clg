import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, BookOpen, LogOut, UserPlus, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Room() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchRoom = useCallback(async () => {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single()

    if (roomError || !roomData) {
      navigate('/rooms', { replace: true })
      return
    }

    if (roomData.status !== 'active') {
      navigate('/rooms', { replace: true })
      return
    }

    const { data: membersData } = await supabase
      .from('room_members')
      .select('*, profiles(name)')
      .eq('room_id', id)
      .order('joined_at', { ascending: true })

    setRoom(roomData)
    setMembers(membersData || [])
    setIsMember((membersData || []).some(m => m.user_id === user.id))
    setLoading(false)
  }, [id, user.id, navigate])

  useEffect(() => {
    fetchRoom()

    const channel = supabase
      .channel(`room:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, fetchRoom)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${id}` }, fetchRoom)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchRoom, id])

  async function handleJoin() {
    setError('')
    setActionLoading(true)

    if (members.length >= room.max_people) {
      setError('This room is full.')
      setActionLoading(false)
      return
    }

    const { error } = await supabase
      .from('room_members')
      .insert({ room_id: id, user_id: user.id })

    if (error) {
      setError(error.code === '23505' ? 'You are already in this room.' : error.message)
    }
    setActionLoading(false)
  }

  async function handleLeave() {
    setActionLoading(true)

    await supabase
      .from('room_members')
      .delete()
      .eq('room_id', id)
      .eq('user_id', user.id)

    // Room deletion (if last member) is handled by DB trigger
    navigate('/rooms')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!room) return null

  const isFull = members.length >= room.max_people

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{room.room_name}</h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <BookOpen size={14} className="text-brand-500" />
                <span className="text-sm text-slate-500">{room.subject}</span>
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              Active
            </span>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Users size={16} className="text-slate-400" />
            <span className="text-sm text-slate-600">
              <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-brand-600'}`}>{members.length}</span>
              {' / '}
              <span className="text-slate-400">{room.max_people} max</span>
            </span>
            {isFull && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Full</span>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Members</h2>
          {members.length === 0 ? (
            <p className="text-sm text-slate-400">No members yet.</p>
          ) : (
            <ul className="space-y-2">
              {members.map(m => (
                <li key={m.id} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold shrink-0">
                    {(m.profiles?.name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-700">{m.profiles?.name || 'Unknown'}</span>
                  {m.user_id === room.created_by && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">host</span>
                  )}
                  {m.user_id === user.id && (
                    <span className="text-xs text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">you</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {isMember ? (
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <LogOut size={15} />
              {actionLoading ? 'Leaving…' : 'Leave Room'}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={actionLoading || isFull}
              className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={15} />
              {actionLoading ? 'Joining…' : isFull ? 'Room is Full' : 'Join Room'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
