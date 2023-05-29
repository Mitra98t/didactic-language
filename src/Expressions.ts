import { Token } from "./Token";

export abstract class Expr {}

export class BinaryExpr extends Expr {
  left: Expr;
  operator: Token;
  right: Expr;
  constructor(left: Expr, operator: Token, right: Expr) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }
}

export class UnaryExpr extends Expr {
  operator: Token;
  right: Expr;
  constructor(operator: Token, right: Expr) {
    super();
    this.operator = operator;
    this.right = right;
  }
}

export class LiteralExpr extends Expr {
  value: Object;
  constructor(value: Object) {
    super();
    this.value = value;
  }
}

export class GroupingExpr extends Expr {
  expression: Expr;
  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }
}

export class VariableExpr extends Expr {
  name: Token;
  constructor(name: Token) {
    super();
    this.name = name;
  }
}

export class AssignExpr extends Expr {
  name: Token;
  value: Expr;
  constructor(name: Token, value: Expr) {
    super();
    this.name = name;
    this.value = value;
  }
}

export class LogicalExpr extends Expr {
  left: Expr;
  operator: Token;
  right: Expr;
  constructor(left: Expr, operator: Token, right: Expr) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }
}

export class CallExpr extends Expr {
  callee: Expr;
  paren: Token;
  args: Expr[];
  constructor(callee: Expr, paren: Token, args: Expr[]) {
    super();
    this.callee = callee;
    this.paren = paren;
    this.args = args;
  }
}
