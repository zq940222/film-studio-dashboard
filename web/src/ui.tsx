import { useEffect, useState, type ReactNode } from 'react';
import type { ShotCounts, StageKey, StageStatus } from '../../shared/types';
import { STAGE_ORDER } from '../../shared/types';

export const STAGE_LABEL: Record<StageKey, string> = {
  script: '剧本',
  storyboard: '分镜',
  design: '设定',
  footage: '生成',
  final: '成片',
};

export const MEDIUM_LABEL: Record<string, string> = {
  'short-drama': '短剧',
  'short-film': '电影短片',
  anime: '动漫番剧',
};

export const SHOT_STATUS_LABEL: Record<string, string> = {
  pending: '待生成',
  submitted: '生成中',
  success: '已收货',
  failed: '失败',
};

/* ---------- 图标（内联 SVG，不用 emoji） ---------- */
export function IconClapper({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 2v2h2V6H6zm0 4v2h2v-2H6zm0 4v2h2v-2H6zm10-8v2h2V6h-2zm0 4v2h2v-2h-2zm0 4v2h2v-2h-2zM10 6v5l4.5-2.5L10 6z" />
    </svg>
  );
}

export function IconCopy({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export function IconRefresh({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function IconFolder({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

export function IconBack({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

/* ---------- 复制按钮（轻操作：复制建议命令） ---------- */
export function CopyButton({ text, children }: { text: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      className="btn btn--ghost"
      style={{ padding: '2px 8px', fontSize: 12 }}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
      title={`复制 ${text}`}
    >
      <IconCopy />
      {copied ? '已复制' : (children ?? '复制')}
    </button>
  );
}

/* ---------- 阶段进度条 ---------- */
export function Stages({ stages }: { stages: Record<StageKey, StageStatus> }) {
  return (
    <div className="stages" role="img" aria-label="阶段进度">
      {STAGE_ORDER.map((key) => (
        <div key={key} className={`stage stage--${stages[key]}`} title={`${STAGE_LABEL[key]}：${stages[key]}`}>
          <i />
          {STAGE_LABEL[key]}
        </div>
      ))}
    </div>
  );
}

/* ---------- 镜头四态分布条 ---------- */
export function ShotBar({ counts }: { counts: ShotCounts }) {
  if (counts.total === 0) return <div className="shotbar" title="尚无镜头" />;
  const seg = (n: number, color: string, label: string) =>
    n > 0 ? (
      <i key={label} style={{ width: `${(n / counts.total) * 100}%`, background: color }} title={`${label} ${n}`} />
    ) : null;
  return (
    <div className="shotbar" role="img" aria-label={`镜头 ${counts.success}/${counts.total} 完成`}>
      {seg(counts.success, 'var(--status-success)', '已收货')}
      {seg(counts.submitted, 'var(--status-submitted)', '生成中')}
      {seg(counts.failed, 'var(--status-failed)', '失败')}
      {seg(counts.pending, 'var(--status-pending)', '待生成')}
    </div>
  );
}

/* ---------- 灯箱 ---------- */
export function Lightbox({ src, video, onClose }: { src: string; video?: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="lightbox" onClick={onClose}>
      {video ? (
        <video src={src} controls autoPlay onClick={(e) => e.stopPropagation()} />
      ) : (
        <img src={src} alt="预览" onClick={(e) => e.stopPropagation()} />
      )}
    </div>
  );
}
