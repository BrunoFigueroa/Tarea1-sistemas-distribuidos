import { MongoClient } from "mongodb";

const uri = "mongodb://mongo:27017";
const client = new MongoClient(uri);

// cambia inconsistencias en lenguaje para cada categoria, deja todo en ingles.
function normalizeType(type) {
  const map = {
    "Chit-Chat": "Chit-Chat",
    "Road Construction": "Construction",
    "Traffic Light Fault": "Traffic Light Fault",
    "Accident": "Accident",
    "Atasco": "Traffic Jam",
    "Corte": "Road Closure"
  };
  return map[type] || "Other";
}

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

function buildKey(doc) {
  return `${doc.type}|${doc.location}|${doc.reporter}|${doc.time}`;
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
        if (!item.type || !item.location || !item.time) {
            continue;
        }
        if (
            item.type.trim().toLowerCase() === "null" ||
            item.location.trim().toLowerCase() === "null" ||
            item.time.trim().toLowerCase() === "null"
        ) {
            continue;
        }

        // Normalizar tipo y tiempo, se explican arriba.
        const normalizedType = normalizeType(item.type.trim());
        const normalizedTime = normalizeTime(item.time.trim());

        // si falla la normalizacion de tiempo, se eliminan (era un valor corrupto o atemporal).
        if (normalizedTime === null) continue;

        const standardized = {
            ...item,
            type: normalizedType,
            time: normalizedTime,
        };

        const key = buildKey(standardized);
        if (!seen.has(key)) {
            seen.add(key);
            cleaned.push(standardized);
        }
    }


    await cleanCollection.deleteMany({});
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
