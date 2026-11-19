/**
 * Formatting utilities for file sizes, dates, and media status
 */

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatStatus(status) {
  switch (status) {
    case 'WAITING':
    case 'waiting':
      return { label: 'Waiting', color: '#F59E0B' };
    case 'PROCESSING':
    case 'processing':
    case 'processing_link':
      return { label: 'Processing link', color: '#3B82F6' };
    case 'RESOLVING':
    case 'resolving':
    case 'resolving_media':
      return { label: 'Resolving media', color: '#8B5CF6' };
    case 'DOWNLOADING':
    case 'downloading':
      return { label: 'Downloading', color: '#3B82F6' };
    case 'COMPLETED':
    case 'completed':
      return { label: 'Completed', color: '#10B981' };
    case 'FAILED':
    case 'failed':
      return { label: 'Failed', color: '#EF4444' };
    default:
      return { label: status || 'Idle', color: '#9CA3AF' };
  }
}
