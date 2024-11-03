// 1. Authentication Flow
// File: src/modules/auth/auth.service.ts
import { Elysia } from 'elysia'
import { PrismaClient } from '@prisma/client'
import { compare, hash } from 'bcrypt'
import { jwt } from '@elysiajs/jwt'

const prisma = new PrismaClient()

// JWT Authentication Setup
const authPlugin = new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!,
    exp: '7d' // Token expires in 7 days
  }))
  .derive(({ jwt, headers, set }) => ({
    // Custom auth helper
    async getUserFromToken() {
      const token = headers.authorization?.split(' ')[1]
      if (!token) {
        set.status = 401
        throw new Error('No token provided')
      }

      const payload = await jwt.verify(token)
      if (!payload) {
        set.status = 401
        throw new Error('Invalid token')
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      })

      if (!user) {
        set.status = 401
        throw new Error('User not found')
      }

      return user
    }
  }))

// Auth Routes
const auth = new Elysia()
  .use(authPlugin)
  .post('/register', async ({ body }) => {
    const { email, password, name } = body as any

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        profile: {
          create: {
            avatar: `https://api.dicebear.com/7.x/avatars/svg?seed=${email}`,
          }
        }
      },
      include: {
        profile: true
      }
    })

    return {
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.profile.avatar
      }
    }
  })
  .post('/login', async ({ body, jwt }) => {
    const { email, password } = body as any

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true
      }
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const validPassword = await compare(password, user.password)
    if (!validPassword) {
      throw new Error('Invalid credentials')
    }

    // Generate tokens
    const accessToken = await jwt.sign({
      userId: user.id,
      email: user.email
    })

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.profile.avatar
      }
    }
  })
  .get('/me', async ({ getUserFromToken }) => {
    const user = await getUserFromToken()
    return user
  })
  .post('/logout', async ({ getUserFromToken }) => {
    // Optional: Add token to blacklist in Redis
    return { message: 'Logged out successfully' }
  })

// 2. Database Integration Patterns
// File: src/lib/db/index.ts

// Prisma Schema
/*
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  password    String
  name        String
  profile     Profile?
  orders      Order[]
  addresses   Address[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  lastLoginAt DateTime?
}

model Profile {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique
  user      User     @relation(fields: [userId], references: [id])
  avatar    String?
  phone     String?
  bio       String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Restaurant {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  address     String
  rating      Float     @default(0)
  categories  Category[]
  menu        MenuItem[]
  orders      Order[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model MenuItem {
  id           Int        @id @default(autoincrement())
  name         String
  description  String?
  price        Float
  restaurantId Int
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  category     String?
  isAvailable  Boolean    @default(true)
  orderItems   OrderItem[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}
*/

// Database Service Pattern
// File: src/lib/db/services/restaurant.service.ts
export class RestaurantService {
  constructor(private prisma: PrismaClient) {}

  async findAll(params: {
    skip?: number
    take?: number
    where?: any
    orderBy?: any
  }) {
    const { skip, take, where, orderBy } = params
    return this.prisma.restaurant.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        categories: true,
        menu: {
          where: {
            isAvailable: true
          }
        }
      }
    })
  }

  async findById(id: number) {
    return this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        categories: true,
        menu: {
          where: {
            isAvailable: true
          }
        }
      }
    })
  }

  async create(data: any) {
    return this.prisma.restaurant.create({
      data,
      include: {
        categories: true
      }
    })
  }

  async update(id: number, data: any) {
    return this.prisma.restaurant.update({
      where: { id },
      data,
      include: {
        categories: true
      }
    })
  }
}

// Transaction Example
// File: src/lib/db/services/order.service.ts
export class OrderService {
  constructor(private prisma: PrismaClient) {}

  async createOrder(data: {
    userId: number
    restaurantId: number
    items: Array<{ menuItemId: number; quantity: number }>
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create order
      const order = await tx.order.create({
        data: {
          userId: data.userId,
          restaurantId: data.restaurantId,
          status: 'PENDING',
        }
      })

      // 2. Create order items
      const orderItems = await Promise.all(
        data.items.map(async (item) => {
          const menuItem = await tx.menuItem.findUnique({
            where: { id: item.menuItemId }
          })

          if (!menuItem?.isAvailable) {
            throw new Error(`Menu item ${item.menuItemId} is not available`)
          }

          return tx.orderItem.create({
            data: {
              orderId: order.id,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: menuItem.price,
            }
          })
        })
      )

      // 3. Calculate total
      const total = orderItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      )

      // 4. Update order with total
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { total },
        include: {
          items: {
            include: {
              menuItem: true
            }
          },
          restaurant: true
        }
      })

      return updatedOrder
    })
  }
}

// Repository Pattern Example
// File: src/lib/db/repositories/user.repository.ts
export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true
      }
    })
  }

  async create(data: {
    email: string
    password: string
    name: string
    profile?: {
      avatar?: string
      phone?: string
    }
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
        profile: data.profile ? {
          create: data.profile
        } : undefined
      },
      include: {
        profile: true
      }
    })
  }

  async updateLastLogin(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date()
      }
    })
  }
}
