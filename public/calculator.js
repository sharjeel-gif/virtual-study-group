
  const openCalculatorBtn = document.getElementById("openCalculatorBtn");
  const calculatorModal = document.getElementById("calculatorModal");
  const closeCalculatorBtn = document.getElementById("closeCalculatorBtn");
  const calcDisplay = document.getElementById("calcDisplay");
  const calcButtons = document.getElementById("calcButtons");

  const buttons = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "C", "0", "=", "+"
  ];

  calcDisplay.value = "0";

  buttons.forEach(text => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      padding: 18px;
      font-size: 1.4rem;
      background: #222;
      color: #0ff;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      outline: 2px solid #0ff;
      outline-offset: 3px;
      transition: 0.2s;
      box-shadow: 0 0 10px rgba(0,255,255,0.4);
    `;
    btn.onmouseover = () => btn.style.background = "#333";
    btn.onmouseleave = () => btn.style.background = "#222";
    btn.onmousedown = () => btn.style.transform = "scale(0.95)";
    btn.onmouseup = () => btn.style.transform = "scale(1)";

    btn.onclick = () => {
      if (text === "=") {
        try {
          calcDisplay.value = eval(calcDisplay.value);
        } catch {
          calcDisplay.value = "Error";
        }
      } else if (text === "C") {
        if (calcDisplay.value.length > 1) {
          calcDisplay.value = calcDisplay.value.slice(0, -1);
        } else {
          calcDisplay.value = "0";
        }
      } else {
        if (calcDisplay.value === "0" && !isNaN(text)) {
          calcDisplay.value = text;
        } else {
          calcDisplay.value += text;
        }
      }
    };

    calcButtons.appendChild(btn);
  });

  openCalculatorBtn.onclick = () => {
    calculatorModal.style.display = "block";
    if (!calcDisplay.value || calcDisplay.value === "") {
      calcDisplay.value = "0";
    }
  };

  closeCalculatorBtn.onclick = () => calculatorModal.style.display = "none";

  // ✅ Make calculator modal draggable
  let isDraggingCalc = false;
let offsetCalcX, offsetCalcY;

calculatorModal.addEventListener("mousedown", (e) => {
  // Prevent dragging from buttons or input fields
  if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;

  isDraggingCalc = true;
  const rect = calculatorModal.getBoundingClientRect();
  offsetCalcX = e.clientX - rect.left;
  offsetCalcY = e.clientY - rect.top;

  calculatorModal.style.transition = "none"; // stop animations while dragging
});

document.addEventListener("mousemove", (e) => {
  if (!isDraggingCalc) return;
  calculatorModal.style.left = `${e.clientX - offsetCalcX}px`;
  calculatorModal.style.top = `${e.clientY - offsetCalcY}px`;
  calculatorModal.style.transform = "none";
});

document.addEventListener("mouseup", () => {
  isDraggingCalc = false;
});


