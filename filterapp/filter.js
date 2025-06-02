import { MongoClient } from "mongodb";
import fs from "fs";

const uri = "mongodb://mongo:27017";
const client = new MongoClient(uri);

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
/*
// normalizar tiempo, pasar dias, meses, horas, minutos, segundos, a un unico medio temporal, en este caso, minutos.
function normalizeTime(timeStr) {
  if (!timeStr) return null;

  const minMatch = timeStr.match(/(\d+)\s*min/);
  if (minMatch) {
    return parseInt(minMatch[1]);
  }

  const hourMatch = timeStr.match(/(\d+)\s*hour/);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }

  const dayMatch = timeStr.match(/(\d+)\s*day/);
  if (dayMatch) {
    return parseInt(dayMatch[1]) * 24 * 60;
  }

  return null;
}
*/
/*
function buildKey(doc) {
  return `${doc.type}|${doc.location}|${doc.reporter}|${doc.time}`;
}
*/
function buildKey(doc) {
  return [
    doc.title?.toLowerCase().trim(),
    doc.category?.toLowerCase().trim(),
    doc.street?.toLowerCase().trim(),
    doc.coordinates?.lat,
    doc.coordinates?.lon
  ].join('|');
}

async function main() {
  try {
    await client.connect();
    const db = client.db("trafficData");
    const rawCollection = db.collection("events");
    const cleanCollection = db.collection("filtered_events");

    const rawData = await rawCollection.find({}).toArray();
    const seen = new Set();
    const cleaned = [];

    for (let item of rawData) {
        // Que existan todos los campos, y que no tengan info nula, o undefined.
        if (!item.title || !item.category || !item.street ||
          !item.coordinates || typeof item.coordinates.lat !== "number" || 
          typeof item.coordinates.lon !== "number"
        ) {
            continue;
        }
        /*
        if (
            item.type.trim().toLowerCase() === "null" ||
            item.location.trim().toLowerCase() === "null" ||
            item.time.trim().toLowerCase() === "null"
        ) {
            continue;
        }
        */

        // Normalizar tipo y tiempo, se explican arriba.
        const normalizedType = normalizeType(item.category.trim());
        //const normalizedTime = normalizeTime(item.time.trim());

        // si falla la normalizacion de tiempo, se eliminan (era un valor corrupto o atemporal).
        //if (normalizedTime === null) continue;

        const standardized = {
            ...item,
            category: normalizedType,
            //time: normalizedTime,
        };

        const key = buildKey(standardized);
        if (!seen.has(key)) {
            seen.add(key);
            cleaned.push(standardized);
        }
    }


    await cleanCollection.deleteMany({});

    // Exportar json para el pig.
    fs.writeFileSync("./filtered_data.json", JSON.stringify(cleaned, null, 2));
    console.log("Filtered data exported to ./filtered_data.json");


    await cleanCollection.insertMany(cleaned);

    console.log(`Filtered and inserted ${cleaned.length} events.`);
  } catch (err) {
    console.error("Error filtering data:", err);
  } finally {
    await client.close();
  }
}

await new Promise(resolve => setTimeout(resolve, 2000));

main();
