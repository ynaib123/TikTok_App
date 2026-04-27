import assert from 'node:assert/strict'
import test from 'node:test'

import { readProductImportRows } from './productImportLoader.js'

test('readProductImportRows parses csv files without loading xlsx', async () => {
  const csvFile = {
    name: 'products.csv',
    async text() {
      return 'name,price,stock\nProduit Test,120,4\n'
    },
  }

  const rows = await readProductImportRows(csvFile)

  assert.deepEqual(rows, [
    {
      name: 'Produit Test',
      price: '120',
      stock: '4',
    },
  ])
})
