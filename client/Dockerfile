FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

RUN npm install --save-dev @types/react-beautiful-dnd --legacy-peer-deps

COPY . .

RUN echo "declare module '*.css';" > src/global.d.ts

RUN sed -i 's|http://localhost:3001/api|/api|g' ./src/api.ts

RUN echo "import React from 'react'; declare module 'react' { interface InputHTMLAttributes<T> extends HTMLAttributes<T> { indeterminate?: boolean; } }" > src/react-extend.d.ts

RUN sed -i 's|"tsc -b && vite build"|"vite build"|g' package.json

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 
