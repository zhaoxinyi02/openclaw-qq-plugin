import { Brain, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  configured: boolean;
  children: React.ReactNode;
}

export default function OpenClawRequired({ configured, children }: Props) {
  const [installing, setInstalling] = useState(false);

  if (configured) return <>{children}</>;

  const handleInstall = async () => {
    setInstalling(true);
    try { await api.installSoftware('openclaw'); } catch {}
    finally { setInstalling(false); }
  };

  return (
    <div className="relative">
      {/* Greyed out content */}
      <div className="opacity-20 pointer-events-none select-none blur-[2px]">
        {children}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-md text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Brain size={28} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">需要安装 OpenClaw</h3>
            <p className="text-sm text-gray-500 mt-1">
              此功能需要 OpenClaw AI 引擎。请先安装 OpenClaw 后再使用。
            </p>
          </div>
          <button onClick={handleInstall} disabled={installing}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-all shadow-lg shadow-violet-200 dark:shadow-none">
            {installing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {installing ? '安装中...' : '一键安装 OpenClaw'}
          </button>
          <p className="text-[11px] text-gray-400">安装进度可在左下角「消息中心」实时查看</p>
        </div>
      </div>
    </div>
  );
}
