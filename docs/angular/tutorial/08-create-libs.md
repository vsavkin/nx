# Step 8: Create Libs

Libraries are not just a way to share code in Nx. They are also useful for factoring out code into small units with a well-defined public API.

## Public API

Every library has an `index.ts` file, which defines its public API. Other applications and libraries should only access what the `index.ts` exports. Everything else in the library is private.

## UI Libraries

To illustrate how useful libraries can be, create a library of Angular components.

**Run `ng g @nrwl/angular:lib ui`.**

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
│       │   │   ├── ui.module.spec.ts
│       │   │   └── ui.module.ts
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

The `libs/ui/src/lib/ui.module.ts` file looks like this:

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [CommonModule]
})
export class UiModule {}
```

## Add a Component

**Add a component to the newly created ui library by running:**

```bash
ng g component todos --project=ui --export
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
│       │   │   ├── todos/
│       │   │   │   ├── todos.component.css
│       │   │   │   ├── todos.component.html
│       │   │   │   ├── todos.component.spec.ts
│       │   │   │   └── todos.component.ts
│       │   │   ├── ui.module.spec.ts
│       │   │   └── ui.module.ts
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

**Add a `todos` input to `libs/src/lib/todos/todos.component.ts`.**

```typescript
import { Component, OnInit, Input } from '@angular/core';
import { Todo } from '@myorg/data';

@Component({
  selector: 'myorg-todos',
  templateUrl: './todos.component.html',
  styleUrls: ['./todos.component.css']
})
export class TodosComponent implements OnInit {
  @Input() todos: Todo[];

  constructor() {}

  ngOnInit() {}
}
```

**And update `todos.component.html` to display the given todos:**

```html
<ul>
  <li *ngFor="let t of todos">{{ t.title }}</li>
</ul>
```

## Use the UI Library

**Now import `UiModule` into `apps/todos/src/app/app.module.ts`.**

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { UiModule } from '@myorg/ui';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, UiModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

**And update `app.component.html`:**

```html
<h1>Todos</h1>

<myorg-todos [todos]="todos"></myorg-todos>

<button (click)="addTodo()">Add Todo</button>
```

**Restart both `ng serve api` and `ng serve todos` and you should see the application running.**

!!!!!
Libraries' public API is defined in...
!!!!!
index.ts
angular.json and tsconfig.json files
