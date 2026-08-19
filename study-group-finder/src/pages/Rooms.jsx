import { useEffect, useState, useCallback } from 'react'
import { Search, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import RoomCard from '../components/RoomCard'

export default function Rooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchRooms = useCallback(async () => {
    // Trigger server-side cleanup
    await supabase.rpc('cleanup_inactive_rooms').catch(() => {})

    const { data, error } = await supabase
      .from('rooms')
      .select('*, room_members(count)')
      .eq('status', 'active')
      .order('last_activity', { ascending: false })

    if (!error) {
      setRooms(
        (data || []).map(r => ({
          ...r,
          member_count: r.room_members?.[0]?.count ?? 0,
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRooms()

    const channel = supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, fetchRooms)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchRooms])

  const filtered = rooms.filter(r =>
    !search ||
    r.room_name.toLowerCase().includes(search.toLowerCase()) ||
    r.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Active Study Rooms</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-60"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            {search ? 'No rooms match your search.' : 'No active rooms yet.'}
          </p>
          <p className="text-sm text-slate-400 mt-1">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(room => <RoomCard key={room.id} room={room} />)}
        </div>
      )}
    </div>
  )
}
