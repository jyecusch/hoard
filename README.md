# Hoard - Digital Inventory Management System

A modern web application for organizing and tracking your physical items using a hierarchical container system with QR/DataMatrix code support.

## Features

- **Hierarchical Organization**: Organize items in nested containers (boxes, rooms, shelves, etc.)
- **QR & DataMatrix Codes**: Generate and scan codes for quick item identification
- **Photo Management**: Upload and manage photos for containers and items
- **Smart Search**: Find items quickly across your entire inventory
- **Tagging System**: Add tags to categorize and filter items
- **Favorites**: Mark frequently accessed containers for quick access
- **Real-time Sync**: Powered by Zero for instant data synchronization

## Tech Stack

- **Frontend**: Next.js 15.4, React 19, TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Sync**: Zero by Rocicorp
- **Authentication**: Better Auth
- **Image Processing**: Sharp for image optimization
- **Barcode Support**: QR codes and DataMatrix generation/scanning

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Zero cache server (for real-time sync)

## Deployment

For production deployment with HTTPS/WSS support using Docker Compose, see the [**Deployment Guide**](./deploy/README.md). We provide multiple HTTPS options:
- **Caddy with Let's Encrypt** - Automatic SSL for domains with open ports
- **Cloudflare Tunnel** - No open ports required, works behind firewalls
- **Local HTTPS** - Self-signed certificates for testing

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hoard.git
cd hoard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hoard

# Zero Configuration
NEXT_PUBLIC_ZERO_SERVER=http://localhost:4848
ZERO_UPSTREAM_DB=postgresql://user:password@localhost:5432/hoard
ZERO_CVR_DB=postgresql://user:password@localhost:5432/zero_cvr
ZERO_CHANGE_DB=postgresql://user:password@localhost:5432/zero_cdb

# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Optional: HTTPS for development (for camera access)
# Place certificates in /certificates folder
```

4. Set up the database:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed  # Optional: seed with sample data
```

5. Start the Zero cache server:
```bash
npm run dev:zero
```

6. Run the development server:
```bash
npm run dev
# or for HTTPS (required for camera/QR scanning)
npm run dev:https
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development Scripts

```bash
npm run dev              # Start development server
npm run dev:https        # Start with HTTPS (for camera access)
npm run dev:zero         # Start Zero cache server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Apply database migrations
npm run db:push          # Push schema changes to database
npm run db:seed          # Seed database with sample data
npm run zero:generate    # Generate Zero schema from Drizzle
```

## Project Structure

```
hoard/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── ...          # Feature components
│   ├── db/              # Database schema and migrations
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and configurations
│   ├── providers/       # React context providers
│   └── types/           # TypeScript type definitions
├── drizzle/             # Database migrations
├── public/              # Static assets
└── uploads/             # User uploaded images
```

## Key Features Explained

### Container System
Items are organized in a hierarchical structure where containers can hold both items and other containers. This allows for intuitive organization like:
- House → Room → Closet → Box → Item
- Garage → Shelf → Bin → Tool

### Barcode Integration
- Generate QR codes or DataMatrix codes for any container/item
- Scan codes using device camera for instant navigation
- Custom code assignment for existing labels

### Image Management
- Upload multiple photos per container/item
- Automatic thumbnail generation
- Gallery view with fullscreen support

### Real-time Synchronization
Powered by Zero, all changes are instantly synchronized across all connected clients without page refreshes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.