// server/middlewares/ownerMiddleware.js
module.exports = function(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: owner only' });
  }
  next();
};
