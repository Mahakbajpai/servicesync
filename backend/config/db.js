import mongoose from 'mongoose';

const getMaskedURI = (uri) => {
  if (!uri) return 'undefined/empty';
  return uri.replace(/:([^:@]+)@/, ':****@');
};

const connectDB = async () => {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/servicesync';
    console.log(`Attempting database connection to: ${getMaskedURI(dbUri)}`);
    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
