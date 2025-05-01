
# Tarea 1 Sistemas Distribuidos

Este proyecto simula y maneja eventos de tráfico en un entorno distribuido. Está compuesto por varios servicios, como un scraper que obtiene datos en tiempo real, un generador de tráfico simulado, una base de datos MongoDB y un sistema de caché usando Redis.

## Componentes del Proyecto

### 1. **docker-compose.yml**

El archivo `docker-compose.yml` define la orquestación de los contenedores Docker que componen el sistema. Utiliza los siguientes servicios:

- **mongo**: Almacena los eventos de tráfico y los contadores.
- **redis**: Sistema de cache.
- **scrapper**: Obtiene datos en tiempo real de una API de tráfico (simulada en este caso).
- **cache**: Servidor local para conectar MongoDB, Redis y Traffic generator.
- **generator**: Genera eventos de tráfico simulados que se envían al sistema para ser procesados.
- **inserter**: Ingresa eventos preobtenidos a la base de datos.

Este archivo permite iniciar todos los servicios en contenedores aislados para simular un sistema distribuido de tráfico sin necesidad de configuraciones manuales complicadas.

# Arquitectura General

El proyecto consta de múltiples servicios que funcionan juntos para extraer datos de tráfico desde Waze, almacenarlos en MongoDB, acelerar consultas mediante Redis, y realizar pruebas de carga con un generador de tráfico. Estos servicios se orquestan con Docker para asegurar que cada componente interactúe correctamente.

## 1. Scrapper
Scraper tiene como objetivo entrar a la pagina web de waze y extraer eventos de forma automatica, para añadir a la base de datos, su funcionamiento es el siguiente.

### Dependencias:
- Depende de MongoDB para almacenar eventos de tráfico extraídos.
- Requiere un navegador automatizado (Puppeteer) para acceder a la información de Waze.
- Se apoya en funciones auxiliares para manejar la interacción con la web.

### Flujo de ejecución:
1. **Inicialización del navegador**: Se abre Chromium en modo automatizado.
2. **Acceso a Waze**: Se carga la página en el navegador.
3. **Gestión de popups**: Si hay un aviso emergente, se cierra.
4. **Carga de elementos**: Se espera a que los marcadores en el mapa estén visibles.
5. **Conexión con la base de datos**: Se establece comunicación con MongoDB.
6. **Ciclo de búsqueda**: Se identifican los eventos en el mapa.
7. **Selección aleatoria**: Se elige un evento al azar.
8. **Validación de clickeabilidad**: Se verifica que el evento pueda ser inspeccionado.
9. **Extracción de información**: Se simula un clic en el evento y se recopilan datos como título, ubicación y hora.
10. **Almacenamiento de datos**: Se guarda la información en MongoDB, asignando un identificador único.
11. **Cierre del evento**: Se cierra el popup para evitar acumulaciones de información abierta.
12. **Reinicio del ciclo**: Se espera unos segundos y se repite el proceso de manera indefinida.

## 2. Mongo Setter
MongoSetter (inserter) tiene como objetivo poblar la base de datos inicialmente usando datos pre-obtenidos, ademas inicializa y configura el sistema para ids secuenciales en la base de datos.

### Dependencias:
- Necesita MongoDB para almacenar datos iniciales.
- Requiere el archivo events.json, que contiene eventos previamente obtenidos por el Scrapper.

### Flujo de ejecución:
1. **Carga de datos**: Se lee el archivo events.json.
2. **Conexión con MongoDB**: Se verifica si la colección de eventos ya existe.
3. **Inicialización del contador**: Si la base de datos está vacía, se crea un identificador incremental.
4. **Asignación de identificadores**: Se recorren los eventos y se les asigna un número de serie único.
5. **Inserción de datos**: Se almacena cada evento con su identificador en la base de datos.
6. **Finalización**: Si la colección ya existía, el programa termina sin insertar datos nuevos.

## 3. Cache Server
Cache tiene como objetivo conectar el generador de trafico con el servicio de cache utilizando redis, ademas de gestionar la conexion con la base de datos para cargar dicho cache cuando sea requerido por la aplicación.

### Dependencias:
- Depende de MongoDB para obtener datos que no estén en la caché.
- Usa Redis para almacenar y recuperar eventos de manera rápida.
- Implementa Express.js para servir las consultas desde una API.

### Flujo de ejecución:
1. **Conexión con Redis**: Se inicializa el almacenamiento en caché.
2. **Recepción de consultas**: Se espera que el Traffic Generator envíe peticiones de eventos por serial_id.
3. **Verificación en Redis**: Se busca primero el evento en caché.
   - Si el evento está en Redis, se devuelve inmediatamente.
   - Si no está, se consulta en MongoDB.
4. **Almacenamiento en caché**: Si el evento fue encontrado en MongoDB, se guarda en Redis para futuras consultas.
5. **Respuesta al usuario**: El evento se envía de vuelta al generador de tráfico.
6. **Manejo de errores**: Si el evento no existe en ningún lado, se devuelve un mensaje de error.

## 4. Traffic Generator
Traffic Generator (generator) tiene como objetivo el simular el envio de querys al cache mediante el uso de paquetes http get, ademas recopila y muestra informacion adicional acerca del rendimiento del sistema.

### Dependencias:
- Necesita conexión con el `Cache Server` para simular consultas reales.
- Depende de `Axios` para enviar solicitudes HTTP.
- Se apoya en mediciones de rendimiento (`perf_hooks`) para calcular tiempos de respuesta.

### Flujo de ejecución:
1. **Configuración inicial**: Se definen límites de tráfico y duración de la prueba.
2. **Inicio de envío**: Se selecciona un patrón de generación de tráfico:
   - **Picos y valles**: Alterna entre ráfagas intensas y momentos de baja actividad.
   - **Aleatorio**: Genera un número de consultas impredecible cada pocos segundos.
3. **Gestión de consultas**: Se acumulan solicitudes en una lista y se envían en intervalos.
4. **Registro de tiempos**: Se mide la latencia de cada respuesta.
5. **Almacenamiento de métricas**: Se guardan las tasas de consulta en archivos.
6. **Finalización**: Cuando el tiempo de prueba termina, se muestra un resumen de rendimiento.

---

## Resumen de la interacción entre servicios
- `Scrapper` obtiene datos de tráfico y los almacena en `MongoDB`.
- `Mongo Setter` carga datos previos en la base de datos si es necesario.
- `Cache Server` gestiona las consultas optimizando con `Redis`.
- `Traffic Generator` pone el sistema bajo carga y mide el rendimiento.

## Como interactuar con este sistema?
- Descargar el repositorio, de la master branch.
- Desde la terminal, entrar al directorio del proyecto.
- ejecutar alguna variante de los siguientes comandos:

1. Si quieres ver el funcionamiento del scraper:
~~~bash
docker compose up --build -d
docker compose logs -f scrapper
~~~

3. Si quieres ver el funcionamiento del traffic generator:
~~~bash
docker compose up --build -d
docker compose logs -f generator
~~~

Recuerda utilizar docker compose down para reiniciar entre deployments.
Adicionamente, si quieres puedes reemplazar scrapper/generator por el nombre de cualquier container (se pueden ver arriba en el apartado docker-compose) para ver los logs de cada contenedor por separado, tambien puedes no dejar argumento, pero eso causaria que todos los contenedores muestren los logs al mismo tiempo en la misma terminal, lo que puede resultar caotico.
