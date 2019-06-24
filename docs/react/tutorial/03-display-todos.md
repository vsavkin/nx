# Step 3: Display Todos

Great! You have a failing E2E test. Now you can make it pass!

The best way to work with Cypress is to keep the failing E2E test running while working on the app. This helps you see the progress you are making.

## Show Todos

**Open `apps/todos`.**

To make the first assertion of the e2e test pass, update `apps/todos/src/app/app.tsx`:

```typescript jsx
import React, { useState } from 'react';

interface Todo {
  title: string;
}

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([
    { title: 'Todo 1' },
    { title: 'Todo 2' }
  ]);

  return (
    <>
      <h1>Todos</h1>
      <ul>
        {todos.map(t => (
          <li className={'todo'}>{t.title}</li>
        ))}
      </ul>
    </>
  );
};

export default App;
```

**Rerun the specs by clicking the button in the top right corner of the left pane.** Now the test will fail while trying to find the add todo button.

## Add Todos

**Add the `add-todo` button with the corresponding click handler.**

```typescript jsx
import React, { useState } from 'react';

interface Todo {
  title: string;
}

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([
    { title: 'Todo 1' },
    { title: 'Todo 2' }
  ]);

  function addTodo() {
    setTodos([
      ...todos,
      {
        title: `New todo ${Math.floor(Math.random() * 1000)}`
      }
    ]);
  }

  return (
    <>
      <h1>Todos</h1>
      <ul>
        {todos.map(t => (
          <li className={'todo'}>{t.title}</li>
        ))}
      </ul>
      <button id={'add-todo'} onClick={addTodo}>
        Add Todo
      </button>
    </>
  );
};

export default App;
```

The tests should pass now.

!!!!!
What will you see if you run: ng e2e todos-e2e --headless
!!!!!
Cypress will run in the headless mode, and the test will pass.
Cypress will run in the headless mode, and the test will fail.
