(function () {
  const startBtn = document.getElementById("start-btn");

  if (startBtn) {
    startBtn.addEventListener("click", function (event) {
      event.preventDefault();
    });
  }

  const field = {
    minX: 3,
    maxX: 86,
    minY: 54,
    maxY: 78
  };

  const starters = {
    cow: { x: 8, y: 72, speed: 4.2 },
    pig: { x: 28, y: 76, speed: 5.4 },
    sheep: { x: 46, y: 74, speed: 4.8 },
    chicken: { x: 62, y: 70, speed: 6.6 },
    duck: { x: 77, y: 58, speed: 5.8 },
    kitten: { x: 39, y: 66, speed: 7.4 }
  };

  const animals = Array.from(document.querySelectorAll(".animal")).map(function (el) {
    const kind = Object.keys(starters).find(function (name) {
      return el.classList.contains(name);
    });
    const conf = starters[kind] || { x: 20, y: 70, speed: 5 };
    const angle = Math.random() * Math.PI * 2;

    return {
      el: el,
      x: conf.x,
      y: conf.y,
      vx: Math.cos(angle) * conf.speed,
      vy: Math.sin(angle) * conf.speed,
      speed: conf.speed,
      nextTurn: 0.5 + Math.random() * 1.6,
      bobPhase: Math.random() * Math.PI * 2
    };
  });

  function pickVelocity(animal) {
    const angle = Math.random() * Math.PI * 2;
    animal.vx = Math.cos(angle) * animal.speed;
    animal.vy = Math.sin(angle) * animal.speed;
    animal.nextTurn = 0.7 + Math.random() * 2.2;
  }

  let last = performance.now();

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    animals.forEach(function (animal) {
      animal.nextTurn -= dt;
      if (animal.nextTurn <= 0) {
        pickVelocity(animal);
      }

      animal.x += animal.vx * dt;
      animal.y += animal.vy * dt;

      if (animal.x < field.minX) {
        animal.x = field.minX;
        animal.vx = Math.abs(animal.vx);
      } else if (animal.x > field.maxX) {
        animal.x = field.maxX;
        animal.vx = -Math.abs(animal.vx);
      }

      if (animal.y < field.minY) {
        animal.y = field.minY;
        animal.vy = Math.abs(animal.vy);
      } else if (animal.y > field.maxY) {
        animal.y = field.maxY;
        animal.vy = -Math.abs(animal.vy);
      }

      animal.bobPhase += dt * 11;
      const bob = Math.sin(animal.bobPhase) * 0.45;
      const facingLeft = animal.vx < 0;

      animal.el.classList.toggle("facing-left", facingLeft);
      animal.el.classList.add("walking");
      animal.el.style.left = animal.x + "%";
      animal.el.style.top = animal.y + "%";
      animal.el.style.right = "auto";
      animal.el.style.transform = "translateY(" + bob + "vmin) scaleX(" + (facingLeft ? -1 : 1) + ")";
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
