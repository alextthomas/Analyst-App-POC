export const SANDBOX_BANNER_TEXT = 'SANDBOX - synthetic data only, do not enter real personal data';

/** Shown only when the build-time flag VITE_SANDBOX_BANNER is exactly "true". */
export function SandboxBanner({ enabled }: { enabled: string | undefined }): JSX.Element | null {
  if (enabled !== 'true') return null;
  return (
    <div role="status" className="sandbox-banner">
      {SANDBOX_BANNER_TEXT}
    </div>
  );
}
