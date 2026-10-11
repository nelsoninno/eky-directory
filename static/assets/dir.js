// EKY Directory: progressive enhancement only. Every page works without this file.
(function () {
  // ---- filters
  var form = document.querySelector(".filters");
  if (form) {
    var q = form.querySelector("[data-q]"), ty = form.querySelector("[data-type]"), dep = form.querySelector("[data-dep]");
    var rows = Array.prototype.slice.call(document.querySelectorAll("[data-filter-table] tbody tr"));
    var none = document.querySelector(".noresults");
    var norm = function (s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
    var run = function () {
      var qs = norm(q && q.value), t = ty ? ty.value : "", d = dep ? dep.value : "", shown = 0;
      rows.forEach(function (r) {
        var hay = norm(r.getAttribute("data-name") + " " + r.getAttribute("data-tags") + " " + r.getAttribute("data-type") + " " + r.textContent);
        var ok = (!qs || hay.indexOf(qs) > -1) && (!t || r.getAttribute("data-type") === t) && (!d || r.getAttribute("data-dep") === d);
        r.hidden = !ok; if (ok) shown++;
      });
      if (none) none.hidden = shown > 0;
    };
    [q, ty, dep].forEach(function (el) { if (el) el.addEventListener("input", run); });
  }
  // ---- maps (Leaflet + OpenStreetMap)
  var maps = document.querySelectorAll("[data-map]");
  if (!maps.length || typeof L === "undefined") return;
  maps.forEach(function (el) {
    var pts = [];
    try { pts = JSON.parse(el.querySelector("script").textContent); } catch (e) {}
    var c = el.getAttribute("data-center").split(",").map(Number);
    var m = L.map(el, { scrollWheelZoom: false }).setView(c, Number(el.getAttribute("data-zoom")) || 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(m);
    var icon = L.divIcon({ className: "", html: '<div style="width:18px;height:18px;border-radius:50%;background:#6200C9;border:3px solid #CEFF00;box-shadow:0 0 0 2px #0A0A0A"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    var b = [];
    pts.forEach(function (p) {
      var a = document.createElement("a"); a.href = p.u; a.textContent = p.n;
      var div = document.createElement("div"); div.appendChild(a);
      if (p.t) { var s = document.createElement("div"); s.textContent = p.t; div.appendChild(s); }
      L.marker([p.lat, p.lng], { icon: icon }).addTo(m).bindPopup(div);
      b.push([p.lat, p.lng]);
    });
    if (b.length > 1) m.fitBounds(b, { padding: [30, 30], maxZoom: 13 });
  });
})();
