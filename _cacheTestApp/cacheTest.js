const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './test-results';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const tests = [
  {
    name: 'get_event_2614',
    url: 'http://localhost:3000/event/2614'
  },
  {
    name: 'get_event_invalid',
    url: 'http://localhost:3000/event/9999999'
  },
  {
    name: 'get_by_city_santiago',
    url: 'http://localhost:3000/event/by_city/Santiago'
  },
  {
    name: 'get_by_category_accident',
    url: 'http://localhost:3000/event/by_category/Accident'
  },
  {
    name: 'get_by_street_las_condes',
    url: 'http://localhost:3000/event/by_street/Av.%20Las%20Condes'
  }
];

async function runTests() {
  for (const test of tests) {
    try {
      const res = await axios.get(test.url);
      const filePath = path.join(OUTPUT_DIR, `${test.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2));
      console.log(`${test.name} -> ${filePath}`);
    } catch (err) {
      const filePath = path.join(OUTPUT_DIR, `${test.name}_error.json`);
      fs.writeFileSync(filePath, JSON.stringify({ error: err.message }, null, 2));
      console.log(`${test.name} failed -> ${filePath}`);
    }
  }
}

runTests();
