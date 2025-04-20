# Tarea1-sistemas-distribuidos
El suicidio siempre es una opcion.


anotaciones:

tarea 1 sistemas distribuidos:

- waze.
- Docker.


1. Datos y cache

    -> sistema de almacenamiento y caching

    - Extraer automaticamente la informacion de waze (Web scrapping sobre la region metropolitana)
    - Guardar eventos en un sistema de almacenamiento -> 10.000 eventos
    - Sistema de generacion de trafico que obtenga datos del sistema de almacenamiento y los envie siguiendo dos distribuciones de tasa de arribo.
    - Implementar sistema de cache que consuma eventos del generador de trafico y almacene aquellos eventos repetitivos. (sistema parametrizado de manera experimental)

2. Requerimientos

    - Diseño modular.
        - Modulos indeependientes que faciliten mantenimiento y futuras expansiones.
        - Scrapper
        - Almacenamiento
        - generador de trafico
        - Cache

    - Extraccion y almacenamiento
        - Scrapear de https://www.waze.com/es-419/live-map/
        - generador de trafico con 2 modles de llegada de eventos
        - sistema de almacenamiento que cumpla con respuestas rapidas y actualizaciones frecuentes. almenos 10.000 eventos almacenados.
    
    - Cache
        - Sistema de hashing para coinsultas frecuentes.
        - Politicas de remocion y tamaños de cache considerando almenos 2 politicas distintas.
        - Analizar comportamiento del sistyema bajo diferentes distribuciones para la generacion de trafico.
        - Parametrizar y justificar desiciones basado en el comportamineto experimental
    
    - Distribuciones de servicios
        - Desplegable y ejecutable en contenedores Docker.
    
    - Documentacion



Scrapper -> python -> scrappy y otros.
datos -> mongo o psql.
generador de trafico, 2 distribuciones. picos valles azar.
cache -> limites, data, y politica de reemplazo. -> redis


Discord Bastian:

Cache: Redis (alto rendimiento) o Memcached (sencillez) / Buscar como implementar 
Scraper: Implementar en python usando BeautifulSoup o Scrapy / Almacenar datos en formato JSON 
Almacenamiento: Mongo o SQL
Generador de Trafico: Python
Contenedor: Docker
Sistema de cache: Eventos repetitivos y reemplazo (Ej. LRU, MRU, etc) : Metricas de evaluacion: Hit rate, Miss rate, Latencia Promedio

El scraper recupera datos que pone en almacenamiento. El almace-
namiento es el repositorio de los datos que es consumido posteriormente por el generador de tráfico
sintético para simular consultas con tasas de arribo. Finalmente el sistema de cache recibe consultas
desde el generador de tráfico.
