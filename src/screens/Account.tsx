import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { CloudSync } from '@/components/account/CloudSync';

/** Dedicated account/sign-in screen — one tap from Profile. */
export function Account() {
  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Account" subtitle="Sign in to back up & sync" back="/profile" />
      <CloudSync heading={false} />
      <p className="px-1 text-xs text-content-faint">
        BodyOS works fully offline without an account. Signing in only backs up your training and syncs it across your
        devices. Progress photos always stay on this device.
      </p>
    </div>
  );
}
