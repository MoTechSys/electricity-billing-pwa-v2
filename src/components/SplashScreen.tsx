'use client';

import { useEffect, useState } from 'react';

// Branded launch/splash screen: clean navy background, full clear logo,
// app name in gold, and a loading line. Shows briefly on app open.
export default function SplashScreen() {
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);
  const BP = process.env.NEXT_PUBLIC_BASE_PATH || '';

  useEffect(() => {
    const t1 = setTimeout(() => setHidden(true), 1700);   // start fade
    const t2 = setTimeout(() => setGone(true), 2200);     // remove from DOM
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;

  return (
    <div className={`splash ${hidden ? 'splash-hide' : ''}`} dir="rtl">
      <style>{`
        .splash{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:22px;
          background:radial-gradient(circle at 50% 35%, #16225c 0%, #0d1639 60%, #0a1130 100%);
          transition:opacity .5s ease, visibility .5s ease;}
        .splash-hide{opacity:0;visibility:hidden;}
        .splash-logo{width:min(56vw,230px);height:min(56vw,230px);object-fit:contain;
          filter:drop-shadow(0 12px 30px rgba(0,0,0,.45));
          animation:pop .6s cubic-bezier(.2,.8,.25,1.2) both;}
        .splash-name{font-family:'IBM Plex Sans Arabic','Tahoma',sans-serif;font-weight:800;
          font-size:26px;background:linear-gradient(180deg,#f5da7b,#e7c65a,#caa12f);
          -webkit-background-clip:text;background-clip:text;color:transparent;
          letter-spacing:.5px;animation:fadeUp .6s .15s both;}
        .splash-load{display:flex;align-items:center;gap:9px;color:#9fb0e0;font-size:13px;
          font-family:'IBM Plex Sans Arabic',sans-serif;animation:fadeUp .6s .3s both;}
        .splash-dot{width:7px;height:7px;border-radius:50%;background:#e7c65a;
          animation:blink 1s infinite ease-in-out;}
        .splash-by{position:absolute;bottom:26px;color:#6b7aa8;font-size:12px;
          font-family:'IBM Plex Sans Arabic',sans-serif;animation:fadeUp .6s .45s both;}
        @keyframes pop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes fadeUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes blink{0%,100%{opacity:.3}50%{opacity:1}}
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="splash-logo" src={`${BP}/icons/logo-splash.png`} alt="الشعار" />
      <div className="splash-name">فواتير الكهرباء</div>
      <div className="splash-load"><span className="splash-dot" /> جاري التحميل...</div>
      <div className="splash-by">تطوير العباسي سوفت</div>
    </div>
  );
}
