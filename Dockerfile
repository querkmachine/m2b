FROM node:20-alpine
RUN mkdir -p /usr/tmp/m2b/node_modules && chown -R node:node /usr/tmp/m2b
WORKDIR /usr/tmp/m2b
COPY package*.json ./
USER node
RUN npm ci
VOLUME ["/data"]
COPY --chown=node:node . .
CMD ["node", "app.mjs"]
