# Deployment Guide

This guide covers deploying the AI Query Builder to various production environments.

## Overview

The AI Query Builder consists of three main components that need to be deployed:

1. **Frontend** - Static React application
2. **Backend** - Node.js API server
3. **Database** - MySQL database

## Production Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │    │    Database     │
│   (nginx/ALB)   │◄──►│   Server(s)     │◄──►│   (RDS/MySQL)   │
│                 │    │   (Node.js)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐
│   Static CDN    │
│   (Frontend)    │
│                 │
└─────────────────┘
```

## Environment Preparation

### Production Environment Variables

Create production environment files:

**Backend (.env.production)**:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://user:password@db-host:3306/query_builder
LOG_LEVEL=info
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend (.env.production)**:
```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_APP_ENV=production
```

### Security Configuration

**Backend Security Headers**:
```typescript
// middleware/security.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## Docker Deployment

### Dockerfiles

**Frontend Dockerfile**:
```dockerfile
# packages/frontend/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Backend Dockerfile**:
```dockerfile
# packages/backend/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
USER node
CMD ["npm", "start"]
```

### Docker Compose

**docker-compose.prod.yml**:
```yaml
version: '3.8'

services:
  frontend:
    build: 
      context: ./packages/frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build:
      context: ./packages/backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - database

  database:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=query_builder
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./infra/mysql/init:/docker-entrypoint-initdb.d
    ports:
      - "3306:3306"

volumes:
  mysql_data:
```

### Building and Running

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Run in production
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Cloud Deployment

### AWS Deployment

#### Using AWS Elastic Beanstalk

1. **Prepare Application**:
   ```bash
   # Create deployment package
   npm run build
   zip -r query-builder.zip . -x "node_modules/*" "*.git*"
   ```

2. **Elastic Beanstalk Configuration** (.ebextensions/01-nginx.config):
   ```yaml
   files:
     "/etc/nginx/conf.d/proxy.conf":
       mode: "000644"
       owner: root
       group: root
       content: |
         upstream nodejs {
           server 127.0.0.1:3001;
           keepalive 256;
         }
         
         server {
           listen 80;
           location /api {
             proxy_pass http://nodejs;
             proxy_set_header Connection "";
             proxy_http_version 1.1;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           }
           
           location / {
             root /var/www/html;
             try_files $uri $uri/ /index.html;
           }
         }
   ```

#### Using AWS ECS with Fargate

**Task Definition** (ecs-task-definition.json):
```json
{
  "family": "query-builder",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/query-builder-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "mysql://user:pass@rds-endpoint:3306/query_builder"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/query-builder",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Platform

#### Using Cloud Run

1. **Build and Push Images**:
   ```bash
   # Build backend image
   gcloud builds submit --tag gcr.io/PROJECT-ID/query-builder-backend packages/backend
   
   # Build frontend image
   gcloud builds submit --tag gcr.io/PROJECT-ID/query-builder-frontend packages/frontend
   ```

2. **Deploy Services**:
   ```bash
   # Deploy backend
   gcloud run deploy query-builder-backend \
     --image gcr.io/PROJECT-ID/query-builder-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production,DATABASE_URL="mysql://..."
   
   # Deploy frontend
   gcloud run deploy query-builder-frontend \
     --image gcr.io/PROJECT-ID/query-builder-frontend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Azure Deployment

#### Using Azure Container Instances

**azure-container-group.yaml**:
```yaml
apiVersion: 2019-12-01
location: eastus
name: query-builder
properties:
  containers:
  - name: backend
    properties:
      image: your-registry.azurecr.io/query-builder-backend:latest
      resources:
        requests:
          cpu: 1.0
          memoryInGB: 1.5
      ports:
      - port: 3001
      environmentVariables:
      - name: NODE_ENV
        value: production
      - name: DATABASE_URL
        secureValue: mysql://user:pass@server:3306/db
  - name: frontend
    properties:
      image: your-registry.azurecr.io/query-builder-frontend:latest
      resources:
        requests:
          cpu: 0.5
          memoryInGB: 1.0
      ports:
      - port: 80
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
    - protocol: tcp
      port: 80
    - protocol: tcp
      port: 3001
```

## Database Deployment

### AWS RDS Setup

1. **Create RDS Instance**:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier query-builder-prod \
     --db-instance-class db.t3.micro \
     --engine mysql \
     --engine-version 8.0.35 \
     --master-username admin \
     --master-user-password SecurePassword123 \
     --allocated-storage 20 \
     --storage-type gp2 \
     --vpc-security-group-ids sg-xxxxxxxxx \
     --db-subnet-group-name default \
     --backup-retention-period 7 \
     --storage-encrypted
   ```

2. **Initialize Database**:
   ```bash
   # Connect to RDS instance
   mysql -h query-builder-prod.xxxxxxxxx.us-east-1.rds.amazonaws.com -u admin -p
   
   # Run initialization scripts
   source /path/to/infra/mysql/init/02-query-builder-schema.sql
   ```

### Google Cloud SQL

```bash
# Create Cloud SQL instance
gcloud sql instances create query-builder-prod \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=SecurePassword123 \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --storage-auto-increase

# Create database
gcloud sql databases create query_builder --instance=query-builder-prod

# Import schema
gcloud sql import sql query-builder-prod gs://your-bucket/schema.sql
```

## CI/CD Pipeline

### GitHub Actions

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push backend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: query-builder-backend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG packages/backend
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Build and push frontend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: query-builder-frontend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG packages/frontend
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster production --service query-builder --force-new-deployment
```

### GitLab CI/CD

**.gitlab-ci.yml**:
```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_REGISTRY: registry.gitlab.com/your-group/query-builder

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test
    - npm run lint

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $DOCKER_REGISTRY/backend:$CI_COMMIT_SHA packages/backend
    - docker build -t $DOCKER_REGISTRY/frontend:$CI_COMMIT_SHA packages/frontend
    - docker push $DOCKER_REGISTRY/backend:$CI_COMMIT_SHA
    - docker push $DOCKER_REGISTRY/frontend:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/backend backend=$DOCKER_REGISTRY/backend:$CI_COMMIT_SHA
    - kubectl set image deployment/frontend frontend=$DOCKER_REGISTRY/frontend:$CI_COMMIT_SHA
  only:
    - main
```

## Monitoring and Logging

### Application Monitoring

**Health Check Endpoints**:
```typescript
// Backend health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'connected' // Check actual DB connection
  });
});
```

### Logging Configuration

**Production Logging** (Winston):
```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Metrics Collection

**Prometheus Metrics**:
```typescript
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const databaseConnectionPool = new promClient.Gauge({
  name: 'database_connection_pool_size',
  help: 'Current database connection pool size'
});
```

## SSL/TLS Configuration

### Let's Encrypt with Nginx

**nginx.conf**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

## Performance Optimization

### Frontend Optimization

- **Build Optimization**:
  ```json
  {
    "build": {
      "rollupOptions": {
        "output": {
          "manualChunks": {
            "vendor": ["react", "react-dom"],
            "ui": ["@radix-ui/react-slot"]
          }
        }
      }
    }
  }
  ```

- **CDN Configuration** for static assets
- **Compression** (gzip/brotli)
- **Caching Headers** for optimal browser caching

### Backend Optimization

- **Connection Pooling**:
  ```typescript
  const pool = mysql.createPool({
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
  });
  ```

- **Response Compression**:
  ```typescript
  import compression from 'compression';
  app.use(compression());
  ```

- **Rate Limiting**:
  ```typescript
  import rateLimit from 'express-rate-limit';
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  
  app.use('/api/', limiter);
  ```

## Backup and Recovery

### Database Backup

**Automated Backup Script**:
```bash
#!/bin/bash
# backup.sh

DB_HOST="your-db-host"
DB_USER="backup-user"
DB_PASS="backup-password"
DB_NAME="query_builder"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/database/

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

### Disaster Recovery Plan

1. **Database Recovery**:
   ```bash
   # Restore from backup
   gunzip backup_20231219_120000.sql.gz
   mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < backup_20231219_120000.sql
   ```

2. **Application Recovery**:
   - Deploy from last known good image
   - Verify database connectivity
   - Run health checks
   - Update DNS if needed

## Security Checklist

- [ ] All secrets stored in environment variables
- [ ] Database connections encrypted
- [ ] HTTPS enabled with valid certificates
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Security headers configured
- [ ] Database user has minimal required permissions
- [ ] Regular security updates applied
- [ ] Monitoring and alerting configured

## Troubleshooting

### Common Deployment Issues

**Container Won't Start**:
```bash
# Check logs
docker logs container-id

# Check resource usage
docker stats

# Inspect container
docker inspect container-id
```

**Database Connection Issues**:
```bash
# Test connection
mysql -h host -u user -p database

# Check network connectivity
telnet db-host 3306

# Verify credentials
echo "SELECT 1" | mysql -h host -u user -p
```

**High Memory Usage**:
```bash
# Check Node.js memory usage
node --max-old-space-size=1024 app.js

# Monitor with htop
htop

# Check for memory leaks
node --inspect app.js
```

This deployment guide provides comprehensive instructions for deploying the AI Query Builder to production environments with proper security, monitoring, and backup procedures.
