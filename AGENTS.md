# Stack

- Next.js
- TypeScript
- Jest
- Zod
- TanStack Query
- Axios

## Export Conventions

When a module serves one specific task, export its primary function or component as the default export. Use named exports only for generic or shared modules that contain reusable behavior and are not dedicated to a single task.

### Task-Specific Module Example

```typescript
/**
 * Retrieves the products displayed by the catalog page.
 *
 * @returns The catalog products.
 */
export default async function fetchCatalogProducts(): Promise<Product[]> {
  const response = await axios.get<Product[]>('/api/products')

  return response.data
}
```

### Shared Module Example

```typescript
/**
 * Formats a price for display in the supplied currency.
 *
 * @param amount - The monetary value in the currency's base unit.
 * @param currency - The ISO currency code to display.
 * @returns The localized price string.
 */
export function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Formats an ISO date string for display in the user's locale.
 *
 * @param value - The ISO date string to format.
 * @returns The localized date string.
 */
export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US').format(new Date(value))
}
```

## Naming Conventions

Always use camelCase for naming modules, functions, variables, and props.
Use `SCREAMING_SNAKE_CASE` only for constant values that never change.

### Example

```typescript
const userName = 'John Doe'
```

### Do not

```typescript
const USER_NAME = 'John Doe'
```

## React Component Examples

````tsx
/**
 * Renders a button with the selected visual style and size.
 *
 * @example
 * ```tsx
 * <Button variant="default" size="lg">
 *   Click me
 * </Button>
 * ```
 */
export default function Button({ className, variant, size, loading, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <Spinner /> : props.children}
    </button>
  )
}
````

## JsDocs

Write a JSDoc comment directly above every function. Describe its responsibility,
parameters, and return value when that information is not obvious from the type.

### Example

```typescript
/**
 * Formats a price for display in the supplied currency.
 *
 * @param amount - The monetary value in the currency's base unit.
 * @param currency - The ISO currency code to display.
 * @returns The localized price string.
 */
export function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
```

### Do not

```typescript
export function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
```

## SOLID Principles for AI Code Contributions

AI must always follow the **SOLID principles** when writing, refactoring, or extending code.

The goal is to keep the frontend easy to understand, easy to change, easy to test, and safe to extend without breaking existing behavior.

### Front-end Responsibility Boundaries

Keep each layer focused on a single responsibility: components render UI and handle UI-specific interactions; hooks encapsulate reusable React state and lifecycle behavior; service or data-access modules own external communication such as API requests; and utilities contain pure, framework-independent logic. Clear boundaries prevent unrelated concerns from leaking together, making the frontend easier to understand, test, change, and extend safely.

---

## Core Rule

Do not place multiple responsibilities inside one function, file, component, hook, or module.

Separate responsibilities into clear frontend modules such as:

```txt
app/
  products/
    page.tsx
components/
  productCard.tsx
  productList.tsx
features/
  products/
    api/
      fetchProducts.ts
    hooks/
      useProducts.ts
    schemas/
      productSchema.ts
    types.ts
lib/
  formatPrice.ts
```

Each file should have one clear purpose.

---

### 1. Single Responsibility Principle

A module, function, component, or hook must have only one reason to change.
Each unit of code should do one job.

### Do

Separate API access, validation, state queries, and presentation.

```typescript
// features/products/api/fetchProducts.ts

/**
 * Retrieves products from the catalog endpoint.
 *
 * @returns The catalog products.
 */
export async function fetchProducts(): Promise<Product[]> {
  const response = await axios.get<Product[]>('/api/products')

  return response.data
}
```

```typescript
// features/products/schemas/productSchema.ts

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
})
```

```typescript
// features/products/hooks/useProducts.ts

/**
 * Queries the catalog products for use by React components.
 *
 * @returns The products query state.
 */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })
}
```

```tsx
// components/productList.tsx

type ProductListProps = {
  products: Product[]
}

/**
 * Renders product cards for an already-loaded product collection.
 *
 * @param props - The products to render.
 * @returns The product list.
 */
export function ProductList({ products }: ProductListProps) {
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}
```

### Do not

Do not mix HTTP access, parsing, loading state, and presentation in one component.

```tsx
/**
 * Renders a catalog while also performing its data-fetching and validation work.
 * This component has too many responsibilities.
 */
export function ProductList() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    async function loadProducts() {
      const response = await axios.get('/api/products')
      const parsedProducts = z.array(productSchema).parse(response.data)

      setProducts(parsedProducts)
    }

    void loadProducts()
  }, [])

  return (
    <>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </>
  )
}
```

---

## 2. Open/Closed Principle

Code should be open for extension but closed for modification.

Add new behavior through focused components, hooks, adapters, or variants instead of adding unrelated conditions to a large component.

### Do

Use separate components for distinct price presentations that share the same props contract.

```tsx
// components/productPrice.tsx

export type PriceDisplayProps = {
  price: number
  currency: string
}

/**
 * Renders a product's regular price.
 *
 * @param props - The price to display.
 * @returns The regular price element.
 */
export function ProductPrice({ price, currency }: PriceDisplayProps) {
  return <span>{formatPrice(price, currency)}</span>
}
```

```tsx
// components/discountedProductPrice.tsx

/**
 * Renders a product price alongside its previous price.
 *
 * @param props - The discounted price to display.
 * @returns The discounted price element.
 */
export function DiscountedProductPrice({ price, currency }: PriceDisplayProps) {
  return <span className="text-destructive">{formatPrice(price, currency)}</span>
}
```

### Do not

Do not keep adding unrelated display modes to one large component.

```tsx
type ProductPriceProps = {
  price: number
  currency: string
  displayMode: 'regular' | 'discounted' | 'member' | 'wholesale'
}

/**
 * Renders every product-price variation in one component.
 * This becomes harder to extend as pricing rules grow.
 */
export function ProductPrice({ price, currency, displayMode }: ProductPriceProps) {
  if (displayMode === 'discounted') {
    return <span className="text-destructive">{formatPrice(price, currency)}</span>
  }

  if (displayMode === 'member') {
    return <span className="text-primary">{formatPrice(price, currency)}</span>
  }

  return <span>{formatPrice(price, currency)}</span>
}
```

---

## 3. Liskov Substitution Principle

A component or implementation must be usable anywhere its shared contract is expected.
Keep compatible props and behavior predictable.

### Do

Both product-list implementations accept the same props and render the supplied products.

```tsx
export type ProductCollectionProps = {
  products: Product[]
}

/**
 * Renders products as a responsive card grid.
 *
 * @param props - The products to render.
 * @returns The product grid.
 */
export function ProductGrid({ products }: ProductCollectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

```tsx
/**
 * Renders products as compact rows.
 *
 * @param props - The products to render.
 * @returns The product rows.
 */
export function ProductRows({ products }: ProductCollectionProps) {
  return (
    <div className="space-y-2">
      {products.map((product) => (
        <ProductRow key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Do not

Do not use the shared props type for a component that silently ignores required behavior.

```tsx
/**
 * Ignores the supplied products and therefore cannot replace other product collections.
 *
 * @param props - The products expected by callers.
 * @returns A static message instead of the products.
 */
export function BrokenProductRows({ products }: ProductCollectionProps) {
  return <p>No products available.</p>
}
```

---

## 4. Interface Segregation Principle

Do not force components to receive props or callbacks they do not use.
Create small, focused prop types instead of large generic ones.

### Do

Split controls by responsibility.

```tsx
export type SearchInputProps = {
  value: string
  onChange: (value: string) => void
}

/**
 * Renders an input for updating a search query.
 *
 * @param props - The current query and change callback.
 * @returns The search input.
 */
export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search products"
    />
  )
}
```

```tsx
export type SortSelectProps = {
  value: ProductSort
  onChange: (value: ProductSort) => void
}

/**
 * Renders a select control for changing the product sort order.
 *
 * @param props - The selected sort order and change callback.
 * @returns The sort select.
 */
export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as ProductSort)}>
      <option value="priceAsc">Price: low to high</option>
      <option value="priceDesc">Price: high to low</option>
    </select>
  )
}
```

### Do not

Do not make a simple control depend on callbacks belonging to other controls.

```typescript
export type CatalogToolbarProps = {
  searchValue: string
  sortValue: ProductSort
  selectedCategoryId: string | null
  onSearchChange: (value: string) => void
  onSortChange: (value: ProductSort) => void
  onCategoryChange: (categoryId: string | null) => void
  onClearFilters: () => void
}
```

---

## 5. Dependency Inversion Principle

High-level UI behavior should not depend directly on low-level HTTP clients or endpoint details.
Depend on a focused function contract and inject it where practical.

### Do

Let a query hook depend on a product loader contract.

```typescript
type ProductsQueryDependencies = {
  getProducts: () => Promise<Product[]>
}

/**
 * Creates a products query using the provided product loader.
 *
 * @param dependencies - The product-loading dependency.
 * @returns The products query state.
 */
export function useProductsQuery({ getProducts }: ProductsQueryDependencies) {
  return useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })
}
```

### Do not

Do not couple a reusable component directly to Axios and an endpoint.

```tsx
/**
 * Fetches its own data with a hard-coded endpoint.
 * This is difficult to reuse or test in isolation.
 */
export function ProductList() {
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await axios.get<Product[]>('/api/products')

      return response.data
    },
  })

  return <ProductListContent products={productsQuery.data ?? []} />
}
```

---

## AI Contribution Rules

When AI writes code, it must follow these rules.

### 1. Keep Files Focused

Each file must have one clear responsibility.

Good examples:

```txt
app/products/page.tsx
components/productCard.tsx
components/productList.tsx
features/products/api/fetchProducts.ts
features/products/hooks/useProducts.ts
features/products/schemas/productSchema.ts
features/cart/lib/calculateCartTotal.ts
```

Bad examples:

```txt
lib/utils.ts
features/app/appService.ts
components/catalogManager.tsx
```

Avoid putting unrelated logic into generic files.

---

### 2. Separate UI Logic from Framework and Data Logic

Pages and components should assemble UI, invoke focused hooks, and delegate complex transformations to small utilities.

### Do

```tsx
// app/products/page.tsx

/**
 * Displays the catalog page using the products query state.
 *
 * @returns The catalog page.
 */
export default function ProductsPage() {
  const productsQuery = useProducts()

  if (productsQuery.isPending) {
    return <Spinner />
  }

  return <ProductList products={productsQuery.data ?? []} />
}
```

```typescript
// features/cart/lib/calculateCartTotal.ts

/**
 * Calculates the total price of the supplied cart items.
 *
 * @param items - The cart items to total.
 * @returns The cart total.
 */
export function calculateCartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0)
}
```

### Do not

Do not combine page rendering, data loading, calculations, and mutation logic in one component.

```tsx
/**
 * Coordinates every catalog and cart responsibility in one page component.
 * This component is too large to maintain safely.
 */
export default function ProductsPage() {
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)

  return <CatalogWithCart products={productsQuery.data ?? []} total={cartTotal} />
}
```

---

### 3. Prefer Small Functions

AI should write small functions with clear names. A function should usually:

- Do one job
- Have a clear name
- Be easy to test
- Avoid hidden side effects
- Avoid deeply nested logic

### Do

```typescript
/**
 * Returns whether the requested quantity can be added to the available stock.
 *
 * @param availableQuantity - The stock currently available.
 * @param requestedQuantity - The quantity a user wants to add.
 * @returns Whether the requested quantity is available.
 */
export function hasAvailableStock(availableQuantity: number, requestedQuantity: number) {
  return requestedQuantity > 0 && requestedQuantity <= availableQuantity
}
```

### Do not

```typescript
/**
 * Updates every cart concern in one function.
 * This combines validation, state changes, formatting, and analytics.
 */
export function updateCart(data: unknown) {
  // validates the product
  // checks stock
  // updates cart state
  // calculates totals
  // formats a toast message
  // sends analytics
}
```

---

### 4. Avoid God Modules

AI must not create one large module that controls the entire application.

### Do

```txt
features/products/api/fetchProducts.ts
features/products/hooks/useProducts.ts
features/cart/lib/calculateCartTotal.ts
components/productCard.tsx
components/cartSummary.tsx
```

### Do not

```txt
lib/app.ts
features/catalog/catalogManager.ts
components/applicationShell.tsx
```

---

### 5. Use Clear Names

Names must describe the exact responsibility.

### Do

```typescript
formatPrice()
calculateCartTotal()
fetchProducts()
useProducts()
validateProductSearch()
```

### Do not

```typescript
handleData()
processItems()
doWork()
run()
execute()
manage()
```

---

### 6. Keep HTTP Access in API Modules

AI must not scatter Axios calls across components and hooks. Keep HTTP requests in focused API modules, then consume them through hooks or server-side data functions.

### Do

```typescript
// features/products/api/fetchProducts.ts

/**
 * Retrieves the current catalog products.
 *
 * @returns The catalog products.
 */
export async function fetchProducts(): Promise<Product[]> {
  const response = await axios.get<Product[]>('/api/products')

  return response.data
}
```

### Do not

```tsx
/**
 * Loads products directly from a presentation component.
 * HTTP access belongs in a focused API module.
 */
export function ProductList() {
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => axios.get<Product[]>('/api/products'),
  })

  return <ProductListContent products={productsQuery.data?.data ?? []} />
}
```

---

### 7. Add New Behavior Without Breaking Existing Code

Before modifying an existing component or hook, check whether the change can be added as:

- A new component
- A new hook
- A new API function
- A new schema or mapper
- A new component variant
- A new focused module

Modify existing logic only when the existing behavior itself is wrong.

---

### 8. Write Testable Code

AI should avoid code that is difficult to test. Prefer pure functions and pass dependencies into hooks or utilities when it improves isolation.

```typescript
type ProductAvailabilityReader = {
  getAvailableQuantity: (productId: string) => Promise<number>
}

/**
 * Determines whether a requested quantity can be added to a product's cart entry.
 *
 * @param dependencies - The product availability reader.
 * @param productId - The product to check.
 * @param requestedQuantity - The quantity the user wants to add.
 * @returns Whether enough product stock is available.
 */
export async function canAddToCart(
  { getAvailableQuantity }: ProductAvailabilityReader,
  productId: string,
  requestedQuantity: number,
) {
  const availableQuantity = await getAvailableQuantity(productId)

  return hasAvailableStock(availableQuantity, requestedQuantity)
}
```

Avoid hard-coded dependencies when they make a component, hook, or utility difficult to test.

---

## Review Checklist for AI

Before finalizing code, AI must verify:

- [ ] Does each file have one clear responsibility?
- [ ] Does each function do one job?
- [ ] Is UI logic separated from data access and framework wiring?
- [ ] Can new behavior be added without editing large existing components?
- [ ] Are prop types and interfaces small and focused?
- [ ] Are dependencies easy to replace in tests?
- [ ] Are names clear and specific?
- [ ] Did the change avoid creating a god module?
- [ ] Did the change avoid breaking existing behavior?

---

## Final Rule

AI must prefer clean, modular, boring, predictable code over clever code.
When unsure, split responsibilities into smaller frontend modules instead of creating large mixed-purpose components.

## Linting and Formatting

Always run `pnpm lint`, `pnpm format`, and `pnpm typecheck` at the end of each task and ensure they complete without errors.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
