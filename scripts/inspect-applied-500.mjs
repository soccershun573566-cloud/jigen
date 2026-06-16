// 500問応用能力問題集 Excel 構造調査
import xlsx from 'xlsx';

const XLSX_PATH = 'C:\\Users\\user\\Documents\\Claude\\Projects\\1級施工管理技士\\1級建築施工管理_応用能力問題集500.xlsx';

const wb = xlsx.readFile(XLSX_PATH);
console.log('=== sheets ===');
console.log(wb.SheetNames);

for (const name of wb.SheetNames) {
  console.log(`\n=== sheet: ${name} ===`);
  const ws = wb.Sheets[name];
  const ref = ws['!ref'];
  console.log('range:', ref);
  // raw rows
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  console.log('total rows:', rows.length);
  console.log('first 8 rows:');
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    console.log(`  [${i}]`, JSON.stringify(rows[i]).slice(0, 300));
  }
}
