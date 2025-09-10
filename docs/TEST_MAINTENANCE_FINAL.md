# Test Maintenance Guide - Final Version

## Quick Reference

### Test Execution Commands
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPatterns="ComponentName.test.js"

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose

# Run tests with performance monitoring
npm test -- --maxWorkers=2 --testTimeout=10000
```

### Common Issues and Solutions

#### 1. ES Module Transform Errors
**Error**: `SyntaxError: Unexpected token 'export'`
**Solution**: Update Jest configuration to transform the problematic package:
```javascript
// In jest.config.js
transformIgnorePatterns: [
  'node_modules/(?!(package-name|other-es-modules)/)',
],
```

#### 2. Date Serialization Issues
**Error**: Date objects vs ISO strings mismatch
**Solution**: Use consistent date handling in tests:
```javascript
// For API responses, expect ISO strings
expect(response.data.createdAt).toEqual(expectedDate.toISOString());

// For component props, use Date objects
expect(component.props.date).toEqual(expectedDate);
```

#### 3. Mock Function Errors
**Error**: `mockReturnValue is not a function`
**Solution**: Use proper Jest mocking syntax:
```javascript
// Correct way to mock modules
jest.mock('@/hooks/useHook', () => ({
  useHook: jest.fn().mockReturnValue({ data: 'mock' })
}));
```

#### 4. Component Not Found Errors
**Error**: `Unable to find element by testid`
**Solution**: Check component structure and use appropriate queries:
```javascript
// Use more robust queries
screen.getByRole('button', { name: /submit/i })
// Or check if element exists first
expect(screen.queryByTestId('element')).toBeInTheDocument()
```

### Test File Organization

#### Component Tests
```
src/__tests__/components/
├── forms/              # Form components
├── navigation/         # Navigation components
├── shared/            # Shared/utility components
└── [feature]/         # Feature-specific components
```

#### Integration Tests
```
src/__tests__/integration/
├── auth-flows.test.js         # Authentication workflows
├── plant-management.test.js   # Plant CRUD operations
├── care-tracking.test.js      # Care logging workflows
└── data-import.test.js        # CSV import processes
```

#### API Tests
```
src/__tests__/api/
├── auth-core.test.js          # Authentication endpoints
├── plant-management.test.js   # Plant API endpoints
└── care-tracking.test.js      # Care API endpoints
```

### Test Utilities Usage

#### Rendering Components
```javascript
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';

// Basic rendering
renderWithProviders(<Component />);

// With authentication
renderWithProviders(<Component />, {
  user: createTestUser(),
  initialRoute: '/dashboard'
});

// With custom providers
renderWithProviders(<Component />, {
  providers: [CustomProvider],
  mockApis: { plants: mockPlantApi }
});
```

#### Creating Test Data
```javascript
import { 
  createTestUser, 
  createTestPlant, 
  createTestCareRecord 
} from '@/test-utils/factories';

// Create test entities
const user = createTestUser({ email: 'test@example.com' });
const plant = createTestPlant({ commonName: 'Test Plant' });
const careRecord = createTestCareRecord({ 
  plantInstanceId: plant.id,
  careType: 'watering'
});
```

#### API Mocking
```javascript
import { mockApiResponse, mockApiError } from '@/test-utils/helpers/api-helpers';

// Mock successful API response
mockApiResponse('/api/plants', { data: plants });

// Mock API error
mockApiError('/api/plants', 500, 'Server error');
```

### Performance Guidelines

#### Test Execution Time
- **Individual tests**: Should complete under 100ms
- **Test suites**: Should complete under 10 seconds
- **Full test run**: Should complete under 2 minutes

#### Memory Management
```javascript
// Always clean up in afterEach
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  cleanup(); // From @testing-library/react
});
```

#### Efficient Test Data
```javascript
// Use factories for consistent data
const user = createTestUser(); // Reusable pattern

// Avoid creating unnecessary data
const minimalPlant = createTestPlant({ 
  commonName: 'Test' // Only required fields
});
```

### Debugging Tests

#### Common Debugging Techniques
```javascript
// Debug rendered output
screen.debug(); // Logs current DOM

// Debug specific element
screen.debug(screen.getByRole('button'));

// Check what queries are available
screen.logTestingPlaygroundURL();

// Add console logs in tests
console.log('Test state:', { user, plants, careRecords });
```

#### Performance Debugging
```javascript
// Measure test performance
const startTime = performance.now();
// ... test code ...
const endTime = performance.now();
console.log(`Test took ${endTime - startTime}ms`);
```

### Coverage Guidelines

#### Target Coverage Levels
- **Critical paths**: 80% minimum
- **Components**: 70% minimum  
- **API endpoints**: 85% minimum
- **Utilities**: 60% minimum

#### Coverage Commands
```bash
# Generate coverage report
npm test -- --coverage

# Coverage with specific threshold
npm test -- --coverage --coverageThreshold='{"global":{"branches":80}}'

# Open coverage report in browser
open coverage/lcov-report/index.html
```

### CI/CD Integration

#### GitHub Actions Configuration
```yaml
- name: Run Tests
  run: |
    npm test -- --coverage --maxWorkers=2
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

#### Performance Monitoring
```javascript
// In CI, monitor test performance
if (process.env.CI) {
  // Fail if tests take too long
  jest.setTimeout(30000); // 30 second timeout
}
```

### Troubleshooting Checklist

When tests fail, check these items in order:

1. **Environment Setup**
   - [ ] Node modules installed (`npm install`)
   - [ ] Environment variables set
   - [ ] Database connection working

2. **Test Configuration**
   - [ ] Jest config is correct
   - [ ] Transform patterns include all ES modules
   - [ ] Mock patterns are properly configured

3. **Test Isolation**
   - [ ] Tests clean up after themselves
   - [ ] No shared state between tests
   - [ ] Mocks are reset between tests

4. **Component Structure**
   - [ ] Component renders without errors
   - [ ] Required props are provided
   - [ ] DOM structure matches test expectations

5. **API Mocking**
   - [ ] API endpoints are properly mocked
   - [ ] Response format matches expectations
   - [ ] Error cases are handled

### Best Practices Summary

#### Do's ✅
- Use descriptive test names that explain the behavior
- Test user interactions, not implementation details
- Keep tests focused and atomic
- Use proper cleanup in afterEach hooks
- Mock external dependencies consistently
- Write tests that would catch real bugs

#### Don'ts ❌
- Don't test implementation details
- Don't create tests that depend on other tests
- Don't use setTimeout in tests (use proper async/await)
- Don't mock everything (test real interactions when possible)
- Don't ignore test failures (fix them immediately)
- Don't write tests just for coverage numbers

### Getting Help

#### Resources
- [Testing Library Documentation](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

#### Internal Resources
- Test utilities documentation: `src/test-utils/README.md`
- Component testing examples: `src/__tests__/components/`
- Integration testing examples: `src/__tests__/integration/`

#### Team Support
- Ask in #engineering-testing Slack channel
- Review test patterns in existing test files
- Pair with team members on complex test scenarios

This guide should be updated as testing patterns evolve and new issues are discovered.