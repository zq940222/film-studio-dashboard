import { useEffect, useRef, useState } from 'react';

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* 保留状态码 */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

/** 3s 轮询：页面隐藏时暂停，恢复可见立即刷一次 */
export function usePoll<T>(url: string | null, intervalMs = 3000): {
  data: T | null;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const urlRef = useRef(url);
  urlRef.current = url;

  useEffect(() => {
    if (!url) {
      setData(null);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const result = await fetchJson<T>(url);
        if (alive && urlRef.current === url) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (alive && urlRef.current === url) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) timer = setTimeout(loop, intervalMs);
      }
    };
    const loop = () => {
      if (document.hidden) {
        timer = setTimeout(loop, intervalMs);
      } else {
        void load();
      }
    };
    void load();
    const onVisible = () => {
      if (!document.hidden) {
        if (timer) clearTimeout(timer);
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [url, intervalMs, tick]);

  return { data, error, reload: () => setTick((t) => t + 1) };
}

export function mediaUrl(relPath: string): string {
  return `/media/${relPath.split('/').map(encodeURIComponent).join('/')}`;
}
