import { Environment } from "./Environment";
import { Interpreter } from "./Interpreter";
import { Nil } from "./Lox";
import { LoxCallable } from "./LoxCallable";
import { Return } from "./Return";
import { FunctionStmt } from "./Statements";

export class LoxFunction extends LoxCallable {
  closure: Environment;
  declaration: FunctionStmt;
  arity(): number {
    return this.declaration.params.length;
  }

  constructor(declaration: FunctionStmt, closure: Environment) {
    super();
    this.closure = closure;
    this.declaration = declaration;
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
        return error.value;
      }
    }

    return Nil;
  }

  toString(): string {
    return "<fn " + this.declaration.name.lexeme + ">";
  }
}
