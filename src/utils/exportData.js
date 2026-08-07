/**
 * Helper to export an array of JSON objects to a CSV / Excel file.
 * Automatically escapes values and triggers a browser download.
 * @param {Array<Object>} data The data array to export.
 * @param {string} filename The output file name (without extension).
 * @param {boolean} isExcelFormat Whether to name file .csv or .xlsx compatible format
 */
export function exportToCSV(data, filename = 'export', isExcelFormat = false) {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }

  // 1. Gather all unique headers
  const headers = Array.from(
    new Set(data.reduce((acc, obj) => acc.concat(Object.keys(obj)), []))
  );

  // 2. Build rows
  const csvRows = [];
  
  // Header row
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const item of data) {
    const values = headers.map(header => {
      const val = item[header];
      const valStr = val === null || val === undefined ? '' : String(val);
      return `"${valStr.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  // 3. Create blob with UTF-8 BOM for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + csvRows.join('\n');
  const ext = isExcelFormat ? 'xlsx' : 'csv';
  const mimeType = isExcelFormat ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
  const blob = new Blob([csvContent], { type: mimeType });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.${ext}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToExcel(data, filename = 'export') {
  return exportToCSV(data, filename, true);
}

