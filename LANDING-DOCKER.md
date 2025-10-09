# Landing Page Docker Setup

This document explains how to run the landing page in a Docker container, completely separated from the main application.

## Quick Start

### Start the Landing Page

To start the landing page container:

```bash
docker-compose -f docker-compose.landing.yml up -d
```

The landing page will be available at: **http://localhost:8080**

### Stop the Landing Page

To stop the landing page container:

```bash
docker-compose -f docker-compose.landing.yml down
```

### View Logs

To view the landing page logs:

```bash
docker-compose -f docker-compose.landing.yml logs -f landing
```

## Build Options

### Rebuild the Image

If you make changes to the landing page files, rebuild the image:

```bash
docker-compose -f docker-compose.landing.yml up -d --build
```

### Build without Cache

For a complete rebuild:

```bash
docker-compose -f docker-compose.landing.yml build --no-cache
docker-compose -f docker-compose.landing.yml up -d
```

## Port Configuration

By default, the landing page runs on port **8080**. To change the port, edit `docker-compose.landing.yml`:

```yaml
ports:
  - "YOUR_PORT:80"  # Change YOUR_PORT to desired port
```

## Development Workflow

1. Make changes to files in the `landing/` directory
2. Rebuild and restart the container:
   ```bash
   docker-compose -f docker-compose.landing.yml up -d --build
   ```
3. View changes at http://localhost:8080

## Troubleshooting

### Port Already in Use

If port 8080 is already in use, either:
- Stop the service using that port
- Change the port in `docker-compose.landing.yml`

### Container Won't Start

Check the logs:
```bash
docker-compose -f docker-compose.landing.yml logs landing
```

### Clear Everything and Start Fresh

```bash
docker-compose -f docker-compose.landing.yml down -v
docker-compose -f docker-compose.landing.yml up -d --build
```

## Architecture

- **Base Image**: nginx:alpine (lightweight)
- **Web Server**: Nginx
- **Content**: Static HTML, CSS, and JavaScript from `landing/` directory
- **Port**: 8080 (mapped to container port 80)
- **Network**: Isolated network (landing-network)

## Files Structure

```
.
├── Dockerfile.landing              # Docker image definition
├── docker-compose.landing.yml      # Docker Compose configuration
├── docker/
│   └── nginx-landing.conf         # Nginx configuration
└── landing/
    ├── index.html                 # Main landing page
    ├── styles.css                 # Styles
    ├── script.js                  # JavaScript
    └── logo.png                   # Logo image
```

## Production Deployment

For production, consider:
1. Using a reverse proxy (like Caddy or Traefik)
2. Adding SSL certificates
3. Setting up proper domain name
4. Configuring CDN for static assets
5. Using environment-specific configurations

## Integration with Main Application

This landing page Docker setup is **completely independent** from the main application (`docker-compose.yml`). You can:

- Run them separately
- Run them together
- Deploy them to different servers

To run both together:
```bash
docker-compose up -d                               # Main application
docker-compose -f docker-compose.landing.yml up -d # Landing page
```
