import { Link } from 'react-router-dom'
import { Users, BookOpen, ArrowRight } from 'lucide-react'

export default function RoomCard({ room }) {
  const isFull = room.member_count >= room.max_people

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-brand-200 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800 leading-tight">{room.room_name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <BookOpen size={13} className="text-brand-500" />
            <span className="text-sm text-slate-500">{room.subject}</span>
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          Active
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Users size={14} />
          <span>
            <span className={isFull ? 'text-red-500 font-medium' : 'text-brand-600 font-medium'}>
              {room.member_count}
            </span>
            <span className="text-slate-400"> / {room.max_people}</span>
          </span>
          {isFull && <span className="text-xs text-red-500 font-medium">(Full)</span>}
        </div>

        <Link
          to={`/rooms/${room.id}`}
          className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
            isFull
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
              : 'bg-brand-500 text-white hover:bg-brand-600'
          }`}
        >
          Join <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}
