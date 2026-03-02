# Testing Documentation - Invoice System

## 🧪 Overview

This document provides detailed testing information for the Invoice System project.

**Test Framework:** Vitest + React Testing Library  
**Coverage:** 20 unit & integration tests across helpers, components, and pages  
**Status:** ✅ All tests passing

---

## 📁 Test Structure

```
tests/
├── setup.ts                          # Global test configuration
├── mocks/
│   └── supabase-js.ts               # Lightweight Supabase mock
├── lib/
│   └── api.test.ts                  # 12 tests - helpers & data access
├── components/
│   ├── InvoiceForm.test.tsx         # 3 tests - form interactions
│   └── InvoiceTemplate.test.tsx     # 1 test - rendering
└── pages/
    ├── home.test.tsx                # 2 tests - list & delete
    ├── invoice-view.test.tsx        # 1 test - view & update status
    └── invoice-edit.test.tsx        # 1 test - edit page load
```

---

## 🚀 Running Tests

```bash
# Run all tests once
npm test

# Watch mode (auto re-run on changes)
npm run test:watch

# View with coverage
npm test -- --coverage
```

---

## 📊 Test Coverage Breakdown

### 1. Helper Functions (lib/api.test.ts)

#### Mathematical Calculations
```typescript
✅ calculateTotals() - Correct VAT and withholding tax math
   Input: items=[{qty:2, price:100}, {qty:1, price:50}], VAT=7%, withholding=3%
   Expected: subtotal=250, VAT=17.5, withholding=7.5, total=260

✅ numberToThaiWords() - Edge cases
   - Zero: "ศูนย์บาทถ้วน"
   - Decimals: Contains "สตางค์"
   - Large numbers: Correct position words (ล้าน, แสน, หมื่น, etc.)
```

#### Formatting
```typescript
✅ formatCurrency() - Thai number format
   Input: 1000
   Expected: "1,000.00"

✅ formatDate() - Thai Buddhist calendar
   Input: "2024-01-05"
   Expected: "05/01/2567"
```

### 2. Data Access Functions (lib/api.test.ts)

```typescript
✅ getInvoices() - Fetch and order by created_at DESC
✅ getInvoiceById() - Fetch invoice + items joined
✅ generateInvoiceNumber() - Yearly sequence (BL{YEAR}{NNNNNN})
✅ createInvoice() - Insert invoice + items atomically
✅ updateInvoice() - Update invoice + replace items
✅ deleteInvoice() - Remove invoice by ID
✅ updateInvoiceStatus() - Change status field
✅ getCustomers() - Fetch all customers ordered by name
✅ createCustomer() - Insert new customer
```

### 3. Component Tests

#### InvoiceForm (components/InvoiceForm.test.tsx)
```typescript
✅ Add new line item row
   - Starts with 1 item
   - Click "เพิ่มรายการ" button
   - Expect 2 items

✅ Recalculate totals when items change
   - Update quantity to 2
   - Update unit_price to 100
   - Expect: subtotal=200, VAT=14, withholding=6, total=208

✅ Submit new invoice and redirect
   - Fill customer name
   - Fill item description
   - Click "บันทึก"
   - Expect: createInvoice() called, router.push('/') called
```

#### InvoiceTemplate (components/InvoiceTemplate.test.tsx)
```typescript
✅ Render invoice details and totals
   - Display company name
   - Display invoice number
   - Display customer name
   - Display copy label
   - Display total amount (208.00)
```

### 4. Page Tests

#### Home Page (pages/home.test.tsx)
```typescript
✅ Render invoices from API
   - Mock getInvoices() with test data
   - Expect invoice number displayed
   - Expect customer name displayed

✅ Delete invoice after confirmation
   - Mock getInvoices() and deleteInvoice()
   - Click delete button
   - Expect deleteInvoice() called with correct ID
```

#### Invoice View Page (pages/invoice-view.test.tsx)
```typescript
✅ Load invoice data and allow marking as paid
   - Mock getInvoiceById() with test invoice
   - Expect heading with invoice number
   - Click "ชำระแล้ว" button
   - Expect updateInvoiceStatus() called with 'paid'
```

#### Invoice Edit Page (pages/invoice-edit.test.tsx)
```typescript
✅ Load invoice and render header
   - Mock getInvoiceById()
   - Expect "แก้ไข Invoice" header
   - Expect invoice number displayed
```

---

## 🔧 Test Configuration

### vitest.config.ts
```typescript
{
  environment: 'jsdom',           // Browser-like environment
  setupFiles: ['./tests/setup.ts'], // Global mocks
  globals: true,                  // No need to import describe/it/expect
  css: true,                      // Parse CSS imports
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test'
  },
  alias: {
    '@': path.resolve(__dirname, '.'),
    '@supabase/supabase-js': './tests/mocks/supabase-js.ts'
  }
}
```

### tests/setup.ts (Global Mocks)
```typescript
// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: (props) => React.createElement('a', { href: props.href }, props.children)
}))

// Stub browser APIs
window.confirm = vi.fn(() => true)
window.alert = vi.fn()
window.print = vi.fn()

// Provide test-safe Supabase env vars
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test'
```

---

## 📝 Writing Tests - Examples

### Example 1: Testing a Pure Function

```typescript
import { describe, expect, it } from 'vitest'
import { calculateTotals } from '@/lib/api'

describe('calculateTotals', () => {
  it('calculates correct totals with VAT and withholding', () => {
    // Arrange
    const items = [
      { quantity: 2, unit_price: 100 },
      { quantity: 1, unit_price: 50 }
    ]
    
    // Act
    const result = calculateTotals(items, 7, 3)
    
    // Assert
    expect(result.subtotal).toBe(250)
    expect(result.vat_amount).toBeCloseTo(17.5)
    expect(result.withholding_tax_amount).toBeCloseTo(7.5)
    expect(result.total).toBeCloseTo(260)
  })
})
```

### Example 2: Testing an Async API Function

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'

// Mock Supabase at module level
const fromMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock }
}))

describe('getInvoices', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('fetches invoices ordered by date', async () => {
    // Arrange
    const mockInvoices = [{ id: '1' }, { id: '2' }]
    const mockBuilder = {
      select: vi.fn(() => mockBuilder),
      order: vi.fn(() => Promise.resolve({ data: mockInvoices, error: null }))
    }
    fromMock.mockReturnValue(mockBuilder)
    
    // Act
    const result = await api.getInvoices()
    
    // Assert
    expect(result).toEqual(mockInvoices)
    expect(fromMock).toHaveBeenCalledWith('invoices')
    expect(mockBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })
})
```

### Example 3: Testing a React Component

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InvoiceForm from '@/components/InvoiceForm'

// Mock dependencies
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}))

const mockCreateInvoice = vi.fn()
vi.mock('@/lib/api', () => ({
  createInvoice: mockCreateInvoice,
  getCustomers: vi.fn(() => Promise.resolve([])),
  calculateTotals: (items, vat, withholding) => ({
    subtotal: items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    vat_amount: 0,
    withholding_tax_amount: 0,
    total: 0
  }),
  formatCurrency: (n) => n.toFixed(2)
}))

describe('InvoiceForm', () => {
  it('submits form and redirects', async () => {
    // Arrange
    mockCreateInvoice.mockResolvedValue({ id: 'inv-1' })
    render(<InvoiceForm />)
    
    // Act
    await userEvent.type(
      screen.getByLabelText(/ชื่อบริษัท.*ลูกค้า/i),
      'Customer Co.'
    )
    await userEvent.click(screen.getByRole('button', { name: /บันทึก/i }))
    
    // Assert
    await waitFor(() => {
      expect(mockCreateInvoice).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})
```

---

## 🎯 Testing Best Practices

### 1. Arrange-Act-Assert Pattern
Always structure tests in three phases:
```typescript
it('does something', () => {
  // Arrange: Set up test data
  const input = { value: 100 }
  
  // Act: Perform the action
  const result = calculate(input)
  
  // Assert: Verify the outcome
  expect(result).toBe(200)
})
```

### 2. Use Semantic Queries
Query elements by what users see:
```typescript
// ✅ Good - queries by user-visible text/role
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email Address')
screen.getByText('Welcome')

// ❌ Bad - queries by implementation details
screen.getByTestId('submit-btn')
container.querySelector('.button')
```

### 3. Handle Async Operations
Use `findBy*` or `waitFor` for async content:
```typescript
// Wait for element to appear
const element = await screen.findByText('Loaded')

// Wait for multiple assertions
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled()
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

### 4. Mock External Dependencies
Isolate units under test:
```typescript
// Mock API calls
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'test' }))
}))

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}))
```

### 5. Test Behavior, Not Implementation
Focus on what users experience:
```typescript
// ❌ Bad - testing internal state
expect(component.state.isLoading).toBe(false)

// ✅ Good - testing user-visible outcome
expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
expect(screen.getByText('Data loaded')).toBeInTheDocument()
```

### 6. Use descriptive test names
```typescript
// ❌ Bad
it('works', () => {})

// ✅ Good
it('displays error message when API call fails', () => {})
it('redirects to home page after successful submission', () => {})
```

### 7. Keep tests independent
Each test should run in isolation:
```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('test 1', () => {
    // This test doesn't affect test 2
  })

  it('test 2', () => {
    // This test doesn't depend on test 1
  })
})
```

---

## ⚠️ Known Issues

### React `act(...)` Warnings

**Symptoms:**
```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Cause:**
- Async state updates from `useEffect` or event handlers
- State changes occurring after component interactions

**Impact:**
- Cosmetic warnings only
- All tests pass successfully
- Does not affect test validity

**Future Fix:**
```typescript
// Wrap async operations
await act(async () => {
  await userEvent.click(button)
})

// Or use waitFor for state updates
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled()
})
```

---

## 🔍 Debugging Tests

### Run specific test file
```bash
npm test tests/lib/api.test.ts
```

### Run specific test case
```bash
npm test -- -t "calculates totals"
```

### View DOM output
```typescript
import { screen } from '@testing-library/react'

it('shows element', () => {
  render(<Component />)
  screen.debug()  // Prints current DOM tree
})
```

### Check mock call details
```typescript
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({
    customer_name: 'Test Customer',
    total: expect.any(Number)
  })
)

console.log(mockFn.mock.calls)  // See all calls
console.log(mockFn.mock.results)  // See all return values
```

---

## 📈 Future Test Improvements

### Coverage Goals
- [ ] Add E2E tests with Playwright
- [ ] Test PDF generation output
- [ ] Test print functionality
- [ ] Add visual regression tests
- [ ] Test mobile responsive behavior

### Additional Test Cases
- [ ] Error handling paths
- [ ] Network failure scenarios
- [ ] Concurrent updates
- [ ] Form validation edge cases
- [ ] Thai text rendering
- [ ] Large dataset performance

### Test Infrastructure
- [ ] Add code coverage reporting
- [ ] Set up CI/CD pipeline tests
- [ ] Add mutation testing
- [ ] Performance benchmarks
- [ ] Accessibility testing (axe-core)

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)

---

**Last Updated:** March 2, 2026  
**Test Suite Version:** 1.0.0

