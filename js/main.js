(function () {
  const KINDS = ["cow", "pig", "sheep", "chicken", "duck", "kitten"];
  const FIELD = { minX: 2, maxX: 92, minY: 52, maxY: 80 };
  const TITLE_FIELD = { minX: 3, maxX: 86, minY: 54, maxY: 78 };
  const TITLE_START = {
    cow: { x: 8, y: 72, speed: 4.2 },
    pig: { x: 28, y: 76, speed: 5.4 },
    sheep: { x: 46, y: 74, speed: 4.8 },
    chicken: { x: 62, y: 70, speed: 6.6 },
    duck: { x: 77, y: 58, speed: 5.8 },
    kitten: { x: 39, y: 66, speed: 7.4 }
  };
  const NEIGHBOR_STEPS = [
    {
      text: "只剩一隻動物了！趕快去隔壁，偷偷拿走牠們的繩子。",
      btn: "去隔壁"
    },
    {
      text: "到了隔壁農場，趕快偷偷把動物的繩子拿走！",
      btn: "拿走繩子"
    },
    {
      text: "繩子拿到了！趕快把那些動物帶回來！",
      btn: "帶回來"
    },
    {
      text: "動物回來了！趕快把門給鎖住，別再讓牠們跑掉。",
      btn: "鎖門"
    }
  ];

  const stage = document.getElementById("stage");
  const startBtn = document.getElementById("start-btn");
  const hud = document.getElementById("hud");
  const herdEl = document.getElementById("herd");
  const foodsEl = document.getElementById("foods");
  const rainLayer = document.getElementById("rain-layer");
  const gameActions = document.getElementById("game-actions");
  const foodBtn = document.getElementById("food-btn");
  const umbrellaBtn = document.getElementById("umbrella-btn");
  const shopBtn = document.getElementById("shop-btn");
  const toastEl = document.getElementById("toast");
  const neighborOverlay = document.getElementById("neighbor-overlay");
  const neighborText = document.getElementById("neighbor-text");
  const neighborBtn = document.getElementById("neighbor-btn");
  const shopOverlay = document.getElementById("shop-overlay");
  const shopCloseBtn = document.getElementById("shop-close-btn");
  const workBtn = document.getElementById("work-btn");
  const upgradeFarmBtn = document.getElementById("upgrade-farm-btn");
  const upgradeAnimalBtn = document.getElementById("upgrade-animal-btn");
  const upgradeFoodBtn = document.getElementById("upgrade-food-btn");
  const doorLock = document.getElementById("door-lock");
  const moneyValue = document.getElementById("money-value");
  const animalCountEl = document.getElementById("animal-count");
  const hungryCountEl = document.getElementById("hungry-count");
  const weatherLabel = document.getElementById("weather-label");
  const weatherValue = document.getElementById("weather-value");

  const titleAnimals = Array.from(document.querySelectorAll(".scene > .animal")).map(function (el) {
    const kind = Object.keys(TITLE_START).find(function (name) {
      return el.classList.contains(name);
    });
    const conf = TITLE_START[kind] || { x: 20, y: 70, speed: 5 };
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

  const game = {
    playing: false,
    paused: false,
    money: 10,
    animals: [],
    foods: [],
    raining: false,
    rainIn: 60,
    doorLocked: false,
    neighborStep: -1,
    shopUnlocked: false,
    working: false,
    farmLevel: 0,
    animalLevel: 0,
    extraFood: 0,
    incomeAcc: 0,
    toastTimer: 0
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickVelocity(mover, speed) {
    const angle = Math.random() * Math.PI * 2;
    mover.vx = Math.cos(angle) * speed;
    mover.vy = Math.sin(angle) * speed;
    mover.nextTurn = 0.7 + Math.random() * 2.2;
  }

  function moveMover(mover, field, dt, bobScale) {
    mover.nextTurn -= dt;
    if (mover.nextTurn <= 0) {
      pickVelocity(mover, mover.speed);
    }

    mover.x += mover.vx * dt;
    mover.y += mover.vy * dt;

    if (mover.x < field.minX) {
      mover.x = field.minX;
      mover.vx = Math.abs(mover.vx);
    } else if (mover.x > field.maxX) {
      mover.x = field.maxX;
      mover.vx = -Math.abs(mover.vx);
    }

    if (mover.y < field.minY) {
      mover.y = field.minY;
      mover.vy = Math.abs(mover.vy);
    } else if (mover.y > field.maxY) {
      mover.y = field.maxY;
      mover.vy = -Math.abs(mover.vy);
    }

    mover.bobPhase += dt * 11;
    const bob = Math.sin(mover.bobPhase) * bobScale;
    const facingLeft = mover.vx < 0;
    mover.el.classList.toggle("facing-left", facingLeft);
    mover.el.classList.add("walking");
    mover.el.style.left = mover.x + "%";
    mover.el.style.top = mover.y + "%";
    mover.el.style.transform = "translateY(" + bob + "vmin)";
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    game.toastTimer = 3.2;
  }

  function updateHud() {
    const hungry = game.animals.filter(function (animal) {
      return animal.hunger < 40;
    }).length;

    moneyValue.textContent = String(Math.floor(game.money));
    animalCountEl.textContent = String(game.animals.length);
    hungryCountEl.textContent = String(hungry);

    if (game.raining) {
      weatherLabel.textContent = "天氣";
      weatherValue.textContent = "下雨中";
    } else {
      weatherLabel.textContent = "下雨倒數";
      weatherValue.textContent = Math.max(0, Math.ceil(game.rainIn)) + "秒";
    }

    shopBtn.hidden = !game.shopUnlocked;
  }

  function createHerdAnimal(kind, extras) {
    const el = document.createElement("div");
    el.className = "herd-animal " + kind;
    el.innerHTML =
      '<div class="umbrella" aria-hidden="true">' +
        '<div class="umbrella-canopy"></div>' +
        '<div class="umbrella-pole"></div>' +
      "</div>" +
      '<div class="herd-sprite">' +
        '<div class="herd-ear left"></div>' +
        '<div class="herd-ear right"></div>' +
        '<div class="herd-head"></div>' +
        '<div class="herd-eye left"></div>' +
        '<div class="herd-eye right"></div>' +
        '<div class="herd-mouth"></div>' +
        '<div class="herd-body"></div>' +
      "</div>";

    herdEl.appendChild(el);

    const speed = 5.2 + Math.random() * 3.4 + game.animalLevel * 0.4;
    const angle = Math.random() * Math.PI * 2;
    const animal = {
      el: el,
      kind: kind,
      x: rand(FIELD.minX, FIELD.maxX),
      y: rand(FIELD.minY, FIELD.maxY),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed: speed,
      hunger: 48 + Math.random() * 52,
      umbrella: false,
      wet: false,
      rope: !!(extras && extras.rope),
      nextTurn: Math.random() * 1.4,
      bobPhase: Math.random() * Math.PI * 2
    };

    if (animal.rope) {
      el.classList.add("has-rope");
    }

    return animal;
  }

  function spawnHerd(count, extras) {
    for (let i = 0; i < count; i += 1) {
      const kind = KINDS[i % KINDS.length];
      game.animals.push(createHerdAnimal(kind, extras));
    }
  }

  function startRain() {
    game.raining = true;
    stage.classList.add("raining");
    rainLayer.innerHTML = "";
    for (let i = 0; i < 48; i += 1) {
      const drop = document.createElement("div");
      drop.className = "raindrop";
      drop.style.left = Math.random() * 100 + "%";
      drop.style.animationDelay = Math.random() * 0.9 + "s";
      drop.style.animationDuration = 0.7 + Math.random() * 0.5 + "s";
      rainLayer.appendChild(drop);
    }
    rainLayer.hidden = false;
    umbrellaBtn.hidden = false;
    showToast("下雨了！快給動物雨傘，傘要撐在頭上，不可以戳到眼睛。");
  }

  function dropFood() {
    const count = 1 + game.extraFood;
    for (let i = 0; i < count; i += 1) {
      const el = document.createElement("div");
      el.className = "food-drop";
      const x = rand(8, 90);
      el.style.left = x + "%";
      el.style.top = "6%";
      foodsEl.appendChild(el);
      game.foods.push({
        el: el,
        x: x,
        y: 6,
        eaten: false
      });
    }
  }

  function removeAnimal(animal) {
    if (animal.el.parentNode) {
      animal.el.parentNode.removeChild(animal.el);
    }
    game.animals = game.animals.filter(function (item) {
      return item !== animal;
    });
  }

  function beginNeighborRescue() {
    game.paused = true;
    game.neighborStep = 0;
    neighborText.textContent = NEIGHBOR_STEPS[0].text;
    neighborBtn.textContent = NEIGHBOR_STEPS[0].btn;
    neighborOverlay.hidden = false;
    showToast("只剩一隻了！趕快去隔壁把動物帶回來。");
  }

  function finishNeighborRescue() {
    spawnHerd(36, { rope: true });
    game.doorLocked = true;
    doorLock.hidden = false;
    game.paused = false;
    game.neighborStep = 4;
    neighborOverlay.hidden = true;
    showToast("動物帶回來了，門也鎖住了！");
    updateHud();
  }

  function unlockShop() {
    if (game.shopUnlocked) {
      return;
    }
    game.shopUnlocked = true;
    shopBtn.hidden = false;
    shopOverlay.hidden = false;
    showToast("存到 100 元了！可以去別的牧場工作，也可以升級。");
  }

  function tryUpgrade(flagName, cost, button, doneText, onDone) {
    if (game[flagName]) {
      return;
    }
    if (game.money < cost) {
      showToast("還不夠錢，這項要 " + cost + " 元。");
      return;
    }
    game.money -= cost;
    game[flagName] = true;
    button.disabled = true;
    button.textContent = doneText;
    onDone();
    updateHud();
  }

  function startGame() {
    if (game.playing) {
      return;
    }

    game.playing = true;
    stage.classList.add("playing");
    hud.hidden = false;
    gameActions.hidden = false;
    spawnHerd(100);
    updateHud();
    showToast("100 隻動物來了！牠們餓了要按「食物」，食物會從天上掉下來。");
  }

  startBtn.addEventListener("click", function () {
    startGame();
  });

  foodBtn.addEventListener("click", function () {
    if (!game.playing || game.paused) {
      return;
    }
    dropFood();
  });

  umbrellaBtn.addEventListener("click", function () {
    if (!game.playing || game.paused || !game.raining) {
      return;
    }

    const need = game.animals.filter(function (animal) {
      return !animal.umbrella;
    });

    if (!need.length) {
      showToast("大家都有傘了，而且傘都撐在頭上方，沒有戳到眼睛。");
      return;
    }

    if (game.money < 1) {
      showToast("雨傘要 1 元，錢不夠了。");
      return;
    }

    game.money -= 1;
    need.slice(0, 12).forEach(function (animal) {
      animal.umbrella = true;
      animal.wet = false;
      animal.el.classList.add("has-umbrella");
      animal.el.classList.remove("wet");
    });
    updateHud();
  });

  shopBtn.addEventListener("click", function () {
    shopOverlay.hidden = false;
  });

  shopCloseBtn.addEventListener("click", function () {
    shopOverlay.hidden = true;
  });

  workBtn.addEventListener("click", function () {
    tryUpgrade("working", 0, workBtn, "已經在別的牧場工作", function () {
      showToast("你去隔壁牧場工作了，之後會多賺一點錢。");
    });
  });

  upgradeFarmBtn.addEventListener("click", function () {
    tryUpgrade("farmLevel", 20, upgradeFarmBtn, "農夫的地方已升級", function () {
      stage.classList.add("farm-upgraded");
      showToast("農夫的房子升級了！");
    });
  });

  upgradeAnimalBtn.addEventListener("click", function () {
    tryUpgrade("animalLevel", 20, upgradeAnimalBtn, "動物已升級", function () {
      stage.classList.add("animals-upgraded");
      game.animals.forEach(function (animal) {
        animal.speed += 0.8;
        animal.hunger = Math.min(100, animal.hunger + 20);
      });
      showToast("動物升級了，比較不容易餓。");
    });
  });

  upgradeFoodBtn.addEventListener("click", function () {
    if (game.extraFood >= 3) {
      upgradeFoodBtn.disabled = true;
      upgradeFoodBtn.textContent = "食物已經很多";
      return;
    }
    if (game.money < 20) {
      showToast("還不夠錢，更多食物要 20 元。");
      return;
    }
    game.money -= 20;
    game.extraFood += 1;
    if (game.extraFood >= 3) {
      upgradeFoodBtn.disabled = true;
      upgradeFoodBtn.textContent = "食物已經很多";
    }
    showToast("現在按一次食物會掉下更多！");
    updateHud();
  });

  neighborBtn.addEventListener("click", function () {
    if (game.neighborStep < 0 || game.neighborStep >= 3) {
      if (game.neighborStep === 3) {
        finishNeighborRescue();
      }
      return;
    }

    game.neighborStep += 1;
    const step = NEIGHBOR_STEPS[game.neighborStep];
    neighborText.textContent = step.text;
    neighborBtn.textContent = step.btn;
  });

  let last = performance.now();

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (game.toastTimer > 0) {
      game.toastTimer -= dt;
      if (game.toastTimer <= 0) {
        toastEl.hidden = true;
      }
    }

    if (!game.playing) {
      titleAnimals.forEach(function (animal) {
        moveMover(animal, TITLE_FIELD, dt, 0.45);
      });
      requestAnimationFrame(tick);
      return;
    }

    if (game.paused) {
      requestAnimationFrame(tick);
      return;
    }

    if (!game.raining) {
      game.rainIn -= dt;
      if (game.rainIn <= 0) {
        startRain();
      }
    }

    game.foods.forEach(function (food) {
      if (food.eaten) {
        return;
      }
      food.y += 28 * dt;
      food.el.style.top = food.y + "%";
      if (food.y > 86) {
        food.eaten = true;
        if (food.el.parentNode) {
          food.el.parentNode.removeChild(food.el);
        }
      }
    });

    game.animals.forEach(function (animal) {
      let drain = 1.15 + (game.raining && !animal.umbrella ? 2.4 : 0);
      drain -= game.animalLevel * 0.25;
      animal.hunger -= Math.max(0.35, drain) * dt;

      if (game.raining && !animal.umbrella) {
        animal.wet = true;
        animal.el.classList.add("wet");
      }

      const hungry = animal.hunger < 40;
      animal.el.classList.toggle("hungry", hungry);

      const nearbyFood = game.foods.find(function (food) {
        return !food.eaten && Math.abs(food.x - (animal.x + 2)) < 5 && food.y >= animal.y - 2 && food.y <= animal.y + 8;
      });

      if (nearbyFood) {
        nearbyFood.eaten = true;
        if (nearbyFood.el.parentNode) {
          nearbyFood.el.parentNode.removeChild(nearbyFood.el);
        }
        animal.hunger = Math.min(100, animal.hunger + 58 + game.animalLevel * 8);
        animal.el.classList.remove("hungry");
        game.money += 1;
      } else if (hungry) {
        const falling = game.foods.find(function (food) {
          return !food.eaten && Math.abs(food.x - animal.x) < 18;
        });
        if (falling) {
          animal.vx = falling.x < animal.x ? -Math.abs(animal.speed) : Math.abs(animal.speed);
        }
      }

      moveMover(animal, FIELD, dt, 0.28);
    });

    game.foods = game.foods.filter(function (food) {
      return !food.eaten;
    });

    if (!game.doorLocked && game.neighborStep < 0) {
      game.animals.filter(function (animal) {
        return animal.hunger <= 0;
      }).forEach(function (animal) {
        if (game.animals.length > 1) {
          removeAnimal(animal);
        }
      });

      if (game.animals.length === 1 && game.animals[0].hunger <= 0) {
        game.animals[0].hunger = 8;
        beginNeighborRescue();
      }
    } else {
      game.animals.forEach(function (animal) {
        if (animal.hunger < 8) {
          animal.hunger = 8;
        }
      });
    }

    game.incomeAcc += dt;
    if (game.incomeAcc >= 5) {
      game.incomeAcc = 0;
      const fed = game.animals.filter(function (animal) {
        return animal.hunger >= 50;
      }).length;
      game.money += Math.floor(fed / 20);
      if (game.working) {
        game.money += 2;
      }
    }

    if (game.money >= 100) {
      unlockShop();
    }

    updateHud();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
