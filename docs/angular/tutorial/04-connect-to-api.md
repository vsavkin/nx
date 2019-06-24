# Step 4: Connect to an API

Real-world applications do not live in isolation — they need APIs to talk to. Setup your app to talk to an API.

**Open `apps/todos/src/app/app.module.ts` to import `HttpClientModule`.**

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

**Now, use `HttpClient` in the component to get the data from the api.**

```typescript
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Todo {
  title: string;
}

@Component({
  selector: 'myorg-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  todos: Todo[] = [];

  constructor(private http: HttpClient) {
    this.fetch();
  }

  fetch() {
    this.http.get<Todo[]>('/api/todos').subscribe(t => (this.todos = t));
  }

  addTodo() {
    this.http.post('/api/addTodo', {}).subscribe(() => {
      this.fetch();
    });
  }
}
```

!!!!!
Run "ng serve todos" and open http://localhost:4200. What do you see?
!!!!!
"the server responded with a status of 404 (Not Found)" in Console.
Blank screen.
Exception rendered on the screen.
