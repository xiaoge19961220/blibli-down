import React from 'react';
import { 
  Search, 
  Download, 
  Film, 
  Settings, 
  Sparkles,
  UserCheck,
  UserX
} from 'lucide-react';

interface NavigationProps {
  activeTab: 'extractor' | 'downloads' | 'library' | 'settings';
  setActiveTab: (tab: 'extractor' | 'downloads' | 'library' | 'settings') => void;
  activeDownloadsCount: number;
  completedFilesCount: number;
  hasSessdata: boolean;
}

export default function Navigation({
  activeTab,
  setActiveTab,
  activeDownloadsCount,
  completedFilesCount,
  hasSessdata
}: NavigationProps) {
  const navItems = [
    { 
      id: 'extractor' as const, 
      label: '视频提取', 
      icon: Search,
      badge: null 
    },
    { 
      id: 'downloads' as const, 
      label: '下载中心', 
      icon: Download,
      badge: activeDownloadsCount > 0 ? (
        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-bili-pink text-white rounded-full animate-pulse">
          {activeDownloadsCount}
        </span>
      ) : null
    },
    { 
      id: 'library' as const, 
      label: '本地影音库', 
      icon: Film,
      badge: completedFilesCount > 0 ? (
        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#1C1F28] border border-[#2B2E37] text-slate-400 rounded-full">
          {completedFilesCount}
        </span>
      ) : null
    },
    { 
      id: 'settings' as const, 
      label: '账号管理', 
      icon: Settings,
      badge: hasSessdata ? (
        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <UserX className="w-4 h-4 text-amber-500 shrink-0" />
      )
    }
  ];

  return (
    <aside id="bento-sidebar" className="w-full md:w-64 bg-[#151821]/90 backdrop-blur border-b md:border-b-0 md:border-r border-[#232731] flex flex-col justify-between p-5 md:h-screen sticky top-0 z-30 shrink-0">
      <div className="space-y-6 flex flex-col h-full justify-between md:justify-start">
        {/* App Branding */}
        <div className="flex items-center space-x-3 pb-4 border-b border-[#22252E] px-2">
          <div className="w-9 h-9 rounded-xl bg-bili-pink flex items-center justify-center text-white shadow-lg shadow-bili-pink/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide font-sans">BENTO PRO</h1>
            <p className="text-[10px] text-slate-500 font-mono">LOCAL VIDEO MANAGER</p>
          </div>
        </div>

        {/* Menu list */}
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible py-2 md:py-0">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between space-x-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer shrink-0 ${
                  isActive 
                    ? 'bg-bili-pink text-white shadow-md shadow-bili-pink/15 scale-[1.02]' 
                    : 'text-slate-400 hover:text-white hover:bg-[#1C1F28]/40'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding */}
      <div className="hidden md:block pt-4 border-t border-[#22252E] px-2 text-[10px] text-slate-600 font-mono">
        <p>100% Local Processing</p>
        <p className="text-slate-700">v0.1.0 • Desktop Enabled</p>
      </div>
    </aside>
  );
}
