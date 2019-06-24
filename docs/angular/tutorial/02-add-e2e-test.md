# Step 2: Add E2E Tests

By default, Nx uses [Cypress](https://cypress.io) to run E2E tests.

**Open `apps/todos-e2e/src/support/app.po.ts`.** It's a page object file that contains helpers for querying the page.

**Add the following two helpers:**

```typescript
export const getTodos = () => cy.get('li.todo');
export const getAddTodoButton = () => cy.get('button#add-todo');
```

**Next, update `apps/todos-e2e/src/integration/app.spec.ts`.**

```typescript
import { getAddTodoButton, getTodos } from '../support/app.po';

describe('TodoApps', () => {
  beforeEach(() => cy.visit('/'));

  it('should display todos', () => {
    getTodos().should(t => expect(t.length).equal(2));
    getAddTodoButton().click();
    getTodos().should(t => expect(t.length).equal(3));
  });
});
```

This is not a great example of an E2E test, but it will suffice for the purposes of this tutorial.

If you have not done so already, stop the `ng serve` command and run `ng e2e todos-e2e --watch`.

A UI will open. Click the button in the top right corner that says "Run all specs". Keep the E2E tests running.

As you progress through the tutorial, you will work on making these E2E tests pass.

!!!!!
What assertion fails?
!!!!!
Expect 0 to equal 2
Nothing fails. Everything works.
Cannot find any elements matching 'li.todo'
Cannot find any elements matching 'button#add-todo'
