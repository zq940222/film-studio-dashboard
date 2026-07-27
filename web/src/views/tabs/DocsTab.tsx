import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ProjectDetail } from '../../../../shared/types';
import { fetchJson } from '../../api';

export function DocsTab({ detail }: { detail: ProjectDetail }) {
  const groups = detail.docs;
  const firstFile = groups[0]?.files[0]?.path ?? null;
  const [selected, setSelected] = useState<string | null>(firstFile);
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setError(null);
    fetchJson<{ content: string }>(`/api/doc?p=${encodeURIComponent(selected)}`)
      .then((d) => alive && setContent(d.content))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [selected]);

  if (groups.length === 0) {
    return (
      <div className="empty card">
        还没有文档——剧本、分镜、审片报告、交付说明等 markdown 会随创作进度出现在这里。
      </div>
    );
  }
  return (
    <div className="docs-layout">
      <nav className="docs-nav" aria-label="文档目录">
        {groups.map((g) => (
          <div key={g.group}>
            <h4>{g.group}</h4>
            {g.files.map((f) => (
              <button
                key={f.path}
                className={selected === f.path ? 'active' : ''}
                onClick={() => setSelected(f.path)}
                title={f.path}
              >
                {f.name}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="card markdown">
        {error ? (
          <span className="dim">读取失败：{error}</span>
        ) : selected ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
          <span className="dim">选择左侧文档查看</span>
        )}
      </div>
    </div>
  );
}
