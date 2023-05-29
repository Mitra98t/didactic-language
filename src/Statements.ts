import { Expr } from "./Expressions";
import { Token } from "./Token";

export abstract class Stmt {}

export class PrintStmt extends Stmt {
  expression: Expr;
  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }
}

export class AssertStmt extends Stmt {
  name: Token;
  expression: Expr;
  check: Expr;
  constructor(name: Token, expression: Expr, check: Expr) {
    super();
    this.name = name;
    this.expression = expression;
    this.check = check;
  }
}

export class ExpressionStmt extends Stmt {
  expression: Expr;
  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }
}

export class VarStmt extends Stmt {
  name: Token;
  initializer: Expr;
  constructor(name: Token, initializer: Expr) {
    super();
    this.name = name;
    this.initializer = initializer;
  }
}

export class BlockStmt extends Stmt {
  statements: Stmt[];
  constructor(statements: Stmt[]) {
    super();
    this.statements = statements;
  }
}

export class IfStmt extends Stmt {
  condition: Expr;
  thenBranch: Stmt;
  elseBranch: Stmt;
  constructor(condition: Expr, thenBranch: Stmt, elseBranch: Stmt) {
    super();
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }
}

export class WhileStmt extends Stmt {
  condition: Expr;
  body: Stmt;
  constructor(condition: Expr, body: Stmt) {
    super();
    this.condition = condition;
    this.body = body;
  }
}

export class FunctionStmt extends Stmt {
  name: Token;
  params: Token[];
  body: Stmt[];
  constructor(name: Token, params: Token[], body: Stmt[]) {
    super();
    this.name = name;
    this.params = params;
    this.body = body;
  }
}

export class ReturnStmt extends Stmt {
  keyword: Token;
  value: Expr;
  constructor(keyword: Token, value: Expr) {
    super();
    this.keyword = keyword;
    this.value = value;
  }
}
