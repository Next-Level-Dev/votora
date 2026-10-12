# HOSTING THINGY

THIS PROJECT DOESNT AUTO UPDATE LIKE YOUR OTHER ONE, IF YOU WANNA MAKE CHANGES TO THEM MANUALLY
THIS PROJECT DOESNT HAVE DATABASE BACKUPS LIKE YOUR OTHER ONE

## Install Node.js 22 LTS

```bash
# On Ubuntu / Debian:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Or on Amazon Linux 2023:
sudo dnf install -y nodejs git
```

## Clone or Copy Your Project

```bash
git clone <your-repository-url> votora
cd votora
```

## Install Dependencies & Build

```bash
npm install -D esbuild@^0.28.0
npm install
npm run build
```

## Run with PM2 (Process Manager for 24/7 Uptime)

```bash
sudo npm install -g pm2
PORT=3001 pm2 start npm --name "votora" -- run start
pm2 save
pm2 startup
```

That's it! Your server is now running on port `3000`.

## Backups

All user accounts, polls, votes, and groups live in `./data/votora.sqlite`.
To backup:

```bash
cp ./data/votora.sqlite /path/to/backup/votora_$(date +%F).sqlite
```

## UPDATE

pm2 stop votora

git status
git branch --show-current
git remote -v
git pull origin main

npm install
npm run build

pm2 restart votora --update-env
pm2 save
pm2 logs votora --lines 50