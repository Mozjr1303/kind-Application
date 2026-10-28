const jwt = require('jsonwebtoken');

function createAuthMiddleware({ db, jwtSecret = process.env.JWT_SECRET } = {}) {
  const getDb = () => db || require('../supabase');

  const authenticate = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    let payload;
    try {
      payload = jwt.verify(authorization.slice(7), jwtSecret);
    } catch {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }
    if (typeof payload !== 'object' || payload === null || payload.id === undefined) {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }

    try {
      const { data: user, error } = await getDb()
        .from('users')
        .select('id, name, email, role, status, phone_number')
        .eq('id', payload.id)
        .single();

      if (error) return res.status(500).json({ message: 'Could not verify authentication.' });
      if (!user) return res.status(401).json({ message: 'Invalid authentication token.' });
      if (['suspended', 'rejected'].includes(String(user.status).toLowerCase())) {
        return res.status(403).json({ message: 'This account cannot access the service.' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication lookup failed:', error.message);
      return res.status(500).json({ message: 'Could not verify authentication.' });
    }
  };

  const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    if (!roles.includes(String(req.user.role).toUpperCase())) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    next();
  };

  return { authenticate, requireRole };
}

const authenticate = (req, res, next) => createAuthMiddleware().authenticate(req, res, next);
const requireRole = (...roles) => (req, res, next) => createAuthMiddleware().requireRole(...roles)(req, res, next);

module.exports = { authenticate, requireRole, createAuthMiddleware };
