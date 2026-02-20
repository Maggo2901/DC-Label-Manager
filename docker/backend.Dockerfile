FROM node:20-alpine

WORKDIR /workspace/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/. ./
COPY shared/ /workspace/shared/

RUN chown -R node:node /workspace

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/api/health',timeout:3000},res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1);});"

USER node

CMD ["node", "server.js"]
