export interface IContext {
  context: IContext | null | undefined;
  contextType?: Context<any>;
  contextResolvers?: ContextResolvers;
}

type ContextResolver<T = any> = readonly [symbol, () => T];
type ContextResolvers = Map<symbol, () => any>;

export class Context<T> {
  private declare parent: Context<any> | null;
  private declare readonly symbol: symbol;
  public declare readonly name?: string;

  constructor(name?: string) {
    this.parent = null;
    this.name = name;
    this.symbol = Symbol(name);
  }

  static resolvers(resolvers: Array<ContextResolver>): ContextResolvers {
    const result: ContextResolvers = new Map();

    return resolvers.reduce(
      (acc, [key, resolver]) => acc.set(key, resolver),
      result
    );
  }

  static addResolver(instance: IContext, resolver: ContextResolver): void {
    (instance.contextResolvers ??= new Map()).set(resolver[0], resolver[1]);
  }

  static removeResolver(instance: IContext, resolverClass: Context<any>) {
    instance.contextResolvers?.delete(resolverClass.symbol);
  }

  static checkRequired(instance: any): void {
    if (instance && typeof instance === "object") {
      const constructor = instance.constructor;
      const requiredContexts =
        instance.requiredContexts ?? constructor?.requiredContexts;

      if (requiredContexts && Array.isArray(requiredContexts)) {
        const missingContexts = requiredContexts.filter(
          (context) => !context.findMaybe(instance)
        );

        if (missingContexts.length > 0) {
          const contextNames = missingContexts
            .map((context) => context.name ?? "[Noname context]")
            .join(", ");

          console.error(
            `Missing required contexts for instance of class '${constructor.name}': ${contextNames}`
          );
        }
      }
    }
  }

  partial<P extends Partial<T>>(name?: string): Context<P> {
    const context = new Context<P>(name);
    context.parent = this;

    return context;
  }

  resolvesTo(resolver: () => T): ContextResolver<T> {
    return [this.symbol, resolver] as const;
  }

  find(instance: IContext): T {
    const resolver = this.findResolver(instance);

    if (resolver) {
      return resolver();
    } else {
      throw new Error(`Cannot find context ${this.name ?? "[Noname context]"}`);
    }
  }

  findMaybe(instance: IContext): T | undefined {
    const resolver = this.findResolver(instance);

    if (resolver) {
      return resolver();
    } else {
      return undefined;
    }
  }

  findResolver(instance: IContext): (() => T) | null {
    let _instance: IContext | null | undefined = instance;

    while (_instance) {
      let context: Context<any> | null = this;

      while (context) {
        if (_instance.contextType === context) {
          // eslint-disable-next-line no-loop-func
          return () => _instance as T;
        }

        context = context.parent;
      }

      const resolvers = _instance.contextResolvers;

      if (resolvers) {
        context = this;

        while (context) {
          const resolver = resolvers.get(context.symbol);

          if (resolver) {
            return resolver;
          }

          context = context.parent;
        }
      }

      _instance = _instance.context;
    }

    return null;
  }
}
