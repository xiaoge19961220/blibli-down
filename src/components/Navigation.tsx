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
  activeTab: 'search' | 'extractor' | 'downloads' | 'library' | 'settings';
  setActiveTab: (tab: 'search' | 'extractor' | 'downloads' | 'library' | 'settings') => void;
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
      id: 'search' as const, 
      label: '视频搜索', 
      icon: Search,
      badge: null 
    },
    { 
      id: 'extractor' as const, 
      label: '视频提取', 
      icon: Sparkles,
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
          {/* Logo representation - BiliArchiver Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bili-pink to-[#00A1D6] p-[1.5px] shadow-lg shadow-bili-pink/10 shrink-0">
            <div className="w-full h-full bg-[#111319] rounded-[9px] flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute w-1.5 h-1 bg-bili-pink rounded-t-sm -top-0.5"></div>
              <div className="w-6.5 h-5 border border-slate-300 rounded flex items-center justify-center relative">
                {/* Antennas */}
                <div className="absolute -top-1 -left-0.5 w-1.5 h-0.5 bg-slate-400 rotate-[-30deg]"></div>
                <div className="absolute -top-1 -right-0.5 w-1.5 h-0.5 bg-slate-400 rotate-[30deg]"></div>
                {/* Screen elements */}
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[5px] font-bold text-bili-pink leading-none tracking-tighter scale-95">Bili</span>
                  <span className="text-[4px] font-bold text-[#00A1D6] leading-none tracking-tighter scale-75 -mt-0.5">Arc</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-xs font-black text-white tracking-wide font-sans">BiliArchiver</h1>
            <p className="text-[9px] text-bili-pink font-bold font-sans">哔哩归档大师</p>
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
        <p className="text-slate-700">v1.0.2 • Desktop Engine</p>
      </div>
    </aside>
  );
}
