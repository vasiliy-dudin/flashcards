# Flashcards

PWA for learning English vocabulary with AI-generated definitions and audio, and a spaced repetition review system.

## Local Development

```bash
pnpm install
cp data/.env.example data/.env  # fill in API keys
pnpm dev:all                    # starts frontend (5173) + backend (3030)
```

Open `http://localhost:5173`.

## Deploy on Linux Server

### Update

```bash
cd /www/public_html/flashcards && git pull && pnpm i && pnpm build && pm2 restart flashcards-backend
```

### First deploy

```bash
# Clone & install
mkdir -p /www/public_html/flashcards && cd /www/public_html/flashcards
git clone <repo-url> .
npm i -g pnpm pm2
pnpm install

# Configure environment
cp data/.env.example data/.env
nano data/.env
```

```env
GOOGLE_TTS_API_KEY=...
APP_PASSWORD=...
```

```bash
# Build frontend
pnpm build   # outputs to dist/

# Start backend
pm2 start "pnpm server:start" --name flashcards-backend
pm2 save     # persist across reboots
pm2 startup  # follow the printed command to enable autostart
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name example.com;
    error_log /www/logs/error/flashcards.error.log;
    access_log /www/logs/access/flashcards.access.log;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;
    include snippets/ssl-params.nginx;

    root /www/public_html/flashcards/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /audio/ {
        alias /www/public_html/flashcards/data/audio/;
        try_files $uri =404;
        add_header Accept-Ranges bytes;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

```bash
nginx -t && systemctl reload nginx
```


### pm2 reference

```bash
pm2 list                        # list processes
pm2 logs flashcards-backend     # live logs
pm2 stop flashcards-backend
pm2 restart flashcards-backend

# Kill all processes running from the project dir (if needed)
kill -9 $(ps aux | grep '/www/public_html/flashcards' | grep -v grep | awk '{print $2}')
```
