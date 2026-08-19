import { Link } from 'react-router-dom'
import { BookOpen, Users, Zap } from 'lucide-react'
import { useAuth } from '../App'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-2xl mb-6">
        <BookOpen size={32} className="text-brand-600" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-3">Study Group Finder</h1>
      <p className="text-lg text-slate-500 mb-10">
        Create or join live study rooms. Find people working on the same subject right now.
      </p>

      <div className="flex flex-wrap justify-center gap-3 mb-16">
        <Link
          to="/rooms"
          className="flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors"
        >
          <Users size={18} /> Browse Rooms
        </Link>
        {user ? (
          <Link
            to="/create"
            className="flex items-center gap-2 bg-white text-brand-600 border border-brand-200 px-6 py-3 rounded-xl font-medium hover:bg-brand-50 transition-colors"
          >
            <Zap size={18} /> Create a Room
          </Link>
        ) : (
          <Link
            to="/register"
            className="flex items-center gap-2 bg-white text-brand-600 border border-brand-200 px-6 py-3 rounded-xl font-medium hover:bg-brand-50 transition-colors"
          >
            Get Started Free
          </Link>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-6 text-left">
        {[
          { icon: <Zap size={20} className="text-brand-500" />, title: 'Live Rooms', desc: 'Rooms are active and real-time. They disappear when everyone leaves.' },
          { icon: <BookOpen size={20} className="text-brand-500" />, title: 'By Subject', desc: 'Filter rooms by subject to find people studying what you need.' },
          { icon: <Users size={20} className="text-brand-500" />, title: 'Study Together', desc: 'See who else is in a room and collaborate in real time.' },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="mb-2">{f.icon}</div>
            <h3 className="font-semibold text-slate-800 mb-1">{f.title}</h3>
            <p className="text-sm text-slate-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
