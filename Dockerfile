FROM node:11
WORKDIR /usr/share/lilium

COPY package*.json ./

RUN npm install

EXPOSE 8080
CMD [ "node", "index.prod.js" ]
