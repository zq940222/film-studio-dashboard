import { useMemo, useState } from 'react';
import type { ProjectDetail } from '../../../shared/types';
import { usePoll } from '../api';
import { CopyButton, IconBack, MEDIUM_LABEL, ShotBar, Stages } from '../ui';
import { AudioTab } from './tabs/AudioTab';
import { DocsTab } from './tabs/DocsTab';
import { FinalsTab } from './tabs/FinalsTab';
import { GalleryTab } from './tabs/GalleryTab';
import { ShotsTab } from './tabs/ShotsTab';

const TABS = [
  { key: 'shots', label: '镜头' },
  { key: 'gallery', label: '设定图' },
  { key: 'audio', label: '音频' },
  { key: 'docs', label: '文档' },
  { key: 'finals', label: '成片与发布' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function Project({ dir, onBack }: { dir: string; onBack: () => void }) {
  const { data, error } = usePoll<ProjectDetail>(`/api/project/${encodeURIComponent(dir)}`);
  const [tab, setTab] = useState<TabKey>('shots');

  const body = useMemo(() => {
    if (!data) return null;
    switch (tab) {
      case 'shots':
        return <ShotsTab detail={data} />;
      case 'gallery':
        return <GalleryTab detail={data} />;
      case 'audio':
        return <AudioTab detail={data} />;
      case 'docs':
        return <DocsTab detail={data} />;
      case 'finals':
        return <FinalsTab detail={data} />;
    }
  }, [data, tab]);

  if (error) return <div className="empty card">项目加载失败:{error}</div>;
  if (!data) return <div className="empty">读取项目中…</div>;

  return (
    <div>
      <div className="page-head">
        <button className="btn btn--ghost" onClick={onBack} aria-label="返回总览">
          <IconBack />
          总览
        </button>
        <h1>{data.title}</h1>
        <span className="chip">{MEDIUM_LABEL[data.medium] ?? data.medium}</span>
        <span className="chip">{data.ratio}</span>
        {data.styleName && <span className="chip">画风 · {data.styleName}</span>}
        <div className="topbar__spacer" />
        <span className="dim" style={{ fontSize: 13 }}>
          下一步 <code className="code">{data.nextStep.command}</code>
        </span>
        {data.nextStep.gate && <span className="chip chip--gate">{data.nextStep.gate}</span>}
        <CopyButton text={data.nextStep.command} />
      </div>

      <div style={{ maxWidth: 560, marginBottom: 'var(--space-5)' }}>
        <Stages stages={data.stages} />
        <div style={{ marginTop: 8 }}>
          <ShotBar counts={data.shotCounts} />
        </div>
      </div>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {body}
    </div>
  );
}
