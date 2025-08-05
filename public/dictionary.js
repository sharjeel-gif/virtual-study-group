document.addEventListener("DOMContentLoaded", () => {
  const openDictionaryBtn = document.getElementById("openDictionaryBtn");
  const dictionaryModal = document.getElementById("dictionaryModal");
  const closeDictionaryBtn = document.getElementById("closeDictionaryBtn");

  openDictionaryBtn.onclick = () => {
    dictionaryModal.style.display = "block";
  };

  closeDictionaryBtn.onclick = () => {
    dictionaryModal.style.display = "none";
  };

  document.getElementById("searchBtn").addEventListener("click", async () => {
    const word = document.getElementById("wordInput").value.trim();
    const resultDiv = document.getElementById("dictionaryResult");

    if (!word) return resultDiv.innerHTML = "Please enter a word.";

    try {
      resultDiv.innerHTML = "Loading...";
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await res.json();

      if (data && data[0]) {
        const meanings = data[0].meanings.map(m =>
          `<p><strong>${m.partOfSpeech}:</strong> ${m.definitions[0].definition}</p>`
        ).join('');
        resultDiv.innerHTML = `<h3>${data[0].word}</h3>${meanings}`;
      } else {
        resultDiv.innerHTML = "Word not found.";
      }
    } catch (err) {
      resultDiv.innerHTML = "Error fetching definition.";
    }
  });

  // ✅ Draggable logic
  let isDragging = false, offsetX, offsetY;

  dictionaryModal.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
    isDragging = true;
    const rect = dictionaryModal.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    dictionaryModal.style.transition = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    dictionaryModal.style.left = `${e.clientX - offsetX}px`;
    dictionaryModal.style.top = `${e.clientY - offsetY}px`;
    dictionaryModal.style.transform = "none";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
});
document.getElementById("copyDefinitionBtn").addEventListener("click", () => {
  const resultText = document.getElementById("dictionaryResult").innerText;
  const tooltip = document.getElementById("copyTooltip");

  if (!resultText.trim()) return;

  navigator.clipboard.writeText(resultText).then(() => {
    tooltip.style.display = "inline";
    tooltip.style.opacity = "1";

    setTimeout(() => {
      tooltip.style.opacity = "0";
      setTimeout(() => tooltip.style.display = "none", 300);
    }, 1500); // Tooltip disappears after 1.5 seconds
  });
});
