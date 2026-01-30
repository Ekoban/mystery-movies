(function () {
  'use strict';

  // ===== Configuration =====

  var GATES = [
    {
      hash: 'x7k9m2',
      riddle: '\u201CGold is not enough in the house of oil.\u201D',
      answer: 'CHIHIRO',
      keyIndex: 2,
      keyLetter: 'I'
    },
    {
      hash: 'p3v8n1',
      riddle: '\u201CPerfection born from a chest inbetween stars.\u201D',
      answer: 'ALIEN',
      keyIndex: 1,
      keyLetter: 'L'
    },
    {
      hash: 'r2q5j8',
      riddle: '\u201CSirens scream somewhere; rust and guilt remain.\u201D',
      answer: 'SILENT HILL',
      keyIndex: 4,
      keyLetter: 'N'
    },
    {
      hash: 'm6w1t4',
      riddle: '\u201CBurned bridges, toxic fumes below ground, purple and blue.\u201D',
      answer: 'ARCANE',
      keyIndex: 0,
      keyLetter: 'A'
    },
    {
      hash: 'k8y3d9',
      riddle: '\u201CA number changes on a remote island; people who were never alive disappear.\u201D',
      answer: 'EXPEDITION 33',
      keyIndex: 6,
      keyLetter: 'T'
    },
    {
      hash: 'h4c7f2',
      riddle: '\u201CFive partake in a cold dish.\u201D',
      answer: 'KILL BILL',
      keyIndex: 3,
      keyLetter: 'L'
    },
    {
      hash: 'b9n5s6',
      riddle: '\u201CVirtual strings, sinking below water.\u201D',
      answer: 'GHOST IN THE SHELL',
      keyIndex: 6,
      keyLetter: 'N'
    }
  ];

  var GATE_ORDER = GATES.map(function (g) { return g.hash; });
  var ENTRY_ANSWER = 'DIANEPYBARA';
  var FINAL_ANSWER = 'TALLINN';

  // ===== Typewriter Click Sound (Web Audio API) =====

  var clickCtx = null;
  var clickBuffer = null;

  try {
    clickCtx = new (window.AudioContext || window.webkitAudioContext)();
    fetch('img/typewriterclick.wav')
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (buf) { return clickCtx.decodeAudioData(buf); })
      .then(function (decoded) { clickBuffer = decoded; });
  } catch (e) { /* Web Audio not supported */ }

  // Unlock AudioContext on first user gesture (required on mobile)
  function unlockAudio() {
    if (clickCtx && clickCtx.state === 'suspended') clickCtx.resume();
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  }
  document.addEventListener('touchstart', unlockAudio);
  document.addEventListener('click', unlockAudio);

  function playClick() {
    if (!clickCtx || !clickBuffer) return;
    var source = clickCtx.createBufferSource();
    source.buffer = clickBuffer;
    source.connect(clickCtx.destination);
    source.start(0);
  }

  // ===== State Management =====

  function getState() {
    try {
      var raw = localStorage.getItem('caseFile');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { entry: false, completed: [], letters: [], finalUnlocked: false, finished: false };
  }

  function saveState(state) {
    localStorage.setItem('caseFile', JSON.stringify(state));
  }

  // ===== Navigation & Access =====

  function detectPage() {
    var body = document.body;
    return {
      type: body.getAttribute('data-page'),
      gate: body.getAttribute('data-gate')
    };
  }

  function goToLastValid(state) {
    if (!state.entry) { location.href = 'index.html'; return; }
    if (state.finalUnlocked) { location.href = 'convergence.html'; return; }
    for (var i = 0; i < GATE_ORDER.length; i++) {
      if (state.completed.indexOf(GATE_ORDER[i]) === -1) {
        location.href = 'gate-' + GATE_ORDER[i] + '.html';
        return;
      }
    }
    location.href = 'convergence.html';
  }

  function checkAccess(page) {
    var state = getState();

    if (page.type === 'entry') return true;

    if (page.type === 'gate') {
      if (!state.entry) { location.href = 'index.html'; return false; }
      var idx = GATE_ORDER.indexOf(page.gate);
      if (idx < 0) { location.href = 'index.html'; return false; }
      for (var i = 0; i < idx; i++) {
        if (state.completed.indexOf(GATE_ORDER[i]) === -1) {
          goToLastValid(state);
          return false;
        }
      }
      return true;
    }

    if (page.type === 'convergence') {
      if (!state.finalUnlocked) { goToLastValid(state); return false; }
      return true;
    }

    if (page.type === 'destination') {
      if (!state.finished) { goToLastValid(state); return false; }
      return true;
    }

    return true;
  }

  function navigate(url, duration) {
    duration = duration || 500;
    var ov = document.querySelector('.fade-overlay');
    if (!ov) { location.href = url; return; }
    ov.style.transition = 'opacity ' + duration + 'ms';
    ov.classList.add('active');
    setTimeout(function () { location.href = url; }, duration);
  }

  // ===== Input System =====

  function createInputs(container, answer, options) {
    options = options || {};
    var words = answer.split(' ');
    var boxes = [];
    var gi = 0;

    words.forEach(function (word, wi) {
      var group = document.createElement('div');
      group.className = 'word-group';

      for (var ci = 0; ci < word.length; ci++) {
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.maxLength = 1;
        inp.className = 'char-input';
        inp.setAttribute('data-idx', gi);
        inp.autocomplete = 'off';
        inp.setAttribute('autocapitalize', 'off');
        inp.setAttribute('autocorrect', 'off');
        inp.spellcheck = false;
        if (options.keyIndex !== undefined && gi === options.keyIndex) {
          inp.setAttribute('data-key', 'true');
        }
        boxes.push(inp);
        group.appendChild(inp);
        gi++;
      }

      container.appendChild(group);

      if (wi < words.length - 1) {
        var spacer = document.createElement('div');
        spacer.className = 'word-spacer';
        container.appendChild(spacer);
      }
    });

    wireInputs(boxes, options);
    setTimeout(function () { if (boxes[0]) boxes[0].focus(); }, 500);
    return boxes;
  }

  function wireInputs(boxes, options) {
    boxes.forEach(function (box, i) {
      // Select all on focus so typing replaces existing character
      box.addEventListener('focus', function () { box.select(); });

      box.addEventListener('input', function () {
        var v = box.value.replace(/[^a-zA-Z0-9]/g, '');
        if (v.length > 1) v = v.charAt(v.length - 1);
        box.value = v.toUpperCase();
        if (v) playClick();

        if (v && i < boxes.length - 1) boxes[i + 1].focus();
        if (options.onInput) options.onInput(boxes);

        var allFilled = boxes.every(function (b) { return b.value.length > 0; });
        if (allFilled && options.onComplete) options.onComplete(boxes);
      });

      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace') {
          playClick();
          if (box.value === '' && i > 0) {
            boxes[i - 1].value = '';
            boxes[i - 1].focus();
          } else {
            box.value = '';
          }
          e.preventDefault();
          if (options.onInput) options.onInput(boxes);
        } else if (e.key === 'ArrowLeft' && i > 0) {
          boxes[i - 1].focus();
          e.preventDefault();
        } else if (e.key === 'ArrowRight' && i < boxes.length - 1) {
          boxes[i + 1].focus();
          e.preventDefault();
        }
      });

      box.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData)
          .getData('text')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase();
        for (var j = 0; j < text.length && i + j < boxes.length; j++) {
          boxes[i + j].value = text.charAt(j);
        }
        var next = Math.min(i + text.length, boxes.length - 1);
        boxes[next].focus();
        if (options.onInput) options.onInput(boxes);

        var allFilled = boxes.every(function (b) { return b.value.length > 0; });
        if (allFilled && options.onComplete) options.onComplete(boxes);
      });
    });
  }

  function getBoxValues(boxes) {
    return boxes.map(function (b) { return b.value; }).join('').toUpperCase();
  }

  // ===== Animations =====

  function shake(el) {
    el.classList.add('shake');
    var inputs = el.querySelectorAll('.char-input');
    for (var i = 0; i < inputs.length; i++) inputs[i].classList.add('error-flash');
    setTimeout(function () {
      el.classList.remove('shake');
      for (var i = 0; i < inputs.length; i++) inputs[i].classList.remove('error-flash');
    }, 300);
  }

  function flicker() {
    return new Promise(function (resolve) {
      document.body.classList.add('flicker');
      setTimeout(function () {
        document.body.classList.remove('flicker');
        resolve();
      }, 150);
    });
  }

  function typewrite(el, text, speed) {
    speed = speed || 50;
    return new Promise(function (resolve) {
      el.textContent = '';
      var i = 0;

      function tick() {
        if (i < text.length) {
          el.textContent += text.charAt(i);
          i++;
          setTimeout(tick, speed);
        } else {
          resolve();
        }
      }

      tick();
    });
  }

  // ===== Page Initializers =====

  function initEntry() {
    var riddle = document.querySelector('.riddle');
    var area = document.querySelector('.input-area');
    var eggDone = false;

    var seen = sessionStorage.getItem('tw_entry');
    if (!seen) {
      typewrite(riddle, 'What animal are you?').then(function () {
        sessionStorage.setItem('tw_entry', '1');
      });
    } else {
      riddle.textContent = 'What animal are you?';
    }

    createInputs(area, ENTRY_ANSWER, {
      onComplete: function (boxes) {
        var val = getBoxValues(boxes);
        if (val === ENTRY_ANSWER) {
          var s = getState();
          s.entry = true;
          saveState(s);
          flicker().then(function () {
            navigate('gate-' + GATE_ORDER[0] + '.html');
          });
        } else {
          shake(area);
        }
      },
      onInput: function (boxes) {
        if (eggDone) return;
        var val = getBoxValues(boxes);
        if (val === 'CAPYBARA') {
          eggDone = true;
          var egg = document.createElement('div');
          egg.className = 'easter-egg';
          egg.textContent = '\uD83E\uDE77';
          area.parentElement.appendChild(egg);
          setTimeout(function () {
            if (egg.parentNode) egg.parentNode.removeChild(egg);
            shake(area);
          }, 1000);
        }
      }
    });
  }

  function initGate(hash) {
    var gateIdx = GATE_ORDER.indexOf(hash);
    var gate = GATES[gateIdx];
    if (!gate) return;

    // Riddle
    var riddle = document.querySelector('.riddle');
    var twKey = 'tw_' + hash;
    var seen = sessionStorage.getItem(twKey);
    if (!seen) {
      typewrite(riddle, gate.riddle).then(function () {
        sessionStorage.setItem(twKey, '1');
      });
    } else {
      riddle.textContent = gate.riddle;
    }

    // Input area
    var area = document.querySelector('.input-area');
    var nextContainer = document.querySelector('.next-container');

    // Already completed — show filled answer
    var state = getState();
    if (state.completed.indexOf(hash) !== -1) {
      var boxes = createInputs(area, gate.answer, { keyIndex: gate.keyIndex });
      var chars = gate.answer.replace(/\s/g, '');
      boxes.forEach(function (b, i) {
        b.value = chars.charAt(i);
        b.disabled = true;
      });
      boxes[gate.keyIndex].classList.add('key-letter');
      showNextButton(nextContainer, gateIdx);
      return;
    }

    createInputs(area, gate.answer, {
      keyIndex: gate.keyIndex,
      onComplete: function (boxes) {
        var val = getBoxValues(boxes);
        var correct = gate.answer.replace(/\s/g, '').toUpperCase();
        if (val === correct) {
          boxes.forEach(function (b) { b.disabled = true; });
          flicker().then(function () {
            boxes[gate.keyIndex].classList.add('key-letter');

            var s = getState();
            if (s.completed.indexOf(hash) === -1) {
              s.completed.push(hash);
              s.letters.push(gate.keyLetter);
            }
            if (s.completed.length === GATES.length) s.finalUnlocked = true;
            saveState(s);

            setTimeout(function () {
              showNextButton(nextContainer, gateIdx);
            }, 2000);
          });
        } else {
          shake(area);
        }
      }
    });
  }

  function showNextButton(container, gateIdx) {
    var btn = document.createElement('button');
    btn.className = 'next-btn';
    btn.textContent = '\u2192';
    btn.addEventListener('click', function () {
      if (gateIdx < GATE_ORDER.length - 1) {
        navigate('gate-' + GATE_ORDER[gateIdx + 1] + '.html');
      } else {
        navigate('convergence.html');
      }
    });
    container.appendChild(btn);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { btn.classList.add('visible'); });
    });
  }

  function preloadRevealAssets() {
    var images = [
      'img/tallinnherooldtown.jpg',
      'img/rataskaevu_6.webp',
      'img/sigmundfreud.webp',
      'img/tallinn-susnet.jpg',
      'img/kumuartmuseum.jpg',
      'img/telliskivi.jpg',
      'img/kalma-saun-rasmus-jurkatam-2020.webp',
      'img/iglupark-tallinn-estonie-coucher-soleil.jpg',
      'img/lennusadam.jpg'
    ];
    images.forEach(function (src) {
      var img = new Image();
      img.src = src;
    });
    var audio = new Audio();
    audio.preload = 'auto';
    audio.src = 'img/gustave.mp3';
  }

  function initConvergence() {
    preloadRevealAssets();

    var state = getState();
    var riddle = document.querySelector('.riddle');
    var area = document.querySelector('.input-area');
    var nextContainer = document.querySelector('.next-container');

    // Typewriter for question
    var seen = sessionStorage.getItem('tw_convergence');
    if (!seen) {
      typewrite(riddle, 'Where are you going?').then(function () {
        sessionStorage.setItem('tw_convergence', '1');
      });
    } else {
      riddle.textContent = 'Where are you going?';
    }

    // Already finished — show filled answer
    if (state.finished) {
      var boxes = createInputs(area, FINAL_ANSWER, {});
      FINAL_ANSWER.split('').forEach(function (c, i) {
        boxes[i].value = c;
        boxes[i].disabled = true;
      });
      showDestButton(nextContainer);
      return;
    }

    createInputs(area, FINAL_ANSWER, {
      onComplete: function (boxes) {
        var val = getBoxValues(boxes);
        if (val === FINAL_ANSWER) {
          boxes.forEach(function (b) { b.disabled = true; });
          var s = getState();
          s.finished = true;
          saveState(s);
          navigate('reveal-w3x9q7f2.html', 2000);
        } else {
          shake(area);
        }
      }
    });
  }

  function showDestButton(container) {
    var btn = document.createElement('button');
    btn.className = 'next-btn';
    btn.textContent = '\u2192';
    btn.addEventListener('click', function () {
      navigate('reveal-w3x9q7f2.html', 2000);
    });
    container.appendChild(btn);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { btn.classList.add('visible'); });
    });
  }

  // ===== Bootstrap =====

  document.addEventListener('DOMContentLoaded', function () {
    var page = detectPage();
    if (!checkAccess(page)) return;

    // Fade from black
    var ov = document.querySelector('.fade-overlay');
    if (ov && ov.classList.contains('active')) {
      setTimeout(function () { ov.classList.remove('active'); }, 50);
    }

    switch (page.type) {
      case 'entry': initEntry(); break;
      case 'gate': initGate(page.gate); break;
      case 'convergence': initConvergence(); break;
    }
  });

})();
