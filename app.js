/* ============================================================
   KD·2016 — App-Logik (GitHub-Variante, ohne Firebase)
   Einträge kommen aus ./data.json im Repo. Neue Einträge
   werden lokal angezeigt und dem Orga-Team zur Aufnahme in
   data.json übergeben (Kopieren / E-Mail).
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Konfiguration ---------- */
  var EVENT_DATE = new Date("2026-09-12T18:00:00+02:00");
  var MAP_START = [30, 8];
  var NOMINATIM = "https://nominatim.openstreetmap.org";
  var ORGA_EMAIL = "orga@kd2016.example"; // <- an die echte Orga-Adresse anpassen

  /* Notfall-Startdaten, falls data.json nicht geladen werden kann
     (z. B. lokal per Doppelklick geöffnet). Auf GitHub Pages wird
     data.json normal geladen und diese Werte werden ersetzt. */
  var FALLBACK = {
    pins: [
      { name: "Lena", city: "Köln", lat: 50.9375, lng: 6.9603 },
      { name: "Jonas", city: "Berlin", lat: 52.5200, lng: 13.4050 },
      { name: "Mira", city: "Hamburg", lat: 53.5511, lng: 9.9937 }
    ],
    guestbook: [
      { name: "Lena", msg: "Wer hat noch den Schlüssel für die Siebdruck-Werkstatt?" }
    ],
    rsvp: [ { name: "Lena", guests: 1, diet: "veggie" } ]
  };

  var state = { pins: [], guestbook: [], rsvp: [] };
  var dataLoaded = false;

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3400);
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  /* ============================================================
     Daten laden (aus dem Repo)
     ============================================================ */
  function loadData() {
    return fetch("./data.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        state.pins = Array.isArray(d.pins) ? d.pins.slice() : [];
        state.guestbook = Array.isArray(d.guestbook) ? d.guestbook.slice() : [];
        state.rsvp = Array.isArray(d.rsvp) ? d.rsvp.slice() : [];
        dataLoaded = true;
      })
      .catch(function (e) {
        console.warn("data.json nicht ladbar, Notfalldaten aktiv.", e);
        state.pins = FALLBACK.pins.slice();
        state.guestbook = FALLBACK.guestbook.slice();
        state.rsvp = FALLBACK.rsvp.slice();
      })
      .then(function () { renderAll(); updateModeBadge(); });
  }

  function updateModeBadge() {
    var badge = document.getElementById("mode-badge");
    if (!badge) return;
    badge.hidden = false;
    if (dataLoaded) {
      badge.textContent =
        "Die Einträge kommen aus data.json in diesem GitHub-Projekt. Was du hier einträgst, siehst zunächst nur du — über „Kopieren“ oder E-Mail kommt es zur Orga und wird für alle sichtbar, sobald es in data.json steht.";
    } else {
      badge.textContent =
        "Lokale Vorschau: data.json konnte nicht geladen werden (bitte über einen Webserver bzw. GitHub Pages öffnen). Es werden Notfalldaten gezeigt.";
    }
  }

  /* ============================================================
     Countdown
     ============================================================ */
  var cd = {
    days: document.querySelector('[data-cd="days"]'),
    hours: document.querySelector('[data-cd="hours"]'),
    mins: document.querySelector('[data-cd="mins"]'),
    secs: document.querySelector('[data-cd="secs"]')
  };
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function tickCd() {
    var diff = EVENT_DATE - new Date();
    if (diff <= 0) { cd.days.textContent = "0"; cd.hours.textContent = "00"; cd.mins.textContent = "00"; cd.secs.textContent = "00"; return; }
    var s = Math.floor(diff / 1000);
    cd.days.textContent = Math.floor(s / 86400);
    cd.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    cd.mins.textContent = pad(Math.floor((s % 3600) / 60));
    cd.secs.textContent = pad(s % 60);
  }
  tickCd(); setInterval(tickCd, 1000);

  /* ============================================================
     Geo-Mathematik
     ============================================================ */
  var R = 6371;
  function toRad(d) { return d * Math.PI / 180; }
  function toDeg(r) { return r * 180 / Math.PI; }
  function centroid(pts) {
    if (!pts.length) return null;
    var x = 0, y = 0, z = 0;
    pts.forEach(function (p) {
      var la = toRad(p.lat), lo = toRad(p.lng);
      x += Math.cos(la) * Math.cos(lo); y += Math.cos(la) * Math.sin(lo); z += Math.sin(la);
    });
    var n = pts.length; x /= n; y /= n; z /= n;
    return { lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) };
  }
  function haversine(a, b) {
    var dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /* ============================================================
     Karte (Leaflet)
     ============================================================ */
  var map = null, pinLayer = null, centroidMarker = null, tempMarker = null;
  var pendingLatLng = null;
  var haveMap = typeof L !== "undefined";
  var myPins = {}; // in dieser Sitzung selbst gesetzte Pins (nach Index)

  if (haveMap) {
    try {
      map = L.map("map", { worldCopyJump: true, minZoom: 2, maxZoom: 12 }).setView(MAP_START, 2);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 19
      }).addTo(map);
      pinLayer = L.layerGroup().addTo(map);
      map.on("click", function (e) { onMapClick(e.latlng); });

      /* iOS/Safari: Leaflet misst den Container manchmal zu früh.
         Nach Layout, Fensterwechsel und Drehung neu vermessen. */
      function remeasure() { if (map) map.invalidateSize(false); }
      setTimeout(remeasure, 200);
      setTimeout(remeasure, 800);
      window.addEventListener("load", remeasure);
      window.addEventListener("resize", remeasure);
      window.addEventListener("orientationchange", function () { setTimeout(remeasure, 300); });
      if ("ResizeObserver" in window) {
        try { new ResizeObserver(remeasure).observe(document.getElementById("map")); } catch (e) {}
      }
      /* Erst vermessen, wenn die Kartensektion sichtbar wird */
      if ("IntersectionObserver" in window) {
        var mo = new IntersectionObserver(function (ents) {
          ents.forEach(function (en) { if (en.isIntersecting) { remeasure(); } });
        }, { threshold: 0.01 });
        mo.observe(document.getElementById("map"));
      }
    } catch (err) { haveMap = false; }
  }
  if (!haveMap) { var f = document.getElementById("map-fail"); if (f) f.hidden = false; }

  function pinIcon(mine) {
    return L.divIcon({ className: "", iconSize: [14, 14], iconAnchor: [7, 7],
      html: '<div class="pin-dot' + (mine ? " pin-mine" : "") + '"></div>' });
  }
  function centroidIcon() {
    return L.divIcon({ className: "", iconSize: [60, 60], iconAnchor: [30, 30],
      html: '<div class="centroid-mark"><span class="ring"></span><span class="ring2"></span><span class="cross-v"></span><span class="cross-h"></span></div>' });
  }

  /* ---------- Stats ---------- */
  var st = {
    count: document.querySelector('[data-stat="count"]'),
    place: document.querySelector('[data-stat="place"]'),
    coords: document.querySelector('[data-stat="coords"]'),
    spread: document.querySelector('[data-stat="spread"]'),
    far: document.querySelector('[data-stat="far"]')
  };
  var lastPlaceKey = "";

  function renderPins() {
    var pins = state.pins.filter(function (p) { return typeof p.lat === "number" && typeof p.lng === "number"; });
    updateStats(pins);
    if (!haveMap) return;
    pinLayer.clearLayers();
    pins.forEach(function (p, i) {
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(myPins[i]) }).addTo(pinLayer);
      m.bindTooltip((p.name ? p.name + " · " : "") + (p.city || ""), { direction: "top", offset: [0, -8] });
    });
    var c = centroid(pins);
    if (c) {
      if (centroidMarker) centroidMarker.setLatLng([c.lat, c.lng]);
      else {
        centroidMarker = L.marker([c.lat, c.lng], { icon: centroidIcon(), zIndexOffset: 1000 }).addTo(map);
        centroidMarker.bindTooltip("Gemeinsamer Mittelpunkt", { direction: "top", offset: [0, -20], className: "centroid-tip" });
      }
    }
  }

  function updateStats(pins) {
    st.count.textContent = pins.length;
    var c = centroid(pins);
    if (!c) { st.place.textContent = "—"; st.coords.textContent = "—"; st.spread.textContent = "—"; st.far.textContent = "—"; return; }
    st.coords.textContent =
      Math.abs(c.lat).toFixed(2) + "°" + (c.lat >= 0 ? "N" : "S") + " · " +
      Math.abs(c.lng).toFixed(2) + "°" + (c.lng >= 0 ? "E" : "W");
    var sum = 0, far = null, fd = -1;
    pins.forEach(function (p) { var d = haversine(c, p); sum += d; if (d > fd) { fd = d; far = p; } });
    st.spread.textContent = Math.round(sum / pins.length).toLocaleString("de-DE") + " km";
    st.far.textContent = far ? (far.city || "?") + " · " + Math.round(fd).toLocaleString("de-DE") + " km" : "—";
    var key = c.lat.toFixed(2) + "," + c.lng.toFixed(2);
    if (key !== lastPlaceKey) {
      lastPlaceKey = key;
      reverseGeocode(c.lat, c.lng)
        .then(function (name) { st.place.textContent = name || "unbenannte Gegend"; })
        .catch(function () { st.place.textContent = st.coords.textContent; });
    }
  }

  /* ============================================================
     Geocoding (Nominatim) — mit Fallbacks
     ============================================================ */
  function forwardGeocode(q) {
    return fetch(NOMINATIM + "/search?format=json&limit=1&q=" + encodeURIComponent(q), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (l) { return (l && l.length) ? { lat: parseFloat(l[0].lat), lng: parseFloat(l[0].lon), city: (l[0].display_name || q).split(",")[0] } : null; });
  }
  function reverseGeocode(lat, lng) {
    return fetch(NOMINATIM + "/reverse?format=json&zoom=10&lat=" + lat + "&lon=" + lng, { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.address) return null;
        var a = d.address, place = a.city || a.town || a.village || a.county || a.state || a.country;
        return place ? (a.country && a.country !== place ? place + ", " + a.country : place) : null;
      });
  }

  /* ============================================================
     Übergabe-Dialog (Handoff)
     ============================================================ */
  var modal = document.getElementById("handoff");
  var mTitle = document.getElementById("handoff-title");
  var mLead = document.getElementById("handoff-lead");
  var mSnippet = document.getElementById("handoff-snippet");
  var mCopy = document.getElementById("handoff-copy");
  var mMail = document.getElementById("handoff-mail");
  var mClose = document.getElementById("handoff-close");
  var lastFocus = null;

  var SECTION_LABEL = { pins: "pins", guestbook: "guestbook", rsvp: "rsvp" };

  function openHandoff(kind, entry) {
    var pretty = JSON.stringify(entry);
    mTitle.textContent = "Dein Eintrag ist gesetzt.";
    mLead.innerHTML = 'Damit ihn alle sehen: füge diese Zeile im Array <code>"' +
      SECTION_LABEL[kind] + '"</code> in <code>data.json</code> hinzu (Komma nicht vergessen) — oder schick sie der Orga.';
    mSnippet.textContent = pretty;

    mCopy.onclick = function () {
      copyText(pretty).then(function () { toast("In die Zwischenablage kopiert."); })
        .catch(function () { toast("Kopieren nicht möglich — bitte manuell markieren."); });
    };
    var subject = "KD·2016 – neuer Eintrag (" + SECTION_LABEL[kind] + ")";
    var body = "Bitte in data.json im Bereich \"" + SECTION_LABEL[kind] + "\" aufnehmen:\n\n" + pretty + "\n";
    mMail.href = "mailto:" + ORGA_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.classList.add("open");
    mClose.focus();
  }
  function closeHandoff() {
    modal.classList.remove("open");
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  mClose.addEventListener("click", closeHandoff);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeHandoff(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeHandoff(); });

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      try {
        var ta = document.createElement("textarea");
        ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta); res();
      } catch (e) { rej(e); }
    });
  }

  /* ============================================================
     Pin hinzufügen
     ============================================================ */
  var cityInput = document.getElementById("city-input");
  var nameInput = document.getElementById("name-input");
  var pinForm = document.getElementById("pin-form");
  var pinSubmit = document.getElementById("pin-submit");
  var pinHint = document.getElementById("pin-hint");

  function onMapClick(latlng) {
    pendingLatLng = latlng;
    if (tempMarker) tempMarker.setLatLng(latlng);
    else tempMarker = L.marker(latlng, { icon: pinIcon(true) }).addTo(map);
    pinSubmit.textContent = "Hier eintragen";
    pinHint.textContent = "Punkt gesetzt. Name eintragen (optional) und bestätigen.";
    reverseGeocode(latlng.lat, latlng.lng).then(function (n) { if (n && !cityInput.value) cityInput.value = n.split(",")[0]; }).catch(function () {});
  }
  function resetPending() {
    pendingLatLng = null;
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
    pinSubmit.textContent = "Auf der Karte eintragen";
    pinHint.textContent = "Tipp: Du kannst auch direkt in die Karte tippen.";
  }

  pinForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameInput.value.trim(), city = cityInput.value.trim();
    pinSubmit.disabled = true;

    function commit(pt) {
      var entry = { name: name || "", city: pt.city || city || "Pin", lat: round(pt.lat), lng: round(pt.lng) };
      var idx = state.pins.push(entry) - 1;
      myPins[idx] = true;
      renderPins();
      if (haveMap) map.flyTo([entry.lat, entry.lng], Math.max(map.getZoom(), 4), { duration: 1.0 });
      pinForm.reset(); resetPending(); pinSubmit.disabled = false;
      openHandoff("pins", entry);
    }
    if (pendingLatLng) { commit({ lat: pendingLatLng.lat, lng: pendingLatLng.lng, city: city }); return; }
    if (!city) { toast("Bitte eine Stadt eingeben oder in die Karte tippen."); pinSubmit.disabled = false; return; }
    forwardGeocode(city).then(function (pt) {
      if (pt) commit(pt);
      else { toast("Ort nicht gefunden. Tippe stattdessen direkt in die Karte."); pinSubmit.disabled = false; }
    }).catch(function () { toast("Suche offline nicht möglich. Tippe direkt in die Karte."); pinSubmit.disabled = false; });
  });
  function round(n) { return Math.round(n * 10000) / 10000; }

  /* ============================================================
     Gästebuch
     ============================================================ */
  var guestForm = document.getElementById("guest-form");
  var guestWall = document.getElementById("guest-wall");
  var guestName = document.getElementById("guest-name");
  var guestMsg = document.getElementById("guest-msg");

  function renderGuest() {
    var arr = state.guestbook.slice().reverse();
    guestWall.innerHTML = arr.map(function (g) {
      return '<li class="guest-card"><p class="guest-card__msg">' + esc(g.msg || "") +
        '</p><p class="guest-card__name">— ' + esc(g.name || "anonym") + '</p></li>';
    }).join("");
  }
  guestForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = guestName.value.trim(), m = guestMsg.value.trim();
    if (!n || !m) return;
    var entry = { name: n, msg: m };
    state.guestbook.push(entry); renderGuest();
    guestForm.reset();
    openHandoff("guestbook", entry);
  });

  /* ============================================================
     Zusagen (RSVP)
     ============================================================ */
  var rsvpForm = document.getElementById("rsvp-form");
  var rsvpName = document.getElementById("rsvp-name");
  var rsvpGuests = document.getElementById("rsvp-guests");
  var rsvpDiet = document.getElementById("rsvp-diet");
  var rsvpCount = document.getElementById("rsvp-count");
  var rsvpList = document.getElementById("rsvp-list");
  var rsvpHint = document.getElementById("rsvp-hint");

  function renderRsvp() {
    var heads = state.rsvp.reduce(function (a, r) { return a + 1 + (parseInt(r.guests, 10) || 0); }, 0);
    animateNumber(rsvpCount, heads);
    var veg = state.rsvp.filter(function (r) { return r.diet === "veggie" || r.diet === "vegan"; }).length;
    rsvpHint.textContent = state.rsvp.length + " Zusagen · " + veg + " vegetarisch/vegan";
    rsvpList.innerHTML = state.rsvp.slice(-24).map(function (r) {
      var ex = parseInt(r.guests, 10) || 0;
      return "<li>" + esc(r.name || "Gast") + (ex ? " +" + ex : "") + "</li>";
    }).join("");
  }
  rsvpForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = rsvpName.value.trim();
    if (!n) return;
    var entry = { name: n, guests: parseInt(rsvpGuests.value, 10) || 0, diet: rsvpDiet.value };
    state.rsvp.push(entry); renderRsvp();
    rsvpForm.reset();
    openHandoff("rsvp", entry);
  });
  function animateNumber(el, to) {
    var from = parseInt(el.textContent, 10) || 0;
    if (from === to) { el.textContent = to; return; }
    var start = performance.now(), dur = 600;
    (function step(now) {
      var t = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  /* ---------- Alles rendern ---------- */
  function renderAll() { renderPins(); renderGuest(); renderRsvp(); }

  /* ============================================================
     Scroll-Reveals
     ============================================================ */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    document.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Start ---------- */
  loadData();

})();
