type Resolver<T> = () => T;

export class ContextResolver<T> {
  constructor(
    public readonly context: Context<T>,
    public readonly resolver: Resolver<T>
  ) {}
}

export interface IContext {
  context: IContext | IContext[] | null | undefined;
  contextType?: Context<any>;
  contextResolvers?: ContextResolvers;
}

export class ContextResolvers {
  private resolvers: Map<Context<any>, Resolver<any>> = new Map();

  addResolver(resolver: ContextResolver<any>) {
    const { context, resolver: _resolver } = resolver;

    this.resolvers.set(context, _resolver);
  }

  removeResolver(context: Context<any>) {
    this.resolvers.delete(context);
  }

  findResolver<T>(_context: Context<T>): Resolver<T> | null {
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

const contextTypeResolversCache = new WeakMap<IContext, Resolver<any>>();

export class Context<T> {
  public declare readonly parent: Context<any> | null;
  public declare readonly name: string;

  constructor(name: string, parent: Context<any> | null = null) {
    this.parent = parent;
    this.name = name;
  }

  static resolvers(resolvers: Array<ContextResolver<any>>): ContextResolvers {
    const contextResolvers = new ContextResolvers();

    for (const resolver of resolvers) {
      contextResolvers.addResolver(resolver);
    }

    return contextResolvers;
  }

  static checkRequired(instance: any): void {
    const constructor = instance.constructor;
    const requiredContexts =
      instance.requiredContexts ?? constructor?.requiredContexts;

    if (requiredContexts && Array.isArray(requiredContexts)) {
      const missingContexts = requiredContexts.filter(
        (context) => !context.findResolver(instance)
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
    return new Context<P>(name, this);
  }

  resolvesTo(resolver: Resolver<T>): ContextResolver<T> {
    return new ContextResolver(this, resolver);
  }

  resolve(instance: IContext): T {
    const resolver = this.findResolver(instance);

    if (resolver) {
      return resolver();
    } else {
      throw new Error(`Cannot find resolver for context ${this.name}`);
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

  findResolver(startInstance: IContext): Resolver<T> | null {
    const bfsQueue = new Set<IContext>();

    bfsQueue.add(startInstance);

    let resolver: Resolver<T> | null = null;

    for (const instance of bfsQueue) {
      const resolver =
        this.contextTypeResolver(instance) ??
        instance.contextResolvers?.findResolver(this);

      if (resolver) {
        return resolver;
      }

      const { context } = instance;

      if (context) {
        if (Array.isArray(context)) {
          for (const parent of context) {
            bfsQueue.add(parent);
          }
        } else {
          bfsQueue.add(context);
        }
      }
    }

    return null;
  }

  private contextTypeResolver(instance: IContext): Resolver<T> | null {
    let context: Context<any> | null = this;

    while (context) {
      if (instance.contextType === context) {
        let instanceResolver = contextTypeResolversCache.get(instance);

        if (!instanceResolver) {
          instanceResolver = () => instance;

          contextTypeResolversCache.set(instance, instanceResolver);
        }

        return instanceResolver;
      }

      context = context.parent;
    }

    return null;
  }
}
