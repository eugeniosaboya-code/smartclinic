import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, FileText, Settings, LogOut, Menu, X } from 'lucide-react';
import { StorageService } from '../services/storage';
import { ProfessionalSettings } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const [profile, setProfile] = useState<ProfessionalSettings['profile'] | null>(null);

  useEffect(() => {
    // Load Professional Profile
    const settings = StorageService.getSettings();
    if (settings) {
        setProfile(settings.profile);
    }
    // Ensure light mode is default clean slate
    document.documentElement.classList.remove('dark');
  }, []);

  const navItems = [
    { label: 'Agenda', path: '/dashboard', icon: Calendar },
    { label: 'Pacientes', path: '/patients', icon: Users },
    { label: 'Configurações', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  return (
    <div className="flex h-screen bg-skin-fill text-skin-base overflow-hidden transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-skin-sidebar text-skin-base transform transition-transform duration-300 ease-in-out border-r border-skin-border
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex lg:flex-col shadow-xl lg:shadow-none
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-skin-border">
          <span className="text-xl font-bold text-skin-primary tracking-tight">
            PsiManager
          </span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-skin-muted hover:text-skin-primary">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive(item.path) 
                  ? 'bg-skin-primary text-white shadow-md shadow-skin-primary/30' 
                  : 'text-skin-muted hover:bg-skin-surface hover:text-skin-primary hover:shadow-sm'}
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          
          <div className="pt-8 mt-8 border-t border-skin-border">
            <Link to="/booking" className="flex items-center gap-3 px-4 py-3 text-skin-muted hover:text-skin-primary hover:bg-skin-surface rounded-xl transition-colors">
               <FileText size={20} />
               <span>Ver Booking Público</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-skin-border space-y-2">
          {/* Professional Profile Summary */}
          {profile && (
             <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-skin-surface rounded-xl border border-skin-border shadow-sm">
                <img 
                    src={profile.avatarUrl} 
                    alt={profile.name}
                    className="w-10 h-10 rounded-full border border-skin-border object-cover"
                />
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-skin-base truncate">{profile.name}</p>
                    <p className="text-[10px] text-skin-primary truncate uppercase tracking-wider font-bold opacity-80">{profile.specialty}</p>
                </div>
             </div>
          )}

          <button className="flex items-center gap-3 w-full px-4 py-3 text-skin-muted hover:text-red-400 hover:bg-skin-surface rounded-xl transition-colors">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-skin-fill">
        {/* Top Header (Mobile Only) */}
        <header className="bg-skin-surface border-b border-skin-border h-16 flex items-center px-4 lg:hidden flex-shrink-0 sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="text-skin-base">
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-skin-base">PsiManager</span>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;