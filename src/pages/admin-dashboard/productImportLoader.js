let xlsxModulePromise = null

export function preloadProductImportModule() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx')
  }

  return xlsxModulePromise
}

function parseCsvLine(line = '') {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += character
  }

  cells.push(current)
  return cells.map((cell) => String(cell || '').trim())
}

async function readCsvRows(file) {
  const text = await file.text()
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    throw new Error("Le fichier CSV ne contient aucune ligne exploitable.")
  }

  const [headerLine, ...dataLines] = lines
  const headers = parseCsvLine(headerLine)

  if (headers.length === 0) {
    throw new Error("Le fichier CSV ne contient aucun en-tete valide.")
  }

  return dataLines.map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || ''
      return row
    }, {})
  })
}

export async function readProductImportRows(file) {
  const importFile = file || null
  if (!importFile) {
    throw new Error("Selectionnez un fichier CSV ou Excel avant de lancer l'import.")
  }

  const fileName = String(importFile?.name || '').trim().toLowerCase()
  if (fileName.endsWith('.csv')) {
    return readCsvRows(importFile)
  }

  const XLSX = await preloadProductImportModule()
  const workbook = XLSX.read(await importFile.arrayBuffer(), { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('Le fichier ne contient aucune feuille exploitable.')
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '' })
}
