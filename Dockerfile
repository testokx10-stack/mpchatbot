# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"


FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY package.json ./
RUN npm install

COPY . .


FROM base

COPY --from=build /app /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y wget gnupg ca-certificates && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update -qq && \
    apt-get install --no-install-recommends -y google-chrome-stable && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 3001
ENV PORT=3001
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

CMD [ "node", "dashboard-server.js" ]