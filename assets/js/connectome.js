/*
 * connectome.js — interactive C. elegans-inspired neural network for the hero.
 *
 * Vanilla JS, no dependencies. Requires a <canvas id="connectome"> that is
 * absolutely positioned to fill the hero (its parentElement is measured for
 * sizing). A dense field of neurons drifts slowly; neurons fire spontaneously
 * and send action-potential pulses along their nearest connections, which
 * probabilistically trigger downstream neurons (cascades). The cursor wires to
 * nearby neurons and occasionally sparks one. Resting network is ink-blue;
 * firing/active elements are terracotta/warm.
 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function boot(canvas) {
    var ctx = canvas.getContext('2d');
    var host = canvas.parentElement;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, nodes = [], pulses = [];
    var mouse = { x: -9999, y: -9999 };
    var D = 104, MR = 150; // connection radius, cursor-influence radius

    function seed() {
      nodes = []; pulses = [];
      var target = Math.max(80, Math.min(220, Math.round(W * H / 5200)));
      for (var i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.11, vy: (Math.random() - 0.5) * 0.11,
          act: 0, cd: 0
        });
      }
    }
    function resize() {
      var r = host.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
      if (reduce) drawStatic();
    }
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(host); }
    else { window.addEventListener('resize', resize); }
    resize();

    host.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    host.addEventListener('pointerleave', function () { mouse = { x: -9999, y: -9999 }; });

    function neighbors(i) {
      var a = nodes[i], out = [];
      for (var j = 0; j < nodes.length; j++) {
        if (j === i) continue;
        var dx = a.x - nodes[j].x, dy = a.y - nodes[j].y, d2 = dx * dx + dy * dy;
        if (d2 < D * D) out.push({ j: j, d2: d2 });
      }
      out.sort(function (p, q) { return p.d2 - q.d2; });
      return out.slice(0, 4).map(function (o) { return o.j; });
    }
    function fire(i) {
      var n = nodes[i];
      if (!n || n.cd > 0) return;
      n.act = 1; n.cd = 46;
      var nb = neighbors(i);
      for (var k = 0; k < nb.length; k++) {
        if (pulses.length < 200) pulses.push({ a: i, b: nb[k], t: 0, sp: 0.02 + Math.random() * 0.03 });
      }
    }

    // Static single-frame render for reduced-motion: resting network only.
    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < D) {
            var t = 1 - d / D;
            ctx.strokeStyle = 'rgba(74,108,164,' + (t * 0.12) + ')'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (var n = 0; n < nodes.length; n++) {
        ctx.fillStyle = 'rgba(74,108,164,0.42)';
        ctx.beginPath(); ctx.arc(nodes[n].x, nodes[n].y, 1.5, 0, 6.283); ctx.fill();
      }
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      var i, j, p, a, b, dx, dy, d, t;
      for (i = 0; i < nodes.length; i++) {
        p = nodes[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
        p.act *= 0.93; if (p.cd > 0) p.cd--;
      }
      if (nodes.length && Math.random() < 0.06) fire((Math.random() * nodes.length) | 0);

      // edges (brighter where signal is present)
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < D) {
            t = 1 - d / D;
            var e = Math.max(a.act, b.act);
            if (e > 0.1) { ctx.strokeStyle = 'rgba(196,116,78,' + (e * t * 0.55) + ')'; ctx.lineWidth = 1.1; }
            else { ctx.strokeStyle = 'rgba(74,108,164,' + (t * 0.12) + ')'; ctx.lineWidth = 1; }
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // travelling action potentials
      for (var k = pulses.length - 1; k >= 0; k--) {
        var pu = pulses[k]; a = nodes[pu.a]; b = nodes[pu.b];
        if (!a || !b) { pulses.splice(k, 1); continue; }
        pu.t += pu.sp;
        var x = a.x + (b.x - a.x) * pu.t, y = a.y + (b.y - a.y) * pu.t;
        var tb = Math.max(0, pu.t - 0.16);
        var trx = a.x + (b.x - a.x) * tb, trY = a.y + (b.y - a.y) * tb;
        ctx.strokeStyle = 'rgba(214,150,108,0.7)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(trx, trY); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = 'rgba(224,164,120,0.95)';
        ctx.beginPath(); ctx.arc(x, y, 2.3, 0, 6.283); ctx.fill();
        if (pu.t >= 1) {
          b.act = Math.min(1, b.act + 0.75);
          if (Math.random() < 0.5) fire(pu.b);
          pulses.splice(k, 1);
        }
      }
      // neurons with activation glow
      for (i = 0; i < nodes.length; i++) {
        p = nodes[i];
        if (p.act > 0.06) {
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7 + p.act * 15);
          g.addColorStop(0, 'rgba(212,140,96,' + (p.act * 0.5) + ')');
          g.addColorStop(1, 'rgba(212,140,96,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, 7 + p.act * 15, 0, 6.283); ctx.fill();
        }
        var ac = p.act;
        var cr = Math.round(74 + (204 - 74) * ac), cg = Math.round(108 + (128 - 108) * ac), cb = Math.round(164 + (84 - 164) * ac);
        ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.42 + ac * 0.5) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + ac * 3, 0, 6.283); ctx.fill();
      }
      // cursor wiring + sparking
      if (mouse.x > -9000) {
        var best = -1, bestD = MR * MR;
        for (i = 0; i < nodes.length; i++) {
          p = nodes[i]; dx = p.x - mouse.x; dy = p.y - mouse.y; var d2 = dx * dx + dy * dy;
          if (d2 < MR * MR) {
            t = 1 - Math.sqrt(d2) / MR;
            ctx.strokeStyle = 'rgba(196,116,78,' + (t * 0.4) + ')'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
            if (d2 < bestD) { bestD = d2; best = i; }
          }
        }
        if (best >= 0 && Math.random() < 0.12) fire(best);
      }
      requestAnimationFrame(tick);
    }

    if (reduce) drawStatic();
    else tick();
  }

  // ---- Scrollspy: active nav link + growing leading dash --------------------
  function spy() {
    var links = {};
    document.querySelectorAll('.navlink').forEach(function (l) {
      var t = l.getAttribute('data-target');
      if (t) links[t] = l;
    });
    var ids = ['about', 'research', 'publications', 'beyond', 'contact'];
    var secs = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!secs.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (e.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          var l = links['#' + e.target.id];
          if (l) l.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    secs.forEach(function (s) { io.observe(s); });
  }

  function init() {
    var canvas = document.getElementById('connectome');
    if (canvas) boot(canvas);
    spy();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
