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

      // Create Landscape / Horizontal A4 Page (Width: 841.89pt, Height: 595.28pt)
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Enterprise Color Palette
      const primaryColor = '#0F172A'; // Slate 900
      const accentColor = '#4F46E5';  // Indigo 600
      const textColor = '#334155';    // Slate 700
      const lightBg = '#F8FAFC';      // Slate 50
      const borderColor = '#CBD5E1';  // Slate 300

      const pageWidth = 841.89;
      const margin = 30;
      const contentWidth = pageWidth - margin * 2; // 781.89

      // Top Accent Header Line
      doc.rect(margin, 20, contentWidth, 4).fill(accentColor);

      // 1. TOP HEADER (Logo & Supplier Info on Left, Invoice Metadata on Right)
      const logoPath = path.join(__dirname, '../assets/logo.png');

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, margin, 30, { fit: [180, 50] });
        } catch (e) {
          doc
            .fillColor(accentColor)
            .fontSize(22)
            .font('Helvetica-Bold')
            .text(setting?.companyName || 'KEVALON TECHNOLOGY', margin, 32);
        }
      } else {
        doc
          .fillColor(accentColor)
          .fontSize(22)
          .font('Helvetica-Bold')
          .text(setting?.companyName || 'KEVALON TECHNOLOGY', margin, 32);
      }

      // TAX INVOICE Title & Metadata (Top Right)
      const rightX = 500;
      const rightWidth = contentWidth - (rightX - margin);

      doc
        .fillColor(accentColor)
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('GST TAX INVOICE', rightX, 28, { width: rightWidth, align: 'right' });

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(`Invoice No: ${invoice?.invoiceNumber || 'INV-2026-0001'}`, rightX, 56, { width: rightWidth, align: 'right' })
        .font('Helvetica')
        .fillColor(textColor)
        .text(`Invoice Date: ${new Date(invoice?.invoiceDate || Date.now()).toLocaleDateString('en-IN')}`, rightX, 70, { width: rightWidth, align: 'right' })
        .text(`Order Ref: ${order?.orderNumber || 'ORD-2026-0001'}`, rightX, 84, { width: rightWidth, align: 'right' })
        .text(`Payment Status: ${(order?.paymentStatus || 'Paid').toUpperCase()}`, rightX, 98, { width: rightWidth, align: 'right' });

      // Horizontal Divider
      const headerDividerY = 116;
      doc.moveTo(margin, headerDividerY).lineTo(pageWidth - margin, headerDividerY).strokeColor(borderColor).lineWidth(1).stroke();

      // 2. SIDE-BY-SIDE BILLED FROM & BILLED TO CARDS (WIDE LANDSCAPE LAYOUT)
      const companyAddress = setting?.address || '913, Solaris Business Hub, Sola Road, Parshwanath Jain BRTS, Bhuyangdev, Ahmedabad, Gujarat 380013, India.';
      const companyGstin = setting?.gstNumber || '24BQSPH0154B1Z9';
      const companyEmail = setting?.email || 'sales@kevalontechnology.in';
      const companyPhone = setting?.phone || '+91 98252 47990';

      const boxY = 124;
      const halfBoxWidth = (contentWidth - 20) / 2; // 380.94
      const boxHeight = 90;

      // Billed From Box (Left)
      doc.rect(margin, boxY, halfBoxWidth, boxHeight).fillAndStroke(lightBg, borderColor);
      doc
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('BILLED FROM (SUPPLIER DETAILS)', margin + 10, boxY + 6)
        .fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(setting?.companyName || 'KEVALON TECHNOLOGY', margin + 10, boxY + 18)
        .fillColor(textColor)
        .fontSize(8)
        .font('Helvetica')
        .text(setting?.tagline || 'Tapzy NFC Business & Google Review Cards', margin + 10, boxY + 30)
        .text(`Address: ${companyAddress}`, margin + 10, boxY + 42, { width: halfBoxWidth - 20 })
        .text(`GSTIN: ${companyGstin} | State: Gujarat (24)`, margin + 10, boxY + 64)
        .text(`Email: ${companyEmail} | Phone: ${companyPhone}`, margin + 10, boxY + 76, { width: halfBoxWidth - 20 });

      // Billed To Box (Right)
      const boxRightX = margin + halfBoxWidth + 20;
      doc.rect(boxRightX, boxY, halfBoxWidth, boxHeight).fillAndStroke(lightBg, borderColor);
      doc
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('BILLED TO (BUYER / CLIENT DETAILS)', boxRightX + 10, boxY + 6)
        .fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(client?.companyName || 'Client Company', boxRightX + 10, boxY + 18)
        .fillColor(textColor)
        .fontSize(8)
        .font('Helvetica')
        .text(`Attn: ${client?.ownerName || 'Valued Client'}`, boxRightX + 10, boxY + 30)
        .text(`Address: ${client?.address || ''}, ${client?.city || ''}, ${client?.state || ''} - ${client?.pincode || ''}`, boxRightX + 10, boxY + 42, { width: halfBoxWidth - 20 })
        .text(`GSTIN: ${client?.gstNumber || 'Unregistered / Consumer'}`, boxRightX + 10, boxY + 64)
        .text(`Phone: ${client?.mobile || 'N/A'} | Email: ${client?.email || 'N/A'}`, boxRightX + 10, boxY + 76, { width: halfBoxWidth - 20 });

      // 3. WIDE HORIZONTAL ITEMIZED PRODUCTS TABLE
      const tableTop = boxY + boxHeight + 12;
      doc.rect(margin, tableTop, contentWidth, 20).fill(primaryColor);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('#', margin + 5, tableTop + 5, { width: 30, align: 'center' })
        .text('Product / Service Description', margin + 40, tableTop + 5, { width: 330 })
        .text('HSN/SAC', margin + 375, tableTop + 5, { width: 70, align: 'center' })
        .text('Qty', margin + 450, tableTop + 5, { width: 40, align: 'center' })
        .text('Unit Price (INR)', margin + 495, tableTop + 5, { width: 90, align: 'right' })
        .text('GST %', margin + 590, tableTop + 5, { width: 50, align: 'center' })
        .text('Amount (INR)', margin + 645, tableTop + 5, { width: 130, align: 'right' });

      let currentY = tableTop + 22;
      doc.fillColor(textColor).font('Helvetica').fontSize(8.5);

      const items = order?.items || [];
      items.forEach((item, index) => {
        const bg = index % 2 === 0 ? '#FFFFFF' : lightBg;
        doc.rect(margin, currentY - 2, contentWidth, 20).fillAndStroke(bg, '#F1F5F9');

        const unitPrice = item.unitPrice || 0;
        const qty = item.quantity || 1;
        const subtotal = item.subtotal || unitPrice * qty;
        const gstPct = item.gstPercentage !== undefined ? item.gstPercentage : 18;

        doc
          .fillColor(textColor)
          .text((index + 1).toString(), margin + 5, currentY + 3, { width: 30, align: 'center' })
          .text(item.productName || 'Tapzy NFC Product', margin + 40, currentY + 3, { width: 330, height: 14 })
          .text('85235200', margin + 375, currentY + 3, { width: 70, align: 'center' })
          .text(qty.toString(), margin + 450, currentY + 3, { width: 40, align: 'center' })
          .text(unitPrice.toFixed(2), margin + 495, currentY + 3, { width: 90, align: 'right' })
          .text(`${gstPct}%`, margin + 590, currentY + 3, { width: 50, align: 'center' })
          .font('Helvetica-Bold')
          .text(subtotal.toFixed(2), margin + 645, currentY + 3, { width: 130, align: 'right' })
          .font('Helvetica');

        currentY += 20;
      });

      // 4. HORIZONTAL FOOTER (Left: Bank & Terms, Right: Financial Totals Breakdown & Signature)
      currentY += 12;
      const bottomY = currentY;
      const leftColWidth = 380;
      const rightColX = margin + leftColWidth + 20;
      const rightColWidth = contentWidth - leftColWidth - 20; // 381.89

      // Left Column: Bank Details & Terms
      const bankDetails = setting?.bankDetails || {};
      doc.rect(margin, bottomY, leftColWidth, 100).fillAndStroke(lightBg, borderColor);
      doc
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('BANK & PAYMENT DETAILS', margin + 10, bottomY + 6)
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(8)
        .text(`Account Name: ${bankDetails.accountName || 'Kevalon Technology'}`, margin + 10, bottomY + 18)
        .text(`Bank: ${bankDetails.bankName || 'YES BANK '} | Account No: ${bankDetails.accountNumber || '0420061900003890'}`, margin + 10, bottomY + 30)
        .text(`IFSC Code: ${bankDetails.ifscCode || 'YESB0000420'} | Branch: ${bankDetails.branch || 'Shahibug, Ahmedabad'}`, margin + 10, bottomY + 42)
        .text('UPI ID: kevalontechnology-1@okhdfcbank', margin + 10, bottomY + 54);

      doc
        .fontSize(7.5)
        .fillColor(textColor)
        .text('Terms & Conditions:', margin + 10, bottomY + 68)
        .text('1. Goods once sold will not be returned or exchanged. 2. Subject to Ahmedabad jurisdiction.', margin + 10, bottomY + 79);

      // Right Column: Financial Totals Breakdown
      const subTotal = order?.subTotal || 0;
      const discount = order?.discount || 0;
      const taxableValue = Math.max(0, subTotal - discount);
      const totalGst = order?.totalGst || 0;
      const cgst = totalGst / 2;
      const sgst = totalGst / 2;
      const grandTotal = order?.grandTotal || (taxableValue + totalGst);

      let sumY = bottomY;
      doc.fontSize(8.5).font('Helvetica');

      // Gross Product Subtotal
      doc.fillColor(textColor).text('Gross Subtotal:', rightColX, sumY).text(formatMoney(subTotal), rightColX + 160, sumY, { width: 200, align: 'right' });
      sumY += 14;

      // Less Discount
      if (discount > 0) {
        doc.text('Less: Discount:', rightColX, sumY).text(`- ${formatMoney(discount)}`, rightColX + 160, sumY, { width: 200, align: 'right' });
        sumY += 14;
      }

      // Net Taxable Value
      doc.font('Helvetica-Bold').text('Net Taxable Value:', rightColX, sumY).text(formatMoney(taxableValue), rightColX + 160, sumY, { width: 200, align: 'right' }).font('Helvetica');
      sumY += 14;

      // Dynamic Tax Rates
      const avgGstPct = items.length > 0 && taxableValue > 0 ? (totalGst / taxableValue) * 100 : 18;
      const halfGstPct = (avgGstPct / 2).toFixed(1).replace(/\.0$/, '');

      // CGST
      doc.text(`Central GST (CGST ${halfGstPct}%):`, rightColX, sumY).text(`+ ${formatMoney(cgst)}`, rightColX + 160, sumY, { width: 200, align: 'right' });
      sumY += 14;

      // SGST
      doc.text(`State GST (SGST ${halfGstPct}%):`, rightColX, sumY).text(`+ ${formatMoney(sgst)}`, rightColX + 160, sumY, { width: 200, align: 'right' });
      sumY += 16;

      // Grand Total Highlight Box
      doc.rect(rightColX, sumY, rightColWidth, 26).fill(accentColor);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('GRAND TOTAL AMOUNT:', rightColX + 10, sumY + 8)
        .text(formatMoney(grandTotal), rightColX + 160, sumY + 8, { width: 195, align: 'right' });

      // Authorized Signatory Stamp Box (Bottom Right)
      const stampY = sumY + 34;
      doc.rect(rightColX + 160, stampY, 200, 42).strokeColor(borderColor).stroke();
      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('For KEVALON TECHNOLOGY', rightColX + 160, stampY + 5, { width: 200, align: 'center' })
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(7.5)
        .text('Authorized Signatory Stamp', rightColX + 160, stampY + 26, { width: 200, align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };
