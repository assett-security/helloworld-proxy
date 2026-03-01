# Cloudflare Proxy - Deploy Package

**Minimal deployment package for Cloudflare Workers HTTP/HTTPS proxy**

⚠️ **OPEN PROXY** - No authentication required. Keep the URL private!

## 📦 What's Included

```
proxy-deploy/
├── src/
│   └── index.ts           # Proxy worker code
├── scripts/
│   ├── deploy.sh          # Deployment script
│   └── test-proxy.js      # Test suite
├── wrangler.toml          # Cloudflare config
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── .gitignore             # Git exclusions
├── .env.example           # Environment template
└── README.md              # This file
```

## 🚀 Quick Deploy (3 Steps)

### 1. Install & Login

```bash
cd proxy-deploy
npm install
npm run login
npm run whoami  # Copy your Account ID
```

### 2. Configure

Edit `wrangler.toml` (line 10):
```toml
# Uncomment and fill in:
account_id = "your-account-id-here"
```

### 3. Deploy

```bash
npm run deploy
```

Done! You'll get: `https://helloworld-proxy.your-username.workers.dev`

## ✅ Test

```bash
# Save your proxy URL
echo "PROXY_URL=https://helloworld-proxy.your-username.workers.dev" >> .env

# Run tests
npm test
```

## 🔧 Use with Backend

Add to `backend/.env`:

```bash
CLOUDFLARE_PROXY_ENABLED=true
CLOUDFLARE_PROXY_URL=https://helloworld-proxy.your-username.workers.dev
```

## 📊 Monitor

```bash
npm run tail  # View real-time logs
```

## 💰 Cost

**FREE** - 100k requests/day (way more than needed!)

## 🆘 Help

**Issue**: "Not logged in"
**Fix**: `npm run login`

**Issue**: "Account ID not found"
**Fix**:
1. Run `npm run whoami`
2. Copy Account ID
3. Edit `wrangler.toml` and set `account_id`

**Issue**: "Tests fail"
**Fix**: Check PROXY_URL in `.env` matches your deployment

## ⚠️ Security Note

This is an **OPEN PROXY** without authentication:
- ✅ Blocks private IPs (127.0.0.1, 192.168.x.x, etc.)
- ✅ Rate limiting (10k req/min per IP)
- ❌ No API key required
- ❌ Anyone with URL can use it

**Keep the Worker URL private!**

## 📚 Features

- ✅ IP Protection (300+ Cloudflare edges)
- ✅ CORS Support (automatic)
- ✅ Request Logging (unique IDs)
- ✅ Timeout Protection (30s)
- ✅ Error Handling (graceful)
- ✅ Zero Configuration (deploy & go!)

---

**Questions?** See [README_SIMPLE.md](README_SIMPLE.md) for detailed guide.
