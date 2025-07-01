Se tienen que hacer cambios al almacenamiento, el proceso de filtrado y agrupamiento, no se si es rentable seguir haciendolo con mongo, asi que puede ser rentable cambiar a psql, o mysql.

Re-scrappear -> cuando se filtren y agrupen los datos, se van a reducir, aumentar de nuevo a 10k.

Agregar codigo de: 

  - Filtering y Homogeneización: orientado a la limpieza, unificación y estandarización de los datos (eventos).

  - Procesador y analizador de data distribuida: realizado mediante Apache Pig

hace falta agregar un nuevo contenedor de Apache Pig para procesar esto.

Hacer el analisis de la info almacenada:
  - Conteo
  - Agrupamiento
  - filtrado
  - estadísticas descriptivas básicas
Todo para obtener una primera visión sobre los datos recolectados.
