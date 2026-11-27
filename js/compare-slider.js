(function () {
  var frame = document.querySelector(".compare-frame");
  var input = document.getElementById("compare-range");
  if (!frame || !input) return;

  function paint() {
    var value = Math.max(0, Math.min(100, Number(input.value) || 0));
    frame.style.setProperty("--pos", value + "%");
  }

  function setFromX(clientX) {
    var rect = frame.getBoundingClientRect();
    if (!rect.width) return;
    var pct = ((clientX - rect.left) / rect.width) * 100;
    input.value = String(Math.round(Math.max(0, Math.min(100, pct))));
    paint();
  }

  paint();
  input.addEventListener("input", paint);
  input.addEventListener("change", paint);

  var startX = 0;
  var startY = 0;
  var mode = "";

  frame.addEventListener("pointerdown", function (e) {
    if (e.target === input) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    mode = e.pointerType === "mouse" ? "drag" : "pending";
    if (mode === "drag") {
      frame.setPointerCapture(e.pointerId);
      setFromX(e.clientX);
    }
  });

  frame.addEventListener("pointermove", function (e) {
    if (mode === "" || mode === "scroll") return;
    if (mode === "pending") {
      var dx = Math.abs(e.clientX - startX);
      var dy = Math.abs(e.clientY - startY);
      if (dx < 8 && dy < 8) return;
      if (dx > dy) {
        mode = "drag";
        frame.setPointerCapture(e.pointerId);
      } else {
        mode = "scroll";
        return;
      }
    }
    setFromX(e.clientX);
  });

  frame.addEventListener("pointerup", function (e) {
    if (mode === "pending") setFromX(e.clientX);
    mode = "";
  });

  frame.addEventListener("pointercancel", function () {
    mode = "";
  });
})();
