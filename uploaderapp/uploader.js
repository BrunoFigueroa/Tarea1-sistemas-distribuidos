const fs = require('fs');
const path = require('path');
const axios = require('axios');
const parse = require('csv-parse/sync');

const elasticUrl = 'http://elasticsearch:9200';
const outputDir = '/csv/output';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const mappings = {
  'by_category': 'categorias',
  'by_city': 'ciudades',
  'by_street': 'calles',
  'by_category_and_street': 'category-street',
  'by_location': 'localizacion'
};

async function uploadFile(filePath, indexName, fields) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let records = parse.parse(content, { columns: fields, skip_empty_lines: true });

  records = records.map(doc => {
  if ('total' in doc) {
      doc.total = Number(doc.total);
  }
  return doc;
  });

  const bulkBody = records.flatMap(doc => [{ index: {} }, doc])
    .map(line => JSON.stringify(line)).join('\n') + '\n';

  const url = `${elasticUrl}/${indexName}/_bulk`;

  try {
    const res = await axios.post(url, bulkBody, {
      headers: { 'Content-Type': 'application/x-ndjson' }
    });
    console.log(`Uploaded ${records.length} docs to [${indexName}]`);
  } catch (err) {
    console.error(`Error uploading to ${indexName}:`, err.message);
  }
}

async function main() {

  for (const [folder, indexName] of Object.entries(mappings)) {
    const file = path.join(outputDir, folder, 'part-r-00000');

    if (fs.existsSync(file)) {
      let fields;
      switch (folder) {
        case 'by_category': fields = ['category', 'total']; break;
        case 'by_city': fields = ['city', 'total']; break;
        case 'by_street': fields = ['street', 'total']; break;
        case 'by_category_and_street': fields = ['category', 'street', 'total']; break;
        case 'by_location': fields = ['lat_group', 'lon_group', 'total']; break;
        default: continue;
      }

      await uploadFile(file, indexName, fields);
    } else {
      console.warn(`File not found: ${file}`);
    }
  }
}

(async () => {
  console.log("Waiting for Elasticsearch and pig to be ready...");
  await sleep(20*1000);

  while (true) {
    console.log("Starting upload to Elasticsearch...");
    await main();
    console.log("Waiting 1 hour until next upload cycle...\n");
    await sleep(3600 * 1000);
  }
})();
