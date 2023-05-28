import { Environment } from "./Environment";
import {
  BinaryExpr,
  Expr,
  GroupingExpr,
  LiteralExpr,
  UnaryExpr,
  VariableExpr,
} from "./Expressions";
import { Lox, Nil } from "./Lox";
import { ExpressionStmt, PrintStmt, Stmt, VarStmt } from "./Statements";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class RuntimeError extends Error {
  token: Token;

  constructor(token: Token, msg: string) {
    super(msg);
    this.token = token;
  }
}

export class Interpreter {
  private static environment: Environment = new Environment();
  constructor() {}

  public interpret(statements: Stmt[]): void {
    try {
      for (let i = 0; i < statements.length; i++) {
        Interpreter.execute(statements[i]);
      }
    } catch (error) {
      if (error instanceof RuntimeError) {
        Lox.runtimeError(error);
      }
    }
  }

  public static visitLiteralExpr(expr: LiteralExpr): Object {
    return expr.value;
  }

  public static visitUnaryExpr(expr: UnaryExpr): Object {
    let right: Object = Interpreter.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.MINUS:
        Interpreter.checkNumberOperand(expr.operator, right);
        return -(right as number);
      case TokenType.BANG:
        return !Interpreter.isTruthly(right);
    }

    // Unreachable.
    throw new Error("Unreachable code.");
  }

  public static visitGroupingExpr(expr: GroupingExpr): Object {
    return Interpreter.evaluate(expr.expression);
  }

  public static visitBinaryExpr(expr: BinaryExpr): Object {
    let left: Object = Interpreter.evaluate(expr.left);
    let right: Object = Interpreter.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.GREATER:
        Interpreter.checkNumberOperands(expr.operator, [left, right]);
        return (left as number) > (right as number);
      case TokenType.GREATER_EQUAL:
        Interpreter.checkNumberOperands(expr.operator, [left, right]);
        return (left as number) >= (right as number);
      case TokenType.LESS:
        Interpreter.checkNumberOperands(expr.operator, [left, right]);
        return (left as number) < (right as number);
      case TokenType.LESS_EQUAL:
        Interpreter.checkNumberOperands(expr.operator, [left, right]);
        return (left as number) <= (right as number);
      case TokenType.BANG_EQUAL:
        return !Interpreter.isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return Interpreter.isEqual(left, right);
      case TokenType.MINUS:
        Interpreter.checkNumberOperands(expr.operator, [left, right]);
        return (left as number) - (right as number);
      case TokenType.PLUS:
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }
        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }
        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings."
        );
      case TokenType.SLASH:
        Interpreter.checkNumberOperands(expr.operator, [left, right]);
        return (left as number) / (right as number);
      case TokenType.STAR:
        Interpreter.checkNumberOperands(expr.operator, [left, right]);
        return (left as number) * (right as number);
    }
    throw new Error("Unreachable code.");
  }

  private static evaluate(expr: Expr): Object {
    if (expr instanceof LiteralExpr) {
      return Interpreter.visitLiteralExpr(expr);
    } else if (expr instanceof UnaryExpr) {
      return Interpreter.visitUnaryExpr(expr);
    } else if (expr instanceof GroupingExpr) {
      return Interpreter.visitGroupingExpr(expr);
    } else if (expr instanceof BinaryExpr) {
      return Interpreter.visitBinaryExpr(expr);
    } else if (expr instanceof VariableExpr) {
      return Interpreter.visitVariableExpr(expr);
    } else throw new Error("Unreachable code.");
  }

  public static execute(stmt: Stmt): void {
    if (stmt instanceof ExpressionStmt) {
      Interpreter.visitExpressionStmt(stmt);
    } else if (stmt instanceof PrintStmt) {
      Interpreter.visitPrintStmt(stmt);
    } else if (stmt instanceof VarStmt) {
      Interpreter.visitVarStmt(stmt);
    } else {
      throw new Error("Unreachable code.");
    }
  }

  public static visitExpressionStmt(stmt: ExpressionStmt): void {
    let value: Object = Interpreter.evaluate(stmt.expression);
    return;
  }

  public static visitPrintStmt(stmt: PrintStmt): void {
    let value: Object = Interpreter.evaluate(stmt.expression);
    console.log(value);
    return;
  }

  public static visitVarStmt(stmt: VarStmt): void {
    let value: Object = Nil;
    if (stmt.initializer !== null) {
      value = Interpreter.evaluate(stmt.initializer);
    }
    Interpreter.environment.define(stmt.name.lexeme, value);
  }

  public static visitVariableExpr(expr: VariableExpr): Object {
    return Interpreter.environment.get(expr.name);
  }

  private static isTruthly(object: Object): boolean {
    if (object === Nil) {
      return false;
    }

    if (typeof object === "boolean") {
      return object as boolean;
    }

    return true;
  }

  private static isEqual(a: Object, b: Object): boolean {
    if (a === Nil && b === Nil) {
      return true;
    }
    if (a === Nil) {
      return false;
    }

    return a === b;
  }

  private static checkNumberOperand(operator: Token, operand: Object): void {
    if (typeof operand === "number") {
      return;
    }
    throw new RuntimeError(operator, `Operand must be a number. ${operator}`);
  }

  private static checkNumberOperands(operator: Token, operand: Object[]): void {
    if (operand.length === 2) {
      if (typeof operand[0] === "number" && typeof operand[1] === "number") {
        return;
      }
      throw new RuntimeError(operator, `Operands must be numbers. ${operator}`);
    } else {
      throw new Error("Unreachable code. in checkNumberOperand");
    }
  }
}
