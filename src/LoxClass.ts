import { Interpreter } from "./Interpreter";
import { LoxCallable } from "./LoxCallable";
import { LoxFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";

export class LoxClass extends LoxCallable {
  name: string;
  methods: Map<string, LoxFunction>;

  constructor(name: string, methods: Map<string, LoxFunction>) {
    super();
    this.name = name;
    this.methods = methods;
  }

  toString(): string {
    return this.name;
  }

  findMethod(name: string): LoxFunction | null {
    if (this.methods.has(name)) {
      return this.methods.get(name)!;
    }

    return null;
  }

  call(interpreter: Interpreter, args: Object[]): Object {
    let instance: LoxInstance = new LoxInstance(this);
    let initializer: LoxFunction | null = this.findMethod("init");
    if (initializer != null) {
      initializer.bind(instance).call(interpreter, args);
    }
    return instance;
  }

  arity(): number {
    let initializer: LoxFunction | null = this.findMethod("init");
    if (initializer != null) {
      return initializer.arity();
    }
    return 0;
  }
}
