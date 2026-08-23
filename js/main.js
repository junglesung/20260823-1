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
  const LIMBS = ["hand-left", "hand-right", "foot-left", "foot-right"];
  const LIMB_WORDS = {
    "hand-left": "一手",
    "hand-right": "一手",
    "foot-left": "一腳",
    "foot-right": "一腳"
  };

  const stage = document.getElementById("stage");
  const startBtn = document.getElementById("start-btn");
  const hud = document.getElementById("hud");
  const herdEl = document.getElementById("herd");
  const foesEl = document.getElementById("foes");
  const foodsEl = document.getElementById("foods");
  const linkLayer = document.getElementById("link-layer");
  const rainLayer = document.getElementById("rain-layer");
  const gameActions = document.getElementById("game-actions");
  const foodBtn = document.getElementById("food-btn");
  const tofuBtn = document.getElementById("tofu-btn");
  const umbrellaBtn = document.getElementById("umbrella-btn");
  const shopBtn = document.getElementById("shop-btn");
  const toastEl = document.getElementById("toast");
  const neighborOverlay = document.getElementById("neighbor-overlay");
  const neighborText = document.getElementById("neighbor-text");
  const neighborBtn = document.getElementById("neighbor-btn");
  const shopOverlay = document.getElementById("shop-overlay");
  const shopCloseBtn = document.getElementById("shop-close-btn");
  const winOverlay = document.getElementById("win-overlay");
  const winCloseBtn = document.getElementById("win-close-btn");
  const gemOverlay = document.getElementById("gem-overlay");
  const gemCloseBtn = document.getElementById("gem-close-btn");
  const workBtn = document.getElementById("work-btn");
  const upgradeFarmBtn = document.getElementById("upgrade-farm-btn");
  const upgradeAnimalBtn = document.getElementById("upgrade-animal-btn");
  const upgradeFoodBtn = document.getElementById("upgrade-food-btn");
  const doorLock = document.getElementById("door-lock");
  const moneyValue = document.getElementById("money-value");
  const animalCountEl = document.getElementById("animal-count");
  const hungryCountEl = document.getElementById("hungry-count");
  const foeCountEl = document.getElementById("foe-count");
  const weatherLabel = document.getElementById("weather-label");
  const weatherValue = document.getElementById("weather-value");
  const goalValue = document.getElementById("goal-value");

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
    foes: [],
    foods: [],
    coins: [],
    raining: false,
    weather: "clear",
    rainIn: 60,
    rainLeft: 0,
    typhoonIn: -1,
    doorLocked: false,
    neighborStep: -1,
    shopUnlocked: false,
    working: false,
    farmLevel: 0,
    animalLevel: 0,
    extraFood: 0,
    incomeAcc: 0,
    stealAcc: 0,
    toastTimer: 0,
    won: false,
    hasGem: false,
    spawnedFoes: 0,
    expectedFoes: 8,
    eliteSpawned: false,
    link: { active: false, animals: [], foe: null, pointer: null }
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
    foeCountEl.textContent = String(game.foes.length);

    if (game.weather === "typhoon") {
      weatherLabel.textContent = "颱風雨";
      weatherValue.textContent = Math.max(0, Math.ceil(game.rainLeft)) + "秒";
    } else if (game.raining) {
      weatherLabel.textContent = "下雨剩餘";
      weatherValue.textContent = Math.max(0, Math.ceil(game.rainLeft)) + "秒";
    } else if (game.typhoonIn > 0) {
      weatherLabel.textContent = "颱風倒數";
      weatherValue.textContent = Math.max(0, Math.ceil(game.typhoonIn)) + "秒";
    } else if (game.rainIn > 0) {
      weatherLabel.textContent = "下雨倒數";
      weatherValue.textContent = Math.max(0, Math.ceil(game.rainIn)) + "秒";
    } else {
      weatherLabel.textContent = "天氣";
      weatherValue.textContent = "放晴";
    }

    if (game.hasGem) {
      goalValue.textContent = "最寶石入手";
    } else if (game.won) {
      goalValue.textContent = "已餵飽獲勝";
    } else {
      goalValue.textContent = "餵飽全場就贏";
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

  function createFoe(options) {
    const role = options.role || "villain";
    const typhoon = !!options.typhoon;
    const el = document.createElement("div");
    el.className = "foe " + role + (typhoon ? " typhoon" : "");
    el.innerHTML =
      '<div class="foe-sprite">' +
        '<div class="head"></div>' +
        '<div class="eye left"></div>' +
        '<div class="eye right"></div>' +
        '<div class="mouth"></div>' +
        (typhoon ? '<div class="armor"></div>' : "") +
        '<div class="body"></div>' +
        '<div class="arm left"></div>' +
        '<div class="arm right"></div>' +
        '<div class="leg left"></div>' +
        '<div class="leg right"></div>' +
        (role === "thief" ? '<div class="bag"></div>' : "") +
      "</div>" +
      '<span class="tag">' + (typhoon ? "颱風小偷" : role === "thief" ? "小偷" : "壞人") + "</span>";

    foesEl.appendChild(el);

    const need = options.need;
    const speed = role === "thief" ? 7.2 : 4.6;
    const angle = Math.random() * Math.PI * 2;
    const foe = {
      el: el,
      role: role,
      typhoon: typhoon,
      x: rand(FIELD.minX, FIELD.maxX),
      y: rand(FIELD.minY, FIELD.maxY - 4),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed: speed,
      need: need,
      money: options.money,
      attacking: false,
      limbs: LIMBS.slice(),
      limbTimer: 0,
      nextTurn: Math.random(),
      bobPhase: Math.random() * Math.PI * 2
    };

    game.foes.push(foe);
    game.spawnedFoes += 1;
    return foe;
  }

  function spawnVillains(count) {
    for (let i = 0; i < count; i += 1) {
      createFoe({ role: "villain", need: 1, money: 6 });
    }
  }

  function fillRainLayer(heavy) {
    rainLayer.innerHTML = "";
    const drops = heavy ? 72 : 48;
    for (let i = 0; i < drops; i += 1) {
      const drop = document.createElement("div");
      drop.className = "raindrop";
      drop.style.left = Math.random() * 100 + "%";
      drop.style.animationDelay = Math.random() * 0.9 + "s";
      drop.style.animationDuration = (heavy ? 0.45 : 0.7) + Math.random() * 0.4 + "s";
      rainLayer.appendChild(drop);
    }
    rainLayer.hidden = false;
  }

  function startRain(typhoon) {
    game.raining = true;
    game.weather = typhoon ? "typhoon" : "rain";
    game.rainLeft = 60;
    stage.classList.toggle("raining", !typhoon);
    stage.classList.toggle("typhoon", !!typhoon);
    fillRainLayer(!!typhoon);
    umbrellaBtn.hidden = false;

    if (typhoon) {
      const need = 4 + Math.floor(Math.random() * 5);
      createFoe({ role: "thief", typhoon: true, need: need, money: 28 });
      spawnVillains(1);
      game.eliteSpawned = true;
      showToast("颱風雨來了！小偷裝備更強，要連 " + need + " 隻紅色動物再拉到藍色壞人。");
    } else {
      createFoe({ role: "thief", need: 3, money: 14 });
      spawnVillains(2);
      showToast("下雨了！出現小偷。黑色的是壞人，快按，或用紅色動物連線去打。");
    }
  }

  function stopRain() {
    const wasTyphoon = game.weather === "typhoon";
    game.raining = false;
    game.weather = "clear";
    game.rainLeft = 0;
    stage.classList.remove("raining", "typhoon");
    rainLayer.hidden = true;
    umbrellaBtn.hidden = true;
    if (wasTyphoon) {
      showToast("颱風停了。");
    } else {
      game.typhoonIn = 60;
      showToast("雨停了。再過一分鐘會下颱風雨，小偷裝備會更強。");
    }
  }

  function dropFood(kind) {
    const isTofu = kind === "tofu";
    const count = (isTofu ? 1 : 1) + game.extraFood;
    for (let i = 0; i < count; i += 1) {
      const el = document.createElement("div");
      el.className = "food-drop" + (isTofu ? " tofu" : "");
      const x = rand(8, 90);
      el.style.left = x + "%";
      el.style.top = "6%";
      foodsEl.appendChild(el);
      game.foods.push({
        el: el,
        x: x,
        y: 6,
        eaten: false,
        fill: isTofu ? 92 : 58
      });
    }
  }

  function dropCoins(x, y, amount) {
    const n = Math.min(8, Math.max(3, Math.round(amount / 4)));
    for (let i = 0; i < n; i += 1) {
      const el = document.createElement("div");
      el.className = "coin-drop";
      el.style.left = x + rand(-2, 2) + "%";
      el.style.top = y + "%";
      stage.appendChild(el);
      game.coins.push({
        el: el,
        y: y,
        life: 0.9 + Math.random() * 0.4
      });
    }
    game.money += amount;
  }

  function removeAnimal(animal) {
    if (animal.el.parentNode) {
      animal.el.parentNode.removeChild(animal.el);
    }
    game.animals = game.animals.filter(function (item) {
      return item !== animal;
    });
  }

  function defeatFoe(foe) {
    dropCoins(foe.x + 2, foe.y + 2, foe.money);
    if (foe.el.parentNode) {
      foe.el.parentNode.removeChild(foe.el);
    }
    game.foes = game.foes.filter(function (item) {
      return item !== foe;
    });
    showToast("壞人被幹掉了，錢掉下來了！");
    maybeGiveGem();
    updateHud();
  }

  function startLimbAttack(foe) {
    if (foe.attacking) {
      return;
    }
    foe.attacking = true;
    foe.limbTimer = 0.05;
    showToast("連線成功！動物開始一腳一手地打。");
  }

  function maybeGiveGem() {
    if (game.hasGem || !game.eliteSpawned || game.foes.length > 0) {
      return;
    }
    if (game.spawnedFoes < game.expectedFoes) {
      return;
    }
    game.hasGem = true;
    gemOverlay.hidden = false;
    showToast("全部壞人都解決了，得到角色最寶石！");
  }

  function maybeWin() {
    if (game.won || !game.animals.length) {
      return;
    }
    const allFull = game.animals.every(function (animal) {
      return animal.hunger >= 90;
    });
    if (allFull) {
      game.won = true;
      winOverlay.hidden = false;
      showToast("食物全部餵飽，你贏了！");
    }
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
    spawnVillains(3);
    updateHud();
    showToast("100 隻動物來了！按食物或豆腐餵牠們。看到黑色壞人就快按！");
  }

  function unitCenter(unit, isFoe) {
    return {
      x: unit.x + (isFoe ? 2.6 : 2.3),
      y: unit.y + (isFoe ? 5.5 : 3.6)
    };
  }

  function stagePoint(event) {
    const rect = stage.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    };
  }

  function unitFromEvent(event) {
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!el) {
      return null;
    }
    const animalEl = el.closest(".herd-animal");
    if (animalEl) {
      const animal = game.animals.find(function (item) {
        return item.el === animalEl;
      });
      if (animal) {
        return { type: "animal", unit: animal };
      }
    }
    const foeEl = el.closest(".foe");
    if (foeEl) {
      const foe = game.foes.find(function (item) {
        return item.el === foeEl;
      });
      if (foe) {
        return { type: "foe", unit: foe };
      }
    }
    return null;
  }

  function clearLink() {
    game.link.active = false;
    game.link.animals.forEach(function (animal) {
      animal.el.classList.remove("linked");
    });
    if (game.link.foe) {
      game.link.foe.el.classList.remove("linked-target");
    }
    game.link.animals = [];
    game.link.foe = null;
    game.link.pointer = null;
    linkLayer.innerHTML = "";
  }

  function drawLink() {
    const points = game.link.animals.map(function (animal) {
      return unitCenter(animal, false);
    });
    if (game.link.foe) {
      points.push(unitCenter(game.link.foe, true));
    } else if (game.link.pointer) {
      points.push(game.link.pointer);
    }

    let html = "";
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const last = i === points.length - 2 && game.link.foe;
      html +=
        '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y +
        '" stroke="' + (last ? "#3d7cff" : "#e02424") +
        '" stroke-width="1.1"></line>';
    }
    linkLayer.innerHTML = html;
  }

  function finishLink() {
    const foe = game.link.foe;
    const count = game.link.animals.length;
    if (!foe || !count) {
      clearLink();
      return;
    }
    if (count < foe.need) {
      showToast("這隻要 " + foe.need + " 隻紅色動物連線，現在只有 " + count + " 隻。");
      clearLink();
      return;
    }
    startLimbAttack(foe);
    clearLink();
  }

  function onPointerDown(event) {
    if (!game.playing || game.paused) {
      return;
    }
    if (event.target.closest("button, .overlay, .panel, .hud, .updated")) {
      return;
    }
    const hit = unitFromEvent(event);
    if (!hit) {
      return;
    }
    if (hit.type === "foe") {
      if (hit.unit.need <= 1 && !hit.unit.attacking) {
        defeatFoe(hit.unit);
        return;
      }
      showToast("這隻比較強，先拉紅色動物連線，最後拉到這個藍色壞人。");
      return;
    }
    event.preventDefault();
    game.link.active = true;
    game.link.animals = [hit.unit];
    game.link.foe = null;
    hit.unit.el.classList.add("linked");
    game.link.pointer = stagePoint(event);
    drawLink();
  }

  function onPointerMove(event) {
    if (!game.link.active) {
      return;
    }
    game.link.pointer = stagePoint(event);
    const hit = unitFromEvent(event);
    if (hit && hit.type === "animal" && game.link.animals.indexOf(hit.unit) === -1) {
      game.link.animals.push(hit.unit);
      hit.unit.el.classList.add("linked");
    }
    if (hit && hit.type === "foe") {
      if (game.link.foe && game.link.foe !== hit.unit) {
        game.link.foe.el.classList.remove("linked-target");
      }
      game.link.foe = hit.unit;
      hit.unit.el.classList.add("linked-target");
    }
    drawLink();
  }

  function onPointerUp() {
    if (!game.link.active) {
      return;
    }
    finishLink();
  }

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  startBtn.addEventListener("click", function () {
    startGame();
  });

  foodBtn.addEventListener("click", function () {
    if (!game.playing || game.paused) {
      return;
    }
    dropFood("food");
  });

  tofuBtn.addEventListener("click", function () {
    if (!game.playing || game.paused) {
      return;
    }
    dropFood("tofu");
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

  winCloseBtn.addEventListener("click", function () {
    winOverlay.hidden = true;
  });

  gemCloseBtn.addEventListener("click", function () {
    gemOverlay.hidden = true;
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
    showToast("現在按一次食物或豆腐會掉下更多！");
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

    if (game.raining) {
      game.rainLeft -= dt;
      if (game.rainLeft <= 0) {
        stopRain();
      }
    } else if (game.rainIn > 0) {
      game.rainIn -= dt;
      if (game.rainIn <= 0) {
        startRain(false);
      }
    } else if (game.typhoonIn > 0) {
      game.typhoonIn -= dt;
      if (game.typhoonIn <= 0) {
        startRain(true);
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
        animal.hunger = Math.min(100, animal.hunger + nearbyFood.fill + game.animalLevel * 8);
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

    game.foes.forEach(function (foe) {
      if (foe.attacking) {
        foe.limbTimer -= dt;
        if (foe.limbTimer <= 0 && foe.limbs.length) {
          const limb = foe.limbs.shift();
          foe.el.classList.add("lost-" + limb);
          showToast(LIMB_WORDS[limb] + "！");
          foe.limbTimer = 0.38;
        } else if (!foe.limbs.length && foe.limbTimer <= 0) {
          defeatFoe(foe);
        }
        return;
      }
      moveMover(foe, FIELD, dt, 0.2);
    });

    if (game.link.active) {
      drawLink();
    }

    game.coins.forEach(function (coin) {
      coin.y -= 18 * dt;
      coin.life -= dt;
      coin.el.style.top = coin.y + "%";
      if (coin.life <= 0 && coin.el.parentNode) {
        coin.el.parentNode.removeChild(coin.el);
      }
    });
    game.coins = game.coins.filter(function (coin) {
      return coin.life > 0;
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

    const livingThief = game.foes.some(function (foe) {
      return foe.role === "thief" && !foe.attacking;
    });
    if (livingThief) {
      game.stealAcc += dt;
      if (game.stealAcc >= 4) {
        game.stealAcc = 0;
        game.money = Math.max(0, game.money - 1);
      }
    }

    if (game.money >= 100) {
      unlockShop();
    }

    maybeWin();
    updateHud();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
