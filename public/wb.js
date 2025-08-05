const socket = io();
const canvas = document.getElementById("whiteboardCanvas");
const ctx = canvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("sizePicker");
const imageUpload = document.getElementById("imageUpload");

let tool = "pen";
let color = colorPicker.value;
let size = sizePicker.value;
let drawing = false;
let startX = 0, startY = 0;
let lastX = 0, lastY = 0;
let history = [];

// Canvas full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  if (canvas.width > 0 && canvas.height > 0) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.putImageData(img, 0, 0);
  } else {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});


function saveHistory() {
  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (history.length > 50) history.shift();
}

function undo() {
  if (history.length > 0) {
    const imageData = history.pop();
    ctx.putImageData(imageData, 0, 0);
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  history = [];
  socket.emit("clear");
}

function exportImage() {
  const link = document.createElement("a");
  link.download = "whiteboard.png";
  link.href = canvas.toDataURL();
  link.click();
}

// Toolbar buttons
document.getElementById("penBtn").onclick = () => tool = "pen";
document.getElementById("eraserBtn").onclick = () => tool = "eraser";
document.getElementById("highlightBtn").onclick = () => tool = "highlight";
document.getElementById("textBtn").onclick = () => tool = "text";
document.getElementById("lineBtn").onclick = () => tool = "line";
document.getElementById("rectBtn").onclick = () => tool = "rect";
document.getElementById("circleBtn").onclick = () => tool = "circle";
document.getElementById("undoBtn").onclick = undo;
document.getElementById("exportBtn").onclick = exportImage;
document.getElementById("clearBtn").onclick = clearCanvas;

colorPicker.oninput = e => color = e.target.value;
sizePicker.oninput = e => size = e.target.value;

// Mouse Events
canvas.addEventListener("mousedown", e => {
  startX = e.offsetX;
  startY = e.offsetY;
  lastX = startX;
  lastY = startY;
  drawing = true;
  saveHistory();

  if (["pen", "eraser", "highlight"].includes(tool)) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
  } else if (tool === "text") {
    const text = prompt("Enter text:");
    if (text) {
      ctx.font = `${size * 4}px Arial`;
      ctx.fillStyle = color;
      ctx.fillText(text, startX, startY);
    }
    drawing = false;
  }
});

canvas.addEventListener("mousemove", e => {
  if (!drawing || tool === "text") return;

  const x = e.offsetX;
  const y = e.offsetY;

  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
  ctx.globalAlpha = tool === "highlight" ? 0.3 : 1.0;

  if (["pen", "eraser", "highlight"].includes(tool)) {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    socket.emit("draw", {
      tool,
      color,
      size,
      fromX: lastX,
      fromY: lastY,
      x,
      y
    });

    lastX = x;
    lastY = y;
  }
});

canvas.addEventListener("mouseup", e => {
  drawing = false;
  const endX = e.offsetX;
  const endY = e.offsetY;

  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.globalAlpha = 1.0;

  if (tool === "line") {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    socket.emit("shape", { tool, color, size, startX, startY, endX, endY });
  } else if (tool === "rect") {
    ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    socket.emit("shape", { tool, color, size, startX, startY, endX, endY });
  } else if (tool === "circle") {
    const radius = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    ctx.beginPath();
    ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    socket.emit("shape", { tool, color, size, startX, startY, radius });
  }
});

// Image Upload
imageUpload.onchange = function (e) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
};

// Socket Draw Events
socket.on("draw", ({ tool, color, size, fromX, fromY, x, y }) => {
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
  ctx.globalAlpha = tool === "highlight" ? 0.3 : 1.0;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(x, y);
  ctx.stroke();
});

socket.on("shape", data => {
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.size;
  ctx.lineCap = "round";

  if (data.tool === "line") {
    ctx.beginPath();
    ctx.moveTo(data.startX, data.startY);
    ctx.lineTo(data.endX, data.endY);
    ctx.stroke();
  } else if (data.tool === "rect") {
    ctx.strokeRect(data.startX, data.startY, data.endX - data.startX, data.endY - data.startY);
  } else if (data.tool === "circle") {
    ctx.beginPath();
    ctx.arc(data.startX, data.startY, data.radius, 0, 2 * Math.PI);
    ctx.stroke();
  }
});

socket.on("clear", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
