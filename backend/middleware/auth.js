import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_servicesync_key_123456');

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Not authorized, user not found',
        });
      }
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Not authorized, token failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Not authorized, no token provided',
    });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: `Role forbidden: Requires one of [${roles.join(', ')}]`,
      });
    }
    next();
  };
};
