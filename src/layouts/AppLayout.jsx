import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Map } from 'lucide-react';

export default function AppLayout() {
  const { logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Navbar/Sidebar */}
      <nav className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-row md:flex-col justify-between items-center md:items-start">
        <div className="flex items-center gap-2">
          <Map className="text-teal-400 w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">RoadmApp</h1>
        </div>
        
        <div className="flex items-center gap-4 md:mt-auto">
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
