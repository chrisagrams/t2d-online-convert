FROM node:current-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN apk update \
    && apk add --no-cache openjdk11-jre zip \
    && npm install --production --silent \
    && mv node_modules ../
COPY app.js package.json ./
COPY org ./org
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
