# Port Community System Web Frontend

## Introduction

The Port Community System (PCS) web frontend is a modern, enterprise-grade React application providing a comprehensive interface for port operations management. Built with React 18 and TypeScript, it delivers a robust user experience for terminal operators, shipping lines, customs authorities, and other port stakeholders.

### Key Features
- Real-time vessel and cargo tracking
- Document management with EDIFACT support
- Interactive berth planning interface
- Financial operations dashboard
- Role-based access control
- Multi-language support
- Responsive design for all devices

### Technology Stack
- React 18.0.0
- TypeScript 4.9.x
- Material UI 5.x
- Redux Toolkit
- React Query
- Socket.io Client
- i18next
- Jest + React Testing Library
- Storybook 7.x
- Vite 4.x

### System Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- Modern web browser with ES2020 support

## Prerequisites

Before starting development, ensure you have the following installed:

- Node.js (>= 18.0.0)
- npm (>= 8.0.0)
- Git
- VSCode (recommended)

### Recommended VSCode Extensions
- ESLint
- Prettier
- GitLens
- Error Lens
- Material Icon Theme

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pcs-web
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env.development
```

4. Start development server:
```bash
npm run dev
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run preview` - Preview production build
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript checks
- `npm run analyze` - Analyze bundle size
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build static Storybook

### Project Structure

```
src/
├── assets/          # Static assets (images, fonts, icons)
├── components/      # Reusable UI components
├── config/          # App configuration
├── hooks/           # Custom React hooks
├── layouts/         # Page layouts
├── pages/          # Page components
├── services/       # API services
├── store/          # Redux store
├── styles/         # Global styles
├── types/          # TypeScript types
├── utils/          # Utility functions
└── i18n/           # Internationalization
```

### Coding Standards

- Follow TypeScript strict mode guidelines
- Use functional components with hooks
- Implement proper error boundaries
- Write comprehensive unit tests
- Document components with Storybook
- Follow Material UI theming patterns

### Git Workflow

1. Create feature branch from development
2. Commit using conventional commits
3. Submit PR for review
4. Merge after approval and CI checks

## Architecture

### Component Architecture

- Atomic design methodology
- Container/Presenter pattern
- Custom hooks for logic separation
- Proper prop-types documentation
- Memoization for performance

### State Management

- Redux Toolkit for global state
- React Query for server state
- Context API for theme/locale
- Local state for component-specific data

### API Integration

- Axios for HTTP requests
- React Query for caching/invalidation
- Socket.io for real-time updates
- Proper error handling
- Request interceptors

## Security

### Authentication

- JWT-based authentication
- Secure token storage
- Automatic token refresh
- Session management
- Role-based access control

### Security Best Practices

- HTTPS enforcement
- XSS prevention
- CSRF protection
- Content Security Policy
- Secure cookie handling

## Testing

### Testing Strategy

- Jest for unit testing
- React Testing Library for components
- Cypress for E2E testing
- 80% minimum coverage requirement
- Integration tests for critical flows

### Test Types

- Unit tests for utilities
- Component tests
- Integration tests
- E2E tests for critical paths
- Performance tests

## Building

### Production Build

```bash
npm run build
```

- Optimized bundle size
- Code splitting
- Tree shaking
- Asset optimization
- Source maps generation

## Deployment

### Deployment Environments

- Development: dev.pcs.com
- Staging: staging.pcs.com
- Production: pcs.com

### CI/CD Pipeline

1. Build and test
2. Static analysis
3. Docker image creation
4. Security scanning
5. Deployment to environment

## Accessibility

- WCAG 2.1 AA compliance
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support

## Internationalization

- i18next integration
- RTL support
- Date/time localization
- Number formatting
- Translation management

## Performance

### Performance Metrics

- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Lighthouse score > 90
- Bundle size < 500KB (initial)

### Optimization Techniques

- Code splitting
- Lazy loading
- Image optimization
- Caching strategies
- Performance monitoring

## Troubleshooting

### Common Issues

1. Installation Problems
   - Clear npm cache
   - Delete node_modules
   - Verify Node.js version

2. Build Issues
   - Check environment variables
   - Verify dependencies
   - Review build logs

### Support

- Technical Support: tech-support@pcs.com
- Documentation: docs.pcs.com
- Issue Tracker: github.com/pcs/issues

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Submit pull request
5. Wait for review

## License

Copyright © 2023 Port Community System
All rights reserved.