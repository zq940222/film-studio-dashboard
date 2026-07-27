import { useCallback, useEffect, useState } from 'react';
import type { CreditResponse, StateResponse } from '../../shared/types';
import { fetchJson, usePoll } from './api';
import { IconClapper, IconFolder, IconRefresh } from './ui';
import { Overview } from './views/Overview';
import { Project } from './views/Project';
import { WorkspacePicker } from './views/WorkspacePicker';

/** hash 路由：#/ 总览，#/p/<dir> 项目详情 */
function useHashRoute(): [string, (h: string) => void] {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return [hash, (h: string) => (window.location.hash = h)];
}

function CreditChip() {
  const [credit, setCredit] = useState<CreditResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => {
    setBusy(true);
    fetchJson<CreditResponse>('/api/credit')
      .then(setCredit)
      .catch(() => setCredit(null))
      .finally(() => setBusy(false));
  }, []);

  const label = busy
    ? '查询中…'
    : credit === null
      ? '积分余额'
      : credit.ok
        ? `积分 ${credit.balance ?? '见原文'}`
        : '查询失败';

  return (
    <button
      className="chip chip--credit"
      onClick={refresh}
      title={credit?.raw || '点击调 dreamina user_credit（只读查询）'}
      aria-label="刷新即梦积分余额"
    >
      <IconRefresh />
      {label}
    </button>
  );
}

export function App() {
  const [hash, navigate] = useHashRoute();
  const { data: state, reload } = usePoll<StateResponse>('/api/state', 10_000);
  const [switching, setSwitching] = useState(false);

  if (!state) return <div className="empty">连接仪表盘服务中…</div>;

  const needPicker = switching || !state.active || !state.activeValid;
  const projectMatch = hash.match(/^#\/p\/(.+)$/);
  const projectDir = projectMatch ? decodeURIComponent(projectMatch[1]) : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <IconClapper />
          影视工作台仪表盘
        </div>
        {state.active && (
          <button
            className="topbar__workspace"
            onClick={() => setSwitching(true)}
            title="切换工作目录"
          >
            <IconFolder />
            <span>{state.active}</span>
          </button>
        )}
        <div className="topbar__spacer" />
        <span className="chip" title="仪表盘对工作区严格只读：不触发生成、不确认门禁、不改文件">
          只读观测
        </span>
        <CreditChip />
      </header>
      <main className="main">
        {needPicker ? (
          <WorkspacePicker
            state={state}
            onSelected={() => {
              setSwitching(false);
              reload();
              navigate('#/');
            }}
          />
        ) : projectDir ? (
          <Project dir={projectDir} onBack={() => navigate('#/')} />
        ) : (
          <Overview onOpenProject={(dir) => navigate(`#/p/${encodeURIComponent(dir)}`)} />
        )}
      </main>
    </div>
  );
}
