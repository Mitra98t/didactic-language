import { Token } from "./Token";

export class EnvironmentError extends Error {}

export class RuntimeError extends Error {
  token: Token;

  constructor(token: Token, msg: string) {
    super(msg);
    this.token = token;
  }
}

export class ImpossibleError extends Error {}

export class ParserError extends Error {
  token: Token;
  constructor(token: Token, msg: string) {
    super(msg);
    this.token = token;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ParserError.prototype);
  }

  sayHello() {
    return "hello " + this.message;
  }
}

export class ResolverError extends Error {
  token: Token;
  constructor(token: Token, message: string) {
    super(message);
    this.token = token;
  }
}
