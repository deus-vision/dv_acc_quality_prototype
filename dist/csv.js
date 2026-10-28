// Keep numeric values usable in spreadsheets and missing values distinct from zero.
export function csvNumber(value, decimals=2){
  if(value==null||value===''||!Number.isFinite(Number(value)))return null;
  return Number(Number(value).toFixed(decimals));
}

function csvCell(value){
  if(value==null)return '';
  if(typeof value==='number')return Number.isFinite(value)?String(value):'';
  let text=String(value);
  // Export user-entered names as text, never as executable spreadsheet formulas.
  if(/^[\s\uFEFF]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}

export function serializeCsv(headers,rows){
  return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

export function downloadCsv(filename,headers,rows){
  const blob=new Blob([serializeCsv(headers,rows)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;link.hidden=true;
  document.body.append(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
}
