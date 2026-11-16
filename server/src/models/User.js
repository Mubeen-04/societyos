import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ROLES } from '../constants/index.js';
import { ENV } from '../config/env.js';

const userSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.RESIDENT,
      index: true
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      default: null
    },
    occupancyType: {
      type: String,
      enum: ['OWNER', 'TENANT', null],
      default: null
    },
    familyMembers: [
      {
        name: { type: String, required: true },
        relation: { type: String, required: true },
        phone: { type: String, default: '' }
      }
    ],
    avatarUrl: {
      type: String,
      default: ''
    },
    isVerified: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relation: { type: String, default: '' },
      phone: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ societyId: 1, role: 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      societyId: this.societyId,
      role: this.role,
      name: this.name,
      email: this.email
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );
};

export const User = mongoose.model('User', userSchema);
