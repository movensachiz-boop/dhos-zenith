import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1);

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem('maita-install-dismissed') === '1') {
      setHidden(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (isIos()) setIosHint(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('maita-install-dismissed', '1');
    setHidden(true);
  };

  if (hidden || (!deferred && !iosHint)) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[92vw] items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
      <div className="text-sm">
        <p className="font-semibold">Install Maita Cakes POS</p>
        <p className="text-muted-foreground text-xs">
          {deferred
            ? 'Add it to your device and run it like an app.'
            : 'On iPhone or iPad: tap Share, then "Add to Home Screen".'}
        </p>
      </div>
      {deferred ? (
        <Button size="sm" onClick={install}>
          <Download className="h-4 w-4 mr-2" /> Install
        </Button>
      ) : (
        <Share className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <button aria-label="Dismiss install prompt" onClick={dismiss} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
