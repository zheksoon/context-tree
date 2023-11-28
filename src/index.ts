export interface IContext {
  context: IContext | null | undefined;
  contextType?: Context<any>;
  contextResolvers?: ContextResolvers;
}

export class ContextResolver<T> {
  constructor(
    public readonly context: Context<T>,
    public readonly resolver: () => T
  ) {}
}

export class ContextResolvers {
  private resolvers: Map<Context<any>, () => any> = new Map();

  addResolver(resolver: ContextResolver<any>) {
    const { context, resolver: _resolver } = resolver;

    this.resolvers.set(context, _resolver);
  }

  removeResolver(context: Context<any>) {
    this.resolvers.delete(context);
  }

  findResolver<T>(_context: Context<T>): (() => T) | null {
    let context: Context<any> | null | undefined = _context;

    while (context) {
      const resolver = this.resolvers.get(context);

      if (resolver) {
        return resolver;
      }

      context = context.parent;
    }

    return null;
  }
}

export class Context<T> {
  public declare parent: Context<any> | null;
  public declare readonly name: string;

  constructor(name: string) {
    this.parent = null;
    this.name = name;
  }

  static resolvers(resolvers: Array<ContextResolver<any>>): ContextResolvers {
    const contextResolvers = new ContextResolvers();

    resolvers.forEach((resolver) => {
      contextResolvers.addResolver(resolver);
    });

    return contextResolvers;
  }

  static checkRequired(instance: any): void {
    const constructor = instance.constructor;
    const requiredContexts =
      instance.requiredContexts ?? constructor?.requiredContexts;

    if (requiredContexts && Array.isArray(requiredContexts)) {
      const missingContexts = requiredContexts.filter(
        (context) => !context.resolveMaybe(instance)
      );

      if (missingContexts.length > 0) {
        const contextNames = missingContexts
          .map((context) => context.name)
          .join(", ");

        throw new Error(
          `Missing required contexts for instance of class '${constructor.name}': ${contextNames}`
        );
      }
    }
  }

  partial<P extends Partial<T>>(name: string): Context<P> {
    const context = new Context<P>(name);
    context.parent = this;

    return context;
  }

  resolvesTo(resolver: () => T): ContextResolver<T> {
    return new ContextResolver(this, resolver);
  }

  resolve(instance: IContext): T {
    const resolver = this.findResolver(instance);

    if (resolver) {
      return resolver();
    } else {
      throw new Error(`Cannot find context ${this.name}`);
    }
  }

  resolveMaybe(instance: IContext): T | undefined {
    const resolver = this.findResolver(instance);

    if (resolver) {
      return resolver();
    } else {
      return undefined;
    }
  }

  findResolver(_instance: IContext): (() => T) | null {
    let instance: IContext | null | undefined = _instance;

    while (instance) {
      let context: Context<any> | null = this;

      while (context) {
        if (instance.contextType === context) {
          // eslint-disable-next-line no-loop-func
          return () => instance as T;
        }

        context = context.parent;
      }

      const resolver = instance.contextResolvers?.findResolver(this);

      if (resolver) {
        return resolver;
      }

      instance = instance.context;
    }

    return null;
  }
}
