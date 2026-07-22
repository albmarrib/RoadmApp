const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = xlsx.readFile(path.join(__dirname, '../Llista de viatge Modificada.xlsx'));
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const packingList = [];
let currentCategory = 'VARIOS';

function isCategory(str) {
  if (!str) return false;
  const s = str.trim();
  return s === s.toUpperCase() && s.length > 2 && !s.includes('EUROS') && !s.includes('BOLSA');
}

for (let r = 0; r < rows.length; r++) {
  const row = rows[r];
  
  // Columna 0
  if (row[0] && typeof row[0] === 'string') {
    const val = row[0].trim();
    if (isCategory(val)) {
      currentCategory = val;
    } else {
      packingList.push({
        name: val,
        category: currentCategory,
        packed: false,
        quantity: 1
      });
    }
  }

  // Columna 4
  if (row[4] && typeof row[4] === 'string') {
    const val = row[4].trim();
    if (isCategory(val)) {
      currentCategory = val;
    } else {
      packingList.push({
        name: val,
        category: currentCategory,
        packed: false,
        quantity: 1
      });
    }
  }
}

const configDir = path.join(__dirname, '../src/config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const outputPath = path.join(configDir, 'defaultPackingList.json');
fs.writeFileSync(outputPath, JSON.stringify(packingList, null, 2));

console.log(`Generado defaultPackingList.json con ${packingList.length} ítems.`);
