# Step 3: Display Todos

Great! You have a failing E2E test. Now you can make it pass!

The best way to work with Cypress is to keep the failing E2E test running while working on the app. This helps you see the progress you are making.

## Show Todos

**Open `apps/todos`.** If you have used Angular CLI, this should look very familiar: same layout, same module and component files. The only difference is that Nx uses Jest instead of Karma.

To make the first assertion of the e2e test pass, update `apps/todos/src/app/app.component.ts`:

```typescript
import { Component } from '@angular/core';

interface Todo {
  title: string;
}

@Component({
  selector: 'myorg-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  todos: Todo[] = [{ title: 'Todo 1' }, { title: 'Todo 2' }];
}
```

and `apps/todos/src/app/app.component.html`:

```html
<h1>Todos</h1>

<ul>
  <li *ngFor="let t of todos" class="todo">{{ t.title }}</li>
</ul>
```

**Rerun the specs by clicking the button in the top right corner of the left pane.** Now the test will fail while trying to find the add todo button.

## Add Todos

**Add the `add-todo` button with the corresponding click handler.**

```typescript
import { Component } from '@angular/core';

interface Todo {
  title: string;
}

@Component({
  selector: 'myorg-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  todos: Todo[] = [{ title: 'Todo 1' }, { title: 'Todo 2' }];

  addTodo() {
    this.todos.push({
      title: `New todo ${Math.floor(Math.random() * 1000)}`
    });
  }
}
```

```html
<h1>Todos</h1>

<ul>
  <li *ngFor="let t of todos" class="todo">{{ t.title }}</li>
</ul>

<button id="add-todo" (click)="addTodo()">Add Todo</button>
```

The tests should pass now.

!!!!!
What will you see if you run: ng e2e todos-e2e --headless
!!!!!
Cypress will run in the headless mode, and the test will pass.
Cypress will run in the headless mode, and the test will fail.
