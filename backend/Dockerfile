# Imagen a usar dentro del contenedor
FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar los archivos de configuración al contenedor
COPY package*.json ./

# Instalar las dependencias de la aplicación
RUN npm install

# Copiar el código fuente de la aplicación al contenedor
COPY ./src ./src

# Crear directorio para logs que será compartido con el sidecar
RUN mkdir -p /usr/src/app/logs

# Se expone el puerto en el que la aplicación escuchará
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]