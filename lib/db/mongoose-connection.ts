import mongoose from 'mongoose';

/**
 * File: /lib/db/mongoose-connection.ts
 * Purpose: Handles the connection to MongoDB Atlas.
 *
 * This file implements a cached connection strategy.
 * In a serverless environment (like Vercel), we don't want to create
 * a new database connection on every single API request.
 * This code checks if a connection already exists and reuses it.
 */

interface CachedConnection {
  conn: mongoose.Mongoose | null;
  promise: Promise<mongoose.Mongoose> | null;
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// Global cache for the Mongoose connection promise
let cached = (global as unknown as { mongoose: CachedConnection }).mongoose;

if (!cached) {
  cached = (global as unknown as { mongoose: CachedConnection }).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // If we have a cached connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection promise is not in progress, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  // Wait for the promise to resolve and cache the connection
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  // Return the connection
  return cached.conn;
}

export default dbConnect;
