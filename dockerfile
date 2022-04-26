FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm config set registry http://registry.npm.taobao.org/

RUN npm install

COPY . .

EXPOSE 3000
CMD [ "node", "app.js" ]
