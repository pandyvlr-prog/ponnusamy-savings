const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, 'js', 'pdf.js');
let content = fs.readFileSync(pdfPath, 'utf8');

// Change PDF orientation
content = content.replace(/orientation:\s*'landscape'/g, "orientation: 'portrait'");

// Swap A4 width/height constants
content = content.replace(/const A4_WIDTH = 297;/g, "const A4_WIDTH = 210;");
content = content.replace(/const A4_HEIGHT = 210;/g, "const A4_HEIGHT = 297;");

// Update wrapper widths
content = content.replace(/wrapper\.style\.width = '1400px';/g, "wrapper.style.width = '1000px';");

// Update pixel to mm conversion math in calculateDynamicRowsPerPage
content = content.replace(/const pxPerMm = 3\.779527559 \* scaleFactor;/g, "const pxPerMm = (1000 / 190) * scaleFactor;");
content = content.replace(/const availableHeightMm = 210 - 25;/g, "const availableHeightMm = 297 - 25;");

// Reduce font sizes and paddings globally to fit portrait
content = content.replace(/font-size:\s*13px;/g, "font-size: 11.5px;");
content = content.replace(/font-size:\s*14px;/g, "font-size: 12px;");
content = content.replace(/font-size:\s*12px;/g, "font-size: 11px;");
content = content.replace(/padding:\s*12px 10px;/g, "padding: 10px 4px;");
content = content.replace(/padding:\s*15px 10px;/g, "padding: 12px 4px;");

// Let's add specific widths to the table headers in all 3 templates to control the layout better.
// The headers are identical in generatePdfReport and generateGlobalPdfReport.
const oldThead = `<tr style="background-color: #111827;">
                                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>
                                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>
                                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>
                                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>
                                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Month</th>
                                    <th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>
                                    <th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount</th>
                                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>
                                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>
                                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>
                                </tr>`;

const newThead = `<tr style="background-color: #111827;">
                                    <th style="width: 4%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>
                                    <th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>
                                    <th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>
                                    <th style="width: 13%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>
                                    <th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Month</th>
                                    <th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>
                                    <th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount</th>
                                    <th style="width: 10%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>
                                    <th style="width: 8%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>
                                    <th style="width: 3%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>
                                </tr>`;

// Replace globally (it appears in generatePdfReport)
content = content.split(oldThead).join(newThead);

// The global report has the exact same headers except "Month" is wrapped in a flex div.
// Let's just use regex to target the generic headers.
content = content.replace(/<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S\.No<\/th>/g, '<th style="width: 4%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name<\/th>/g, '<th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group<\/th>/g, '<th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme<\/th>/g, '<th style="width: 13%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount<\/th>/g, '<th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount<\/th>/g, '<th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount</th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date<\/th>/g, '<th style="width: 10%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken<\/th>/g, '<th style="width: 8%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"><\/th>/g, '<th style="width: 3%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>');
content = content.replace(/<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">\\s*<div.*?Month\\s*<\/div>\\s*<\/th>/gs, match => {
    return match.replace('<th style="', '<th style="width: 6%; ');
});

// Update word-wrap so long names wrap instead of breaking table layout
content = content.replace(/text-transform: uppercase;/g, 'text-transform: uppercase; word-break: break-word; white-space: normal;');


fs.writeFileSync(pdfPath, content, 'utf8');
console.log('PDF patched successfully for A4 Portrait');
