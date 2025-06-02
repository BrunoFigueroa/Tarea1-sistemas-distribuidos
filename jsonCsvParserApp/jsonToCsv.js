const fs = require('fs');
const { Parser } = require('json2csv');

const rawData = fs.readFileSync('filtered_data.json', 'utf-8');

const json = rawData
  .split('\n')
  .filter(line => line.trim())
  .map(line => JSON.parse(line));

// Flatten `coordinates` into `lat` and `lon`
const flattened = json.map(item => ({
  serial_id: item.serial_id,
  title: item.title,
  category: item.category,
  street: item.street,
  city: item.city,
  reporter: item.reporter,
  lat: item.coordinates?.lat,
  lon: item.coordinates?.lon,
}));

const fields = ['serial_id', 'title', 'category', 'street', 'city', 'reporter', 'lat', 'lon'];
const opts = { fields, header: false };

try {
  const parser = new Parser(opts);
  const csv = parser.parse(flattened);
  fs.writeFileSync('filtered_data.csv', csv);
  console.log('✅ CSV file written: filtered_data.csv');
} catch (err) {
  console.error('❌ Error converting JSON to CSV:', err);
}
