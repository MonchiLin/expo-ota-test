https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

docker build . -t kiki/node-web-app

docker run -p 49160:3000 -d kiki/node-web-app
