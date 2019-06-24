# Step 8: Create Libs

Libraries are not just a way to share code in Nx. They are also useful for factoring out code into small units with a well-defined public API.

## Public API

Every library has an `index.ts` file, which defines its public API. Other applications and libraries should only access what the `index.ts` exports. Everything else in the library is private.

## UI Libraries

To illustrate how useful libraries can be, create a library of React components.

**Run `ng g @nrwl/react:lib ui`.**

You should see the following:

```treeview
myorg/
├── apps/
│   ├── todos/
│   ├── todos-e2e/
│   └── api/
├── libs/
│   ├── data/
│   └── ui/
│       ├── src/
│       │   ├── lib/
│       │   │   └── ui/
│       │   │       ├── ui.css
│       │   │       ├── ui.spec.tsx
│       │   │       └── ui.tsx
│       │   └── index.ts
│       ├── jest.conf.js
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.spec.json
│       └── tslint.json
├── nx.json
├── package.json
├── tools/
├── tsconfig.json
└── tslint.json
```

The `libs/ui/src/lib/ui.tsx` file looks like this:

```typescript jsx
import React from 'react';

import './ui.css';

/* tslint:disable:no-empty-interface */
export interface UiProps {}

export const Ui = (props: UiProps) => {
  return (
    <div>
      <h1>Welcome to ui component!</h1>
    </div>
  );
};

export default Ui;
```

## Add a Component

Here, you can either change the UI component or generate a new one.

**Add a component to the newly created ui library by running:**

```bash
ng g @nrwl/react:component todos --project=ui
```

```treeview
myorg/
├── apps/
│   ├── todos/
│   ├── todos-e2e/
│   └── api/
├── libs/
│   ├── data/
│   └── ui/
│       ├── src/
│       │   ├── lib/
│       │   │   ├── ui/
│       │   │   │   ├── ui.css
│       │   │   │   ├── ui.spec.tsx
│       │   │   │   └── ui.tsx
│       │   │   └── todos/
│       │   │       ├── todos.css
│       │   │       ├── todos.spec.tsx
│       │   │       └── todos.tsx
│       │   └── index.ts
│       ├── jest.conf.js
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.spec.json
│       └── tslint.json
├── workspace.json
├── nx.json
├── package.json
├── tools/
├── tsconfig.json
└── tslint.json
```

**Implement the Todos component.**

```typescript jsx
import React from 'react';
import { Todo } from '@myorg/data';

export const Todos = (props: { todos: Todo[] }) => {
  return (
    <ul>
      {props.todos.map(t => (
        <li className={'todo'}>{t.title}</li>
      ))}
    </ul>
  );
};

export default Todos;
```

**Reexport it from the index file.**

```typescript
export * from './lib/ui/ui';
export * from './lib/todos/todos';
```

## Use the UI Library

**Now import `Todos` into `apps/todos/src/app/app.tsx`.**

```typescript
import React, { useEffect, useState } from 'react';
import { Todo } from '@myorg/data';
import { Todos } from '@myorg/ui';

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  //... addTodo

  return (
    <>
      <h1>Todos</h1>
      <Todos todos={todos} />
      <button id={'add-todo'} onClick={addTodo}>
        Add Todo
      </button>
    </>
  );
};

export default App;
```

**Restart both `ng serve api` and `ng serve todos` and you should see the application running.**

!!!!!
Libraries' public API is defined in...
!!!!!
index.ts
workspace.json and tsconfig.json files
