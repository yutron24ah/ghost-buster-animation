// card-taiji.jsx — カード内常駐の退治ミニステージ (近未来ホロフィールド)
// 待機中: ダークなホロ空間にお化けがふわふわ + 妖気。入力欄フォーカスでロックオンリング。
// playing: 言霊チップが武器(掃除機)に宿る → パターン別の退治 → 浄化 → 経験値オーブが「退治済み」へ。
// パターン: vacuum(吸引) / shot(レールガン射出) / game(ロックオン&クリティカル) / anime(インパクトフレーム) / card(魔導書収蔵 = 辞書登録)
const { Easing: CTEase, clamp: ctClamp } = window;

const CT_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif';
const CT = {
  surface: '#ffffff', primary: '#4f46e5', text: '#1f2937', muted: '#6b7280',
  border: '#e5e7eb', error: '#dc2626', success: '#059669',
  indigoLight: '#a5b4fc', dark: '#111827', holo: '#7dd3fc', errorSoft: '#fca5a5',
};

function ctRnd(i) { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function ctLerp(a, b, p) { return a + (b - a) * p; }
function ctBez(p0, p1, p2, u) {
  const v = 1 - u;
  return [v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0],
          v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]];
}

const CT_ALIAS = { slash: 'shot', web: 'shot', standard: 'game', comic: 'anime', ascend: 'card' };

// 魔導書 (プラムの表紙 + 魔法陣 + 金の角金具)
function CTGrimoire({ glow }) {
  return (
    <svg width="120" height="110" viewBox="0 0 120 110" style={{ display: 'block' }}>
      <path d="M22 26 L58 12 C70 8, 84 8, 94 12 L98 22 L30 42 Z" fill="#f4f1ea" stroke="#d8d2c4" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M26 30 L62 16 M30 34 L66 20" stroke="#cfc8b8" strokeWidth="1" fill="none" />
      <path d="M18 30 C 14 30, 12 34, 12 38 L 16 92 C 16 98, 20 102, 26 102 L 88 96 C 96 95, 100 90, 99 82 L 95 30 C 94 24, 90 20, 82 22 L 26 36 Z"
        fill="#7d3560" stroke="#5a2344" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M24 41 L 87 30 L 92 80 L 30 92 Z" fill="none" stroke="rgba(232,176,75,0.55)" strokeWidth="1.6" strokeLinejoin="round" />
      <g transform="translate(57 62) rotate(-6)">
        <circle r="22" fill="none" stroke="#e8b04b" strokeWidth="1.6" opacity="0.9" />
        <circle r="16" fill="none" stroke="#e8b04b" strokeWidth="0.9" opacity="0.6" />
        <path d="M0 -15 L13 8 L-13 8 Z" fill="none" stroke="#e8b04b" strokeWidth="1.3" opacity="0.85" />
        <circle r={5 + glow * 2} fill="rgba(253,230,138,0.5)" stroke="#fde68a" strokeWidth="1.2" />
        <circle cx="0" cy="-19" r="1.4" fill="#e8b04b" />
        <circle cx="16.5" cy="9.5" r="1.4" fill="#e8b04b" />
        <circle cx="-16.5" cy="9.5" r="1.4" fill="#e8b04b" />
      </g>
      <path d="M12 34 L26 31 L14 46 Z" fill="#f2b34c" stroke="#c98a2e" strokeWidth="1" strokeLinejoin="round" />
      <path d="M99 80 L101 92 L86 94 Z" fill="#f2b34c" stroke="#c98a2e" strokeWidth="1" strokeLinejoin="round" />
      <path d="M16 92 L18 103 L32 100 Z" fill="#f2b34c" stroke="#c98a2e" strokeWidth="1" strokeLinejoin="round" />
      <path d="M95 28 L97 40 L84 32 Z" fill="#f2b34c" stroke="#c98a2e" strokeWidth="1" strokeLinejoin="round" />
      <rect x="97" y="52" width="9" height="7" rx="2" fill="#3f3646" stroke="#2a232f" />
      <rect x="99" y="66" width="9" height="7" rx="2" fill="#3f3646" stroke="#2a232f" />
    </svg>
  );
}

// 本棚 (両サイドの書架)
const CT_SPINES = ['#6e4a2a', '#7d3b2e', '#4c4a33', '#5d3b52', '#72582f', '#414a56', '#654038'];
function CTShelfCol({ side }) {
  const rows = [];
  for (let r = 0; r < 4; r++) {
    const books = [];
    for (let b = 0; b < 8; b++) {
      const h = 18 + ctRnd(r * 11 + b * 3 + (side === 'l' ? 0 : 50)) * 13;
      const w = 5 + ctRnd(r * 7 + b * 5 + (side === 'l' ? 3 : 60)) * 6;
      books.push(
        <div key={b} style={{
          width: w, height: h, borderRadius: 1, flexShrink: 0,
          background: CT_SPINES[(r * 3 + b + (side === 'l' ? 0 : 2)) % CT_SPINES.length],
          opacity: 0.9,
        }} />
      );
    }
    rows.push(
      <div key={r} style={{ height: 44, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 8px', borderBottom: '3px solid #3a2814', boxSizing: 'border-box', overflow: 'hidden' }}>
        {books}
      </div>
    );
  }
  const grad = side === 'l'
    ? 'linear-gradient(90deg, rgba(15,9,4,0.78), rgba(15,9,4,0.22))'
    : 'linear-gradient(270deg, rgba(15,9,4,0.78), rgba(15,9,4,0.22))';
  const st = {
    position: 'absolute', top: 0, bottom: 22, width: 96,
    background: '#20150a', overflow: 'hidden',
  };
  if (side === 'l') { st.left = 0; st.borderRight = '3px solid #3a2814'; }
  else { st.right = 0; st.borderLeft = '3px solid #3a2814'; }
  return (
    <div style={st}>
      {rows}
      <div style={{ position: 'absolute', inset: 0, background: grad }} />
    </div>
  );
}

function CardTaiji(props) {
  const raw = String(props.pattern || 'shot');
  const pat = ['vacuum', 'shot', 'card', 'game', 'anime'].indexOf(raw) >= 0 ? raw : (CT_ALIAS[raw] || 'shot');
  const playing = props.playing === true || props.playing === 'true';
  const dictNote = props.dictNote === true || props.dictNote === 'true';
  const focused = props.focused === true || props.focused === 'true';
  const ghostWord = props.ghostWord || '文字化け';
  const correctWord = props.correctWord || '修正済み';

  const [t, setT] = React.useState(0);
  const playStartRef = React.useRef(null);
  const doneRef = React.useRef(false);
  const endRef = React.useRef(3);
  const onDoneRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const inputRectRef = React.useRef(null);

  const CH = 0.6;
  const patEnd = pat === 'vacuum' ? 2.8 : 2.5;
  endRef.current = CH + patEnd + (dictNote ? 0.45 : 0);
  onDoneRef.current = props.onDone || null;

  React.useEffect(() => {
    let raf; const t0 = performance.now();
    const tick = (now) => {
      setT((now - t0) / 1000);
      if (playStartRef.current != null && !doneRef.current && (now - playStartRef.current) / 1000 > endRef.current) {
        doneRef.current = true;
        if (onDoneRef.current) onDoneRef.current();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  React.useEffect(() => {
    if (playing) {
      if (playStartRef.current == null) {
        playStartRef.current = performance.now();
        doneRef.current = false;
        let r = null;
        const wrap = containerRef.current;
        if (wrap) {
          const card = wrap.closest('[data-ghost-card]');
          const inp = card ? card.querySelector('input') : null;
          if (inp) r = inp.getBoundingClientRect();
        }
        inputRectRef.current = r;
      }
    } else {
      playStartRef.current = null;
    }
  }, [playing]);

  const pt = playStartRef.current != null ? (performance.now() - playStartRef.current) / 1000 : -1;
  const at = pt < 0 ? -1 : pt - CH;
  const GX = 360, GY = 92;

  // ---- バスター (人+掃除機一体 PNG)
  const lungeMax = pat === 'shot' ? 20 : pat === 'vacuum' ? 60 : 175;
  const backStart = pat === 'vacuum' ? 1.35 : 0.55;
  const windup = at < 0 ? 0 : ctClamp(at / 0.25, 0, 1);
  const dashP = ctClamp((at - 0.25) / (pat === 'vacuum' ? 0.2 : 0.25), 0, 1);
  const backP = ctClamp((at - backStart) / 0.5, 0, 1);
  let lunge = CTEase.easeInCubic(dashP) * lungeMax * (1 - CTEase.easeOutQuad(backP));
  if (pat === 'shot' && at > 0.3 && at < 0.55) lunge -= 10 * Math.sin(ctClamp((at - 0.3) / 0.25, 0, 1) * Math.PI);
  if (pat === 'vacuum' && at > 0.5 && at < 1.3) lunge += Math.sin(t * 40) * 2;
  const tilt = at < 0 ? Math.sin(t * 1.8) * 1.5
    : -8 * Math.sin(windup * Math.PI) * (1 - dashP) + (pat === 'vacuum' ? -4 : 14) * dashP * (1 - backP);
  const busterBob = at < 0 ? Math.sin(t * 2) * 3 : 0;
  const burp = pat === 'vacuum' && at > 0 ? Math.sin(ctClamp((at - 1.35) / 0.3, 0, 1) * Math.PI) : 0;
  const nozX = 138 + lunge, nozY = 118;

  // ---- シェイク
  const shakeAmp = pat === 'anime' ? 7 : pat === 'vacuum' ? 2.5 : 5;
  const shakeOn = pat === 'vacuum' ? (at > 0.5 && at < 1.3) : (at > 0.5 && at < 0.85);
  const shakeK = pat === 'vacuum' ? (shakeOn ? 0.5 : 0) : (shakeOn ? 1 - (at - 0.5) / 0.35 : 0);
  const sx = Math.sin(t * 90) * shakeAmp * shakeK;
  const sy = Math.cos(t * 70) * shakeAmp * 0.5 * shakeK;

  // ---- お化け
  const alert = focused && at < 0 ? 1 : 0;
  const bobY = Math.sin(t * (2.2 + alert * 1.3)) * 8;
  const swayR = Math.sin(t * 1.7) * 3 + (alert ? -5 + Math.sin(t * 10) * 1.5 : 0);
  const suckP = pat === 'vacuum' ? (at < 0 ? 0 : CTEase.easeInCubic(ctClamp((at - 0.5) / 0.8, 0, 1))) : 0;
  const dP = at < 0 ? 0 : ctClamp((at - 0.55) / (pat === 'card' ? 0.35 : 0.45), 0, 1);
  let gTx = 0, gTy = 0, gRot = 0, gScale = alert ? 0.97 : 1, gSx = 1, gSy = 1, gOp = 1, gBlur = 0;
  if (at >= 0) {
    if (pat === 'vacuum') {
      gTx = (nozX - GX) * suckP + (suckP > 0 && suckP < 1 ? Math.sin(t * 30) * 5 * (1 - suckP) : 0);
      gTy = (nozY - GY) * suckP;
      gScale = 1 - suckP * 0.93;
      gRot = suckP * 560;
      gSx = 1 + Math.sin(Math.min(suckP, 1) * Math.PI) * 0.55;
      gSy = 1 - Math.sin(Math.min(suckP, 1) * Math.PI) * 0.2;
      gOp = suckP < 0.88 ? 1 : 1 - (suckP - 0.88) / 0.12;
    } else if (pat === 'shot') {
      const puffUp = ctClamp((at - 0.5) / 0.1, 0, 1);
      gScale = 1 + puffUp * 0.16 * (1 - dP);
      gOp = 1 - CTEase.easeInQuad(dP);
      gTy = -CTEase.easeOutCubic(dP) * 20;
    } else if (pat === 'game') {
      // 雷に打たれてビリビリ → ディゾルブ
      gOp = 1 - CTEase.easeInQuad(dP);
      gTy = -CTEase.easeOutCubic(dP) * 30;
      gBlur = dP * 6;
      gScale = 1 + dP * 0.1;
      if (at > 0.44 && at < 0.95) gTx = Math.sin(t * 70) * 3.5;
    } else if (pat === 'anime') {
      gTx = CTEase.easeOutCubic(dP) * 130; gTy = -CTEase.easeOutCubic(dP) * 34; gRot = dP * 24;
      gOp = 1 - CTEase.easeInQuad(dP);
    } else if (pat === 'card') {
      gOp = 1 - CTEase.easeInQuad(ctClamp((at - 0.6) / 0.3, 0, 1));
      gScale = 1 - ctClamp((at - 0.6) / 0.3, 0, 1) * 0.2;
    }
  }
  // 待機中はゼリーみたいにぼよんぼよん (squash & stretch)
  if (at < 0) {
    const jelly = Math.sin(t * 4.4 + 1);
    gSy *= 1 + jelly * 0.045;
    gSx *= 1 - jelly * 0.03;
  }
  const bright = at > 0.5 && at < 0.66 ? 2 : (0.94 + 0.08 * Math.sin(t * 9));

  // ---- 妖気 (ダーク背景ではグロー)
  const wisps = [];
  const wispOp = at < 0 ? 1 : 1 - Math.max(dP, suckP);
  if (wispOp > 0.02 && gOp > 0.02) {
    for (let i = 0; i < 4; i++) {
      const a = t * ((0.6 + ctRnd(i) * 0.4) * (1 + alert * 0.8)) + (i / 4) * Math.PI * 2;
      const r = 58 + Math.sin(t * 1.6 + i * 2) * 12;
      const s = 14 + ctRnd(i + 8) * 14 + Math.sin(t * 3 + i) * 4;
      const flick = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.9);
      wisps.push(
        <div key={'w' + i} style={{
          position: 'absolute',
          left: GX + Math.cos(a) * r - s / 2,
          top: GY + Math.sin(a) * r * 0.6 - s / 2,
          width: s, height: s, borderRadius: '50%',
          background: i % 2 ? 'rgba(196,181,253,0.5)' : 'rgba(249,168,212,0.4)',
          opacity: (0.14 + 0.16 * flick) * wispOp,
          filter: 'blur(6px)',
        }} />
      );
    }
  }

  // ---- ロックオンリング (入力欄フォーカス中 = 事実ベース)
  const lockEls = [];
  if (alert) {
    const rs = 128 + Math.sin(t * 3) * 5;
    lockEls.push(
      <div key="lk1" style={{
        position: 'absolute', left: GX - rs / 2, top: GY - rs / 2 + bobY * 0.4, width: rs, height: rs,
        borderRadius: '50%', border: '1.5px dashed rgba(165,180,252,0.75)',
        transform: `rotate(${t * 40}deg)`,
        boxShadow: '0 0 12px rgba(99,102,241,0.25) inset',
      }} />
    );
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 0.7;
      lockEls.push(
        <div key={'lt' + i} style={{
          position: 'absolute', left: GX + Math.cos(a) * (rs / 2 + 8) - 2, top: GY + Math.sin(a) * (rs / 2 + 8) - 6 + bobY * 0.4,
          width: 4, height: 12, borderRadius: 2, background: CT.holo,
          transform: `rotate(${a * 180 / Math.PI + 90}deg)`, opacity: 0.9,
          boxShadow: '0 0 8px rgba(125,211,252,0.8)',
        }} />
      );
    }
  }

  // ---- 言霊チャージ (fixed レイヤー)
  let kotodamaEl = null;
  const chargeFx = [];
  if (pt >= 0 && pt < 0.7 && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    const canvasLeft = rect.left + rect.width / 2 - 320;
    const wxV = canvasLeft + 82 + lunge, wyV = rect.top + 96;
    const ir = inputRectRef.current;
    const sx0 = ir ? ir.left + Math.min(130, ir.width * 0.35) : rect.left + rect.width / 2;
    const sy0 = ir ? ir.top + ir.height / 2 : rect.bottom + 30;
    const p = ctClamp(pt / 0.45, 0, 1);
    if (p < 1) {
      const e = CTEase.easeInOutQuad(p);
      const [cx2, cy2] = ctBez([sx0, sy0], [(sx0 + wxV) / 2 - 70, Math.min(sy0, wyV) - 80], [wxV, wyV], e);
      kotodamaEl = (
        <div style={{
          position: 'fixed', left: cx2, top: cy2,
          transform: `translate(-50%, -50%) scale(${1 - p * 0.3}) rotate(${(1 - e) * -6}deg)`,
          padding: '5px 14px', borderRadius: 999,
          background: '#fff', border: `1px solid ${CT.primary}`,
          color: CT.primary, fontSize: 14, fontWeight: 700, fontFamily: CT_FONT,
          boxShadow: '0 0 18px rgba(79,70,229,0.55)',
          whiteSpace: 'nowrap', zIndex: 61, pointerEvents: 'none',
        }}>{correctWord}</div>
      );
    }
    const ab = ctClamp((pt - 0.42) / 0.22, 0, 1);
    if (ab > 0 && ab < 1) {
      const as = 40 + CTEase.easeOutCubic(ab) * 80;
      chargeFx.push(
        <div key="chab" style={{
          position: 'absolute', left: 82 - as / 2, top: 100 - as / 2, width: as, height: as, borderRadius: '50%',
          border: '1.5px solid rgba(165,180,252,0.9)',
          background: 'rgba(99,102,241,0.16)', boxShadow: '0 0 30px rgba(99,102,241,0.7)',
          opacity: 1 - ab,
        }} />
      );
    }
  }
  if (pt > 0.45 && at < 0.5) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 14);
    chargeFx.push(
      <div key="chg" style={{
        position: 'absolute', left: 82 - 32 + lunge, top: 100 - 32 + busterBob, width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(99,102,241,0.14)',
        boxShadow: `0 0 ${16 + pulse * 14}px rgba(99,102,241,0.7)`,
      }} />
    );
  }

  // ---- パターン別 FX
  const fx = [];
  if (at >= 0) {
    if (pat === 'shot') {
      // チャージ収束 + 回転アーク
      const gth = ctClamp((at - 0.02) / 0.26, 0, 1);
      if (gth > 0 && gth < 1) {
        for (let i = 0; i < 7; i++) {
          const a = ctRnd(i + 40) * Math.PI * 2;
          const d0 = 54 + ctRnd(i + 41) * 40;
          const p = ctClamp(gth * 1.4 - ctRnd(i) * 0.4, 0, 1);
          const d = d0 * (1 - CTEase.easeInQuad(p));
          fx.push(
            <div key={'gt' + i} style={{
              position: 'absolute', left: nozX + Math.cos(a) * d - 3, top: nozY + Math.sin(a) * d - 3,
              width: 5, height: 5, borderRadius: '50%',
              background: CT.holo, boxShadow: '0 0 8px rgba(125,211,252,0.9)',
              opacity: 0.3 + p * 0.7,
            }} />
          );
        }
        fx.push(
          <div key="garc" style={{
            position: 'absolute', left: nozX - 22, top: nozY - 22, width: 44, height: 44, borderRadius: '50%',
            border: '2px solid transparent', borderTopColor: CT.indigoLight, borderRightColor: 'rgba(165,180,252,0.3)',
            transform: `rotate(${t * 540}deg)`, opacity: gth,
          }} />
        );
      }
      // レールガンビーム
      const bm = ctClamp((at - 0.3) / 0.2, 0, 1);
      if (bm > 0 && bm < 1) {
        const bl = Math.sqrt((GX - nozX) ** 2 + (GY + 6 - nozY) ** 2);
        const bang = Math.atan2(GY + 6 - nozY, GX - nozX) * 180 / Math.PI;
        const reach = CTEase.easeOutQuart(Math.min(bm * 2, 1));
        [[14, 'rgba(99,102,241,0.35)', 18], [4, '#fff', 10]].forEach(([h, c, blur], k) => {
          fx.push(
            <div key={'bm' + k} style={{
              position: 'absolute', left: nozX, top: nozY - h / 2,
              width: bl * reach, height: h, borderRadius: h,
              background: k ? `linear-gradient(90deg, rgba(255,255,255,0.4), ${c})` : c,
              boxShadow: `0 0 ${blur}px ${k ? 'rgba(255,255,255,0.9)' : 'rgba(99,102,241,0.8)'}`,
              transform: `rotate(${bang}deg)`, transformOrigin: '0 50%',
              opacity: 1 - CTEase.easeInQuad(bm),
            }} />
          );
        });
      }
      // マズルフラッシュ
      const mf = ctClamp((at - 0.3) / 0.14, 0, 1);
      if (mf > 0 && mf < 1) {
        const ms = 18 + CTEase.easeOutCubic(mf) * 34;
        fx.push(
          <div key="mz" style={{
            position: 'absolute', left: nozX - ms / 2, top: nozY - ms / 2, width: ms, height: ms, borderRadius: '50%',
            background: 'rgba(255,255,255,0.85)', boxShadow: '0 0 26px rgba(125,211,252,0.9)',
            opacity: 1 - mf,
          }} />
        );
      }
      // 着弾: 白フラッシュ + 光の柱 + 二重リング
      const iw = ctClamp((at - 0.5) / 0.14, 0, 1);
      if (iw > 0 && iw < 1) fx.push(<div key="iwf" style={{ position: 'absolute', inset: 0, background: '#fff', opacity: (1 - iw) * 0.55, zIndex: 5 }} />);
      const pillar = ctClamp((at - 0.5) / 0.4, 0, 1);
      if (pillar > 0 && pillar < 1) {
        fx.push(
          <div key="plr" style={{
            position: 'absolute', left: GX - 26, top: 0, width: 52, height: GY + 50,
            background: 'linear-gradient(180deg, rgba(125,211,252,0), rgba(125,211,252,0.5))',
            opacity: Math.sin(pillar * Math.PI), filter: 'blur(2px)',
          }} />
        );
      }
      [[0, 220], [0.09, 140]].forEach(([dly, size], k) => {
        const rg = ctClamp((at - (0.5 + dly)) / 0.4, 0, 1);
        if (rg <= 0 || rg >= 1) return;
        const rs = 24 + CTEase.easeOutCubic(rg) * size;
        fx.push(
          <div key={'ring' + k} style={{
            position: 'absolute', left: GX - rs / 2, top: GY - rs / 2, width: rs, height: rs,
            borderRadius: '50%', border: `${4 * (1 - rg) + 1}px solid ${k ? CT.holo : CT.indigoLight}`,
            boxShadow: `0 0 16px ${k ? 'rgba(125,211,252,0.6)' : 'rgba(165,180,252,0.6)'}`,
            opacity: (1 - rg) * 0.9,
          }} />
        );
      });
      for (let i = 0; i < 18; i++) {
        const p = ctClamp((at - 0.52) / (0.4 + ctRnd(i) * 0.3), 0, 1);
        if (p <= 0 || p >= 1) continue;
        const a = ctRnd(i) * Math.PI * 2;
        const d = CTEase.easeOutCubic(p) * (44 + ctRnd(i + 50) * 100);
        const s = 4 + ctRnd(i + 7) * 6;
        fx.push(
          <div key={'sp' + i} style={{
            position: 'absolute', left: GX + Math.cos(a) * d - s / 2, top: GY + Math.sin(a) * d * 0.72 - s / 2,
            width: s, height: s, borderRadius: i % 4 === 0 ? 1 : '50%',
            background: [CT.indigoLight, CT.holo, '#fff'][i % 3],
            boxShadow: '0 0 8px rgba(165,180,252,0.8)',
            opacity: 1 - p,
            transform: i % 4 === 0 ? `rotate(${ctRnd(i + 3) * 360 + p * 260}deg)` : 'none',
          }} />
        );
      }
    }
    if (pat === 'vacuum' && at > 0.5 && at < 1.35) {
      // 外側ブルーム + 渦
      fx.push(
        <div key="vbloom" style={{
          position: 'absolute', left: nozX - 52, top: nozY - 52, width: 104, height: 104, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(125,211,252,0.3), rgba(125,211,252,0))',
          filter: 'blur(3px)', transform: `scale(${1 + Math.sin(t * 12) * 0.12})`,
        }} />
      );
      fx.push(
        <div key="vortex" style={{
          position: 'absolute', left: nozX - 46, top: nozY - 46, width: 92, height: 92, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(165,180,252,0), rgba(165,180,252,0.6), rgba(125,211,252,0.4), rgba(165,180,252,0))',
          transform: `rotate(${t * 340}deg)`, filter: 'blur(1px)',
        }} />
      );
      // 光のリボン (大きな弧がねじれながら吸い込まれる)
      for (let k = 0; k < 2; k++) {
        const ph = (t * 1.1 + k * 0.5) % 1;
        const w = 210 - ph * 70;
        fx.push(
          <div key={'rb' + k} style={{
            position: 'absolute', left: (nozX + GX) / 2 - w / 2, top: (nozY + GY) / 2 - w * 0.36,
            width: w, height: w * 0.72, borderRadius: '50%',
            border: '3.5px solid transparent',
            borderTopColor: 'rgba(125,211,252,0.85)',
            borderRightColor: 'rgba(165,180,252,0.3)',
            transform: `rotate(${ph * 360 + k * 180}deg)`,
            opacity: 0.85 - ph * 0.4,
          }} />
        );
      }
      // 吸引パーティクル (大きめ・多め)
      for (let i = 0; i < 16; i++) {
        const p = (t * (1.6 + ctRnd(i + 33) * 0.7) + ctRnd(i)) % 1;
        const x = ctLerp(GX + (ctRnd(i * 3) - 0.5) * 120, nozX, p) + Math.sin(p * 9 + i) * 24 * (1 - p);
        const y = ctLerp(GY + (ctRnd(i * 5) - 0.5) * 90, nozY, p) + Math.cos(p * 7 + i * 2) * 18 * (1 - p);
        const s = ctLerp(6 + ctRnd(i + 21) * 12, 3, p);
        fx.push(
          <div key={'sk' + i} style={{
            position: 'absolute', left: x - s / 2, top: y - s / 2,
            width: s, height: s, borderRadius: '50%',
            background: i % 3 === 0 ? CT.holo : i % 3 === 1 ? CT.indigoLight : '#e0f2fe',
            boxShadow: `0 0 ${8 + s}px rgba(125,211,252,0.9)`,
            filter: s > 12 ? 'blur(0.5px)' : 'none',
            opacity: 0.9 * (1 - p * 0.25),
          }} />
        );
      }
      for (let i = 0; i < 4; i++) {
        const p = (t * 2.2 + ctRnd(i + 70)) % 1;
        const x = ctLerp(GX + 60, nozX + 30, p);
        const y = ctLerp(GY - 44 + i * 28, nozY, p);
        const w = 70 * (1 - p * 0.5);
        fx.push(
          <div key={'wd' + i} style={{
            position: 'absolute', left: x - w, top: y, width: w, height: 1.5, borderRadius: 2,
            background: 'rgba(165,180,252,0.7)', opacity: 0.6 * (1 - p * 0.4),
            transform: `rotate(${Math.atan2(nozY - y, nozX - x) * 180 / Math.PI}deg)`, transformOrigin: '100% 50%',
          }} />
        );
      }
      for (let k = 0; k < 2; k++) {
        const p = (t * 1.4 + k * 0.5) % 1;
        const rs = 96 * (1 - p);
        fx.push(
          <div key={'vr' + k} style={{
            position: 'absolute', left: nozX - rs / 2, top: nozY - rs / 2, width: rs, height: rs, borderRadius: '50%',
            border: '1.5px solid rgba(125,211,252,0.5)', opacity: 0.15 + p * 0.55,
          }} />
        );
      }
    }
    if (pat === 'vacuum') {
      const pop = ctClamp((at - 1.3) / 0.25, 0, 1);
      if (pop > 0 && pop < 1) {
        const ps = 14 + CTEase.easeOutCubic(pop) * 64;
        fx.push(
          <div key="vpop" style={{
            position: 'absolute', left: nozX - ps / 2, top: nozY - ps / 2, width: ps, height: ps, borderRadius: '50%',
            border: `${4 * (1 - pop) + 1}px solid ${CT.indigoLight}`,
            boxShadow: '0 0 18px rgba(165,180,252,0.7)', opacity: (1 - pop) * 0.9,
          }} />
        );
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + ctRnd(i + 80);
          const d = CTEase.easeOutCubic(pop) * (20 + ctRnd(i + 81) * 44);
          fx.push(
            <div key={'vs' + i} style={{
              position: 'absolute', left: nozX + Math.cos(a) * d - 3, top: nozY + Math.sin(a) * d - 3,
              width: 5, height: 5, borderRadius: i % 2 ? '50%' : 1,
              background: i % 2 ? CT.indigoLight : CT.holo,
              boxShadow: '0 0 8px rgba(125,211,252,0.8)',
              transform: `rotate(${pop * 300 + i * 40}deg)`,
              opacity: 1 - pop,
            }} />
          );
        }
      }
    }
    if (pat === 'game') {
      // ロックオン (ブラケット収束 + LOCKED)
      const lk = ctClamp((at - 0.03) / 0.3, 0, 1);
      const lkOut = ctClamp((at - 0.5) / 0.1, 0, 1);
      if (lk > 0 && lkOut < 1) {
        const conv = CTEase.easeOutQuart(lk);
        const off = 120 - conv * 62;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy], k) => {
          fx.push(
            <div key={'bk' + k} style={{
              position: 'absolute', left: GX + dx * off - 11, top: GY + dy * off * 0.72 - 11,
              width: 22, height: 22, opacity: (0.4 + conv * 0.6) * (1 - lkOut),
              borderTop: dy < 0 ? `2px solid ${CT.holo}` : 'none',
              borderBottom: dy > 0 ? `2px solid ${CT.holo}` : 'none',
              borderLeft: dx < 0 ? `2px solid ${CT.holo}` : 'none',
              borderRight: dx > 0 ? `2px solid ${CT.holo}` : 'none',
              boxShadow: '0 0 8px rgba(125,211,252,0.4)',
              transform: `rotate(${(1 - conv) * 90}deg)`,
            }} />
          );
        });
        if (lk > 0.55) {
          fx.push(
            <div key="lkt" style={{
              position: 'absolute', left: GX, top: GY - 74,
              transform: 'translateX(-50%)',
              fontSize: 10, fontWeight: 700, letterSpacing: 4, color: CT.holo,
              textShadow: '0 0 10px rgba(125,211,252,0.9)',
              opacity: (Math.floor(t * 8) % 2 ? 1 : 0.45) * (1 - lkOut),
            }}>LOCKED</div>
          );
        }
      }
      // 雷撃 (バスターからビューンと飛ばす)
      if (at > 0.38 && at < 0.8) {
        const seed = Math.floor(t * 18);
        // ノズルの放電グロー
        fx.push(
          <div key="lnoz" style={{
            position: 'absolute', left: nozX - 16, top: nozY - 16, width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.85)', boxShadow: '0 0 26px rgba(125,211,252,1), 0 0 60px rgba(125,211,252,0.5)',
            transform: `scale(${0.8 + (seed % 3) * 0.18})`,
          }} />
        );
        [[0, 0], [1, -16], [2, 18], [3, -30], [4, 32], [5, 8]].forEach(([si, spread]) => {
          if ((seed + si) % 4 === 3) return;
          let d = `M ${nozX} ${nozY}`;
          const segs = 8;
          for (let s2 = 1; s2 <= segs; s2++) {
            const f = s2 / segs;
            const px = ctLerp(nozX, GX, f);
            const mid = Math.sin(f * Math.PI); // 中間で大きく暴れる
            const py = ctLerp(nozY, GY, f) + spread * mid + (ctRnd(seed * 7 + si * 13 + s2) - 0.5) * 40 * mid;
            d += ` L ${px} ${py}`;
          }
          const major = si < 3;
          fx.push(
            <svg key={'bolt' + si} width="640" height="200" viewBox="0 0 640 200" style={{ position: 'absolute', left: 0, top: 0, zIndex: 5, pointerEvents: 'none' }}>
              <path d={d} fill="none" stroke="rgba(125,211,252,0.5)" strokeWidth={major ? 9 : 5} strokeLinejoin="round" strokeLinecap="round" />
              <path d={d} fill="none" stroke="#fff" strokeWidth={major ? 3 : 1.6} strokeLinejoin="round" strokeLinecap="round" opacity={major ? 1 : 0.85} />
            </svg>
          );
          // 枝分かれ (メインボルトから上下にパリッ)
          if (major && (seed + si) % 2 === 0) {
            const bf = 0.35 + ctRnd(seed + si * 3) * 0.35;
            const bx = ctLerp(nozX, GX, bf);
            const by = ctLerp(nozY, GY, bf) + spread * Math.sin(bf * Math.PI);
            const dir = si % 2 ? 1 : -1;
            const b1x = bx + 26 + ctRnd(seed + si) * 20, b1y = by + dir * (26 + ctRnd(seed + si + 1) * 22);
            const bmx = (bx + b1x) / 2 + (ctRnd(seed + si + 2) - 0.5) * 14, bmy = (by + b1y) / 2 + (ctRnd(seed + si + 3) - 0.5) * 14;
            fx.push(
              <svg key={'br' + si} width="640" height="200" viewBox="0 0 640 200" style={{ position: 'absolute', left: 0, top: 0, zIndex: 5, pointerEvents: 'none' }}>
                <path d={`M ${bx} ${by} L ${bmx} ${bmy} L ${b1x} ${b1y}`} fill="none" stroke="#a5f3fc" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
              </svg>
            );
          }
        });
        // 雷の粒 (ボルト沿いを走る光)
        for (let i = 0; i < 5; i++) {
          const p = (t * 3.2 + ctRnd(i + 55)) % 1;
          const px = ctLerp(nozX, GX, p);
          const py = ctLerp(nozY, GY, p) + Math.sin(p * Math.PI) * (ctRnd(i + 56) - 0.5) * 40;
          fx.push(
            <div key={'lp' + i} style={{
              position: 'absolute', left: px - 3, top: py - 3, width: 6, height: 6, borderRadius: '50%',
              background: '#fff', boxShadow: '0 0 12px rgba(125,211,252,1)',
              opacity: 0.9,
            }} />
          );
        }
        if (seed % 4 === 0) fx.push(<div key="lfl" style={{ position: 'absolute', inset: 0, background: 'rgba(190,235,255,0.16)', zIndex: 4 }} />);
      }
      // 電撃アーク (お化けの周りをパチパチ)
      if (at > 0.48 && at < 0.95) {
        const seed2 = Math.floor(t * 22);
        for (let i = 0; i < 4; i++) {
          if ((seed2 + i) % 3 === 0) continue;
          const a0 = ctRnd(seed2 + i * 5) * Math.PI * 2;
          const r0 = 34 + ctRnd(seed2 + i * 9) * 28;
          const x1 = GX + Math.cos(a0) * r0, y1 = GY + Math.sin(a0) * r0 * 0.8;
          const x2 = x1 + (ctRnd(seed2 + i * 3) - 0.5) * 36, y2 = y1 + (ctRnd(seed2 + i * 11) - 0.5) * 28;
          const xm = (x1 + x2) / 2 + (ctRnd(seed2 + i) - 0.5) * 18, ym = (y1 + y2) / 2 + (ctRnd(seed2 + i + 1) - 0.5) * 18;
          fx.push(
            <svg key={'arc' + i} width="640" height="200" viewBox="0 0 640 200" style={{ position: 'absolute', left: 0, top: 0, zIndex: 5, pointerEvents: 'none' }}>
              <path d={`M ${x1} ${y1} L ${xm} ${ym} L ${x2} ${y2}`} fill="none" stroke="#a5f3fc" strokeWidth="1.6" opacity="0.9" />
            </svg>
          );
        }
      }
      // 白フラッシュ + 地面の稲妻バースト
      const giw = ctClamp((at - 0.5) / 0.14, 0, 1);
      if (giw > 0 && giw < 1) fx.push(<div key="giwf" style={{ position: 'absolute', inset: 0, background: '#fff', opacity: (1 - giw) * 0.6, zIndex: 6 }} />);
      const gb = ctClamp((at - 0.5) / 0.35, 0, 1);
      if (gb > 0 && gb < 1) {
        for (let i = 0; i < 5; i++) {
          const dir = (i - 2) * 0.5;
          const len = CTEase.easeOutCubic(gb) * (34 + ctRnd(i + 5) * 46);
          fx.push(
            <div key={'gs' + i} style={{
              position: 'absolute', left: GX + dir * 64 - 4, top: 172 - len,
              width: 9 - Math.abs(dir) * 3, height: len,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(125,211,252,0.05))',
              clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
              transform: `rotate(${dir * 26}deg)`, transformOrigin: '50% 100%',
              opacity: 1 - gb, zIndex: 4,
            }} />
          );
        }
      }
      // ダメージ数字 (モダン: 白 + シアングロー、スッと上へ)
      const dmg = ctClamp((at - 0.55) / 0.9, 0, 1);
      if (dmg > 0 && dmg < 1) {
        const inP = CTEase.easeOutQuart(Math.min(dmg * 3, 1));
        fx.push(
          <div key="dmg" style={{
            position: 'absolute', left: GX + 54, top: GY - 58 - CTEase.easeOutCubic(dmg) * 36,
            transform: `scale(${0.7 + inP * 0.3})`,
            fontSize: 44, fontWeight: 800, color: '#fff', letterSpacing: -1,
            textShadow: '0 0 16px rgba(125,211,252,0.95), 0 0 40px rgba(99,102,241,0.6)',
            opacity: 1 - CTEase.easeInQuad(dmg),
            fontVariantNumeric: 'tabular-nums',
          }}>999</div>
        );
        fx.push(
          <div key="crt" style={{
            position: 'absolute', left: GX + 58, top: GY - 12 - CTEase.easeOutCubic(dmg) * 36,
            fontSize: 10, fontWeight: 700, letterSpacing: 5, color: CT.holo,
            textShadow: '0 0 10px rgba(125,211,252,0.9)',
            opacity: (1 - CTEase.easeInQuad(dmg)) * inP,
          }}>CRITICAL</div>
        );
      }
      // EXP
      const exp = ctClamp((at - 1.25) / 0.8, 0, 1);
      if (exp > 0 && exp < 1) {
        fx.push(
          <div key="exp" style={{
            position: 'absolute', left: GX, top: GY + 34 - CTEase.easeOutCubic(exp) * 30,
            transform: 'translateX(-50%)',
            fontSize: 13, fontWeight: 700, letterSpacing: 3, color: CT.indigoLight,
            textShadow: '0 0 10px rgba(165,180,252,0.8)',
            opacity: 1 - CTEase.easeInQuad(exp),
          }}>EXP +10</div>
        );
      }
      // 溶けた粒子 (上昇)
      for (let i = 0; i < 12; i++) {
        const p = ctClamp((at - 0.58) / (0.5 + ctRnd(i) * 0.35), 0, 1);
        if (p <= 0 || p >= 1) continue;
        const x0 = GX - 46 + ctRnd(i * 3) * 92;
        fx.push(
          <div key={'dz' + i} style={{
            position: 'absolute', left: x0 + Math.sin(p * 5 + i) * 10, top: GY + 20 - CTEase.easeOutCubic(p) * (70 + ctRnd(i + 9) * 50),
            width: 3 + ctRnd(i + 5) * 4, height: 3 + ctRnd(i + 5) * 4, borderRadius: '50%',
            background: i % 2 ? CT.holo : '#fff',
            boxShadow: '0 0 8px rgba(125,211,252,0.8)',
            opacity: (1 - p) * 0.9, filter: `blur(${p * 1.5}px)`,
          }} />
        );
      }
    }
    if (pat === 'anime') {
      if (at > 0.28 && at < 0.75) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * 360 + ctRnd(i) * 18;
          const flick = (Math.floor(t * 26) + i) % 3 ? 1 : 0.15;
          const len = 150 + ctRnd(i + 30) * 130;
          fx.push(
            <div key={'ln' + i} style={{
              position: 'absolute', left: GX, top: GY,
              width: len, height: 2 + ctRnd(i + 9) * 3, borderRadius: 3,
              background: 'rgba(255,255,255,0.75)',
              transform: `rotate(${a}deg) translateX(${170 - ctRnd(i + 12) * 40}px)`,
              transformOrigin: '0 50%',
              opacity: 0.35 * flick,
            }} />
          );
        }
      }
      const impactA = at > 0.5 && at < 0.56, impactB = at >= 0.56 && at < 0.62;
      if (impactA || impactB) {
        fx.push(<div key="imp" style={{ position: 'absolute', inset: 0, background: impactA ? '#fff' : '#0e1024', zIndex: 6 }} />);
        fx.push(
          <div key="impl" style={{
            position: 'absolute', left: GX - 400, top: GY - 8, width: 800, height: 16,
            background: impactA ? '#0e1024' : '#fff', transform: 'rotate(-28deg)', zIndex: 7,
          }} />
        );
      }
      [[-28, 0], [40, 0.07]].forEach(([ang, dly], k) => {
        const p = ctClamp((at - (0.55 + dly)) / 0.32, 0, 1);
        if (p <= 0 || p >= 1) return;
        fx.push(
          <div key={'xs' + k} style={{
            position: 'absolute', left: GX - 320, top: GY - 4, width: 640, height: 7, borderRadius: 4,
            background: '#fff', transform: `rotate(${ang}deg)`,
            boxShadow: '0 0 20px rgba(125,211,252,0.95), 0 0 5px #7dd3fc',
            opacity: 1 - CTEase.easeInQuad(p), zIndex: 5,
          }} />
        );
      });
      const rgP = ctClamp((at - 0.62) / 0.4, 0, 1);
      if (rgP > 0 && rgP < 1) {
        const rs = 30 + CTEase.easeOutCubic(rgP) * 250;
        fx.push(
          <div key="ring" style={{
            position: 'absolute', left: GX - rs / 2, top: GY - rs / 2, width: rs, height: rs,
            borderRadius: '50%', border: `${5 * (1 - rgP) + 1}px solid ${CT.indigoLight}`,
            boxShadow: '0 0 18px rgba(165,180,252,0.7)',
            opacity: (1 - rgP) * 0.85,
          }} />
        );
      }
      for (let i = 0; i < 16; i++) {
        const p = ctClamp((at - 0.62) / (0.4 + ctRnd(i + 99) * 0.3), 0, 1);
        if (p <= 0 || p >= 1) continue;
        const a = ctRnd(i) * Math.PI * 2;
        const d = CTEase.easeOutCubic(p) * (50 + ctRnd(i + 50) * 120);
        const s = 4 + ctRnd(i + 7) * 6;
        fx.push(
          <div key={'ap' + i} style={{
            position: 'absolute', left: GX + Math.cos(a) * d - s / 2, top: GY + Math.sin(a) * d * 0.7 - s / 2,
            width: s, height: s, borderRadius: i % 3 === 0 ? 1 : '50%',
            background: i % 2 ? '#fff' : CT.indigoLight,
            boxShadow: '0 0 8px rgba(165,180,252,0.8)',
            opacity: 1 - p,
          }} />
        );
      }
    }
    // 共通ヒットフラッシュ (game/vacuum/shot 以外)
    const flashP = ctClamp((at - 0.5) / 0.25, 0, 1);
    if (flashP > 0 && flashP < 1 && (pat === 'anime' || pat === 'card')) {
      fx.push(
        <div key="hfl" style={{
          position: 'absolute', left: GX - 60, top: GY - 55, width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(165,180,252,0.35)', boxShadow: '0 0 40px rgba(99,102,241,0.7)',
          transform: `scale(${0.3 + CTEase.easeOutCubic(flashP) * 1.2})`,
          opacity: (1 - flashP) * 0.9,
        }} />
      );
    }
  }

  // ---- カード化 + 魔導書 (辞書のメタファー)
  const cardEls = [];
  const BKX = 520, BKY = 62; // 魔導書の位置
  if (pat === 'card' && at >= 0) {
    const bookIn = CTEase.easeOutCubic(ctClamp((at - 0.15) / 0.35, 0, 1));
    const flyStart = 1.4, flyDur = 0.6;
    const cFly = ctClamp((at - flyStart) / flyDur, 0, 1);
    const absorbed = ctClamp((at - (flyStart + flyDur)) / 0.3, 0, 1);
    const bookBob = Math.sin(t * 1.8) * 5;
    const bookGlow = absorbed > 0 && absorbed < 1 ? Math.sin(absorbed * Math.PI) : (0.3 + 0.2 * Math.sin(t * 2.5));
    // 魔導書
    if (bookIn > 0) {
      cardEls.push(
        <div key="book" style={{
          position: 'absolute', left: BKX - 60, top: BKY - 55 + bookBob,
          opacity: bookIn,
          transform: `scale(${0.8 + bookIn * 0.2 + (absorbed > 0 && absorbed < 1 ? Math.sin(absorbed * Math.PI) * 0.12 : 0)})`,
          filter: `drop-shadow(0 0 ${10 + bookGlow * 16}px rgba(99,102,241,0.75))`,
          zIndex: 3,
        }}>
          <CTGrimoire glow={bookGlow} />
        </div>
      );
      // 周回するルーン光
      for (let i = 0; i < 3; i++) {
        const a = t * 1.2 + (i / 3) * Math.PI * 2;
        cardEls.push(
          <div key={'rn' + i} style={{
            position: 'absolute',
            left: BKX + Math.cos(a) * 74 - 3, top: BKY + bookBob + Math.sin(a) * 30 - 3,
            width: 6, height: 6, borderRadius: 1,
            background: i % 2 ? CT.holo : '#fbbf24',
            boxShadow: '0 0 8px rgba(125,211,252,0.8)',
            transform: `rotate(${t * 140 + i * 60}deg)`,
            opacity: 0.85 * bookIn * (1 - absorbed),
          }} />
        );
      }
      // 吸収フラッシュリング
      if (absorbed > 0 && absorbed < 1) {
        const rs = 20 + CTEase.easeOutCubic(absorbed) * 110;
        cardEls.push(
          <div key="babs" style={{
            position: 'absolute', left: BKX - rs / 2, top: BKY + bookBob - rs / 2, width: rs, height: rs, borderRadius: '50%',
            border: `${3 * (1 - absorbed) + 1}px solid ${CT.holo}`,
            boxShadow: '0 0 20px rgba(125,211,252,0.8)',
            opacity: 1 - absorbed,
          }} />
        );
      }
    }
    // 光の柱 (カード化の瑞兆)
    const beamP = ctClamp((at - 0.52) / 0.55, 0, 1);
    if (beamP > 0 && beamP < 1) {
      cardEls.push(
        <div key="beam" style={{
          position: 'absolute', left: GX - 52, top: 0, width: 104, height: GY + 44,
          background: 'linear-gradient(180deg, rgba(251,191,36,0), rgba(251,191,36,0.32))',
          opacity: Math.sin(beamP * Math.PI), filter: 'blur(1px)',
        }} />
      );
    }
    // 紙吹雪
    for (let i = 0; i < 10; i++) {
      const p = ctClamp((at - 0.9) / (0.7 + ctRnd(i) * 0.4), 0, 1);
      if (p <= 0 || p >= 1) continue;
      const x0 = GX - 80 + ctRnd(i * 7) * 160;
      cardEls.push(
        <div key={'cc' + i} style={{
          position: 'absolute', left: x0 + Math.sin(p * 6 + i) * 16, top: GY - 50 + CTEase.easeInQuad(p) * 140,
          width: 5, height: 9, borderRadius: 2,
          background: i % 2 ? '#fbbf24' : CT.indigoLight,
          boxShadow: '0 0 6px rgba(251,191,36,0.6)',
          transform: `rotate(${ctRnd(i + 4) * 360 + p * 380}deg)`,
          opacity: 1 - CTEase.easeInQuad(p),
        }} />
      );
    }
    // カード出現 (ホバー) → 魔導書へ飛翔
    const cardIn = ctClamp((at - 0.6) / 0.35, 0, 1);
    if (cardIn > 0 && absorbed < 1) {
      let cx = GX, cy = GY, spin = 0, scl = CTEase.easeOutBack(cardIn);
      if (cFly > 0) {
        const e = CTEase.easeInOutQuad(cFly);
        const [fx2, fy2] = ctBez([GX, GY], [(GX + BKX) / 2, Math.min(GY, BKY) - 70], [BKX, BKY + bookBob], e);
        cx = fx2; cy = fy2; spin = cFly * 480; scl = 1 - cFly * 0.72;
        // 飛翔スパークル
        for (let k = 1; k <= 3; k++) {
          const ek = CTEase.easeInOutQuad(ctClamp(cFly - k * 0.06, 0, 1));
          const [tx2, ty2] = ctBez([GX, GY], [(GX + BKX) / 2, Math.min(GY, BKY) - 70], [BKX, BKY + bookBob], ek);
          cardEls.push(
            <div key={'cs' + k} style={{
              position: 'absolute', left: tx2 - 3, top: ty2 - 3, width: 6, height: 6, borderRadius: 1,
              background: k % 2 ? '#fbbf24' : CT.holo,
              boxShadow: '0 0 8px rgba(125,211,252,0.8)',
              transform: `rotate(${cFly * 400 + k * 50}deg)`,
              opacity: 0.5 / k + 0.2,
            }} />
          );
        }
      }
      const hover = cFly <= 0 ? Math.sin(t * 4) * 4 * cardIn : 0;
      const spinX = cFly <= 0 ? Math.abs(Math.cos(cardIn * Math.PI * 2)) : 1;
      cardEls.push(
        <div key="gicard" style={{
          position: 'absolute', left: cx - 34, top: cy - 46 + hover,
          width: 68, height: 92, borderRadius: 8,
          background: 'rgba(255,255,255,0.97)', border: `2px solid ${CT.primary}`,
          boxShadow: '0 0 24px rgba(99,102,241,0.65), 0 2px 6px rgba(0,0,0,0.2)',
          transform: `scale(${scl}) scaleX(${Math.max(spinX, 0.08)}) rotate(${spin}deg)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          overflow: 'hidden', zIndex: 4,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: CT.muted, letterSpacing: 1 }}>MOJI-GHOST</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: CT.primary, maxWidth: 58, textAlign: 'center', lineHeight: 1.3, overflow: 'hidden' }}>{correctWord}</div>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: CT.success, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg, transparent ${((t * 90) % 160) - 30}%, rgba(255,255,255,0.85) ${((t * 90) % 160) - 15}%, transparent ${(t * 90) % 160}%)` }} />
        </div>
      );
    }
  }

  // ---- 文字化けチップ → 散り / 吸引、正しい語ポップ
  const cwT = pat === 'vacuum' ? 1.5 : 1.18;
  const q = at < 0 ? 0 : ctClamp((at - 0.72) / 0.4, 0, 1);
  const chars = ghostWord.split('').map((ch, i) => {
    let tr2 = 'none', op = 1;
    if (pat === 'vacuum' && at >= 0) {
      const qi = CTEase.easeInCubic(ctClamp((at - (0.6 + i * 0.06)) / 0.5, 0, 1));
      tr2 = `translate(${(nozX - GX) * qi}px, ${(nozY - 158) * qi}px) scale(${1 - qi * 0.9}) rotate(${qi * 300}deg)`;
      op = qi < 0.85 ? 1 : 1 - (qi - 0.85) / 0.15;
    } else {
      const wob = at < 0 ? Math.sin(t * (4 + alert * 3) + i * 1.7) * (2 + alert * 1.5) : 0;
      const a = ctRnd(i * 3 + 1) * Math.PI * 2;
      const d = CTEase.easeOutCubic(q) * 90;
      tr2 = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.7 - 18 * q + wob}px) rotate(${ctRnd(i + 5) * 200 * q}deg)`;
      op = 1 - q;
    }
    return (
      <span key={'c' + i} style={{ display: 'inline-block', transform: tr2, opacity: op }}>{ch}</span>
    );
  });
  const chipGone = pat === 'vacuum'
    ? (at >= 0 && at > 0.6 + ghostWord.length * 0.06 + 0.5)
    : q >= 1;
  const chipBgOp = pat === 'vacuum' ? (at < 0 ? 1 : 1 - ctClamp((at - 0.6) / 0.5, 0, 1)) : 1 - q;
  const cwP = at < 0 ? 0 : ctClamp((at - cwT) / 0.3, 0, 1);
  const cwScale = CTEase.easeOutBack(cwP);
  const ring = 1 - ctClamp((at - (cwT + 0.32)) / 0.7, 0, 1);
  const dictP = dictNote && at >= 0 ? ctClamp((at - (cwT + 0.42)) / 0.3, 0, 1) : 0;

  // ---- 経験値オーブ → 「退治済み」 (card パターンは魔導書が受け取るので無し)
  const orbT = pat === 'vacuum' ? 1.75 : 1.45;
  const flyT = pat === 'vacuum' ? 1.95 : 1.65;
  const orbFrom = pat === 'vacuum' ? [nozX, nozY] : [GX, 156];
  const orbForm = at < 0 || pat === 'card' ? 0 : ctClamp((at - orbT) / 0.2, 0, 1);
  const flyP = at < 0 || pat === 'card' ? 0 : ctClamp((at - flyT) / 0.65, 0, 1);
  let orbEl = null;
  if (orbForm > 0 && flyP < 1 && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    const canvasLeft = rect.left + rect.width / 2 - 320;
    const startX = canvasLeft + orbFrom[0], startY = rect.top + orbFrom[1];
    const tEl = document.querySelector('[data-orb-target]');
    const tr = tEl ? tEl.getBoundingClientRect() : null;
    const endX = tr ? tr.left + tr.width / 2 : startX + 220;
    const endY = tr ? tr.top + tr.height / 2 : rect.top - 120;
    const midX = (startX + endX) / 2 + 70;
    const midY = Math.min(startY, endY) - 100;
    const shrink = flyP > 0.75 ? 1 - (flyP - 0.75) / 0.25 : 1;
    const pieces = [];
    for (let k = 3; k >= 1; k--) {
      const ek = CTEase.easeInOutQuad(ctClamp(flyP - k * 0.06, 0, 1));
      const [tx2, ty2] = ctBez([startX, startY], [midX, midY], [endX, endY], ek);
      pieces.push(
        <div key={'otr' + k} style={{
          position: 'fixed', left: tx2 - 6, top: ty2 - 5, width: 12, height: 9, borderRadius: '50%',
          background: '#059669', opacity: flyP > 0 ? 0.25 / k : 0, zIndex: 60, pointerEvents: 'none',
        }} />
      );
    }
    const [fxX, fxY] = ctBez([startX, startY], [midX, midY], [endX, endY], CTEase.easeInOutQuad(flyP));
    pieces.push(
      <div key="orb" style={{
        position: 'fixed', left: fxX - 11, top: fxY - 8, width: 22, height: 16, borderRadius: '50%',
        background: '#fff', border: '2px solid #d1d5db',
        boxShadow: '0 0 12px rgba(5,150,105,0.6), 0 0 3px rgba(5,150,105,0.4) inset',
        transform: `scale(${CTEase.easeOutBack(orbForm) * shrink}) rotate(${flyP * 160}deg)`,
        zIndex: 61, pointerEvents: 'none',
      }} />
    );
    orbEl = <React.Fragment>{pieces}</React.Fragment>;
  }

  // ---- 環境: 漂う光塵 (琥珀)
  const dust = [];
  for (let i = 0; i < 6; i++) {
    const p = (t * (0.06 + ctRnd(i) * 0.05) + ctRnd(i * 3)) % 1;
    dust.push(
      <div key={'du' + i} style={{
        position: 'absolute', left: 130 + ctRnd(i * 7) * 380 + Math.sin(t * 0.8 + i) * 12, top: 186 - p * 168,
        width: 2 + ctRnd(i + 2) * 2, height: 2 + ctRnd(i + 2) * 2, borderRadius: '50%',
        background: '#fde68a', boxShadow: '0 0 6px rgba(253,230,138,0.8)',
        opacity: Math.sin(p * Math.PI) * 0.5,
      }} />
    );
  }

  // ---- 浮遊蜝燭 + きらめき
  const stars = [];
  for (let i = 0; i < 3; i++) {
    const cx = [185, 462, 560][i];
    const cy = 14 + ctRnd(i + 61) * 14 + Math.sin(t * (1 + i * 0.25) + i * 2) * 4;
    const fl = 0.7 + 0.3 * Math.sin(t * 9 + i * 2.2);
    stars.push(
      <div key={'chh' + i} style={{ position: 'absolute', left: cx - 15, top: cy - 17, width: 30, height: 30, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.28), rgba(251,191,36,0))' }} />
    );
    stars.push(
      <div key={'cd' + i} style={{ position: 'absolute', left: cx - 2.5, top: cy, width: 5, height: 12, borderRadius: 2, background: '#f2e7cf', boxShadow: '0 1px 2px rgba(0,0,0,0.45)' }} />
    );
    stars.push(
      <div key={'cff' + i} style={{ position: 'absolute', left: cx - 2, top: cy - 7, width: 4, height: 7, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: '#fbbf24', boxShadow: `0 0 ${8 + fl * 8}px rgba(251,191,36,0.9)`, opacity: fl, transform: `scaleY(${0.9 + fl * 0.2})` }} />
    );
  }
  for (let i = 0; i < 3; i++) {
    const tw = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 2.4);
    stars.push(
      <div key={'sx' + i} style={{
        position: 'absolute', left: 150 + ctRnd(i * 13 + 3) * 340, top: 12 + ctRnd(i * 17 + 5) * 46,
        fontSize: 9 + i * 2, lineHeight: 1, color: i % 2 ? '#fde68a' : '#f2b34c',
        textShadow: '0 0 8px rgba(253,230,138,0.9)',
        transform: `scale(${0.7 + tw * 0.5}) rotate(${t * 30 + i * 40}deg)`,
        opacity: 0.35 + tw * 0.6,
      }}>✦</div>
    );
  }

  // ---- 退治後の魂の火 (ひとだま)
  const soulEls = [];
  if ((pat === 'shot' || pat === 'game' || pat === 'anime') && at >= 0) {
    for (let k = 0; k < 2; k++) {
      const p = ctClamp((at - (0.95 + k * 0.18)) / 0.8, 0, 1);
      if (p <= 0 || p >= 1) continue;
      const x = GX + (k ? 34 : -30) + Math.sin(p * 5 + k) * 10;
      const y = GY - 10 - CTEase.easeOutCubic(p) * 62;
      const s = k ? 12 : 16;
      soulEls.push(
        <div key={'so' + k} style={{
          position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s,
          borderRadius: '50% 50% 50% 0',
          background: 'radial-gradient(circle at 40% 40%, #fff, rgba(196,181,253,0.75))',
          boxShadow: '0 0 14px rgba(196,181,253,0.9)',
          transform: `rotate(${-45 + Math.sin(p * 6) * 12}deg)`,
          opacity: Math.sin(p * Math.PI),
        }} />
      );
    }
  }

  // ---- 浄化のキラキラ (正しい語の周り)
  const pupEls = [];
  if (cwP > 0) {
    for (let i = 0; i < 6; i++) {
      const p = ctClamp((at - cwT - 0.05) / (0.5 + ctRnd(i) * 0.25), 0, 1);
      if (p <= 0 || p >= 1) continue;
      const a = ctRnd(i + 11) * Math.PI * 2;
      const d = CTEase.easeOutCubic(p) * (32 + ctRnd(i + 12) * 38);
      pupEls.push(
        <div key={'pu' + i} style={{
          position: 'absolute', left: GX + Math.cos(a) * d, top: 158 + Math.sin(a) * d * 0.7 - 10 * p,
          fontSize: 9 + ctRnd(i) * 5, lineHeight: 1,
          color: ['#34d399', '#fde68a', '#f9a8d4'][i % 3],
          textShadow: '0 0 8px rgba(253,230,138,0.8)',
          transform: `translate(-50%, -50%) rotate(${p * 200}deg) scale(${1 - p * 0.3})`,
          opacity: 1 - p,
        }}>✦</div>
      );
    }
  }

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%', height: 200, overflow: 'hidden',
      fontFamily: CT_FONT, color: CT.text,
    }}>
      {orbEl}
      {kotodamaEl}

      {/* 本棚 (両サイド) */}
      <CTShelfCol side="l" />
      <CTShelfCol side="r" />
      {/* 床 (磨かれた木の反射) */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, background: 'linear-gradient(180deg, rgba(122,78,34,0), rgba(122,78,34,0.32))' }} />
      <div style={{ position: 'absolute', left: 24, right: 24, top: 176, height: 1.5, background: 'linear-gradient(90deg, rgba(232,176,75,0), rgba(232,176,75,0.6), rgba(232,176,75,0))', boxShadow: '0 0 14px rgba(232,176,75,0.4)' }} />
      {/* 棚下・中央の灯り溜まり */}
      <div style={{ position: 'absolute', left: 8, bottom: 4, width: 150, height: 26, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(240,180,90,0.3), rgba(240,180,90,0))', filter: 'blur(4px)' }} />
      <div style={{ position: 'absolute', right: 8, bottom: 4, width: 150, height: 26, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(240,180,90,0.3), rgba(240,180,90,0))', filter: 'blur(4px)' }} />
      <div style={{ position: 'absolute', left: '50%', bottom: 2, width: 220, height: 30, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(240,180,90,0.18), rgba(240,180,90,0))', filter: 'blur(5px)', transform: 'translateX(-50%)' }} />
      {/* ビネット */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(12,7,3,0) 55%, rgba(12,7,3,0.55) 100%)', pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', left: '50%', top: 0, width: 640, height: 200, marginLeft: -320, transform: `translate(${sx}px, ${sy}px)` }}>

        {dust}
        {stars}

        {/* 接地グロー */}
        <div style={{ position: 'absolute', left: GX - 46, top: 172, width: 92, height: 12, borderRadius: '50%', background: 'rgba(232,176,75,0.28)', filter: 'blur(5px)', opacity: gOp }} />
        <div style={{ position: 'absolute', left: 38 + lunge, top: 178, width: 94, height: 11, borderRadius: '50%', background: 'rgba(232,176,75,0.24)', filter: 'blur(5px)' }} />

        {wisps}
        {lockEls}
        {chargeFx}

        {/* バスター (人+掃除機一体) */}
        <div style={{
          position: 'absolute', left: 24, top: 46 + busterBob, width: 116, height: 140,
          transform: `translateX(${lunge}px) rotate(${tilt}deg) scale(${1 + burp * 0.1}, ${1 - burp * 0.12})`, transformOrigin: '50% 95%',
        }}>
          <image-slot id="buster" shape="rect" fit="contain" placeholder="人+武器PNG"></image-slot>
        </div>

        {/* お化け */}
        {gOp > 0.01 && (
          <div style={{
            position: 'absolute', left: GX - 52, top: GY - 56 + bobY,
            width: 104, height: 104,
            transform: `translate(${gTx}px, ${gTy}px) scale(${gScale * gSx}, ${gScale * gSy}) rotate(${gRot + swayR}deg)`,
            transformOrigin: '50% 80%',
            opacity: gOp,
            filter: `brightness(${bright})${gBlur ? ` blur(${gBlur}px)` : ''}`,
          }}>
            <image-slot id="ghost" shape="rect" fit="contain" placeholder="お化けPNG"></image-slot>
          </div>
        )}

        {fx}
        {soulEls}
        {cardEls}
        {pupEls}

        {/* 文字化けチップ (ホロガラス) */}
        {!chipGone && (
          <div style={{
            position: 'absolute', left: GX, top: 158, transform: 'translate(-50%, -50%)',
            padding: '6px 16px', borderRadius: 999,
            background: `rgba(26,20,50,${0.6 * chipBgOp})`,
            border: `1px solid rgba(249,168,212,${0.55 * chipBgOp})`,
            boxShadow: `0 0 16px rgba(244,114,182,${0.28 * chipBgOp})`,
            fontSize: 17, fontWeight: 700, color: '#fda4af', letterSpacing: 1, whiteSpace: 'nowrap',
          }}>{chars}</div>
        )}

        {/* 正しい語 */}
        {cwP > 0 && (
          <div style={{
            position: 'absolute', left: GX, top: 158,
            transform: `translate(-50%, -50%) scale(${cwScale})`,
            padding: '7px 18px', borderRadius: 999,
            background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: `0 0 0 3px rgba(52,211,153,${0.3 * ring}), 0 0 ${30 * ring}px rgba(52,211,153,${0.5 * ring}), 0 2px 8px rgba(0,0,0,0.3)`,
            fontSize: 18, fontWeight: 700, color: CT.success, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: CT.success, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
            {correctWord}
          </div>
        )}

        {/* 辞書登録ノート */}
        {dictP > 0 && (
          <div style={{
            position: 'absolute', left: GX, top: 190,
            transform: `translate(-50%, -50%) scale(${CTEase.easeOutBack(dictP)})`,
            padding: '4px 12px', borderRadius: 999,
            background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(165,180,252,0.5)',
            boxShadow: '0 0 12px rgba(99,102,241,0.4)',
            fontSize: 12, fontWeight: 600, color: CT.indigoLight, whiteSpace: 'nowrap',
          }}>ユーザー辞書に登録しました</div>
        )}

      </div>
    </div>
  );
}

window.CardTaiji = CardTaiji;
