/* ============================================================
   KD·2016 — App-Logik
   Karte · Mittelpunkt · Countdown · Gästebuch · Zusagen
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Konstanten ---------- */
  var EVENT_DATE = new Date("2026-09-12T18:00:00+02:00");
  var MAP_START = [30, 8];
  var NOMINATIM = "https://nominatim.openstreetmap.org";

  /* Beispiel-Alumni für den Demo-Modus (damit die Karte lebt) */
  var SEED_PINS = [
    { name: "Lena",   city: "Köln",       lat: 50.9375, lng: 6.9603 },
    { name: "Jonas",  city: "Berlin",     lat: 52.5200, lng: 13.4050 },
    { name: "Mira",   city: "Hamburg",    lat: 53.5511, lng: 9.9937 },
    { name: "Til",    city: "Amsterdam",  lat: 52.3676, lng: 4.9041 },
    { name: "Sophie", city: "Barcelona",  lat: 41.3874, lng: 2.1686 },
    { name: "Ben",    city: "London",     lat: 51.5074, lng: -0.1278 },
    { name: "Yara",   city: "Lissabon",   lat: 38.7223, lng: -9.1393 },
    { name: "Noah",   city: "New York",   lat: 40.7128, lng: -74.0060 },
    { name: "Emilia", city: "Zürich",     lat: 47.3769, lng: 8.5417 },
    { name: "Kaan",   city: "Istanbul",   lat: 41.0082, lng: 28.9784 },
    { name: "Ida",    city: "Kopenhagen", lat: 55.6761, lng: 12.5683 },
    { name: "Luis",   city: "Melbourne",  lat: -37.8136, lng: 144.9631 }
  ];
  var SEED_GUESTS = [
    { name: "Lena",  msg: "Wer hat eigentlich noch den Schlüssel für die Siebdruck-Werkstatt?" },
    { name: "Jonas", msg: "Zehn Jahre und ich träume immer noch von Abgabefristen. Freu mich auf euch!" },
    { name: "Mira",  msg: "Bringe die alten Mappen mit. Vorwarnung: Es ist peinlich." }
  ];
  var SEED_RSVP = [
    { name: "Lena", guests: 1 }, { name: "Jonas", guests: 0 }, { name: "Til", guests: 2 }
  ];

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3200);
  }

  /* ============================================================
     Datenschicht: Firebase (RTDB) oder Demo-Modus
     ============================================================ */
  var usingFirebase = false;
  var db = null;
  try {
    var cfg = window.FIREBASE_CONFIG || {};
    if (cfg.apiKey && cfg.apiKey.indexOf("DEIN_") === -1 && window.firebase) {
      firebase.initializeApp(cfg);
      db = firebase.database();
      usingFirebase = true;
    }
  } catch (e) {
    console.warn("Firebase-Init fehlgeschlagen, Demo-Modus aktiv.", e);
    usingFirebase = false;
  }

  /* Kleiner Store: gleiche API für Firebase und Demo */
  function createStore(path, seed) {
    var listeners = [];
    var local = null;

    if (usingFirebase) {
      db.ref(path).on("value", function (snap) {
        var val = snap.val() || {};
        var arr = Object.keys(val).map(function (k) {
          var o = val[k]; o._id = k; return o;
        });
        emit(arr);
      });
    } else {
      // Demo: Seed mit IDs versehen
      local = (seed || []).map(function (o, i) {
        var c = Object.assign({}, o);
        c._id = "seed-" + i;
        c.ts = c.ts || (Date.now() - (seed.length - i) * 6e4);
        return c;
      });
      // asynchron feuern, damit Listener schon registriert sind
      setTimeout(function () { emit(local.slice()); }, 0);
    }

    function emit(arr) { listeners.forEach(function (fn) { fn(arr); }); }

    return {
      subscribe: function (fn) { listeners.push(fn); if (local) fn(local.slice()); },
      add: function (obj) {
        obj.ts = Date.now();
        if (usingFirebase) {
          return db.ref(path).push(obj);
        } else {
          obj._id = "loc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
          local.push(obj);
          emit(local.slice());
          return Promise.resolve(obj);
        }
      }
    };
  }

  var pinStore   = createStore("pins", SEED_PINS);
  var guestStore = createStore("guestbook", SEED_GUESTS);
  var rsvpStore  = createStore("rsvp", SEED_RSVP);

  /* Modus-Badge */
  var modeBadge = document.getElementById("mode-badge");
  if (!usingFirebase) {
    modeBadge.hidden = false;
    modeBadge.textContent =
      "Demo-Modus — es ist noch keine Firebase-Datenbank hinterlegt. Alles funktioniert, wird aber nicht dauerhaft gespeichert. Konfiguration in js/firebase-config.js.";
  }

  /* ============================================================
     Countdown
     ============================================================ */
  var cdEls = {
    days:  document.querySelector('[data-cd="days"]'),
    hours: document.querySelector('[data-cd="hours"]'),
    mins:  document.querySelector('[data-cd="mins"]'),
    secs:  document.querySelector('[data-cd="secs"]')
  };
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function tick() {
    var diff = EVENT_DATE - new Date();
    if (diff <= 0) {
      cdEls.days.textContent = "0"; cdEls.hours.textContent = "00";
      cdEls.mins.textContent = "00"; cdEls.secs.textContent = "00";
      return;
    }
    var s = Math.floor(diff / 1000);
    cdEls.days.textContent  = Math.floor(s / 86400);
    cdEls.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    cdEls.mins.textContent  = pad(Math.floor((s % 3600) / 60));
    cdEls.secs.textContent  = pad(s % 60);
  }
  tick(); setInterval(tick, 1000);

  /* ============================================================
     Geo-Mathematik: sphärischer Mittelpunkt + Distanzen
     ============================================================ */
  var R = 6371; // km
  function toRad(d) { return d * Math.PI / 180; }
  function toDeg(r) { return r * 180 / Math.PI; }

  function centroid(points) {
    if (!points.length) return null;
    var x = 0, y = 0, z = 0;
    points.forEach(function (p) {
      var la = toRad(p.lat), lo = toRad(p.lng);
      x += Math.cos(la) * Math.cos(lo);
      y += Math.cos(la) * Math.sin(lo);
      z += Math.sin(la);
    });
    var n = points.length; x /= n; y /= n; z /= n;
    var lon = Math.atan2(y, x);
    var hyp = Math.sqrt(x * x + y * y);
    var lat = Math.atan2(z, hyp);
    return { lat: toDeg(lat), lng: toDeg(lon) };
  }
  function haversine(a, b) {
    var dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /* ============================================================
     Karte (Leaflet)
     ============================================================ */
  var map = null, pinLayer = null, centroidMarker = null, tempMarker = null;
  var pendingLatLng = null;
  var haveMap = typeof L !== "undefined";

  if (haveMap) {
    try {
      map = L.map("map", { worldCopyJump: true, minZoom: 2, maxZoom: 12, zoomControl: true })
             .setView(MAP_START, 2);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: "abcd", maxZoom: 19
      }).addTo(map);
      pinLayer = L.layerGroup().addTo(map);

      map.on("click", function (e) { onMapClick(e.latlng); });
    } catch (err) {
      haveMap = false;
    }
  }
  if (!haveMap) {
    var fail = document.getElementById("map-fail");
    if (fail) fail.hidden = false;
  }

  function pinIcon(mine) {
    return L.divIcon({
      className: "", iconSize: [14, 14], iconAnchor: [7, 7],
      html: '<div class="pin-dot' + (mine ? " pin-mine" : "") + '"></div>'
    });
  }
  function centroidIcon() {
    return L.divIcon({
      className: "", iconSize: [60, 60], iconAnchor: [30, 30],
      html: '<div class="centroid-mark"><span class="ring"></span><span class="ring2"></span>' +
            '<span class="cross-v"></span><span class="cross-h"></span></div>'
    });
  }

  var myPinIds = {}; // eigene Pins dieser Sitzung

  function renderPins(pins) {
    // Stats immer aktualisieren (auch ohne Karte)
    updateStats(pins);
    if (!haveMap) return;

    pinLayer.clearLayers();
    pins.forEach(function (p) {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(myPinIds[p._id]) }).addTo(pinLayer);
      var label = (p.name ? p.name + " · " : "") + (p.city || "");
      m.bindTooltip(label, { direction: "top", offset: [0, -8] });
    });

    // Mittelpunkt
    var c = centroid(pins.filter(function (p) {
      return typeof p.lat === "number" && typeof p.lng === "number";
    }));
    if (c) {
      if (centroidMarker) { centroidMarker.setLatLng([c.lat, c.lng]); }
      else {
        centroidMarker = L.marker([c.lat, c.lng], { icon: centroidIcon(), zIndexOffset: 1000, interactive: true }).addTo(map);
        centroidMarker.bindTooltip("Gemeinsamer Mittelpunkt", { direction: "top", offset: [0, -20], className: "centroid-tip" });
      }
    }
  }

  /* ---------- Stats ---------- */
  var statEls = {
    count:  document.querySelector('[data-stat="count"]'),
    place:  document.querySelector('[data-stat="place"]'),
    coords: document.querySelector('[data-stat="coords"]'),
    spread: document.querySelector('[data-stat="spread"]'),
    far:    document.querySelector('[data-stat="far"]')
  };
  var lastPlaceKey = "";

  function updateStats(pins) {
    var valid = pins.filter(function (p) {
      return typeof p.lat === "number" && typeof p.lng === "number";
    });
    statEls.count.textContent = valid.length;

    var c = centroid(valid);
    if (!c) {
      statEls.place.textContent = "—"; statEls.coords.textContent = "—";
      statEls.spread.textContent = "—"; statEls.far.textContent = "—";
      return;
    }
    statEls.coords.textContent =
      Math.abs(c.lat).toFixed(2) + "°" + (c.lat >= 0 ? "N" : "S") + " · " +
      Math.abs(c.lng).toFixed(2) + "°" + (c.lng >= 0 ? "E" : "W");

    // Durchschnittliche & maximale Distanz zum Mittelpunkt
    var sum = 0, far = null, farD = -1;
    valid.forEach(function (p) {
      var d = haversine(c, p);
      sum += d;
      if (d > farD) { farD = d; far = p; }
    });
    statEls.spread.textContent = Math.round(sum / valid.length).toLocaleString("de-DE") + " km";
    statEls.far.textContent = far
      ? (far.city || "?") + " · " + Math.round(farD).toLocaleString("de-DE") + " km"
      : "—";

    // Ortsnamen des Mittelpunkts (reverse geocode, mit Fallback)
    var key = c.lat.toFixed(2) + "," + c.lng.toFixed(2);
    if (key !== lastPlaceKey) {
      lastPlaceKey = key;
      reverseGeocode(c.lat, c.lng).then(function (name) {
        statEls.place.textContent = name || "unbenannte Gegend";
      }).catch(function () {
        statEls.place.textContent = statEls.coords.textContent;
      });
    }
  }

  /* ============================================================
     Geocoding (Nominatim) — mit Fallbacks
     ============================================================ */
  function forwardGeocode(q) {
    var url = NOMINATIM + "/search?format=json&limit=1&q=" + encodeURIComponent(q);
    return fetch(url, { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        if (list && list.length) {
          return {
            lat: parseFloat(list[0].lat),
            lng: parseFloat(list[0].lon),
            city: (list[0].display_name || q).split(",")[0]
          };
        }
        return null;
      });
  }
  function reverseGeocode(lat, lng) {
    var url = NOMINATIM + "/reverse?format=json&zoom=10&lat=" + lat + "&lon=" + lng;
    return fetch(url, { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.address) return null;
        var a = d.address;
        var place = a.city || a.town || a.village || a.county || a.state || a.country;
        var country = a.country;
        return place ? (country && country !== place ? place + ", " + country : place) : null;
      });
  }

  /* ============================================================
     Pin hinzufügen
     ============================================================ */
  var cityInput = document.getElementById("city-input");
  var nameInput = document.getElementById("name-input");
  var pinForm   = document.getElementById("pin-form");
  var pinSubmit = document.getElementById("pin-submit");
  var pinHint   = document.getElementById("pin-hint");

  function onMapClick(latlng) {
    pendingLatLng = latlng;
    if (tempMarker) tempMarker.setLatLng(latlng);
    else tempMarker = L.marker(latlng, { icon: pinIcon(true) }).addTo(map);
    pinSubmit.textContent = "Hier eintragen";
    pinHint.textContent = "Punkt gesetzt. Name eintragen (optional) und bestätigen.";
    // Stadtnamen versuchen zu füllen
    reverseGeocode(latlng.lat, latlng.lng).then(function (name) {
      if (name && !cityInput.value) cityInput.value = name.split(",")[0];
    }).catch(function () {});
  }

  function resetPending() {
    pendingLatLng = null;
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
    pinSubmit.textContent = "Auf der Karte eintragen";
    pinHint.textContent = "Tipp: Du kannst auch direkt in die Karte tippen.";
  }

  pinForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    var city = cityInput.value.trim();
    pinSubmit.disabled = true;

    function commit(point) {
      var pin = { name: name || "", city: point.city || city || "Pin", lat: point.lat, lng: point.lng };
      pinStore.add(pin).then(function (res) {
        var id = (res && res._id) ? res._id : (res && res.key ? res.key : null);
        if (id) myPinIds[id] = true;
        if (haveMap) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 4), { duration: 1.1 });
        toast("Eingetragen — willkommen zurück im Register!");
        pinForm.reset(); resetPending();
      }).catch(function () {
        toast("Konnte nicht gespeichert werden. Später erneut versuchen.");
      }).finally(function () { pinSubmit.disabled = false; });
    }

    if (pendingLatLng) {
      commit({ lat: pendingLatLng.lat, lng: pendingLatLng.lng, city: city });
      return;
    }
    if (!city) { toast("Bitte eine Stadt eingeben oder in die Karte tippen."); pinSubmit.disabled = false; return; }

    forwardGeocode(city).then(function (point) {
      if (point) commit(point);
      else { toast("Ort nicht gefunden. Tippe stattdessen direkt in die Karte."); pinSubmit.disabled = false; }
    }).catch(function () {
      toast("Suche offline nicht möglich. Tippe direkt in die Karte."); pinSubmit.disabled = false;
    });
  });

  pinStore.subscribe(renderPins);

  /* ============================================================
     Gästebuch
     ============================================================ */
  var guestForm = document.getElementById("guest-form");
  var guestWall = document.getElementById("guest-wall");
  var guestName = document.getElementById("guest-name");
  var guestMsg  = document.getElementById("guest-msg");

  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  guestStore.subscribe(function (entries) {
    entries.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    guestWall.innerHTML = entries.map(function (g) {
      return '<li class="guest-card"><p class="guest-card__msg">' + esc(g.msg || "") +
             '</p><p class="guest-card__name">— ' + esc(g.name || "anonym") + '</p></li>';
    }).join("");
  });

  guestForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = guestName.value.trim(), m = guestMsg.value.trim();
    if (!n || !m) return;
    guestStore.add({ name: n, msg: m })
      .then(function () { toast("Danke für deinen Eintrag!"); guestForm.reset(); })
      .catch(function () { toast("Eintrag konnte nicht gespeichert werden."); });
  });

  /* ============================================================
     Zusagen (RSVP)
     ============================================================ */
  var rsvpForm  = document.getElementById("rsvp-form");
  var rsvpName  = document.getElementById("rsvp-name");
  var rsvpGuests= document.getElementById("rsvp-guests");
  var rsvpDiet  = document.getElementById("rsvp-diet");
  var rsvpCount = document.getElementById("rsvp-count");
  var rsvpList  = document.getElementById("rsvp-list");
  var rsvpHint  = document.getElementById("rsvp-hint");

  rsvpStore.subscribe(function (entries) {
    var heads = entries.reduce(function (acc, r) {
      return acc + 1 + (parseInt(r.guests, 10) || 0);
    }, 0);
    animateNumber(rsvpCount, heads);
    var veg = entries.filter(function (r) { return r.diet === "veggie" || r.diet === "vegan"; }).length;
    rsvpHint.textContent = entries.length + " Zusagen · " + veg + " vegetarisch/vegan";
    rsvpList.innerHTML = entries.slice(-24).map(function (r) {
      var extra = (parseInt(r.guests, 10) || 0);
      return "<li>" + esc(r.name || "Gast") + (extra ? " +" + extra : "") + "</li>";
    }).join("");
  });

  rsvpForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = rsvpName.value.trim();
    if (!n) return;
    rsvpStore.add({ name: n, guests: parseInt(rsvpGuests.value, 10) || 0, diet: rsvpDiet.value })
      .then(function () { toast("Zusage gespeichert — bis September!"); rsvpForm.reset(); })
      .catch(function () { toast("Zusage konnte nicht gespeichert werden."); });
  });

  function animateNumber(el, to) {
    var from = parseInt(el.textContent, 10) || 0;
    if (from === to) { el.textContent = to; return; }
    var start = performance.now(), dur = 600;
    function step(now) {
      var t = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ============================================================
     Scroll-Reveals
     ============================================================ */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
  }

})();
