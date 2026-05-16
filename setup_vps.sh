#!/bin/bash

# ComZera Expense Manager - VPS Setup Script
# Works on Ubuntu/Debian

echo "🚀 Starting VPS Setup for Expense Manager..."

# 1. Update and Install Dependencies
echo "📦 Updating system and installing Nginx & Git..."
sudo apt update
sudo apt install -y nginx git

# 2. Prepare Directory
echo "📂 Preparing web directory..."
sudo mkdir -p /var/www/comzera
sudo chown $USER:$USER /var/www/comzera

# 3. Clone Repository
echo "📥 Cloning repository from GitHub..."
if [ -d "/var/www/comzera/.git" ]; then
    cd /var/www/comzera && git pull
else
    git clone https://github.com/Muniflow-CZTech/ComZeraForecasting.git /var/www/comzera
fi

# 4. Get Server IP
SERVER_IP=$(curl -s https://ifconfig.me)
echo "🌐 Detected Server IP: $SERVER_IP"

# 5. Configure Nginx
echo "⚙️ Configuring Nginx..."
cat <<EOF | sudo tee /etc/nginx/sites-available/comzera
server {
    listen 80;
    server_name $SERVER_IP;

    root /var/www/comzera/ExpenseManager;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }

    # Enable compression
    gzip on;
    gzip_types text/plain text/css application/javascript image/*;
}
EOF

# 6. Enable Site and Restart Nginx
echo "✅ Finalizing configuration..."
sudo ln -sf /etc/nginx/sites-available/comzera /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "✨ SETUP COMPLETE!"
echo "------------------------------------------------"
echo "Your app is now live at: http://$SERVER_IP"
echo "------------------------------------------------"
