import {
  ArrayAccessExpr,
  ArrayExpr,
  AssignExpr,
  BinaryExpr,
  CallExpr,
  Expr,
  GroupingExpr,
  LiteralExpr,
  LogicalExpr,
  UnaryExpr,
  VariableExpr,
} from "./Expressions";
import { Lox, Nil } from "./Lox";
import {
  AssertStmt,
  BlockStmt,
  ExpressionStmt,
  FunctionStmt,
  IfStmt,
  PrintStmt,
  ReturnStmt,
  Stmt,
  VarStmt,
  WhileStmt,
} from "./Statements";
import { Token } from "./Token";
import { TokenType } from "./TokenType";
import { ImpossibleError, ParserError } from "./Errors";

export class Parser {
  tokens: Token[];
  current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = [...tokens];
  }

  public parse(): Stmt[] {
    try {
      let statements: Stmt[] = [];
      while (!this.isAtEnd()) {
        statements.push(this.declaration());
      }
      return statements;
    } catch (error) {
      if (error instanceof ParserError) {
        Lox.parserError(error);
      }
      return [];
    }
  }

  private declaration(): Stmt {
    try {
      if (this.match([TokenType.VAR])) {
        return this.varDeclaration();
      }
      if (this.match([TokenType.FUN])) {
        return this.function("function");
      }

      return this.statement();
    } catch (error) {
      if (error instanceof ParserError) {
        this.synchronize();
        Lox.parserError(error);
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
    if (this.match([TokenType.DO])) {
      return this.doWhileStatement();
    }
    if (this.match([TokenType.FOR])) {
      return this.forStatement();
    }
    if (this.match([TokenType.PRINT])) {
      return this.printStatement();
    }
    if (this.match([TokenType.ASSERT])) {
      return this.assertStatement();
    }
    if (this.match([TokenType.RETURN])) {
      return this.returnStatement();
    }
    if (this.match([TokenType.LEFT_BRACE])) {
      return new BlockStmt(this.block());
    }

    return this.expressionStatement();
  }

  private returnStatement(): Stmt {
    let keyword: Token = this.previous();
    let value: Expr = Nil;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return new ReturnStmt(keyword, value);
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

  private doWhileStatement(): Stmt {
    let body: Stmt = this.statement();
    this.consume(TokenType.WHILE, "Expect 'while' after 'do'.");
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    let condition: Expr = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
    this.consume(TokenType.SEMICOLON, "Expect ';' after condition.");

    return new BlockStmt([body, new WhileStmt(condition, body)]);
  }

  private forStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");

    let initializer: Stmt;
    if (this.match([TokenType.SEMICOLON])) {
      initializer = Nil;
    } else if (this.match([TokenType.VAR])) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition: Expr = Nil;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

    let increment: Expr = Nil;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.");

    let body: Stmt = this.statement();

    // Body is an array of statements that terminates with the increment expression
    if (increment != Nil) {
      body = new BlockStmt([body, new ExpressionStmt(increment)]);
    }

    if (condition == Nil) {
      condition = new LiteralExpr(true);
    }
    body = new WhileStmt(condition, body);

    if (initializer != Nil) {
      body = new BlockStmt([initializer, body]);
    }

    return body;
  }

  private printStatement(): Stmt {
    let value: Expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new PrintStmt(value);
  }

  private assertStatement(): Stmt {
    let assertTok = this.previous();
    let value: Expr = this.expression();
    this.consume(TokenType.COMMA, "Expect ',' after value.");
    let checkValue: Expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new AssertStmt(assertTok, value, checkValue);
  }

  private expressionStatement(): Stmt {
    let expr: Expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new ExpressionStmt(expr);
  }

  private function(kind: string): FunctionStmt {
    let name: Token = this.consume(
      TokenType.IDENTIFIER,
      `Expect ${kind} name.`
    );
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${kind} name.`);
    let parameters: Token[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Cannot have more than 255 parameters.");
        }

        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameter name.")
        );
      } while (this.match([TokenType.COMMA]));
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
    this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);
    let body: Stmt[] = this.block();
    return new FunctionStmt(name, parameters, body);
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
    } else if (
      this.match([
        TokenType.PLUS_EQUAL,
        TokenType.MINUS_EQUAL,
        TokenType.SLASH_EQUAL,
        TokenType.STAR_EQUAL,
      ])
    ) {
      let equals: Token = this.previous();
      let value: Expr = this.assignment();
      switch (equals.type) {
        case TokenType.PLUS_EQUAL:
          equals = new Token(TokenType.PLUS, "+", null, equals.line);
          break;
        case TokenType.MINUS_EQUAL:
          equals = new Token(TokenType.MINUS, "-", null, equals.line);
          break;
        case TokenType.SLASH_EQUAL:
          equals = new Token(TokenType.SLASH, "/", null, equals.line);
          break;
        case TokenType.STAR_EQUAL:
          equals = new Token(TokenType.STAR, "*", null, equals.line);
          break;
        default:
          throw new ImpossibleError("Unreachable");
      }

      if (expr instanceof VariableExpr) {
        let name: Token = expr.name;
        return new AssignExpr(
          name,
          new BinaryExpr(new VariableExpr(name), equals, value)
        );
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

    return this.arrayAccess();
  }

  private call(): Expr {
    let expr: Expr = this.primary();

    while (true) {
      if (this.match([TokenType.LEFT_PAREN])) {
        expr = this.finishCall(expr);
      } else {
        break;
      }
    }

    return expr;
  }

  /* TODO array access could have another array access on the left side of the expression
    This case is currently unsupported
  */
  private arrayAccess(): Expr {
    let expr: Expr = this.expression();
    if (this.match([TokenType.LEFT_SQUARE])) {
      let index = this.expression();
      this.consume(TokenType.RIGHT_SQUARE, "Expected ']' after index.");
      expr = new ArrayAccessExpr(expr, index);
    }

    return expr;
  }

  private finishCall(callee: Expr): Expr {
    let args: Expr[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Cannot have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match([TokenType.COMMA]));
    }

    let paren: Token = this.consume(
      TokenType.RIGHT_PAREN,
      "Expect ')' after arguments."
    );

    return new CallExpr(callee, paren, args);
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
      let name: Token = this.previous();
      // if (this.match([TokenType.LEFT_SQUARE])) {
      //   let index: Expr = this.expression();
      //   this.consume(TokenType.RIGHT_SQUARE, "Expected ']' after index.")
      //   return new ArrayAccessExpr(name, index)
      // }
      return new VariableExpr(name);
    }

    if (this.match([TokenType.LEFT_SQUARE])) {
      let expressions: Expr[] = [];
      if (!this.match([TokenType.RIGHT_SQUARE])) {
        //check if immediatly close
        do {
          expressions.push(this.expression());
        } while (this.match([TokenType.COMMA]));
        this.consume(TokenType.RIGHT_SQUARE, "Need ']' to close arrays");
      }
      return new ArrayExpr(expressions);
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

    throw new ParserError(this.peek(), message);
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
    let parserError: ParserError = new ParserError(token, message);
    Lox.parserError(parserError);
    return parserError;
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
