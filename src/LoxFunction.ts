import { Environment } from "./Environment";
import { Interpreter } from "./Interpreter";
import { Nil } from "./Lox";
import { LoxCallable } from "./LoxCallable";
import { LoxInstance } from "./LoxInstance";
import { Return } from "./Return";
import { FunctionStmt } from "./Statements";

export class LoxFunction extends LoxCallable {
  closure: Environment;
  declaration: FunctionStmt;
  isInitializer: boolean = false;

  arity(): number {
    return this.declaration.params.length;
  }

  constructor(
    declaration: FunctionStmt,
    closure: Environment,
    isInitializer: boolean
  ) {
    super();
    this.closure = closure;
    this.declaration = declaration;
    this.isInitializer = isInitializer;
  }

  call(interpreter: Interpreter, args: Object[]): Object {
    let environment = new Environment(this.closure);
    //Binding degli argomenti
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    try {
      Interpreter.executeBlock(this.declaration.body, environment);
    } catch (error) {
      if (error instanceof Return) {
        if (this.isInitializer) return this.closure.getAt(0, "this");
        return error.value;
      }
    }

    if (this.isInitializer) return this.closure.getAt(0, "this");

    return Nil;
  }

  bind(instance: LoxInstance): LoxFunction {
    let environment = new Environment(this.closure);
    environment.define("this", instance);
    return new LoxFunction(this.declaration, environment, this.isInitializer);
  }

  toString(): string {
    return "<fn " + this.declaration.name.lexeme + ">";
  }
}
