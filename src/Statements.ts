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
