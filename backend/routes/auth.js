import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_servicesync_key_123456', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Please provide name, email, password, and role',
      });
    }

    if (role !== 'Customer' && role !== 'Provider') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Role must be either Customer or Provider',
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'User already exists with this email',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    if (user) {
      return res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        },
        message: 'User registered successfully',
      });
    } else {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid user data',
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error during registration',
    });
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      return res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        },
        message: 'Login successful',
      });
    } else {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid email or password',
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error during login',
    });
  }
});

export default router;
