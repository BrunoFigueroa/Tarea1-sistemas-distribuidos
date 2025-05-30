const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');

// NOMBRE DE DB, Y COLECCIONES
const url = 'mongodb://mongo:27017';
const dbName = 'trafficData';
const collectionName = 'events';
const counterCollectionName = 'counter';

// CONEXION A MONGO (USANDO LA CONFIGURACION DE DOCKER)
async function getDbConnection() {
  const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = client.db(dbName);
  return { client, db };
}

// FUNCIONES UTILES PARA DESPUES, LA PRIMERA ES UN SLEEP(), LA SEGUNDA REVISA SI UN ELEMENTO HTML ES CLICKEABLE.
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function isClickable(element) {
  const box = await element.boundingBox();
  return box && box.width > 0 && box.height > 0;
}

//  ESTO ES EL SCRAPPER, FUNCIONA DE LA SIGUIENTE FORMA:
//    1. ABRE CHROMIUM Y ENTRA A LA PAGINA DE WAZE.
//    2. CIERRA EL POPUP DE INICIO EN WAZE, SI NO LO ENCUENTRA, PASA DE LARGO.
//    3. ESPERA A QUE LO ELEMENTOS CARGUEN.
//    4. CONSIGUE EL ID SERIAL DE MONGO (explicado en el apartado de mongo).
//    5. INICIA EL CICLO INFINITO DE SCRAPPING.
//    6. ESCANEA LOS EVENTOS CLICKEABLES Y LOS AGREGA A UNA LISTA, SI NO ENCUENTRA NINGUNO, ESPERA 3 SEGUNDOS Y SE PASA AL SIGUIENTE CICLO.
//    7. SELECCIONA UNO DE LOS EVENTOS ALEATORIAMENTE.
//    8. VE SI EL ELEMENTO SELECCIONADO ES CLICKEABLE.
//    9. CLICKEA EL ELEMENTO Y CONSIGUE LA DATA USANDO SU CLASE HTML. (se tiene que simular el click, o waze no carga la data del elemento)
//    10. INTRODUCE EL ELEMENTO COMO UN JSON A LA BASE DE DATOS MONGO, AGREGA TAMBIEN EL ID SERIAL Y LO ACTUALIZA.
//    11. CIERRA EL EVENTO, Y ESPERA UNOS SEGUNDOS ANTES DE EMPEZAR EL SIGUIENTE BUCLE. (la espera es para evitar sobrecargar el servicio de waze, si lo tuviera funcionando sin ningun tipo de sleep(), se harian cientos de peticiones por segundo, y dependiendo del sistema implementado en waze, podria ser baneado, o denegado de servicio, lo cual complicaria el proceso de scrapping)
//    12. SI HUBO UN ERROR, SE ENTIENDE QUE EL EVENTO CLICKEADO NO ERA VALIDO Y SE CONTINUA AL SIGUIENTE CICLO.

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] //esto lo pide el docker, te obliga a ejecutar en no-sandbox.
  });

  // 1.
  const page = await browser.newPage();

  console.log('Launching browser and navigating to Waze live map...');
  await page.goto('https://www.waze.com/en-US/livemap', { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('.waze-tour-tooltip__acknowledge', { timeout: 5000 }).catch(() => {
    console.log('No initial "Got it" popup detected.');
  });

  // 2.
  const gotItButton = await page.$('.waze-tour-tooltip__acknowledge');
  if (gotItButton) {
    console.log('Clicking the "Got it" button...');
    await gotItButton.click();
    await delay(2000);
  } else {
    console.log('No "Got it" button found, continuing...');
  }

  // 3.
  await page.waitForSelector('.leaflet-marker-icon');
  console.log('Map loaded and markers visible.');

  // 4.
  const { client, db } = await getDbConnection();
  const eventsCollection = db.collection(collectionName);
  const counterCollection = db.collection(counterCollectionName);

  const counter = await counterCollection.findOne({ _id: 'event_counter' });
  let serialId = counter ? counter.last_serial_id + 1 : 1;

  console.log('Starting event data collection...');

  // 5.
  while (true) {
    // 6.
    let markers = await page.$$('.leaflet-marker-icon');
    console.log(`Found ${markers.length} markers.`);

    if (markers.length === 0) {
      console.log('No events found. Retrying...');
      await delay(3000);
      continue;
    }

    // 7.
    const randomMarkerIndex = Math.floor(Math.random() * markers.length);
    const selectedMarker = markers[randomMarkerIndex];

    try {
      console.log(`Clicking marker ${randomMarkerIndex + 1}...`);

      // 8.
      const clickable = await isClickable(selectedMarker);
      if (!clickable) {
        console.log(`Marker ${randomMarkerIndex + 1} is not clickable. Skipping...`);
        continue;
      }

      await selectedMarker.click();

      // 9.
      const timeout = 1000;
      await page.waitForSelector('.leaflet-popup-content-wrapper', { timeout: timeout })
        .catch(e => console.log(`Popup timeout: Timeout exceeded ${timeout}ms`));

      const eventData = await page.evaluate(() => {
        const popup = document.querySelector('.leaflet-popup-content-wrapper');
        if (!popup) return null;

        const title = popup.querySelector('.wm-alert-details__title')?.innerText || 'Unknown';
        const address = popup.querySelector('.wm-alert-details__address')?.innerText || 'Unknown';
        const reporter = popup.querySelector('.wm-alert-details__reporter-name')?.innerText || 'Unknown';
        const time = popup.querySelector('.wm-alert-details__time')?.innerText || 'Unknown';
        return { title, address, reporter, time };
      });

      // 10.
      if (eventData) {
        eventData.serial_id = serialId++;
        
        await eventsCollection.insertOne(eventData);
        console.log(`Event inserted with serial ID: ${eventData.serial_id}`);
        
        await counterCollection.updateOne(
          { _id: 'event_counter' },
          { $set: { last_serial_id: serialId - 1 } }
        );
      } else {
        console.log('No data found in the popup.');
      }

      // 11.
      await page.evaluate(() => {
        const closeButton = document.querySelector('.leaflet-popup-close-button');
        if (closeButton) closeButton.click();
      });

      await delay(1000);

      // 12.
    } catch (error) {
        if (error.message.includes('Node is either not clickable or not an Element')) {
            console.log(`Error with marker ${randomMarkerIndex + 1}: Marker is not clickable or not an element.`);
          } else {
            console.log('Error with event marker:', error);
          }
    }

    await delay(2000);
  }
})();
