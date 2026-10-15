const STATUS_LABELS = {
  active: '执行中', paused: '暂停中', blocked: '等待处理', usageLimited: '等待处理', budgetLimited: '等待处理', complete: '已完成',
};

export function calculateProgress(plan = [], goalStatus = null) {
  if (goalStatus === 'complete') return { available: true, completed: 1, total: 1, percent: 100 };
  if (!Array.isArray(plan) || plan.length === 0) return { available: false, completed: 0, total: 0, percent: null };
  const completed = plan.filter((step) => step?.status === 'completed').length;
  return { available: true, completed, total: plan.length, percent: Math.round((completed / plan.length) * 100) };
}

export function selectTokenTotal(goal = null, tokenUsage = null) {
  if (Number.isFinite(goal?.tokensUsed)) return goal.tokensUsed;
  const total = tokenUsage?.total?.totalTokens;
  return Number.isFinite(total) ? total : null;
}

export function formatTokenTotal(value) {
  if (!Number.isFinite(value)) return '暂无数据';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 100_000) return `${Math.round(value).toLocaleString('en-US')}`;
  return Math.round(value).toLocaleString('en-US');
}

function roundMinutes(value) {
  if (value < 60) return Math.max(1, Math.round(value));
  return Math.max(60, Math.round(value / 5) * 5);
}

function durationLabel(minutes) {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} 小时` : `${hours.toFixed(1).replace(/\.0$/, '')} 小时`;
}

function durationRangeLabel(low, high) {
  if (high < 60) return `${low}–${high} 分钟`;
  const lowHours = low / 60;
  const highHours = high / 60;
  const formatHours = (hours) => hours.toFixed(1).replace(/\.0$/, '');
  return `${formatHours(lowHours)}–${formatHours(highHours)} 小时`;
}

export function calculateEta(elapsedSeconds, progress, goalStatus = null) {
  if (goalStatus === 'complete') return { available: true, label: '已完成' };
  if (['blocked', 'usageLimited', 'budgetLimited'].includes(goalStatus)) return { available: false, label: '等待处理' };
  const p = progress?.percent;
  if (!progress?.available || !Number.isFinite(p) || p <= 0 || p >= 100 || !Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    return { available: false, label: '暂无估算' };
  }
  const central = (elapsedSeconds / 60) * (100 - p) / p;
  const low = roundMinutes(central * 0.75);
  const high = Math.max(low, roundMinutes(central * 1.25));
  return { available: true, label: `约 ${durationRangeLabel(low, high)}` };
}

export function buildViewModel({ goal = null, plan = [], tokenUsage = null } = {}) {
  const goalStatus = goal?.status ?? 'unknown';
  const progress = calculateProgress(plan, goalStatus);
  const tokenTotal = selectTokenTotal(goal, tokenUsage);
  return {
    threadId: goal?.threadId ?? null,
    goalStatus,
    statusLabel: STATUS_LABELS[goalStatus] ?? '未连接',
    progress,
    tokens: { available: tokenTotal !== null, total: tokenTotal, formatted: formatTokenTotal(tokenTotal) },
    eta: calculateEta(goal?.timeUsedSeconds, progress, goalStatus),
    updatedAt: goal?.updatedAt ?? null,
  };
}
