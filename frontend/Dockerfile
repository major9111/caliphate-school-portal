FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files first — Docker caches this layer
# npm ci only reruns if package-lock.json changes
COPY package*.json ./
RUN npm ci --prefer-offline 2>/dev/null || npm install

# Copy source code
COPY . .

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN printf 'server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
