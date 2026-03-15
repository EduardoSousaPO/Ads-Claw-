import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Bell, Search, Terminal } from 'lucide-react';

const MainLayout = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clients', label: 'Clientes', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-[#0c0c0e] text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col glass z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Terminal size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">AdsClaw</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Agency Cockpit</p>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-6">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-blue-400' : 'group-hover:text-white'} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all">
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 glass shrink-0">
          <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 w-96 gap-2">
            <Search size={18} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="Pesquisar clientes ou métricas..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-300 placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#0c0c0e]"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">Agência AdsClaw</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Admin Account</p>
              </div>
              <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700"></div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {/* Background blobs for aesthetics */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
