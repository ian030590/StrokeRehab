export function downloadFile(content: BlobPart | BlobPart[], filename: string, mimeType = 'text/plain;charset=utf-8') {
  const blobParts = Array.isArray(content) ? content : [content];
  const blob = new Blob(blobParts, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsvFile(csvContent: string, filename: string) {
  downloadFile(`\uFEFF${csvContent}`, filename, 'text/csv;charset=utf-8');
}
