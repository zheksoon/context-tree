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

    describe("long context chain resolution", () => {
      it("should resolve a context value from a long chain of contexts", () => {
        const context = new Context<string>("TestContext");

        const instance1: IContext = {
          context: null,
          contextResolvers: Context.resolvers([
            context.resolvesTo(() => "ResolvedValue1"),
          ]),
        };

        const instance2: IContext = {
          context: instance1,
        };

        const instance3: IContext = {
          context: instance2,
        };

        const instance4: IContext = {
          context: instance3,
        };

        expect(context.resolve(instance4)).toBe("ResolvedValue1");
      });

      it("should resolve a context value from a long chain of multiple contexts", () => {
        const context1 = new Context<string>("TestContext1");
        const context2 = new Context<string>("TestContext2");

        const instance1: IContext = {
          context: null,
          contextResolvers: Context.resolvers([
            context1.resolvesTo(() => "ResolvedValue1"),
            context2.resolvesTo(() => "ResolvedValue2"),
          ]),
        };

        const instance2: IContext = {
          context: instance1,
        };

        const instance3: IContext = {
          context: instance2,
        };

        const instance4: IContext = {
          context: instance3,
        };

        expect(context1.resolve(instance4)).toBe("ResolvedValue1");
        expect(context2.resolve(instance4)).toBe("ResolvedValue2");
      });
    });

    describe("multiple parent contexts", () => {
      it("should resolve a context value from multiple parent contexts", () => {
        const context1 = new Context<string>("TestContext1");
        const context2 = new Context<string>("TestContext2");

        const parent1 = { context: null, contextType: context1 };
        const parent2 = { context: null, contextType: context2 };

        const instance: IContext = {
          context: [parent1, parent2],
        };

        const instance2 = { context: instance };

        expect(context1.resolve(instance2)).toBe(parent1);
        expect(context2.resolve(instance2)).toBe(parent2);
      });

      it("should resolve to a closest parent context if multiple parent contexts are present", () => {
        const context1 = new Context<string>("TestContext1");
        const context2 = new Context<string>("TestContext2");

        const parent1 = { context: null, contextType: context1 };
        const parent2 = { context: null, contextType: context2 };

        const instance: IContext = {
          context: [parent1, parent2],
        };

        const instance2 = { context: instance };

        const instance3 = { context: instance2, contextType: context1 };

        const instance4 = { context: instance3 };

        expect(context1.resolve(instance4)).toBe(instance3);
        expect(context2.resolve(instance2)).toBe(parent2);
      });

      it("should traverse the context acyclic graph", () => {
        // create acyclic graph of contexts with multiple parents
        const context1 = new Context<string>("TestContext1");
        const context2 = new Context<string>("TestContext2");
        const context3 = new Context<string>("TestContext3");

        const parent1 = { context: null, contextType: context1 };
        const parent2 = { context: null, contextType: context2 };

        const instance: IContext = {
          context: [parent1, parent2],
        };

        const instance2 = { context: [instance, parent1] };

        const instance3 = { context: [instance2, parent2] };

        const instance4 = { context: [instance3, parent1, parent2] };

        expect(context1.resolve(instance4)).toBe(parent1);
        expect(context2.resolve(instance4)).toBe(parent2);
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
      presentContext.findResolver = jest.fn(() => () => "SomeValue");

      expect(() => Context.checkRequired(testInstance)).not.toThrow();
    });
  });
});
