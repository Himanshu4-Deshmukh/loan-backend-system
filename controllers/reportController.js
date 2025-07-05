const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Helper function to generate PDF
const generatePDF = async (title, data, columns) => {
    const doc = new PDFDocument({ margin: 50 });
    
    // Title
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    
    // Date
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();
    
    // Table headers
    let y = doc.y;
    let x = 50;
    const colWidth = (doc.page.width - 100) / columns.length;
    
    columns.forEach((col, index) => {
        doc.text(col, x + (index * colWidth), y, { width: colWidth, align: 'center' });
    });
    
    doc.moveDown();
    
    // Table data
    data.forEach((row, rowIndex) => {
        y = doc.y;
        columns.forEach((col, colIndex) => {
            const key = col.toLowerCase().replace(/\s+/g, '');
            const value = row[key] || '';
            doc.text(String(value), x + (colIndex * colWidth), y, { 
                width: colWidth, 
                align: 'left',
                fontSize: 10
            });
        });
        doc.moveDown(0.5);
        
        // Add new page if needed
        if (doc.y > doc.page.height - 100) {
            doc.addPage();
        }
    });
    
    return doc;
};

// Helper function to generate Excel
const generateExcel = async (title, data, columns) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);
    
    // Add title
    worksheet.mergeCells('A1', `${String.fromCharCode(65 + columns.length - 1)}1`);
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // Add date
    worksheet.mergeCells('A2', `${String.fromCharCode(65 + columns.length - 1)}2`);
    worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A2').alignment = { horizontal: 'right' };
    
    // Add headers
    worksheet.addRow([]);
    worksheet.addRow(columns);
    
    // Add data
    data.forEach(row => {
        const rowData = columns.map(col => {
            const key = col.toLowerCase().replace(/\s+/g, '');
            return row[key] || '';
        });
        worksheet.addRow(rowData);
    });
    
    // Style headers
    const headerRow = worksheet.getRow(4);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
        column.width = 15;
    });
    
    return workbook;
};

const reportController = {
    // Generate customer report
    generateCustomerReport: async (req, res) => {
        try {
            const { format } = req.params;
            const customers = await Customer.find({ isActive: true })
                .populate('createdBy', 'name userid');
            
            const columns = ['Full Name', 'NRC Number', 'Phone Number', 'City', 'Employment Status', 'Created Date'];
            const data = customers.map(customer => ({
                fullname: customer.fullName,
                nrcnumber: customer.nrcNumber,
                phonenumber: customer.phoneNumber,
                city: customer.city,
                employmentstatus: customer.employmentStatus,
                createddate: customer.createdAt.toLocaleDateString()
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Customer Details Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="customers-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Customer Details Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="customers-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            } else {
                res.status(400).json({ 
                    success: false,
                    message: 'Invalid format. Use pdf or excel' 
                });
            }
        } catch (error) {
            console.error('Generate customer report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating customer report' 
            });
        }
    },

    // Generate customer demographics report
    generateCustomerDemographicsReport: async (req, res) => {
        try {
            const { format } = req.params;
            
            const ageGroups = await Customer.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: {
                            $switch: {
                                branches: [
                                    { case: { $lt: ['$age', 25] }, then: '18-24' },
                                    { case: { $lt: ['$age', 35] }, then: '25-34' },
                                    { case: { $lt: ['$age', 45] }, then: '35-44' },
                                    { case: { $lt: ['$age', 55] }, then: '45-54' },
                                    { case: { $gte: ['$age', 55] }, then: '55+' }
                                ],
                                default: 'Unknown'
                            }
                        },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const columns = ['Age Group', 'Count'];
            const data = ageGroups.map(group => ({
                agegroup: group._id,
                count: group.count
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Customer Demographics Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="customer-demographics-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Customer Demographics Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="customer-demographics-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate customer demographics report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating customer demographics report' 
            });
        }
    },

    // Generate loan report
    generateLoanReport: async (req, res) => {
        try {
            const { format } = req.params;
            const loans = await Loan.find()
                .populate('customerId', 'fullName nrcNumber');
            
            const columns = ['Customer Name', 'NRC Number', 'Loan Amount', 'Total Amount', 'Remaining Balance', 'Status', 'Created Date'];
            const data = loans.map(loan => ({
                customername: loan.customerName,
                nrcnumber: loan.customerNRC,
                loanamount: loan.loanAmount,
                totalamount: loan.totalAmount,
                remainingbalance: loan.remainingBalance,
                status: loan.status,
                createddate: loan.createdAt.toLocaleDateString()
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('All Loans Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="loans-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('All Loans Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="loans-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate loan report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating loan report' 
            });
        }
    },

    // Generate overdue report
    generateOverdueReport: async (req, res) => {
        try {
            const { format } = req.params;
            const overdueLoans = await Loan.find({ status: 'Overdue' })
                .populate('customerId', 'fullName nrcNumber phoneNumber');
            
            const columns = ['Customer Name', 'NRC Number', 'Phone Number', 'Loan Amount', 'Remaining Balance', 'Due Date', 'Days Overdue'];
            const data = overdueLoans.map(loan => {
                const today = new Date();
                const dueDate = new Date(loan.dueDate);
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                
                return {
                    customername: loan.customerName,
                    nrcnumber: loan.customerNRC,
                    phonenumber: loan.customerId?.phoneNumber || 'N/A',
                    loanamount: loan.loanAmount,
                    remainingbalance: loan.remainingBalance,
                    duedate: loan.dueDate.toLocaleDateString(),
                    daysoverdue: daysOverdue > 0 ? daysOverdue : 0
                };
            });
            
            if (format === 'pdf') {
                const doc = await generatePDF('Overdue Loans Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="overdue-loans-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Overdue Loans Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="overdue-loans-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate overdue report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating overdue report' 
            });
        }
    },

    // Generate active loans report
    generateActiveLoansReport: async (req, res) => {
        try {
            const { format } = req.params;
            const activeLoans = await Loan.find({ status: 'Active' })
                .populate('customerId', 'fullName nrcNumber phoneNumber');
            
            const columns = ['Customer Name', 'NRC Number', 'Phone Number', 'Loan Amount', 'Remaining Balance', 'Monthly Payment', 'Due Date'];
            const data = activeLoans.map(loan => ({
                customername: loan.customerName,
                nrcnumber: loan.customerNRC,
                phonenumber: loan.customerId?.phoneNumber || 'N/A',
                loanamount: loan.loanAmount,
                remainingbalance: loan.remainingBalance,
                monthlypayment: loan.monthlyPayment,
                duedate: loan.dueDate.toLocaleDateString()
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Active Loans Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="active-loans-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Active Loans Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="active-loans-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate active loans report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating active loans report' 
            });
        }
    },

    // Generate completed loans report
    generateCompletedLoansReport: async (req, res) => {
        try {
            const { format } = req.params;
            const completedLoans = await Loan.find({ status: 'Completed' })
                .populate('customerId', 'fullName nrcNumber');
            
            const columns = ['Customer Name', 'NRC Number', 'Loan Amount', 'Total Amount', 'Interest Earned', 'Completion Date'];
            const data = completedLoans.map(loan => ({
                customername: loan.customerName,
                nrcnumber: loan.customerNRC,
                loanamount: loan.loanAmount,
                totalamount: loan.totalAmount,
                interestearned: loan.totalAmount - loan.loanAmount,
                completiondate: loan.lastPaymentDate ? loan.lastPaymentDate.toLocaleDateString() : 'N/A'
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Completed Loans Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="completed-loans-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Completed Loans Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="completed-loans-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate completed loans report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating completed loans report' 
            });
        }
    },

    // Generate payment report
    generatePaymentReport: async (req, res) => {
        try {
            const { format } = req.params;
            const payments = await Payment.find({ status: 'Completed' })
                .populate('loanId', 'loanAmount loanType')
                .populate('customerId', 'fullName nrcNumber')
                .sort({ createdAt: -1 });
            
            const columns = ['Customer Name', 'NRC Number', 'Payment Amount', 'Payment Method', 'Payment Date', 'Balance After Payment'];
            const data = payments.map(payment => ({
                customername: payment.customerName,
                nrcnumber: payment.customerId?.nrcNumber || 'N/A',
                paymentamount: payment.paymentAmount,
                paymentmethod: payment.paymentMethod,
                paymentdate: payment.paymentDate.toLocaleDateString(),
                balanceafterpayment: payment.balanceAfterPayment
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Payments Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="payments-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Payments Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="payments-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate payment report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating payment report' 
            });
        }
    },

    // Generate payment method report
    generatePaymentMethodReport: async (req, res) => {
        try {
            const { format } = req.params;
            const methodStats = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                {
                    $group: {
                        _id: '$paymentMethod',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$paymentAmount' },
                        avgAmount: { $avg: '$paymentAmount' }
                    }
                }
            ]);
            
            const columns = ['Payment Method', 'Count', 'Total Amount', 'Average Amount'];
            const data = methodStats.map(stat => ({
                paymentmethod: stat._id,
                count: stat.count,
                totalamount: stat.totalAmount.toFixed(2),
                averageamount: stat.avgAmount.toFixed(2)
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Payment Methods Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="payment-methods-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Payment Methods Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="payment-methods-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate payment method report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating payment method report' 
            });
        }
    },

    // Generate daily payment report
    generateDailyPaymentReport: async (req, res) => {
        try {
            const { format } = req.params;
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));
            
            const dailyPayments = await Payment.find({
                status: 'Completed',
                paymentDate: { $gte: startOfDay, $lte: endOfDay }
            })
            .populate('customerId', 'fullName nrcNumber')
            .sort({ paymentDate: -1 });
            
            const columns = ['Customer Name', 'NRC Number', 'Payment Amount', 'Payment Method', 'Payment Time'];
            const data = dailyPayments.map(payment => ({
                customername: payment.customerName,
                nrcnumber: payment.customerId?.nrcNumber || 'N/A',
                paymentamount: payment.paymentAmount,
                paymentmethod: payment.paymentMethod,
                paymenttime: payment.paymentDate.toLocaleTimeString()
            }));
            
            const title = `Daily Payment Report - ${new Date().toLocaleDateString()}`;
            
            if (format === 'pdf') {
                const doc = await generatePDF(title, data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="daily-payment-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel(title, data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="daily-payment-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate daily payment report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating daily payment report' 
            });
        }
    },

    // Generate reloan report
    generateReloanReport: async (req, res) => {
        try {
            const { format } = req.params;
            const reloans = await Loan.find({ isReloan: true })
                .populate('customerId', 'fullName nrcNumber')
                .populate('parentLoanId', 'loanAmount');
            
            const columns = ['Customer Name', 'NRC Number', 'Loan Amount', 'Parent Loan Amount', 'Status', 'Created Date'];
            const data = reloans.map(loan => ({
                customername: loan.customerName,
                nrcnumber: loan.customerNRC,
                loanamount: loan.loanAmount,
                parentloanamount: loan.parentLoanId?.loanAmount || 'N/A',
                status: loan.status,
                createddate: loan.createdAt.toLocaleDateString()
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Reloans Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="reloans-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Reloans Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="reloans-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate reloan report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating reloan report' 
            });
        }
    },

    // Generate monthly report
    generateMonthlyReport: async (req, res) => {
        try {
            const { year, month, format } = req.params;
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            
            // Get loans created in the specified month
            const monthlyLoans = await Loan.find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).populate('customerId', 'fullName nrcNumber');
            
            // Get payments made in the specified month
            const monthlyPayments = await Payment.find({
                paymentDate: { $gte: startDate, $lte: endDate },
                status: 'Completed'
            });
            
            // Calculate totals
            const totalPrincipal = monthlyLoans.reduce((sum, loan) => sum + loan.loanAmount, 0);
            const totalInterest = monthlyLoans.reduce((sum, loan) => sum + (loan.totalAmount - loan.loanAmount), 0);
            const totalPaymentsReceived = monthlyPayments.reduce((sum, payment) => sum + payment.paymentAmount, 0);
            const totalOutstanding = monthlyLoans.reduce((sum, loan) => sum + (loan.remainingBalance || 0), 0);
            
            const columns = ['Customer Name', 'Loan Amount', 'Interest Amount', 'Total Amount', 'Remaining Balance', 'Status'];
            const data = monthlyLoans.map(loan => ({
                customername: loan.customerName,
                loanamount: loan.loanAmount,
                interestamount: loan.totalAmount - loan.loanAmount,
                totalamount: loan.totalAmount,
                remainingbalance: loan.remainingBalance,
                status: loan.status
            }));
            
            // Add summary row
            data.push({
                customername: 'TOTAL',
                loanamount: totalPrincipal,
                interestamount: totalInterest,
                totalamount: totalPrincipal + totalInterest,
                remainingbalance: totalOutstanding,
                status: `Payments Received: ${totalPaymentsReceived}`
            });
            
            const title = `Monthly Report - ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
            
            if (format === 'pdf') {
                const doc = await generatePDF(title, data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${year}-${month}.pdf"`);
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel(title, data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${year}-${month}.xlsx"`);
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate monthly report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating monthly report' 
            });
        }
    },

    // Generate period report
    generatePeriodReport: async (req, res) => {
        try {
            const { startDate, endDate, format } = req.params;
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            const periodLoans = await Loan.find({
                createdAt: { $gte: start, $lte: end }
            }).populate('customerId', 'fullName nrcNumber');
            
            const periodPayments = await Payment.find({
                paymentDate: { $gte: start, $lte: end },
                status: 'Completed'
            });
            
            const columns = ['Customer Name', 'Loan Amount', 'Total Amount', 'Remaining Balance', 'Status', 'Created Date'];
            const data = periodLoans.map(loan => ({
                customername: loan.customerName,
                loanamount: loan.loanAmount,
                totalamount: loan.totalAmount,
                remainingbalance: loan.remainingBalance,
                status: loan.status,
                createddate: loan.createdAt.toLocaleDateString()
            }));
            
            const title = `Period Report - ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
            
            if (format === 'pdf') {
                const doc = await generatePDF(title, data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="period-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel(title, data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="period-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate period report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating period report' 
            });
        }
    },

    // Generate portfolio report
    generatePortfolioReport: async (req, res) => {
        try {
            const { format } = req.params;
            
            const portfolioStats = await Loan.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$loanAmount' },
                        totalOutstanding: { $sum: '$remainingBalance' }
                    }
                }
            ]);
            
            const columns = ['Status', 'Count', 'Total Amount', 'Outstanding Amount'];
            const data = portfolioStats.map(stat => ({
                status: stat._id,
                count: stat.count,
                totalamount: stat.totalAmount,
                outstandingamount: stat.totalOutstanding
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Portfolio Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="portfolio-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Portfolio Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="portfolio-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate portfolio report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating portfolio report' 
            });
        }
    },

    // Generate profitability report
    generateProfitabilityReport: async (req, res) => {
        try {
            const { format } = req.params;
            
            const completedLoans = await Loan.find({ status: 'Completed' });
            const totalInterestEarned = completedLoans.reduce((sum, loan) => sum + (loan.totalAmount - loan.loanAmount), 0);
            const totalPrincipal = completedLoans.reduce((sum, loan) => sum + loan.loanAmount, 0);
            
            const columns = ['Metric', 'Value'];
            const data = [
                { metric: 'Total Completed Loans', value: completedLoans.length },
                { metric: 'Total Principal', value: totalPrincipal },
                { metric: 'Total Interest Earned', value: totalInterestEarned },
                { metric: 'Average Interest per Loan', value: completedLoans.length > 0 ? (totalInterestEarned / completedLoans.length).toFixed(2) : 0 }
            ];
            
            if (format === 'pdf') {
                const doc = await generatePDF('Profitability Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="profitability-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Profitability Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="profitability-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate profitability report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating profitability report' 
            });
        }
    },

    // Generate cash flow report
    generateCashFlowReport: async (req, res) => {
        try {
            const { format } = req.params;
            
            const monthlyData = await Payment.aggregate([
                { $match: { status: 'Completed' } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$paymentDate' },
                            month: { $month: '$paymentDate' }
                        },
                        totalInflow: { $sum: '$paymentAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: 12 }
            ]);
            
            const columns = ['Month', 'Year', 'Total Inflow', 'Payment Count'];
            const data = monthlyData.map(item => ({
                month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'long' }),
                year: item._id.year,
                totalinflow: item.totalInflow,
                paymentcount: item.count
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Cash Flow Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="cash-flow-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Cash Flow Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="cash-flow-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate cash flow report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating cash flow report' 
            });
        }
    },

    // Generate default analysis report
    generateDefaultAnalysisReport: async (req, res) => {
        try {
            const { format } = req.params;
            
            const defaultedLoans = await Loan.find({ status: 'Defaulted' })
                .populate('customerId', 'fullName nrcNumber');
            
            const overdueLoans = await Loan.find({ status: 'Overdue' })
                .populate('customerId', 'fullName nrcNumber');
            
            const columns = ['Customer Name', 'NRC Number', 'Loan Amount', 'Outstanding Amount', 'Status', 'Due Date'];
            const data = [...defaultedLoans, ...overdueLoans].map(loan => ({
                customername: loan.customerName,
                nrcnumber: loan.customerNRC,
                loanamount: loan.loanAmount,
                outstandingamount: loan.remainingBalance,
                status: loan.status,
                duedate: loan.dueDate.toLocaleDateString()
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Default Analysis Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="default-analysis-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Default Analysis Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="default-analysis-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate default analysis report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating default analysis report' 
            });
        }
    },

    // Generate portfolio health report
    generatePortfolioHealthReport: async (req, res) => {
        try {
            const { format } = req.params;
            
            const totalLoans = await Loan.countDocuments();
            const activeLoans = await Loan.countDocuments({ status: 'Active' });
            const overdueLoans = await Loan.countDocuments({ status: 'Overdue' });
            const completedLoans = await Loan.countDocuments({ status: 'Completed' });
            
            const healthMetrics = [
                { metric: 'Total Loans', value: totalLoans },
                { metric: 'Active Loans', value: activeLoans },
                { metric: 'Overdue Loans', value: overdueLoans },
                { metric: 'Completed Loans', value: completedLoans },
                { metric: 'Overdue Rate (%)', value: totalLoans > 0 ? ((overdueLoans / totalLoans) * 100).toFixed(2) : 0 },
                { metric: 'Completion Rate (%)', value: totalLoans > 0 ? ((completedLoans / totalLoans) * 100).toFixed(2) : 0 }
            ];
            
            const columns = ['Metric', 'Value'];
            const data = healthMetrics.map(item => ({
                metric: item.metric,
                value: item.value
            }));
            
            if (format === 'pdf') {
                const doc = await generatePDF('Portfolio Health Report', data, columns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="portfolio-health-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel('Portfolio Health Report', data, columns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="portfolio-health-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate portfolio health report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating portfolio health report' 
            });
        }
    },

    // Generate custom report
    generateCustomReport: async (req, res) => {
        try {
            const { format } = req.params;
            const { reportType, filters, columns } = req.body;
            
            // This is a simplified custom report generator
            // In a real system, you'd have more sophisticated filtering and column selection
            
            let data = [];
            let title = 'Custom Report';
            
            switch (reportType) {
                case 'customers':
                    const customers = await Customer.find(filters || {});
                    data = customers.map(c => c.toObject());
                    title = 'Custom Customer Report';
                    break;
                case 'loans':
                    const loans = await Loan.find(filters || {});
                    data = loans.map(l => l.toObject());
                    title = 'Custom Loan Report';
                    break;
                case 'payments':
                    const payments = await Payment.find(filters || {});
                    data = payments.map(p => p.toObject());
                    title = 'Custom Payment Report';
                    break;
                default:
                    return res.status(400).json({ 
                        success: false,
                        message: 'Invalid report type' 
                    });
            }
            
            const reportColumns = columns || ['_id', 'createdAt'];
            
            if (format === 'pdf') {
                const doc = await generatePDF(title, data, reportColumns);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="custom-report.pdf"');
                doc.pipe(res);
                doc.end();
            } else if (format === 'excel') {
                const workbook = await generateExcel(title, data, reportColumns);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="custom-report.xlsx"');
                await workbook.xlsx.write(res);
                res.end();
            }
        } catch (error) {
            console.error('Generate custom report error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error generating custom report' 
            });
        }
    },

    // Get report templates
    getReportTemplates: async (req, res) => {
        try {
            const templates = [
                { id: 'customers', name: 'Customer Details Report', description: 'All customer information' },
                { id: 'overdue', name: 'Overdue Loans Report', description: 'Loans that are overdue' },
                { id: 'active', name: 'Active Loans Report', description: 'Currently active loans' },
                { id: 'completed', name: 'Completed Loans Report', description: 'Fully paid loans' },
                { id: 'payments', name: 'Payments Report', description: 'All payment records' },
                { id: 'reloans', name: 'Reloans Report', description: 'Reloan transactions' },
                { id: 'monthly', name: 'Monthly Report', description: 'Monthly financial summary' },
                { id: 'portfolio', name: 'Portfolio Report', description: 'Portfolio overview' }
            ];
            
            res.json({
                success: true,
                templates
            });
        } catch (error) {
            console.error('Get report templates error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error getting report templates' 
            });
        }
    },

    // Create report template
    createReportTemplate: async (req, res) => {
        try {
            const { name, description, reportType, filters, columns } = req.body;
            
            // In a real system, you'd save this to a ReportTemplate model
            const template = {
                id: Date.now().toString(),
                name,
                description,
                reportType,
                filters,
                columns,
                createdBy: req.user.id,
                createdAt: new Date()
            };
            
            res.json({
                success: true,
                message: 'Report template created successfully',
                template
            });
        } catch (error) {
            console.error('Create report template error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error creating report template' 
            });
        }
    }
};

module.exports = reportController;