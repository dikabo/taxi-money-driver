import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * File: /lib/db/models/Driver.ts
 * Purpose: Defines the Mongoose schema for the Driver collection.
 *
 * UPDATED: 'availableBalance' and 'dailyEarnings' now default to 0.
 */

export interface IDriver extends Document {
  authId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  vehicleType: string;
  vehicleColor: string;
  vehicleMake: string;
  vehicleModel: string;
  immatriculation: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  availableBalance: number;
  dailyEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema: Schema<IDriver> = new mongoose.Schema(
  {
    // ... (all other fields like authId, firstName are perfect)
    authId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: false, unique: true, sparse: true, trim: true, lowercase: true },
    vehicleType: { type: String, required: true, trim: true },
    vehicleColor: { type: String, required: true, trim: true },
    vehicleMake: { type: String, required: true, trim: true },
    vehicleModel: { type: String, required: true, trim: true },
    immatriculation: { type: String, required: true, unique: true, trim: true, uppercase: true },
    termsAccepted: { type: Boolean, required: true },
    privacyAccepted: { type: Boolean, required: true },
    
    // THIS IS THE FIX (as you requested)
    availableBalance: {
      type: Number,
      required: true,
      default: 0, // Start with 0
    },
    dailyEarnings: {
      type: Number,
      required: true,
      default: 0, // Start with 0
    },
  },
  {
    timestamps: true,
  }
);

const Driver: Model<IDriver> =
  mongoose.models.Driver || mongoose.model<IDriver>('Driver', DriverSchema);

export default Driver;