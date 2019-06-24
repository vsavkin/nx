# Building Full-Stack Applications

In this guide you will:

- Build a full-stack application using React and Express.
- Share code between frontend and backend

## Creating an empty workspace

Start with creating a new workspace with the following:

```bash
npx create-nx-workspace@latest myorg
cd myorg
```

## Creating a Frontend Application

Now, create a frontend application using React with:

```bash
yarn add --dev @nrwl/react # Add React Capabilities to the workspace
ng g @nrwl/react:application frontend # Create a React Application
```

This will create the following:

```treeview
myorg/
├── apps/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   ├── environments/
│   │   │   ├── favicon.ico
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   ├── polyfills.ts
│   │   │   └── styles.css
│   │   ├── browserslist
│   │   ├── jest.config.js
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.spec.json
│   │   └── tslint.json
│   └── frontend-e2e/
├── libs/
├── tools/
├── README.md
├── workspace.json
├── nx.json
├── package.json
├── tsconfig.json
└── tslint.json
```

You can run:

- `ng serve frontend` to serve the application
- `ng build frontend` to build the application
- `ng test frontend` to test the application

## Creating a Node Application

Real-world applications do not live in isolation — they need APIs to talk to. Setup your frontend application to fetch some todos.

```typescript jsx
import React, { useEffect, useState } from 'react';

interface Todo {
  title: string;
}

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    fetch('/api/todos')
      .then(_ => _.json())
      .then(setTodos);
  }, []);

  return (
    <>
      <h1>Todos</h1>
      <ul>
        {todos.map(t => (
          <li className={'todo'}>{t.title}</li>
        ))}
      </ul>
      <button id={'add-todo'}>Add Todo</button>
    </>
  );
};
```

No todos will show up yet because the API does not exist. So the next step is to create the api using Express.

Create an Express application similar to how you created the React application earlier:

```bash
yarn add --dev @nrwl/express # Add Express Capabilities to the workspace
ng g @nrwl/express:application api --frontend-project frontend # sets up the proxy configuration so you can access the API in development
```

This will create the following:

```treeview
myorg/
├── apps/
│   ├── todos/
│   ├── todos-e2e/
│   └── api/
│       ├── src/
│       │   ├── app/
│       │   ├── assets/
│       │   ├── environments/
│       │   │   ├── environment.ts
│       │   │   └── environment.prod.ts
│       │   └── main.ts
│       ├── jest.conf.js
│       ├── proxy.conf.json
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.spec.json
│       └── tslint.json
├── libs/
├── workspace.json
├── nx.json
├── package.json
├── tools/
├── tsconfig.json
└── tslint.json
```

The `apps` directory is where Nx places anything you can run: frontend applications, backend applications, e2e test suites. That is why the `api` application was generated there.

You can run:

- `ng serve api` to serve the application
- `ng build api` to build the application
- `ng test api` to test the application

### Adding an Endpoint

Now, add an endpoint to get todos by updating `apps/api/src/main.ts`

```typescript
import * as express from 'express';

const app = express();

interface Todo {
  title: string;
}

const todos: Todo[] = [{ title: 'Todo 1' }, { title: 'Todo 2' }];

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to api!' });
});
app.get('/api/todos', (req, resp) => resp.send(todos));

const port = process.env.port || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
```

Now, run `ng serve frontend & ng serve api`, and open [http://localhost:4200](http://localhost:4200) to see both the frontend and backend working:

![Full Stack Application Screenshot](./full-stack-app.png)

The application works, but you have a small problem. The `Todo` interface is defined twice: once on the frontend, once on the backend. This duplication will inevitably result in the two interfaces going out of sync, which means that runtime errors will creep in. It's better to share this interface.

## Sharing Code Between Frontend and Backend

Normally sharing code between the backend and the frontend would have required days of work, but with Nx, it’s done in just minutes. In Nx, code is shared by creating libraries. Because everything is in a single repository, libraries can be imported without having to publish them to a registry.

Create a new library via:

```bash
ng g @nrwl/workspace:library data # This generates a barebone library with only Typescript setup
```

```treeview
myorg/
├── apps/
│   ├── todos/
│   ├── todos-e2e/
│   └── api/
├── libs/
│   └── data/
│       ├── src/
│       │   ├── lib/
│       │   │   └── data.ts
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

Next, move `Todo` into `libs/data/src/lib/data.ts`:

```typescript
export interface Todo {
  title: string;
}
```

Finally, update the frontend and the backend to import the interface from the library.

Update `apps/frontend/src/app/app.tsx`:

```typescript jsx
import React, { useEffect, useState } from 'react';
import { Todo } from '@myorg/data';

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  //...
};
```

Update `apps/api/src/main.ts`:

```typescript
import * as express from 'express';
import { Todo } from '@myorg/data';

const app = express();

const todos: Todo[] = [{ title: 'Todo 1' }, { title: 'Todo 2' }];

//...
```

After this refactor, the backend and the frontend will share the same definition of `Todo` and never get out of sync. Being able to factor code into a lot of small libraries with a well-defined public API, which you can then use across both the backend and the frontend, is a key feature of Nx. You can read more about it in our [Develop like Google Guide](/react/fundamentals/develop-like-google).

## Nx is Smart

Having both frontend and backend code is already something amazing. In just minutes, You have a repository which can build multiple frontend and backend applications and share code between them.

But Nx can do a lot more than that. In Nx, your libraries, backend applications, frontend applications are all part of the same dependency graph, which you can see via:

```bash
npm run dep-graph
```

![Full Stack Dependencies](./full-stack-deps.png)

If you change the data library, Nx will know that both the backend and the frontend can be affected by the change. This information can be used to test and build all areas affected by a change making Nx a powerful full-stack development environment that scales. You can read more about this Nx capability in [Building Like Google](/react/fundamentals/develop-like-google).

## Summary

With Nx, you can:

- Build full stack applications
- Share code between backend and frontend
- Scale your workspace by understanding how the backend and frontend depend on each other and using this information to only retest/rebuilt only what is affected.
