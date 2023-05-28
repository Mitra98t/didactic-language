import { Token } from "./Token";

export class Environment {
  private values: Map<string, Object> = new Map<string, Object>();

  public define(name: string, value: Object): void {
    this.values.set(name, value);
  }

  public get(name: Token): Object {
    let value: Object | undefined = this.values.get(name.lexeme);
    if (value !== undefined) {
      return value;
    }

    throw new Error(`Undefined variable '${name.lexeme}'.`);
  }
}
