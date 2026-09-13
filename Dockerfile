# SenChain mockup — single static container.
# Build: docker build -t senchain .   Run: docker run -p 8080:80 senchain
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN apk add --no-cache python3 && npm install --save-dev bun && npx bun install
COPY . .
RUN ./node_modules/.bin/bun run build
RUN python3 tools/build_fonts.py
# bun build emits only JS+CSS assets; the shell page must ship too (paths rewritten /dist/* -> /*)
COPY index.html dist/index.html
RUN sed -i 's|\./dist/|/|g' dist/index.html

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
