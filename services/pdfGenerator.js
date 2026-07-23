const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoicePDF = (invoice, order, client, setting, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Colors
      const primaryColor = '#4F46E5';
      const textColor = '#1F2937';
      const lightBg = '#F3F4F6';

      // Header - Company Details
      doc
        .fillColor(primaryColor)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(setting.companyName || 'KEVALON TECHNOLOGY', 50, 40)
        .fontSize(10)
        .font('Helvetica')
        .fillColor(textColor)
        .text(setting.tagline || 'Tapzy NFC Business & Google Review Cards', 50, 68)
        .text(`GSTIN: ${setting.gstNumber || '24AAAAA0000A1Z5'}`, 50, 82)
        .text(`Email: ${setting.email || 'support@kevalon.com'} | Phone: ${setting.phone || '+91 98765 43210'}`, 50, 96);

      // Title & Invoice Info (Right Side)
      doc
        .fillColor(primaryColor)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 380, 40, { align: 'right' })
        .fontSize(10)
        .font('Helvetica')
        .fillColor(textColor)
        .text(`Invoice No: ${invoice.invoiceNumber}`, 380, 68, { align: 'right' })
        .text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 380, 82, { align: 'right' })
        .text(`Order Ref: ${order.orderNumber}`, 380, 96, { align: 'right' });

      // Divider Line
      doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#E5E7EB').lineWidth(1).stroke();

      // Billed To (Client Info)
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('BILLED TO:', 50, 130)
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(textColor)
        .text(client.companyName, 50, 148)
        .fontSize(10)
        .font('Helvetica')
        .text(`Attn: ${client.ownerName}`, 50, 162)
        .text(`Phone: ${client.mobile}`, 50, 176)
        .text(`Email: ${client.email}`, 50, 190)
        .text(`GSTIN: ${client.gstNumber || 'N/A'}`, 50, 204)
        .text(`Address: ${client.address}, ${client.city}, ${client.state} - ${client.pincode}`, 50, 218, { width: 250 });

      // Items Table Header
      const tableTop = 260;
      doc.rect(50, tableTop, 495, 24).fill(primaryColor);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Item Description', 60, tableTop + 7)
        .text('Qty', 270, tableTop + 7, { width: 40, align: 'center' })
        .text('Price (₹)', 320, tableTop + 7, { width: 60, align: 'right' })
        .text('GST %', 390, tableTop + 7, { width: 50, align: 'center' })
        .text('Total (₹)', 450, tableTop + 7, { width: 85, align: 'right' });

      let currentY = tableTop + 28;
      doc.fillColor(textColor).font('Helvetica').fontSize(9);

      order.items.forEach((item, index) => {
        const bg = index % 2 === 0 ? '#FFFFFF' : lightBg;
        doc.rect(50, currentY - 4, 495, 22).fill(bg);
        doc
          .fillColor(textColor)
          .text(item.productName, 60, currentY)
          .text(item.quantity.toString(), 270, currentY, { width: 40, align: 'center' })
          .text(item.unitPrice.toFixed(2), 320, currentY, { width: 60, align: 'right' })
          .text(`${item.gstPercentage}%`, 390, currentY, { width: 50, align: 'center' })
          .text(item.subtotal.toFixed(2), 450, currentY, { width: 85, align: 'right' });
        currentY += 22;
      });

      // Divider Line
      doc.moveTo(50, currentY + 5).lineTo(545, currentY + 5).strokeColor('#E5E7EB').lineWidth(1).stroke();
      currentY += 15;

      // Summary / Totals
      const summaryLeft = 320;
      doc.fontSize(10).font('Helvetica');
      doc.text('Subtotal:', summaryLeft, currentY).text(`₹ ${order.subTotal.toFixed(2)}`, 450, currentY, { align: 'right' });
      currentY += 16;

      if (order.discount > 0) {
        doc.text('Discount:', summaryLeft, currentY).text(`- ₹ ${order.discount.toFixed(2)}`, 450, currentY, { align: 'right' });
        currentY += 16;
      }

      doc.text('GST Amount (18%):', summaryLeft, currentY).text(`₹ ${order.totalGst.toFixed(2)}`, 450, currentY, { align: 'right' });
      currentY += 20;

      // Grand Total Highlight
      doc.rect(summaryLeft - 10, currentY - 4, 235, 26).fill(primaryColor);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Grand Total:', summaryLeft, currentY + 2)
        .text(`₹ ${order.grandTotal.toFixed(2)}`, 450, currentY + 2, { align: 'right' });

      currentY += 45;

      // Payment & Terms
      doc
        .fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('BANK & PAYMENT DETAILS', 50, currentY)
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(9)
        .text(`Account Name: ${setting.bankDetails?.accountName || 'Kevalon Technology Private Limited'}`, 50, currentY + 16)
        .text(`Account No: ${setting.bankDetails?.accountNumber || '99887766554433'} | Bank: ${setting.bankDetails?.bankName || 'HDFC Bank'}`, 50, currentY + 30)
        .text(`IFSC Code: ${setting.bankDetails?.ifscCode || 'HDFC0001234'} | Branch: ${setting.bankDetails?.branch || 'SG Highway'}`, 50, currentY + 44);

      // Stamp / Signature
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('For KEVALON TECHNOLOGY', 370, currentY, { align: 'right' })
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#6B7280')
        .text('(Authorized Signatory)', 370, currentY + 44, { align: 'right' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };
