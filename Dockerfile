FROM node:20-alpine

COPY ./app /app
WORKDIR /app

RUN npm i

CMD npm run prod