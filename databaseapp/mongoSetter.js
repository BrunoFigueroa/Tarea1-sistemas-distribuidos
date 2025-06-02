const fs = require('fs');
const { MongoClient } = require('mongodb');

// NOMBRE DB Y COLECCION
const url = 'mongodb://mongo:27017';
const dbName = 'trafficData';
const collectionName = 'events';
const counterCollectionName = 'counter';

// FUNCION PARA INSERTAR LOS EVENTOS.
async function insertData() {

  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // LEER EL ARCHIVO events.json Y GUARDARLO EN UNA VARIABLE.
    const data1 = JSON.parse(fs.readFileSync('/data/DATA.json', 'utf-8'));
    const data2 = JSON.parse(fs.readFileSync('/data/DATA2.json', 'utf-8'));
    const data = [...data1, ...data2];

    // CONECTARSE A MONGO.
    const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

    const db = client.db(dbName);
    const collections = await db.listCollections({ name: counterCollectionName }).toArray();

    // SI LAS COLECCIONES YA EXISTEN, ENTONCES ESTE PROGRAMA ES INNECESARIO Y SE TERMINA LA EJECUCION.
    if (collections.length > 0) {
      console.log(`Collection "${counterCollectionName}" already exists. Exiting...`);
      client.close();
      process.exit(0);
    }

    const eventsCollection = db.collection(collectionName);
    const counterCollection = db.collection(counterCollectionName);

    // INICIAR EL ID SERIAL, SE LE VA A SUMAR 1 CADA VEZ QUE SE INSERTE ALGO.
    await counterCollection.insertOne({
      _id: 'event_counter',
      last_serial_id: 0
    });
    console.log('Counter initialized.');

    let serial_id = 1;

    // AGREGAR EL SERIAL AL JSON DEL EVENTO Y ACTUALIZAR EL SERIAL.
    const eventsWithSerialId = data.map(event => {
      return {
        serial_id: serial_id++,
        ...event
      };
    });

    await counterCollection.updateOne(
      { _id: 'event_counter' },
      { $set: { last_serial_id: serial_id - 1 } }
    );

    console.log("Example record before insert:");
    console.log(JSON.stringify(eventsWithSerialId[0], null, 2));

    // INGRESA LA DATA A MONGO
    const result = await eventsCollection.insertMany(eventsWithSerialId);

    const sample = await eventsCollection.findOne({ serial_id: 1 });
  console.log("Sample inserted document:", sample);

    console.log(`${result.insertedCount} events inserted successfully with serial_id!`);
    client.close();
  } catch (err) {
    console.error('Error inserting data:', err);
  }
}


insertData();
