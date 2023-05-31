import { RuntimeError } from "./Errors";
import { LoxClass } from "./LoxClass";
import { LoxFunction } from "./LoxFunction";
import { Token } from "./Token";

export class LoxInstance {
  private klass: LoxClass;
  private fields: Map<string, Object> = new Map<string, Object>();

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  toString(): string {
    return `${this.klass.name} instance`;
  }

  get(name: Token): Object {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme)!;
    }

    let method: LoxFunction | null = this.klass.findMethod(name.lexeme);
    if (method != null) {
      return method.bind(this);
    }

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name: Token, value: Object): void {
    this.fields.set(name.lexeme, value);
  }
}
