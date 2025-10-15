# CORS Configuration Fix

## Problem
```
Access to XMLHttpRequest at 'https://maisql.com/api/patterns' from origin 'https://sbox.maisql.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
The backend server at `maisql.com` wasn't configured to allow cross-origin requests from `sbox.maisql.com`. CORS is a browser security feature that blocks requests from different origins unless explicitly allowed.

## Solution Applied

### 1. Backend CORS Configuration (✅ Fixed)
Updated `/packages/backend/src/index.ts` with specific CORS settings:

```typescript
const corsOptions = {
  origin: [
    'http://localhost:3000',      // Local dev frontend
    'http://localhost:5173',      // Vite dev server
    'https://sbox.maisql.com',    // Sandbox domain
    'https://maisql.com',         // Main domain
    'https://www.maisql.com'      // WWW variant
  ],
  credentials: true,              // Allow cookies/auth headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
```

### 2. What This Does
- ✅ Allows requests from all specified origins
- ✅ Enables credentials (cookies, auth headers)
- ✅ Permits all necessary HTTP methods
- ✅ Handles preflight OPTIONS requests
- ✅ Allows required headers

## Deployment Steps

### For Development
```bash
# Restart the backend server
cd packages/backend
npm run dev
```

### For Production

#### Option 1: Docker Deployment
```bash
# Rebuild and restart the backend container
docker-compose down
docker-compose build backend
docker-compose up -d backend
```

#### Option 2: Direct Deployment
```bash
# On your production server
cd /path/to/query-builder/packages/backend
npm run build
pm2 restart query-builder-backend
# or
systemctl restart query-builder-backend
```

## Verification

### 1. Test the CORS Headers
```bash
curl -I -X OPTIONS https://maisql.com/api/patterns \
  -H "Origin: https://sbox.maisql.com" \
  -H "Access-Control-Request-Method: GET"
```

Expected response should include:
```
Access-Control-Allow-Origin: https://sbox.maisql.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Credentials: true
```

### 2. Browser DevTools Test
1. Open `https://sbox.maisql.com` in Chrome/Firefox
2. Open DevTools (F12) → Network tab
3. Trigger a request to `/api/patterns`
4. Check the response headers - should see `Access-Control-Allow-Origin`

## Additional Notes

### Nginx Configuration
If you're using Nginx as a reverse proxy (as in `/docker/nginx.conf`), ensure it's not adding conflicting CORS headers. The current config has:

```nginx
add_header Access-Control-Allow-Origin * always;
```

This can conflict with backend CORS. Consider removing these lines and letting the backend handle CORS entirely, OR ensure consistency between nginx and backend CORS settings.

### Security Considerations
- ✅ Origins are whitelisted (not using `*`)
- ✅ Credentials are explicitly enabled
- ✅ Only necessary methods are allowed
- ⚠️ For production, regularly audit the allowed origins list

### Common Issues

**Issue**: Still seeing CORS errors after fix
**Solution**: 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check if backend restarted successfully
4. Verify environment variables are loaded

**Issue**: Works locally but not in production
**Solution**:
1. Check if production backend URL is correct
2. Verify SSL certificates are valid
3. Check firewall/security group rules
4. Ensure backend is actually receiving requests (check logs)

**Issue**: CORS works for some endpoints but not others
**Solution**:
1. Ensure CORS middleware is applied before route handlers
2. Check for conflicting middleware
3. Verify all routes are under the same base path

## Testing Checklist
- [ ] Backend server restarted
- [ ] CORS headers present in response
- [ ] Sandbox can make GET requests to `/api/patterns`
- [ ] Sandbox can make POST requests to `/api/generate-query`
- [ ] Authentication works (if using credentials)
- [ ] No CORS errors in browser console

## Need Help?
If CORS errors persist:
1. Check backend logs: `docker logs query-builder-backend-1`
2. Check nginx logs: `docker logs query-builder-nginx-1`
3. Verify DNS resolution: `nslookup maisql.com`
4. Test with curl (examples above)
