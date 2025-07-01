const fs = require('fs');
const { Parser } = require('json2csv');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(){
  try {
    const rawData = fs.readFileSync('/csv/filtered_data.json', 'utf-8');
    const json = JSON.parse(rawData);

    const flattened = json.map(item => ({
      serial_id: item.serial_id,
      title: item.title,
      category: item.category,
      street: item.street,
      city: item.city,
      reporter: item.reporter,
      lat: item.lat,
      lon: item.lon,
    }));

    const fields = ['serial_id', 'title', 'category', 'street', 'city', 'reporter', 'lat', 'lon'];
    const opts = { fields, header: false };

    const parser = new Parser(opts);
    const csv = parser.parse(flattened);

    fs.writeFileSync('/csv/filtered_data.csv', csv);
    console.log('CSV file written: /csv/filtered_data.csv');
  } catch (err) {
    console.error('Error converting JSON to CSV:', err);
  }
}

(async () => {
  console.log("Waiting for filter data...");
  await sleep(10*1000); // Espera inicial por filtro.

  while (true) {
    await main();
    console.log("Waiting 1 hour until next parse cycle...\n");
    await sleep(3600 * 1000);
  }
})();
