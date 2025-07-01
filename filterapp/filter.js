import { MongoClient } from "mongodb";
import fs from "fs";

const uri = "mongodb://mongo:27017";
const client = new MongoClient(uri);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// cambia inconsistencias en lenguaje para cada categoria, deja todo en ingles.
function normalizeType(type) {
  const map = {
    "JAM": "Traffic Jam",
    "JAM_HEAVY_TRAFFIC": "Heavy Traffic",
    "JAM_MODERATE_TRAFFIC": "Moderate Traffic",
    "JAM_STAND_STILL_TRAFFIC": "Standstill Traffic",
    "CHIT_CHAT": "Chit-Chat",
    "POLICE": "Police",
    "POLICE_WITH_MOBILE_CAMERA": "Police with Mobile Camera",
    "POLICE_HIDING": "Hiding Police",
    "ROAD_CLOSED": "Road Closed",
    "ROAD_CLOSED_EVENT": "Road Closed",
    "ACCIDENT": "Accident",
    "ACCIDENT_MAJOR": "Major Accident",
    "HAZARD_ON_ROAD": "Road Hazard",
    "HAZARD_ON_ROAD_OBJECT": "Object on Road",
    "HAZARD_ON_ROAD_POT_HOLE": "Pothole",
    "HAZARD_ON_ROAD_CONSTRUCTION": "Construction",
    "HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT": "Traffic Light Fault",
    "HAZARD_ON_ROAD_LANE_CLOSED": "Lane Closed",
    "HAZARD_ON_ROAD_CAR_STOPPED": "Car Stopped on Road",
    "HAZARD_ON_SHOULDER_CAR_STOPPED": "Car Stopped on Shoulder",
    "HAZARD_ON_ROAD_ROAD_KILL": "Roadkill",
    "HAZARD_WEATHER": "Weather Hazard",
    "HAZARD_WEATHER_FLOOD": "Flood",
    "HAZARD_WEATHER_FOG": "Fog",
    "HAZARD_WEATHER_HEAVY_SNOW": "Heavy Snow"
  };
  return map[type] || "Other";
}

function buildKey(item) {

  const key = [
    item.title?.toLowerCase().trim(),
    item.category?.toLowerCase().trim(),
    item.street?.toLowerCase().trim(),
    item.lat,
    item.lon
  ].join('|');

  return key;
}

async function main() {
  try {
    await client.connect();
    const db = client.db("trafficData");
    const rawCollection = db.collection("raw_incidents");
    const cleanCollection = db.collection("filtered_incidents");

    const rawData = await rawCollection.find({}).toArray();
    const seen = new Set();
    const cleaned = [];

    for (let item of rawData) {
      // Recuperar coordenadas si no están
      item.lat = item.lat ?? item.coordinates?.lat ?? item.location?.y ?? null;
      item.lon = item.lon ?? item.coordinates?.lon ?? item.location?.x ?? null;

      // Validar solo los campos esenciales
      if (!item.category || typeof item.lat !== "number" || typeof item.lon !== "number") {
        continue;
      }

      // Normalizar tipo
      const normalizedType = normalizeType(item.category.trim());

      const standardized = {
        ...item,
        category: normalizedType
      };

      const key = buildKey(standardized);
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(standardized);
      }
    }


    await cleanCollection.deleteMany({});

    // Exportar json para el pig.
    fs.writeFileSync("/csv/filtered_data.json", JSON.stringify(cleaned, null, 2));
    console.log("Filtered data exported to ./filtered_data.json");
    console.log("Filtered data exported to /csv/filtered_data.json");

    console.log(`Valid incidents found: ${cleaned.length}`);
    await cleanCollection.insertMany(cleaned);
    console.log("Filtered data inserted to filtered_incidents");
    
  } catch (err) {
    console.error("Error filtering data:", err);
  } finally {
    await client.close();
  }
}

(async () => {
  console.log("Waiting for MongoDB...");
  await sleep(5*1000); // Espera inicial por mongo y inserter.

  while (true) {
    await main();
    console.log("Waiting 1 hour until next filter cycle...\n");
    await sleep(3600 * 1000);
  }
})();
