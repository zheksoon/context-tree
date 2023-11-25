# Context-tree

**Context-tree** is a library implementing hierarchical dependency injection (DI) pattern for building scalable web applications.
It implements the same concept as React's `Context`, but without relying on React.

## Defining models

**Context-tree** requires your data models to implement `IContext` interface, which is very simple and has only one field required: `context` of type `IContext | null | undefined`.
This field should point to a parent model, or be `null` in case there is no parent model.

Let's define a simple todo list app with contexts:

```ts
import { IContext } from "contextual";

// IConfigModel is an interface that defines some configuration options
interface IConfigModel {
  baseUrl: string;
  option1: string;
}

// models that have context should extend IContext interface
interface IAppModel extends IContext {
  todoList: ITodoListModel;
}

interface ITodoListModel extends IContext {
  todoItems: ITodoItemModel[];
  filter: string;
}

interface ITodoItemModel extends IContext {
  text: string;
  done: boolean;
}

// implementation of config model
class ConfigModel implements IConfigModel {
  // some implementation of config model
}

// AppModel is root entity, it doesn't have context, so the context field is null
class AppModel implements IAppModel {
  context = null;

  // todoList is a child model, so it should have a reference to its parent
  todoList = new TodoListModel(this);
  config = new ConfigModel();
}

class TodoListModel implements ITodoListModel {
  todoItems: ITodoItemModel[] = [];
  filter = "ALL";

  //by convention, parent model is passed as the first argument in constructor
  constructor(public context: IContext) {}
}

class TodoItemModel implements ITodoItemModel {
  declare text: string;
  declare done: boolean;

  // the same, the first argument is a parent model
  constructor(public context: IContext, text: string) {
    this.text = text;
    this.done = false;
  }
}
```

First, we define model interfaces that extend `IContext` interface, and then we define models that implement these interfaces.
There is a convention, that for any non-root model, its parent is passed as the first argument in constructor.
In Typescript, it's simply done by constructor field declaration shortcut:

```ts
constructor(public context: IContext) {
  ...
}
```

Let's define context types to see how we can use the implemented interfaces.

## Context types

Context type, or simply context, is a simple class that carries information about a type (defined in a generic parameter), and name.

It's as simple as this:

```ts
import { Context } from "contextual";

const AppContext = new Context<IAppModel>("AppContext");

const ConfigContext = new Context<IConfigModel>("ConfigContext");
```

To use a context, we must define **resolver** for it.
Resolver is a function that is called when a context is trying to find an instance of it by calling `ContextInstance.find(this)`.
To define a resolver, we should add `contextResolvers` field to our model declaration, like this:

```ts
class AppModel implements IAppModel {
  context = null;
  
  contextResolvers = Context.resolvers([
    AppContext.resolvesTo(() => this),
    ConfigContext.resolvesTo(() => this.config),
  ]);

  todoList = new TodoListModel(this);
  config = new ConfigModel();
}
```

Then we can use it to get the `AppModel` or `ConfigModel` instance from any part of our application that was created inside the `AppModel`. Let's get the config instance from inside of `TodoItemModel`:

```ts
class TodoItemModel implements ITodoItemModel {
  async fetchData() {
    // now config is an instance of ConfigModel defined AppModel resolver
    const config = ConfigContext.find(this);
  }
}
```

As you can see, `ConfigContext.find(this)` returns an optional instance of `IConfigModel` which can be found upper in the model tree as part of `AppModel` resolvers.

There is also a shortcut for defining a resolver that resolves to `this`, so the following:

```ts
class AppModel implements IAppModel {
  contextResolvers = Context.resolvers([
    AppContext.resolvesTo(() => this)
  ]);
}
```

can be rewritten as:

```ts
class AppModel implements IAppModel {
  contextType = AppContext;
}
```

## Partial contexts

Not always full contexts are needed. For example, the config model and its interface can contain dozens of fields, and our model may need only a few of them. In case we write some unit tests for our model, we have to supply a full config context that implements every field from its interface, and that can be cumbersome.

Partial contexts solve this problem by allowing you to define a partial interface from your original context. If the partial context is used to resolve a model, it will resolve to the closest parent model that implements the partial interface.

Here's an example:

```ts
interface IConfigModel {
  baseUrl: string;
  option1: string;
  option2: string;
  option3: string;
}

const ConfigContext = new Context<IConfigModel>("ConfigContext");

// pick only option1 and option2 from IConfigModel
type ITodoItemConfigModel = Pick<IConfigModel, "option1" | "option2">;

// define a partial context derived from the ConfigContext
const TodoItemConfigContext = ConfigContext.partial<ITodoItemConfigModel>(
  "TodoItemConfigContext"
);

// Finds a closest instance of ITodoItemConfigModel or IConfigModel
TodoItemConfigContext.find(this);
```

# Author

Eugene Daragan

# License

MIT