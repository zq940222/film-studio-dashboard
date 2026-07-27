import type { ProjectDetail } from '../../../../shared/types';
import { mediaUrl } from '../../api';

export function AudioTab({ detail }: { detail: ProjectDetail }) {
  const eps = detail.episodesInfo.filter((e) => e.audio.length > 0);
  const total = eps.reduce((n, e) => n + e.audio.length, 0);

  if (total === 0) {
    return (
      <div className="empty card">
        还没有音频——配乐（<code className="code">/music</code>，Suno BGM）产出后，音频会落在{' '}
        <code className="code">04-footage/epNN/bgm/</code>，这里可以逐条试听。
      </div>
    );
  }

  return (
    <div>
      {eps.map((e) => (
        <section key={e.ep} className="gallery-section">
          <h3>
            {e.ep} · 音频 ×{e.audio.length}
          </h3>
          <div className="audio-list">
            {e.audio.map((a) => (
              <article key={a.path} className="card audio-item">
                <div className="audio-item__meta">
                  <span className="mono" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
                    {a.name}
                  </span>
                  <span className="dim mono" style={{ fontSize: 12, flexShrink: 0 }}>
                    {(a.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                {/* preload=none：不一次性加载所有音频；点开才拉流（/media 支持 Range） */}
                <audio controls preload="none" src={mediaUrl(a.path)} style={{ width: '100%' }} />
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
