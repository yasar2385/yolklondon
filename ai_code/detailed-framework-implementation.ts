// 1. ElysiaJS Backend Implementation
// File: src/index.ts
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { rateLimit } from '@elysiajs/rate-limit'

const app = new Elysia()
  .use(swagger())
  .use(cors())
  .use(rateLimit())
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!
  }))

// Authentication Module
app.group('/auth', app => app
  .post('/login', async ({ body, jwt }) => {
    const { email, password } = body as any
    // Validate user credentials
    const user = await validateUser(email, password)
    if (!user) throw new Error('Invalid credentials')

    const token = await jwt.sign({ userId: user.id })
    return { token }
  })
  .post('/register', async ({ body }) => {
    const { email, password, name } = body as any
    // Create new user
    const user = await createUser({ email, password, name })
    return { success: true, userId: user.id }
  })
)

// Restaurant Module
app.group('/restaurants', app => app
  .get('/', async () => {
    return await prisma.restaurant.findMany({
      include: {
        menu: true,
        reviews: true
      }
    })
  })
  .get('/:id', async ({ params }) => {
    return await prisma.restaurant.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        menu: true,
        reviews: true
      }
    })
  })
  .post('/', async ({ body }) => {
    // Create new restaurant
    return await prisma.restaurant.create({
      data: body as any
    })
  })
)

// Order Module
app.group('/orders', app => app
  .get('/', async ({ jwt, headers }) => {
    const token = headers.authorization?.split(' ')[1]
    const { userId } = await jwt.verify(token!)
    
    return await prisma.order.findMany({
      where: { userId }
    })
  })
  .post('/', async ({ body, jwt, headers }) => {
    const token = headers.authorization?.split(' ')[1]
    const { userId } = await jwt.verify(token!)
    
    const orderData = body as any
    return await createOrder({ ...orderData, userId })
  })
)

// 2. Next.js Frontend Implementation
// File: app/restaurants/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RestaurantCard } from '@/components/RestaurantCard'
import { SearchFilters } from '@/components/SearchFilters'

export default function RestaurantsPage() {
  const [filters, setFilters] = useState({
    cuisine: '',
    rating: 0,
    priceRange: ''
  })

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['restaurants', filters],
    queryFn: () => fetchRestaurants(filters)
  })

  return (
    <div className="container mx-auto px-4">
      <SearchFilters 
        filters={filters} 
        onFilterChange={setFilters} 
      />
      
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants?.map(restaurant => (
            <RestaurantCard 
              key={restaurant.id}
              restaurant={restaurant}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 3. Shared Components
// File: components/RestaurantCard.tsx
export const RestaurantCard = ({ restaurant }) => {
  return (
    <div className="rounded-lg shadow-md overflow-hidden">
      <img 
        src={restaurant.image} 
        alt={restaurant.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-xl font-semibold">{restaurant.name}</h3>
        <div className="flex items-center mt-2">
          <StarRating rating={restaurant.rating} />
          <span className="ml-2 text-gray-600">
            ({restaurant.reviewCount} reviews)
          </span>
        </div>
        <p className="mt-2 text-gray-600">{restaurant.cuisine}</p>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-gray-600">
            {restaurant.deliveryTime} min
          </span>
          <span className="text-gray-600">
            {restaurant.priceRange}
          </span>
        </div>
      </div>
    </div>
  )
}

// 4. API Integration
// File: lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 5. State Management with Zustand
// File: lib/store.ts
import create from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: number) => void
  clearCart: () => void
  total: number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      total: 0,
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id)
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
              total: state.total + item.price,
            }
          }
          return {
            items: [...state.items, { ...item, quantity: 1 }],
            total: state.total + item.price,
          }
        }),
      removeItem: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id)
          return {
            items: state.items.filter((i) => i.id !== id),
            total: state.total - (item?.price || 0) * (item?.quantity || 0),
          }
        }),
      clearCart: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'cart-storage',
    }
  )
)

// 6. Real-time Order Updates with WebSocket
// File: lib/websocket.ts
import { io } from 'socket.io-client'

export const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
  autoConnect: false,
})

export const connectToOrderUpdates = (orderId: string) => {
  socket.connect()
  socket.emit('join-order', orderId)
  
  return () => {
    socket.emit('leave-order', orderId)
    socket.disconnect()
  }
}

// Usage in OrderPage component
useEffect(() => {
  const cleanup = connectToOrderUpdates(orderId)
  
  socket.on('order-update', (update) => {
    // Update order status in UI
    setOrderStatus(update.status)
  })
  
  return cleanup
}, [orderId])
