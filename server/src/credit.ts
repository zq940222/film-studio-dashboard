import { exec } from 'node:child_process';
import type { CreditResponse } from '../../shared/types.js';

/**
 * 仪表盘唯一的 CLI 调用：`dreamina user_credit`（只读查询）。
 * 固定命令、无用户输入拼接；失败降级为 ok:false，不影响其他观测。
 */
export function fetchCredit(): Promise<CreditResponse> {
  return new Promise((resolve) => {
    exec('dreamina user_credit', { timeout: 20_000, windowsHide: true }, (error, stdout, stderr) => {
      const raw = `${stdout ?? ''}${stderr ? `\n${stderr}` : ''}`.trim();
      if (error) {
        resolve({
          ok: false,
          balance: null,
          raw,
          checkedAt: Date.now(),
          error: raw || error.message,
        });
        return;
      }
      resolve({ ok: true, balance: parseBalance(raw), raw, checkedAt: Date.now() });
    });
  });
}

/** 尽力从 CLI 输出解析余额数字；解析不出时 balance 为 null，前端展示原文 */
function parseBalance(raw: string): number | null {
  // 优先找带关键词的行（credit/积分/余额），再退化为全文第一个独立数字
  const lines = raw.split(/\r?\n/);
  const keyed = lines.find((l) => /credit|积分|余额|balance/i.test(l));
  const source = keyed ?? raw;
  const m = source.match(/(\d[\d,]*)(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
