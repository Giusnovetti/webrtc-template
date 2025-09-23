FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY angular.json tsconfig*.json .editorconfig ./
COPY src ./src

RUN npm run build

# Stage finale Nginx
FROM nginx:alpine

# Copia build Angular nella root di Nginx
COPY --from=build /app/dist/webrtc-secondpeer/browser/ /usr/share/nginx/html/

# Copia nginx.conf e certificati nello stage finale
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY certs /etc/nginx/certs

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
