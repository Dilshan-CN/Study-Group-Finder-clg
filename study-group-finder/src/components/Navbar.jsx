import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, LogOut, PlusCircle, Users } from 'lucide-react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-600">
          <BookOpen size={20} />
          <span>StudyFinder</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/rooms"
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <Users size={16} />
            <span className="hidden sm:inline">Rooms</span>
          </Link>

          {user ? (
            <>
              <Link
                to="/create"
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
              >
                <PlusCircle size={16} />
                <span className="hidden sm:inline">Create</span>
              </Link>
              <div className="flex items-center gap-2 ml-1 pl-3 border-l border-slate-200">
                <span className="text-sm text-slate-500 hidden sm:inline">{profile?.name}</span>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Link
                to="/login"
                className="text-sm text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
