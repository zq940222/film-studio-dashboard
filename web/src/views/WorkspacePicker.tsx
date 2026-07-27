import { useCallback, useState } from 'react';
import type { FsListResponse, StateResponse } from '../../../shared/types';
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
  const [browsing, setBrowsing] = useState(false);
  const [listing, setListing] = useState<FsListResponse | null>(null);
  const [browseErr, setBrowseErr] = useState<string | null>(null);

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

  const browseTo = useCallback(async (dir?: string) => {
    setBrowseErr(null);
    try {
      const q = dir ? `?dir=${encodeURIComponent(dir)}` : '';
      setListing(await fetchJson<FsListResponse>(`/api/fs${q}`));
    } catch (e) {
      setBrowseErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const toggleBrowse = () => {
    const next = !browsing;
    setBrowsing(next);
    if (next && !listing) void browseTo();
  };

  return (
    <div className="picker card">
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconClapper size={26} />
        选择工作目录
      </h1>
      <p className="dim" style={{ margin: 0 }}>
        选择 film-studio 工作区根目录（由 <code className="code">/new-drama</code> 初始化、含{' '}
        <code className="code">projects/</code> 的那一层）。仪表盘对工作区<b>严格只读</b>
        ：不触发生成、不确认门禁、不改任何文件。
      </p>
      <div className="picker__row">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && path.trim() && void activate(path)}
          placeholder="浏览选择，或粘贴：D:\Drama-Workspace 或 /Users/me/drama-workspace"
          aria-label="工作目录路径"
          autoFocus
        />
        <button
          className="btn btn--primary"
          disabled={busy || !path.trim()}
          onClick={() => void activate(path)}
        >
          {busy ? '校验中…' : '打开'}
        </button>
      </div>

      <button
        className="btn"
        onClick={toggleBrowse}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
      >
        <IconFolder />
        {browsing ? '收起浏览' : '浏览…'}
      </button>

      {browsing && listing && (
        <div
          className="picker__browse"
          style={{
            border: '1px solid var(--border, #2a2a2a)',
            borderRadius: 8,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn"
              disabled={!listing.parent}
              onClick={() => listing.parent && void browseTo(listing.parent)}
              title="上一级"
            >
              ↑ 上级
            </button>
            <code
              className="code"
              title={listing.path}
              style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {listing.path}
            </code>
          </div>

          {browseErr && <div className="picker__error">✕ {browseErr}</div>}

          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {listing.entries.length === 0 && <div className="dim">（无子目录）</div>}
            {listing.entries.map((e) => (
              <div key={e.path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => void browseTo(e.path)}
                  title={`进入 ${e.name}`}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    padding: '6px 4px',
                    cursor: 'pointer',
                    minWidth: 0,
                  }}
                >
                  <IconFolder />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.name}
                  </span>
                  {e.isWorkspace && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '1px 6px',
                        borderRadius: 999,
                        background: 'var(--accent-soft, #1f3a2e)',
                        color: 'var(--accent, #4ade80)',
                        flexShrink: 0,
                      }}
                    >
                      工作区
                    </span>
                  )}
                </button>
                {e.isWorkspace && (
                  <button className="btn" disabled={busy} onClick={() => void activate(e.path)}>
                    选择
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="dim" style={{ flex: 1, fontSize: 12 }}>
              {listing.isWorkspace ? '当前目录是有效工作区' : '进入含 projects/ 的目录，或直接选择工作区'}
            </span>
            <button
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void activate(listing.path)}
            >
              选择此目录
            </button>
          </div>
        </div>
      )}

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
