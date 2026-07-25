const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const formatMoney = (val) => {
  const num = Number(val || 0);
  return 'INR ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const generateInvoicePDF = (invoice, order, client, setting, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Color Palette
      const primaryColor = '#0F172A'; // Slate 900
      const accentColor = '#4F46E5';  // Indigo 600
      const textColor = '#334155';    // Slate 700
      const lightBg = '#F8FAFC';      // Slate 50
      const borderColor = '#E2E8F0';  // Slate 200

      // Top Banner Accent Line
      doc.rect(40, 25, 515, 4).fill(accentColor);

      // Header: Logo & Company Info (Left)
      const logoPath = path.join(__dirname, '../assets/logo.png');
      let textStartY = 42;

      if (fs.existsSync(logoPath)) {
        try {
          // Render Kevalon Technology Logo Image cleanly with generous height gap
          doc.image(logoPath, 40, 38, { width: 150 });
          textStartY = 92; // Ensures 54px vertical space so text NEVER overlaps with logo image
        } catch (e) {
          doc
            .fillColor(accentColor)
            .fontSize(20)
            .font('Helvetica-Bold')
            .text(setting?.companyName || 'KEVALON TECHNOLOGY', 40, 42);
          textStartY = 68;
        }
      } else {
        doc
          .fillColor(accentColor)
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(setting?.companyName || 'KEVALON TECHNOLOGY', 40, 42);
        textStartY = 68;
      }

      const companyAddress = setting?.address || '913, Solaris Business Hub, Sola Road, Parshwanath Jain BRTS, Bhuyangdev, Ahmedabad, Gujarat 380013, India.';
      const companyGstin = setting?.gstNumber || '24BQSPH0154B1Z9';
      const companyEmail = setting?.email || 'sales@kevalontechnology.in';
      const companyPhone = setting?.phone || '+91 98252 47990';

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor(textColor)
        .text(setting?.tagline || 'Tapzy NFC Business & Google Review Cards', 40, textStartY)
        .text(`Address: ${companyAddress}`, 40, textStartY + 13, { width: 265 })
        .text(`GSTIN: ${companyGstin} | State: Gujarat (24)`, 40, textStartY + 45)
        .text(`Email: ${companyEmail} | Phone: ${companyPhone}`, 40, textStartY + 58);

      // Header: TAX INVOICE Title & Metadata (Right)
      doc
        .fillColor(accentColor)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('GST TAX INVOICE', 320, 38, { align: 'right' });

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(`Invoice No: ${invoice?.invoiceNumber || 'INV-2026-0001'}`, 320, 66, { align: 'right' })
        .font('Helvetica')
        .fillColor(textColor)
        .text(`Invoice Date: ${new Date(invoice?.invoiceDate || Date.now()).toLocaleDateString('en-IN')}`, 320, 80, { align: 'right' })
        .text(`Order Ref: ${order?.orderNumber || 'ORD-2026-0001'}`, 320, 94, { align: 'right' })
        .text(`Payment Status: ${(order?.paymentStatus || 'Paid').toUpperCase()}`, 320, 108, { align: 'right' });

      // Horizontal Section Divider Line
      const sectionDividerY = textStartY + 76;
      doc.moveTo(40, sectionDividerY).lineTo(555, sectionDividerY).strokeColor(borderColor).lineWidth(1).stroke();

      // Billed From & Billed To Boxes
      const boxY = sectionDividerY + 10;
      const boxWidth = 250;
      const boxHeight = 98;

      // Seller Box (Left)
      doc.rect(40, boxY, boxWidth, boxHeight).fillAndStroke(lightBg, borderColor);
      doc
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('BILLED FROM (SUPPLIER)', 50, boxY + 7)
        .fillColor(primaryColor)
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text(setting?.companyName || 'KEVALON TECHNOLOGY', 50, boxY + 20)
        .fillColor(textColor)
        .fontSize(8)
        .font('Helvetica')
        .text(companyAddress, 50, boxY + 33, { width: 230 })
        .text(`GSTIN: ${companyGstin}`, 50, boxY + 65)
        .text(`Contact: ${companyPhone} | ${companyEmail}`, 50, boxY + 78, { width: 230 });

      // Buyer Box (Right)
      doc.rect(305, boxY, boxWidth, boxHeight).fillAndStroke(lightBg, borderColor);
      doc
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('BILLED TO (BUYER / CLIENT)', 315, boxY + 7)
        .fillColor(primaryColor)
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text(client?.companyName || 'Client Company', 315, boxY + 20)
        .fillColor(textColor)
        .fontSize(8)
        .font('Helvetica')
        .text(`Attn: ${client?.ownerName || 'Valued Client'}`, 315, boxY + 33)
        .text(`Address: ${client?.address || ''}, ${client?.city || ''}, ${client?.state || ''} - ${client?.pincode || ''}`, 315, boxY + 46, { width: 230 })
        .text(`GSTIN: ${client?.gstNumber || 'Unregistered / Consumer'}`, 315, boxY + 68)
        .text(`Phone: ${client?.mobile || 'N/A'} | Email: ${client?.email || 'N/A'}`, 315, boxY + 80, { width: 230 });

      // Items Table Header
      const tableTop = boxY + boxHeight + 15;
      doc.rect(40, tableTop, 515, 22).fill(primaryColor);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('#', 45, tableTop + 6, { width: 20, align: 'center' })
        .text('Product / Service Description', 70, tableTop + 6, { width: 190 })
        .text('HSN/SAC', 265, tableTop + 6, { width: 55, align: 'center' })
        .text('Qty', 325, tableTop + 6, { width: 30, align: 'center' })
        .text('Unit Price', 360, tableTop + 6, { width: 65, align: 'right' })
        .text('GST', 430, tableTop + 6, { width: 35, align: 'center' })
        .text('Amount (INR)', 470, tableTop + 6, { width: 80, align: 'right' });

      let currentY = tableTop + 24;
      doc.fillColor(textColor).font('Helvetica').fontSize(8.5);

      const items = order?.items || [];
      items.forEach((item, index) => {
        const bg = index % 2 === 0 ? '#FFFFFF' : lightBg;
        doc.rect(40, currentY - 2, 515, 22).fillAndStroke(bg, '#F1F5F9');

        const unitPrice = item.unitPrice || 0;
        const qty = item.quantity || 1;
        const subtotal = item.subtotal || unitPrice * qty;
        const gstPct = item.gstPercentage !== undefined ? item.gstPercentage : 18;

        doc
          .fillColor(textColor)
          .text((index + 1).toString(), 45, currentY + 3, { width: 20, align: 'center' })
          .text(item.productName || 'Tapzy NFC Product', 70, currentY + 3, { width: 190, height: 16 })
          .text('85235200', 265, currentY + 3, { width: 55, align: 'center' })
          .text(qty.toString(), 325, currentY + 3, { width: 30, align: 'center' })
          .text(unitPrice.toFixed(2), 360, currentY + 3, { width: 65, align: 'right' })
          .text(`${gstPct}%`, 430, currentY + 3, { width: 35, align: 'center' })
          .font('Helvetica-Bold')
          .text(subtotal.toFixed(2), 470, currentY + 3, { width: 80, align: 'right' })
          .font('Helvetica');

        currentY += 22;
      });

      // Bottom Section: Payment Details (Left) & Financial Totals (Right)
      currentY += 15;
      const bottomY = currentY;

      // Bank Details (Left)
      const bankDetails = setting?.bankDetails || {};
      doc.rect(40, bottomY, 255, 120).fillAndStroke(lightBg, borderColor);
      doc
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('BANK & PAYMENT DETAILS', 50, bottomY + 7)
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(8)
        .text(`Account Name: ${bankDetails.accountName || 'Kevalon Technology Private Limited'}`, 50, bottomY + 22)
        .text(`Bank Name: ${bankDetails.bankName || 'YES BANK / HDFC BANK'}`, 50, bottomY + 35)
        .text(`Account Number: ${bankDetails.accountNumber || '0420061900003890'}`, 50, bottomY + 48)
        .text(`IFSC Code: ${bankDetails.ifscCode || 'YESB0000420'}`, 50, bottomY + 61)
        .text(`Branch: ${bankDetails.branch || 'Shahibug, Ahmedabad'}`, 50, bottomY + 74)
        .text('UPI ID: kevalon@hdfcbank', 50, bottomY + 87);

      // Financial Totals Breakdown (Right)
      const subTotal = order?.subTotal || 0;
      const discount = order?.discount || 0;
      const taxableValue = Math.max(0, subTotal - discount);
      const totalGst = order?.totalGst || 0;
      const cgst = totalGst / 2;
      const sgst = totalGst / 2;
      const grandTotal = order?.grandTotal || (taxableValue + totalGst);

      const summaryX = 310;
      let sumY = bottomY;

      doc.fontSize(8.5).font('Helvetica');

      // Gross Product Subtotal
      doc.fillColor(textColor).text('Gross Subtotal:', summaryX, sumY).text(formatMoney(subTotal), 440, sumY, { align: 'right' });
      sumY += 15;

      // Less Discount
      if (discount > 0) {
        doc.text('Less: Discount:', summaryX, sumY).text(`- ${formatMoney(discount)}`, 440, sumY, { align: 'right' });
        sumY += 15;
      }

      // Net Taxable Value
      doc.font('Helvetica-Bold').text('Net Taxable Value:', summaryX, sumY).text(formatMoney(taxableValue), 440, sumY, { align: 'right' }).font('Helvetica');
      sumY += 15;

      // Dynamic Tax Rates
      const avgGstPct = items.length > 0 && taxableValue > 0 ? (totalGst / taxableValue) * 100 : 18;
      const halfGstPct = (avgGstPct / 2).toFixed(1).replace(/\.0$/, '');

      // CGST
      doc.text(`Central GST (CGST ${halfGstPct}%):`, summaryX, sumY).text(`+ ${formatMoney(cgst)}`, 440, sumY, { align: 'right' });
      sumY += 15;

      // SGST
      doc.text(`State GST (SGST ${halfGstPct}%):`, summaryX, sumY).text(`+ ${formatMoney(sgst)}`, 440, sumY, { align: 'right' });
      sumY += 18;

      // Grand Total Highlight Box
      doc.rect(summaryX, sumY, 245, 28).fill(accentColor);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('GRAND TOTAL AMOUNT:', summaryX + 8, sumY + 9)
        .text(formatMoney(grandTotal), 435, sumY + 9, { align: 'right' });

      // Footer Terms & Signature Stamp
      const footerY = bottomY + 135;

      doc
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(8)
        .text('Terms & Conditions:', 40, footerY)
        .text('1. Goods once sold will not be returned or exchanged.', 40, footerY + 12)
        .text('2. Payment is due within 7 days of invoice date.', 40, footerY + 22)
        .text('3. Subject to Ahmedabad, Gujarat jurisdiction.', 40, footerY + 32);

      // Authorized Signatory
      doc.rect(360, footerY, 195, 55).strokeColor(borderColor).stroke();
      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('For KEVALON TECHNOLOGY', 370, footerY + 6, { align: 'center' })
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(8)
        .text('Authorized Signatory Stamp', 370, footerY + 38, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };
