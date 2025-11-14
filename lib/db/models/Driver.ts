import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * File: /lib/db/models/Driver.ts
 * Purpose: Defines the Mongoose schema for the Driver collection.
 */

// Interface for the Driver document
export interface IDriver extends Document {
  authId: string; // From Supabase
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string; // Now optional
  vehicleType: string;
  vehicleColor: string;
  vehicleMake: string;
  vehicleModel: string;
  immatriculation: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const DriverSchema: Schema<IDriver> = new mongoose.Schema(
  {
    authId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: false, // Optional
      unique: true,
      sparse: true, // Allows multiple nulls, but ensures uniqueness if a value exists
      trim: true,
      lowercase: true,
      match: [/.+\@.+\..+/, 'Please enter a valid email address'],
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      trim: true,
    },
    vehicleColor: {
      type: String,
      required: [true, 'Vehicle color is required'],
      trim: true,
    },
    vehicleMake: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
    },
    vehicleModel: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    immatriculation: {
      type: String,
      required: [true, 'Immatriculation (matricule) is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    termsAccepted: {
      type: Boolean,
      required: true,
      validate: [
        (val: boolean) => val === true,
        'You must accept the terms and conditions',
      ],
    },
    privacyAccepted: {
      type: Boolean,
      required: true,
      validate: [
        (val: boolean) => val === true,
        'You must accept the privacy policy',
      ],
    },
  },
  {
    // Add timestamps (createdAt, updatedAt)
    timestamps: true,
  }
);

// Prevent re-compilation of the model if it already exists
const Driver: Model<IDriver> =
  mongoose.models.Driver || mongoose.model<IDriver>('Driver', DriverSchema);

export default Driver;