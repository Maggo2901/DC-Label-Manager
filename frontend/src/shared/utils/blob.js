function saveBlob(blob, fileName) {
  console.log('[DEBUG] saveBlob called with filename:', fileName);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  
  // Delay cleanup to ensure download starts (critical for Firefox/some Chrome versions)
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log('[DEBUG] Blob URL revoked');
  }, 100);
}

function openBlobForPrint(blobUrl) {
  if (!blobUrl) {
    return;
  }

  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    return;
  }

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  printWindow.addEventListener('load', triggerPrint, { once: true });
  window.setTimeout(() => {
    if (!printWindow.closed) {
      triggerPrint();
    }
  }, 600);
}

export {
  saveBlob,
  openBlobForPrint
};
