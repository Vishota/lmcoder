FROM node:20-alpine

COPY ./v3 /app
WORKDIR /app

RUN npm i

CMD npm run start 'Create a simple social network. Requirements: - authorization - subscription - feed - posting - reactions - users rating - tags for posts etc. Use typescript, node.js, vue. Check project before finishing' 