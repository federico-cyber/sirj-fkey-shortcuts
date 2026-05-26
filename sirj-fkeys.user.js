// ==UserScript==
// @name         SIRJ F-key shortcuts
// @namespace    arauto.local
// @version      1.4.0
// @description  Ripristina F1-F12 di SIRJ in Chrome
// @match        http://192.168.0.121:8180/*
// @updateURL    https://raw.githubusercontent.com/federico-cyber/sirj-fkey-shortcuts/main/sirj-fkeys.user.js
// @downloadURL  https://raw.githubusercontent.com/federico-cyber/sirj-fkey-shortcuts/main/sirj-fkeys.user.js
// @supportURL   https://github.com/federico-cyber/sirj-fkey-shortcuts/issues
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var TITLE_SEL = '[title]';
  var FRAMES_SEL = 'iframe, frame';
  var ZOOM_SEL =
    'input[type="image"][src*="Zoom_icon"]';

  var map = {
    'F1': 'Maschera precedente',
    'F2': 'Maschera successiva',
    'F3': 'Trova',
    'F4': 'Record successivo',
    'F5': 'Help',
    'F6': 'Record precedente',
    'F7': 'Aggiungi',
    'F9': 'Salva',
    'Shift+F3': 'Modalità ricerca',
    'Shift+F7': "Vai al'ultimo record",
    'Shift+F8': 'Elimina',
    'Shift+F9': 'Annulla zoom',
    'Shift+F10': 'Zoom',
    'Shift+F12': 'Stampa'
  };

  function matchTitle(el, base) {
    var t = el.getAttribute('title');
    if (!t) return false;
    if (t === base) return true;
    return t.indexOf(base + ' (') === 0;
  }

  function findEl(doc, base) {
    var list = doc.querySelectorAll(
      TITLE_SEL
    );
    for (var i = 0; i < list.length; i++) {
      if (matchTitle(list[i], base)) {
        return list[i];
      }
    }
    var fr = doc.querySelectorAll(
      FRAMES_SEL
    );
    for (var j = 0; j < fr.length; j++) {
      try {
        var d = fr[j].contentDocument;
        if (d) {
          var e = findEl(d, base);
          if (e) return e;
        }
      } catch (_) {}
    }
    return null;
  }

  function isDisabled(el) {
    if (el.disabled) return true;
    var a = el.getAttribute('aria-disabled');
    if (a === 'true') return true;
    return false;
  }

  // F2 contestuale: se il focus è su un input
  // dentro un DialogField (NXJ), F2 deve
  // cliccare l'icona pic2Zoom adiacente (apre
  // il dialog del cliente / lookup), invece di
  // "Maschera successiva". Replica il
  // comportamento IE-only di NXJ.
  function findZoomNearFocus() {
    var f = document.activeElement;
    if (!f) return null;
    if (f.tagName !== 'INPUT') return null;
    var p = f.parentElement;
    for (var i = 0; i < 6 && p; i++) {
      var z = p.querySelector(ZOOM_SEL);
      if (z && !isDisabled(z)) return z;
      p = p.parentElement;
    }
    return null;
  }

  function beep() {
    try {
      var AC = window.AudioContext
        || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.frequency.value = 550;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.08);
      setTimeout(function () {
        try { ctx.close(); } catch (_) {}
      }, 200);
    } catch (_) {}
  }

  function showToast(msg) {
    var t = document.getElementById(
      '__sirjFkToast'
    );
    if (!t) {
      t = document.createElement('div');
      t.id = '__sirjFkToast';
      t.style.cssText = [
        'position:fixed',
        'top:60px',
        'right:20px',
        'background:#fff3cd',
        'color:#856404',
        'border:1px solid #ffc107',
        'padding:8px 14px',
        'border-radius:6px',
        'z-index:2147483647',
        'font:13px sans-serif',
        'box-shadow:0 2px 8px rgba(0,0,0,.15)',
        'transition:opacity .3s',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t.__hideTimer);
    t.__hideTimer = setTimeout(function () {
      t.style.opacity = '0';
    }, 1500);
  }

  function feedbackDisabled(base) {
    beep();
    showToast(
      '⊘ ' + base + ' non disponibile qui'
    );
  }

  var installed = new WeakSet();

  function onKey(e) {
    if (!/^F\d+$/.test(e.key)) return;
    var combo = e.shiftKey
      ? 'Shift+' + e.key
      : e.key;

    // F2 contestuale: prima prova lookup
    if (combo === 'F2') {
      var zoom = findZoomNearFocus();
      if (zoom) {
        e.preventDefault();
        e.stopPropagation();
        zoom.click();
        return;
      }
    }

    var base = map[combo];
    if (!base) return;
    e.preventDefault();
    e.stopPropagation();
    var el = findEl(document, base);
    if (!el) return;
    if (isDisabled(el)) {
      feedbackDisabled(base);
      return;
    }
    el.click();
  }

  function install(doc) {
    if (installed.has(doc)) return;
    installed.add(doc);
    doc.addEventListener(
      'keydown', onKey, true
    );
    var fr = doc.querySelectorAll(
      FRAMES_SEL
    );
    for (var i = 0; i < fr.length; i++) {
      try {
        var d = fr[i].contentDocument;
        if (d) install(d);
      } catch (_) {}
    }
  }

  install(document);
  setInterval(function () {
    install(document);
  }, 2000);
})();
