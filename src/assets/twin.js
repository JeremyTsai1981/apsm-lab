/* APSM 首頁互動：廠區數位孿生示意（地面爆炸超壓範圍，Kinney–Graham 經驗式，示意用）
   另含：進場動畫、影片延遲播放。 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 進場動畫
  var rv = document.querySelectorAll('.section .wrap > *, .entry .door');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }
  // 影片：進入視窗才播放；使用者偏好減少動態時只顯示靜態圖
  var hv = document.querySelector('.hero__vid'); if (hv && reduce) { hv.removeAttribute('autoplay'); hv.pause(); }
  document.querySelectorAll('video.lazyvid').forEach(function (v) {
    if (reduce) { v.controls = true; return; }
    if (!('IntersectionObserver' in window)) { v.play(); return; }
    new IntersectionObserver(function (es) { es[0].isIntersecting ? v.play().catch(function () {}) : v.pause(); }, { threshold: 0.25 }).observe(v);
  });

  // 照片集燈箱
  (function () {
    var dlg = document.getElementById('lightbox'); if (!dlg || !dlg.showModal) return;
    var items = [].slice.call(document.querySelectorAll('.masonry__i')), img = document.getElementById('lightbox-img'), cap = document.getElementById('lightbox-cap'), cur = 0;
    function show(i) { cur = (i + items.length) % items.length; img.src = items[cur].dataset.full; img.alt = items[cur].dataset.cap; cap.textContent = items[cur].dataset.cap + '（' + (cur + 1) + ' / ' + items.length + '）'; }
    items.forEach(function (b, i) { b.addEventListener('click', function () { show(i); dlg.showModal(); }); });
    dlg.addEventListener('click', function (e) { var a = e.target.dataset && e.target.dataset.act; if (a === 'prev') show(cur - 1); else if (a === 'next') show(cur + 1); else if (a === 'close' || e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  })();

  var cv = document.getElementById('twinmap'); if (!cv) return;
  var ctx = cv.getContext('2d'), PA = 101.325;
  function kgPs(Z) { return PA * 808 * (1 + Math.pow(Z / 4.5, 2)) / Math.sqrt((1 + Math.pow(Z / 0.048, 2)) * (1 + Math.pow(Z / 0.32, 2)) * (1 + Math.pow(Z / 1.35, 2))); }
  function psAt(d, W) { return kgPs(Math.max(d, 0.5) / Math.cbrt(1.8 * W)); }
  function rFor(p, W) { var lo = 0.05, hi = 3000; for (var i = 0; i < 50; i++) { var m = Math.sqrt(lo * hi); if (kgPs(m) > p) lo = m; else hi = m; } return lo * Math.cbrt(1.8 * W); }
  var LV = [[3.5, '#2C7BFF'], [14, '#00C2E8'], [35, '#35E06A'], [100, '#FFE21A'], [200, '#FF4A2A']];
  // 廠區（公尺）：x 0..260, y 0..150
  var MW = 260, MH = 150;
  var B = [
    { x: 150, y: 14, w: 70, h: 24, n: 'DC-1' }, { x: 150, y: 46, w: 70, h: 24, n: 'DC-2' }, { x: 150, y: 78, w: 70, h: 24, n: 'DC-3' },
    { x: 18, y: 14, w: 20, h: 20, n: 'T-1', r: 1 }, { x: 46, y: 14, w: 20, h: 20, n: 'T-2', r: 1 }, { x: 18, y: 42, w: 20, h: 20, n: 'T-3', r: 1 }, { x: 46, y: 42, w: 20, h: 20, n: 'T-4', r: 1 },
    { x: 84, y: 16, w: 44, h: 8, n: 'ESS-A' }, { x: 84, y: 30, w: 44, h: 8, n: 'ESS-B' }, { x: 84, y: 44, w: 44, h: 8, n: 'ESS-C' },
    { x: 16, y: 84, w: 34, h: 22, n: 'SUB' }, { x: 16, y: 114, w: 26, h: 24, n: 'CTRL' },
    { x: 64, y: 90, w: 60, h: 18, n: 'FAB' }, { x: 78, y: 118, w: 40, h: 20, n: 'UTIL' },
    { x: 150, y: 114, w: 36, h: 24, n: 'OFFICE' }, { x: 198, y: 114, w: 44, h: 24, n: 'R&D' }, { x: 232, y: 30, w: 18, h: 56, n: 'WH' }
  ];
  var S = [[76, 10], [134, 10], [76, 62], [134, 62], [10, 74], [58, 80], [140, 108], [226, 108], [250, 12], [120, 144], [10, 146], [250, 146]];
  var src = { x: 106, y: 34 }, W = 200, cur = null, cssW = 0, cssH = 0, k = 1, ox = 0, oy = 0, t0 = 0, vis = true, raf = null;
  function layout() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cssW = r.width; cssH = r.height; cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    k = Math.min(cssW / MW, cssH / MH); ox = (cssW - MW * k) / 2; oy = (cssH - MH * k) / 2;
  }
  var X = function (x) { return ox + x * k; }, Y = function (y) { return oy + y * k; };
  function dRect(b) { var dx = Math.max(b.x - src.x, 0, src.x - b.x - b.w), dy = Math.max(b.y - src.y, 0, src.y - b.y - b.h); return Math.sqrt(dx * dx + dy * dy); }
  function lvColor(p) { var c = null; for (var i = 0; i < LV.length; i++) if (p >= LV[i][0]) c = LV[i][1]; return c; }
  function draw(now) {
    var ph = reduce ? 0.999 : (Math.max(0, now - t0) / 2600) % 1;
    ctx.clearRect(0, 0, cssW, cssH); ctx.fillStyle = '#060C17'; ctx.fillRect(0, 0, cssW, cssH);
    ctx.strokeStyle = 'rgba(63,193,217,.10)'; ctx.lineWidth = 1; ctx.beginPath();
    for (var gx = 0; gx <= MW; gx += 10) { ctx.moveTo(X(gx), Y(0)); ctx.lineTo(X(gx), Y(MH)); }
    for (var gy = 0; gy <= MH; gy += 10) { ctx.moveTo(X(0), Y(gy)); ctx.lineTo(X(MW), Y(gy)); }
    ctx.stroke();
    // 超壓範圍（由外而內）
    var rs = LV.map(function (l) { return rFor(l[0], W); });
    for (var i = 0; i < LV.length; i++) {
      ctx.beginPath(); ctx.arc(X(src.x), Y(src.y), rs[i] * k, 0, 6.2832);
      ctx.fillStyle = LV[i][1]; ctx.globalAlpha = 0.07 + i * 0.025; ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = LV[i][1]; ctx.lineWidth = 1.2; ctx.setLineDash(i < 2 ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    // 傳遞中的波前
    var rf = ph * rs[0] * 1.05; ctx.beginPath(); ctx.arc(X(src.x), Y(src.y), rf * k, 0, 6.2832);
    ctx.strokeStyle = 'rgba(210,245,255,' + (0.85 * (1 - ph)) + ')'; ctx.lineWidth = 2.5; ctx.shadowColor = '#9FF4FF'; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
    // 建物
    ctx.font = '500 ' + Math.max(9, Math.min(12, k * 5)) + 'px "IBM Plex Mono",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    B.forEach(function (b) {
      var p = psAt(dRect(b), W), c = lvColor(p);
      ctx.beginPath();
      if (b.r) ctx.arc(X(b.x + b.w / 2), Y(b.y + b.h / 2), b.w / 2 * k, 0, 6.2832); else ctx.rect(X(b.x), Y(b.y), b.w * k, b.h * k);
      ctx.fillStyle = c || '#0D2233'; ctx.globalAlpha = c ? 0.32 : 0.9; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = c || '#3FC1D9'; ctx.lineWidth = 1.3; ctx.stroke();
      if (b.w * k > 34) { ctx.fillStyle = '#DCE9F5'; ctx.fillText(b.n, X(b.x + b.w / 2), Y(b.y + b.h / 2)); }
    });
    // 感測節點
    S.forEach(function (s, i) {
      var d = Math.hypot(s[0] - src.x, s[1] - src.y), alarm = psAt(d, W) >= 3.5, pu = ((now / 1400) + i * 0.17) % 1;
      ctx.fillStyle = alarm ? '#FFB36B' : '#9FF4FF'; ctx.beginPath(); ctx.arc(X(s[0]), Y(s[1]), 2.6, 0, 6.2832); ctx.fill();
      if (!reduce) { ctx.strokeStyle = ctx.fillStyle; ctx.globalAlpha = 0.6 * (1 - pu); ctx.beginPath(); ctx.arc(X(s[0]), Y(s[1]), 3 + pu * 9, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1; }
    });
    // 爆源
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#FFB36B'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(X(src.x), Y(src.y), 4, 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFB36B'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(src.x) - 10, Y(src.y)); ctx.lineTo(X(src.x) + 10, Y(src.y)); ctx.moveTo(X(src.x), Y(src.y) - 10); ctx.lineTo(X(src.x), Y(src.y) + 10); ctx.stroke();
    // 游標量測線
    if (cur) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(src.x), Y(src.y)); ctx.lineTo(X(cur.x), Y(cur.y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(cur.x), Y(cur.y), 3, 0, 6.2832); ctx.fill(); }
    // 比例尺
    ctx.strokeStyle = '#93A6BC'; ctx.beginPath(); ctx.moveTo(X(MW - 56), Y(MH - 5)); ctx.lineTo(X(MW - 6), Y(MH - 5)); ctx.stroke();
    ctx.fillStyle = '#93A6BC'; ctx.textAlign = 'right'; ctx.fillText('50 m', X(MW - 6), Y(MH - 5) - 9);
  }
  var $ = function (id) { return document.getElementById(id); };
  function read() {
    $('tw-wv').textContent = W; $('tw-ear').textContent = rFor(35, W).toFixed(0);
    if (cur) { var d = Math.hypot(cur.x - src.x, cur.y - src.y), p = psAt(d, W);
      $('tw-d').textContent = d.toFixed(0); $('tw-ps').textContent = p >= 100 ? Math.round(p) : p.toFixed(1); $('tw-db').textContent = Math.round(20 * Math.log10(p * 1000 / 2e-5)); }
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return { x: Math.min(MW, Math.max(0, (e.clientX - r.left - ox) / k)), y: Math.min(MH, Math.max(0, (e.clientY - r.top - oy) / k)) }; }
  cv.addEventListener('pointermove', function (e) { cur = pos(e); if (e.buttons) { src = pos(e); } read(); if (reduce) draw(0); });
  cv.addEventListener('pointerdown', function (e) { src = pos(e); cur = pos(e); t0 = performance.now(); read(); if (reduce) draw(0); });
  cv.addEventListener('pointerleave', function () { if (reduce) draw(0); });
  $('tw-w').addEventListener('input', function () { W = +this.value; t0 = performance.now(); read(); if (reduce) draw(0); });
  function loop(now) { raf = null; if (!vis) return; draw(now); raf = requestAnimationFrame(loop); }
  function run() { if (!raf && vis && !reduce) raf = requestAnimationFrame(loop); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; run(); }).observe(cv);
  window.addEventListener('resize', function () { layout(); if (reduce) draw(0); });
  layout(); cur = { x: 185, y: 58 }; read(); if (reduce) draw(0); else run();
})();
