import { TokenType } from "./TokenType";

export class Token {
  public type: TokenType;
  public typeName: string;
  public lexeme: string;
  public literal: any;
  public line: number;

  constructor(type: TokenType, lexeme: string, literal: any, line: number) {
    this.type = type;
    this.typeName = TokenType[type];
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  public toString(): string {
    return this.type + " " + this.lexeme + " " + this.literal;
  }
}
