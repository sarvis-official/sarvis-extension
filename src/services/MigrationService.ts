export interface MigrationTemplate {
    id: string;
    label: string;
    description: string;
    category: string;
    icon: string;
    from: string;
    to: string;
    promptBuilder: (code: string) => string;
    fileExtensionChange?: { from: string; to: string };
    installCommands?: string[];
    uninstallCommands?: string[];
}

export const MIGRATIONS: MigrationTemplate[] = [

    // ── Framework Migrations ───────────────────────────────────────────────
    {
        id: 'express-to-fastify',
        label: 'Express → Fastify',
        description: 'Migrate Express.js routes and middleware to Fastify',
        category: 'Framework',
        icon: '🚀',
        from: 'Express', to: 'Fastify',
        promptBuilder: (code) => `Migrate this Express.js code to Fastify.
Rules:
- Convert app.get/post/put/delete to fastify.get/post/put/delete
- Convert req/res to request/reply
- Convert Express middleware to Fastify plugins/hooks
- Convert error handling middleware to Fastify error handlers
- Keep all route logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install fastify @fastify/cors @fastify/helmet'],
        uninstallCommands: ['npm uninstall express']
    },

    {
        id: 'express-to-nestjs',
        label: 'Express → NestJS',
        description: 'Migrate Express routes to NestJS controllers',
        category: 'Framework',
        icon: '🏗️',
        from: 'Express', to: 'NestJS',
        promptBuilder: (code) => `Migrate this Express.js code to NestJS.
Rules:
- Convert routes to @Controller with @Get/@Post/@Put/@Delete decorators
- Convert middleware to Guards or Interceptors
- Convert request handling to proper DTOs
- Add @Injectable() where needed
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install @nestjs/core @nestjs/common @nestjs/platform-express reflect-metadata rxjs'],
    },

    {
        id: 'koa-to-express',
        label: 'Koa → Express',
        description: 'Migrate Koa middleware and routes to Express',
        category: 'Framework',
        icon: '🔄',
        from: 'Koa', to: 'Express',
        promptBuilder: (code) => `Migrate this Koa.js code to Express.js.
Rules:
- Convert ctx.body to res.json() or res.send()
- Convert ctx.status to res.status()
- Convert async middleware (ctx, next) to (req, res, next)
- Keep all logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install express'],
        uninstallCommands: ['npm uninstall koa']
    },

    // ── Language Migrations ────────────────────────────────────────────────
    {
        id: 'js-to-ts',
        label: 'JavaScript → TypeScript',
        description: 'Add TypeScript types, interfaces and strict mode',
        category: 'Language',
        icon: '🔷',
        from: 'JavaScript', to: 'TypeScript',
        fileExtensionChange: { from: '.js', to: '.ts' },
        promptBuilder: (code) => `Convert this JavaScript code to TypeScript.
Rules:
- Add proper types to all function parameters and return types
- Add interfaces for objects and data structures
- Replace var with const/let
- Add type assertions where needed
- Handle null/undefined with proper TypeScript patterns
- Add generic types where appropriate
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install -D typescript ts-node @types/node', 'npx tsc --init']
    },

    {
        id: 'ts-to-js',
        label: 'TypeScript → JavaScript',
        description: 'Remove TypeScript types and convert to plain JavaScript',
        category: 'Language',
        icon: '📜',
        from: 'TypeScript', to: 'JavaScript',
        fileExtensionChange: { from: '.ts', to: '.js' },
        promptBuilder: (code) => `Convert this TypeScript code to plain JavaScript.
Rules:
- Remove all type annotations
- Remove interfaces and type definitions
- Remove TypeScript-specific syntax (as, satisfies, etc.)
- Keep all logic identical
- Use JSDoc comments for important types if helpful
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
    },

    {
        id: 'cjs-to-esm',
        label: 'CommonJS → ES Modules',
        description: 'Convert require() to import/export syntax',
        category: 'Language',
        icon: '📦',
        from: 'CommonJS', to: 'ES Modules',
        promptBuilder: (code) => `Convert this CommonJS module to ES Modules syntax.
Rules:
- Convert require() to import statements
- Convert module.exports to export default or named exports
- Convert exports.x = to export const x =
- Keep all logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
    },

    {
        id: 'esm-to-cjs',
        label: 'ES Modules → CommonJS',
        description: 'Convert import/export to require() syntax',
        category: 'Language',
        icon: '📦',
        from: 'ES Modules', to: 'CommonJS',
        promptBuilder: (code) => `Convert this ES Modules code to CommonJS syntax.
Rules:
- Convert import to require()
- Convert export default to module.exports =
- Convert named exports to exports.x =
- Keep all logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
    },

    // ── React Migrations ───────────────────────────────────────────────────
    {
        id: 'class-to-hooks',
        label: 'Class Component → Hooks',
        description: 'Convert React class components to functional hooks',
        category: 'React',
        icon: '⚛️',
        from: 'Class Component', to: 'Functional Hooks',
        promptBuilder: (code) => `Convert this React class component to a functional component with hooks.
Rules:
- Convert state to useState hooks
- Convert componentDidMount to useEffect
- Convert componentDidUpdate to useEffect with dependencies
- Convert componentWillUnmount to useEffect cleanup
- Convert this.props to props parameter
- Convert this.setState to state setters
- Remove the class, extend and render method
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
    },

    {
        id: 'redux-to-zustand',
        label: 'Redux → Zustand',
        description: 'Migrate Redux store, actions and reducers to Zustand',
        category: 'React',
        icon: '🐻',
        from: 'Redux', to: 'Zustand',
        promptBuilder: (code) => `Migrate this Redux code to Zustand.
Rules:
- Convert reducers to Zustand store with set()
- Convert actions to store methods
- Convert selectors to direct store access
- Replace useSelector/useDispatch with useStore
- Keep all state logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install zustand'],
        uninstallCommands: ['npm uninstall redux react-redux @reduxjs/toolkit']
    },

    {
        id: 'redux-to-context',
        label: 'Redux → React Context',
        description: 'Replace Redux with React Context API',
        category: 'React',
        icon: '🔗',
        from: 'Redux', to: 'React Context',
        promptBuilder: (code) => `Migrate this Redux code to React Context API.
Rules:
- Convert Redux store to createContext + useReducer
- Convert actions to dispatch calls
- Convert selectors to useContext
- Create a Provider component
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        uninstallCommands: ['npm uninstall redux react-redux']
    },

    {
        id: 'react-to-nextjs',
        label: 'React → Next.js',
        description: 'Convert React components to Next.js pages/components',
        category: 'React',
        icon: '▲',
        from: 'React', to: 'Next.js',
        promptBuilder: (code) => `Convert this React code to Next.js.
Rules:
- Convert routing to Next.js file-based routing
- Add getServerSideProps or getStaticProps where needed
- Convert client-side fetch to server-side data fetching
- Add 'use client' directive where needed
- Convert Link and router usage to next/link and next/router
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install next react react-dom']
    },

    // ── Database Migrations ────────────────────────────────────────────────
    {
        id: 'mongoose-to-prisma',
        label: 'Mongoose → Prisma',
        description: 'Convert Mongoose models and queries to Prisma',
        category: 'Database',
        icon: '🗄️',
        from: 'Mongoose', to: 'Prisma',
        promptBuilder: (code) => `Migrate this Mongoose code to Prisma.
Rules:
- Convert Schema definitions to Prisma schema models (as comments showing what to add)
- Convert Model.find() to prisma.model.findMany()
- Convert Model.findById() to prisma.model.findUnique()
- Convert Model.create() to prisma.model.create()
- Convert Model.findByIdAndUpdate() to prisma.model.update()
- Convert Model.findByIdAndDelete() to prisma.model.delete()
- Keep all logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install @prisma/client', 'npm install -D prisma'],
        uninstallCommands: ['npm uninstall mongoose']
    },

    {
        id: 'sequelize-to-prisma',
        label: 'Sequelize → Prisma',
        description: 'Convert Sequelize models and queries to Prisma',
        category: 'Database',
        icon: '🗄️',
        from: 'Sequelize', to: 'Prisma',
        promptBuilder: (code) => `Migrate this Sequelize code to Prisma.
Rules:
- Convert Model.findAll() to prisma.model.findMany()
- Convert Model.findOne() to prisma.model.findFirst()
- Convert Model.create() to prisma.model.create()
- Convert Model.update() to prisma.model.update()
- Convert Model.destroy() to prisma.model.delete()
- Keep all query logic and includes/associations
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install @prisma/client', 'npm install -D prisma'],
        uninstallCommands: ['npm uninstall sequelize']
    },

    // ── HTTP Client Migrations ─────────────────────────────────────────────
    {
        id: 'axios-to-fetch',
        label: 'Axios → Fetch API',
        description: 'Replace axios calls with native fetch',
        category: 'HTTP',
        icon: '🌐',
        from: 'Axios', to: 'Fetch API',
        promptBuilder: (code) => `Replace all axios calls with native fetch API.
Rules:
- Convert axios.get(url) to fetch(url).then(r => r.json())
- Convert axios.post(url, data) to fetch(url, { method: 'POST', body: JSON.stringify(data) })
- Convert axios interceptors to fetch wrappers
- Handle errors properly (fetch doesn't throw on 4xx/5xx)
- Keep all logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        uninstallCommands: ['npm uninstall axios']
    },

    {
        id: 'fetch-to-axios',
        label: 'Fetch → Axios',
        description: 'Replace native fetch with axios',
        category: 'HTTP',
        icon: '🌐',
        from: 'Fetch API', to: 'Axios',
        promptBuilder: (code) => `Replace all fetch calls with axios.
Rules:
- Convert fetch(url) to axios.get(url)
- Convert fetch(url, { method: 'POST' }) to axios.post(url, data)
- Add axios import at the top
- Simplify response handling (axios auto-parses JSON)
- Keep all logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install axios']
    },

    // ── CSS Migrations ─────────────────────────────────────────────────────
    {
        id: 'css-to-tailwind',
        label: 'CSS → Tailwind CSS',
        description: 'Convert CSS classes to Tailwind utility classes',
        category: 'Styling',
        icon: '🎨',
        from: 'CSS', to: 'Tailwind CSS',
        promptBuilder: (code) => `Convert this CSS/styled code to Tailwind CSS utility classes.
Rules:
- Replace CSS properties with equivalent Tailwind classes
- Apply classes directly to HTML/JSX elements
- Use responsive prefixes (sm:, md:, lg:) where appropriate
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install -D tailwindcss postcss autoprefixer', 'npx tailwindcss init']
    },

    {
        id: 'css-to-scss',
        label: 'CSS → SCSS',
        description: 'Convert plain CSS to SCSS with variables and nesting',
        category: 'Styling',
        icon: '🎨',
        from: 'CSS', to: 'SCSS',
        promptBuilder: (code) => `Convert this CSS to SCSS.
Rules:
- Extract repeated values to variables
- Use nesting for related selectors
- Extract mixins for repeated patterns
- Keep all styles identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
    },

    // ── Testing ────────────────────────────────────────────────────────────
    {
        id: 'jest-to-vitest',
        label: 'Jest → Vitest',
        description: 'Migrate Jest tests to Vitest',
        category: 'Testing',
        icon: '🧪',
        from: 'Jest', to: 'Vitest',
        promptBuilder: (code) => `Migrate these Jest tests to Vitest.
Rules:
- Replace jest.fn() with vi.fn()
- Replace jest.mock() with vi.mock()
- Replace jest.spyOn() with vi.spyOn()
- Add import { describe, it, expect, vi } from 'vitest' at the top
- Keep all test logic identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install -D vitest'],
        uninstallCommands: ['npm uninstall jest @types/jest']
    },

    {
        id: 'mocha-to-jest',
        label: 'Mocha → Jest',
        description: 'Migrate Mocha/Chai tests to Jest',
        category: 'Testing',
        icon: '🧪',
        from: 'Mocha', to: 'Jest',
        promptBuilder: (code) => `Migrate these Mocha/Chai tests to Jest.
Rules:
- Replace chai assertions with Jest expect()
- Replace assert.equal to expect().toBe()
- Replace assert.deepEqual to expect().toEqual()
- Remove chai imports, add Jest globals
- Keep all test structure identical
- Return ONLY the migrated code, no explanation

Code:\n${code}`,
        installCommands: ['npm install -D jest @types/jest'],
        uninstallCommands: ['npm uninstall mocha chai']
    },
];

export const MigrationService = {
    getAll(): MigrationTemplate[] { return MIGRATIONS; },
    getById(id: string): MigrationTemplate | undefined {
        return MIGRATIONS.find(m => m.id === id);
    },
    getCategories(): string[] {
        return [...new Set(MIGRATIONS.map(m => m.category))];
    },
    getByCategory(category: string): MigrationTemplate[] {
        return MIGRATIONS.filter(m => m.category === category);
    }
};