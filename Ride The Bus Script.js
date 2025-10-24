document.addEventListener("DOMContentLoaded", () => {

  // ====== RULES MODAL ======
const rulesBtn = document.getElementById("rulesBtn");
const rulesModal = document.getElementById("rulesModal");
const closeRules = document.getElementById("closeRules");

rulesBtn.addEventListener("click", () => {
  rulesModal.classList.remove("hidden");
});

closeRules.addEventListener("click", () => {
  rulesModal.classList.add("hidden");
});

// Close modal on click outside
rulesModal.addEventListener("click", (e) => {
  if(e.target === rulesModal) rulesModal.classList.add("hidden");
});

  // ====== DOM ELEMENTS ======
  const betSlider = document.getElementById("betSlider");
  const betAmountDisplay = document.getElementById("betAmount");
  const moneyDisplay = document.getElementById("money");
  const suitButtonsContainer = document.getElementById("suit-buttons");

  // ====== GAME STATE ======
  let currentCardT1 = null;
  let currentCardT2 = null;
  let deck = [];
  let money = parseInt(localStorage.getItem("money")) || 100;
  moneyDisplay.textContent = money;


  let currentBet = money;
  let betLocked = false;

  const multipliers = {
    color: 1.5,
    highLow: 2,
    inOut: 4,
    suit: 200
  };

  // ====== INITIAL SETUP ======
  deck = buildDeck();
  betAmountDisplay.textContent = currentBet;

  betSlider.addEventListener("input", () => {
    if (!betLocked) {
      currentBet = parseInt(betSlider.value);
      betAmountDisplay.textContent = currentBet;
      betSlider.max = money;
    } else {
      betSlider.max = currentBet;
    }
  });

  // ====== UTILITY FUNCTIONS ======
  function buildDeck() {
    const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
    const suits = ["Hearts", "Diamonds", "Spades", "Clubs"];
    const cards = [];
    for (let suit of suits) {
      for (let value of values) {
        const color = (suit === "Spades" || suit === "Clubs") ? "black" : "red";
        cards.push({ value, suit, color });
      }
    }
    return cards;
  }

  function drawCard() {
    if (!deck.length) deck = buildDeck();
    const index = Math.floor(Math.random() * deck.length);
    return deck.splice(index, 1)[0];
  }

  // ====== MONEY HANDLING ======
  function updateMoney(amount) {
    money += amount;
    if (money < 0) money = 10; // Safety reimbursement
    moneyDisplay.textContent = money;
    localStorage.setItem("money", money);

    betSlider.max = money;
    if (currentBet > money) {
      currentBet = money;
      betSlider.value = currentBet;
      betAmountDisplay.textContent = currentBet;
    }
  }

  function toggleButtons(ids, show) {
    ids.forEach(id => document.getElementById(id)?.classList.toggle('hidden', !show));
  }

  function showOverlay(message, color, duration=2000) {
    const overlay = document.getElementById("overlay");
    const text = document.getElementById("overlay-text");
    text.textContent = message;
    text.style.color = color;
    overlay.classList.add("visible");
    setTimeout(() => overlay.classList.remove("visible"), duration);
  }

  // ====== CARD CANVAS DISPLAY ======
  function showCardCanvas(card) {
    let historyContainer = document.getElementById("cardHistoryContainer");
    if (!historyContainer) {
      historyContainer = document.createElement("div");
      historyContainer.id = "cardHistoryContainer";
      historyContainer.style.position = "fixed";
      historyContainer.style.top = "10px";
      historyContainer.style.left = "10px";
      historyContainer.style.display = "flex";
      historyContainer.style.gap = "10px";
      historyContainer.style.zIndex = "1500";
      document.body.appendChild(historyContainer);
    }

    const canvasWrapper = document.createElement("div");
    canvasWrapper.style.width = "100px";
    canvasWrapper.style.height = "150px";
    canvasWrapper.style.perspective = "800px";
    canvasWrapper.style.display = "inline-block";

    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 150;
    canvasWrapper.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    // Draw backside
    ctx.fillStyle = "#333";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = "black";
    ctx.strokeRect(0,0,canvas.width,canvas.height);

    historyContainer.appendChild(canvasWrapper);

    // Flip animation
    canvasWrapper.style.transform = "rotateY(180deg)";
    canvasWrapper.style.transition = "transform 0.6s";

    setTimeout(() => {
      canvasWrapper.style.transform = "rotateY(0deg)";

      // Draw front
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "black";
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = card.color === "red" ? "red" : "black";
      ctx.font = "20px Arial";
      ctx.fillText(card.value, 10, 30);

      const symbols = {Hearts:"♥", Diamonds:"♦", Spades:"♠", Clubs:"♣"};
      ctx.fillText(symbols[card.suit], 60, 120);
    }, 100);

    const cards = historyContainer.querySelectorAll("#cardHistoryContainer > div");
    if(cards.length > 15) cards[0].remove();
  }
  
  // ====== GAME FLOW ======
  // helper to set rule text (and optionally hide it)
  function setRule(text) {
    if (!ruleText) return;
    if (!text) {
      ruleText.classList.add('hidden');
      ruleText.textContent = '';
    } else {
      ruleText.classList.remove('hidden');
      ruleText.textContent = text;
    }
  }

  // ====== GAME FLOW ======
  function handleWin(amount) {
    updateMoney(amount);
    showOverlay(`✅ You won $${amount}! Keep going!`, "lightgreen", 1500);
    // rule remains the same until the next action triggers a step change
  }

  function handleLoss() {
    showOverlay(`💥 You lost $${currentBet}! 💥`, "red", 2000);
    updateMoney(-currentBet);
    toggleButtons(["CG1","CG2","h","l","in","out","Hearts","Diamonds","Spades","Clubs"], false);
    suitButtonsContainer.classList.add("hidden");
    // clear rule because game will reset
    setRule('');
    setTimeout(restartGame, 2000);
  }


  function handleVictory() {
    showOverlay(`🎉 YOU WIN THE GAME! 🎉`, "gold", 3000);
    launchConfetti(1000);
    toggleButtons(["CG1","CG2","h","l","in","out","Hearts","Diamonds","Spades","Clubs"], false);
    suitButtonsContainer.classList.add("hidden");
    setTimeout(restartGame, 3000);
  }

  function launchConfetti(count=1000) {
    const container = document.getElementById("confetti-container") || document.body;
    for (let i = 0; i < count; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.backgroundColor = `hsl(${Math.random()*360},100%,50%)`;
      c.style.animationDuration = (Math.random()*3+2)+"s";
      c.style.width=c.style.height=(Math.random()*8+5)+"px";
      container.appendChild(c);
      c.addEventListener("animationend",()=>c.remove());
    }
  }

  function showResultText(text, color) {
    const cardTextEl = document.getElementById("cardText");
    if (cardTextEl) {
      cardTextEl.textContent = text;
      cardTextEl.style.color = color;
    }
  }

  // ====== GAME STAGES ======
  function ColorRB(buttonId) {
    if (!currentCardT1) currentCardT1 = drawCard();
    showCardCanvas(currentCardT1);
    betLocked = true;

    const correct = (currentCardT1.color === "black" && buttonId==="CG1") ||
                    (currentCardT1.color === "red" && buttonId==="CG2");
    const potentialWin = Math.floor(currentBet * multipliers.color);

    if(correct) {
      handleWin(potentialWin);
      toggleButtons(["CG1","CG2"], false);
      toggleButtons(["h","l"], true);
      // advance to next rule
      setRule('Step 2 — Higher or Lower: Guess if the next card is higher or lower.');
      currentCardT2 = drawCard();
    } else handleLoss();
  }

  function higherOrLower(guess) {
    if (!currentCardT1) return;
    if (!currentCardT2) currentCardT2 = drawCard();
    showCardCanvas(currentCardT2);

    const values = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};
    const c1 = values[currentCardT1.value];
    const c2 = values[currentCardT2.value];
    const potentialWin = Math.floor(currentBet * multipliers.highLow);

    const correct = (guess==="higher" && c2>c1) || (guess==="lower" && c2<c1);

    toggleButtons(["h","l"], false);
    toggleButtons(["in","out"], true);

    if(correct) {
      handleWin(potentialWin);
      // next rule
      setRule('Step 3 — In Between or Outside: Will the next card be in between the previous two or outside them?');
    } else handleLoss();
  }

  function inBetweenOrOutside(choice) {
    if (!currentCardT1 || !currentCardT2) return;
    const values = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};
    const c1 = values[currentCardT1.value];
    const c2 = values[currentCardT2.value];
    const card3 = drawCard();
    showCardCanvas(card3);
    const c3 = values[card3.value];
    const low = Math.min(c1,c2), high = Math.max(c1,c2);
    const potentialWin = Math.floor(currentBet * multipliers.inOut);

    const correct = (choice==="in" && c3>low && c3<high) ||
                    (choice==="out" && (c3<low || c3>high));

    toggleButtons(["in","out"], false);
    if(correct) {
      handleWin(potentialWin);
    } else {
      handleLoss();
      return;
    }

    // Show suit buttons and set rule for last step
    suitButtonsContainer.classList.remove("hidden");
    toggleButtons(["Hearts","Diamonds","Spades","Clubs"], true);
    setRule('Step 4 — Guess the Suit: Choose the suit of the next card.');
  }

  function guessSuit(suit) {
    const card4 = drawCard();
    if (!card4) return;
    showCardCanvas(card4);
    const correct = card4.suit === suit;
    const potentialWin = Math.floor(currentBet * multipliers.suit);

    toggleButtons(["Hearts","Diamonds","Spades","Clubs"], false);
    suitButtonsContainer.classList.add("hidden");

    if(correct) {
      updateMoney(potentialWin);
      handleVictory();
    } else handleLoss();

    // After final step, clear rule (either victory or loss will restart)
    setRule('');
  }

  // ====== RESTART GAME ======
  function restartGame() {
    currentCardT1 = null;
    currentCardT2 = null;
    deck = buildDeck();
    betLocked = false;

    money = parseInt(localStorage.getItem("money")) || 100;
    moneyDisplay.textContent = money;
    
    betSlider.max = money;
    if (currentBet > money) {
      currentBet = money;
      betSlider.value = currentBet;
    } 
    if (currentBet < 1) {
      currentBet = 100;
    }
    betAmountDisplay.textContent = currentBet;

    toggleButtons(["CG1","CG2"], true);
    toggleButtons(["h","l","in","out"], false);
    toggleButtons(["Hearts","Diamonds","Spades","Clubs"], false);
    suitButtonsContainer.classList.add("hidden");

    const historyContainer = document.getElementById("cardHistoryContainer");
    if (historyContainer) historyContainer.innerHTML = "";

    showResultText("Draw a card to start! Black or red?", "white");
  }
  // ====== RESTART BUTTON (force money refresh too) ======
  document.getElementById("restartBtn")?.addEventListener("click", () => {
    money = parseInt(localStorage.getItem("money")) || 100;
    moneyDisplay.textContent = money;

    betSlider.max = money;
    if (currentBet > money) {
      currentBet = money;
      betSlider.value = currentBet;
    }
    betAmountDisplay.textContent = currentBet;

    restartGame();
  });

  // ====== EXPORT FUNCTIONS ======
  window.ColorRB = ColorRB;
  window.higherOrLower = higherOrLower;
  window.inBetweenOrOutside = inBetweenOrOutside;
  window.guessSuit = guessSuit;
  window.restartGame = restartGame;
});
