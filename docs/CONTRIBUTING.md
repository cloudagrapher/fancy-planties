# Contributing Guide

Thank you for your interest in contributing to Fancy Planties! This guide will help you get started with contributing to the project.

## 🤝 How to Contribute

There are many ways to contribute to Fancy Planties:

- **Report bugs** and suggest features
- **Improve documentation** and help others
- **Submit code** for bug fixes and new features
- **Add plant taxonomy data** to help the community
- **Test the application** and provide feedback
- **Translate** the app to other languages (future)

## 🐛 Reporting Issues

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** for known solutions
3. **Test with the latest version** if possible
4. **Gather relevant information** (browser, OS, steps to reproduce)

### Creating a Good Issue Report

Use our issue templates and include:

- **Clear title** describing the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** or videos if helpful
- **Environment details** (browser, device, OS)
- **Console errors** if any (F12 → Console tab)

### Issue Labels

We use labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high` - Critical issues
- `priority: low` - Nice to have

## 💻 Development Setup

### Prerequisites

- **Node.js 20+**: [Download here](https://nodejs.org/)
- **Docker**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Git**: [Install Git](https://git-scm.com/downloads)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/fancy-planties.git
   cd fancy-planties
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/fancy-planties.git
   ```

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment**:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

3. **Start database**:

   ```bash
   docker compose up -d postgres
   ```

4. **Run migrations**:

   ```bash
   npm run db:migrate
   ```

5. **Start development server**:

   ```bash
   npm run dev
   ```

6. **Open the app**: [http://localhost:3000](http://localhost:3000)

## 🔧 Development Guidelines

### Code Style

We use automated tools to maintain code quality:

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting (auto-format on save)
- **TypeScript**: Strict type checking
- **Tailwind CSS**: Utility-first styling

#### Key Conventions

- **File naming**: Use kebab-case for files (`plant-card.tsx`)
- **Component naming**: Use PascalCase (`PlantCard`)
- **Variable naming**: Use camelCase (`plantInstance`)
- **Constants**: Use UPPER_SNAKE_CASE (`MAX_IMAGE_SIZE`)

#### TypeScript Guidelines

```typescript
// ✅ Good: Explicit interfaces
interface PlantCardProps {
  plant: Plant;
  onSelect: (plant: Plant) => void;
  showCareStatus?: boolean;
}

// ✅ Good: Proper error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error('API call failed', error instanceof Error ? error : new Error(message));
  throw new Error(message);
}

// ❌ Avoid: Any types
const data: any = await fetch('/api/plants');

// ❌ Avoid: Accessing unknown error properties
catch (error) {
  console.log(error.message); // error is unknown type
}
```

### Component Architecture

#### Server vs Client Components

Follow Next.js 15 App Router patterns:

```typescript
// ✅ Server Component (default)
// Can access database, no 'use client'
export default async function PlantsPage() {
  const plants = await getPlants(); // Server-side data fetching
  return <PlantsClient plants={plants} />;
}

// ✅ Client Component
// Interactive UI, marked with 'use client'
'use client';
export default function PlantsClient({ plants }: { plants: Plant[] }) {
  const [selected, setSelected] = useState<Plant | null>(null);
  // Client-side interactivity
}
```

#### Component Structure

```typescript
// Component file structure
import 'server-only'; // If server-only
import { ComponentProps } from './types'; // Local types
import { ExternalDep } from 'external-package'; // External imports

// Interface definition
export interface MyComponentProps {
  // Props definition
}

// Main component
export function MyComponent(props: MyComponentProps) {
  // Implementation
}

// Default export (if needed)
export default MyComponent;
```

### Database Guidelines

#### Schema Changes

1. **Create migration**: `npm run db:generate`
2. **Review generated SQL** in `drizzle/` folder
3. **Test migration**: `npm run db:migrate`
4. **Update TypeScript types** if needed

#### Query Patterns

```typescript
// ✅ Good: User data isolation
export async function getUserPlants(userId: number) {
  return await db
    .select()
    .from(plantInstances)
    .where(eq(plantInstances.userId, userId)); // Always filter by user
}

// ✅ Good: Error handling
export async function createPlant(data: PlantData) {
  try {
    const [plant] = await db.insert(plants).values(data).returning();
    return plant;
  } catch (error) {
    logger.error('Failed to create plant', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to create plant');
  }
}
```

### Testing Guidelines

#### Test Structure

```typescript
// Unit test example
describe('PlantCard', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should display plant information', () => {
    const plant = createMockPlant();
    render(<PlantCard plant={plant} onSelect={jest.fn()} />);
    
    expect(screen.getByText(plant.nickname)).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    const plant = createMockPlant();
    
    render(<PlantCard plant={plant} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    
    expect(onSelect).toHaveBeenCalledWith(plant);
  });
});
```

#### Test Requirements

- **Unit tests**: All utility functions and components
- **Integration tests**: API routes and database operations
- **E2E tests**: Critical user flows
- **Minimum coverage**: 80% for new code

### API Guidelines

#### Route Structure

```typescript
// API route example
import { NextRequest, NextResponse } from 'next/server';
import { withMonitoring } from '@/lib/utils/monitoring';

async function handler(request: NextRequest) {
  try {
    // Validate authentication
    const { user } = await validateRequest();
    
    // Validate input
    const body = await request.json();
    const validated = schema.parse(body);
    
    // Business logic
    const result = await businessLogic(validated, user.id);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

// Export with monitoring
export const POST = withMonitoring(handler, '/api/plants');
```

## 🚀 Submitting Changes

### Branch Strategy

1. **Create feature branch** from `main`:

   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Test your changes**:

   ```bash
   npm run test
   npm run test:e2e
   npm run build
   ```

4. **Commit your changes**:

   ```bash
   git add .
   git commit -m "feat: add plant search functionality"
   ```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(plants): add fuzzy search functionality
fix(auth): resolve session timeout issue
docs(api): update authentication documentation
test(components): add PlantCard component tests
```

### CI/CD Skip Instructions

To save CI/CD resources and time when making documentation-only changes, you can skip Docker builds by starting your commit message with specific keywords:

**Skip Keywords:**
- `[skip ci]` or `[ci skip]` - Standard CI skip patterns
- `[skip build]` or `[build skip]` - Explicit build skip  
- `[docs]` - For documentation-only changes
- `[readme]` - For README updates

**How It Works:**
- **Two-job structure**: `check-skip` job analyzes commit message, `build-and-push` job only runs if skip condition is false
- **Clear feedback**: Shows which commit message triggered the skip and lists all available skip keywords
- **PR validation**: Workflow still runs for pull requests to validate changes, but won't push new Docker images unnecessarily

**Usage Examples:**
```bash
git commit -m "[readme] Update development setup instructions"     # Skips build
git commit -m "[docs] Fix typo in API documentation"              # Skips build  
git commit -m "[skip build] Minor formatting changes"             # Skips build
git commit -m "feat(plants): add new search functionality"        # Normal build
```

This feature helps save CI/CD resources while ensuring all code changes still go through proper validation.

### Pull Request Process

1. **Push your branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub with:
   - **Clear title** describing the change
   - **Description** explaining what and why
   - **Screenshots** for UI changes
   - **Testing notes** for reviewers
   - **Breaking changes** if any

3. **Address review feedback**:
   - Make requested changes
   - Push updates to the same branch
   - Respond to reviewer comments

4. **Merge requirements**:
   - All tests must pass
   - At least one approval from maintainer
   - No merge conflicts
   - Up-to-date with main branch

## 📋 Code Review Guidelines

### For Contributors

- **Self-review** your code before submitting
- **Test thoroughly** on different devices/browsers
- **Write clear descriptions** of changes
- **Be responsive** to feedback
- **Keep PRs focused** on single features/fixes

### For Reviewers

- **Be constructive** and helpful
- **Focus on code quality** and maintainability
- **Test the changes** when possible
- **Approve promptly** when ready
- **Suggest improvements** rather than just pointing out problems

## 🌱 Plant Data Contributions

### Adding Plant Taxonomy

Help expand our plant database:

1. **Research accurate taxonomy** from reliable sources
2. **Follow botanical naming conventions**
3. **Include care instructions** when possible
4. **Add multiple common names** if applicable
5. **Verify information** before submitting

### Data Sources

Recommended sources for plant information:
- [World Flora Online](http://www.worldfloraonline.org/)
- [The Plant List](http://www.theplantlist.org/)
- [Royal Horticultural Society](https://www.rhs.org.uk/)
- [Missouri Botanical Garden](https://www.missouribotanicalgarden.org/)

## 🏆 Recognition

Contributors are recognized in several ways:

- **Contributors list** in README
- **Release notes** mention significant contributions
- **GitHub achievements** and contribution graph
- **Community recognition** in discussions

## 📞 Getting Help

If you need help contributing:

- **GitHub Discussions**: Ask questions and get help
- **Discord/Slack**: Join our community chat (if available)
- **Email**: Contact maintainers directly
- **Documentation**: Check existing docs first

## 📜 Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions:

- **Be respectful** and inclusive
- **Help others** learn and grow
- **Focus on constructive** feedback
- **Report inappropriate** behavior

## 🎯 Good First Issues

New contributors should look for issues labeled `good first issue`:

- **Documentation improvements**
- **Small bug fixes**
- **UI/UX enhancements**
- **Test additions**
- **Plant data additions**

## 🚀 Advanced Contributing

### Setting Up Development Environment

For advanced development:

```bash
# Install additional tools
npm install -g @storybook/cli
npm install -g lighthouse

# Set up pre-commit hooks
npm run prepare

# Run full test suite
npm run test:all

# Performance testing
npm run lighthouse
```

### Release Process

For maintainers:

1. **Update version** in `package.json`
2. **Update CHANGELOG.md**
3. **Create release tag**
4. **Deploy to staging**
5. **Test thoroughly**
6. **Deploy to production**
7. **Announce release**

---

Thank you for contributing to Fancy Planties! Your help makes the plant community stronger. 🌱✨