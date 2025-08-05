const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/User"); // adjust if needed

// Signup Route
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("signup", { error: "Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.redirect("/login");
  } catch (error) {
    console.error("Signup error:", error);
    res.render("signup", { error: "Signup failed. Try again." });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("login", { error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", { error: "Invalid email or password." });
    }
  
    // Success — store session
    req.session.user = user;
    res.redirect("/"); // change if needed
  } catch (error) {
    console.error("Login error:", error);
    res.render("login", { error: "Login failed. Try again." });
  }
});

module.exports = router;
