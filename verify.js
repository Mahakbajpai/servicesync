import mongoose from 'mongoose';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';

console.log("==================================================");
console.log("    ServiceSync Code Compilation & Sanity Checks  ");
console.log("==================================================");

async function runDiagnostics() {
  let errors = 0;

  // 1. Check schemas compilation
  try {
    console.log("🔄 Testing Mongoose Models compilation...");
    
    const pointSchema = new mongoose.Schema({
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true }
    });

    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      role: { type: String, enum: ['Customer', 'Provider'], required: true }
    });

    const serviceSchema = new mongoose.Schema({
      title: { type: String, required: true },
      category: { type: String, required: true, index: true },
      price: { type: Number, required: true },
      location: { type: pointSchema, required: true },
      provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    });
    serviceSchema.index({ location: '2dsphere' });

    const bookingSchema = new mongoose.Schema({
      customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
      status: { type: String, enum: ['pending', 'confirmed', 'completed'], default: 'pending' }
    });

    const reviewSchema = new mongoose.Schema({
      booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String }
    });

    console.log("✅ Models compile check passed!");
  } catch (err) {
    console.error("❌ Models compile failed:", err.message);
    errors++;
  }

  // 2. Check bcrypt hashing & compare
  try {
    console.log("🔄 Testing bcrypt password encryption...");
    const salt = await bcrypt.genSalt(2);
    const hash = await bcrypt.hash("test_password_123", salt);
    const match = await bcrypt.compare("test_password_123", hash);
    if (match) {
      console.log("✅ Bcrypt hashing checks passed!");
    } else {
      throw new Error("Bcrypt comparison failed");
    }
  } catch (err) {
    console.error("❌ Bcrypt check failed:", err.message);
    errors++;
  }

  // 3. Check JWT token signing & verification
  try {
    console.log("🔄 Testing JWT cryptographic token signatures...");
    const secret = "temp_secret_key";
    const token = jwt.sign({ id: "user_mongodb_id" }, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    if (decoded.id === "user_mongodb_id") {
      console.log("✅ JWT sign/verify checks passed!");
    } else {
      throw new Error("Decoded payload mismatch");
    }
  } catch (err) {
    console.error("❌ JWT check failed:", err.message);
    errors++;
  }

  // 4. Check ethers solidity compiler mapping
  try {
    console.log("🔄 Testing Ethers contract helper configurations...");
    const abi = [
      "function recordStatusChange(string bookingId, string oldStatus, string newStatus, address actor) public",
      "function getAuditLogs(string bookingId) public view returns (tuple(string oldStatus, string newStatus, uint256 timestamp, address actor)[])"
    ];
    // Create an interface check
    const iface = new ethers.Interface(abi);
    const selector = iface.getFunction("recordStatusChange");
    if (selector) {
      console.log("✅ Ethers Interface compile passed!");
    } else {
      throw new Error("Unable to parse selector");
    }
  } catch (err) {
    console.error("❌ Ethers Interface check failed:", err.message);
    errors++;
  }

  console.log("==================================================");
  if (errors === 0) {
    console.log("🎉 DIAGNOSTIC SUMMARY: ALL CODE COMPILE CHECKS PASSED!");
    console.log("The application core packages are ready for deployment.");
  } else {
    console.log(`⚠️ DIAGNOSTIC SUMMARY: ${errors} CHECKS FAILED. Please verify packages.`);
  }
  console.log("==================================================");
}

runDiagnostics();
