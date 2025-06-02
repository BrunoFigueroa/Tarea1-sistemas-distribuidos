const axios = require('axios');
const { MongoClient } = require('mongodb');

// Configuración de Mongo dentro de Docker
const MONGO_URI = 'mongodb://mongo:27017';
const DB_NAME = 'trafficData';
const COLLECTION_NAME = 'events';
const COUNTER_COLLECTION = 'counter';

const AREA = {
  top: -33.3,
  bottom: -33.65,
  left: -70.85,
  right: -70.5
};

const STEP = 0.03;
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

  return combined.map(item => ({
    title: item.title || item.type || null,
    category: item.subtype || item.type || null,
    street: item.street || null,
    city: item.city || null,
    reporter: item.reportDescription || item.reportBy || null,
    lat: item.location?.y || null,
    lon: item.location?.x || null
  }));
}

async function getDbConnection() {
  const client = await MongoClient.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const db = client.db(DB_NAME);
  return { client, db };
}

async function getSerialId(counterCollection) {
  const counter = await counterCollection.findOne({ _id: 'event_counter' });
  return counter ? counter.last_serial_id + 1 : 1;
}

async function scrapeAndStore(eventsCollection, counterCollection, serialIdRef) {
  for (let lat = AREA.bottom; lat < AREA.top; lat += STEP) {
    for (let lon = AREA.left; lon < AREA.right; lon += STEP) {
      const url = buildUrl(lat + STEP, lat, lon, lon + STEP);

      try {
        const response = await axios.get(url);
        const extracted = extractData(response.data);

        for (const item of extracted) {
          const key = `${item.title}|${item.category}|${item.lat}|${item.lon}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
            item.serial_id = serialIdRef.value++;

            await eventsCollection.insertOne(item);

            console.log("Evento insertado");

            await counterCollection.updateOne(
              { _id: 'event_counter' },
              { $set: { last_serial_id: item.serial_id } },
              { upsert: true }
            );
          }

          collectedData.push(item);
          if (collectedData.length >= DATAMAX) return true;
        }
      } catch (err) {
        console.error("Error fetching data:", err.message);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function main() {

  await new Promise(resolve => setTimeout(resolve, 2500));

  const { client, db } = await getDbConnection();
  const eventsCollection = db.collection(COLLECTION_NAME);
  const counterCollection = db.collection(COUNTER_COLLECTION);

  let serialId = await getSerialId(counterCollection);
  const serialIdRef = { value: serialId };

  console.log("Comenzando scrapping geográfico de Waze...");

  const interval = setInterval(async () => {
    const finished = await scrapeAndStore(eventsCollection, counterCollection, serialIdRef);

    console.log(`Eventos únicos insertados: ${uniqueMap.size}`);
    console.log(`Total acumulado en memoria: ${collectedData.length}/${DATAMAX}`);

    if (finished) {
      clearInterval(interval);
      await client.close();
      console.log("Scrapping completado y conexión cerrada.");
    }
  }, INTERVAL_MS);
}

main();
