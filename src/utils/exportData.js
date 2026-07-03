/**
 * Helper to export an array of JSON objects to a CSV file.
 * Automatically escapes values and triggers a browser download.
 * @param {Array<Object>} data The data array to export.
 * @param {string} filename The output file name (without extension).
 */
export function exportToCSV(data, filename = 'export') {
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
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const item of data) {
    const values = headers.map(header => {
      const val = item[header];
      const valStr = val === null || val === undefined ? '' : String(val);
      // Escape double quotes
      return `"${valStr.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  // 3. Create blob and trigger download
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
