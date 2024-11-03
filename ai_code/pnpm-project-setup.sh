# Install pnpm if not already installed
npm install -g pnpm

# Create project root directory
mkdir food-delivery-app && cd food-delivery-app

# Frontend Setup (Next.js)
pnpm create next-app frontend --typescript --tailwind --eslint
cd frontend
pnpm add @tanstack/react-query axios @reduxjs/toolkit react-redux zustand @shadcn/ui
pnpm add -D @types/node @types/react @types/react-dom

# Option 1: NestJS Backend Setup
cd ..
pnpm dlx @nestjs/cli new backend --package-manager pnpm
cd backend
pnpm add @nestjs/swagger @nestjs/config @nestjs/jwt @prisma/client bcrypt
pnpm add -D @types/bcrypt

# Option 2: ElysiaJS Backend Setup
cd ..
mkdir elysia-backend && cd elysia-backend
pnpm init
pnpm add elysia @elysiajs/cors @elysiajs/jwt @elysiajs/swagger
pnpm add @prisma/client @sinclair/typebox
pnpm add -D typescript @types/node tsx

# Create basic ElysiaJS structure
mkdir -p src/{modules,shared,config}
touch src/index.ts

# Add ElysiaJS TypeScript config
cat > tsconfig.json << EOL
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "lib": ["ESNext"],
    "types": ["node"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
EOL

# Update package.json scripts for ElysiaJS
cat > package.json << EOL
{
  "name": "elysia-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
EOL

# Database Setup (Prisma)
cd ..
mkdir prisma && cd prisma
pnpm init
pnpm add -D prisma
pnpm dlx prisma init

# Add basic Prisma schema
cat > prisma/schema.prisma << EOL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Restaurant {
  id       Int      @id @default(autoincrement())
  name     String
  menu     Menu[]
  orders   Order[]
  address  String
  rating   Float
}

model Menu {
  id           Int        @id @default(autoincrement())
  name         String
  price        Float
  description  String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  restaurantId Int
}

model Order {
  id           Int        @id @default(autoincrement())
  user         User       @relation(fields: [userId], references: [id])
  userId       Int
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  restaurantId Int
  status       String
  items        Json
  total        Float
  createdAt    DateTime   @default(now())
}
EOL

# Create pnpm workspace configuration
cat > pnpm-workspace.yaml << EOL
packages:
  - 'frontend'
  - 'backend'
  - 'elysia-backend'
  - 'prisma'
EOL

# Set up Docker environment
cat > docker-compose.yml << EOL
version: '3.8'
services:
  postgres:
    image: postgres:latest
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: foodapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOL

# Create base environment variables
cat > .env << EOL
DATABASE_URL="postgresql://user:password@localhost:5432/foodapp?schema=public"
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
EOL

# Initialize Git repository
git init
echo "node_modules/
.env
.next/
dist/
build/
.pnpm-store/" > .gitignore
git add .
git commit -m "Initial project setup"
