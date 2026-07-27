import { useState } from 'react';
import type { EpisodeInfo, ProjectDetail, Shot } from '../../../../shared/types';
import { mediaUrl } from '../../api';
import { Lightbox, SHOT_STATUS_LABEL } from '../../ui';

function ShotCard({ shot, onPlay }: { shot: Shot; onPlay: (src: string) => void }) {
  const status = shot.status ?? 'pending';
  return (
    <article className={`card shot-card shot-card--${status}`}>
      <div className="shot-card__head">
        <span className={`status-dot status-dot--${status}`} aria-hidden />
        <span className="shot-card__id">{shot.id}</span>
        <span className="chip">{SHOT_STATUS_LABEL[status] ?? status}</span>
        <div style={{ flex: 1 }} />
        {typeof shot.duration === 'number' && <span className="dim mono" style={{ fontSize: 11 }}>{shot.duration}s</span>}
      </div>
      {shot.file && (
        <video
          src={mediaUrl(shot.file)}
          preload="metadata"
          muted
          onClick={() => onPlay(mediaUrl(shot.file!))}
          title="点击放大播放"
        />
      )}
      {shot.prompt && <p className="shot-card__prompt">{shot.prompt}</p>}
      <div className="shot-card__meta">
        {shot.mode && <span className="chip">{shot.mode}</span>}
        {shot.model && <span className="chip">{shot.model}</span>}
        {shot.resolution && <span className="chip">{shot.resolution}</span>}
        {shot.silent && <span className="chip">静音镜（精剪补音）</span>}
      </div>
      {typeof shot.fail_reason === 'string' && shot.fail_reason && (
        <div style={{ fontSize: 12, color: 'var(--status-failed)' }}>{shot.fail_reason}</div>
      )}
      {shot.submit_id && (
        <div className="dim mono" style={{ fontSize: 11, overflowWrap: 'anywhere' }}>
          submit_id: {shot.submit_id}
        </div>
      )}
    </article>
  );
}

function EpisodeBlock({ ep, onPlay }: { ep: EpisodeInfo; onPlay: (src: string) => void }) {
  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <h3 className="mono dim" style={{ fontSize: 14, margin: '0 0 var(--space-3)' }}>
        {ep.ep} · {ep.counts.success}/{ep.counts.total} 收货
        {ep.counts.submitted > 0 && ` · ${ep.counts.submitted} 生成中`}
        {ep.counts.failed > 0 && ` · ${ep.counts.failed} 失败`}
        {ep.srt && ' · 有字幕'}
        {ep.bgm.length > 0 && ` · BGM×${ep.bgm.length}`}
      </h3>
      {ep.shots.length === 0 ? (
        <div className="empty card">该集还没有 shotlist</div>
      ) : (
        <div className="grid-shots">
          {ep.shots.map((s) => (
            <ShotCard key={s.id} shot={s} onPlay={onPlay} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ShotsTab({ detail }: { detail: ProjectDetail }) {
  const eps = detail.episodesInfo;
  const [selected, setSelected] = useState<string | 'all'>(eps.length === 1 ? eps[0].ep : 'all');
  const [playing, setPlaying] = useState<string | null>(null);

  if (eps.length === 0) {
    return (
      <div className="empty card">
        还没有任何镜头——走完 <code className="code">/storyboard</code> 与 <code className="code">/shoot</code> 后这里会出现每一镜的状态与成片。
      </div>
    );
  }
  const shown = selected === 'all' ? eps : eps.filter((e) => e.ep === selected);
  return (
    <div>
      {eps.length > 1 && (
        <div className="ep-select" role="tablist" aria-label="选择剧集">
          <button className={`btn ${selected === 'all' ? 'btn--primary' : ''}`} onClick={() => setSelected('all')}>
            全部
          </button>
          {eps.map((e) => (
            <button
              key={e.ep}
              className={`btn ${selected === e.ep ? 'btn--primary' : ''}`}
              onClick={() => setSelected(e.ep)}
            >
              {e.ep}
            </button>
          ))}
        </div>
      )}
      {shown.map((e) => (
        <EpisodeBlock key={e.ep} ep={e} onPlay={setPlaying} />
      ))}
      {playing && <Lightbox src={playing} video onClose={() => setPlaying(null)} />}
    </div>
  );
}
