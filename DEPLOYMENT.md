# Votora - Deployment & Self-Hosting Guide

This guide walks you through hosting **Votora** on your Amazon Web Services (AWS) cloud server (EC2 or Lightsail with 2GB RAM).

---

## 1. Tech Stack Overview

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React.
- **Backend**: Express REST API (`server.ts`) with Vite static production serving.
- **Database**: SQLite3 (`./data/votora.sqlite` powered by pure WASM `sql.js`).
- **RAM Footprint**: **~35 MB – 50 MB total memory**, leaving >1.8 GB free on a 2 GB server!
- **Zero Native Toolchain Dependencies**: Runs without needing `node-gyp`, `gcc`, or `make`.

---

## 2. Why Vite + Express + SQLite Beats Next.js on a 2GB RAM Server

| Metric | Vite + Express + SQLite (Current) | Next.js with SSR |
| :--- | :--- | :--- |
| **Idle Memory (RAM)** | **~40 MB** | ~150 MB – 250 MB |
| **Build Memory Peak** | **~120 MB** | **800 MB – 1.4 GB** (frequently hits Out-Of-Memory on 2GB VMs) |
| **CPU Overhead** | Extremely Low | Medium-High (Node SSR render passes) |
| **Backup Simplicity** | 1 file (`data/votora.sqlite`) | 1 file (if SQLite) |
| **Cold Start Time** | < 1 second | 3–6 seconds |

---

## 3. Quick Setup on AWS (Ubuntu 22.04 / 24.04 or Amazon Linux 2023)

### Step 1: Install Node.js 22 LTS
```bash
# On Ubuntu / Debian:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Or on Amazon Linux 2023:
sudo dnf install -y nodejs git
```

### Step 2: Clone or Copy Your Project
```bash
git clone <your-repository-url> votora
cd votora
```

### Step 3: Install Dependencies & Build
```bash
npm install
npm run build
```

### Step 4: Run with PM2 (Process Manager for 24/7 Uptime)
```bash
sudo npm install -g pm2
pm2 start npm --name "votora" -- run start
pm2 save
pm2 startup
```

That's it! Your server is now running on port `3000`.

---

## 4. (Optional) Nginx Reverse Proxy with Free SSL (HTTPS)

### Install Nginx:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Configure Nginx (`/etc/nginx/sites-available/votora`):
```nginx
server {
    server_name yourdomain.com; # Or your server's public IP

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/votora /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Enable HTTPS with Certbot:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## 5. Docker Alternative (One-Command Deployment)

If you prefer Docker:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

Run:
```bash
docker build -t votora .
docker run -d --name votora -p 3000:3000 -v $(pwd)/data:/app/data --restart always votora
```

---

## 6. Backups

All user accounts, polls, votes, and groups live in `./data/votora.sqlite`.
To backup:
```bash
cp ./data/votora.sqlite /path/to/backup/votora_$(date +%F).sqlite
```
