'use client';

import { useEffect, useState } from 'react';

const LICENSE_CODE = 'moain2026';
const LS_LICENSED = 'app_licensed';
const LS_INSTALL_DISMISSED = 'install_dismissed';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [licensed, setLicensed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BIPEvent | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Determine state on mount (client only)
    setLicensed(localStorage.getItem(LS_LICENSED) === '1');
    setInstalled(isStandalone());
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua));

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);

    setReady(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    }
  }

  function skipInstall() {
    localStorage.setItem(LS_INSTALL_DISMISSED, '1');
    setInstalled(true); // proceed to license step without forcing
  }

  function submitLicense(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() === LICENSE_CODE) {
      localStorage.setItem(LS_LICENSED, '1');
      setLicensed(true);
      setErr('');
    } else {
      setErr('رمز الترخيص غير صحيح. حاول مرة أخرى.');
    }
  }

  // Avoid SSR/hydration flash: render nothing until client state is known.
  if (!ready) return null;

  // Already set up → show the app.
  if (licensed) return <>{children}</>;

  const installDismissed =
    typeof window !== 'undefined' && localStorage.getItem(LS_INSTALL_DISMISSED) === '1';
  const showInstallStep = !installed && !installDismissed;

  return (
    <div className="gate-root" dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .gate-root{position:fixed;inset:0;z-index:9999;font-family:'Cairo','Tahoma',sans-serif;
          background:linear-gradient(160deg,#0b1437 0%,#13205a 45%,#1b2d7a 100%);
          display:flex;align-items:center;justify-content:center;padding:22px;overflow-y:auto;}
        .gate-card{width:100%;max-width:420px;background:rgba(255,255,255,.06);backdrop-filter:blur(14px);
          border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:34px 26px;text-align:center;
          box-shadow:0 24px 60px -12px rgba(0,0,0,.55);}
        .gate-logo{width:120px;height:120px;margin:0 auto 18px;
          display:flex;align-items:center;justify-content:center;
          filter:drop-shadow(0 10px 24px rgba(0,0,0,.4));}
        .gate-logo img{width:120px;height:120px;object-fit:contain;}
        .gate-title{color:#fff;font-weight:800;font-size:23px;margin:4px 0 6px;}
        .gate-sub{color:#aebbe6;font-size:14px;line-height:1.7;margin-bottom:24px;}
        .gate-btn{display:block;width:100%;border:none;border-radius:14px;padding:15px;font-family:inherit;
          font-weight:800;font-size:16px;cursor:pointer;margin-top:12px;transition:.15s;}
        .gate-btn-gold{background:linear-gradient(180deg,#f0d066,#d4af37,#b8941f);color:#2a2102;
          box-shadow:0 8px 22px -6px rgba(212,175,55,.6);}
        .gate-btn-gold:active{transform:translateY(1px);}
        .gate-btn-ghost{background:transparent;color:#aebbe6;font-weight:600;font-size:13px;box-shadow:none;}
        .gate-input{width:100%;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);
          color:#fff;border-radius:14px;padding:15px 16px;font-family:inherit;font-size:17px;text-align:center;
          letter-spacing:1px;outline:none;direction:ltr;}
        .gate-input:focus{border-color:#e7c65a;}
        .gate-input::placeholder{color:#8a97c9;letter-spacing:0;}
        .gate-err{color:#ff9a9a;font-size:13px;font-weight:700;margin-top:10px;}
        .gate-steps{display:flex;gap:6px;justify-content:center;margin-bottom:22px;}
        .gate-steps i{width:26px;height:5px;border-radius:3px;background:rgba(255,255,255,.18);}
        .gate-steps i.on{background:#e7c65a;}
        .ios-hint{background:rgba(255,255,255,.07);border-radius:14px;padding:14px;color:#cfd8f5;
          font-size:13px;line-height:1.9;margin-top:8px;text-align:right;}
      `}</style>

      <div className="gate-card">
        <div className="gate-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icons/logo.png`} alt="شعار الشركة" />
        </div>

        {showInstallStep ? (
          <>
            <div className="gate-steps"><i className="on" /><i /></div>
            <div className="gate-title">مرحباً بك في نظام فواتير الكهرباء</div>
            <div className="gate-sub">
              لتجربة أفضل، ثبّت التطبيق على جهازك ليعمل مثل أي تطبيق —
              يفتح بسرعة، يعمل بدون إنترنت، ويظهر على شاشتك الرئيسية.
            </div>

            {isIOS ? (
              <div className="ios-hint">
                لتثبيت التطبيق على الآيفون:<br />
                ١. اضغط زر المشاركة <b>⬆️</b> في المتصفح<br />
                ٢. اختر <b>«إضافة إلى الشاشة الرئيسية»</b><br />
                ٣. اضغط <b>«إضافة»</b>
              </div>
            ) : deferredPrompt ? (
              <button className="gate-btn gate-btn-gold" onClick={handleInstall}>
                📲 تثبيت التطبيق الآن
              </button>
            ) : (
              <div className="ios-hint">
                لتثبيت التطبيق: افتح قائمة المتصفح <b>⋮</b> ثم اختر
                <b> «تثبيت التطبيق» / «Add to Home screen»</b>.
              </div>
            )}

            <button className="gate-btn gate-btn-ghost" onClick={skipInstall}>
              تخطّي والمتابعة في المتصفح ←
            </button>
          </>
        ) : (
          <>
            <div className="gate-steps"><i className="on" /><i className="on" /></div>
            <div className="gate-title">أدخل رمز الترخيص</div>
            <div className="gate-sub">
              هذا التطبيق محمي. الرجاء إدخال رمز الترخيص الخاص بك للمتابعة.
            </div>
            <form onSubmit={submitLicense}>
              <input
                className="gate-input"
                type="text"
                placeholder="License code"
                value={code}
                onChange={(e) => { setCode(e.target.value); setErr(''); }}
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {err && <div className="gate-err">{err}</div>}
              <button type="submit" className="gate-btn gate-btn-gold">دخول</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
