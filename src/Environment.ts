import { EnvironmentError } from "./Errors";
import { Token } from "./Token";

export class Environment {
  enclosing: Environment | null = null;
  private values: Map<string, Object> = new Map<string, Object>();

  constructor(enclosing: Environment | null = null) {
    this.enclosing = enclosing;
  }

  public define(name: string, value: Object): void {
    this.values.set(name, value);
  }

  public get(name: Token): Object {
    let value: Object | undefined = this.values.get(name.lexeme);
    if (value !== undefined) {
      return value;
    }

    // Check upper scopes.
    if (this.enclosing !== null) {
      return this.enclosing.get(name);
    }

    throw new EnvironmentError(`Undefined variable '${name.lexeme}'.`);
  }

  public assign(name: Token, value: Object): void {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }

    // Check upper scopes.
    if (this.enclosing !== null) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new EnvironmentError(`Undefined variable '${name.lexeme}'.`);
  }
}
