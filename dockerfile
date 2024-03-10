FROM node
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN apt-get update \
    && apt-get install -y default-jre zip \
    && apt-get clean \ 
    && rm -rf /var/lib/apt/lists/* \
    && npm install --production --silent \
    && mv node_modules ../ \
    && apt-get purge -y --auto-remove
COPY . .
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
