import * as XLSX from 'xlsx';

/** Helper: trigger a file download robustly and revoke the object URL afterwards. */
const triggerDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  // Must be in the DOM for Firefox to fire the click event
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a small delay to allow the browser to start the download
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const exportToExcel = (data: any[], fileName: string = 'PaperLedger_Export.xlsx') => {
  // Flatten data for line-by-line export
  const flattenedData: any[] = [];
  
  data.forEach(item => {
    if (item.lineItems && item.lineItems.length > 0) {
      item.lineItems.forEach((line: any) => {
        flattenedData.push({
          'Vendor': item.vendor,
          'Date': item.date,
          'Invoice #': item.invoiceNumber || '',
          'Category': item.category,
          'Line Description': line.description,
          'Line Amount': line.amount,
          'Total Amount': item.totalAmount,
          'Tax Amount': item.taxAmount,
          'Currency': item.currency,
          'Fraudulent': item.isFraudulent ? 'Yes' : 'No',
          'CO2 Impact (Kg)': item.carbonFootprintKg || 0,
          'Tax Deductible Score': item.taxDeductibleScore || 0
        });
      });
    } else {
      flattenedData.push({
        'Vendor': item.vendor,
        'Date': item.date,
        'Invoice #': item.invoiceNumber || '',
        'Category': item.category,
        'Line Description': 'Summary',
        'Line Amount': item.totalAmount,
        'Total Amount': item.totalAmount,
        'Tax Amount': item.taxAmount,
        'Currency': item.currency,
        'Fraudulent': item.isFraudulent ? 'Yes' : 'No',
        'CO2 Impact (Kg)': item.carbonFootprintKg || 0,
        'Tax Deductible Score': item.taxDeductibleScore || 0
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Line Items");
  XLSX.writeFile(workbook, fileName);
};

export const exportToCSV = (data: any[], mapping: Record<string, string>, fileName: string = 'PaperLedger_Export.csv') => {
  const flattenedData: any[] = [];
  
  data.forEach(item => {
    if (item.lineItems && item.lineItems.length > 0) {
      item.lineItems.forEach((line: any) => {
        const mapped: Record<string, any> = {};
        Object.entries(mapping).forEach(([source, target]) => {
          if (source === 'description') mapped[target] = line.description;
          else if (source === 'amount') mapped[target] = line.amount;
          else mapped[target] = item[source];
        });
        flattenedData.push(mapped);
      });
    } else {
      const mapped: Record<string, any> = {};
      Object.entries(mapping).forEach(([source, target]) => {
        mapped[target] = item[source];
      });
      flattenedData.push(mapped);
    }
  });
  
  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, fileName);
};

export const exportToJSON = (data: any[], mapping: Record<string, string>, fileName: string = 'PaperLedger_Export.json') => {
  const mappedData = data.map(item => {
    const mapped: Record<string, any> = {};
    Object.entries(mapping).forEach(([source, target]) => {
      mapped[target] = item[source];
    });
    // Always include line items in JSON
    mapped.lineItems = item.lineItems;
    return mapped;
  });
  
  const json = JSON.stringify(mappedData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, fileName);
};

export const generateQuickBooksIIF = (data: any[]) => {
  // Enhanced IIF generator for QuickBooks Desktop with line items
  let iif = "!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n";
  iif += "!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n";
  iif += "!ENDTRNS\n";

  data.forEach(item => {
    // Transaction Header
    iif += `TRNS\tBILL\t${item.date}\tAccounts Payable\t${item.vendor}\t-${item.totalAmount}\t${item.invoiceNumber || ''}\t${item.category || ''}\n`;
    
    if (item.lineItems && item.lineItems.length > 0) {
      item.lineItems.forEach((line: any) => {
        iif += `SPL\tBILL\t${item.date}\t${item.category || 'Uncategorized'}\t\t${line.amount}\t\t${line.description}\n`;
      });
    } else {
      iif += `SPL\tBILL\t${item.date}\t${item.category || 'Uncategorized'}\t\t${item.totalAmount}\t\t\n`;
    }
    
    iif += "ENDTRNS\n";
  });
  
  const blob = new Blob([iif], { type: 'text/plain' });
  triggerDownload(blob, 'PaperLedger_QuickBooks.iif');
};
