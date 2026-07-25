const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Indian Rupee Number to Words Converter
function numberToWordsINR(amount) {
  const num = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - num) * 100);

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    let str = '';
    const numStr = ('000000000' + n).slice(-9);
    const match = numStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return '';

    str += Number(match[1]) !== 0 ? (a[Number(match[1])] || b[match[1][0]] + ' ' + a[match[1][1]]) + 'Crore ' : '';
    str += Number(match[2]) !== 0 ? (a[Number(match[2])] || b[match[2][0]] + ' ' + a[match[2][1]]) + 'Lakh ' : '';
    str += Number(match[3]) !== 0 ? (a[Number(match[3])] || b[match[3][0]] + ' ' + a[match[3][1]]) + 'Thousand ' : '';
    str += Number(match[4]) !== 0 ? (a[Number(match[4])] || b[match[4][0]] + ' ' + a[match[4][1]]) + 'Hundred ' : '';
    str += Number(match[5]) !== 0 ? (a[Number(match[5])] || b[match[5][0]] + ' ' + a[match[5][1]]) : '';
    return str;
  }

  let words = inWords(num).trim();
  if (!words) words = 'Zero';
  let result = 'INR ' + words;
  if (paise > 0) {
    let paiseWords = inWords(paise).trim();
    result += ' And ' + paiseWords + ' Paise';
  }
  return result + ' Only';
}

const formatNum = (val) => {
  const num = Number(val || 0);
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const generateInvoicePDF = (invoice, order, client, setting, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Page dimensions
      const startX = 35;
      const totalWidth = 525;
      const midX = startX + 260; // 295
      const endX = startX + totalWidth; // 560

      const black = '#000000';
      const gray = '#475569';
      const lightGray = '#F1F5F9';

      // 1. TOP TITLE
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(black)
        .text('Tax Invoice', startX, 22, { width: totalWidth, align: 'center' });

      // 2. HEADER OUTER GRID BOX (Y = 38 to 206)
      const headerBoxTop = 38;
      const headerBoxHeight = 168;

      doc.rect(startX, headerBoxTop, totalWidth, headerBoxHeight).strokeColor(black).lineWidth(0.8).stroke();
      doc.moveTo(midX, headerBoxTop).lineTo(midX, headerBoxTop + headerBoxHeight).stroke();

      // LEFT COLUMN - SUPPLIER DETAILS
      const logoPath = path.join(__dirname, '../assets/logo.png');
      let logoHeight = 32;

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, startX + 6, headerBoxTop + 4, { fit: [140, 32] });
        } catch (e) {
          doc.font('Helvetica-Bold').fontSize(10).text(setting?.companyName || 'KEVALON TECHNOLOGY', startX + 6, headerBoxTop + 6);
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(10).text(setting?.companyName || 'KEVALON TECHNOLOGY', startX + 6, headerBoxTop + 6);
      }

      const supplierTextY = headerBoxTop + logoHeight + 6; // Y = 76
      const companyAddress = setting?.address || '913, Solaris Business Hub, Sola Road, Bhuyangdev, Ahmedabad, Gujarat 380013, India.';
      const companyGstin = setting?.gstNumber || '24BQSPH0154B1Z9';
      const companyEmail = setting?.email || 'sales@kevalontechnology.in';
      const companyPhone = setting?.phone || '+91 98252 47990';

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(black)
        .text(companyAddress, startX + 6, supplierTextY, { width: 245, height: 20 })
        .text(`GSTIN/UIN: ${companyGstin} | State: Gujarat (24)`, startX + 6, supplierTextY + 20)
        .text(`E-Mail: ${companyEmail} | Phone: ${companyPhone}`, startX + 6, supplierTextY + 30);

      // Horizontal Divider inside Left Box for Buyer Section (Y = 122)
      const buyerDividerY = headerBoxTop + 84; // 122
      doc.moveTo(startX, buyerDividerY).lineTo(midX, buyerDividerY).stroke();

      // BUYER / CLIENT DETAILS
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(gray)
        .text('Buyer (Bill to)', startX + 6, buyerDividerY + 4)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(black)
        .text(client?.companyName || 'Valued Client Store', startX + 6, buyerDividerY + 14)
        .font('Helvetica')
        .fontSize(7.5)
        .text(`Attn: ${client?.ownerName || 'Client'}`, startX + 6, buyerDividerY + 25)
        .text(`${client?.address || ''}, ${client?.city || ''}, ${client?.state || ''} - ${client?.pincode || ''}`, startX + 6, buyerDividerY + 35, { width: 245, height: 18 })
        .text(`State Name : ${client?.state || 'Gujarat'}, Code : 24`, startX + 6, buyerDividerY + 54)
        .text(`GSTIN/UIN : ${client?.gstNumber || 'Unregistered'}`, startX + 6, buyerDividerY + 64);

      // RIGHT COLUMN - INVOICE META GRID CELLS (Each cell exactly 28px height)
      let gridY = headerBoxTop;

      // Cell 1: Invoice No & Dated
      doc.rect(midX, gridY, 132, 28).stroke();
      doc.rect(midX + 132, gridY, 133, 28).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Invoice No.', midX + 4, gridY + 3);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text(invoice?.invoiceNumber || 'INV-2026-0001', midX + 4, gridY + 13);
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Dated', midX + 136, gridY + 3);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text(new Date(invoice?.invoiceDate || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), midX + 136, gridY + 13);
      gridY += 28;

      // Cell 2: Delivery Note & Terms of Payment
      doc.rect(midX, gridY, 132, 28).stroke();
      doc.rect(midX + 132, gridY, 133, 28).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Delivery Note', midX + 4, gridY + 3);
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Mode/Terms of Payment', midX + 136, gridY + 3);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text((order?.paymentStatus || 'Paid').toUpperCase(), midX + 136, gridY + 13);
      gridY += 28;

      // Cell 3: Supplier's Ref & Other Reference
      doc.rect(midX, gridY, 132, 28).stroke();
      doc.rect(midX + 132, gridY, 133, 28).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(gray).text("Supplier's Ref.", midX + 4, gridY + 3);
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Other Reference(s)', midX + 136, gridY + 3);
      gridY += 28;

      // Cell 4: Buyer's Order No & Dated
      doc.rect(midX, gridY, 132, 28).stroke();
      doc.rect(midX + 132, gridY, 133, 28).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(gray).text("Buyer's Order No.", midX + 4, gridY + 3);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text(order?.orderNumber || 'ORD-2026-0001', midX + 4, gridY + 13);
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Dated', midX + 136, gridY + 3);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text(new Date(order?.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), midX + 136, gridY + 13);
      gridY += 28;

      // Cell 5: Despatch Document No & Destination
      doc.rect(midX, gridY, 132, 28).stroke();
      doc.rect(midX + 132, gridY, 133, 28).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Despatch Document No.', midX + 4, gridY + 3);
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Destination', midX + 136, gridY + 3);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text(client?.city || 'Ahmedabad', midX + 136, gridY + 13);
      gridY += 28;

      // Cell 6: Despatched through & Terms of Delivery
      doc.rect(midX, gridY, 132, 28).stroke();
      doc.rect(midX + 132, gridY, 133, 28).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Despatched through', midX + 4, gridY + 3);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text('Surface Courier', midX + 4, gridY + 13);
      doc.font('Helvetica').fontSize(7).fillColor(gray).text('Terms of Delivery', midX + 136, gridY + 3);

      // 3. MAIN ITEM TABLE GRID (Y = 206 to 476)
      const tableTop = headerBoxTop + headerBoxHeight; // 206
      const tableHeight = 270;
      const tableBottom = tableTop + tableHeight; // 476

      // Outer border box for table
      doc.rect(startX, tableTop, totalWidth, tableHeight).stroke();

      // Column Header Height
      const headerRowHeight = 20;
      doc.rect(startX, tableTop, totalWidth, headerRowHeight).fillAndStroke(lightGray, black);

      // Column Positions
      const colX = {
        sl: startX,          // 35
        desc: startX + 25,    // 60
        hsn: startX + 245,   // 280
        qty: startX + 300,   // 335
        rate: startX + 345,  // 380
        per: startX + 405,   // 440
        amt: startX + 435,   // 470
      };

      doc.fillColor(black).font('Helvetica-Bold').fontSize(7.5);
      doc.text('Sl\nNo.', colX.sl, tableTop + 2, { width: 25, align: 'center' });
      doc.text('Description of Goods', colX.desc + 4, tableTop + 6, { width: 180 });
      doc.text('HSN/SAC', colX.hsn, tableTop + 6, { width: 55, align: 'center' });
      doc.text('Quantity', colX.qty, tableTop + 6, { width: 45, align: 'center' });
      doc.text('Rate', colX.rate, tableTop + 6, { width: 60, align: 'right' });
      doc.text('per', colX.per, tableTop + 6, { width: 30, align: 'center' });
      doc.text('Amount', colX.amt, tableTop + 6, { width: 85, align: 'right' });

      // Vertical Grid Lines down to Table Total Row
      const totalRowHeight = 20;
      const gridBottom = tableBottom - totalRowHeight;

      doc.moveTo(colX.desc, tableTop).lineTo(colX.desc, tableBottom).stroke();
      doc.moveTo(colX.hsn, tableTop).lineTo(colX.hsn, tableBottom).stroke();
      doc.moveTo(colX.qty, tableTop).lineTo(colX.qty, tableBottom).stroke();
      doc.moveTo(colX.rate, tableTop).lineTo(colX.rate, tableBottom).stroke();
      doc.moveTo(colX.per, tableTop).lineTo(colX.per, tableBottom).stroke();
      doc.moveTo(colX.amt, tableTop).lineTo(colX.amt, tableBottom).stroke();

      // Render Item Rows
      let itemY = tableTop + headerRowHeight + 6;
      const items = order?.items || [];
      let totalQuantity = 0;

      items.forEach((item, index) => {
        const unitPrice = item.unitPrice || 0;
        const qty = item.quantity || 1;
        const subtotal = item.subtotal || unitPrice * qty;
        totalQuantity += qty;

        doc.font('Helvetica').fontSize(8).fillColor(black);
        doc.text((index + 1).toString(), colX.sl, itemY, { width: 25, align: 'center' });
        doc.font('Helvetica-Bold').text(item.productName || 'Tapzy NFC Business Card', colX.desc + 4, itemY, { width: 180 });
        doc.font('Helvetica').text('85235200', colX.hsn, itemY, { width: 55, align: 'center' });
        doc.font('Helvetica-Bold').text(`${qty} Pcs`, colX.qty, itemY, { width: 45, align: 'center' });
        doc.font('Helvetica').text(formatNum(unitPrice), colX.rate, itemY, { width: 60, align: 'right' });
        doc.text('Pcs', colX.per, itemY, { width: 30, align: 'center' });
        doc.font('Helvetica-Bold').text(formatNum(subtotal), colX.amt, itemY, { width: 85, align: 'right' });

        itemY += 16;
      });

      // Calculate Financial Taxes
      const subTotal = order?.subTotal || 0;
      const discount = order?.discount || 0;
      const taxableValue = Math.max(0, subTotal - discount);
      const totalGst = order?.totalGst || 0;
      const cgst = totalGst / 2;
      const sgst = totalGst / 2;
      const grandTotal = order?.grandTotal || (taxableValue + totalGst);

      const avgGstPct = items.length > 0 && taxableValue > 0 ? (totalGst / taxableValue) * 100 : 18;
      const halfGstPct = (avgGstPct / 2).toFixed(1).replace(/\.0$/, '');

      // Less Discount Row inside Table
      if (discount > 0) {
        doc.font('Helvetica-Oblique').fontSize(8).text('Less: Special Discount', colX.desc + 40, itemY);
        doc.text(`- ${formatNum(discount)}`, colX.amt, itemY, { width: 85, align: 'right' });
        itemY += 16;
      }

      // Output CGST Row inside Table
      doc.font('Helvetica-BoldOblique').fontSize(8).text(`Output CGST @ ${halfGstPct}%`, colX.desc + 40, itemY);
      doc.font('Helvetica').text(`${halfGstPct} %`, colX.per - 25, itemY, { width: 50, align: 'right' });
      doc.font('Helvetica-Bold').text(formatNum(cgst), colX.amt, itemY, { width: 85, align: 'right' });
      itemY += 16;

      // Output SGST Row inside Table
      doc.font('Helvetica-BoldOblique').fontSize(8).text(`Output SGST @ ${halfGstPct}%`, colX.desc + 40, itemY);
      doc.font('Helvetica').text(`${halfGstPct} %`, colX.per - 25, itemY, { width: 50, align: 'right' });
      doc.font('Helvetica-Bold').text(formatNum(sgst), colX.amt, itemY, { width: 85, align: 'right' });

      // Table Footer Total Row (Y = 456 to 476)
      doc.rect(startX, gridBottom, totalWidth, totalRowHeight).fillAndStroke(lightGray, black);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(black);
      doc.text('Total', colX.desc - 30, gridBottom + 5, { width: 40, align: 'right' });
      doc.text(`${totalQuantity} Pcs`, colX.qty, gridBottom + 5, { width: 45, align: 'center' });
      doc.text(`INR ${formatNum(grandTotal)}`, colX.amt - 35, gridBottom + 5, { width: 120, align: 'right' });

      // 4. AMOUNT CHARGEABLE IN WORDS (Y = 476 to 501)
      const wordsBoxTop = tableBottom;
      const wordsBoxHeight = 25;
      doc.rect(startX, wordsBoxTop, totalWidth, wordsBoxHeight).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(gray).text('Amount Chargeable (in words)', startX + 6, wordsBoxTop + 3);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(black).text(numberToWordsINR(grandTotal), startX + 6, wordsBoxTop + 13);

      // 5. HSN/SAC TAX BREAKDOWN TABLE (Y = 501 to 566)
      const hsnTop = wordsBoxTop + wordsBoxHeight;
      const hsnHeight = 65;
      doc.rect(startX, hsnTop, totalWidth, hsnHeight).stroke();

      // HSN Header Row
      doc.rect(startX, hsnTop, totalWidth, 18).fillAndStroke(lightGray, black);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(black);

      const hsnCol = { hsn: startX, val: startX + 70, cgst: startX + 160, sgst: startX + 270, tot: startX + 380 };

      doc.text('HSN/SAC', hsnCol.hsn, hsnTop + 5, { width: 70, align: 'center' });
      doc.text('Taxable Value', hsnCol.val, hsnTop + 5, { width: 90, align: 'right' });
      doc.text(`Central Tax (${halfGstPct}%)`, hsnCol.cgst, hsnTop + 5, { width: 110, align: 'center' });
      doc.text(`State Tax (${halfGstPct}%)`, hsnCol.sgst, hsnTop + 5, { width: 110, align: 'center' });
      doc.text('Total Tax Amount', hsnCol.tot, hsnTop + 5, { width: 140, align: 'right' });

      // HSN Grid Vertical Lines
      doc.moveTo(hsnCol.val, hsnTop).lineTo(hsnCol.val, hsnTop + hsnHeight).stroke();
      doc.moveTo(hsnCol.cgst, hsnTop).lineTo(hsnCol.cgst, hsnTop + hsnHeight).stroke();
      doc.moveTo(hsnCol.sgst, hsnTop).lineTo(hsnCol.sgst, hsnTop + hsnHeight).stroke();
      doc.moveTo(hsnCol.tot, hsnTop).lineTo(hsnCol.tot, hsnTop + hsnHeight).stroke();

      // HSN Row 1 Data
      const hsnRowY = hsnTop + 22;
      doc.font('Helvetica').fontSize(7.5);
      doc.text('85235200', hsnCol.hsn, hsnRowY, { width: 70, align: 'center' });
      doc.text(formatNum(taxableValue), hsnCol.val, hsnRowY, { width: 90, align: 'right' });
      doc.text(formatNum(cgst), hsnCol.cgst, hsnRowY, { width: 110, align: 'center' });
      doc.text(formatNum(sgst), hsnCol.sgst, hsnRowY, { width: 110, align: 'center' });
      doc.text(formatNum(totalGst), hsnCol.tot, hsnRowY, { width: 140, align: 'right' });

      // HSN Total Row
      const hsnTotalY = hsnTop + 45;
      doc.rect(startX, hsnTotalY, totalWidth, 20).fillAndStroke(lightGray, black);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(black);
      doc.text('Total', hsnCol.hsn, hsnTotalY + 5, { width: 70, align: 'center' });
      doc.text(formatNum(taxableValue), hsnCol.val, hsnTotalY + 5, { width: 90, align: 'right' });
      doc.text(formatNum(cgst), hsnCol.cgst, hsnTotalY + 5, { width: 110, align: 'center' });
      doc.text(formatNum(sgst), hsnCol.sgst, hsnTotalY + 5, { width: 110, align: 'center' });
      doc.text(formatNum(totalGst), hsnCol.tot, hsnTotalY + 5, { width: 140, align: 'right' });

      // 6. TAX AMOUNT IN WORDS (Y = 566 to 586)
      const taxWordsY = hsnTop + hsnHeight;
      doc.rect(startX, taxWordsY, totalWidth, 20).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(gray).text('Tax Amount (in words) :', startX + 6, taxWordsY + 5);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text(numberToWordsINR(totalGst), startX + 110, taxWordsY + 5);

      // 7. FOOTER DECLARATION & AUTHORISED SIGNATORY (Y = 586 to 666)
      const footerBoxY = taxWordsY + 20;
      const footerBoxHeight = 80;
      doc.rect(startX, footerBoxY, totalWidth, footerBoxHeight).stroke();

      // Left Declaration Box
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(black)
        .text('Declaration:', startX + 6, footerBoxY + 6)
        .font('Helvetica')
        .fontSize(7)
        .text('1. Goods once sold will not be returned or exchanged.', startX + 6, footerBoxY + 18)
        .text('2. Payment is due within 7 days of invoice date.', startX + 6, footerBoxY + 28)
        .text('3. Subject to Ahmedabad, Gujarat jurisdiction.', startX + 6, footerBoxY + 38);

      // Right Authorised Signatory Box
      const sigX = startX + 310;
      doc.moveTo(sigX, footerBoxY).lineTo(sigX, footerBoxY + footerBoxHeight).stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(`for ${setting?.companyName || 'KEVALON TECHNOLOGY'}`, sigX + 10, footerBoxY + 10, { width: 195, align: 'right' })
        .font('Helvetica')
        .fontSize(7.5)
        .text('Authorised Signatory', sigX + 10, footerBoxY + 62, { width: 195, align: 'right' });

      // Centered Bottom Disclaimer Text
      doc
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor(gray)
        .text('This is a Computer Generated Document', startX, footerBoxY + footerBoxHeight + 8, { width: totalWidth, align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };
