const jwt = require('jsonwebtoken');
module.exports = function(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token provided' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains id and email we put during login
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
