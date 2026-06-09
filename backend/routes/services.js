import express from 'express';
import Service from '../models/Service.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get paginated and filtered services (with optional geospatial sorting)
// @route   GET /api/services
// @access  Public
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const category = req.query.category;
  const longitude = req.query.longitude;
  const latitude = req.query.latitude;

  try {
    const query = {};

    if (category) {
      query.category = category;
    }

    let services;
    let totalServices;

    if (longitude && latitude) {
      // Geospatial sorting using $near
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
        },
      };

      // MongoDB near query count workaround
      const countQuery = { ...query };
      delete countQuery.location; // Geospatial location doesn't limit count unless maxDistance is set
      if (category) countQuery.category = category;
      totalServices = await Service.countDocuments(countQuery);

      services = await Service.find(query)
        .populate('provider', 'name email')
        .skip((page - 1) * limit)
        .limit(limit);
    } else {
      totalServices = await Service.countDocuments(query);
      services = await Service.find(query)
        .populate('provider', 'name email')
        .skip((page - 1) * limit)
        .limit(limit);
    }

    return res.json({
      success: true,
      data: {
        services,
        page,
        totalPages: Math.ceil(totalServices / limit),
        totalServices,
      },
      message: 'Services fetched successfully',
    });
  } catch (error) {
    console.error('Fetch services error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching services',
    });
  }
});

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('provider', 'name email');
    if (!service) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Service not found',
      });
    }

    return res.json({
      success: true,
      data: service,
      message: 'Service details fetched successfully',
    });
  } catch (error) {
    console.error('Fetch single service error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while fetching service details',
    });
  }
});

// @desc    Create a service listing
// @route   POST /api/services
// @access  Private (Provider only)
router.post('/', protect, requireRole('Provider'), async (req, res) => {
  const { title, category, price, coordinates, description } = req.body;

  try {
    if (!title || !category || price === undefined || !coordinates || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Please provide title, category, price, and coordinates [longitude, latitude]',
      });
    }

    const service = await Service.create({
      title,
      category,
      price,
      location: {
        type: 'Point',
        coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
      },
      description,
      provider: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: service,
      message: 'Service listing created successfully',
    });
  } catch (error) {
    console.error('Create service error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while creating service',
    });
  }
});

// @desc    Update service listing
// @route   PUT /api/services/:id
// @access  Private (Provider only, owner only)
router.put('/:id', protect, requireRole('Provider'), async (req, res) => {
  const { title, category, price, coordinates, description } = req.body;

  try {
    let service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Service not found',
      });
    }

    // Verify ownership
    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Not authorized to edit this service listing',
      });
    }

    service.title = title || service.title;
    service.category = category || service.category;
    service.price = price !== undefined ? price : service.price;
    service.description = description !== undefined ? description : service.description;

    if (coordinates && coordinates.length === 2) {
      service.location = {
        type: 'Point',
        coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
      };
    }

    const updatedService = await service.save();

    return res.json({
      success: true,
      data: updatedService,
      message: 'Service listing updated successfully',
    });
  } catch (error) {
    console.error('Update service error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while updating service',
    });
  }
});

// @desc    Delete service listing
// @route   DELETE /api/services/:id
// @access  Private (Provider only, owner only)
router.delete('/:id', protect, requireRole('Provider'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Service not found',
      });
    }

    // Verify ownership
    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Not authorized to delete this service listing',
      });
    }

    await Service.deleteOne({ _id: req.params.id });

    return res.json({
      success: true,
      data: null,
      message: 'Service listing deleted successfully',
    });
  } catch (error) {
    console.error('Delete service error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error while deleting service',
    });
  }
});

export default router;
