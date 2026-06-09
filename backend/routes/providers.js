import express from 'express';
import Review from '../models/Review.js';
import User from '../models/User.js';

const router = express.Router();

// @desc    Get provider profile details with aggregated average rating and reviews list
// @route   GET /api/providers/:id/profile
// @access  Public
router.get('/:id/profile', async (req, res) => {
  try {
    const provider = await User.findById(req.params.id).select('name email role');
    
    if (!provider || provider.role !== 'Provider') {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Provider not found',
      });
    }

    // Retrieve all reviews for this provider
    const reviews = await Review.find({ provider: req.params.id })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    let averageRating = 0;

    if (totalReviews > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = parseFloat((sum / totalReviews).toFixed(2));
    }

    return res.json({
      success: true,
      data: {
        provider: {
          _id: provider._id,
          name: provider.name,
          email: provider.email,
        },
        averageRating,
        totalReviews,
        reviews,
      },
      message: 'Provider profile and ratings fetched successfully',
    });
  } catch (error) {
    console.error('Fetch provider profile error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching provider profile',
    });
  }
});

export default router;
