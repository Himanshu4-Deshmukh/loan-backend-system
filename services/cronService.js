import cron from 'node-cron';
import Loan from '../models/Loan.js';
import { createMessage } from './messageService.js';

// Function to update loan status automatically
const updateLoanStatus = async (loanId) => {
    try {
        const loan = await Loan.findById(loanId);
        if (!loan) return;

        const today = new Date();
        const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dueDate = new Date(loan.dueDate);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        // Check if loan is overdue
        if (currentDate > dueDateOnly && loan.remainingBalance > 0) {
            if (loan.status !== 'Overdue') {
                loan.status = 'Overdue';
                await loan.save();
                
                // Create overdue message
                await createMessage({
                    type: 'overdue',
                    customerId: loan.customerId,
                    loanId: loan._id,
                    title: 'Loan Overdue',
                    message: `Loan for ${loan.customerName} (NRC: ${loan.customerNRC}) is overdue. Amount due: K${loan.remainingBalance}`,
                    priority: 'high'
                });
            }
        }
    } catch (error) {
        console.error('Error updating loan status:', error);
    }
};

// Check for loans due soon (within 7 days)
const checkDueSoonLoans = async () => {
    try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const dueSoonLoans = await Loan.find({
            status: { $in: ['Active', 'Not Paid'] },
            dueDate: { $lte: sevenDaysFromNow, $gte: new Date() },
            remainingBalance: { $gt: 0 }
        });

        for (const loan of dueSoonLoans) {
            await createMessage({
                type: 'payment_reminder',
                customerId: loan.customerId,
                loanId: loan._id,
                title: 'Payment Reminder',
                message: `Payment for ${loan.customerName} (NRC: ${loan.customerNRC}) is due soon. Amount: K${loan.remainingBalance}`,
                priority: 'medium'
            });
        }

        console.log(`Payment reminders sent for ${dueSoonLoans.length} loans`);
    } catch (error) {
        console.error('Error checking due soon loans:', error);
    }
};

// Daily overdue check
const runDailyOverdueCheck = async () => {
    console.log('Running daily overdue check...');
    try {
        const activeLoans = await Loan.find({ 
            status: { $in: ['Active', 'Not Paid'] },
            remainingBalance: { $gt: 0 }
        });
        
        for (const loan of activeLoans) {
            await updateLoanStatus(loan._id);
        }
        
        console.log(`Checked ${activeLoans.length} active loans for overdue status`);
    } catch (error) {
        console.error('Error in daily overdue check:', error);
    }
};

// Weekly payment reminder
const runWeeklyPaymentReminder = async () => {
    console.log('Running weekly payment reminder...');
    try {
        await checkDueSoonLoans();
    } catch (error) {
        console.error('Error in weekly payment reminder:', error);
    }
};

// Monthly loan summary
const runMonthlyLoanSummary = async () => {
    console.log('Running monthly loan summary...');
    try {
        const stats = await Loan.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$loanAmount' },
                    totalRemaining: { $sum: '$remainingBalance' }
                }
            }
        ]);

        await createMessage({
            type: 'system_alert',
            title: 'Monthly Loan Summary',
            message: `Monthly loan statistics: ${JSON.stringify(stats)}`,
            priority: 'low'
        });
    } catch (error) {
        console.error('Error in monthly loan summary:', error);
    }
};

// Start all cron jobs
const runDailyTasks = () => {
    // Daily overdue check at 9 AM
    cron.schedule('0 9 * * *', runDailyOverdueCheck);
    
    // Weekly payment reminder on Mondays at 10 AM
    cron.schedule('0 10 * * 1', runWeeklyPaymentReminder);
    
    // Monthly summary on the 1st of each month at 8 AM
    cron.schedule('0 8 1 * *', runMonthlyLoanSummary);
    
    console.log('📅 Cron jobs scheduled:');
    console.log('   - Daily overdue check: 9:00 AM');
    console.log('   - Weekly payment reminder: Monday 10:00 AM');
    console.log('   - Monthly summary: 1st of month 8:00 AM');
};

export {
    updateLoanStatus,
    checkDueSoonLoans,
    runDailyOverdueCheck,
    runWeeklyPaymentReminder,
    runMonthlyLoanSummary,
    runDailyTasks
};