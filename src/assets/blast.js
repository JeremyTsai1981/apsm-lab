/* APSM 首頁主視覺：爆炸波傳遞與建築物反射（Kinney–Graham 經驗式即時計算，示意用）
   W = 100 kg TNT，爆心離地 1 m，距建築物 15 m。 */
(function () {
  var cv = document.getElementById('blast');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var hudT = document.getElementById('hud-t');
  var hudP = document.getElementById('hud-p');
  var hudPs = document.getElementById('hud-ps');

  // ---------- 物理 ----------
  var PA = 101.325, A0 = 340, W = 100, W3 = Math.cbrt(W), B = 1.8;
  function kgPs(Z) { // kPa
    return PA * 808 * (1 + Math.pow(Z / 4.5, 2)) /
      Math.sqrt((1 + Math.pow(Z / 0.048, 2)) * (1 + Math.pow(Z / 0.32, 2)) * (1 + Math.pow(Z / 1.35, 2)));
  }
  function kgTd(Z) { // ms
    return W3 * 980 * (1 + Math.pow(Z / 0.54, 10)) /
      ((1 + Math.pow(Z / 0.02, 3)) * (1 + Math.pow(Z / 0.74, 6)) * Math.sqrt(1 + Math.pow(Z / 6.9, 2)));
  }
  function reflect(p) { return 2 * p * (7 * PA + 4 * p) / (7 * PA + p); }
  var DR = 0.05, NR = 1600, R0 = 0.4; // 0–80 m
  var tabPs = new Float32Array(NR), tabTa = new Float32Array(NR), tabTd = new Float32Array(NR);
  (function () {
    var t = 0;
    for (var i = 0; i < NR; i++) {
      var R = Math.max(R0, i * DR), Z = R / W3, p = kgPs(Z);
      tabPs[i] = p; tabTd[i] = kgTd(Math.max(Z, 0.6));
      if (i > 0) { var U = A0 * Math.sqrt(1 + 6 * p / (7 * PA)); t += DR / U * 1000; }
      tabTa[i] = t;
    }
  })();
  function press(R, t) {
    var i = Math.min(NR - 1, (R / DR) | 0);
    var tau = t - tabTa[i];
    if (tau < 0) return 0;
    var td = tabTd[i], x = tau / td;
    if (x > 6) return 0;
    return tabPs[i] * (1 - x) * Math.exp(-B * x);
  }

  // ---------- 場景 ----------
  var XC, YC = 1.0, XW, HB = 12, DB = 14, VW, VH, GROUND, S; // S = px per m (grid)
  var gw, gh, img, data, off, octx;
  var LOGMAX = Math.log10(1 + 2500);
  var STOPS = [[0, 30, 60, 255], [0.25, 0, 190, 255], [0.5, 40, 230, 80], [0.72, 255, 235, 0], [1, 255, 40, 20]];
  function palette(v) {
    for (var k = 1; k < STOPS.length; k++) {
      if (v <= STOPS[k][0]) {
        var a = STOPS[k - 1], b = STOPS[k], f = (v - a[0]) / (b[0] - a[0]);
        return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
      }
    }
    return [255, 40, 20];
  }
  var LUT = []; for (var q = 0; q <= 255; q++) LUT.push(palette(q / 255));

  var cssW = 0, cssH = 0, dpr = 1;
  function layout() {
    var r = cv.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    var mobile = cssW < 700;
    VW = mobile ? 34 : 50;
    VH = VW * cssH / cssW;
    XC = VW * (mobile ? 0.30 : 0.56);
    XW = XC + 15;
    GROUND = 0.16; // 地面在畫面底部 16%
    gw = mobile ? 200 : 340; gh = Math.round(gw * cssH * (1 - 0.16) / cssW);
    off = document.createElement('canvas'); off.width = gw; off.height = gh;
    octx = off.getContext('2d'); img = octx.createImageData(gw, gh); data = img.data;
  }
  // 世界座標 -> 螢幕
  function sx(x) { return x / VW * cssW; }
  function sy(y) { return cssH * (1 - GROUND) - y / VH * cssH; }

  function frontR(t) { // 由到達時間反查波前半徑
    var lo = 0, hi = NR - 1;
    if (t <= 0) return 0; if (t >= tabTa[hi]) return hi * DR;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (tabTa[m] < t) lo = m; else hi = m; }
    return lo * DR;
  }
  var peakWall = 0;
  function field(t) {
    var yTopW = VH * (1 - GROUND); // 畫面頂端對應的世界 y
    var xi = 2 * XW - XC; // 牆面鏡像爆心
    for (var j = 0; j < gh; j++) {
      var y = yTopW * (1 - (j + 0.5) / gh);
      for (var i = 0; i < gw; i++) {
        var x = (i + 0.5) / gw * VW, o = (j * gw + i) * 4, p = 0;
        if (y < 0 || (x >= XW && x <= XW + DB && y <= HB)) { data[o + 3] = 0; continue; }
        var dx = x - XC, dy = y - YC;
        var shadow = false;
        if (x > XW && y < HB) { var ya = YC + dy * (XW - XC) / dx; shadow = ya < HB; }
        var p1 = press(Math.sqrt(dx * dx + dy * dy), t);
        var p2 = press(Math.sqrt(dx * dx + (y + YC) * (y + YC)), t);
        p = shadow ? 0.3 * (p1 + p2) : p1 + p2;
        if (x < XW) {
          var ex = x - xi, yh = YC + dy * (XW - xi) / ex;
          if (yh >= 0 && yh <= HB) {
            var Rw = Math.sqrt((XW - XC) * (XW - XC) + (yh - YC) * (yh - YC));
            var ps = tabPs[Math.min(NR - 1, (Rw / DR) | 0)];
            var k = Math.min(2.6, reflect(ps) / ps - 1);
            p += k * (press(Math.sqrt(ex * ex + dy * dy), t) + press(Math.sqrt(ex * ex + (y + YC) * (y + YC)), t));
          }
        }
        if (p > 1.5) {
          var v = Math.min(1, Math.log10(1 + p) / LOGMAX);
          var c = LUT[(v * 255) | 0];
          data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2];
          data[o + 3] = Math.min(235, 60 + v * 260);
        } else if (p < -0.5) {
          data[o] = 40; data[o + 1] = 70; data[o + 2] = 160; data[o + 3] = Math.min(90, -p * 18);
        } else data[o + 3] = 0;
      }
    }
    octx.putImageData(img, 0, 0);
  }

  function wallPressure(t) {
    var pi = press(Math.sqrt(Math.pow(XW - XC, 2) + Math.pow(4 - YC, 2)), t) +
             press(Math.sqrt(Math.pow(XW - XC, 2) + Math.pow(4 + YC, 2)), t);
    return pi > 0 ? reflect(pi) : 0;
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    // 格線（模擬網格感）
    ctx.strokeStyle = 'rgba(120,160,210,0.06)'; ctx.lineWidth = 1;
    for (var gx = 0; gx <= VW; gx += 2) { ctx.beginPath(); ctx.moveTo(sx(gx), 0); ctx.lineTo(sx(gx), sy(0)); ctx.stroke(); }
    for (var gy = 0; gy <= VH; gy += 2) { ctx.beginPath(); ctx.moveTo(0, sy(gy)); ctx.lineTo(cssW, sy(gy)); ctx.stroke(); }
    // 壓力場
    field(t);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.save(); ctx.filter = 'blur(' + Math.max(1.5, cssW / gw * 0.9) + 'px)';
    ctx.drawImage(off, 0, 0, cssW, cssH * (1 - GROUND));
    ctx.restore();
    // 震波波前（入射與反射）細線
    var Rf = frontR(t);
    if (Rf > 0.6) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, cssW, sy(0)); ctx.clip();
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(235,250,255,0.75)';
      ctx.beginPath(); ctx.arc(sx(XC), sy(YC), sx(XC + Rf) - sx(XC), Math.PI, 2 * Math.PI); ctx.stroke();
      if (Rf > XW - XC) {
        ctx.beginPath(); ctx.rect(0, 0, sx(XW), sy(0)); ctx.clip();
        ctx.strokeStyle = 'rgba(255,220,160,0.7)';
        var xi = 2 * XW - XC;
        ctx.beginPath(); ctx.arc(sx(xi), sy(YC), sx(XC + Rf) - sx(XC), Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      }
      ctx.restore();
    }
    // 火球
    if (t < 9) {
      var fr = sx(XC + 0.8 + Math.sqrt(t) * 0.9) - sx(XC), a = Math.pow(1 - t / 9, 1.4);
      var g = ctx.createRadialGradient(sx(XC), sy(YC), 0, sx(XC), sy(YC), fr);
      g.addColorStop(0, 'rgba(255,255,235,' + a + ')'); g.addColorStop(0.45, 'rgba(255,190,60,' + a * 0.9 + ')'); g.addColorStop(1, 'rgba(255,90,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx(XC), sy(YC), fr, 0, 7); ctx.fill();
    }
    // 地面
    ctx.fillStyle = '#0E1A2C'; ctx.fillRect(0, sy(0), cssW, cssH - sy(0));
    ctx.strokeStyle = 'rgba(160,190,220,0.35)'; ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(cssW, sy(0)); ctx.stroke();
    // 建築物（RC 構架）
    var pw = wallPressure(t); if (pw > peakWall) peakWall = pw;
    var shake = Math.min(3, pw / 120);
    var bx = sx(XW) + shake * Math.sin(t * 2.3), by = sy(HB), bw = sx(XW + DB) - sx(XW), bh = sy(0) - sy(HB);
    ctx.fillStyle = '#1C2C45'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(190,210,235,0.55)'; ctx.lineWidth = 1.2; ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(190,210,235,0.18)'; ctx.lineWidth = 1;
    for (var f = 1; f < 4; f++) { var yy = by + bh * f / 4; ctx.beginPath(); ctx.moveTo(bx, yy); ctx.lineTo(bx + bw, yy); ctx.stroke(); }
    for (var c2 = 1; c2 < 4; c2++) { var xx = bx + bw * c2 / 4; ctx.beginPath(); ctx.moveTo(xx, by); ctx.lineTo(xx, by + bh); ctx.stroke(); }
    // 迎爆面受壓顯示
    if (pw > 2) {
      var v = Math.min(1, Math.log10(1 + pw) / LOGMAX), c = LUT[(v * 255) | 0];
      ctx.fillStyle = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
      ctx.fillRect(bx - 3, by, 5, bh);
    }
    // 爆心標記與距離標註
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(sx(XC), sy(YC), 3, 0, 7); ctx.fill();
    var yd = sy(0) + 18;
    ctx.strokeStyle = 'rgba(190,210,235,0.6)'; ctx.beginPath();
    ctx.moveTo(sx(XC), yd); ctx.lineTo(sx(XW), yd); ctx.moveTo(sx(XC), yd - 5); ctx.lineTo(sx(XC), yd + 5); ctx.moveTo(sx(XW), yd - 5); ctx.lineTo(sx(XW), yd + 5); ctx.stroke();
    ctx.fillStyle = 'rgba(210,225,240,0.85)'; ctx.font = '12px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('R = 15 m', (sx(XC) + sx(XW)) / 2, yd - 6);
    ctx.textAlign = 'left'; ctx.fillText('W = 100 kg TNT', sx(XC) - 44, sy(0) + 38);
    // HUD
    if (hudT) hudT.textContent = t.toFixed(1);
    if (hudP) hudP.textContent = Math.round(peakWall);
  }

  var T_END = 115, SPEED = 15 /* ms 模擬 / 秒 */, HOLD = 1.2, start = null, raf = null, visible = true;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now) {
    if (start === null) start = now;
    var s = (now - start) / 1000, t = s * SPEED;
    if (t > T_END) { if (s > T_END / SPEED + HOLD) { start = now; peakWall = 0; t = 0; } else t = T_END; }
    draw(t);
    raf = visible ? requestAnimationFrame(frame) : null;
  }
  function run() { if (!raf && visible && !reduce) raf = requestAnimationFrame(frame); }
  layout();
  if (hudPs) hudPs.textContent = Math.round(kgPs(15 / W3));
  if (reduce) { peakWall = 0; for (var tt = 0; tt <= 26; tt += 0.5) peakWall = Math.max(peakWall, wallPressure(tt)); draw(26); }
  else run();
  window.addEventListener('resize', function () { layout(); if (reduce) draw(26); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) run(); }).observe(cv);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) { start = null; run(); } });
})();
