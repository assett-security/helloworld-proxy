# 🚀 Start Here - Deploy Your Free Cloudflare Proxy

**Everything you need to deploy a free, open HTTP/HTTPS proxy for Playwright**

## ⚡ Ultra-Quick Start (Copy & Paste)

```bash
# 1. Install
npm install

# 2. Login
npm run login
npm run whoami  # Copy your Account ID

# 3. Configure (edit wrangler.toml line 10)
# Uncomment: account_id = "your-id-here"

# 4. Deploy
npm run deploy

# 5. Test
echo "PROXY_URL=https://your-worker-url.workers.dev" > .env
npm test
```

**Done!** Copy the Worker URL to your backend `.env` 🎉

## 📚 Documentation

| File | Purpose |
|------|---------|
| **START_HERE.md** | You are here! Quick start |
| **DEPLOY.md** | Complete deployment guide with troubleshooting |
| **README.md** | Quick reference and commands |
| **README_SIMPLE.md** | Detailed feature guide |

## 🎯 What You're Deploying

A free, open HTTP/HTTPS proxy that:
- ✅ Hides your real IP (shows Cloudflare IP instead)
- ✅ Works with Playwright browser automation
- ✅ Deployed to 300+ global edge locations
- ✅ 100% free ($0/month for 100k requests/day)
- ✅ Zero configuration (just deploy!)
- ⚠️ No authentication (keep URL private!)

## ⏱️ Time Estimate

- **First time**: 5 minutes
- **Subsequent deploys**: 30 seconds

## 🆘 Need Help?

**Issue** | **Solution**
----------|-------------
Not logged in | `npm run login`
Missing Account ID | `npm run whoami` then edit `wrangler.toml`
Tests fail | Check `PROXY_URL` in `.env` file
Deploy error | See [DEPLOY.md](DEPLOY.md) troubleshooting section

## 💰 Cost

**FREE FOREVER!**
- Cloudflare Workers Free Tier: 100,000 requests/day
- Your usage: ~5,000 requests/day
- **Cost: $0/month** 🎉

## ⚠️ Security Note

This is an **OPEN PROXY** - no API key required.

✅ Still protected:
- Blocks private IPs (localhost, 192.168.x.x, etc.)
- Rate limiting (10k req/min per IP)
- Request size limits (10MB max)

❌ No user authentication
- Anyone with the URL can use it
- **Keep the Worker URL private!**

## 🎓 What Happens During Deploy?

1. **TypeScript compiles** → JavaScript
2. **Bundles worker code** (~15 KB)
3. **Uploads to Cloudflare**
4. **Deploys to 300+ edge locations** (takes ~2 seconds)
5. **Returns Worker URL**

## ✅ After Deployment

Add to your `backend/.env`:

```bash
CLOUDFLARE_PROXY_ENABLED=true
CLOUDFLARE_PROXY_URL=https://your-actual-worker-url.workers.dev
```

That's it! No API key needed.

## 🧪 Test Your Proxy

```bash
# Quick test
curl -H "X-Proxy-Target: https://httpbin.org/ip" \
     https://your-worker-url.workers.dev

# Full test suite
npm test
```

## 📊 Monitor Usage

```bash
npm run tail  # Real-time logs
```

## 🔄 Update/Redeploy

Made changes? Just deploy again:

```bash
npm run deploy
```

Zero-downtime deployment! ✨

## 🌍 Where Does It Deploy?

Your worker runs on **Cloudflare's edge network**:
- 300+ locations in 100+ countries
- Requests auto-route to nearest edge
- Sub-100ms latency worldwide

## 🎉 Ready?

**Start with step 1** above or read [DEPLOY.md](DEPLOY.md) for the complete guide!

---

**Total Time**: 5 minutes from zero to deployed proxy 🚀
