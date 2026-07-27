import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ProjectDetail } from '../../../../shared/types';
import { fetchJson, mediaUrl } from '../../api';
import { Lightbox } from '../../ui';

function PublishCard({ ep, copy, cover, log }: ProjectDetail['publish'][number]) {
  const [copyText, setCopyText] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  const loadCopy = () => {
    if (!copy || copyText !== null) return;
    void fetchJson<{ content: string }>(`/api/doc?p=${encodeURIComponent(copy)}`).then((d) =>
      setCopyText(d.content),
    );
  };

  return (
    <article className="card final-card">
      <h3 className="mono" style={{ margin: 0, fontSize: 14 }}>
        {ep} 发布物料
      </h3>
      {cover && (
        <img
          src={mediaUrl(cover)}
          alt={`${ep} 封面`}
          className="shot-thumb"
          style={{ maxHeight: 220, objectFit: 'contain' }}
          onClick={() => setZoom(mediaUrl(cover))}
          loading="lazy"
        />
      )}
      {copy && (
        <details onToggle={loadCopy}>
          <summary className="dim" style={{ cursor: 'pointer', fontSize: 13 }}>
            发布文案 copy.md
          </summary>
          <div className="markdown" style={{ padding: 'var(--space-3) 0 0' }}>
            {copyText === null ? '读取中…' : <ReactMarkdown remarkPlugins={[remarkGfm]}>{copyText}</ReactMarkdown>}
          </div>
        </details>
      )}
      {log && (
        <span className="dim" style={{ fontSize: 12 }}>
          有发布记录 publish-log.md（文档页可查看）
        </span>
      )}
      {!cover && !copy && <span className="dim">该集发布物料尚未生成</span>}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </article>
  );
}

export function FinalsTab({ detail }: { detail: ProjectDetail }) {
  const hasAny = detail.finals.length > 0 || detail.publish.length > 0 || detail.creditsSpent > 0;

  return (
    <div>
      <div className="stat-row">
        <div className="card stat">
          <b>{detail.creditsSpent}</b>
          <span>本项目累计消耗积分（project.json 记录值）</span>
        </div>
        <div className="card stat">
          <b>
            {detail.shotCounts.success}/{detail.shotCounts.total}
          </b>
          <span>镜头收货进度</span>
        </div>
        <div className="card stat">
          <b>{detail.finals.length}</b>
          <span>05-final 成片文件</span>
        </div>
      </div>

      {detail.creditsNotes && (
        <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <h3 className="mono dim" style={{ margin: '0 0 var(--space-2)', fontSize: 13 }}>
            积分消耗备注（credits.notes，用于校准单价）
          </h3>
          <pre className="mono dim" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {detail.creditsNotes}
          </pre>
        </div>
      )}

      {detail.finals.length > 0 && (
        <section className="gallery-section">
          <h3>成片（05-final）</h3>
          <div className="finals-grid">
            {detail.finals.map((f) => (
              <article key={f.path} className="card final-card">
                <video src={mediaUrl(f.path)} controls preload="metadata" />
                <span className="mono dim" style={{ fontSize: 12 }}>
                  {f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {detail.publish.length > 0 && (
        <section className="gallery-section">
          <h3>发布物料（06-publish）</h3>
          <div className="finals-grid">
            {detail.publish.map((p) => (
              <PublishCard key={p.ep} {...p} />
            ))}
          </div>
        </section>
      )}

      {!hasAny && (
        <div className="empty card">
          还没有成片或发布物料——<code className="code">/finalcut</code> 与 <code className="code">/publish</code>{' '}
          之后，这里展示成片播放、封面与文案。
        </div>
      )}
    </div>
  );
}
