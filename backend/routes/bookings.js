import express from 'express';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import Review from '../models/Review.js';
import { protect, requireRole } from '../middleware/auth.js';
import { logStatusChangeOnChain, getAuditLogsFromChain } from '../services/blockchain.js';

const router = express.Router();

// Helper to convert MongoDB ID to valid Ethereum address format
const getEthereumAddress = (userId) => {
  return `0x${userId.toString().padStart(40, '0').slice(-40)}`;
};

// @desc    Get all bookings for the authenticated user
// @route   GET /api/bookings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'Customer') {
      bookings = await Booking.find({ customer: req.user._id })
        .populate('service')
        .populate('provider', 'name email')
        .populate('customer', 'name email')
        .sort({ createdAt: -1 });
    } else {
      bookings = await Booking.find({ provider: req.user._id })
        .populate('service')
        .populate('provider', 'name email')
        .populate('customer', 'name email')
        .sort({ createdAt: -1 });
    }

    // Include reviews for completed bookings
    const bookingIds = bookings.map(b => b._id);
    const reviews = await Review.find({ booking: { $in: bookingIds } });

    const bookingsWithReviews = bookings.map(booking => {
      const review = reviews.find(r => r.booking.toString() === booking._id.toString());
      return {
        ...booking.toObject(),
        review: review || null,
      };
    });

    return res.json({
      success: true,
      data: bookingsWithReviews,
      message: 'Bookings fetched successfully',
    });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching bookings',
    });
  }
});

// @desc    Create a booking for a service
// @route   POST /api/bookings
// @access  Private (Customer only)
router.post('/', protect, requireRole('Customer'), async (req, res) => {
  const { serviceId } = req.body;

  try {
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Please provide serviceId',
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Service listing not found',
      });
    }

    // Check if customer is trying to book their own service
    // (A provider cannot register as a customer and book their own service)
    if (service.provider.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'You cannot book your own service',
      });
    }

    const booking = await Booking.create({
      customer: req.user._id,
      provider: service.provider,
      service: serviceId,
      status: 'pending',
    });

    // Write initial status to blockchain audit log
    const actorAddress = getEthereumAddress(req.user._id);
    await logStatusChangeOnChain(booking._id, 'none', 'pending', actorAddress);

    const populatedBooking = await Booking.findById(booking._id)
      .populate('service')
      .populate('provider', 'name email')
      .populate('customer', 'name email');

    return res.status(201).json({
      success: true,
      data: populatedBooking,
      message: 'Service booked successfully',
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while booking service',
    });
  }
});

// @desc    Update booking status (pending -> confirmed -> completed)
// @route   PATCH /api/bookings/:id/status
// @access  Private (Provider only)
router.patch('/:id/status', protect, requireRole('Provider'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'completed'];

  try {
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Please provide a valid status: [${validStatuses.join(', ')}]`,
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Booking not found',
      });
    }

    // Enforce that only the provider of the booking can update status
    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Not authorized to update status for this booking',
      });
    }

    const oldStatus = booking.status;

    // Enforce status flow state machine logic
    // pending -> confirmed -> completed
    if (oldStatus === 'pending' && status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Pending bookings must be updated to confirmed first',
      });
    }
    if (oldStatus === 'confirmed' && status !== 'completed') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Confirmed bookings must be updated to completed',
      });
    }
    if (oldStatus === 'completed') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Completed bookings cannot be updated further',
      });
    }

    booking.status = status;
    await booking.save();

    // Log status change to blockchain
    const actorAddress = getEthereumAddress(req.user._id);
    const chainResult = await logStatusChangeOnChain(booking._id, oldStatus, status, actorAddress);

    const populatedBooking = await Booking.findById(booking._id)
      .populate('service')
      .populate('provider', 'name email')
      .populate('customer', 'name email');

    return res.json({
      success: true,
      data: {
        booking: populatedBooking,
        blockchainLog: chainResult,
      },
      message: `Booking status updated to ${status} and logged on-chain`,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while updating booking status',
    });
  }
});

// @desc    Submit rating and review for a completed booking
// @route   POST /api/bookings/:id/rate
// @access  Private (Customer of booking only)
router.post('/:id/rate', protect, requireRole('Customer'), async (req, res) => {
  const { rating, comment } = req.body;

  try {
    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Please provide a rating between 1 and 5 stars',
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Booking not found',
      });
    }

    // Verify ownership: customer of the booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Not authorized to review this booking',
      });
    }

    // Verify status is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'You can only review services after the booking is completed',
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking: booking._id });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'You have already reviewed this booking',
      });
    }

    const review = await Review.create({
      booking: booking._id,
      customer: req.user._id,
      provider: booking.provider,
      rating,
      comment,
    });

    return res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    console.error('Submit review error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while submitting review',
    });
  }
});

// @desc    Get blockchain audit log for a specific booking
// @route   GET /api/bookings/:id/audit
// @access  Private (Customer or Provider of the booking)
router.get('/:id/audit', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Booking not found',
      });
    }

    // Verify authorized user
    if (
      booking.customer.toString() !== req.user._id.toString() &&
      booking.provider.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Not authorized to view the audit logs for this booking',
      });
    }

    const auditData = await getAuditLogsFromChain(booking._id);
    return res.json({
      success: true,
      data: auditData,
      message: 'Audit logs retrieved successfully',
    });
  } catch (error) {
    console.error('Fetch audit log error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching audit logs',
    });
  }
});

export default router;
