import mongoose from 'mongoose';
import { ROLES } from '../constants/index.js';

const governanceRoles = [ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.COMMITTEE_MEMBER];

const committeeMemberSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  designation: { type: String, enum: governanceRoles, required: true },
  termStart: { type: Date, required: true },
  termEnd: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true }
}, { timestamps: true });

committeeMemberSchema.index({ societyId: 1, userId: 1 }, { unique: true });
committeeMemberSchema.index({ societyId: 1, status: 1, designation: 1 });
for (const designation of [ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER]) {
  committeeMemberSchema.index(
    { societyId: 1 },
    {
      unique: true,
      partialFilterExpression: { status: 'ACTIVE', designation },
      name: `one_active_${designation.toLowerCase()}_per_society`
    }
  );
}

export const CommitteeMember = mongoose.model('CommitteeMember', committeeMemberSchema);
