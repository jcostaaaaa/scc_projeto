# Use a imagem Node.js 14 LTS como base
FROM node:latest

# Defina o diretório de trabalho no contêiner
WORKDIR /usr/src/app

# Copie o arquivo package.json e package-lock.json para o contêiner
COPY package*.json ./

# Instale as dependências do Node.js
RUN npm install

# Copie o código-fonte para o diretório de trabalho no contêiner
COPY . .

# Expose port 9999
EXPOSE 9999

# Comando para iniciar o aplicativo
CMD [ "node", "server.js" ]
