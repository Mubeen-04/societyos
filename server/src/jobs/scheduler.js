import cron from 'node-cron';
import { MaintenanceInvoice } from '../models/MaintenanceInvoice.js';
import { Visitor } from '../models/Visitor.js';
import { Poll } from '../models/Poll.js';
import { Society } from '../models/Society.js';
import { INVOICE_STATUS, VISITOR_APPROVAL_STATUS, VISITOR_ENTRY_STATUS } from '../constants/index.js';
import { processExpiredProposals } from '../controllers/committeeController.js';

export const initBackgroundJobs = () => {
  // Close committee proposal voting and persist the configured threshold result.
  cron.schedule('*/15 * * * *', async () => {
    try {
      await processExpiredProposals();
    } catch (err) {
      console.error('Error in expired committee proposal job:', err.message);
    }
  });

  console.log('⏰ Initializing SocietyOS Background Jobs Scheduler...');

  // 1. Audit Overdue Invoices: Runs daily at midnight (00:05)
  // Also ran once at startup for immediate freshness
  cron.schedule('5 0 * * *', async () => {
    try {
      console.log('🔄 Running Overdue Invoice Auditor...');
      const now = new Date();
      const societies = await Society.find();

      for (const society of societies) {
        const lateFeePct = society.settings?.lateFinePercentage || 5;

        const overdueInvoices = await MaintenanceInvoice.find({
          societyId: society._id,
          status: { $in: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PARTIAL, INVOICE_STATUS.PARTIALLY_PAID] },
          dueDate: { $lt: now }
        });

        for (const invoice of overdueInvoices) {
          const lateFee = Math.round((invoice.totalAmount * lateFeePct) / 100);
          invoice.status = INVOICE_STATUS.OVERDUE;
          invoice.lateFee = lateFee;
          invoice.payableAmount = invoice.totalAmount + lateFee - (invoice.discount || 0);
          await invoice.save();
        }

        if (overdueInvoices.length > 0) {
          console.log(`📌 Applied late fees to ${overdueInvoices.length} overdue invoices in ${society.name}.`);
        }
      }
    } catch (err) {
      console.error('Error in Overdue Invoice Auditor job:', err.message);
    }
  });

  // 2. Clean Expired Visitor Passes: Runs every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const result = await Visitor.updateMany(
        {
          approvalStatus: { $in: [VISITOR_APPROVAL_STATUS.PENDING, VISITOR_APPROVAL_STATUS.APPROVED] },
          entryStatus: VISITOR_ENTRY_STATUS.WAITING,
          validUntil: { $lt: now }
        },
        {
          $set: { approvalStatus: VISITOR_APPROVAL_STATUS.EXPIRED }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`📌 Expired ${result.modifiedCount} unused visitor passes.`);
      }
    } catch (err) {
      console.error('Error in Expired Visitor Passes job:', err.message);
    }
  });

  // 3. Close Expired Polls: Runs hourly
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const result = await Poll.updateMany(
        {
          status: 'ACTIVE',
          expiresAt: { $lt: now }
        },
        {
          $set: { status: 'EXPIRED' }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`📌 Closed ${result.modifiedCount} expired society polls.`);
      }
    } catch (err) {
      console.error('Error in Expired Polls job:', err.message);
    }
  });

  console.log('✅ Background Jobs active (Invoice Auditor, Pass Expiration, Poll Watcher)');
};
