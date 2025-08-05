// middleware/auth.js

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/login");
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return next();
  }
  res.status(403).send("Access denied: Admins only.");
}

module.exports = { ensureAuthenticated, isAdmin };
