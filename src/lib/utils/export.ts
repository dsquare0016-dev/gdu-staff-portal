import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportParams {
  data: any[];
  filename: string;
  title: string;
  headers: string[];
}

export const exportToPDF = ({ data, filename, title, headers }: ExportParams) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  const tableData = data.map(row => Object.values(row));

  (doc as any).autoTable({
    startY: 35,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: { fillGray: 10 },
  });

  doc.save(`${filename}.pdf`);
};

export const exportToExcel = ({ data, filename }: Omit<ExportParams, 'title' | 'headers'>) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToCSV = ({ data, filename }: Omit<ExportParams, 'title' | 'headers'>) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
