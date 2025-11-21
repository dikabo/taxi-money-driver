import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * File: /lib/db/models/Transaction.ts
 * Purpose: Defines the Mongoose schema for the Transaction collection.
 * This will be a "shared" collection for all money movement.
 */

export interface ITransaction extends Document {
  userId: mongoose.Schema.Types.ObjectId; // Link to Passenger or Driver
  userType: 'Passenger' | 'Driver';
  type: 'Recharge' | 'Withdrawal' | 'Payment' | 'Charge';
  status: 'Pending' | 'Success' | 'Failed';
  amount: number; // The amount of the transaction
  method: string; // e.g., 'MTN', 'Orange', 'Internal'
  fapshiTransactionId?: string; // The ID from Fapshi
  phoneNumber: string; // The MoMo number used
  notes?: string; // e.g., "Payment to Driver X"
}

const TransactionSchema: Schema<ITransaction> = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userType: { type: String, required: true, enum: ['Passenger', 'Driver'] },
    type: { type: String, required: true, enum: ['Recharge', 'Withdrawal', 'Payment', 'Charge'] },
    status: { type: String, required: true, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    fapshiTransactionId: { type: String, unique: true, sparse: true },
    phoneNumber: { type: String, required: true },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// This ensures we can use the same Transaction model across both apps
const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;