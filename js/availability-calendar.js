/* Month-view availability calendar for the Rent page.
   Reads data/busy-dates.json (date list only). No event details. */
(function () {
  "use strict";

  var DATA_URL = "data/busy-dates.json";
  var PHONE_TEL = "tel:+15105814034";
  var PHONE_LABEL = "(510) 581-4034";
  var HALL_TZ = "America/Los_Angeles";
  var MONTHS_AHEAD = 12;
  var MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  var WEEKDAYS = [
    { en: "Sun", pt: "Dom", label: "Sunday / Domingo" },
    { en: "Mon", pt: "Seg", label: "Monday / Segunda-feira" },
    { en: "Tue", pt: "Ter", label: "Tuesday / Terça-feira" },
    { en: "Wed", pt: "Qua", label: "Wednesday / Quarta-feira" },
    { en: "Thu", pt: "Qui", label: "Thursday / Quinta-feira" },
    { en: "Fri", pt: "Sex", label: "Friday / Sexta-feira" },
    { en: "Sat", pt: "Sáb", label: "Saturday / Sábado" }
  ];

  var root = document.getElementById("availability-calendar");
  if (!root) return;

  var busy = {};
  var today = todayInHall();
  var viewYear = today.y;
  var viewMonth = today.m; // 1-12
  var minYear = today.y;
  var minMonth = today.m;
  var maxYear;
  var maxMonth;
  var selected = null;

  function todayInHall() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: HALL_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (part) {
      if (part.type !== "literal") map[part.type] = part.value;
    });
    return { y: +map.year, m: +map.month, d: +map.day };
  }

  function iso(y, m, d) {
    return y + "-" + pad(m) + "-" + pad(d);
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function firstWeekday(y, m) {
    return new Date(y, m - 1, 1).getDay();
  }

  function addMonths(y, m, delta) {
    var total = y * 12 + (m - 1) + delta;
    return { y: Math.floor(total / 12), m: (total % 12) + 1 };
  }

  function cmpMonth(y1, m1, y2, m2) {
    return y1 * 12 + m1 - (y2 * 12 + m2);
  }

  function isToday(y, m, d) {
    return y === today.y && m === today.m && d === today.d;
  }

  function isPast(y, m, d) {
    if (y !== today.y) return y < today.y;
    if (m !== today.m) return m < today.m;
    return d < today.d;
  }

  function weekdayName(y, m, d) {
    return WEEKDAYS[new Date(y, m - 1, d).getDay()];
  }

  function longDate(y, m, d) {
    var wd = weekdayName(y, m, d);
    return wd.label.split(" / ")[0] + ", " + MONTHS_EN[m - 1] + " " + d + ", " + y +
      " / " + wd.label.split(" / ")[1] + ", " + d + " de " + MONTHS_PT[m - 1] + " de " + y;
  }

  function showError() {
    root.innerHTML =
      '<div class="avail-error" role="alert">' +
        "<p>Sorry, the calendar could not be loaded. Please call to check available dates.</p>" +
        '<p lang="pt">Não foi possível carregar o calendário. Por favor ligue para confirmar as datas disponíveis.</p>' +
        '<p><a class="btn btn-call" href="' + PHONE_TEL + '"><span aria-hidden="true">📞</span> Call ' + PHONE_LABEL + "</a></p>" +
      "</div>";
  }

  function render() {
    var atMin = cmpMonth(viewYear, viewMonth, minYear, minMonth) <= 0;
    var atMax = cmpMonth(viewYear, viewMonth, maxYear, maxMonth) >= 0;
    var monthLabelEn = MONTHS_EN[viewMonth - 1] + " " + viewYear;
    var monthLabelPt = MONTHS_PT[viewMonth - 1] + " " + viewYear;

    var html = "";
    html += '<div class="avail-nav">';
    html += '<button type="button" class="btn btn-secondary avail-prev"' + (atMin ? " disabled" : "") + ' aria-label="Previous month / Mês anterior">‹ <span>Prev</span></button>';
    html += '<div class="avail-month" aria-live="polite"><strong>' + monthLabelEn + '</strong><span lang="pt">' + monthLabelPt + "</span></div>";
    html += '<button type="button" class="btn btn-secondary avail-next"' + (atMax ? " disabled" : "") + ' aria-label="Next month / Próximo mês"><span>Next</span> ›</button>';
    html += "</div>";

    html += '<table class="avail-grid">';
    html += "<caption>" + monthLabelEn + " / " + monthLabelPt + "</caption>";
    html += "<thead><tr>";
    WEEKDAYS.forEach(function (day) {
      html += '<th scope="col"><abbr title="' + day.label + '"><span>' + day.en + '</span><span lang="pt">' + day.pt + "</span></abbr></th>";
    });
    html += "</tr></thead><tbody>";

    var leading = firstWeekday(viewYear, viewMonth);
    var totalDays = daysInMonth(viewYear, viewMonth);
    var cell = 0;
    var dayNum = 1;
    html += "<tr>";
    for (var i = 0; i < leading; i++) {
      html += '<td class="avail-empty"></td>';
      cell++;
    }
    while (dayNum <= totalDays) {
      if (cell > 0 && cell % 7 === 0) html += "</tr><tr>";
      var key = iso(viewYear, viewMonth, dayNum);
      var booked = !!busy[key];
      var past = isPast(viewYear, viewMonth, dayNum);
      var todayCell = isToday(viewYear, viewMonth, dayNum);
      var classes = ["avail-day"];
      var statusEn;
      var statusPt;
      if (past && !booked) {
        classes.push("is-past");
        statusEn = "Past";
        statusPt = "Já passou";
      } else if (booked) {
        classes.push("is-booked");
        if (past) classes.push("is-past");
        statusEn = "Booked";
        statusPt = "Reservado";
      } else {
        classes.push("is-open");
        statusEn = "Available";
        statusPt = "Disponível";
      }
      if (todayCell) classes.push("is-today");
      if (selected && selected === key) classes.push("is-selected");
      var aria = MONTHS_EN[viewMonth - 1] + " " + dayNum + ", " + viewYear + ", " + statusEn + " / " + statusPt;
      html += '<td class="' + classes.join(" ") + '">';
      html += '<button type="button" data-date="' + key + '" aria-label="' + aria + '" aria-pressed="' + (selected === key ? "true" : "false") + '">';
      html += '<span class="avail-num">' + dayNum + "</span>";
      if (booked) {
        html += '<span class="avail-mark" aria-hidden="true">X</span>';
      }
      html += "</button></td>";
      dayNum++;
      cell++;
    }
    while (cell % 7 !== 0) {
      html += '<td class="avail-empty"></td>';
      cell++;
    }
    html += "</tr></tbody></table>";

    html += '<ul class="avail-legend">';
    html += '<li><span class="avail-swatch is-booked" aria-hidden="true">X</span> Booked / <span lang="pt">Reservado</span></li>';
    html += '<li><span class="avail-swatch is-open" aria-hidden="true"></span> Available / <span lang="pt">Disponível</span></li>';
    html += "</ul>";
    html += '<div class="avail-detail" id="avail-detail" aria-live="polite"></div>';

    root.innerHTML = html;
    updateDetail();
  }

  function parseIso(key) {
    var parts = key.split("-");
    return { y: +parts[0], m: +parts[1], d: +parts[2] };
  }

  function updateDetail() {
    var box = root.querySelector("#avail-detail");
    if (!box) return;
    if (!selected) {
      box.innerHTML = '<p class="avail-detail-hint">Tap a date for details. <span lang="pt">Toque numa data para ver os detalhes.</span></p>';
      return;
    }
    var parts = parseIso(selected);
    var booked = !!busy[selected];
    var past = isPast(parts.y, parts.m, parts.d);
    var label = longDate(parts.y, parts.m, parts.d);
    var body;
    if (past && !booked) {
      body = "<p><strong>" + label + "</strong></p>" +
        "<p>This date has already passed. / <span lang=\"pt\">Esta data já passou.</span></p>";
    } else if (booked) {
      body = "<p><strong>" + label + "</strong></p>" +
        "<p class=\"avail-detail-booked\">Booked / <span lang=\"pt\">Reservado</span></p>";
    } else {
      body = "<p><strong>" + label + "</strong></p>" +
        "<p>This date looks available, but it still needs to be confirmed by phone.</p>" +
        '<p lang="pt">Esta data parece disponível, mas ainda precisa de ser confirmada por telefone.</p>' +
        '<p><a class="btn btn-call" href="' + PHONE_TEL + '"><span aria-hidden="true">📞</span> Call ' + PHONE_LABEL + "</a></p>";
    }
    box.innerHTML = body;
  }

  root.addEventListener("click", function (event) {
    var prev = event.target.closest(".avail-prev");
    var next = event.target.closest(".avail-next");
    var dayBtn = event.target.closest(".avail-day button");
    if (prev && !prev.disabled) {
      var back = addMonths(viewYear, viewMonth, -1);
      if (cmpMonth(back.y, back.m, minYear, minMonth) >= 0) {
        viewYear = back.y;
        viewMonth = back.m;
        selected = null;
        render();
      }
      return;
    }
    if (next && !next.disabled) {
      var fwd = addMonths(viewYear, viewMonth, 1);
      if (cmpMonth(fwd.y, fwd.m, maxYear, maxMonth) <= 0) {
        viewYear = fwd.y;
        viewMonth = fwd.m;
        selected = null;
        render();
      }
      return;
    }
    if (dayBtn) {
      selected = dayBtn.getAttribute("data-date");
      render();
    }
  });

  var max = addMonths(minYear, minMonth, MONTHS_AHEAD);
  maxYear = max.y;
  maxMonth = max.m;

  fetch(DATA_URL, { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("bad status");
      return response.json();
    })
    .then(function (data) {
      if (!data || !Array.isArray(data.busy)) throw new Error("bad data");
      data.busy.forEach(function (item) {
        if (typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item)) {
          busy[item] = true;
        }
      });
      render();
    })
    .catch(function () {
      showError();
    });
})();
