import { useState } from 'react';
import { Lock } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (pw: string) => Promise<boolean> }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    const ok = await onLogin(pw);
    if (!ok) setErr('密码错误');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <form onSubmit={submit} className="card p-8 w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <Lock className="text-indigo-600 dark:text-indigo-400" size={22} />
          </div>
          <h1 className="text-lg font-bold">ClawPanel</h1>
          <p className="text-xs text-gray-500">输入管理密码登录</p>
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="管理密码" className="input" autoFocus />
        {err && <p className="text-red-500 text-xs">{err}</p>}
        <button type="submit" disabled={loading || !pw} className="btn-primary w-full">
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}
