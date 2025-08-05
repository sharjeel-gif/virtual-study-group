// === 1. Required Imports ===
const express = require("express");
const path = require("path");
const User = require("./models/User");
const Message = require("./models/Message");
 // Adjust path if it's not in `models/User.js`
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
//const passport = require("./auth");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
//const http = require("http").createServer();
const app = express();
const server = require("http").createServer(app); // attach your Express app!
const io = require("socket.io")(server);
require("dotenv").config();


const authRoutes = require("./routes/auth");

// === View Engine ===
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// === Middleware ===
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use(session({
  secret: process.env.SESSION_SECRET || "keyboardcat",
  resave: false,
  saveUninitialized: false
}));
//app.use(passport.initialize());
//app.use(passport.session());

const { ensureAuthenticated } = require("./middleware/auth");

app.get("/", ensureAuthenticated, (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// === Serve index.html directly ===

// ✅ ADDED FOR DASHBOARD - serve profile pics
//app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// server.js

 /* Connect to local MongoDB
mongoose.connect("mongodb://localhost:27017/userdb")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  profilePic: String,
});*/

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ ADD THIS CODE HERE — after mongoose.connect()

const groupJoinSchema = new mongoose.Schema({
  userName: String,
  groupName: String,
  groupCode: String,
  joinedAt: { type: Date, default: Date.now },
});

const GroupJoin = mongoose.model("GroupJoin", groupJoinSchema);


// Update user name/profile

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
const userRoutes = require('./routes/auth');
app.use('/api/user', userRoutes);

app.get("/signup", (req, res) => res.render("signup", { error: null }));
app.get("/login", (req, res) => res.render("login", { error: null }));


// user-dashbord route

// Edit Profile page
app.get("/edit-profile", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("edit-profile"); // will create edit-profile.ejs
});

// My Groups page
app.get("/my-groups", ensureAuthenticated, async (req, res) => {
  const groups = await GroupJoin.find({ userName: req.session.user.name });
  res.render("my-groups", { groups });
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});




/*/ MongoDB user schema
const User = mongoose.model("User", {
  name: String,
  profilePic: String
});*/


// === Ensure upload folder exists FIRST
const uploadPath = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// === Multer storage (keep clean file name)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    // sanitize file name
    const cleanName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, cleanName);
  }
});

const upload = multer({ storage });

// API: Create or get default user
// GET user by email
/*app.get("/api/user/by-email/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});*/
app.post("/join-group", async (req, res) => {
  const { userName, groupName, groupCode } = req.body;

  if (!userName || !groupName || !groupCode) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Group Code Validation
  const isSixChars = groupCode.length === 6;
  const hasUppercase = /[A-Z]/.test(groupCode);
  const hasNumber = /[0-9]/.test(groupCode);
  const hasSpecialChar = /[@#$%&]/.test(groupCode);

  if (!isSixChars || !hasUppercase || !hasNumber || !hasSpecialChar) {
    return res.status(400).json({
      error: "Code must be 6 chars, with 1 uppercase, 1 number, and 1 special (@#$%&).",
    });
  }

  try {
    // Prevent duplicate joins by same user to same group
    const alreadyJoined = await GroupJoin.findOne({ userName, groupName });
    if (alreadyJoined) {
      return res.json({ success: true, message: "Already joined. Reusing session." });
    }

    const joinEntry = new GroupJoin({ userName, groupName, groupCode });
    await joinEntry.save();
    res.json({ success: true, message: "Group joined and saved!" });
  } catch (err) {
    console.error("❌ Error saving group join:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// API: Update name
app.post("/api/user/update-name", async (req, res) => {
  const { name, userId } = req.body;
  const user = await User.findByIdAndUpdate(
    userId,
    { name },
    { new: true }
  );
  if (user) res.json({ success: true, user });
  else res.status(400).json({ error: "User not found" });
});
/*
// API: Upload profile picture
//app.post("/api/user/upload-profile-pic", upload.single("profilePic"), async (req, res) => {
// const { userId } = req.body;
 // const imageUrl = "/uploads/" + req.file.filename;

  const user = await User.findByIdAndUpdate(
    userId,
    { profilePic: imageUrl },
    { new: true }
  );
  if (user) res.json({ url: imageUrl });
  else res.status(400).json({ error: "User not found" });
});
*/
app.get("/api/user/by-email/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/user", (req, res) => {
  if (req.session.user) {
    res.json({
      name: req.session.user.name,
      email: req.session.user.email,
      picture: req.session.user.picture || "/default-avatar.png"
    });
  } else {
    res.status(401).json({ error: "Not logged in" });
  }
});


// === Upload route
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  res.json({
    success: true,
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,  // ✅ send original file name
    fileType: req.file.mimetype
  });
});

app.post("/upload-profile", upload.single("profilePic"), async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    let updateData = {};
    
    if (req.file) {
      const imagePath = "/uploads/" + req.file.filename;
      updateData.picture = imagePath;
    }
    
    if (req.body.name) {
      updateData.name = req.body.name;
    }

    const updatedUser = await User.findByIdAndUpdate(req.session.user._id, updateData, { new: true });

    // Update session data
    req.session.user = updatedUser;

    res.redirect("/");
  } catch (err) {
    console.error("Profile update error:", err);
    res.redirect("/edit-profile");
  }
});


// === Translation using LibreTranslate
app.post("/translate", async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) return res.status(400).json({ error: "Missing text or targetLang" });

  try {
    const response = await axios.post("https://libretranslate.de/translate", {
      q: text,
      source: "auto",
      target: targetLang,
      format: "text"
    }, {
      headers: { "Content-Type": "application/json" }
    });

    res.json({ translatedText: response.data.translatedText });
  } catch (err) {
    console.error("Translation error:", err.message);
    res.status(500).json({ error: "Translation failed" });
  }
});




// === Real-Time Chat Features
const onlineUsers = {};
const seenMessages = {};

io.on("connection", (socket) => {
  console.log("✅ A user connected");

  socket.on("draw", data => socket.broadcast.emit("draw", data));
  socket.on("shape", data => socket.broadcast.emit("shape", data));
  socket.on("clear", () => socket.broadcast.emit("clear"));

  
  socket.on("joinGroup", async ({ userName, group }) => {
    socket.join(group);
    socket.userName = userName;
    socket.group = group;

    if (!onlineUsers[group]) onlineUsers[group] = [];
    if (!onlineUsers[group].includes(userName)) {
      onlineUsers[group].push(userName);
    }

    io.to(group).emit("onlineUsers", onlineUsers[group]);
    socket.emit("joinGroup");

    try {
      const chatHistory = await Message.find({ group }).sort({ timestamp: 1 });
      chatHistory.forEach(msg => socket.emit("groupMessage", msg));
    } catch (err) {
      console.error("❌ Failed to load history:", err.message);
    }
  });

  // ... rest of your socket handlers


  socket.on("reactMessage", async ({ messageId, emoji, userName, group }) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) return;

    // Ensure reactions is an object
    let reactions = message.reactions instanceof Map
      ? Object.fromEntries(message.reactions)
      : message.reactions || {};

    // Ensure emoji array exists and is truly an array
    if (!Array.isArray(reactions[emoji])) {
      reactions[emoji] = [];
    }

    // Toggle: remove if already exists
    if (reactions[emoji].includes(userName)) {
      reactions[emoji] = reactions[emoji].filter(u => u !== userName);
    } else {
      // Remove user from all other emoji arrays (only one allowed per message)
      for (let e of Object.keys(reactions)) {
        if (Array.isArray(reactions[e])) {
          reactions[e] = reactions[e].filter(u => u !== userName);
        }
      }
      reactions[emoji].push(userName);
    }

    // Save and emit
    message.reactions = reactions;
    await message.save();

    io.to(group).emit("updateReaction", {
      messageId,
      reactions
    });

  } catch (err) {
    console.error("❌ Reaction save error:", err);
  }
});



  socket.on("groupMessage", async (data) => {
    try {
        // Detect if message is a file
        if (typeof data.message === "string" && data.message.startsWith("/uploads/")) {
            data.isFile = true;
            const ext = data.message.split(".").pop().toLowerCase();

            if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
                data.fileType = "image/" + ext;
            } else if (["webm", "mp3", "wav", "ogg"].includes(ext)) {
                data.fileType = "audio/" + ext;
                data.isVoice = true; // mark as voice message
            } else {
                data.fileType = "application/octet-stream";
            }
        }

        // Save message
        const newMsg = new Message(data);
        await newMsg.save();

        // Emit to all in group
        io.to(data.group).emit("groupMessage", newMsg);
    } catch (err) {
        console.error("❌ Failed to save message:", err.message);
    }
});


socket.on("markSeen", async ({ group, userName }) => {
  const messages = await Message.find({ group }).sort({ timestamp: 1 });
  if (!messages.length) return;

  const lastMsg = messages[messages.length - 1];
  
  if (!lastMsg.seenBy.includes(userName) && lastMsg.sender !== userName) {
    lastMsg.seenBy.push(userName);
    await lastMsg.save();
  }

  io.to(group).emit("updateSeen", {
    messageId: lastMsg._id,
    seenBy: lastMsg.seenBy
  });
});


  socket.on("typing", (data) => {
    socket.to(data.group).emit("typing", data);
  });

  socket.on("addTodo", (data) => {
    io.to(data.group).emit("addTodo", data);
  });

  socket.on("removeTodo", (data) => {
    io.to(data.group).emit("removeTodo", data);
  });

  socket.on("deleteMessage", ({ group, timestamp }) => {
    io.to(group).emit("deleteMessage", { timestamp });
  });

  socket.on("pinMessage", (data) => {
    io.to(data.group).emit("pinMessage", data);
  });

  socket.on("unpinMessage", (data) => {
    io.to(data.group).emit("unpinMessage", data);
  });


  socket.on("editMessage", (data) => {
    io.to(data.group).emit("groupMessage", {
      ...data,
      edited: true
    });
  });
  
  socket.on("disconnect", () => {
    const { userName, group } = socket;
    if (group && onlineUsers[group]) {
      onlineUsers[group] = onlineUsers[group].filter(u => u !== userName);
      io.to(group).emit("onlineUsers", onlineUsers[group]);
    }
  });
});

// === Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
