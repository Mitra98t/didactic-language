import {
  AssignExpr,
  BinaryExpr,
  Expr,
  GroupingExpr,
  LiteralExpr,
  LogicalExpr,
  UnaryExpr,
  VariableExpr,
} from "./Expressions";
import { Lox, Nil } from "./Lox";
import {
  BlockStmt,
  ExpressionStmt,
  IfStmt,
  PrintStmt,
  Stmt,
  VarStmt,
  WhileStmt,
} from "./Statements";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

class ParserError extends Error {
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

export class Parser {
  tokens: Token[];
  current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = [...tokens];
  }

  public parse(): Stmt[] {
    let statements: Stmt[] = [];

    while (!this.isAtEnd()) {
      statements.push(this.declaration());
    }

    return statements;
  }

  private declaration(): Stmt {
    try {
      if (this.match([TokenType.VAR])) {
        return this.varDeclaration();
      }

      return this.statement();
    } catch (error) {
      if (error instanceof ParserError) {
        this.synchronize();
      }
      return Nil;
    }
  }

  private varDeclaration(): Stmt {
    let name: Token = this.consume(
      TokenType.IDENTIFIER,
      "Expect variable name."
    );

    let initializer: Expr = Nil;
    if (this.match([TokenType.EQUAL])) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return new VarStmt(name, initializer);
  }

  private whileStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    let condition: Expr = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
    let body: Stmt = this.statement();

    return new WhileStmt(condition, body);
  }

  private expression(): Expr {
    return this.assignment();
  }

  private statement(): Stmt {
    if (this.match([TokenType.IF])) {
      return this.ifStatement();
    }
    if (this.match([TokenType.WHILE])) {
      return this.whileStatement();
    }
    if (this.match([TokenType.PRINT])) {
      return this.printStatement();
    }
    if (this.match([TokenType.LEFT_BRACE])) {
      return new BlockStmt(this.block());
    }

    return this.expressionStatement();
  }

  private ifStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
    let condition: Expr = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");

    let thenBranch: Stmt = this.statement();
    let elseBranch: Stmt = Nil;
    if (this.match([TokenType.ELSE])) {
      elseBranch = this.statement();
    }

    return new IfStmt(condition, thenBranch, elseBranch);
  }

  private printStatement(): Stmt {
    let value: Expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new PrintStmt(value);
  }

  private expressionStatement(): Stmt {
    let expr: Expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new ExpressionStmt(expr);
  }

  private block(): Stmt[] {
    let statements: Stmt[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
    return statements;
  }

  private assignment(): Expr {
    let expr: Expr = this.or();

    if (this.match([TokenType.EQUAL])) {
      let equals: Token = this.previous();
      let value: Expr = this.assignment();

      if (expr instanceof VariableExpr) {
        let name: Token = expr.name;
        return new AssignExpr(name, value);
      }

      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private or(): Expr {
    let expr: Expr = this.and();

    while (this.match([TokenType.OR])) {
      let operator: Token = this.previous();
      let right: Expr = this.and();
      expr = new LogicalExpr(expr, operator, right);
    }

    return expr;
  }

  private and(): Expr {
    let expr: Expr = this.equality();

    while (this.match([TokenType.AND])) {
      let operator: Token = this.previous();
      let right: Expr = this.equality();
      expr = new LogicalExpr(expr, operator, right);
    }

    return expr;
  }

  private equality(): Expr {
    let expr: Expr = this.comparison();

    while (this.match([TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL])) {
      let operator: Token = this.previous();
      let right: Expr = this.comparison();
      expr = new BinaryExpr(expr, operator, right);
    }

    return expr;
  }

  private comparison(): Expr {
    let expr: Expr = this.term();

    while (
      this.match([
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      ])
    ) {
      let operator: Token = this.previous();
      let right: Expr = this.term();
      expr = new BinaryExpr(expr, operator, right);
    }

    return expr;
  }

  private term(): Expr {
    let expr: Expr = this.factor();

    while (this.match([TokenType.MINUS, TokenType.PLUS])) {
      let operator: Token = this.previous();
      let right: Expr = this.factor();
      expr = new BinaryExpr(expr, operator, right);
    }

    return expr;
  }

  private factor(): Expr {
    let expr: Expr = this.unary();

    while (this.match([TokenType.SLASH, TokenType.STAR])) {
      let operator: Token = this.previous();
      let right: Expr = this.unary();
      expr = new BinaryExpr(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expr {
    if (this.match([TokenType.BANG, TokenType.MINUS])) {
      let operator: Token = this.previous();
      let right: Expr = this.unary();
      return new UnaryExpr(operator, right);
    }

    return this.primary();
  }

  private primary(): Expr {
    if (this.match([TokenType.FALSE])) {
      return new LiteralExpr(false);
    }
    if (this.match([TokenType.TRUE])) {
      return new LiteralExpr(true);
    }
    if (this.match([TokenType.NIL])) {
      return new LiteralExpr(Nil);
    }
    if (this.match([TokenType.NUMBER, TokenType.STRING])) {
      return new LiteralExpr(this.previous().literal);
    }

    if (this.match([TokenType.IDENTIFIER])) {
      return new VariableExpr(this.previous());
    }

    if (this.match([TokenType.LEFT_PAREN])) {
      let expr: Expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new GroupingExpr(expr);
    }

    throw new ParserError(this.peek(), "Expect expression.");
  }

  private match(types: TokenType[]): boolean {
    for (let type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return false;
    }
    return this.peek().type == type;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    throw new Error(message);
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type == TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private error(token: Token, message: string): ParserError {
    Lox.error(token, message);
    return new ParserError(token, message);
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type == TokenType.SEMICOLON) {
        return;
      }

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }
}
