/**
 * Deliver generated files to the user. On iOS the Web Share sheet ("Save to
 * Files", AirDrop, Mail…) is by far the most reliable path in standalone mode;
 * elsewhere we fall back to a classic download.
 */
export async function deliverFiles(files: { name: string; data: BlobPart; type: string }[]): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const fileObjs = files.map((f) => new File([f.data], f.name, { type: f.type }));

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: fileObjs })) {
    try {
      await navigator.share({ files: fileObjs, title: 'Loop Habits export' });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // Fall through to download (e.g. NotAllowedError without user activation).
    }
  }

  for (const f of fileObjs) {
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  return 'downloaded';
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
