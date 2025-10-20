class ZeroWasteGame {
  constructor() {
    this.elements = {
      title: document.getElementById("game-title"),

      description: document.getElementById("game-description"),

      content: document.getElementById("game-content"),

      actionButton: document.getElementById("action-button"),

      scoreDisplay: document.getElementById("score-display"),

      moneyDisplay: document.getElementById("money-display"),

      dayDisplay: document.getElementById("day-display"),

      notificationArea: document.getElementById("notification-area"),

      dayTimerContainer: document.getElementById("day-timer-container"),

      dayProgressBar: document.getElementById("day-progress-bar"),

      navigationBar: document.getElementById("navigation-bar"),

      dailyChallengeContainer: document.getElementById(
        "daily-challenge-container"
      ),
    };

    this.sfx = {
      click: document.getElementById("sfx-click"),

      success: document.getElementById("sfx-success"),

      error: document.getElementById("sfx-error"),

      buy: document.getElementById("sfx-buy"),

      cook: document.getElementById("sfx-cook"),

      jump: document.getElementById("sfx-jump"),

      hit: document.getElementById("sfx-hit"),
    };

    this.initData();

    // bind jump handler once so we can add/remove listener reliably

    this.boundHandleJump = this.handleJump.bind(this);

    this.init();
  }

  // Helper: pick random element from array

  rando(arr) {
    if (!arr || arr.length === 0) return null;

    return arr[Math.floor(Math.random() * arr.length)];
  }

  initData() {
    this.shoppingItems = [
      {
        name: "Carrots",

        cost: 15000,

        shelfLife: 3,

        id: "carrot",

        emoji: "🥕",

        locked: false,
      },

      {
        name: "Rice",

        cost: 25000,

        shelfLife: 50,

        id: "rice",

        emoji: "🍚",

        locked: false,
      },

      {
        name: "Beef",

        cost: 70000,

        shelfLife: 1,

        id: "beef",

        img: "🥩",

        locked: false,
      },

      {
        name: "Eggs",

        cost: 30000,

        shelfLife: 7,

        id: "egg",

        emoji: "🥚",

        locked: false,
      },

      {
        name: "Spinach",

        cost: 18000,

        shelfLife: 2,

        id: "spinach",

        emoji: "🥬",

        locked: false,
      },
    ];

    this.recipes = [
      {
        id: "pho",

        name: "Beef Soup",

        required: ["beef", "rice"],

        cookingTime: 15000,

        emoji: "🍜",
      },

      {
        id: "fried_rice",

        name: "Fried Rice",

        required: ["rice", "egg"],

        cookingTime: 10000,

        emoji: "🍛",
      },

      {
        id: "spinach_soup",

        name: "Spinach Soup",

        required: ["spinach", "carrot"],

        cookingTime: 8000,

        emoji: "🍲",
      },
    ];

    this.dailyChallenges = [
      {
        text: "Collect at least one Beef in the supermarket!",

        type: "collect",

        value: "beef",

        bonus: 15000,
      },

      {
        text: "Try to cook Fried Rice today!",

        type: "recipe",

        value: "fried_rice",

        bonus: 20000,
      },
    ];
  }

  init() {
    if (this.dayTimer) clearInterval(this.dayTimer);

    this.initData();

    this.state = {
      currentView: "welcome",

      day: 0,

      maxDays: 5,

      score: 0,

      money: 100000,

      inventory: [],

      stoves: [{ cooking: false }, { cooking: false }, { cooking: false }],

      dailyChallenge: null,

      // Track dishes completed per day

      completedDishes: [],
    };

    // Runner Game State

    this.runner = {
      canvas: null,

      ctx: null,

      player: {
        x: 50,

        y: 250,

        width: 40,

        height: 40,

        vy: 0,

        onGround: true,

        // For smoothing we keep a displayY that lerps to y

        displayY: 250,
      },

      gravity: 3000, // px/s^2 (increased for faster fall)

      jumpPower: -900, // px/s impulse (stronger jump)

      gameSpeed: 300, // px/s base speed for items

      obstacles: [],

      collectibles: [],

      frame: 0,

      lastTime: null,

      spawnAccumulator: 0,

      obstacleAccumulator: 0,

      // Tweakable spawn rates (seconds)

      collectibleSpawnInterval: 1.6,

      obstacleSpawnInterval: 3.0,

      running: false,

      collectedCount: 0,
    };

    this.dayTimer = null;

    this.dayDuration = 60000;

    this.timeRemaining = this.dayDuration;

    this.render();
  }

  playSound(sound) {
    try {
      this.sfx[sound].currentTime = 0;

      this.sfx[sound].play();
    } catch (e) {}
  }

  // --- GAME LOOP & TIME MANAGEMENT ---

  startGameLoop() {
    this.dayTimer = setInterval(() => {
      this.timeRemaining -= 100;

      if (this.timeRemaining < 0) this.timeRemaining = 0;

      this.elements.dayProgressBar.style.width = `${
        (this.timeRemaining / this.dayDuration) * 100
      }%`;

      // Update runner game if in shop view

      if (this.state.currentView === "shop") {
        // runner updates are handled by its own RAF loop

        if (!this.runner.running) this.startRunnerLoop();
      }

      // Update cooking times

      let stoveViewNeedsUpdate = false;

      this.state.stoves.forEach((stove, index) => {
        if (stove.cooking) {
          stove.timeLeft -= 100;

          if (stove.timeLeft <= 0) {
            this.finishCooking(index);

            stoveViewNeedsUpdate = true;
          }

          // update stove time display if present

          const el = document.getElementById(`stove-${index}-time`);

          if (el)
            el.textContent = String(
              Math.max(0, Math.ceil(stove.timeLeft / 1000))
            );
        }
      });

      if (stoveViewNeedsUpdate) this.renderKitchenView();

      if (this.timeRemaining <= 0) this.endDay();
    }, 100);
  }

  startRunnerLoop() {
    if (this.runner.running) return;

    this.runner.running = true;

    this.runner.lastTime = performance.now();

    const loop = (now) => {
      if (!this.runner.running) return;

      const dt = Math.min((now - this.runner.lastTime) / 1000, 0.05); // clamp dt

      this.runner.lastTime = now;

      this.updateRunner(dt);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  stopRunnerLoop() {
    this.runner.running = false;
  }

  // ... (rest of the JS code is largely the same, with the new runner logic added)

  // --- VIEW SWITCHING & RENDERING ---

  switchView(view, data) {
    this.playSound("click");

    // Handle runner game keyboard events

    if (view === "shop") {
      window.addEventListener("keydown", this.boundHandleJump);

      // ensure runner loop starts

      if (!this.runner.running) this.startRunnerLoop();
    } else {
      window.removeEventListener("keydown", this.boundHandleJump);

      // stop runner when leaving shop view

      this.stopRunnerLoop();
    }

    // Update view-specific classes for backgrounds

    const card = document.getElementById("game-card");

    // Remove all view-specific classes

    card.classList.remove(
      "view-welcome",

      "view-shop",

      "view-kitchen",

      "view-summary"
    );

    // Add the new view class

    card.classList.add(`view-${view}`);

    this.state.currentView = view;

    this.render(data);
  }

  render(data) {
    this.updateStatus();

    [
      "navigationBar",

      "dayTimerContainer",

      "actionButton",

      "dailyChallengeContainer",
    ].forEach((el) => this.elements[el].classList.add("hidden"));

    switch (this.state.currentView) {
      case "welcome":
        this.renderWelcome();

        break;

      case "shop":

      case "kitchen":
        [
          "navigationBar",

          "dayTimerContainer",

          "dailyChallengeContainer",
        ].forEach((el) => this.elements[el].classList.remove("hidden"));

        document

          .querySelectorAll(".nav-button")

          .forEach((b) => b.classList.remove("active"));

        document

          .getElementById(`nav-${this.state.currentView}`)

          .classList.add("active");

        this.elements.dailyChallengeContainer.textContent = `⭐ Today's Challenge: ${this.state.dailyChallenge.text}`;

        if (this.state.currentView === "shop") this.renderShopView();
        else this.renderKitchenView();

        break;

      case "summary":
        this.renderSummary(data);

        break;
    }
  }

  // --- NEW: RUNNER GAME (SHOP VIEW) ---

  renderShopView() {
    this.runner.collectedCount = 0;

    this.elements.content.innerHTML = `

            <div class="shop-top-bar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">

              <div id="collected-bar">Collected: <strong id="collected-count">0</strong></div>

              <div><button id="proceed-kitchen" class="nav-button">Proceed to Kitchen</button></div>

            </div>

            <p class="text-center text-sm mb-2">Press <strong>Spacebar</strong> to jump and collect ingredients!</p>

            <canvas id="shop-canvas"></canvas>

        `;

    this.runner.canvas = document.getElementById("shop-canvas");

    this.runner.ctx = this.runner.canvas.getContext("2d");

    this.runner.canvas.width = this.elements.content.offsetWidth;

    this.runner.canvas.height = 350;

    this.runner.player.y = this.runner.canvas.height - 50; // Start on ground

    this.runner.player.displayY = this.runner.player.y;

    // Reset runner arrays/timers when entering shop

    this.runner.obstacles = [];

    this.runner.collectibles = [];

    this.runner.frame = 0;

    this.runner.spawnAccumulator = 0;

    this.runner.obstacleAccumulator = 0;

    this.runner.lastTime = performance.now();

    this.startRunnerLoop();

    // wire up proceed button

    const proceedBtn = document.getElementById("proceed-kitchen");

    if (proceedBtn) {
      proceedBtn.onclick = () => {
        this.stopRunnerLoop();

        this.switchView("kitchen");
      };
    }
  }

  updateRunner(dt = 0.016) {
    const r = this.runner;

    const { canvas, ctx, player } = r;

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Physics (using px/s and delta time dt)

    player.vy += r.gravity * dt;

    player.y += player.vy * dt;

    const groundY = canvas.height - 50;

    if (player.y > groundY) {
      player.y = groundY;

      player.vy = 0;

      player.onGround = true;
    }

    // Smooth displayY towards actual y (lerp)

    const lerp = (a, b, t) => a + (b - a) * t;

    // increase lerp multiplier for snappier display following

    player.displayY = lerp(player.displayY, player.y, Math.min(1, 30 * dt));

    // Draw Player (a simple square for now) using displayY

    ctx.fillStyle = "#4f46e5";

    ctx.fillRect(player.x, player.displayY, player.width, player.height);

    // Spawn logic using accumulators (time-based)

    r.spawnAccumulator += dt;

    r.obstacleAccumulator += dt;

    if (r.spawnAccumulator >= r.collectibleSpawnInterval) {
      r.spawnAccumulator = 0;

      const item = this.rando(this.shoppingItems);

      r.collectibles.push({
        x: canvas.width + 20,

        y: groundY - 100 + (Math.random() * 60 - 30),

        item: item,

        size: 30,

        vx: -r.gameSpeed * (0.9 + Math.random() * 0.3),
      });
    }

    if (r.obstacleAccumulator >= r.obstacleSpawnInterval) {
      r.obstacleAccumulator = 0;

      r.obstacles.push({
        x: canvas.width + 20,

        y: groundY - 10,

        width: 30,

        height: 40,

        vx: -r.gameSpeed * (0.95 + Math.random() * 0.2),
      });
    }

    // Update & Draw Collectibles

    for (let i = r.collectibles.length - 1; i >= 0; i--) {
      let c = r.collectibles[i];

      // Smooth position update using velocity

      c.x += c.vx * dt;

      ctx.font = "30px Quicksand";

      ctx.fillText(c.item.emoji, c.x, c.y);

      // Collision with player (use displayY for collision)

      if (
        player.x < c.x + c.size &&
        player.x + player.width > c.x &&
        player.displayY < c.y + c.size &&
        player.displayY + player.height > c.y
      ) {
        this.collectFromRunner(c.item.id);

        r.collectibles.splice(i, 1);

        continue;
      }

      if (c.x + c.size < -50) r.collectibles.splice(i, 1);
    }

    // Update & Draw Obstacles

    for (let i = r.obstacles.length - 1; i >= 0; i--) {
      let o = r.obstacles[i];

      o.x += o.vx * dt;

      ctx.font = "40px Quicksand";

      ctx.fillText("⚠️", o.x, o.y);

      // Collision with player

      if (
        player.x < o.x + o.width &&
        player.x + player.width > o.x &&
        player.displayY < o.y + o.height &&
        player.displayY + player.height > o.y
      ) {
        this.hitObstacle();

        r.obstacles.splice(i, 1);

        continue;
      }

      if (o.x + o.width < -50) r.obstacles.splice(i, 1);
    }
  }

  handleJump(e) {
    if (e.code === "Space" && this.runner.player.onGround) {
      this.playSound("jump");

      this.runner.player.vy = this.runner.jumpPower;

      this.runner.player.onGround = false;
    }
  }

  hitObstacle() {
    this.playSound("hit");

    this.showNotification("Ouch! You lost 5 seconds!", "error");

    this.timeRemaining -= 5000;
  }

  buyItem(itemId) {
    const item = this.shoppingItems.find((i) => i.id === itemId);

    if (this.state.money >= item.cost) {
      this.playSound("buy");

      this.state.money -= item.cost;

      let instanceId =
        this.state.inventory.length > 0
          ? Math.max(...this.state.inventory.map((i) => i.instanceId)) + 1
          : 0;

      this.state.inventory.push({
        ...item,

        used: false,

        spoiled: false,

        instanceId: instanceId,

        shelfLife: item.shelfLife + this.state.day,
      });

      this.showNotification(`Collected ${item.name}!`, "success");

      this.updateStatus();

      // Check challenge

      if (
        !this.state.dailyChallenge.completed &&
        this.state.dailyChallenge.type === "collect" &&
        this.state.dailyChallenge.value === itemId
      ) {
        this.state.dailyChallenge.completed = true;

        this.showNotification(`Daily Challenge Complete!`, "success");
      }
    } else {
      this.showNotification(`Can't afford ${item.name}!`, "error");
    }
  }

  collectFromRunner(itemId) {
    const item = this.shoppingItems.find((i) => i.id === itemId);

    if (!item) return;

    this.playSound("buy");

    let instanceId =
      this.state.inventory.length > 0
        ? Math.max(...this.state.inventory.map((i) => i.instanceId)) + 1
        : 0;

    this.state.inventory.push({
      ...item,

      used: false,

      spoiled: false,

      instanceId: instanceId,

      shelfLife: item.shelfLife + this.state.day,
    });

    // Increment runner collected counter and update UI if present

    if (this.runner)
      this.runner.collectedCount = (this.runner.collectedCount || 0) + 1;

    const countEl = document.getElementById("collected-count");

    if (countEl) countEl.textContent = String(this.runner.collectedCount);

    this.showNotification(`Collected ${item.name}!`, "success");

    this.updateStatus();

    // Check challenge

    if (
      !this.state.dailyChallenge.completed &&
      this.state.dailyChallenge.type === "collect" &&
      this.state.dailyChallenge.value === itemId
    ) {
      this.state.dailyChallenge.completed = true;

      this.showNotification(`Daily Challenge Complete!`, "success");
    }
  }

  // --- OTHER METHODS (Kitchen, Summary, etc.) ---

  // (These methods are mostly the same as the "STABLE VERSION" from the previous turn)

  // The key change is that the `renderShopView` is now the runner game.

  // I've included the rest of the code for completeness.

  startDay() {
    this.playSound("click");

    this.state.day++;

    this.timeRemaining = this.dayDuration;

    this.state.inventory.forEach((item) => {
      if (!item.used) item.shelfLife--;
    });

    this.state.dailyChallenge = {
      ...this.dailyChallenges[
        Math.floor(Math.random() * this.dailyChallenges.length)
      ],

      completed: false,
    };

    // Start day in the shop so player can collect ingredients via the runner

    this.switchView("shop");

    this.startGameLoop();
  }

  endDay() {
    // End the day and calculate results

    clearInterval(this.dayTimer);

    this.dayTimer = null;

    this.showNotification(`Day ${this.state.day} has ended!`, "info");

    // Calculate completed dishes

    const dishesCount = this.state.completedDishes.length;

    const dishesEarnings = this.state.completedDishes.reduce((sum, dish) => {
      return sum + (20000 + this.state.completedDishes.indexOf(dish) * 5000);
    }, 0);

    // Count wasted items

    const unusedItems = this.state.inventory.filter((item) => !item.used);

    const wastedCount = unusedItems.length;

    const wastePenalty = wastedCount * 20000;

    // Apply waste penalties

    if (wastedCount > 0) {
      unusedItems.forEach((item) => {
        item.used = true;

        item.spoiled = true;

        this.state.score += 15;
      });

      this.state.money -= wastePenalty;
    }

    // Format detailed summary message

    let summaryMessage = `

      <div style="text-align:left;padding:12px;">

        <h3>Day ${this.state.day} Summary</h3>

        <div style="margin:12px 0;">

          <h4>🍳 Dishes Completed: ${dishesCount}</h4>

          <ul style="list-style:none;padding:0;">

            ${this.state.completedDishes

              .map((d) => `<li>${d.recipe.emoji} ${d.recipe.name}</li>`)

              .join("")}

          </ul>

          <p>Total earnings: +${this.formatVND(dishesEarnings)}</p>

        </div>

        <div style="margin:12px 0;${wastedCount > 0 ? "color:#e74c3c;" : ""}">

          <h4>🗑️ Wasted Food: ${wastedCount} items</h4>

          ${
            wastedCount > 0
              ? `<p>Waste penalty: -${this.formatVND(wastePenalty)}</p>

             <ul style="list-style:none;padding:0;">

               ${unusedItems

                 .map((i) => `<li>${i.emoji} ${i.name}</li>`)

                 .join("")}

             </ul>`
              : '<p style="color:#27ae60;">Perfect! No food wasted!</p>'
          }

        </div>

        ${
          this.state.dailyChallenge?.completed
            ? `<div style="margin:12px 0;color:#27ae60;">

             <h4>⭐ Challenge Completed!</h4>

             <p>Bonus: +${this.formatVND(this.state.dailyChallenge.bonus)}</p>

           </div>`
            : ""
        }

        <div style="margin-top:16px;">

          <strong>Net profit: ${this.formatVND(
            dishesEarnings -
              wastePenalty +
              (this.state.dailyChallenge?.completed
                ? this.state.dailyChallenge.bonus
                : 0)
          )}</strong>

        </div>

      </div>

    `;

    // Play appropriate sound

    if (wastedCount > 0) {
      this.playSound("error");
    } else {
      this.playSound("success");
    }

    // Reset for next day

    this.state.inventory = this.state.inventory.filter((item) => !item.used);

    this.state.completedDishes = [];

    // Show summary and prepare for next day/end

    this.switchView("summary", summaryMessage);

    // Update action button for next day or game end

    const actionBtn = this.elements.actionButton;

    actionBtn.classList.remove("hidden");

    if (this.state.day >= this.state.maxDays) {
      actionBtn.textContent = "See Final Results";

      actionBtn.onclick = () => this.showFinalResults();
    } else {
      actionBtn.textContent = `Start Day ${this.state.day + 1}`;

      actionBtn.onclick = () => this.startDay();
    }
  }

  renderWelcome() {
    this.elements.content.innerHTML = `<div class="text-center p-4"><p class="text-6xl mb-4">🥕🍳🥩</p><p>Manage your time and money to become a Zero-Waste Champion!</p></div>`;

    this.elements.actionButton.classList.remove("hidden");

    this.elements.actionButton.textContent = "Start Day 1";

    this.elements.actionButton.onclick = () => this.startDay();
  }

  updateStatus() {
    this.elements.scoreDisplay.textContent = `🗑️ Waste: ${this.state.score}%`;

    this.elements.moneyDisplay.textContent = `💰 Budget: ${this.formatVND(
      this.state.money
    )}`;

    if (this.state.day > 0)
      this.elements.dayDisplay.textContent = `Day: ${this.state.day} / ${this.state.maxDays}`;
  }

  renderKitchenView() {
    // Simple kitchen UI: show inventory, show available recipes, allow cooking

    const invHtml = this.state.inventory

      .map(
        (it) => `

        <div class="inv-item" style="display:inline-block;margin:4px;padding:6px;border:1px solid #ddd;border-radius:6px;">

          <div style="font-size:24px">${it.emoji}</div>

          <div style="font-size:12px">${it.name}</div>

        </div>

      `
      )

      .join("");

    const recipesHtml = this.recipes

      .map((r) => {
        const hasAll = r.required.every((req) =>
          this.state.inventory.some((inv) => inv.id === req && !inv.used)
        );

        return `

          <div style="border:1px solid #eee;padding:8px;margin-bottom:6px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">

            <div>

              <div style="font-size:20px">${r.emoji} ${r.name}</div>

              <div style="font-size:12px;color:#666">Requires: ${r.required.join(
                ", "
              )}</div>

            </div>

            <div>

              <button class="nav-button" data-recipe="${r.id}" ${
          hasAll ? "" : "disabled"
        }>${hasAll ? "Cook" : "Missing"}</button>

            </div>

          </div>

        `;
      })

      .join("");

    this.elements.content.innerHTML = `

      <div>

        <h3>Kitchen — Plan Meals</h3>

        <div style="margin-bottom:8px">Inventory (${
          this.state.inventory.length
        }):<div id="inv-list">${invHtml || "<em>Empty</em>"}</div></div>

        <div>

          <h4>Recipes</h4>

          <div id="recipe-list">${recipesHtml}</div>

        </div>

      </div>

    `;

    // Wire up cook buttons to start cooking on a free stove

    this.elements.content

      .querySelectorAll("button[data-recipe]")

      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const recipeId = btn.getAttribute("data-recipe");

          this.startCooking(recipeId);
        });
      });

    // Render stove statuses under the recipes

    const stoveArea = document.createElement("div");

    stoveArea.style.marginTop = "12px";

    stoveArea.innerHTML = "<h4>Stoves</h4>";

    this.state.stoves.forEach((s, idx) => {
      const div = document.createElement("div");

      div.style.padding = "6px";

      div.style.border = "1px solid #eee";

      div.style.borderRadius = "6px";

      div.style.marginBottom = "6px";

      if (s.cooking) {
        div.innerHTML = `Stove ${idx + 1}: Cooking ${
          s.recipe.name
        } — Time left: <span id="stove-${idx}-time">${Math.ceil(
          s.timeLeft / 1000
        )}</span>s`;
      } else {
        div.textContent = `Stove ${idx + 1}: Idle`;
      }

      stoveArea.appendChild(div);
    });

    this.elements.content.appendChild(stoveArea);
  }

  startCooking(recipeId) {
    const recipe = this.recipes.find((r) => r.id === recipeId);

    if (!recipe) return this.showNotification("Recipe not found", "error");

    // find free stove

    const stoveIndex = this.state.stoves.findIndex((s) => !s.cooking);

    if (stoveIndex === -1)
      return this.showNotification("No free stove available", "error");

    // check ingredients

    const missing = recipe.required.some(
      (req) => !this.state.inventory.some((inv) => inv.id === req && !inv.used)
    );

    if (missing) return this.showNotification("Missing ingredients", "error");

    // reserve ingredients (mark used)

    recipe.required.forEach((req) => {
      const idx = this.state.inventory.findIndex(
        (inv) => inv.id === req && !inv.used
      );

      if (idx >= 0) this.state.inventory[idx].used = true;
    });

    // assign to stove

    const stove = this.state.stoves[stoveIndex];

    stove.cooking = true;

    stove.recipe = recipe;

    stove.timeLeft = recipe.cookingTime; // ms

    // Notify and re-render kitchen

    this.showNotification(`Started cooking ${recipe.name}!`, "info");

    if (this.state.currentView === "kitchen") this.renderKitchenView();
  }

  dragStart(event, instanceId) {
    /* ... */
  }

  dragOver(event, stoveIndex) {
    /* ... */
  }

  dragLeave(event, stoveIndex) {
    /* ... */
  }

  dropOnStove(event, stoveIndex) {
    /* ... */
  }

  finishCooking(stoveIndex) {
    const stove = this.state.stoves[stoveIndex];

    if (!stove || !stove.cooking) return;

    const recipe = stove.recipe;

    stove.cooking = false;

    stove.timeLeft = 0;

    stove.recipe = null;

    // Add to completed dishes and calculate reward

    this.state.completedDishes.push({
      recipe: recipe,

      completedAt: Date.now(),
    });

    const reward = 20000 + this.state.completedDishes.length * 5000; // bonus for more dishes

    this.state.money += reward;

    this.playSound("success");

    this.showNotification(
      `Finished cooking ${recipe.name}! Earned ${this.formatVND(reward)}.`,

      "success"
    );

    this.updateStatus();

    // re-render kitchen to show updated stove/inventory

    if (this.state.currentView === "kitchen") this.renderKitchenView();
  }

  renderSummary(message) {
    this.elements.content.innerHTML = message;
  }

  showFinalResults() {
    const finalHtml = `

      <div style="text-align:center;padding:20px;">

        <h2>🎉 Game Complete! 🎉</h2>

        <div style="margin:20px 0;">

          <p>Final Score: ${100 - this.state.score}%</p>

          <p>Final Budget: ${this.formatVND(this.state.money)}</p>

        </div>

        <button class="action-button" onclick="window.game = new ZeroWasteGame()">Play Again</button>

      </div>

    `;

    this.elements.content.innerHTML = finalHtml;

    this.elements.actionButton.classList.add("hidden");
  }

  formatVND(amount) {
    return amount.toLocaleString("vi-VN") + " VND";
  }

  showNotification(message, type = "info") {
    /* ... */
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.game = new ZeroWasteGame();
});
