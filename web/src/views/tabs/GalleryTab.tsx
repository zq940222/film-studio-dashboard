import { useState } from 'react';
import type { FileEntry, ProjectDetail } from '../../../../shared/types';
import { mediaUrl, usePoll } from '../../api';
import { Lightbox } from '../../ui';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Section({
  title,
  files,
  onZoom,
}: {
  title: string;
  files: FileEntry[];
  onZoom: (src: string) => void;
}) {
  if (files.length === 0) return null;
  return (
    <section className="gallery-section">
      <h3>
        {title}（{files.length}）
      </h3>
      <div className="grid-gallery">
        {files.map((f) => (
          <figure key={f.path} className="gallery-item" style={{ margin: 0 }} onClick={() => onZoom(mediaUrl(f.path))}>
            <img src={mediaUrl(f.path)} alt={f.name} loading="lazy" />
            <figcaption title={f.name}>{f.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function StyleBible({ path }: { path: string }) {
  const { data } = usePoll<{ content: string }>(`/api/doc?p=${encodeURIComponent(path)}`, 30_000);
  const [open, setOpen] = useState(false);
  return (
    <section className="gallery-section">
      <h3>
        style-bible（风格锁 · 全剧单一真源）{' '}
        <button className="btn btn--ghost" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setOpen(!open)}>
          {open ? '收起' : '展开'}
        </button>
      </h3>
      {open && (
        <div className="card markdown">
          {data ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown> : '读取中…'}
        </div>
      )}
    </section>
  );
}

export function GalleryTab({ detail }: { detail: ProjectDetail }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const d = detail.design;
  const empty =
    !d.styleBible && d.characters.length === 0 && d.scenes.length === 0 && d.keyframes.length === 0;

  if (empty) {
    return (
      <div className="empty card">
        还没有设定图——<code className="code">/design</code> 出图后这里会展示角色三视图、场景与关键帧。
      </div>
    );
  }
  return (
    <div>
      {d.styleBible && <StyleBible path={d.styleBible} />}
      <Section title="角色设定 characters" files={d.characters} onZoom={setZoom} />
      <Section title="场景设定 scenes" files={d.scenes} onZoom={setZoom} />
      <Section title="镜头关键帧 keyframes" files={d.keyframes} onZoom={setZoom} />
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
