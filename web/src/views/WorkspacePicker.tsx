import { useState } from 'react';
import type { StateResponse } from '../../../shared/types';
import { fetchJson } from '../api';
import { IconClapper, IconFolder } from '../ui';

export function WorkspacePicker({
  state,
  onSelected,
}: {
  state: StateResponse;
  onSelected: () => void;
}) {
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activate = async (p: string) => {
    setBusy(true);
    setError(null);
    try {
      await fetchJson('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: p }),
      });
      onSelected();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="picker card">
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconClapper size={26} />
        选择工作目录
      </h1>
      <p className="dim" style={{ margin: 0 }}>
        粘贴 film-studio 工作区根目录（由 <code className="code">/new-drama</code> 初始化、含{' '}
        <code className="code">projects/</code> 的那一层）。仪表盘对工作区<b>严格只读</b>
        ：不触发生成、不确认门禁、不改任何文件。
      </p>
      <div className="picker__row">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && path.trim() && void activate(path)}
          placeholder="例：D:\Drama-Workspace 或 /Users/me/drama-workspace"
          aria-label="工作目录路径"
          autoFocus
        />
        <button className="btn btn--primary" disabled={busy || !path.trim()} onClick={() => void activate(path)}>
          {busy ? '校验中…' : '打开'}
        </button>
      </div>
      {error && <div className="picker__error">✕ {error}</div>}
      {state.recent.length > 0 && (
        <div className="picker__recent">
          <h4 className="dim" style={{ margin: 0, fontSize: 12 }}>
            最近使用
          </h4>
          {state.recent.map((r) => (
            <button key={r} onClick={() => void activate(r)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IconFolder />
                {r}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
