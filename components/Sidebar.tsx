import React from 'react';
import { LayoutDashboard, FileText, CheckCircle, Settings, HelpCircle, ShieldCheck } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-10">
      <div className="p-6 flex items-center gap-2 border-b border-slate-100">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">SubsidySmart</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors">
          <LayoutDashboard className="w-5 h-5" />
          ダッシュボード
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-medium transition-colors">
          <FileText className="w-5 h-5" />
          書類管理
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-medium transition-colors">
          <CheckCircle className="w-5 h-5" />
          申請ステータス
        </a>
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-1">
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors">
          <Settings className="w-5 h-5" />
          設定
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors">
          <HelpCircle className="w-5 h-5" />
          ヘルプセンター
        </a>
      </div>
    </aside>
  );
};