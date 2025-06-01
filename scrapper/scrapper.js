const axios = require('axios');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'tarea3SD';
const COLLECTION_NAME = 'DATA';

const AREA = { //todo stgo, ojalá
  top: -33.3,
  bottom: -33.65,
  left: -70.85,
  right: -70.5
};

const STEP = 0.03; //tamaño de cuadrante geografico
const INTERVAL_MS = 5000;
const DATAMAX = 50000;

const collectedData = [];
const uniqueMap = new Map();

function buildUrl(top, bottom, left, right) {
  return `https://www.waze.com/live-map/api/georss?top=${top}&bottom=${bottom}&left=${left}&right=${right}&env=row&types=alerts,traffic,users`;
}

function extractData(raw) {
  let combined = [];
  if (raw.alerts) combined = combined.concat(raw.alerts);
  if (raw.traffic) combined = combined.concat(raw.traffic);
  if (raw.users) combined = combined.concat(raw.users);

  return combined.map(item => {
    return {
      title: item.title || item.type || null,
      category: item.subtype || item.type || null,
      street: item.street || null,
      city: item.city || null,
      reporter: item.reportDescription || item.reportBy || null,
      coordinates: item.location ? {
        lat: item.location.y,
        lon: item.location.x
      } : null
    };
  });
}

async function scrapeAndStore() {
  for (let lat = AREA.bottom; lat < AREA.top; lat += STEP) {
    for (let lon = AREA.left; lon < AREA.right; lon += STEP) {
      const top = lat + STEP;
      const bottom = lat;
      const left = lon;
      const right = lon + STEP;
      const url = buildUrl(top, bottom, left, right);

      try {
        const response = await axios.get(url);
        const extracted = extractData(response.data);

        for (const item of extracted) {
          const key = `${item.title}|${item.category}|${item.coordinates?.lat}|${item.coordinates?.lon}`;

          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }

          if (collectedData.length < DATAMAX) {
            collectedData.push(item);
          }

       
          if (collectedData.length >= DATAMAX) {
            return true; 
          }
        }
      } catch (err) {
        // error 
      }
    }
  }
  return false; 
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  console.log("ojala funciones ");

  const interval = setInterval(async () => {
    const reachedLimit = await scrapeAndStore();

    console.log(`Datos únicos en MongoDB: ${uniqueMap.size}`);
    console.log(`Total acumulado en JSON (con duplicados, máximo ${DATAMAX}): ${collectedData.length}`);

    if (reachedLimit || collectedData.length >= DATAMAX) {
      clearInterval(interval);

      fs.writeFileSync('DATA.json', JSON.stringify(collectedData, null, 2));
      console.log(`Archivo DATA.json creado con ${collectedData.length} entradas (puede incluir duplicados).`);

      const uniqueArray = Array.from(uniqueMap.values());
      await collection.insertMany(uniqueArray);
      console.log("Datos insertados en MongoDB.");

      await client.close();
      console.log("Proceso completado ");
    }
  }, INTERVAL_MS);
}

main();



