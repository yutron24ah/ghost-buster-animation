// taiji-scene.jsx — 文字お化け退治エフェクト (Kintai Auto palette)
// window から animations.jsx のエンジンを読む (from= の読み込み順で保証される)
const { Stage, Sprite, useTime, Easing, interpolate, clamp } = window;

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif';
const C = {
  bg: '#f8f9fb', surface: '#ffffff',
  primary: '#4f46e5', primaryHover: '#4338ca',
  text: '#1f2937', muted: '#6b7280', border: '#e5e7eb',
  error: '#dc2626', success: '#059669', tint: '#f3f4f6',
  indigoLight: '#a5b4fc', dark: '#111827', indigoDeep: '#312e81',
};

const PATTERNS = {
  // テンション違い (叩いて退治)
  game:  { label: 'ゲーム風',     mode: 'smash', fx: 'game',  dur: 6.6, approve: 0.5, attack: 1.75, hit: 2.2,  replace: 2.9,  orb: 4.0,  eat: 4.75, particles: 0,  shake: 9,  beam: true },
  anime: { label: 'アニメ風',     mode: 'smash', fx: 'anime', dur: 6.4, approve: 0.5, attack: 1.1,  hit: 1.62, replace: 2.5,  orb: 3.6,  eat: 4.35, particles: 22, shake: 13, beam: false },
  web:   { label: 'モダンWeb風',  mode: 'smash', fx: 'web',   dur: 5.4, approve: 0.5, attack: 0.95, hit: 1.3,  replace: 1.75, orb: 2.7,  eat: 3.4,  particles: 0,  shake: 3,  beam: false },
  standard: { label: 'しっかり',     mode: 'smash', dur: 5.2, approve: 0.7, attack: 1.2, hit: 1.7, replace: 2.05, orb: 2.95, eat: 3.7, particles: 14, shake: 5,  beam: true },
  comic:    { label: '派手コミカル', mode: 'smash', dur: 6.8, approve: 0.7, attack: 1.3, hit: 1.9, replace: 2.5,  orb: 3.7,  eat: 4.5, particles: 26, shake: 14, beam: true, comic: true },
  // 退治スタイル違い
  vacuum: { label: '吸い込み',     mode: 'vacuum', dur: 5.4, approve: 0.7, attack: 1.15, hit: 1.6,  replace: 2.75, orb: 3.5,  eat: 4.2,  particles: 0,  shake: 0,  beam: false, suckEnd: 2.6 },
  slash:  { label: '斬撃',         mode: 'slash',  dur: 4.6, approve: 0.6, attack: 1.0,  hit: 1.45, replace: 1.95, orb: 2.75, eat: 3.45, particles: 10, shake: 6,  beam: false },
  ascend: { label: 'ポワッと成仏', mode: 'ascend', dur: 5.0, approve: 0.7, attack: 1.1,  hit: 1.55, replace: 2.1,  orb: 3.1,  eat: 3.8,  particles: 0,  shake: 0,  beam: false },
};

function rnd(i) { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function lerp(a, b, p) { return a + (b - a) * p; }
function bez(p0, p1, p2, u) {
  const v = 1 - u;
  return [v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0],
          v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]];
}

function EffectScene({ cfg, ghostWord, correctWord, t, showChip = true, dictNote = false }) {
  const { approve, attack, hit, replace, orb, eat } = cfg;
  const mode = cfg.mode;
  const fx = cfg.fx || null;
  const GX = 640, GY = 290;       // お化け中心
  const WX = 430, WY = 430;       // 武器の先端 (吸い込み先)

  // ---- 画面シェイク
  let shakeK = t > hit && t < hit + 0.45 ? 1 - (t - hit) / 0.45 : 0;
  let shakeAmp = cfg.shake;
  if (mode === 'vacuum' && t > hit && t < cfg.suckEnd) { shakeK = 0.4; shakeAmp = 4; }
  const sx = Math.sin(t * 90) * shakeAmp * shakeK;
  const sy = Math.cos(t * 70) * shakeAmp * 0.6 * shakeK;

  // ---- バスターの踏み込み
  const lungeMax = mode === 'slash' ? 200 : mode === 'vacuum' ? 30 : fx === 'anime' ? 190 : 70;
  const lungeP = clamp((t - attack) / Math.max(hit - attack, 0.1), 0, 1);
  const backP = clamp((t - hit) / (mode === 'slash' || fx === 'anime' ? 0.6 : 0.4), 0, 1);
  const lungeHold = mode === 'vacuum' ? (t < cfg.suckEnd ? 1 : 1 - clamp((t - cfg.suckEnd) / 0.4, 0, 1)) : (1 - Easing.easeOutQuad(backP));
  const lunge = Easing.easeInCubic(lungeP) * lungeMax * lungeHold;

  // ---- 武器の回転
  const swingF = interpolate(
    [attack, (attack + hit) / 2, hit, hit + 0.3],
    [-12, -62, 48, 14],
    Easing.easeInOutQuad
  );
  let wrot;
  if (t < attack) {
    wrot = -12 + Math.sin(t * 2) * 4;
  } else if (mode === 'vacuum') {
    wrot = lerp(-12, -32, clamp((t - attack) / 0.25, 0, 1)) + (t > hit && t < cfg.suckEnd ? Math.sin(t * 40) * 2.5 : 0);
  } else if (mode === 'slash' || fx === 'anime') {
    wrot = interpolate([attack, attack + 0.25, hit, hit + 0.3], [-12, -75, 62, 18], Easing.easeInOutQuad)(t);
  } else {
    wrot = swingF(t);
  }

  // ---- 不気味な妖気 (退治されるまで): 揺らめく黒い霊気 + 明滅
  const spookK = fx === 'web' ? 0.45 : fx ? 1 : 0.6;
  const spookOut = 1 - clamp((t - hit) / 0.3, 0, 1);
  const wisps = [];
  if (spookOut > 0.01) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = t * (0.7 + rnd(i) * 0.5) + (i / n) * Math.PI * 2;
      const r = 118 + Math.sin(t * 1.7 + i * 2.4) * 26;
      const s = 22 + rnd(i + 8) * 22 + Math.sin(t * 3 + i) * 6;
      const flick = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.9);
      wisps.push(
        <div key={'w' + i} style={{
          position: 'absolute',
          left: GX + Math.cos(a) * r - s / 2,
          top: GY + Math.sin(a) * r * 0.72 - s / 2 - 10,
          width: s, height: s, borderRadius: '50%',
          background: i % 2 ? C.indigoDeep : C.dark,
          opacity: (0.1 + 0.14 * flick) * spookK * spookOut,
          filter: 'blur(6px)',
        }} />
      );
    }
  }
  // ビネット (お化けがいる間だけ画面が薄暗い)
  const vinIn = clamp(t / 0.6, 0, 1);
  const vinOp = spookK * 0.55 * vinIn * (fx ? spookOut : spookOut * 0.6);
  // お化け本体の不気味な明滅
  const eerieFlick = spookOut > 0 ? 0.92 + 0.1 * Math.sin(t * 13) - (Math.sin(t * 7.3) > 0.96 ? 0.3 : 0) : 1;

  // ---- お化けの変形 (退治スタイル別)
  const bob = Math.sin(t * 2.4) * 10;
  const dP = clamp((t - replace) / 0.5, 0, 1);
  const hitJit = mode === 'smash' && t > hit && t < replace
    ? Math.sin(t * 55) * 9 * (1 - (t - hit) / Math.max(replace - hit, 0.1)) : 0;
  let gTx = 0, gTy = 0, gScale = 1, gRot = 0, gOp = 1, gSx = 1, gSy = 1;
  if (mode === 'vacuum') {
    const suckP = Easing.easeInCubic(clamp((t - hit) / (cfg.suckEnd - hit), 0, 1));
    gTx = (WX - GX) * suckP + (suckP > 0 && suckP < 1 ? Math.sin(t * 30) * 6 * (1 - suckP) : 0);
    gTy = (WY - GY) * suckP;
    gScale = 1 - suckP * 0.92;
    gRot = suckP * 400;
    gOp = suckP < 0.9 ? 1 : 1 - (suckP - 0.9) / 0.1;
  } else if (mode === 'slash') {
    const fallP = clamp((t - (hit + 0.18)) / Math.max(replace - hit - 0.18, 0.2), 0, 1);
    gRot = Easing.easeInQuad(fallP) * 84;
    gTy = Easing.easeInQuad(fallP) * 60;
    gOp = 1 - Easing.easeInQuad(fallP);
  } else if (mode === 'ascend') {
    gTy = -Easing.easeInOutQuad(dP) * 230;
    gScale = 1 - dP * 0.15;
    gOp = 1 - Easing.easeInQuad(dP);
  } else if (fx === 'game') {
    // レトロゲーの点滅消滅
    gOp = 1 - Easing.easeInQuad(dP);
    if (t > replace && t < replace + 0.42) gOp = Math.floor(t * 28) % 2 ? gOp : 0;
    gScale = 1;
  } else if (fx === 'anime') {
    // 吹っ飛ばされて消える
    gTx = Easing.easeOutCubic(dP) * 170;
    gTy = -Easing.easeOutCubic(dP) * 70;
    gRot = dP * 28;
    gOp = 1 - Easing.easeInQuad(dP);
  } else if (fx === 'web') {
    // ぷにっと潰れて膨らんでポップ
    const sq = t > hit && t < hit + 0.5 ? Math.sin(clamp((t - hit) / 0.5, 0, 1) * Math.PI) : 0;
    gSx = 1 + sq * 0.22;
    gSy = 1 - sq * 0.26;
    gScale = 1 + Easing.easeInCubic(dP) * 0.45;
    gOp = 1 - Easing.easeInCubic(dP);
  } else {
    gScale = 1 + dP * (cfg.comic ? 0.25 : 0.3);
    gRot = cfg.comic ? dP * 540 : 0;
    gTy = -dP * (cfg.comic ? 140 : 50);
    gOp = 1 - Easing.easeInQuad(dP);
  }
  const ghostBright = mode !== 'ascend' && t > hit && t < hit + 0.22 ? 2.1 : eerieFlick;

  // ---- ヒットストップ / インパクトフレーム (anime)
  const impactA = fx === 'anime' && t > hit && t < hit + 0.09;
  const impactB = fx === 'anime' && t >= hit + 0.09 && t < hit + 0.18;
  // ---- 画面フラッシュ (game)
  const gFlashP = fx === 'game' ? clamp((t - hit) / 0.2, 0, 1) : 1;

  // ---- ヒットフラッシュ / ビーム
  const flashOn = mode === 'smash' || mode === 'slash';
  const flashP = clamp((t - hit) / 0.3, 0, 1);
  const beamOn = cfg.beam && t > hit - 0.06 && t < hit + 0.22;
  const beamP = clamp((t - (hit - 0.06)) / 0.28, 0, 1);
  const bx0 = 400 + lunge, by0 = 440;
  const bdx = GX - bx0, bdy = (GY + 40) - by0;
  const blen = Math.sqrt(bdx * bdx + bdy * bdy);
  const bang = Math.atan2(bdy, bdx) * 180 / Math.PI;

  // ---- パーティクル (hit)
  const parts = [];
  for (let i = 0; i < cfg.particles; i++) {
    const life = 0.5 + rnd(i + 99) * 0.4;
    const p = clamp((t - (fx === 'anime' ? hit + 0.18 : hit)) / life, 0, 1);
    if (p <= 0 || p >= 1) continue;
    const a = rnd(i) * Math.PI * 2;
    const d = Easing.easeOutCubic(p) * (120 + rnd(i + 50) * 240);
    const s = 7 + rnd(i + 7) * 9;
    parts.push(
      <div key={'pt' + i} style={{
        position: 'absolute',
        left: GX + Math.cos(a) * d - s / 2,
        top: GY + Math.sin(a) * d * 0.8 - s / 2,
        width: s, height: s,
        borderRadius: (fx === 'anime' || cfg.comic) && i % 3 === 0 ? 2 : '50%',
        background: fx === 'anime' ? (i % 2 ? '#fff' : C.primary) : [C.primary, C.success, C.indigoLight][i % 3],
        opacity: 1 - p,
        transform: cfg.comic && i % 3 === 0 ? `rotate(${rnd(i + 3) * 360 + p * 240}deg)` : 'none',
        boxShadow: fx === 'anime' && i % 2 ? '0 0 8px rgba(79,70,229,0.7)' : 'none',
      }} />
    );
  }

  // ================= fx: game =================
  const gameFx = [];
  if (fx === 'game') {
    // エンカウント窓
    const encIn = Easing.easeOutQuad(clamp((t - 0.75) / 0.2, 0, 1));
    const encOut = clamp((t - 1.55) / 0.2, 0, 1);
    if (encIn > 0 && encOut < 1) {
      gameFx.push(
        <div key="enc" style={{
          position: 'absolute', left: '50%', bottom: 34, transform: `translateX(-50%) translateY(${(1 - encIn) * 20}px)`,
          opacity: encIn * (1 - encOut),
          background: C.dark, color: '#fff', border: '3px solid #fff',
          outline: `2px solid ${C.dark}`, borderRadius: 4,
          padding: '16px 28px', fontSize: 26, fontWeight: 700, letterSpacing: 3,
          fontFamily: FONT, whiteSpace: 'nowrap',
        }}>もじおばけが あらわれた!</div>
      );
    }
    // HP バー
    const hpOut = clamp((t - (replace + 0.3)) / 0.25, 0, 1);
    const hpIn = Easing.easeOutQuad(clamp((t - 0.9) / 0.25, 0, 1));
    if (hpIn > 0 && hpOut < 1) {
      const hp = 1 - Easing.easeOutCubic(clamp((t - hit) / 0.45, 0, 1));
      gameFx.push(
        <div key="hp" style={{ position: 'absolute', left: GX - 110, top: GY - 196, width: 220, opacity: hpIn * (1 - hpOut) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#fff', textShadow: `0 1px 0 ${C.dark}, 0 0 4px ${C.dark}`, marginBottom: 4 }}>
            <span>もじおばけ</span><span>HP</span>
          </div>
          <div style={{ height: 12, borderRadius: 3, background: C.dark, border: '2px solid #fff', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: hp * 100 + '%', background: hp > 0.4 ? C.success : C.error, transition: 'none' }} />
          </div>
        </div>
      );
    }
    // ダメージ数字
    const dmgP = clamp((t - hit) / 0.85, 0, 1);
    if (dmgP > 0 && dmgP < 1) {
      gameFx.push(
        <div key="dmg" style={{
          position: 'absolute', left: GX + 55, top: GY - 150 - Easing.easeOutCubic(dmgP) * 55,
          transform: `scale(${Easing.easeOutBack(Math.min(dmgP * 3, 1))}) rotate(-6deg)`,
          fontSize: 72, fontWeight: 900, color: C.primary,
          textShadow: '-3px 0 0 #fff, 3px 0 0 #fff, 0 -3px 0 #fff, 0 3px 0 #fff',
          opacity: 1 - Easing.easeInQuad(dmgP), fontFamily: FONT,
        }}>999</div>
      );
    }
    // 画面全体フラッシュ
    if (gFlashP < 1) {
      gameFx.push(
        <div key="gfl" style={{ position: 'absolute', inset: 0, background: '#fff', opacity: (1 - gFlashP) * 0.85, zIndex: 5 }} />
      );
    }
    // ピクセル崩壊
    for (let i = 0; i < 18; i++) {
      const p = clamp((t - (replace + 0.2)) / (0.55 + rnd(i) * 0.3), 0, 1);
      if (p <= 0 || p >= 1) continue;
      const a = rnd(i * 2) * Math.PI * 2;
      const d = Easing.easeOutCubic(p) * (90 + rnd(i + 60) * 160);
      const s = 12 + rnd(i + 5) * 12;
      gameFx.push(
        <div key={'px' + i} style={{
          position: 'absolute',
          left: GX + Math.cos(a) * d - s / 2,
          top: GY - 20 + Math.sin(a) * d * 0.75 + p * p * 60 - s / 2,
          width: s, height: s,
          background: [C.dark, C.primary, C.indigoLight][i % 3],
          opacity: 1 - p,
        }} />
      );
    }
    // 勝利メッセージ
    const winIn = Easing.easeOutQuad(clamp((t - (replace + 0.55)) / 0.2, 0, 1));
    const winOut = clamp((t - (orb + 0.6)) / 0.25, 0, 1);
    if (winIn > 0 && winOut < 1) {
      gameFx.push(
        <div key="win" style={{
          position: 'absolute', left: '50%', bottom: 34, transform: 'translateX(-50%)',
          opacity: winIn * (1 - winOut),
          background: C.dark, color: '#fff', border: '3px solid #fff',
          outline: `2px solid ${C.dark}`, borderRadius: 4,
          padding: '16px 28px', fontSize: 26, fontWeight: 700, letterSpacing: 3, whiteSpace: 'nowrap',
        }}>もじおばけを たいじした!　▼</div>
      );
    }
  }

  // ================= fx: anime =================
  const animeFx = [];
  if (fx === 'anime') {
    // 集中線
    if (t > attack - 0.15 && t < hit + 0.4) {
      const inP = clamp((t - (attack - 0.15)) / 0.15, 0, 1);
      const outP = clamp((t - hit - 0.2) / 0.2, 0, 1);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * 360 + rnd(i) * 14;
        const flick = (Math.floor(t * 26) + i) % 3 ? 1 : 0.15;
        const len = 300 + rnd(i + 30) * 220;
        animeFx.push(
          <div key={'ln' + i} style={{
            position: 'absolute', left: GX, top: GY,
            width: len, height: 3 + rnd(i + 9) * 4, borderRadius: 3,
            background: C.dark,
            transform: `rotate(${a}deg) translateX(${330 - rnd(i + 12) * 60}px)`,
            transformOrigin: '0 50%',
            opacity: 0.5 * flick * inP * (1 - outP),
          }} />
        );
      }
    }
    // インパクトフレーム (白黒反転 2 コマ)
    if (impactA || impactB) {
      animeFx.push(
        <div key="impbg" style={{ position: 'absolute', inset: 0, background: impactA ? C.dark : '#fff', zIndex: 6 }} />
      );
      [[-33, 0], [24, 40]].forEach(([ang, off], k) => {
        animeFx.push(
          <div key={'impb' + k} style={{
            position: 'absolute', left: GX - 900, top: GY + off, width: 1800, height: k ? 14 : 26,
            background: impactA ? '#fff' : C.dark,
            transform: `rotate(${ang}deg)`, zIndex: 7,
            boxShadow: impactA ? '0 0 30px rgba(255,255,255,0.9)' : 'none',
          }} />
        );
      });
    }
    // 衝撃波リング
    const rgP = clamp((t - (hit + 0.18)) / 0.5, 0, 1);
    if (rgP > 0 && rgP < 1) {
      const rs = 60 + Easing.easeOutCubic(rgP) * 480;
      animeFx.push(
        <div key="ring" style={{
          position: 'absolute', left: GX - rs / 2, top: GY - rs / 2, width: rs, height: rs,
          borderRadius: '50%', border: `${8 * (1 - rgP) + 1}px solid ${C.primary}`,
          opacity: (1 - rgP) * 0.8,
        }} />
      );
    }
    // 大斬撃フラッシュ
    const slP = clamp((t - (hit + 0.14)) / 0.4, 0, 1);
    if (slP > 0 && slP < 1) {
      animeFx.push(
        <div key="bigsl" style={{
          position: 'absolute', left: GX - 800, top: GY - 5, width: 1600, height: 10, borderRadius: 5,
          background: '#fff', transform: 'rotate(-32deg)',
          boxShadow: `0 0 24px rgba(79,70,229,0.9), 0 0 6px ${C.primary}`,
          opacity: 1 - Easing.easeInQuad(slP), zIndex: 4,
        }} />
      );
    }
    // 「退治!!」 決めテキスト
    const btP = clamp((t - (hit + 0.22)) / 0.16, 0, 1);
    const btOut = clamp((t - (hit + 0.95)) / 0.3, 0, 1);
    if (btP > 0 && btOut < 1) {
      animeFx.push(
        <div key="bt" style={{
          position: 'absolute', left: GX, top: 120,
          transform: `translate(-50%, -50%) scale(${Easing.easeOutBack(btP)}) rotate(-7deg)`,
          fontSize: 104, fontWeight: 900, color: C.dark, letterSpacing: 6,
          textShadow: '-4px 0 0 #fff, 4px 0 0 #fff, 0 -4px 0 #fff, 0 4px 0 #fff, 6px 6px 0 rgba(79,70,229,0.35)',
          opacity: 1 - btOut, whiteSpace: 'nowrap', zIndex: 8,
        }}>退治!!</div>
      );
    }
  }

  // ================= fx: web =================
  const webFx = [];
  if (fx === 'web') {
    // ポップ (お化けが弾けて丸に)
    for (let i = 0; i < 8; i++) {
      const p = clamp((t - replace) / (0.5 + rnd(i) * 0.2), 0, 1);
      if (p <= 0 || p >= 1) continue;
      const a = (i / 8) * Math.PI * 2 + rnd(i + 3);
      const d = Easing.easeOutCubic(p) * (70 + rnd(i + 15) * 70);
      const s = 12 + rnd(i + 25) * 10;
      webFx.push(
        <div key={'pop' + i} style={{
          position: 'absolute',
          left: GX + Math.cos(a) * d - s / 2, top: GY + Math.sin(a) * d * 0.8 - s / 2,
          width: s, height: s, borderRadius: '50%',
          background: [C.indigoLight, '#6366f1', '#34d399'][i % 3],
          opacity: 1 - p, transform: `scale(${1 - p * 0.4})`,
        }} />
      );
    }
    // 紙吹雪
    for (let i = 0; i < 16; i++) {
      const p = clamp((t - (replace + 0.1)) / (0.9 + rnd(i) * 0.5), 0, 1);
      if (p <= 0 || p >= 1) continue;
      const x0 = GX - 160 + rnd(i * 7) * 320;
      const sway = Math.sin(p * 6 + i) * 30;
      webFx.push(
        <div key={'cf' + i} style={{
          position: 'absolute',
          left: x0 + sway, top: GY - 60 + Easing.easeInQuad(p) * 320,
          width: 8, height: 14, borderRadius: 3,
          background: [C.indigoLight, '#6366f1', '#34d399'][i % 3],
          transform: `rotate(${rnd(i + 4) * 360 + p * 400}deg)`,
          opacity: 1 - Easing.easeInQuad(p),
        }} />
      );
    }
    // トースト通知
    const tsIn = Easing.easeOutBack(clamp((t - (replace + 0.25)) / 0.35, 0, 1));
    const tsOut = clamp((t - (orb + 0.9)) / 0.3, 0, 1);
    if (tsIn > 0 && tsOut < 1) {
      webFx.push(
        <div key="toast" style={{
          position: 'absolute', right: 28, top: 110,
          transform: `translateX(${(1 - Math.min(tsIn, 1)) * 60}px)`,
          opacity: Math.min(tsIn, 1) * (1 - tsOut),
          background: C.surface, borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(79,70,229,0.12)',
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text,
        }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.success, color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
          正しい語に修正しました
        </div>
      );
    }
    // ペットのきゅん (食べたとき)
    for (let i = 0; i < 3; i++) {
      const p = clamp((t - (eat + i * 0.1)) / 0.6, 0, 1);
      if (p <= 0 || p >= 1) continue;
      webFx.push(
        <div key={'hz' + i} style={{
          position: 'absolute',
          left: 1030 + i * 32 + Math.sin(p * 5 + i) * 8, top: 440 - Easing.easeOutCubic(p) * 70,
          width: 10, height: 10, borderRadius: '50%',
          background: C.indigoLight, opacity: 1 - p,
        }} />
      );
    }
  }

  // ================= comic (派手コミカル) =================
  const comicFx = [];
  if (cfg.comic) {
    const burstP = clamp((t - hit) / 0.18, 0, 1);
    const burstOut = clamp((t - hit - 0.65) / 0.3, 0, 1);
    if (burstP > 0 && burstOut < 1) {
      comicFx.push(
        <div key="cburst" style={{
          position: 'absolute', left: GX, top: 130,
          transform: `translate(-50%, -50%) scale(${Easing.easeOutBack(burstP)}) rotate(-8deg)`,
          fontSize: 96, fontWeight: 900, color: C.primary, letterSpacing: 4,
          textShadow: '-4px 0 0 #fff, 4px 0 0 #fff, 0 -4px 0 #fff, 0 4px 0 #fff, 0 6px 20px rgba(79,70,229,0.3)',
          opacity: 1 - burstOut, whiteSpace: 'nowrap', zIndex: 8,
        }}>退治!!</div>
      );
    }
    if (t > eat && t < eat + 0.55) {
      comicFx.push(
        <div key="paku" style={{ position: 'absolute', left: 1072, top: 420, transform: 'translateX(-50%)', fontSize: 30, fontWeight: 700, color: C.text }}>ぱくっ</div>
      );
    }
  }

  // ---- 吸い込みストリーム + 武器先端の光
  const suckFx = [];
  if (mode === 'vacuum' && t > hit && t < cfg.suckEnd) {
    for (let i = 0; i < 9; i++) {
      const p = (t * 1.6 + rnd(i)) % 1;
      const x = lerp(GX, WX + lunge, p) + Math.sin(p * 9 + i) * 20 * (1 - p);
      const y = lerp(GY, WY, p) + Math.cos(p * 7 + i * 2) * 16 * (1 - p);
      const s = lerp(11, 3, p);
      suckFx.push(
        <div key={'sk' + i} style={{
          position: 'absolute', left: x - s / 2, top: y - s / 2,
          width: s, height: s, borderRadius: '50%',
          background: C.indigoLight, opacity: 0.75 * (1 - p * 0.3),
        }} />
      );
    }
    const pulse = 1 + Math.sin(t * 16) * 0.15;
    suckFx.push(
      <div key="tipglow" style={{
        position: 'absolute', left: WX + lunge - 26, top: WY - 26,
        width: 52, height: 52, borderRadius: '50%',
        background: 'rgba(79,70,229,0.25)',
        boxShadow: '0 0 26px rgba(79,70,229,0.55)',
        transform: `scale(${pulse})`,
      }} />
    );
  }

  // ---- 斬撃ライン + ダッシュの残像線
  const slashFx = [];
  if (mode === 'slash') {
    [[-38, 0], [26, 0.1]].forEach(([ang, dly], k) => {
      const p = clamp((t - (hit + dly)) / 0.3, 0, 1);
      if (p <= 0 || p >= 1) return;
      const grow = Easing.easeOutQuart(Math.min(p * 2.5, 1));
      slashFx.push(
        <div key={'sl' + k} style={{
          position: 'absolute', left: GX - 190 * grow, top: GY - 4,
          width: 380 * grow, height: 8, borderRadius: 4,
          background: '#fff',
          boxShadow: `0 0 16px rgba(79,70,229,0.8), 0 0 3px ${C.primary}`,
          transform: `rotate(${ang}deg)`,
          opacity: 1 - Easing.easeInQuad(p),
        }} />
      );
    });
    if (t > attack && t < hit + 0.25) {
      for (let i = 0; i < 3; i++) {
        const op = clamp(lungeP * 1.5, 0, 1) * (1 - backP);
        slashFx.push(
          <div key={'dz' + i} style={{
            position: 'absolute', left: 70 + lunge * 0.4 - i * 34, top: 460 + i * 62,
            width: 90 + i * 20, height: 5, borderRadius: 3,
            background: C.border, opacity: op * (1 - i * 0.25),
          }} />
        );
      }
    }
  }

  // ---- 成仏の光柱 + 輪っか
  const ascendFx = [];
  if (mode === 'ascend' && dP > 0) {
    const soft = Math.sin(Math.min(dP, 1) * Math.PI);
    ascendFx.push(
      <div key="col" style={{
        position: 'absolute', left: GX - 70, top: 0,
        width: 140, height: GY + 60,
        background: 'linear-gradient(180deg, rgba(165,180,252,0.0), rgba(165,180,252,0.35))',
        opacity: soft,
      }} />
    );
    ascendFx.push(
      <div key="halo" style={{
        position: 'absolute', left: GX - 55, top: GY - 195 + gTy,
        width: 110, height: 26, borderRadius: '50%',
        border: `7px solid ${C.indigoLight}`,
        opacity: soft,
      }} />
    );
  }

  // ---- 成仏の煙
  const puffs = [];
  const puffCount = mode === 'ascend' ? 6 : 4;
  const puffDur = mode === 'ascend' ? 0.9 : 0.6;
  const puffOn = (mode === 'smash' && fx !== 'game' && fx !== 'web') || mode === 'ascend';
  const puffP = clamp((t - replace) / puffDur, 0, 1);
  if (puffOn && puffP > 0 && puffP < 1) {
    for (let i = 0; i < puffCount; i++) {
      const a = (i / puffCount) * Math.PI * 2 + rnd(i + 20);
      const d = Easing.easeOutCubic(puffP) * (50 + rnd(i + 30) * 50);
      const s = 34 + rnd(i + 40) * 26 + puffP * 30;
      puffs.push(
        <div key={'pf' + i} style={{
          position: 'absolute',
          left: GX + Math.cos(a) * d - s / 2,
          top: GY - 20 + (mode === 'ascend' ? gTy * 0.6 : 0) + Math.sin(a) * d * 0.7 - s / 2 - puffP * 40,
          width: s, height: s, borderRadius: '50%',
          background: C.border, opacity: (1 - puffP) * 0.7,
        }} />
      );
    }
  }

  // ---- 文字化けテキスト
  const wordOut = mode === 'vacuum' ? hit + 0.1 : mode === 'slash' ? hit + 0.15 : replace;
  const q = clamp((t - wordOut) / 0.55, 0, 1);
  const wLen = ghostWord.length;
  const chars = ghostWord.split('').map((ch, i) => {
    let tr = 'none', op = 1;
    if (mode === 'vacuum') {
      const qi = Easing.easeInCubic(clamp((t - (hit + 0.15 + i * 0.07)) / 0.55, 0, 1));
      tr = `translate(${(WX - GX) * qi}px, ${(WY - 448) * qi}px) scale(${1 - qi * 0.9}) rotate(${qi * 260}deg)`;
      op = qi < 0.85 ? 1 : 1 - (qi - 0.85) / 0.15;
    } else if (mode === 'slash') {
      const e = Easing.easeOutCubic(q);
      tr = `translate(${(i - (wLen - 1) / 2) * 18 * q}px, ${(i % 2 ? -1 : 1) * e * 100}px) rotate(${(i % 2 ? -1 : 1) * (20 + rnd(i) * 30) * q}deg)`;
      op = 1 - q;
    } else {
      // 不気味: 退治前は文字がゆらゆら歪む
      const wob = spookOut > 0 && t < hit ? Math.sin(t * 4 + i * 1.7) * 3 * spookK : 0;
      const wrot2 = spookOut > 0 && t < hit ? Math.sin(t * 3.1 + i * 2.3) * 5 * spookK : 0;
      const a = rnd(i * 3 + 1) * Math.PI * 2;
      const d = Easing.easeOutCubic(q) * 150;
      tr = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.8 - 30 * q + wob}px) rotate(${rnd(i + 5) * 220 * q + wrot2}deg)`;
      op = 1 - q;
    }
    return (
      <span key={'c' + i} style={{ display: 'inline-block', transform: tr, opacity: op }}>{ch}</span>
    );
  });
  const wordGone = mode === 'vacuum'
    ? t > hit + 0.15 + wLen * 0.07 + 0.55
    : q >= 1;

  // ---- 正しい語 (浄化して置き換わる)
  const cwP = clamp((t - (replace + 0.12)) / 0.35, 0, 1);
  const cwScale = Easing.easeOutBack(cwP);
  const ring = 1 - clamp((t - (replace + 0.5)) / 0.8, 0, 1);

  // ---- ご飯オーブ
  const P0 = mode === 'vacuum' ? [WX, WY - 6] : mode === 'ascend' ? [640, 150] : mode === 'slash' ? [640, 350] : fx === 'anime' ? [GX + 170, GY - 70] : [640, 330];
  const P1 = mode === 'vacuum' ? [830, 140] : mode === 'ascend' ? [900, 80] : fx === 'game' ? [920, 90] : fx === 'anime' ? [960, 60] : cfg.comic ? [920, 60] : cfg.beam ? [900, 110] : [880, 210];
  const P2 = [1072, 520];
  const orbStart = replace + 0.35;
  const orbForm = clamp((t - orbStart) / Math.max(orb - orbStart, 0.15), 0, 1);
  const fly = clamp((t - orb) / Math.max(eat - orb, 0.1), 0, 1);
  const [ox, oy] = bez(P0, P1, P2, Easing.easeInOutQuad(fly));
  const orbVisible = t > orbStart && t < eat + 0.1;
  const orbScale = Easing.easeOutBack(orbForm) * (1 - clamp((t - eat) / 0.12, 0, 1));
  const trail = [];
  if (fx !== 'web' && fly > 0 && fly < 1) {
    for (let k = 1; k <= 3; k++) {
      const [tx, ty] = bez(P0, P1, P2, Easing.easeInOutQuad(clamp(fly - k * 0.05, 0, 1)));
      trail.push(
        <div key={'tr' + k} style={{
          position: 'absolute', left: tx - 8, top: ty - 6,
          width: 16, height: 12, borderRadius: '50%',
          background: C.success, opacity: 0.28 / k,
        }} />
      );
    }
  }

  // ---- ペット
  const petBob = Math.sin(t * 2) * 6;
  const anticip = clamp((t - (eat - 0.35)) / 0.35, 0, 1);
  const hop = t < eat ? Math.sin(anticip * Math.PI) * 14 : 0;
  const eatP = clamp((t - eat) / 0.45, 0, 1);
  const squash = Math.sin(eatP * Math.PI);
  const petScaleX = 1 + squash * 0.14;
  const petScaleY = 1 - squash * 0.16;

  // ---- ご飯ゲージ
  const gP = Easing.easeOutCubic(clamp((t - eat) / 0.5, 0, 1));
  const gaugeW = 42 + 30 * gP;
  const plusP = clamp((t - eat) / 0.9, 0, 1);

  // ---- 承認チップ
  const chipIn = Easing.easeOutBack(clamp((t - 0.15) / 0.3, 0, 1));
  const chipOut = clamp((t - (replace + 0.4)) / 0.3, 0, 1);
  const pressed = t >= approve;
  const pressDip = t >= approve && t < approve + 0.15 ? 1 : 0;

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, transform: `translate(${sx}px, ${sy}px)`, color: C.text }}>

      {/* 不気味ビネット */}
      {vinOp > 0.01 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 38%, rgba(17,24,39,0) 32%, rgba(17,24,39,0.5) 100%)',
          opacity: vinOp,
        }} />
      )}

      {ascendFx}
      {wisps}

      {/* 接地影 */}
      <div style={{ position: 'absolute', left: 555, top: 468, width: 170, height: 18, borderRadius: '50%', background: 'rgba(31,41,55,0.06)', opacity: gOp }} />
      <div style={{ position: 'absolute', left: 120, top: 668, width: 180, height: 16, borderRadius: '50%', background: 'rgba(31,41,55,0.06)' }} />
      <div style={{ position: 'absolute', left: 995, top: 632, width: 160, height: 14, borderRadius: '50%', background: 'rgba(31,41,55,0.06)' }} />

      {/* バスター (人) */}
      <div style={{ position: 'absolute', left: 90, top: 380, width: 230, height: 290, transform: `translateX(${lunge}px)` }}>
        <image-slot id="buster" shape="rect" fit="contain" placeholder="人PNG"></image-slot>
      </div>

      {/* 武器 */}
      <div style={{ position: 'absolute', left: 280, top: 388, width: 160, height: 160, transform: `translateX(${lunge}px) rotate(${wrot}deg)`, transformOrigin: '25% 85%' }}>
        <image-slot id="weapon" shape="rect" fit="contain" placeholder="武器PNG"></image-slot>
      </div>

      {/* ビーム */}
      {beamOn && (
        <div style={{
          position: 'absolute', left: bx0, top: by0,
          width: blen * Easing.easeOutQuad(Math.min(beamP * 2.2, 1)),
          height: 12, borderRadius: 6,
          background: `linear-gradient(90deg, rgba(79,70,229,0.15), ${C.primary})`,
          boxShadow: `0 0 18px rgba(79,70,229,0.55)`,
          transform: `rotate(${bang}deg)`, transformOrigin: '0 50%',
          opacity: 1 - Easing.easeInQuad(beamP),
        }} />
      )}

      {/* お化け */}
      {gOp > 0.01 && (
        <div style={{
          position: 'absolute', left: GX - 120, top: GY - 130 + bob,
          width: 240, height: 240,
          transform: `translate(${gTx + hitJit}px, ${gTy}px) scale(${gScale * gSx}, ${gScale * gSy}) rotate(${gRot}deg)`,
          transformOrigin: '50% 80%',
          opacity: gOp, filter: `brightness(${ghostBright})`,
        }}>
          <image-slot id="ghost" shape="rect" fit="contain" placeholder="お化けPNG"></image-slot>
        </div>
      )}

      {/* ヒットフラッシュ */}
      {flashOn && flashP > 0 && flashP < 1 && (
        <div style={{
          position: 'absolute', left: GX - 110, top: GY - 90,
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(79,70,229,0.3)',
          boxShadow: '0 0 60px rgba(79,70,229,0.5)',
          transform: `scale(${0.3 + Easing.easeOutCubic(flashP) * 1.3})`,
          opacity: (1 - flashP) * 0.9,
        }} />
      )}

      {parts}
      {puffs}
      {suckFx}
      {slashFx}
      {trail}
      {gameFx}
      {animeFx}
      {webFx}
      {comicFx}

      {/* 文字化けの語 (お化けの足元) */}
      {!wordGone && (
        <div style={{
          position: 'absolute', left: GX, top: 448,
          padding: '10px 20px', borderRadius: 8,
          background: `rgba(255,255,255,${1 - q})`,
          border: `1px solid rgba(220,38,38,${0.35 * (1 - q)})`,
          fontSize: 40, fontWeight: 700, color: C.error, letterSpacing: 2,
          whiteSpace: 'nowrap',
          transform: `translate(-50%, -50%) translateX(${hitJit * 0.6}px)`,
        }}>{chars}</div>
      )}

      {/* 正しい語 (浄化) */}
      {cwP > 0 && (
        <div style={{
          position: 'absolute', left: GX, top: 448,
          transform: `translate(-50%, -50%) scale(${cwScale})`,
          padding: '12px 24px', borderRadius: 8,
          background: C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: `0 0 0 3px rgba(5,150,105,${0.25 * ring}), 0 0 ${44 * ring}px rgba(5,150,105,${0.45 * ring}), 0 1px 3px rgba(0,0,0,0.04)`,
          fontSize: 44, fontWeight: 700, color: C.success, letterSpacing: 1,
          whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: C.success, color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
          {correctWord}
        </div>
      )}

      {/* 辞書登録ノート */}
      {dictNote && cwP > 0 && (
        <div style={{
          position: 'absolute', left: GX, top: 512,
          transform: `translate(-50%, 0) scale(${cwScale})`,
          padding: '8px 18px', borderRadius: 999,
          background: C.surface, border: `1px solid ${C.border}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          fontSize: 16, fontWeight: 600, color: C.primary, whiteSpace: 'nowrap',
        }}>ユーザー辞書に登録しました</div>
      )}

      {/* ご飯オーブ (お化けの魂 → ペットのご飯) */}
      {orbVisible && orbScale > 0.01 && (
        <div style={{
          position: 'absolute', left: ox - 16, top: oy - 12,
          width: 32, height: 24, borderRadius: '50%',
          background: '#fff', border: '2px solid #d1d5db',
          boxShadow: '0 0 18px rgba(5,150,105,0.6), 0 0 4px rgba(5,150,105,0.4) inset',
          transform: `scale(${orbScale}) rotate(${fly * 140}deg)`,
        }} />
      )}

      {/* ペット */}
      <div style={{
        position: 'absolute', left: 985, top: 455 + petBob - hop,
        width: 175, height: 175,
        transform: `scale(${petScaleX}, ${petScaleY})`, transformOrigin: '50% 100%',
      }}>
        <image-slot id="pet" shape="rect" fit="contain" placeholder="ペットPNG"></image-slot>
      </div>

      {/* +10 ごはん */}
      {t > eat && plusP < 1 && (
        <div style={{
          position: 'absolute', left: 1072, top: 425 - 55 * plusP, transform: 'translateX(-50%)',
          fontSize: 26, fontWeight: 700, color: C.success, opacity: 1 - plusP, whiteSpace: 'nowrap',
        }}>+10 ごはん</div>
      )}

      {/* ご飯ゲージ */}
      <div style={{ position: 'absolute', left: 972, top: 656, width: 200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 5 }}>
          <span>ごはん</span><span>Lv.3</span>
        </div>
        <div style={{ height: 12, borderRadius: 6, background: C.border, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: gaugeW + '%', borderRadius: 6, background: C.success }} />
        </div>
      </div>

      {/* 承認チップ (トリガー: 修正候補の承認) */}
      {showChip && chipOut < 1 && chipIn > 0 && (
        <div style={{
          position: 'absolute', left: '50%', top: 38,
          transform: `translateX(-50%) scale(${chipIn})`,
          opacity: Math.min(chipIn, 1) * (1 - chipOut),
          background: C.surface, borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(79,70,229,0.06)',
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 15, zIndex: 9,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>修正候補</span>
          <span style={{ color: C.error, textDecoration: 'line-through' }}>{ghostWord}</span>
          <span style={{ color: C.muted }}>→</span>
          <span style={{ fontWeight: 600 }}>{correctWord}</span>
          <div style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            color: '#fff', background: pressed ? C.success : C.primary,
            transform: `translateY(${pressDip}px)`,
          }}>{pressed ? '✓ 承認済み' : '承認'}</div>
        </div>
      )}

    </div>
  );
}

function TimedEffectScene(props) {
  const t = useTime();
  return <EffectScene {...props} t={t} />;
}

function TaijiDemo(props) {
  const pattern = PATTERNS[props.pattern] ? props.pattern : 'game';
  const cfg = PATTERNS[pattern];
  return (
    <Stage key={pattern} width={1280} height={720} duration={cfg.dur} background="#f8f9fb" autoplay={false}>
      <Sprite start={0} end={cfg.dur + 5}>
        <TimedEffectScene
          cfg={cfg}
          ghostWord={props.ghostWord || '縺薙s縺ォ縺■縺ッ'}
          correctWord={props.correctWord || 'こんにちは'}
        />
      </Sprite>
    </Stage>
  );
}

// インタラクティブ用: 自前クロックで 1 回再生して onDone を呼ぶオーバーレイ
function TaijiOverlay(props) {
  const pattern = PATTERNS[props.pattern] ? props.pattern : 'game';
  const cfg = PATTERNS[pattern];
  const [t, setT] = React.useState(0);
  const doneRef = React.useRef(false);
  React.useEffect(() => {
    let raf; const start = performance.now();
    const tick = (now) => {
      const tt = (now - start) / 1000;
      setT(tt);
      if (tt < cfg.dur + 0.25) { raf = requestAnimationFrame(tick); }
      else if (!doneRef.current) { doneRef.current = true; if (props.onDone) props.onDone(); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const w = Number(props.width) || 960;
  const scale = w / 1280;
  return (
    <div style={{ width: w, height: Math.round(720 * scale), position: 'relative', overflow: 'hidden', borderRadius: 12, background: C.bg, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(79,70,229,0.06)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <EffectScene
          cfg={cfg}
          t={t}
          showChip={false}
          dictNote={!!props.dictNote && props.dictNote !== 'false'}
          ghostWord={props.ghostWord || '文字化け'}
          correctWord={props.correctWord || '修正済み'}
        />
      </div>
    </div>
  );
}

window.TaijiDemo = TaijiDemo;
window.TaijiOverlay = TaijiOverlay;


