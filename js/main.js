(function () {
  const startBtn = document.getElementById("start-btn");

  if (!startBtn) {
    return;
  }

  startBtn.addEventListener("click", function (event) {
    event.preventDefault();
  });
})();
