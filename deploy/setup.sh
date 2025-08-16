#!/bin/bash

set -e

echo "🚀 Hoard Deployment Setup"
echo "========================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
    echo ""
fi

# Function to generate random secret
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check for required environment variables
source .env

# Generate secrets if not set
if [ "$BETTER_AUTH_SECRET" = "your-secret-key-here-minimum-32-chars" ] || [ -z "$BETTER_AUTH_SECRET" ]; then
    echo "🔐 Generating BETTER_AUTH_SECRET..."
    NEW_SECRET=$(generate_secret)
    sed -i.bak "s/BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=$NEW_SECRET/" .env
    echo "✅ BETTER_AUTH_SECRET generated"
fi

if [ "$JWT_SECRET" = "your-jwt-secret-here-minimum-32-chars" ] || [ -z "$JWT_SECRET" ]; then
    echo "🔐 Generating JWT_SECRET..."
    NEW_SECRET=$(generate_secret)
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" .env
    echo "✅ JWT_SECRET generated"
fi

# Clean up backup files
rm -f .env.bak

echo ""
echo "🔍 Checking deployment profile..."
echo ""
echo "Please select your HTTPS deployment method:"
echo "1) Caddy with Let's Encrypt (requires domain and open ports 80/443)"
echo "2) Cloudflare Tunnel (no open ports required)"
echo "3) Local HTTPS (development/testing with self-signed cert)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        PROFILE="caddy"
        echo ""
        if [ "$DOMAIN" = "yourdomain.com" ] || [ -z "$DOMAIN" ]; then
            read -p "Enter your domain name (e.g., app.example.com): " domain
            sed -i.bak "s/DOMAIN=.*/DOMAIN=$domain/" .env
            sed -i.bak "s|APP_URL=.*|APP_URL=https://$domain|" .env
            rm -f .env.bak
        fi
        echo "✅ Caddy profile configured"
        ;;
    2)
        PROFILE="cloudflare"
        echo ""
        if [ "$TUNNEL_TOKEN" = "your-cloudflare-tunnel-token-here" ] || [ -z "$TUNNEL_TOKEN" ]; then
            echo "⚠️  You need to set up a Cloudflare Tunnel first."
            echo "   Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/"
            echo ""
            read -p "Enter your Cloudflare Tunnel token: " token
            sed -i.bak "s/TUNNEL_TOKEN=.*/TUNNEL_TOKEN=$token/" .env
            rm -f .env.bak
        fi
        echo "✅ Cloudflare profile configured"
        ;;
    3)
        PROFILE="local"
        sed -i.bak "s|APP_URL=.*|APP_URL=https://localhost|" .env
        rm -f .env.bak
        echo "✅ Local profile configured"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📦 Building and starting services..."
echo ""

# Build the application image first
echo "🔨 Building application image..."
docker compose build app

# Setup database
echo "🗄️  Setting up database..."
docker compose up -d postgres
sleep 5  # Wait for postgres to be ready

# Run database migrations and deploy Zero permissions
echo "🔄 Running database migrations and deploying Zero permissions..."
docker compose up migrate

# Run the application with the selected profile
echo "🚀 Starting application with $PROFILE profile..."
docker compose --profile $PROFILE up -d

echo ""
echo "✨ Deployment complete!"
echo ""

case $PROFILE in
    caddy)
        echo "Your app should be available at: https://$DOMAIN"
        echo "Note: It may take a few minutes for Let's Encrypt certificates to be issued."
        ;;
    cloudflare)
        echo "Your app should be available through your Cloudflare Tunnel URL."
        echo "Check your Cloudflare Zero Trust dashboard for the public hostname."
        ;;
    local)
        echo "Your app should be available at: https://localhost"
        echo "Note: You'll see a certificate warning in your browser - this is expected."
        ;;
esac

echo ""
echo "To view logs: docker compose --profile $PROFILE logs -f"
echo "To stop: docker compose --profile $PROFILE down"
echo ""