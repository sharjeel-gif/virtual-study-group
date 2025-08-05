document.addEventListener("DOMContentLoaded", () => {
  const openNotepadBtn = document.getElementById("openNotepadBtn");
  const notepadModal = document.getElementById("notepadModal");
  const closeNotepadBtn = document.getElementById("closeNotepadBtn");
  const notepadHeader = document.getElementById("notepadHeader");
  const noteArea = document.getElementById("noteArea");
  const copyBtn = document.getElementById("copyNoteBtn");
  const saveBtn = document.getElementById("saveNoteBtn");
  const openBtn = document.getElementById("openNoteBtn");
  const tooltip = document.getElementById("noteTooltip");
  const saveBox = document.getElementById("saveFileBox");
  const fileNameInput = document.getElementById("fileNameInput");
  const confirmSaveBtn = document.getElementById("confirmSaveBtn");

  if (!openNotepadBtn || !notepadModal) return;

  // ✅ Open / Close
  openNotepadBtn.addEventListener("click", () => {
    notepadModal.style.display = "block";
  });

  closeNotepadBtn.addEventListener("click", () => {
    notepadModal.style.display = "none";
    saveBox.style.display = "none";
  });

  // ✅ COPY
  copyBtn.addEventListener("click", () => {
    noteArea.select();
    document.execCommand("copy");
    tooltip.style.opacity = 1;
    setTimeout(() => (tooltip.style.opacity = 0), 1200);
  });

  // ✅ OPEN FILE FROM DISK
  openBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => (noteArea.value = reader.result);
      reader.readAsText(file);
    };
    input.click();
  });

  // ✅ Save logic using internal small file name box
  saveBtn.addEventListener("click", () => {
    saveBox.style.display = "flex";
    fileNameInput.focus();
  });

  confirmSaveBtn.addEventListener("click", () => {
    const fileName = fileNameInput.value.trim() || "Untitled.txt";
    const blob = new Blob([noteArea.value], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    // Reset
    fileNameInput.value = "";
    saveBox.style.display = "none";
  });

  // ✅ DRAGGABLE
  // DRAG LOGIC
  
  let isDragging = false, offsetX, offsetY;

notepadHeader.addEventListener("mousedown", (e) => {
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") return;
  isDragging = true;
  const rect = notepadModal.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  notepadModal.style.transition = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  notepadModal.style.left = `${e.clientX - offsetX}px`;
  notepadModal.style.top = `${e.clientY - offsetY}px`;
  notepadModal.style.transform = "none"; // important if you had translate before
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});


  // RESIZE LOGIC
  const resizers = document.querySelectorAll(".resizer");
  let currentResizer;
  let startX, startY, startWidth, startHeight;

  resizers.forEach((resizer) => {
    resizer.addEventListener("mousedown", (e) => {
      currentResizer = resizer;
      startX = e.clientX;
      startY = e.clientY;
      const rect = notepadModal.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    });
  });

  function resize(e) {
    if (!currentResizer) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (currentResizer.classList.contains("bottom-right")) {
      notepadModal.style.width = `${startWidth + dx}px`;
      notepadModal.style.height = `${startHeight + dy}px`;
    } else if (currentResizer.classList.contains("bottom-left")) {
      notepadModal.style.width = `${startWidth - dx}px`;
      notepadModal.style.height = `${startHeight + dy}px`;
      notepadModal.style.left = `${notepadModal.offsetLeft + dx}px`;
    } else if (currentResizer.classList.contains("top-right")) {
      notepadModal.style.width = `${startWidth + dx}px`;
      notepadModal.style.height = `${startHeight - dy}px`;
      notepadModal.style.top = `${notepadModal.offsetTop + dy}px`;
    } else if (currentResizer.classList.contains("top-left")) {
      notepadModal.style.width = `${startWidth - dx}px`;
      notepadModal.style.height = `${startHeight - dy}px`;
      notepadModal.style.top = `${notepadModal.offsetTop + dy}px`;
      notepadModal.style.left = `${notepadModal.offsetLeft + dx}px`;
    }
  }

  function stopResize() {
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResize);
    currentResizer = null;
  }
});