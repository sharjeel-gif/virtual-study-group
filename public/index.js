
  const socket = io();
  let roomId = "", userName = "", jitsiApi = null;
  let selectedMessageDiv = null;
  let selectedMessageData = null;
  
  async function translateMessage(text, targetLang) {
    try {
      const res = await fetch("/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang })
      });
      const data = await res.json();
      return data.translatedText || text;
    } catch {
      return text;
    }
  }


  
    // When server sends updated reaction data

  socket.on("updateReaction", ({ messageId, reactions }) => {
    const msgBubble = document.querySelector(`[data-id="${messageId}"] .bubble`);
    if (!msgBubble) return;

    // Remove old counts but NOT the emoji bar
    const oldCounts = msgBubble.querySelector(".reaction-counts");
    if (oldCounts) oldCounts.remove();

    // Show updated reaction counts
    const countsDiv = document.createElement("div");
    countsDiv.className = "reaction-counts";
    countsDiv.style.marginTop = "4px";
    countsDiv.style.fontSize = "12px";
    countsDiv.style.color = "#ccc";

    for (const [emoji, users] of Object.entries(reactions)) {
        if (users.length > 0) {
            const span = document.createElement("span");
            span.textContent = `${emoji} ${users.length}`;
            span.style.marginRight = "8px";
            countsDiv.appendChild(span);
        }
    }

    if (countsDiv.children.length > 0) {
        msgBubble.appendChild(countsDiv);
    }
});




  socket.on("updateSeen", ({ messageId, seenBy }) => {
  // Remove all old seen labels
  document.querySelectorAll(".seen-label").forEach(el => el.remove());

  // Find the message DOM element by id
  const msgEl = document.querySelector(`.msg[data-id="${messageId}"]`);
  if (!msgEl) return;

  // Exclude yourself from list
  const others = seenBy.filter(name => name !== userName);
  if (others.length > 0) {
    const seenMark = document.createElement("div");
    seenMark.className = "seen-label";
    seenMark.textContent = `Seen by: ${others.join(", ")}`;
    msgEl.querySelector(".bubble").appendChild(seenMark);
  }
});

// 1. Join Button Click 
document.getElementById("startBtn").onclick = async () => {
  userName = document.getElementById("userName").value.trim();
  const groupName = document.getElementById("roomName").value.trim();
  const groupCode = document.getElementById("groupCode").value.trim();

  if (!userName || !groupName || !groupCode) {
    return alert("Please fill all fields.");
  }

  try {
    const res = await fetch("/join-group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, groupName, groupCode }),
    });

    const data = await res.json();
    if (data.success) {
      roomId = groupName; // ✅ Save globally for message sending
      socket.emit("joinGroup", { userName, group: groupName });
      document.getElementById("videoCallBtn").disabled = false; // ✅ enable video button
    } else {
      alert("❌ Join failed: " + data.error);
    }
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error joining group.");
  }
};

// 2. Response from Server after joining group
socket.on("joinGroup", () => {
  console.log("✅ Successfully joined group");

  // Mark as joined
  document.getElementById("startBtn").innerText = "Joined";
  document.getElementById("startBtn").disabled = true;

  // Make inputs read-only
  document.getElementById("roomName").readOnly = true;
  document.getElementById("groupCode").readOnly = true;

  // Optional feedback in chat
  document.getElementById("chatArea").innerHTML += `
    <div class="msg other"><em>✅ Joined group successfully</em></div>`;

  // 🔒 Save session info
  const roomName = document.getElementById("roomName").value.trim();
  const groupCode = document.getElementById("groupCode").value.trim();
  localStorage.setItem("chatSession", JSON.stringify({ userName, roomName, groupCode }));
});

// 3. Send Message Button
document.getElementById("sendBtn").onclick = () => {
  const msg = document.getElementById("msgInput").value.trim();
  if (!msg) return;

  if (!roomId || !userName) {
    alert("Join a group first.");
    return;
  }

  // Emit plain text message
  socket.emit("groupMessage", {
    group: roomId,
    sender: userName,
    message: msg,
    type: "text",
    timestamp: new Date()
  });

  document.getElementById("msgInput").value = "";
};

document.getElementById("uploadBtn").onclick = async () => {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) return alert("Select a file first!");

  if (!roomId || !userName) {
    alert("Join a group first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("sender", userName);
  formData.append("group", roomId);

  try {
    const res = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) throw new Error("Upload failed");

    // Send via socket just like a text message
    socket.emit("groupMessage", {
  group: roomId,
  sender: userName,
  isFile: true,
  fileType: data.fileType,
  fileName: data.fileName,   
  message: data.fileUrl
});

     fileInput.value = ""; // Clear input
  } catch (err) {
    console.error("❌ Upload error:", err);
    alert("Upload failed.");
  }
};

// EXIT BUTTON
document.getElementById("exitBtn").onclick = () => {
  if (!roomId || !userName) return;

  if (jitsiApi) {
    jitsiApi.dispose();
    jitsiApi = null;
  }

  const videoModal = document.getElementById("videoModal");
  if (videoModal) videoModal.classList.add("hidden");

  const videoContainer = document.getElementById("video-container");
  if (videoContainer) videoContainer.innerHTML = "";

  socket.emit("leave", { group: roomId, user: userName });

  roomId = null;
  document.getElementById("chatArea").innerHTML = "";
  document.getElementById("groupInput").value = "";

  document.getElementById("videoCallBtn").disabled = true;

  alert("You have left the group.");
};



socket.on("groupMessage", async data => {
    if (!roomId || data.group !== roomId) return;

    // 🎯 Detect voice messages first
    const audioExts = ["webm", "mp3", "wav", "ogg"];
    const ext = (data.message || "").split(".").pop().toLowerCase();
    if (audioExts.includes(ext)) {
        data.isVoice = true;
        data.isFile = true;
        data.fileType = "audio/" + ext;
    }

    // 🔹 Auto-detect other uploaded files (skip if voice)
    if (!data.isFile && typeof data.message === "string" && data.message.startsWith("/uploads/")) {
        data.isFile = true;
        const ext = data.message.split(".").pop().toLowerCase();
        if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
            data.fileType = "image/" + ext;
        } else {
            data.fileType = "application/octet-stream";
        }
    }

    const targetLang = document.getElementById("languageSelect").value;
    const chatArea = document.getElementById("chatArea");

    const div = document.createElement("div");
    div.className = "msg " + (data.sender === userName ? "self" : "other");
    div.dataset.id = data._id;
    div.style.position = "relative";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // ✅ Sender Name
    const nameSpan = document.createElement("div");
    nameSpan.className = "sender-name";
    nameSpan.textContent = data.sender === userName ? "You" : data.sender;
    bubble.appendChild(nameSpan);

    // 🎙 Voice Message
    if (data.isVoice) {
    const audio = document.createElement("audio");
    audio.src = data.message;
    audio.controls = true;

    const speedBtn = document.createElement("button");
    speedBtn.textContent = "1x";
    speedBtn.className = "btn btn-outline-secondary btn-sm ms-2";
    const speeds = [1, 1.5, 2];
    let i = 0;
    speedBtn.onclick = () => {
        i = (i + 1) % speeds.length;
        audio.playbackRate = speeds[i];
        speedBtn.textContent = speeds[i] + "x";
    };

    bubble.appendChild(audio);
    bubble.appendChild(speedBtn);
}


    // ✅ File Message
    if (data.isFile && !data.isVoice) {
        if (data.fileType && data.fileType.startsWith("image/")) {
            // Image preview
            const img = document.createElement("img");
            img.src = data.message;
            img.className = "chat-img";
            bubble.appendChild(img);
        } else {
            // File download link
            const fileBtn = document.createElement("a");
            fileBtn.href = data.message;
            fileBtn.target = "_blank";
            fileBtn.download = data.fileName || "";
            fileBtn.textContent = `📎 ${data.fileName || "Download File"}`;
            fileBtn.className = "download-btn";
            bubble.appendChild(fileBtn);
        }
    }
     
  // ✅ Normal Text Message
  if (!data.isFile && !data.isVoice && typeof data.message === "string" && data.message.trim() !== "") {
  const msgText = document.createElement("div");
  msgText.className = "msg-text";
  msgText.textContent = data.message;
  bubble.appendChild(msgText);
}


  // 🕒 Timestamp
  const time = document.createElement("span");
  time.className = "bubble-time";
  const messageTime = new Date(data.timestamp);
  time.textContent = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bubble.appendChild(time);

  // 🌐 Translate Button (only for text from others)
  if (!data.isFile && data.sender !== userName && typeof data.message === "string" && data.message.trim() !== "") {
  const btn = document.createElement("button");
  btn.textContent = "🌐 Translate";
  btn.className = "translate-btn";
  btn.onclick = async () => {
    const translated = await translateMessage(data.message, targetLang);
    btn.replaceWith(document.createTextNode(" → " + translated));
  };
  bubble.appendChild(btn);
}


  // ✏️ Edited Mark
  if (data.edited) {
    const editedMark = document.createElement("i");
    editedMark.textContent = "(edited)";
    editedMark.style.fontSize = "10px";
    editedMark.style.color = "gray";
    bubble.appendChild(editedMark);
  }

  // ✅ Seen By
  if (data.isLastSeenByOthers && Array.isArray(data.seenBy)) {
    const others = data.seenBy.filter(name => name !== data.sender);
    if (others.length > 0) {
      const seenMark = document.createElement("div");
      seenMark.className = "seen-label";
      seenMark.textContent = "Seen by: " + others.join(", ");
      bubble.appendChild(seenMark);
    }
  }

  


  // ✅ Select for top action bar
  div.onclick = (e) => {
    e.stopPropagation();
    if (selectedMessageDiv === div) {
      selectedMessageDiv.classList.remove("selected-msg");
      selectedMessageDiv = null;
      selectedMessageData = null;
      document.getElementById("topActionBar").style.display = "none";
    } else {
      if (selectedMessageDiv) selectedMessageDiv.classList.remove("selected-msg");
      selectedMessageDiv = div;
      selectedMessageData = data;
      div.classList.add("selected-msg");
      document.getElementById("topActionBar").style.display = "flex";
      document.getElementById("moreOptions").style.display = "none";
    }
  };

  

        // ❤️ Emoji Reaction Bar
function addReactionBar(msgDiv, messageId, reactions = {}) {
  // Remove old bar if exists
  const oldBar = msgDiv.querySelector(".reaction-bar");
  if (oldBar) oldBar.remove();

  // Create new bar
  const bar = document.createElement("div");
  bar.className = "reaction-bar"; // Will still be hidden until hover (CSS handles this)

  ["👍", "❤️", "😂", "😢", "😡"].forEach(emoji => {
    const btn = document.createElement("span");

    // Show count if exists
    const count = reactions[emoji] ? reactions[emoji].length : 0;
    btn.textContent = count > 0 ? `${emoji} ${count}` : emoji;
    btn.style.cursor = "pointer";

    // Click handler — only one emoji reaction per user
    btn.onclick = () => {
      // If already reacted with THIS emoji → remove
      if (reactions[emoji] && reactions[emoji].includes(userName)) {
        socket.emit("reactMessage", { messageId, emoji, userName, group: roomId });
        return;
      }

      // Remove previous emoji reaction by this user
      for (let e of Object.keys(reactions)) {
        if (reactions[e] && reactions[e].includes(userName)) {
          socket.emit("reactMessage", { messageId, emoji: e, userName, group: roomId });
        }
      }

      // Add the new one
      socket.emit("reactMessage", { messageId, emoji, userName, group: roomId });
    };

    bar.appendChild(btn);
  });

  msgDiv.appendChild(bar);
}

// When server sends updated reactions
socket.on("updateReaction", ({ messageId, reactions }) => {
  const msgDiv = document.querySelector(`[data-id="${messageId}"]`);
  if (!msgDiv) return;

  // Rebuild reaction bar with updated counts
  addReactionBar(msgDiv, messageId, reactions);
});

// When creating a new message bubble
addReactionBar(bubble, data._id, data.reactions || {});
div.appendChild(bubble);
chatArea.appendChild(div);
chatArea.scrollTop = chatArea.scrollHeight;

// Emit seen status
socket.emit("markSeen", { group: roomId, userName });

});

  socket.on("typing", data => {
    if (data.group === roomId && data.sender !== userName) {
      document.getElementById("typing").textContent = `${data.sender} is typing...`;
      setTimeout(() => { document.getElementById("typing").textContent = ""; }, 2000);
    }
  });

  socket.on("onlineUsers", users => {
    const ul = document.getElementById("onlineUsers");
    ul.innerHTML = "";
    users.forEach(u => {
      const li = document.createElement("li");
      li.textContent = u;
      ul.appendChild(li);
    });
  });

document.getElementById("videoCallBtn").onclick = () => {
  if (!userName || !roomId) {
    alert("Join group first.");
    return;
  }

  const videoContainer = document.getElementById("video-container");
  videoContainer.innerHTML = ""; // Clear previous video call

  const domain = "meet.jit.si";
  const options = {
    roomName: "study-room-" + roomId,
    width: "100%",
    height: 400,
    parentNode: videoContainer,
    userInfo: {
      displayName: userName
    }
  };

  try {
    if (jitsiApi) jitsiApi.dispose();
    jitsiApi = new JitsiMeetExternalAPI(domain, options);
  } catch (error) {
    console.error("❌ Jitsi load failed:", error);
    alert("Failed to start video call. Check internet or firewall.");
  }
};

    // ===============================
// 🎙 Voice Message Recording
// ===============================
let mediaRecorder; 
let audioChunks = [];
let stream;
let isRecording = false;
let recordingTimer = null;
let seconds = 0;

const micBtn = document.getElementById("micBtn");
const chatArea = document.getElementById("chatArea");

const stopBtn = document.createElement("button");
stopBtn.innerHTML = "⏹️ Stop";
stopBtn.className = "btn btn-danger btn-sm";
stopBtn.style.marginLeft = "10px";

const timerDisplay = document.createElement("span");
timerDisplay.style.marginLeft = "10px";
timerDisplay.style.fontSize = "13px";

micBtn.onclick = async () => {
  if (isRecording) return;

  
  audioChunks = [];
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    seconds = 0;
    timerDisplay.textContent = "⏱ 0s";
    recordingTimer = setInterval(() => {
      seconds++;
      timerDisplay.textContent = `⏱ ${seconds}s`;
    }, 1000);

    micBtn.after(stopBtn);
    micBtn.after(timerDisplay);

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      clearInterval(recordingTimer);
      timerDisplay.remove();
      stopBtn.remove();
      isRecording = false;

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }

      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);

      const previewDiv = document.createElement("div");
      previewDiv.className = "voice-preview";
      previewDiv.style.margin = "10px 0";

      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = url;

      const speedBtn = document.createElement("button");
      speedBtn.textContent = "1x";
      speedBtn.className = "btn btn-outline-secondary btn-sm ms-2";
      const speeds = [1, 1.5, 2];
      let i = 0;
      speedBtn.onclick = () => {
        i = (i + 1) % speeds.length;
        audio.playbackRate = speeds[i];
        speedBtn.textContent = speeds[i] + "x";
      };

      const sendBtn = document.createElement("button");
      sendBtn.textContent = "✅ Send";
      sendBtn.className = "btn btn-success btn-sm ms-2";
      sendBtn.onclick = () => {
        const uniqueName = "voice_" + Date.now() + ".webm"; // ✅ unique name
        const formData = new FormData();
        formData.append("file", blob, uniqueName);

        fetch("/upload", { method: "POST", body: formData })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              socket.emit("groupMessage", {
                group: roomId,
                sender: userName,
                message: data.fileUrl,
                fileType: "audio/webm",
                isVoice: true,
                timestamp: new Date()
              });
              previewDiv.remove();
            } else {
              alert("❌ Voice upload failed.");
            }
          })
          .catch(err => {
            console.error("Upload error:", err);
            alert("❌ Voice upload failed.");
          });
      };

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "❌";
      cancelBtn.className = "btn btn-danger btn-sm ms-2";
      cancelBtn.onclick = () => previewDiv.remove();

      previewDiv.appendChild(audio);
      previewDiv.appendChild(speedBtn);
      previewDiv.appendChild(sendBtn);
      previewDiv.appendChild(cancelBtn);
      chatArea.appendChild(previewDiv);
    };

    audioChunks = []; // ✅ extra safety
    mediaRecorder.start();
    isRecording = true;

    stopBtn.onclick = () => {
      if (isRecording) mediaRecorder.stop();
    };

  } catch (err) {
    alert("Mic error: " + err.message);
  }
};


document.addEventListener("DOMContentLoaded", () => {
  const notifBtn = document.getElementById("notifBtn");
  const notifDropdown = document.getElementById("notifDropdown");

  notifBtn.addEventListener("click", () => {
    notifDropdown.style.display = 
      notifDropdown.style.display === "block" ? "none" : "block";
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
      notifDropdown.style.display = "none";
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("profileToggle");
  const panel = document.getElementById("profilePanel");

  if (!toggle || !panel) return; // Safety check

  toggle.addEventListener("click", () => {
    if (panel.classList.contains("open")) {
      panel.classList.remove("open");
      panel.classList.add("closing");
      panel.addEventListener("animationend", function handler() {
        panel.style.display = "none";
        panel.classList.remove("closing");
        panel.removeEventListener("animationend", handler);
      });
    } else {
      panel.style.display = "block";
      requestAnimationFrame(() => panel.classList.add("open"));
    }
  });

  // Load actual logged-in user data
  fetch("/api/user")
    .then(res => res.json())
    .then(data => {
      if (data.name) {
        document.getElementById("profileName").innerText = data.name;
        document.getElementById("profileEmail").innerText = data.email;
        document.getElementById("profileToggle").src = data.picture || "/default-avatar.png";
        document.getElementById("profilePicBig").src = data.picture || "/default-avatar.png";
      }
    })
    .catch(err => console.error("User not logged in:", err));
});


  document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("todoPanel");
  const toggleBtn = document.getElementById("todoToggleBtn");
  const closeBtn = document.getElementById("closeTodo");
  const header = document.getElementById("todoHeader");
  const todoInput = document.getElementById("todoInput");
  const todoItems = document.getElementById("todoItems");

  // === Add task on Enter ===
  todoInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      const task = e.target.value.trim();
      if (task) {
        socket.emit("addTodo", { group: roomId, task });
        e.target.value = "";
      }
    }
  };

  // === Receive and display task ===
  socket.on("addTodo", (data) => {
    if (data.group === roomId) {
      const li = document.createElement("li");

      // Task text
      const span = document.createElement("span");
      span.textContent = data.task;

      // ❌ Remove button
      const removeBtn = document.createElement("button");
      removeBtn.innerHTML = "&#10006;"; // X
      removeBtn.classList.add("remove-task");

      // Prevent closing panel on remove
      removeBtn.onclick = (e) => {
        e.stopPropagation(); // Stop event from bubbling
        socket.emit("removeTodo", { group: roomId, task: data.task });
        li.remove();
      };

      li.appendChild(span);
      li.appendChild(removeBtn);
      todoItems.appendChild(li);
    }
  });

  // === Remove task when received from server ===
  socket.on("removeTodo", (data) => {
    if (data.group === roomId) {
      const items = document.querySelectorAll("#todoItems li");
      items.forEach((li) => {
        const text = li.querySelector("span")?.textContent;
        if (text === data.task) li.remove();
      });
    }
  });

  // === Toggle To-Do Panel ===
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // So clicking button doesn’t trigger outside-close
    panel.classList.add("show");
  });

  // === Close Panel ===
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.remove("show");
  });


  // === Prevent closing if clicking inside panel ===
  panel.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // === Draggable functionality ===
  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    panel.style.transition = "none"; // Disable transition while dragging
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
      panel.style.transform = "translate(0, 0)";
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    panel.style.transition = ""; // Restore transition
  });
});

    

// 🔁 Utility: Hide Top Action Bar
function hideTopActionBar() {
  document.getElementById("topActionBar").style.display = "none";
  document.getElementById("moreOptions").style.display = "none";
  selectedMessageDiv = null;
  selectedMessageData = null;
}

// ✅ Reply button
document.getElementById("replyBtn").onclick = () => {
  if (selectedMessageData) {
    alert("Reply to: " + selectedMessageData.message);
    // Implement your reply logic here (like prefill input box, etc.)
  }
};

// ✅ Copy button
document.getElementById("copyBtn").onclick = () => {
  if (selectedMessageData) {
    navigator.clipboard.writeText(selectedMessageData.message)
      .then(() => alert("Message copied!"))
      .catch(err => alert("Copy failed: " + err));
  }
};

// ✅ Delete button
document.getElementById("deleteBtn").onclick = () => {
  if (selectedMessageData) {
    socket.emit("deleteMessage", {
      group: roomId,
      timestamp: selectedMessageData.timestamp,
    });
    hideTopActionBar();
  }
};

// ✅ More Options toggle
document.getElementById("moreOptionsBtn").onclick = (e) => {
  e.stopPropagation(); // Prevent bubbling
  const box = document.getElementById("moreOptions");
  box.style.display = (box.style.display === "block") ? "none" : "block";
};

// ✅ Pin message
document.getElementById("pinMsgBtn").onclick = () => {
  if (selectedMessageData) {
    socket.emit("pinMessage", {
      group: roomId,
      sender: userName,
      message: selectedMessageData.message,
      timestamp: selectedMessageData.timestamp || new Date().toISOString(),
    });
    document.getElementById("moreOptions").style.display = "none";
  }
};

// ✅ Message details
document.getElementById("detailMsgBtn").onclick = () => {
  if (selectedMessageData) {
    alert(`Message: ${selectedMessageData.message}\nTime: ${selectedMessageData.timestamp || "Unknown"}`);
    document.getElementById("moreOptions").style.display = "none";
  }
};

// ✅ Message click handler
function handleMessageClick(div, data) {
  if (selectedMessageDiv === div) {
    div.classList.remove("selected-msg");
    hideTopActionBar();
  } else {
    if (selectedMessageDiv) selectedMessageDiv.classList.remove("selected-msg");

    selectedMessageDiv = div;
    selectedMessageData = data;
    div.classList.add("selected-msg");
    document.getElementById("topActionBar").style.display = "flex";
    document.getElementById("moreOptions").style.display = "none";
  }


};
     