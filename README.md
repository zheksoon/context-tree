<h1 align="center">
  <img src="https://raw.githubusercontent.com/zheksoon/context-tree/master/assets/logo.png" alt="context-tree logo" width="100" />
  <br />
  context-tree
  <br />
  <img src="https://img.shields.io/npm/v/context-tree?color=16b887" alt="npm version" />
  <img src="https://img.shields.io/bundlephobia/minzip/context-tree?label=gzip&color=16b887" alt="bundle size" />
  <img src="https://img.shields.io/github/license/zheksoon/context-tree?color=16b887" alt="license" />
</h1>

**context-tree** is a simple implementation of a hierarchical dependency injection (DI) pattern for building scalable web applications.
It implements the same concept as React's `Context`, but without relying on React.
The pattern allows you to create arbitrary nested applications and sub-applications, simplifying the architecture and maintaining code clarity.

Unlike other DI frameworks, **context-tree** does not require you to define a dependency graph in advance, offering a more flexible approach.
The difference from the other DI frameworks is an inherent hierarchy of injectable entities, called **contexts**.
They align with the hierarchy of the application itself and form a tree like React contexts do.
Like React, you can redefine the context value at any point of the tree, and also add and remove context resolvers dynamically.

**context-tree** is framework-agnostic and can be used with any framework or without a framework at all.
It also does not require any decorators or other magic, so it's easy to understand and debug, and can be used in pure JS projects.
**context-tree** has no dependencies and is very lightweight, and because of the pattern simplicity, it's very fast.

## Defining models

**Context-tree** requires your data models to implement a simple `IContext` interface with only one field required: `context` of type `IContext | IContext[] | null | undefined`.
This field should point to a parent or multiple parent models, or be `null` in case there is no parent model.

Here's a simple example:

```ts
import { IContext } from "context-tree";

class RootModel implements IContext {
  // root model does not have context, so it's null
  public context = null;

  // by convention, all models with context take a parent as the first argument
  childModel = new ChildModel(this);
}

class ChildModel implements IContext {
  // use TS shortcut to define a field from the constructor arg
  // now it points to the parent model
  constructor(public context: IContext) {}
}
```

At this point, we have a model tree. Let's define a context and add the resolver to it.

```ts
import { Context, IContext } from "context-tree";

// define some interface for config object
interface IConfigModel {
  baseUrl: string;
  apiKey: string;
}

// an implementation of the interface
class ConfigModel implements IConfigModel {
  baseUrl = "https://.../";
  apiKey = "abcdef123";
}

// define a context that carries the type of the config
const ConfigContext = new Context<IConfig>("ConfigContext");

class RootModel implements IContext {
  public context = null;

  // define resolvers - functions that are called when the context resolves
  public contextResolvers = Context.resolvers([
    ConfigContext.resolvesTo(() => this.config),
  ]);

  private config = new ConfigModel();

  // pass this as the context of the child model
  private childModel = new ChildModel(this);
}

class ChildModel implements IContext {
  constructor(public context: IContext) {}

  async getData() {
    // to get the config instance, call `resolve` on the context
    // and pass the current model as the first argument
    const config = ConfigContext.resolve(this);

    // use the config instance
    const data = await fetch(`${config.baseUrl}/endpoint`);
  }
}
```

In case you want a model itself to be a context, you can use `contextType` field:

```ts
const RootContext = new Context<RootModel>('RootContext');

class RootModel implements IContext {
  // no parent context
  context = null;

  // now RootContext resolves to the model instance
  contextType = RootContext;

  // define some extra resolvers
  contextResolvers = Context.resolvers([
    ...
  ]);
}
```

## Partial contexts

Not always full contexts are needed. For example, the config model and its interface can contain dozens of fields, and our model may need only a few of them. When we are writing unit tests for a model, we have to supply a full config context that implements every field from its interface, and that can be cumbersome.

Partial contexts solve this problem by allowing you to define a partial interface from your original context. If the partial context resolves, it will resolve to the closest parent model that implements the partial interface.

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
type IPartialConfigModel = Pick<IConfigModel, "option1" | "option2">;

// define a partial context derived from the ConfigContext
const PartialConfigContext = ConfigContext.partial<IPartialConfigModel>(
  "PartialConfigContext"
);

// Finds a closest instance of IPartialConfigModel or IConfigModel
PartialConfigContext.resolve(this);
```

### Dynamic context manipulation

Context resolvers can be dynamically added or removed from a model. This might be useful in complex scenarios when contexts are not known in advance.

```ts
const Context1 = new Context<number>("Context1");
const Context2 = new Context<string>("Context2");

class RootModel implements IContext {
  // no parent context
  context = null;

  // define static resolvers
  contextResolvers = Context.resolvers([Context1.resolvesTo(() => 1 + 2)]);

  // add dynamic resolvers
  doSomething() {
    this.contextResolvers.addResolver(Context2.resolvesTo(() => "hello"));
  }

  // remove dynamic resolvers
  doSomethingElse() {
    this.contextResolvers.removeResolver(Context2);
  }
}
```

## Required contexts

Sometimes you want to make sure that a model has all required contexts resolved. For example, you may want to make sure that a model has a config context resolved before it can be used. To do that, you can define a static field `requiredContexts` on a class or class instance:

```ts
const Context1 = new Context<number>("Context1");
const Context2 = new Context<string>("Context2");

class RootModel implements IContext {
  // no parent context
  context = null;

  // define resolvers
  contextResolvers = Context.resolvers([Context1.resolvesTo(() => 1 + 2)]);

  // define required contexts
  // RootModel has no Context2 resolver, so it will throw an error
  static requiredContexts = [Context2];
}

// throws an error
Context.checkRequired(new RootModel());
```

# API

## Models

Each model should implement the `IContext` interface:

```ts
interface IContext {
  context: IContext | IContext[] | null | undefined;
  contextType?: Context<any>;
  contextResolvers?: ContextResolvers;
}
```

The usual way to pass the required `context` field is the first argument of the constructor:

```ts
class Model implements IContext {
  constructor(public context: IContext) {}
}
```

## Context

### `new Context<T>(name: string): Context<T>`

Creates a new context with the given name. The name is used for debugging purposes.

### `contextInstance.partial<T>(name: string): Context<T>`

Creates a partial context derived from the current context. The partial context can be resolved to the closest parent model that implements the partial interface.

### `Context.resolvesTo<T>(resolver: () => T): ContextResolver<T>`

Create a resolver for the context. The resolver is a function that returns a value of type `T`. The resolver is called when the context is resolved.

### `Context.resolvers(resolvers: Array<ContextResolver<any>>): ContextResolvers`

Define a list of resolvers for a model.

### `contextInstance.resolve<T>(model: IContext): T`

Finds the closest context resolver of the type and calls it to resolve the value. If no resolver is found, throws an error.

### `contextInstance.resolveMaybe<T>(model: IContext): T | undefined`

Finds the closest context resolver of the type and calls it to resolve the value. If no resolver is found, returns `undefined`.

### `contextInstance.findResolver(model: IContext): ContextResolver<any> | undefined`

Finds the closest context resolver of the type. If no resolver is found, returns `undefined`.

### `Context.checkRequired(model: IContext): void`

Checks if all required resolvers are defined for the model. If not, throws an error. Required contexts are defined by `requiredContexts` field on a class or class instance.

# Author

Eugene Daragan

# License

MIT
