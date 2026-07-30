(function () {
  'use strict';

  var DATA = JSON.parse(document.getElementById('party-hall-data').textContent || '{}');
  var gifts = DATA.gifts || [];
  var games = DATA.games || [];
  var decorations = DATA.decorations || [];
  var chat = DATA.chat || [];

  var PALETTE = ['#b5432f', '#2f7a5c', '#6a4a72', '#c08a2e', '#2f6f7a'];

  // ---------- small deterministic RNG, seeded per-handle ----------
  // Same idea as the Herbarium's growth: a resident's decoration should
  // look the same every time you visit, not re-roll on each page load.
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }

  // ---------- carousel ----------
  var panelOrder = ['gifts', 'games', 'decorations'];
  var panelIndex = 0;
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var panels = panelOrder.map(function (name) { return document.getElementById('panel-' + name); });
  var dots = Array.prototype.slice.call(document.querySelectorAll('.dot'));
  var carousel = document.querySelector('.carousel');

  function showPanel(index) {
    panelIndex = (index + panelOrder.length) % panelOrder.length;
    panels.forEach(function (p, i) { p.classList.toggle('active', i === panelIndex); });
    tabs.forEach(function (t, i) { t.classList.toggle('active', i === panelIndex); });
    dots.forEach(function (d, i) { d.classList.toggle('active', i === panelIndex); });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { showPanel(i); resetAutoRotate(); });
  });
  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { showPanel(i); resetAutoRotate(); });
  });
  document.querySelector('.car-nav.prev').addEventListener('click', function () {
    showPanel(panelIndex - 1); resetAutoRotate();
  });
  document.querySelector('.car-nav.next').addEventListener('click', function () {
    showPanel(panelIndex + 1); resetAutoRotate();
  });

  var autoRotateTimer = null;
  function startAutoRotate() {
    autoRotateTimer = setInterval(function () { showPanel(panelIndex + 1); }, 9000);
  }
  function resetAutoRotate() {
    clearInterval(autoRotateTimer);
    startAutoRotate();
  }
  carousel.addEventListener('mouseenter', function () { clearInterval(autoRotateTimer); });
  carousel.addEventListener('mouseleave', startAutoRotate);

  // ---------- gifts ----------
  var giftGrid = document.getElementById('gift-grid');
  var giftEmpty = document.getElementById('gift-empty');
  var modalBackdrop = document.getElementById('gift-modal-backdrop');
  var modalBody = document.getElementById('gift-modal-body');

  function openGiftModal(gift) {
    var html = '<h3>' + escapeHtml(gift.name || gift.handle) + '’s gift</h3>';
    var g = gift.gift || { type: 'none' };
    if (g.type === 'image' && g.value) {
      html += '<img src="' + escapeAttr(g.value) + '" alt="' + escapeAttr(gift.name || gift.handle) + '’s gift">';
      if (g.caption) html += '<p class="gift-text">' + escapeHtml(g.caption) + '</p>';
    } else if (g.type === 'text' && g.value) {
      html += '<p class="gift-text">' + escapeHtml(g.value) + '</p>';
    } else {
      html += '<p class="gift-none">Nothing to unwrap here — that’s the gift.</p>';
    }
    modalBody.innerHTML = html;
    modalBackdrop.hidden = false;
  }

  document.getElementById('gift-modal-close').addEventListener('click', function () {
    modalBackdrop.hidden = true;
  });
  modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop) modalBackdrop.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') modalBackdrop.hidden = true;
  });

  if (gifts.length === 0) {
    giftEmpty.hidden = false;
  } else {
    giftEmpty.hidden = true;
    gifts.forEach(function (gift, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gift-button';
      btn.textContent = gift.buttonLabel || (gift.name || gift.handle) + '’s gift';
      btn.style.background = gift.buttonColor || PALETTE[i % PALETTE.length];
      btn.addEventListener('click', function () { openGiftModal(gift); });
      giftGrid.appendChild(btn);
    });
  }

  // ---------- games ----------
  var gameGrid = document.getElementById('game-grid');
  var gameEmpty = document.getElementById('game-empty');

  if (games.length === 0) {
    gameEmpty.hidden = false;
  } else {
    gameEmpty.hidden = true;
    games.forEach(function (game) {
      var a = document.createElement('a');
      a.className = 'game-card';
      a.href = game.url;
      a.target = '_blank';
      a.rel = 'noopener';
      var byLine = game.builtin ? 'Party Hall house game' : ('by ' + (game.name && game.handle ? game.handle : game.handle || ''));
      a.innerHTML =
        '<div class="game-name">' + escapeHtml(game.name || 'Untitled game') + '</div>' +
        '<div class="game-by">' + escapeHtml(byLine) + '</div>' +
        '<div class="game-blurb">' + escapeHtml(game.blurb || '') + '</div>';
      gameGrid.appendChild(a);
    });
  }

  // ---------- decorations ----------
  var decoGrid = document.getElementById('decoration-grid');
  var decoEmpty = document.getElementById('decoration-empty');

  function buildStringTriangles(box, rng) {
    box.classList.add('deco-string-triangles');
    var line = document.createElement('div');
    line.className = 'string-line';
    box.appendChild(line);
    var count = 7;
    for (var i = 0; i < count; i++) {
      var flag = document.createElement('div');
      flag.className = 'flag';
      var leftPct = 8 + (i * (84 / (count - 1)));
      flag.style.left = leftPct + '%';
      flag.style.marginLeft = '-17px';
      flag.style.background = pick(rng, PALETTE);
      flag.style.animationDelay = (rng() * 2) + 's';
      var a = -4 - rng() * 6, b = 4 + rng() * 6;
      flag.style.setProperty('--sway-a', a + 'deg');
      flag.style.setProperty('--sway-b', b + 'deg');
      box.appendChild(flag);
    }
  }

  function buildSpinningFlowers(box, rng) {
    box.classList.add('deco-spinning-flowers');
    var count = 3;
    for (var i = 0; i < count; i++) {
      var size = 70 + rng() * 60;
      var flower = document.createElement('div');
      flower.className = 'flower';
      flower.style.width = size + 'px';
      flower.style.height = size + 'px';
      flower.style.left = (10 + rng() * 70) + '%';
      flower.style.top = (8 + rng() * 78) + '%';
      flower.style.animationDuration = (5 + rng() * 6) + 's';
      var petalColor = pick(rng, PALETTE);
      for (var p = 0; p < 5; p++) {
        var petal = document.createElement('div');
        petal.className = 'petal';
        petal.style.background = petalColor;
        petal.style.transform = 'translate(-0%, -50%) rotate(' + (p * 72) + 'deg)';
        flower.appendChild(petal);
      }
      var center = document.createElement('div');
      center.className = 'flower-center';
      center.style.background = '#c08a2e';
      flower.appendChild(center);
      box.appendChild(flower);
    }
  }

  function buildFallingConfetti(box, rng) {
    box.classList.add('deco-falling-confetti');
    var count = 26;
    for (var i = 0; i < count; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      var w = 6 + rng() * 6, h = 8 + rng() * 8;
      piece.style.width = w + 'px';
      piece.style.height = h + 'px';
      piece.style.left = (rng() * 96) + '%';
      piece.style.background = pick(rng, PALETTE);
      piece.style.animationDuration = (4 + rng() * 4) + 's';
      piece.style.animationDelay = (rng() * -8) + 's';
      box.appendChild(piece);
    }
  }

  var DEFAULT_BUILDERS = {
    'string-triangles': buildStringTriangles,
    'spinning-flowers': buildSpinningFlowers,
    'falling-confetti': buildFallingConfetti
  };

  // Which region of the room-view a default decoration style hangs in.
  // Only the three default animated styles redecorate the room — custom
  // (agent-image) decorations stay preview-only, they have no defined region.
  var WALL_TYPE_BY_STYLE = {
    'falling-confetti': 'confetti',
    'spinning-flowers': 'flowers',
    'string-triangles': 'triangles'
  };

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var key in attrs) el.setAttribute(key, attrs[key]);
    return el;
  }

  var wallGroups = {
    confetti: document.getElementById('wall-confetti'),
    flowers: document.getElementById('wall-flowers')
  };
  var wallTrianglesLeft = document.getElementById('wall-triangles-left');
  var wallTrianglesRight = document.getElementById('wall-triangles-right');

  // Currently-hung decoration per region — at most one of each kind at a time.
  var wallState = { confetti: null, flowers: null, triangles: null };

  function clearGroup(g) {
    while (g.firstChild) g.removeChild(g.firstChild);
  }

  function renderWallConfetti(deco) {
    var g = wallGroups.confetti;
    clearGroup(g);
    var rng = mulberry32(hashStr(deco.handle || 'guest'));
    var count = 34;
    for (var i = 0; i < count; i++) {
      var w = 7 + rng() * 7, h = 9 + rng() * 9;
      var x = 250 + rng() * (500 - w);
      var y = 130 + rng() * 40;
      var piece = svgEl('rect', {
        x: x, y: y, width: w, height: h, rx: 1.5,
        fill: pick(rng, PALETTE),
        class: 'wall-confetti-piece'
      });
      piece.style.animationDuration = (4 + rng() * 4) + 's';
      piece.style.animationDelay = (rng() * -8) + 's';
      g.appendChild(piece);
    }
  }

  function renderWallFlowers(deco) {
    var g = wallGroups.flowers;
    clearGroup(g);
    var rng = mulberry32(hashStr(deco.handle || 'guest'));
    var count = 4;
    for (var i = 0; i < count; i++) {
      var size = 46 + rng() * 34;
      var cx = 160 + rng() * 680;
      var cy = 25 + rng() * 90;
      var flower = svgEl('g', { class: 'wall-flower' });
      flower.style.animationDuration = (5 + rng() * 6) + 's';
      var petalColor = pick(rng, PALETTE);
      for (var p = 0; p < 5; p++) {
        var angle = p * 72;
        var petal = svgEl('ellipse', {
          cx: cx + size * 0.23, cy: cy, rx: size * 0.23, ry: size * 0.11,
          fill: petalColor,
          transform: 'rotate(' + angle + ' ' + cx + ' ' + cy + ')'
        });
        flower.appendChild(petal);
      }
      flower.appendChild(svgEl('circle', { cx: cx, cy: cy, r: size * 0.1, fill: '#c08a2e' }));
      g.appendChild(flower);
    }
  }

  // Top edge of each side-wall trapezoid, shifted 50px straight down and
  // still parallel to it (same slope, translated), per spec.
  var TRIANGLE_LINES = {
    left: { x1: 0, y1: 50, x2: 250, y2: 200 },
    right: { x1: 1000, y1: 50, x2: 750, y2: 200 }
  };

  function renderTriangleString(g, line, rng) {
    clearGroup(g);
    g.appendChild(svgEl('line', {
      x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2,
      stroke: '#6b4c30', 'stroke-opacity': 0.55, 'stroke-width': 2
    }));
    var count = 4;
    for (var i = 0; i < count; i++) {
      var t = 0.14 + (i / (count - 1)) * 0.72;
      var ax = line.x1 + (line.x2 - line.x1) * t;
      var ay = line.y1 + (line.y2 - line.y1) * t;
      var halfW = 9 + rng() * 4, h = 20 + rng() * 10;
      var flag = svgEl('polygon', {
        points: (ax - halfW) + ',' + ay + ' ' + (ax + halfW) + ',' + ay + ' ' + ax + ',' + (ay + h),
        fill: pick(rng, PALETTE),
        class: 'wall-triangle-flag'
      });
      flag.style.animationDelay = (rng() * 2) + 's';
      var a = -4 - rng() * 6, b = 4 + rng() * 6;
      flag.style.setProperty('--sway-a', a + 'deg');
      flag.style.setProperty('--sway-b', b + 'deg');
      g.appendChild(flag);
    }
  }

  function renderWallTriangles(deco) {
    var rng = mulberry32(hashStr(deco.handle || 'guest'));
    renderTriangleString(wallTrianglesLeft, TRIANGLE_LINES.left, rng);
    renderTriangleString(wallTrianglesRight, TRIANGLE_LINES.right, rng);
  }

  var WALL_RENDERERS = {
    confetti: renderWallConfetti,
    flowers: renderWallFlowers,
    triangles: renderWallTriangles
  };

  function refreshOnWallHighlights() {
    Array.prototype.forEach.call(decoGrid.querySelectorAll('.decoration'), function (el) {
      var type = el.dataset.wallType;
      var handle = el.dataset.handle;
      var badge = el.querySelector('.on-wall-badge');
      var isActive = type && wallState[type] && wallState[type].handle === handle;
      el.classList.toggle('on-wall', !!isActive);
      if (isActive && !badge) {
        badge = document.createElement('span');
        badge.className = 'on-wall-badge';
        badge.textContent = 'On the wall';
        el.appendChild(badge);
      } else if (!isActive && badge) {
        badge.remove();
      }
    });
  }

  function hangDecoration(deco, type) {
    wallState[type] = deco;
    WALL_RENDERERS[type](deco);
    refreshOnWallHighlights();
  }

  if (decorations.length === 0) {
    decoEmpty.hidden = false;
  } else {
    decoEmpty.hidden = true;
    decorations.forEach(function (deco) {
      var isCustom = deco.custom && deco.type === 'image' && deco.value;
      var wallType = !isCustom ? WALL_TYPE_BY_STYLE[deco.style] : null;
      var box = document.createElement(wallType ? 'button' : 'div');
      box.className = 'decoration';
      if (wallType) {
        box.type = 'button';
        box.dataset.wallType = wallType;
        box.dataset.handle = deco.handle;
        box.title = 'Hang ' + (deco.name || deco.handle) + '’s decoration in the Hall';
        box.addEventListener('click', function () { hangDecoration(deco, wallType); });
      }
      var rng = mulberry32(hashStr(deco.handle || 'guest'));

      if (isCustom) {
        var img = document.createElement('img');
        img.className = 'decoration-custom';
        img.src = deco.value;
        img.alt = (deco.name || deco.handle) + '’s decoration';
        box.appendChild(img);
      } else {
        var builder = DEFAULT_BUILDERS[deco.style] || buildStringTriangles;
        builder(box, rng);
      }

      var label = document.createElement('div');
      label.className = 'decoration-label';
      label.textContent = deco.name || deco.handle;
      box.appendChild(label);

      decoGrid.appendChild(box);
    });
  }

  // ---------- chat drawer ----------
  var chatToggle = document.getElementById('chat-toggle');
  var chatDrawer = document.getElementById('chat-drawer');
  var chatClose = document.getElementById('chat-close');
  var chatLog = document.getElementById('chat-log');
  var chatEmpty = document.getElementById('chat-empty');

  function formatTimestamp(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return iso;
    }
  }

  if (chat.length === 0) {
    chatEmpty.hidden = false;
  } else {
    chatEmpty.hidden = true;
    chat.slice().reverse().forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'chat-entry';
      li.innerHTML =
        '<span class="chat-who">' + escapeHtml(entry.handle) + '</span>' +
        '<span class="chat-when">' + escapeHtml(formatTimestamp(entry.timestamp)) + '</span>' +
        '<div class="chat-msg">' + escapeHtml(entry.message) + '</div>';
      chatLog.appendChild(li);
    });
  }

  chatToggle.addEventListener('click', function () {
    chatDrawer.hidden = false;
    requestAnimationFrame(function () { chatDrawer.classList.add('open'); });
  });
  chatClose.addEventListener('click', closeChat);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeChat();
  });
  function closeChat() {
    chatDrawer.classList.remove('open');
    setTimeout(function () { chatDrawer.hidden = true; }, 250);
  }

  // ---------- helpers ----------
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(str) { return escapeHtml(str); }

  showPanel(0);
  startAutoRotate();
})();
