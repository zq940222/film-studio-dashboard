import type { OverviewResponse, ProjectSummary } from '../../../shared/types';
import { usePoll } from '../api';
import { CopyButton, MEDIUM_LABEL, ShotBar, Stages } from '../ui';

function ProjectCard({ p, onOpen }: { p: ProjectSummary; onOpen: () => void }) {
  return (
    <article
      className="card project-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
    >
      <div className="project-card__head">
        <h2 className="project-card__title">{p.title}</h2>
        <span className="chip">{MEDIUM_LABEL[p.medium] ?? p.medium}</span>
        <span className="chip">{p.ratio}</span>
      </div>
      {p.styleName && (
        <div className="dim" style={{ fontSize: 12 }}>
          画风 · {p.styleName}
        </div>
      )}
      <Stages stages={p.stages} />
      <div>
        <div className="dim" style={{ fontSize: 12, marginBottom: 4 }}>
          镜头 {p.shotCounts.success}/{p.shotCounts.total}
          {p.shotCounts.submitted > 0 && ` · ${p.shotCounts.submitted} 生成中`}
          {p.shotCounts.failed > 0 && ` · ${p.shotCounts.failed} 失败`}
        </div>
        <ShotBar counts={p.shotCounts} />
      </div>
      <div className="next-step">
        <span className="dim">下一步</span>
        <code className="code">{p.nextStep.command}</code>
        <span className="dim">{p.nextStep.label}</span>
        {p.nextStep.gate && <span className="chip chip--gate">{p.nextStep.gate}</span>}
        <CopyButton text={p.nextStep.command} />
      </div>
      <div className="dim mono" style={{ fontSize: 11 }}>
        已耗积分 {p.creditsSpent}
        {p.created ? ` · 建于 ${p.created}` : ''} · {p.episodes} 集
      </div>
    </article>
  );
}

export function Overview({ onOpenProject }: { onOpenProject: (dir: string) => void }) {
  const { data, error } = usePoll<OverviewResponse>('/api/overview');

  if (error) return <div className="empty card">总览加载失败：{error}</div>;
  if (!data) return <div className="empty">扫描工作区中…</div>;
  if (data.projects.length === 0) {
    return (
      <div className="empty card">
        工作区还没有项目——回到 Claude Code 里运行 <code className="code">/new-drama</code> 建项后，这里会自动出现。
      </div>
    );
  }
  return (
    <div className="grid-projects">
      {data.projects.map((p) => (
        <ProjectCard key={p.dir} p={p} onOpen={() => onOpenProject(p.dir)} />
      ))}
    </div>
  );
}
