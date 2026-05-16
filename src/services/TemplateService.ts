export interface PromptTemplate {
    id: string;
    label: string;
    description: string;
    category: 'backend' | 'frontend' | 'database' | 'testing' | 'devops';
    icon: string;
    fields: TemplateField[];
    promptBuilder: (values: Record<string, string>) => string;
}

export interface TemplateField {
    id: string;
    label: string;
    placeholder: string;
    required: boolean;
}

export const TEMPLATES: PromptTemplate[] = [

    // ── Backend ──────────────────────────────────────────────────────────────
    {
        id: 'rest-api',
        label: 'Generate REST API',
        description: 'Full CRUD REST API with routes, controller, service',
        category: 'backend',
        icon: '🌐',
        fields: [
            { id: 'resource', label: 'Resource Name', placeholder: 'User, Product, Order', required: true },
            { id: 'framework', label: 'Framework', placeholder: 'Express, Fastify, NestJS', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, JavaScript', required: true },
        ],
        promptBuilder: (v) => `Generate a complete REST API for resource "${v.resource}" using ${v.framework} in ${v.language}.
Include: GET all, GET by ID, POST, PUT, DELETE endpoints.
Include proper error handling, input validation, and HTTP status codes.
Return complete working code.`
    },

    {
        id: 'graphql-resolver',
        label: 'Generate GraphQL Resolver',
        description: 'GraphQL schema, resolvers and types',
        category: 'backend',
        icon: '🔷',
        fields: [
            { id: 'resource', label: 'Resource Name', placeholder: 'User, Post, Comment', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, JavaScript', required: true },
        ],
        promptBuilder: (v) => `Generate a complete GraphQL schema and resolvers for "${v.resource}" in ${v.language}.
Include: Query (list, single), Mutation (create, update, delete), Type definitions, Input types.
Return complete working code.`
    },

    {
        id: 'middleware',
        label: 'Create Middleware',
        description: 'Express/NestJS middleware with error handling',
        category: 'backend',
        icon: '🔗',
        fields: [
            { id: 'name', label: 'Middleware Name', placeholder: 'Auth, RateLimit, Logger', required: true },
            { id: 'framework', label: 'Framework', placeholder: 'Express, NestJS, Fastify', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, JavaScript', required: true },
        ],
        promptBuilder: (v) => `Generate a complete ${v.name} middleware for ${v.framework} in ${v.language}.
Include proper error handling, types, and usage example in a comment.
Return complete working code.`
    },

    {
        id: 'dto-mapper',
        label: 'Create DTO + Mapper',
        description: 'Data Transfer Object with mapper class',
        category: 'backend',
        icon: '🔄',
        fields: [
            { id: 'entity', label: 'Entity Name', placeholder: 'User, Order, Product', required: true },
            { id: 'fields', label: 'Fields', placeholder: 'id, name, email, createdAt', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, Java, C#', required: true },
        ],
        promptBuilder: (v) => `Generate a DTO and Mapper for entity "${v.entity}" in ${v.language}.
Fields: ${v.fields}
Include: CreateDTO, UpdateDTO, ResponseDTO, and a Mapper class with toDTO() and toEntity() methods.
Return complete working code.`
    },

    {
        id: 'entity-repository',
        label: 'Create Entity + Repository',
        description: 'Database entity with repository pattern',
        category: 'database',
        icon: '🗄️',
        fields: [
            { id: 'entity', label: 'Entity Name', placeholder: 'User, Product, Order', required: true },
            { id: 'fields', label: 'Fields', placeholder: 'id, name, email, createdAt', required: true },
            { id: 'orm', label: 'ORM/Framework', placeholder: 'TypeORM, Prisma, Hibernate, SQLAlchemy', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, Java, Python', required: true },
        ],
        promptBuilder: (v) => `Generate a complete Entity and Repository for "${v.entity}" using ${v.orm} in ${v.language}.
Fields: ${v.fields}
Include: Entity class with decorators, Repository with CRUD methods, findByX helpers.
Return complete working code.`
    },

    {
        id: 'service-class',
        label: 'Create Service Class',
        description: 'Business logic service with dependency injection',
        category: 'backend',
        icon: '⚙️',
        fields: [
            { id: 'name', label: 'Service Name', placeholder: 'UserService, PaymentService', required: true },
            { id: 'methods', label: 'Methods needed', placeholder: 'create, findAll, findById, update, delete', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, Java, Python', required: true },
        ],
        promptBuilder: (v) => `Generate a complete ${v.name} service class in ${v.language}.
Methods: ${v.methods}
Include: Constructor with dependency injection, error handling, input validation.
Return complete working code.`
    },

    // ── Frontend ─────────────────────────────────────────────────────────────
    {
        id: 'react-component',
        label: 'Create React Component',
        description: 'React functional component with hooks and props',
        category: 'frontend',
        icon: '⚛️',
        fields: [
            { id: 'name', label: 'Component Name', placeholder: 'UserCard, LoginForm, DataTable', required: true },
            { id: 'description', label: 'What it does', placeholder: 'Displays user profile with avatar and edit button', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, JavaScript', required: true },
        ],
        promptBuilder: (v) => `Generate a complete React functional component "${v.name}" in ${v.language}.
Purpose: ${v.description}
Include: Props interface (if TS), useState/useEffect hooks if needed, proper styling structure, export.
Return complete working code.`
    },

    {
        id: 'react-hook',
        label: 'Create Custom React Hook',
        description: 'Reusable custom hook with state and effects',
        category: 'frontend',
        icon: '🪝',
        fields: [
            { id: 'name', label: 'Hook Name', placeholder: 'useAuth, useFetch, useDebounce', required: true },
            { id: 'description', label: 'What it does', placeholder: 'Fetches data from API with loading and error states', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, JavaScript', required: true },
        ],
        promptBuilder: (v) => `Generate a complete custom React hook "${v.name}" in ${v.language}.
Purpose: ${v.description}
Include: Proper types (if TS), loading/error states if applicable, cleanup on unmount, usage example in comment.
Return complete working code.`
    },

    {
        id: 'vue-component',
        label: 'Create Vue Component',
        description: 'Vue 3 component with Composition API',
        category: 'frontend',
        icon: '💚',
        fields: [
            { id: 'name', label: 'Component Name', placeholder: 'UserCard, LoginForm', required: true },
            { id: 'description', label: 'What it does', placeholder: 'Displays user info with edit functionality', required: true },
        ],
        promptBuilder: (v) => `Generate a complete Vue 3 component "${v.name}" using Composition API (<script setup>).
Purpose: ${v.description}
Include: Props, emits, reactive state, template with proper bindings.
Return complete working code.`
    },

    // ── Database ─────────────────────────────────────────────────────────────
    {
        id: 'sql-schema',
        label: 'Generate SQL Schema',
        description: 'SQL table with indexes and constraints',
        category: 'database',
        icon: '🗃️',
        fields: [
            { id: 'table', label: 'Table Name', placeholder: 'users, orders, products', required: true },
            { id: 'fields', label: 'Fields', placeholder: 'id, name, email, created_at', required: true },
            { id: 'dialect', label: 'SQL Dialect', placeholder: 'PostgreSQL, MySQL, SQLite', required: true },
        ],
        promptBuilder: (v) => `Generate a complete SQL schema for table "${v.table}" in ${v.dialect}.
Fields: ${v.fields}
Include: Primary key, appropriate data types, NOT NULL constraints, indexes on common query fields, created_at/updated_at timestamps.
Return complete SQL only.`
    },

    {
        id: 'prisma-schema',
        label: 'Generate Prisma Schema',
        description: 'Prisma model with relations',
        category: 'database',
        icon: '🔺',
        fields: [
            { id: 'model', label: 'Model Name', placeholder: 'User, Post, Product', required: true },
            { id: 'fields', label: 'Fields', placeholder: 'id, name, email, posts', required: true },
            { id: 'relations', label: 'Relations', placeholder: 'User has many Posts, Post belongs to User', required: false },
        ],
        promptBuilder: (v) => `Generate a complete Prisma schema model for "${v.model}".
Fields: ${v.fields}
Relations: ${v.relations || 'none'}
Include: Proper field types, @id, @default, @relation decorators, and any needed related models.
Return complete Prisma schema syntax only.`
    },

    // ── Testing ───────────────────────────────────────────────────────────────
    {
        id: 'unit-test',
        label: 'Generate Unit Tests',
        description: 'Unit tests with mocks for a service or function',
        category: 'testing',
        icon: '🧪',
        fields: [
            { id: 'name', label: 'What to test', placeholder: 'UserService, calculateTotal function', required: true },
            { id: 'framework', label: 'Test Framework', placeholder: 'Jest, Vitest, Pytest, JUnit', required: true },
            { id: 'language', label: 'Language', placeholder: 'TypeScript, Python, Java', required: true },
        ],
        promptBuilder: (v) => `Generate comprehensive unit tests for "${v.name}" using ${v.framework} in ${v.language}.
Include: Happy path tests, edge cases, error cases, mocks for dependencies.
Return complete working test file.`
    },

    {
        id: 'e2e-test',
        label: 'Generate E2E Tests',
        description: 'End-to-end tests with Cypress or Playwright',
        category: 'testing',
        icon: '🎭',
        fields: [
            { id: 'feature', label: 'Feature to test', placeholder: 'Login flow, Checkout process', required: true },
            { id: 'framework', label: 'Framework', placeholder: 'Cypress, Playwright', required: true },
        ],
        promptBuilder: (v) => `Generate complete E2E tests for "${v.feature}" using ${v.framework}.
Include: Page navigation, form interactions, assertions, error scenarios.
Return complete working test file.`
    },

    // ── DevOps ────────────────────────────────────────────────────────────────
    {
        id: 'dockerfile',
        label: 'Generate Dockerfile',
        description: 'Production-ready Dockerfile with multi-stage build',
        category: 'devops',
        icon: '🐳',
        fields: [
            { id: 'app', label: 'App Type', placeholder: 'Node.js, Python, Java Spring Boot, Go', required: true },
            { id: 'port', label: 'Port', placeholder: '3000, 8080, 5000', required: true },
        ],
        promptBuilder: (v) => `Generate a production-ready Dockerfile for a ${v.app} application running on port ${v.port}.
Include: Multi-stage build, non-root user, health check, proper COPY order for layer caching.
Return complete Dockerfile only.`
    },

    {
        id: 'github-actions',
        label: 'Generate GitHub Actions CI/CD',
        description: 'CI/CD pipeline with test, build and deploy',
        category: 'devops',
        icon: '🔁',
        fields: [
            { id: 'app', label: 'App Type', placeholder: 'Node.js, Python, Java, Go', required: true },
            { id: 'deploy', label: 'Deploy Target', placeholder: 'AWS, Vercel, Docker Hub, none', required: false },
        ],
        promptBuilder: (v) => `Generate a complete GitHub Actions CI/CD workflow for a ${v.app} application.
Deploy target: ${v.deploy || 'none'}
Include: Install deps, run tests, build, and deploy steps. Use proper caching.
Return complete YAML workflow file.`
    },
];

export const TemplateService = {
    getAll(): PromptTemplate[] { return TEMPLATES; },
    getById(id: string): PromptTemplate | undefined {
        return TEMPLATES.find(t => t.id === id);
    },
    getByCategory(category: string): PromptTemplate[] {
        return TEMPLATES.filter(t => t.category === category);
    },
    getCategories(): string[] {
        return [...new Set(TEMPLATES.map(t => t.category))];
    }
};