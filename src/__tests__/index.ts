import { ContextResolvers, ContextResolver, Context, IContext } from "../index";

describe("ContextResolvers", () => {
  let contextResolvers: ContextResolvers;
  let context: Context<any>;
  let resolver: () => any;
  let contextResolver: ContextResolver<any>;

  beforeEach(() => {
    contextResolvers = new ContextResolvers();
    resolver = jest.fn();
    context = new Context("test");
    contextResolver = new ContextResolver(context, resolver);
  });

  test("addResolver", () => {
    contextResolvers.addResolver(contextResolver);
    expect(contextResolvers.findResolver(context)).toBe(resolver);
  });

  test("removeResolver", () => {
    contextResolvers.addResolver(contextResolver);
    contextResolvers.removeResolver(context);
    expect(contextResolvers.findResolver(context)).toBeNull();
  });

  test("findResolver", () => {
    contextResolvers.addResolver(contextResolver);
    expect(contextResolvers.findResolver(context)).toBe(resolver);
  });
});

describe("Context", () => {
  describe("constructor", () => {
    it("should create a new Context with the given name", () => {
      const context = new Context("TestContext");
      expect(context.name).toBe("TestContext");
      expect(context.parent).toBeNull();
    });
  });

  describe("partial", () => {
    it("should create a partial context with a parent reference", () => {
      const parentContext = new Context<string>("ParentContext");
      const childContext = parentContext.partial<string>("ChildContext");
      expect(childContext.name).toBe("ChildContext");
      expect(childContext.parent).toBe(parentContext);
    });
  });

  describe("resolvesTo", () => {
    it("should create a ContextResolver for the context", () => {
      const context = new Context<string>("TestContext");
      const resolver = context.resolvesTo(() => "ResolvedValue");
      expect(resolver).toBeInstanceOf(ContextResolver);
      expect(resolver.context).toBe(context);
    });
  });

  describe("resolvers", () => {
    it("should create ContextResolvers from an array of ContextResolver", () => {
      const context = new Context<string>("TestContext");
      const resolvers = Context.resolvers([
        context.resolvesTo(() => "ResolvedValue"),
      ]);
      expect(resolvers).toBeInstanceOf(ContextResolvers);
    });
  });

  describe("Context resolution", () => {
    describe("resolve", () => {
      it("should resolve a context value", () => {
        const context = new Context<string>("TestContext");
        const instance: IContext = {
          context: null,
          contextResolvers: Context.resolvers([
            context.resolvesTo(() => "ResolvedValue"),
          ]),
        };
        expect(context.resolve(instance)).toBe("ResolvedValue");
      });
    });

    describe("resolveMaybe", () => {
      it("should return undefined for resolveMaybe if context is not found", () => {
        const context = new Context<string>("TestContext");
        const instance: IContext = { context: null };
        expect(context.resolveMaybe(instance)).toBeUndefined();
      });
    });

    describe("findResolver", () => {
      it("should return null if no resolver is found", () => {
        const context = new Context<string>("TestContext");
        const instance: IContext = { context: null };
        expect(context.findResolver(instance)).toBeNull();
      });

      it("should return a resolver if found", () => {
        const context = new Context<string>("TestContext");
        const resolver = () => "ResolvedValue";
        const instance: IContext = {
          context: null,
          contextResolvers: Context.resolvers([context.resolvesTo(resolver)]),
        };
        expect(context.findResolver(instance)).toBe(resolver);
      });
    });
  });

describe("checkRequired", () => {
  it("should throw an error if required contexts are missing", () => {
    const missingContext = new Context<string>("MissingContext");
    class TestClass {
      static requiredContexts = [missingContext];
    }
    const testInstance = new TestClass();

    expect(() => Context.checkRequired(testInstance)).toThrow(
      `Missing required contexts for instance of class 'TestClass': MissingContext`
    );
  });

  it("should not throw an error if all required contexts are present", () => {
    const presentContext = new Context<string>("PresentContext");
    class TestClass {
      static requiredContexts = [presentContext];
    }
    const testInstance = new TestClass();

    // Mocking resolveMaybe to simulate presence of context
    presentContext.resolveMaybe = jest.fn().mockReturnValue("SomeValue");

    expect(() => Context.checkRequired(testInstance)).not.toThrow();
  });
});
});
