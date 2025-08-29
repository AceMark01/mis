import jsPDF from 'jspdf';
import 'jspdf-autotable';


const drawPageBorder = (doc) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 3; // 10px outer margin
  
  doc.setDrawColor(10,10, 10); // Black border
  doc.setLineWidth(0.1); // Border thickness
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
};

const generateSemicircleChartImage = (topScorers) => {
  const canvas = document.createElement('canvas');
  const pixelRatio = window.devicePixelRatio || 2;

  const logicalWidth = 1400;
  const logicalHeight = 1400;

  canvas.width = logicalWidth * pixelRatio;
  canvas.height = logicalHeight * pixelRatio;
  canvas.style.width = logicalWidth + 'px';
  canvas.style.height = logicalHeight + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // === Background ===
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // === Card ===
  const cardMargin = 40;
  const cardWidth = logicalWidth - (cardMargin * 2);
  const cardHeight = logicalHeight - (cardMargin * 2);

  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cardMargin, cardMargin, cardWidth, cardHeight, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = 'transparent';

  // === Semicircle Setup ===
  const centerX = logicalWidth / 2;
  const centerY = cardMargin + 500;
  const outerRadius = 400;
  const innerRadius = 240; // tweak value as needed


  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const totalAngle = Math.PI;
  let currentAngle = Math.PI;

  const totalScore = topScorers.reduce((sum, emp) => sum + emp.score, 0);

  // Base semicircle
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, 0, Math.PI, true);
  ctx.arc(centerX, centerY, innerRadius, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#f3f4f6';
  ctx.fill();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Segments
  topScorers.forEach((emp, index) => {
    const segmentAngle = (emp.score / totalScore) * totalAngle;
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;
    const midAngle = startAngle + segmentAngle / 2;

    ctx.save();
    ctx.beginPath();

    if (segmentAngle > 0.15) {
      const outerStart = { x: centerX + Math.cos(startAngle) * outerRadius, y: centerY + Math.sin(startAngle) * outerRadius };
      const outerEnd = { x: centerX + Math.cos(endAngle) * outerRadius, y: centerY + Math.sin(endAngle) * outerRadius };
      const innerStart = { x: centerX + Math.cos(startAngle) * innerRadius, y: centerY + Math.sin(startAngle) * innerRadius };
      const innerEnd = { x: centerX + Math.cos(endAngle) * innerRadius, y: centerY + Math.sin(endAngle) * innerRadius };

      ctx.moveTo(innerStart.x, innerStart.y);
      ctx.lineTo(outerStart.x, outerStart.y);
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.lineTo(innerEnd.x, innerEnd.y);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
    } else {
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
    }

    const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
    gradient.addColorStop(0, colors[index]);
    gradient.addColorStop(1, colors[index] + 'cc');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();

    if (segmentAngle > 0.2) {
      const textRadius = (outerRadius + innerRadius) / 2;
      const textX = centerX + Math.cos(midAngle) * textRadius;
      const textY = centerY + Math.sin(midAngle) * textRadius;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(emp.score.toString(), textX, textY);
      ctx.shadowColor = 'transparent';
    }

    currentAngle += segmentAngle;
  });

  // === Legend Section (Scaled Up) ===
  const legendStartY = centerY + 150;
  const legendItemHeight = 50;
  const legendPadding = 40;

  const visibleScorers = topScorers.slice(0, 5);

  ctx.fillStyle = '#374151';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Performance Breakdown', cardMargin + legendPadding + 20, legendStartY);

  visibleScorers.forEach((emp, index) => {
    const y = legendStartY + 60 + (index * legendItemHeight);
    const x = cardMargin + legendPadding + 20;

    ctx.beginPath();
    ctx.arc(x + 12, y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = colors[index];
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#1f2937';
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let displayName = emp.name;
    const maxNameWidth = 260;
    if (ctx.measureText(displayName).width > maxNameWidth) {
      displayName = emp.name.substr(0, 20) + '...';
    }
    ctx.fillText(displayName, x + 30, y);

    ctx.fillStyle = '#6b7280';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    const percentage = ((emp.score / totalScore) * 100).toFixed(1);
    ctx.fillText(`${emp.score} (${percentage}%)`, cardMargin + cardWidth - legendPadding - 20, y);
  });

  return canvas.toDataURL('image/png', 1.0);
};

export const generateDashboardPDF = async (filteredDashboard,
  topScorersData,
  topScorersLabels,
  lowestScorersData,
  lowestScorersLabels,
  pendingTasksData,
  pendingTasksLabels,
  departmentChartUrl) => {

  const doc = new jsPDF('p', 'mm', 'a4');
  drawPageBorder(doc); // Pehle page pe border

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  let yPosition = 20;

  // Helper function to add page if needed
  const checkPageBreak = (requiredHeight) => {
    if (yPosition + requiredHeight > pageHeight - 20) {
      doc.addPage();
      drawPageBorder(doc); // Naye page pe border
      yPosition = 20;
      return true;
    }
    return false;
  };


  try {
    // ==================== FETCH REAL DATA FROM GOOGLE SHEETS ====================
    const SPREADSHEET_ID = "1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY";

    console.log('Fetching data from Google Sheets...');
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=For Records`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

    if (!data.table || !data.table.rows) {
      throw new Error("No table data found");
    }

    console.log('Data fetched successfully, processing...');

    // ==================== PROCESS EMPLOYEE DATA WITH IMAGES ====================
   // Set page margins and table width to fit properly
const margin = 10; // Standard margin
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const availableWidth = pageWidth - (margin * 2);
const tableWidth = availableWidth; // Fit within page margins

const rawEmployees = data.table.rows.map((row, index) => {
 if (!row.c) return null;
// Skip header row

  return {
    id: index,
    name: row.c[2]?.v || `Employee ${index}`, // col3 (C column)
    department: row.c[1]?.v || "N/A", // col2 (B column)  
    score: parseFloat(row.c[3]?.v) || 0, // col4 (D column)
    workNotDone: row.c[4]?.v || "0%", // col5 (E column)
    overallScore: row.c[5]?.v || "0%", // col6 (F column)
    plannedWork: row.c[6]?.v || "0%", // col7 (G column)
    actualWork: row.c[7]?.v || "0%", // col8 (H column)
    workNotDoneOnTime: row.c[8]?.v || "0%", // col9 (I column)
    totalPending: parseInt(row.c[9]?.v) || 0, // col10 (J column)
    pending: parseInt(row.c[10]?.v) || 0, // col11 (K column)
    target: row.c[11]?.v || "0", // col12 (L column) - dynamic target value
    commitment: row.c[13]?.v === true || row.c[13]?.v === "TRUE" || row.c[13]?.v === 1, // col14 (O column)
    avatar: row.c[13]?.v ? row.c[13]?.v.split(",")[0].trim().split("'")[0] : null, // col13 (M column) - contains image URL and name
    plannedWorkNotDone: row.c[14]?.v || "", // col15 (P column) - Planned % Work Not Done
    plannedWorkNotDoneOnTime: row.c[15]?.v || "" // col16 (Q column) - Planned % Work Not Done On Time
  };
}).filter(emp => emp && emp.name && emp.name !== "Employee 1" && emp.name !== "Name");

const processEmployeeData = (employees) => {
  console.log(employees);
  return employees.map((emp, index) => {
    let imageUrl = "";
    let displayName = "";

    // Process avatar field to extract image URL and name
    if (emp.avatar) {
      const rawValue = String(emp.avatar).replace(/^"|"$/g, "");
      
      if (rawValue.includes(",")) {
        // Format: "imageUrl,userName"
        const parts = rawValue.split(/,(.+)/);
        imageUrl = parts[0]?.trim() || "";
        displayName = parts[1]?.trim() || "";
      } else if (rawValue.startsWith("http")) {
        // If avatar field contains just URL
        imageUrl = rawValue.trim();
        displayName = emp.name; // Use name field
      } else if (!rawValue.startsWith("http") && rawValue.trim() && rawValue.trim() !== '1') {
        // If avatar field contains just a name (not URL)
        displayName = rawValue.trim();
      }
    }

    // Fallback to name field if displayName is still empty
    if (!displayName || displayName === '1') {
      displayName = emp.name && emp.name.trim() && emp.name.trim() !== '1' 
        ? emp.name.trim() 
        : `User ${index + 1}`;
    }

    return {
      ...emp,
      imageUrl: imageUrl,
      displayName: displayName,
      hasImage: imageUrl && imageUrl.startsWith('http')
    };
  });
};

console.log("rawData", rawEmployees)
const employees = processEmployeeData(rawEmployees);

console.log(`Processed ${employees.length} employees`);

// ==================== CALCULATE ANALYTICS ====================
const validEmployees = employees.filter(emp => emp.score > 0);

const topScorers = [...validEmployees]
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

const lowestScorers = [...validEmployees]
  .sort((a, b) => a.score - b.score)
  .slice(0, 5);

const pendingTasks = [...validEmployees]
  .sort((a, b) => b.totalPending - a.totalPending)
  .slice(0, 5);

console.log('Analytics calculated:', {
  totalEmployees: employees.length,
  topScorers: topScorers.length,
  lowestScorers: lowestScorers.length,
  pendingTasks: pendingTasks.length
});

// ==================== PDF GENERATION STARTS ====================



// Fetch dates from Row 1
let startingDate = '';
let endDate = '';

try {
  const reportResponse = await fetch(
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Report`
  );
  
  if (reportResponse.ok) {
    const reportText = await reportResponse.text();
    const jsonData = JSON.parse(reportText.match(/{.*}/)[0]);
    const row1 = jsonData.table?.rows?.[0];

    if (row1) {
      // Format dates from "21-Jul-2025" to "21/07/2025"
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', 
                        Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
        const [day, month, year] = String(dateStr).split('-');
        return day && month && year ? `${day.padStart(2,'0')}/${months[month]}/${year}` : '';
      };

      startingDate = formatDate(row1.c[2]?.f || row1.c[2]?.v);
      endDate = formatDate(row1.c[3]?.f || row1.c[3]?.v);
    }
  }
} catch (error) {
  console.error('Date fetch error:', error);
}

// Add to PDF with left-right alignment
doc.setFontSize(18);
let yPosition = 10;
doc.text('MIS Weekly Report', pageWidth / 2, yPosition, { align: 'center' });
yPosition += 12;

if (startingDate && endDate) {
  doc.setFontSize(10);
  
  // Left-aligned starting date (10mm from left edge)
  doc.text('Start date: ' + startingDate, 10, yPosition);
  
  // Right-aligned end date (10mm from right edge)
  const endDateText = 'End date: ' + endDate;
  const endDateX = pageWidth - 10 - doc.getStringUnitWidth(endDateText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
  doc.text(endDateText, endDateX, yPosition);
  
  yPosition += 15;
}

// ==================== DYNAMIC LIST OF PEOPLE TABLE (EXACT REACT FORMAT) ====================
// Helper function to convert Google Drive image URL to downloadable format
const convertDriveImageUrl = (url) => {
  if (!url || !url.includes('drive.google.com')) return url;
  
  // Extract file ID from various Google Drive URL formats
  const fileIdMatch = url.match(
    /\/file\/d\/([^\/]+)|id=([^&]+)|\/d\/([^\/]+)|\/open\?id=([^&]+)|\/uc\?id=([^&]+)/
  );
  
  const fileId = fileIdMatch ? 
    (fileIdMatch[1] || fileIdMatch[2] || fileIdMatch[3] || fileIdMatch[4] || fileIdMatch[5]) : 
    null;
  
  if (fileId) {
    // Use Google Drive's image proxy that works better with CORS
    return `https://lh3.googleusercontent.com/d/${fileId}=w400-h400-c`;
  }
  return url;
};

const getImageAsBase64 = async (url) => {
  console.log('Original URL:', url);
  const convertedUrl = convertDriveImageUrl(url);
  console.log('Converted URL:', convertedUrl);

  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) {
      resolve(null);
      return;
    }

    let attemptCount = 0;
    const maxAttempts = 3;
    
    const tryLoadImage = (imageUrl, useCors = true) => {
      const img = new Image();
      
      // Set crossOrigin only if useCors is true
      if (useCors) {
        img.crossOrigin = 'anonymous';
      }
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const size = 40;
          
          canvas.width = size;
          canvas.height = size;
          
          // Create circular mask
          ctx.beginPath();
          ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Draw and resize image
          ctx.drawImage(img, 0, 0, size, size);
          
          // Convert to base64
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (error) {
          console.warn('Image processing error:', error);
          resolve(null);
        }
      };
      
      img.onerror = (err) => {
        console.warn('Image load error attempt', attemptCount + 1, ':', err, 'for URL:', imageUrl);
        attemptCount++;
        
        if (attemptCount < maxAttempts) {
          // Get file ID for different URL attempts
          const fileIdMatch = url.match(
            /\/file\/d\/([^\/]+)|id=([^&]+)|\/d\/([^\/]+)|\/open\?id=([^&]+)|\/uc\?id=([^&]+)/
          );
          const fileId = fileIdMatch ? 
            (fileIdMatch[1] || fileIdMatch[2] || fileIdMatch[3] || fileIdMatch[4] || fileIdMatch[5]) : 
            null;
          
          if (fileId) {
            let nextUrl;
            
            if (attemptCount === 1) {
              // Second attempt: Try Google's image proxy without CORS
              nextUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
              console.log('Trying direct export URL without CORS:', nextUrl);
              tryLoadImage(nextUrl, false);
            } else if (attemptCount === 2) {
              // Third attempt: Try thumbnail URL without CORS
              nextUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
              console.log('Trying thumbnail URL without CORS:', nextUrl);
              tryLoadImage(nextUrl, false);
            }
          } else {
            console.warn('Could not extract file ID, giving up');
            resolve(null);
          }
        } else {
          console.warn('All image load attempts failed for:', url);
          resolve(null);
        }
      };
      
      // Add timeout to prevent hanging
      setTimeout(() => {
        if (!img.complete) {
          console.warn('Image load timeout for:', imageUrl);
          img.onerror(new Error('Timeout'));
        }
      }, 10000); // 10 second timeout
      
      img.src = imageUrl;
    };
    
    // Start with the converted URL (Google's image proxy)
    tryLoadImage(convertedUrl, true);
  });
};

// Load all employee images
const loadEmployeeImages = async (employees) => {
  console.log("employees", employees);
  const employeesWithImages = [];
  
  for (const emp of employees) {
    let imageData = null;
    
    if (emp.hasImage && emp.imageUrl) {
      console.log("Loading image for:", emp.displayName);
      try {
        imageData = await getImageAsBase64(emp.imageUrl);
        if (imageData) {
          console.log("Successfully loaded image for:", emp.displayName);
        } else {
          console.log("Failed to load image for:", emp.displayName);
        }
      } catch (error) {
        console.warn(`Failed to load image for ${emp.displayName}:`, error);
      }
    }
    
    employeesWithImages.push({
      ...emp,
      imageData
    });
  }
  
  console.log("employeesWithImages", employeesWithImages);
  return employeesWithImages;
};

checkPageBreak(100);

doc.setFontSize(14);
doc.setTextColor(0, 0, 0);
doc.text(`List of the People `, margin, yPosition);
yPosition += 10;

console.log('Loading employee images...');
const employeesWithImages = await loadEmployeeImages(employees);
console.log('Images loaded successfully');

// Define table headers matching React component columns
const tableHeaders = [
  'Employee',        // Name and image
  'Target',          // Column D from For Records sheet
  'Actual Work Done', // Column E from For Records sheet
  'Weekly Work Done %', // Column F from For Records sheet
  'Weekly Work Done On Time %', // Column G from For Records sheet
  'Total Work Done', // Column H from For Records sheet
  'Week Pending',    // Column I from For Records sheet
  'All Pending Till Date', // Column J from For Records sheet
  'Planned % Work Not Done',//column K from 
  'Planned % Work Not Done On Time',//column L
  'Commitment'       // Column O from For Records sheet
];

// Create table data mapping from For Records sheet columns
const employeesData = employeesWithImages.map(emp => [
  emp.displayName || '',// Empty for Employee column - will be handled in didDrawCell
  emp.score || '0', // Column D - Target
  emp.actualWork || '0', // Column E - Actual Work Done
  emp.overallScore || '0%', // Column F - Weekly Work Done %
  emp.plannedWork || '0%', // Column G - Weekly Work Done On Time %
  emp.workNotDone || '0', // Column H - Total Work Done
  emp.workNotDoneOnTime || '0', // Column I - Week Pending
  emp.totalPending || '0', // Column J - All Pending Till Date
  emp.target || '0', // Column K - Planned % Work Not Done
  emp.pending || '0', // Column L - Planned % Work Not Done On Time
  emp.plannedWorkNotDone ||'0'// Column O - Commitment
]);

// Fixed table configuration that properly fits within page width
doc.autoTable({
  startY: yPosition,
  head: [tableHeaders],
  body: employeesData,
  theme: 'striped',
  headStyles: {
    fillColor: [107, 114, 128], // Matching React gray-500
    textColor: [255, 255, 255],
    fontSize: 7, // Reduced for better fit
    cellPadding: 1.5,
    fontStyle: 'normal',
    halign: 'center',
    valign: 'middle'
  },
  bodyStyles: {
    fontSize: 6, // Reduced for better fit
    cellPadding: 1.5,
    textColor: [55, 65, 81], // Matching React gray-700
    halign: 'center',
    valign: 'middle'
  },
  alternateRowStyles: {
    fillColor: [249, 250, 251] // Light gray for alternate rows
  },
  // Fixed column widths that sum to exactly fit within page margins
  columnStyles: {
    0: { cellWidth: 28, halign: 'left' },   // Employee - wider for image+name
    1: { cellWidth: 12 },   // Target
    2: { cellWidth: 16 },   // Actual Work Done
    3: { cellWidth: 16 },   // Weekly Work Done %
    4: { cellWidth: 20 },   // Weekly Work Done On Time %
    5: { cellWidth: 16 },   // Total Work Done
    6: { cellWidth: 14 },   // Week Pending
    7: { cellWidth: 18 },   // All Pending Till Date
    8: { cellWidth: 16 },   // Planned % Work Not Done
    9: { cellWidth: 18 },   // Planned % Work Not Done On Time
    10: { cellWidth: 14 }   // Commitment
  },
  // Total width: 188 (fits within 190 available width with margins)
  margin: { left: margin, right: margin },
  tableWidth: 'wrap',
  styles: {
    fontSize: 6,
    cellPadding: 1.5,
    overflow: 'linebreak',
    cellWidth: 'wrap',
    halign: 'center',
    valign: 'middle',
    minCellHeight: 12
  },
  didDrawCell: function (data) {
    // Style header row
    if (data.row.section === 'head') {
      data.cell.styles.textColor = [255, 255, 255];
      data.cell.styles.fillColor = [107, 114, 128];
      data.cell.styles.fontStyle = 'normal';
      return;
    }

    const rowIndex = data.row.index;
    const employee = employeesWithImages[rowIndex];
    
    // Handle Employee column (index 0) - Image and Name (matching React)
    if (data.column.index === 0 && employee) {
      // Prevent text rendering in this cell
      data.cell.text = [];
      
      const cellX = data.cell.x;
      const cellY = data.cell.y;
      const cellHeight = data.cell.height;
      const cellWidth = data.cell.width;
      
      // Apply alternating row colors - first row light gray, second white
      const isEvenRow = data.row.index % 2 === 0;
      const bgColor = isEvenRow ? [249, 250, 251] : [255, 255, 255]; // Light gray or white
      
      // Fill employee cell background to match other columns
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(cellX, cellY, cellWidth, cellHeight, 'F');
      
      // Add image if available
      if (employee.imageData) {
        try {
          const imageSize = 8; // Smaller image size for compact layout
          const imageX = cellX + 2;
          const imageY = cellY + (cellHeight - imageSize) / 2;
          
          doc.addImage(employee.imageData, 'PNG', imageX, imageY, imageSize, imageSize);
          
          // Add name text next to image with multiline support
          doc.setFontSize(5); // Smaller font for compact layout
          doc.setTextColor(55, 65, 81);
          const textX = imageX + imageSize + 2;
          const textY = imageY + 2;
          const maxTextWidth = cellWidth - (imageSize + 6);
          
          // Split name into words for multiline display
          const words = employee.displayName.split(' ');
          let lines = [];
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = doc.getTextWidth(testLine);
            
            if (testWidth <= maxTextWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                // Single word too long, truncate it
                lines.push(word.substring(0, 6) + '...');
                currentLine = '';
              }
            }
          }
          
          if (currentLine) {
            lines.push(currentLine);
          }
          
          // Limit to 2 lines maximum
          if (lines.length > 2) {
            lines = lines.slice(0, 2);
            lines[1] = lines[1].substring(0, 6) + '...';
          }
          
          // Draw each line
          lines.forEach((line, index) => {
            doc.text(line, textX, textY + (index * 3));
          });
        } catch (error) {
          console.warn('Error adding image to PDF:', error);
          // Fallback to initials (matching React behavior)
          const initials = employee.displayName
            .split(' ')
            .slice(0, 2)
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase();
          
          // Apply alternating background colors for consistency
          const isEvenRow = data.row.index % 2 === 0;
          const bgColor = isEvenRow ? [249, 250, 251] : [255, 255, 255];
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.rect(cellX, cellY, cellWidth, cellHeight, 'F');
          
          const circleX = cellX + 4;
          const circleY = cellY + 4;
          
          doc.setFillColor(99, 102, 241); // Indigo color (matching React)
          doc.circle(circleX, circleY, 3, 'F'); // Smaller circle
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(4);
          doc.text(initials, circleX, circleY + 1, { align: 'center' });
          
          // Add name with multiline support
          doc.setTextColor(55, 65, 81);
          doc.setFontSize(5);
          const textX = circleX + 4;
          const textY = circleY - 1;
          const maxTextWidth = cellWidth - 8;
          
          // Split name into words for multiline display
          const words = employee.displayName.split(' ');
          let lines = [];
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = doc.getTextWidth(testLine);
            
            if (testWidth <= maxTextWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                // Single word too long, truncate it
                lines.push(word.substring(0, 6) + '...');
                currentLine = '';
              }
            }
          }
          
          if (currentLine) {
            lines.push(currentLine);
          }
          
          // Limit to 2 lines maximum
          if (lines.length > 2) {
            lines = lines.slice(0, 2);
            lines[1] = lines[1].substring(0, 6) + '...';
          }
          
          // Draw each line
          lines.forEach((line, index) => {
            doc.text(line, textX, textY + (index * 3));
          });
        }
      } else {
        // Create initials circle for employees without images (matching React behavior)
        const initials = employee.displayName
          .split(' ')
          .slice(0, 2)
          .map(part => part.charAt(0))
          .join('')
          .toUpperCase();
        
        // Apply alternating background colors for consistency
        const isEvenRow = data.row.index % 2 === 0;
        const bgColor = isEvenRow ? [249, 250, 251] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(cellX, cellY, cellWidth, cellHeight, 'F');
        
        const circleX = cellX + 4;
        const circleY = cellY + 4;
        
        doc.setFillColor(99, 102, 241); // Indigo color (matching React)
        doc.circle(circleX, circleY, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(4);
        doc.text(initials, circleX, circleY + 1, { align: 'center' });
        
        // Add name text with multiline support
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(5);
        const textX = circleX + 4;
        const textY = circleY - 1;
        const maxTextWidth = cellWidth - 8;
        
        // Split name into words for multiline display
        const words = employee.displayName.split(' ');
        let lines = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = doc.getTextWidth(testLine);
          
          if (testWidth <= maxTextWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // Single word too long, truncate it
              lines.push(word.substring(0, 6) + '...');
              currentLine = '';
            }
          }
        }
        
        if (currentLine) {
          lines.push(currentLine);
        }
        
        // Limit to 2 lines maximum
        if (lines.length > 2) {
          lines = lines.slice(0, 2);
          lines[1] = lines[1].substring(0, 6) + '...';
        }
        
        // Draw each line
        lines.forEach((line, index) => {
          doc.text(line, textX, textY + (index * 3));
        });
      }
    }

    // Color coding for Commitment column (index 10) - matching React
    if (data.column.index === 10) {
      if (data.cell.text[0] === 'Yes') {
        data.cell.styles.textColor = [34, 197, 94]; // Green (matching React)
        data.cell.styles.fontStyle = 'bold';
      } else if (data.cell.text[0] === 'No') {
        data.cell.styles.textColor = [239, 68, 68]; // Red (matching React)
      }
    }

    // Color coding for Weekly Work Done % columns (index 3 and 4) - matching React
    if (data.column.index === 3 || data.column.index === 4) {
      const value = parseFloat(data.cell.text[0]) || 0;
      if (value > 20) {
        data.cell.styles.textColor = [239, 68, 68]; // Red
      } else if (value > 10) {
        data.cell.styles.textColor = [245, 158, 11]; // Yellow/Amber
      } else {
        data.cell.styles.textColor = [34, 197, 94]; // Green
      }
    }

    // Color coding for Target and Total Work Done columns (index 1 and 5) - matching React
    if (data.column.index === 1 || data.column.index === 5) {
      const score = parseFloat(data.cell.text[0]) || 0;
      if (score >= 85) {
        data.cell.styles.textColor = [34, 197, 94]; // Green
      } else if (score >= 70) {
        data.cell.styles.textColor = [245, 158, 11]; // Yellow/Amber
      } else {
        data.cell.styles.textColor = [239, 68, 68]; // Red
      }
    }
  }
});

yPosition = doc.lastAutoTable.finalY + 15;
    // ==================== GRAPHS SECTION ====================
    checkPageBreak(100);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Performance Analytics', margin, yPosition);
    yPosition += 10;

    // Top 5 Scorers (semicircle chart)
    const chartTop = yPosition;
    const chartWidth = 85;
    const chartHeight = 80;
    const gap = 20;

    if (topScorers.length > 0) {
      const chartImageUrl = generateSemicircleChartImage(topScorers);
      doc.setFontSize(10);
      doc.setTextColor(0, 100, 0);
      doc.text('Top 5 Scorers', margin, chartTop);
      doc.addImage(chartImageUrl, 'PNG', margin, chartTop + 5, chartWidth, chartHeight);
    }

    // Lowest Scorers - Modified version
  const lowX = margin + chartWidth + gap;
doc.setFontSize(10);
doc.setTextColor(220, 38, 38);
doc.text('Lowest Scorers', lowX, chartTop);

const lowestChartY = chartTop + 5;
// Removed background color fill
doc.setDrawColor(200, 200, 200);
doc.rect(lowX, lowestChartY, chartWidth, chartHeight);

if (lowestScorers.length > 0) {
  const sortedLowestScorers = [...lowestScorers].sort((a, b) => a.score - b.score);
  
  const barColors = [
    [239, 68, 68],   // Red
    [249, 115, 22],  // Orange
    [250, 204, 21],  // Yellow
    [139, 92, 246],  // Violet
    [59, 130, 246],  // Blue
    [34, 197, 94],   // Green
    [236, 72, 153]   // Pink
  ];
  
  const maxLowestScore = Math.max(...sortedLowestScorers.map(emp => emp.score), 1);
  const barWidth = (chartWidth - 20) / sortedLowestScorers.length;
  const barSpacing = 2;
  const nameAreaHeight = 20; // Maintained original height for full names
  
  // Maintain original chart height
  const chartContentHeight = chartHeight - 15 - nameAreaHeight;
  const chartStartX = lowX + 10;
  const chartStartY = lowestChartY + 5;
  
  // Draw only base horizontal line (x-axis)
  doc.setLineWidth(0.3);
  const baseLineY = lowestChartY + chartHeight - nameAreaHeight - 5;
  doc.line(chartStartX, baseLineY, chartStartX + chartWidth - 20, baseLineY);
  
  // Draw only left vertical line (y-axis)
  doc.line(chartStartX, chartStartY, chartStartX, baseLineY);

  // Reset line width for bars
  doc.setLineWidth(0.5);

  sortedLowestScorers.forEach((emp, index) => {
    const invertedScore = maxLowestScore - emp.score + (maxLowestScore * 0.1);
    const barHeight = (invertedScore / (maxLowestScore + (maxLowestScore * 0.1))) * chartContentHeight;
    
    const barX = chartStartX + (index * (barWidth + barSpacing));
    const barY = lowestChartY + chartHeight - 5 - barHeight - nameAreaHeight;

    const color = barColors[index % barColors.length];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(barX, barY, barWidth - 2, barHeight, 'F');
    
    // Score text on top of bar
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    const scoreY = Math.max(barY - 2, lowestChartY + 8);
    doc.text(emp.score.toString(), barX + (barWidth - 2) / 2, scoreY, { align: 'center' });

    // Employee name at bottom - ensures full name visibility
    const nameY = lowestChartY + chartHeight - nameAreaHeight + 8;
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0);
    
    let displayName = emp.displayName;
    const maxNameWidth = barWidth - 4;
    
    // Improved name display logic
    if (doc.getTextWidth(displayName) > maxNameWidth) {
      // Try two-line approach for long names
      const nameParts = displayName.split(' ');
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        // First name line
        doc.text(firstName, barX + (barWidth - 2) / 2, nameY - 3, {
          align: 'center',
          maxWidth: maxNameWidth
        });
        
        // Last name line
        doc.text(lastName, barX + (barWidth - 2) / 2, nameY + 3, {
          align: 'center',
          maxWidth: maxNameWidth
        });
        return;
      }
    }
    
    // Single line if fits or if can't be split
    doc.text(displayName, barX + (barWidth - 2) / 2, nameY, {
      align: 'center',
      maxWidth: maxNameWidth
    });
  });
}

yPosition = chartTop + chartHeight + 20;

    // ==================== PENDING WORK ANALYSIS SECTION ====================
  checkPageBreak(60);

// Header with improved styling
doc.setFontSize(14);
doc.setTextColor(15, 23, 42); // Dark blue-gray for better contrast
doc.setFont('helvetica', 'bold');
doc.text('Pending Work Analysis - Top 5', margin, yPosition);
yPosition += 12;

// Card container with better styling
const pendingChartWidth = pageWidth - (margin * 2);
const pendingChartHeight = 65; // Increased height to accommodate all data
const pendingChartX = margin;
const pendingChartY = yPosition;

// Card background with subtle shadow effect
doc.setFillColor(255, 255, 255); // Pure white background
doc.setDrawColor(226, 232, 240); // Light gray border
doc.setLineWidth(0.5);
doc.roundedRect(pendingChartX, pendingChartY, pendingChartWidth, pendingChartHeight, 3, 3, 'FD'); // Filled with border

// Inner padding
const innerPadding = 8;
const contentWidth = pendingChartWidth - (innerPadding * 2);
const contentX = pendingChartX + innerPadding;
const contentY = pendingChartY + innerPadding;

// Fetch pending data
try {
  const pendingResponse = await fetch(
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Data`
  );
  const pendingText = await pendingResponse.text();
  const pendingJsonData = JSON.parse(pendingText.substring(
    pendingText.indexOf("{"),
    pendingText.lastIndexOf("}") + 1
  ));

  let top5PendingTasks = [];

  if (pendingJsonData?.table?.rows) {
    const pendingTasks = pendingJsonData.table.rows
      .map((row) => {
        const name = row.c?.[4]?.v;
        const pendingValue = row.c?.[10]?.v;
        let numericValue = 0;
        
        if (name && pendingValue) {
          if (typeof pendingValue === 'number') numericValue = pendingValue;
          else if (typeof pendingValue === 'string') {
            numericValue = parseFloat(pendingValue.replace(/[^\d.-]/g, "")) || 0;
          }
          
          return {
            name: String(name).trim().toUpperCase(),
            pending: Math.round(numericValue),
            displayName: String(name).trim()
          };
        }
        return null;
      })
      .filter(Boolean);
    
    top5PendingTasks = pendingTasks
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 5);
  }

  if (top5PendingTasks.length > 0) {
    const maxPending = Math.max(...top5PendingTasks.map(emp => emp.pending), 1);
    const barHeight = 6; // Slightly reduced bar height
    const nameWidth = 50; // Adequate space for names
    const valueWidth = 25; // Space for the value text
    const barMaxWidth = contentWidth - nameWidth - valueWidth - 10; // Fixed bar width calculation
    const startY = contentY + 8;
    const barSpacing = 9; // Spacing between rows

    top5PendingTasks.forEach((emp, index) => {
      const barWidth = Math.max((emp.pending / maxPending) * barMaxWidth, 2); // Minimum bar width
      const nameX = contentX;
      const barX = contentX + nameWidth;
      const barY = startY + (index * barSpacing);
      const valueX = barX + barMaxWidth + 5;

      // Employee name with better typography
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42); // Dark text
      doc.setFont('helvetica', 'normal');
      
      // Truncate name if too long to fit within allocated space
      const truncatedName = emp.displayName.length > 18 ? 
        emp.displayName.substring(0, 15) + '...' : emp.displayName;
      doc.text(truncatedName, nameX, barY + 4);

      // Background bar with subtle styling
      doc.setFillColor(241, 245, 249); // Lighter gray
      doc.roundedRect(barX, barY, barMaxWidth, barHeight, 1, 1, 'F');

      // Progress bar with improved color gradient
      let barFillColor;
      if (emp.pending > 75) {
        barFillColor = [220, 38, 38]; // Vibrant red
      } else if (emp.pending > 50) {
        barFillColor = [234, 179, 8]; // Amber
      } else {
        barFillColor = [34, 197, 94]; // Emerald green
      }
      
      doc.setFillColor(...barFillColor);
      doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');

      // Value with better styling - positioned to stay within card
      doc.setFontSize(9);
      doc.setTextColor(59, 130, 246); // Blue
      doc.setFont('helvetica', 'bold');
      doc.text(emp.pending.toString(), valueX, barY + 4);
    });

    // Add subtle footer with max value - positioned within card bounds
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // Gray-500
    const footerY = Math.min(startY + (5 * barSpacing) + 8, contentY + contentWidth/6 - 10);
    
  } else {
    // Improved "no data" message
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No pending tasks found', contentX + contentWidth/2, contentY + 25, { align: 'center' });
  }
} catch (error) {
  console.error('Error loading pending data:', error);
  // Better error message styling - kept within bounds
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.text('Failed to load pending data', contentX + 5, contentY + 15);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  const errorMsg = error.message.length > 40 ? 
    error.message.substring(0, 37) + '...' : error.message;
  doc.text(errorMsg, contentX + 5, contentY + 25);
}

yPosition = pendingChartY + pendingChartHeight + 20;

    // ==================== DEPARTMENT SCORE GRAPH SECTION ====================
    if (pageHeight - yPosition < 150) { // 150mm minimum required
  doc.addPage();
  yPosition = 20;
 
}

// Department graph code
doc.setFontSize(14);
doc.text('Department Scores', margin, yPosition);
    checkPageBreak(100);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Department Scores', margin, yPosition);
    yPosition += 10;

    const chartContainerWidth = pageWidth - margin * 2;
    const chartContainerHeight = 120;

    doc.setFillColor(255, 255, 255);
    doc.rect(margin, yPosition, chartContainerWidth, chartContainerHeight, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, yPosition, chartContainerWidth, chartContainerHeight);

    try {
      const DEPARTMENT_CHART_ID = '1932717403';
      const chartImageUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vST3ZGx9bH09qLP2B0a1UcwrTa-et8mYdFiAqRD7-eJDztl-JLfRgjPG8p_glgh7AoJXHchqNGwmQY2/pubchart?oid=${DEPARTMENT_CHART_ID}&format=image`;

      const chartImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load chart image'));
        img.src = chartImageUrl;
      });

      const maxWidth = chartContainerWidth - 10;
      const maxHeight = chartContainerHeight - 10;
      let chartWidth = chartImage.width;
      let chartHeight = chartImage.height;

      if (chartWidth > maxWidth) {
        const ratio = maxWidth / chartWidth;
        chartWidth = maxWidth;
        chartHeight = chartHeight * ratio;
      }

      if (chartHeight > maxHeight) {
        const ratio = maxHeight / chartHeight;
        chartHeight = maxHeight;
        chartWidth = chartWidth * ratio;
      }

      const chartX = margin + (chartContainerWidth - chartWidth) / 2;
      const chartY = yPosition + (chartContainerHeight - chartHeight) / 2;

      doc.addImage(chartImage, 'PNG', chartX, chartY, chartWidth, chartHeight);

    } catch (error) {
      console.error('Failed to load department chart:', error);
      doc.setFontSize(10);
      doc.setTextColor(220, 38, 38);
      doc.text('Could not load Department Scores chart', margin + 5, yPosition + 15);
      doc.setTextColor(100, 100, 100);
      doc.text('Please check the Google Sheets permissions and chart ID', margin + 5, yPosition + 25);
    }

    yPosition += chartContainerHeight + 15;

    // ==================== FOOTER ====================
    const pageCount = doc.getNumberOfPages();
    const footerText = 'Powered by Botivate';
    const websiteLink = 'www.botivate.in';
    const linkColor = [59, 130, 246]; // Blue color for link

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawPageBorder(doc); // Current page pe border refresh
      
      // Page number
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
     const pageText = `Page ${i} of ${pageCount}`;
const pageTextWidth = doc.getTextWidth(pageText);
doc.text(pageText, pageWidth - pageTextWidth - 10, pageHeight - 10);

      
      // Footer text with clickable link
      const footerY = pageHeight - 10;
      const textWidth = doc.getStringUnitWidth(footerText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      const linkWidth = doc.getStringUnitWidth(websiteLink) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      const totalWidth = textWidth + linkWidth + 2;
      
      const startX = (pageWidth - totalWidth) / 2;
      
      // Footer text
      doc.setTextColor(100, 100, 100);
      doc.text(footerText, startX, footerY);
      
      // Clickable link
      doc.setTextColor(...linkColor);
      doc.textWithLink(websiteLink, startX + textWidth + 2, footerY, {
        url: 'https://www.botivate.in'
      });
    }

    // Save the PDF
     const today = new Date().toLocaleDateString('en-GB');
    doc.save(`MIS-Dashboard-Report-${today.replace(/\//g, '-')}.pdf`);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    // Fallback PDF with error message
    doc.setFontSize(16);
    doc.setTextColor(220, 38, 38);
    // doc.text('❌ Error Generating Dashboard Report', pageWidth / 2, 50, { align: 'center' });

    // doc.setFontSize(12);
    // doc.setTextColor(0, 0, 0);
    // doc.text(`Error Details: ${error.message}`, pageWidth / 2, 70, { align: 'center' });

    // doc.setFontSize(10);
    // doc.text('Please check:', margin, 90);
    // doc.text('• Internet connection', margin, 100);
    // doc.text('• Google Sheets permissions', margin, 110);
    // doc.text('• Spreadsheet ID is correct', margin, 120);
    // doc.text('• Sheet name "For Records" exists', margin, 130);

    const today = new Date().toLocaleDateString('en-GB');
    doc.save(`MIS-Dashboard-Report-Error-${today.replace(/\//g, '-')}.pdf`);
  }
};

// For backward compatibility
export const generateDashboardPDFFromComponent = () => {
  return generateDashboardPDF();
};



