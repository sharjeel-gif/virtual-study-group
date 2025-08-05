// watch.js
function updateNavbarWatch() {
  const watch = document.createElement("div");
  watch.className = "cylinder-watch";

  const updateTime = () => {
    const now = new Date();

    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    const options = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    };
    const date = now.toLocaleDateString("en-US", options);

    watch.innerHTML = `<strong>${time}</strong><br>${date}`;
  };

  updateTime();
  setInterval(updateTime, 1000);

  const container = document.getElementById("navbarWatch");
  if (container) {
    container.innerHTML = ""; // Clear any previous
    container.appendChild(watch);
  }
}

document.addEventListener("DOMContentLoaded", updateNavbarWatch);
