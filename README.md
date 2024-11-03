# Food Delivery Platform
A modern, scalable food delivery platform built with Next.js, ElysiaJS, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- Docker and Docker Compose
- pnpm (recommended) or npm
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/food-delivery-platform.git
cd food-delivery-platform

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Start development environment
docker-compose up -d
pnpm dev
```

## 📁 Project Structure
```
food-delivery-platform/
├── apps/
│   ├── web/                 # Next.js frontend application
│   └── api/                 # ElysiaJS backend application
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── database/           # Database schemas and migrations
│   └── config/             # Shared configuration
├── docker/                 # Docker configuration files
├── docs/                   # Project documentation
└── scripts/               # Development and deployment scripts
```

## 🛠 Development Environment Configuration (Sprint 0)

### Tech Stack Decisions

#### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Data Fetching**: TanStack Query

#### Backend
- **Framework**: ElysiaJS (Bun runtime)
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT with Lucia Auth
- **API Documentation**: Swagger/OpenAPI

### Development Tools
- **IDE**: VSCode with recommended extensions
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - GitLens
- **Version Control**: Git with Conventional Commits
- **Package Manager**: pnpm
- **Testing**: Vitest + Testing Library
- **CI/CD**: GitHub Actions

### Environment Setup Instructions

1. **VSCode Configuration**
```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

2. **ESLint Configuration**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    // Custom rules
  }
}
```

3. **Docker Development Environment**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 🎨 Core UI Foundation (Sprint 1)

### Component Architecture

#### Layout Components
```typescript
// apps/web/components/layout/root-layout.tsx
export default function RootLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
```

### Authentication Flow
- Implemented using Next.js App Router middleware
- Protected routes under `(authenticated)` route group
- JWT stored in HTTP-only cookies
- Refresh token rotation

### Design System
- Custom theme using Tailwind CSS
- Dark mode support
- Responsive breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

### Shared Components
- Created reusable components:
  - Button variants
  - Form inputs
  - Cards
  - Modals
  - Navigation menus

### Form Component Example
```typescript
// packages/ui/components/form/input.tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          className={cn(
            "w-full rounded-md border border-gray-300 px-3 py-2",
            "focus:border-primary focus:outline-none focus:ring-1",
            error && "border-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
```

## 📝 Documentation Standards

### Component Documentation
- Each component must have:
  - TypeScript types/interfaces
  - Props documentation
  - Usage examples
  - Storybook stories

### API Documentation
- OpenAPI/Swagger specifications
- Route documentation
- Authentication requirements
- Request/response examples

### Git Workflow
- Feature branches from `develop`
- Pull request template
- Required code reviews
- Automated testing before merge

## 🔄 Development Workflow

1. Create feature branch from `develop`
2. Implement feature/fix
3. Write/update tests
4. Create pull request
5. Code review
6. Merge to `develop`
7. Automated deployment to staging

## 📈 Performance Metrics

- Core Web Vitals targets:
  - LCP: < 2.5s
  - FID: < 100ms
  - CLS: < 0.1
- API response times: < 200ms
- Test coverage: > 80%

## 🔐 Security Considerations

- CSRF protection
- Rate limiting
- Input validation
- XSS prevention
- SQL injection prevention
- Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
