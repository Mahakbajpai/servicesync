import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true, // index on category as requested
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  location: {
    type: pointSchema,
    required: true,
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Set up 2dsphere index on location for geospatial queries
serviceSchema.index({ location: '2dsphere' });

const Service = mongoose.model('Service', serviceSchema);
export default Service;
