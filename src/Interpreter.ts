import { Environment } from "./Environment";
import { EnvironmentError, ImpossibleError } from "./Errors";
import {
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
import { LoxCallable } from "./LoxCallable";
import { LoxFunction } from "./LoxFunction";
import { Return } from "./Return";
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
import { RuntimeError } from "./Errors";
export class Interpreter {
  private static globals: Environment = new Environment();
  private static environment: Environment = Interpreter.globals;
  private static locals: Map<Expr, number> = new Map<Expr, number>();
  constructor() {}

  public interpret(statements: Stmt[]): void {
    try {
      for (let i = 0; i < statements.length; i++) {
        Interpreter.execute(statements[i]);
      }
    } catch (error) {
      if (error instanceof RuntimeError) {
        Lox.runtimeError(error);
      } else if (error instanceof EnvironmentError) {
        Lox.environmentError(error);
      }
    }
  }

  public static visitLiteralExpr(expr: LiteralExpr): Object {
    return expr.value;
  }

  public static visitLogicalExpr(expr: LogicalExpr): Object {
    let left: Object = Interpreter.evaluate(expr.left);

    if (expr.operator.type == TokenType.OR) {
      if (Interpreter.isTruthly(left)) return left;
    } else {
      if (!Interpreter.isTruthly(left)) return left;
    }

    return Interpreter.evaluate(expr.right);
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
    throw new ImpossibleError("Unreachable code.");
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
    throw new ImpossibleError("Unreachable code.");
  }

  private static visitCallExpr(expr: CallExpr): Object {
    let callee: Object = Interpreter.evaluate(expr.callee);

    let args: Object[] = [];
    for (let i = 0; i < expr.args.length; i++) {
      args.push(Interpreter.evaluate(expr.args[i]));
    }

    if (!(callee instanceof LoxCallable)) {
      throw new RuntimeError(
        expr.paren,
        "Can only call functions and classes."
      );
    }

    let func: LoxCallable = callee as LoxCallable;
    if (args.length != func.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${func.arity()} arguments but got ${args.length}.`
      );
    }
    return func.call(new Interpreter(), args);
  }

  private static evaluate(expr: Expr): Object {
    if (expr instanceof LogicalExpr) {
      return Interpreter.visitLogicalExpr(expr);
    } else if (expr instanceof LiteralExpr) {
      return Interpreter.visitLiteralExpr(expr);
    } else if (expr instanceof UnaryExpr) {
      return Interpreter.visitUnaryExpr(expr);
    } else if (expr instanceof BinaryExpr) {
      return Interpreter.visitBinaryExpr(expr);
    } else if (expr instanceof GroupingExpr) {
      return Interpreter.visitGroupingExpr(expr);
    } else if (expr instanceof VariableExpr) {
      return Interpreter.visitVariableExpr(expr);
    } else if (expr instanceof AssignExpr) {
      return Interpreter.visitAssignExpr(expr);
    } else if (expr instanceof CallExpr) {
      return Interpreter.visitCallExpr(expr);
    } else throw new ImpossibleError("Unreachable code.");
  }

  public static execute(stmt: Stmt): void {
    // console.log(stmt)
    if (stmt instanceof ExpressionStmt) {
      Interpreter.visitExpressionStmt(stmt);
    } else if (stmt instanceof IfStmt) {
      Interpreter.visitIfStmt(stmt);
    } else if (stmt instanceof WhileStmt) {
      Interpreter.visitWhileStmt(stmt);
    } else if (stmt instanceof PrintStmt) {
      Interpreter.visitPrintStmt(stmt);
    } else if (stmt instanceof AssertStmt) {
      Interpreter.visitAssertStmt(stmt);
    } else if (stmt instanceof VarStmt) {
      Interpreter.visitVarStmt(stmt);
    } else if (stmt instanceof BlockStmt) {
      Interpreter.visitBlockStmt(stmt);
    } else if (stmt instanceof FunctionStmt) {
      Interpreter.visitFunctionStmt(stmt);
    } else if (stmt instanceof ReturnStmt) {
      Interpreter.visitReturnStmt(stmt);
    } else {
      throw new ImpossibleError("Unreachable code.");
    }
  }

  public static executeBlock(statements: Stmt[], environment: Environment) {
    let previous: Environment = Interpreter.environment;
    try {
      Interpreter.environment = environment;
      for (let i = 0; i < statements.length; i++) {
        Interpreter.execute(statements[i]);
      }
    } finally {
      Interpreter.environment = previous;
    }
  }

  public static visitBlockStmt(stmt: BlockStmt): void {
    Interpreter.executeBlock(
      stmt.statements,
      new Environment(Interpreter.environment)
    );
  }

  public static visitExpressionStmt(stmt: ExpressionStmt): void {
    let value: Object = Interpreter.evaluate(stmt.expression);
    return;
  }

  public static visitFunctionStmt(stmt: FunctionStmt): void {
    let func: LoxFunction = new LoxFunction(stmt, Interpreter.environment);
    Interpreter.environment.define(stmt.name.lexeme, func);
  }

  public static visitIfStmt(stmt: IfStmt): void {
    if (Interpreter.isTruthly(Interpreter.evaluate(stmt.condition))) {
      Interpreter.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== Nil) {
      Interpreter.execute(stmt.elseBranch);
    }
  }

  public static visitPrintStmt(stmt: PrintStmt): void {
    let value: Object = Interpreter.evaluate(stmt.expression);
    if (value instanceof LoxFunction) console.log(value.toString());
    else console.log(value);
    return;
  }

  public static visitAssertStmt(stmt: AssertStmt): void {
    let value: Object = Interpreter.evaluate(stmt.expression);
    let check: Object = Interpreter.evaluate(stmt.check);
    if (value != check) {
      throw new RuntimeError(
        stmt.name,
        `Assert failed: expected ${check} but got ${value}.`
      );
    }
  }

  public static visitReturnStmt(stmt: ReturnStmt): void {
    let value: Object = Nil;
    if (stmt.value !== Nil) {
      value = Interpreter.evaluate(stmt.value);
    }
    throw new Return(value);
  }

  public static visitVarStmt(stmt: VarStmt): void {
    let value: Object = Nil;
    if (stmt.initializer != Nil) {
      value = Interpreter.evaluate(stmt.initializer);
    }
    Interpreter.environment.define(stmt.name.lexeme, value);
  }

  public static visitWhileStmt(stmt: WhileStmt): void {
    while (Interpreter.isTruthly(Interpreter.evaluate(stmt.condition))) {
      Interpreter.execute(stmt.body);
    }
  }

  public static visitAssignExpr(expr: AssignExpr): Object {
    let value: Object = Interpreter.evaluate(expr.value);
    let distance: number | undefined = Interpreter.locals.get(expr);
    if (distance != undefined) {
      Interpreter.environment.assignAt(distance, expr.name, value);
    } else {
      Interpreter.globals.assign(expr.name, value);
    }
    Interpreter.environment.assign(expr.name, value);
    return value;
  }

  public static visitVariableExpr(expr: VariableExpr): Object {
    return Interpreter.lookUpVariable(expr.name, expr);
  }

  private static isTruthly(object: Object): boolean {
    if (object === Nil) {
      return false;
    }

    if (typeof object === "boolean") {
      return object as boolean;
    }

    if (typeof object === "number") {
      return (object as number) !== 0;
    }

    if (typeof object === "string") {
      return (object as string).length !== 0;
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
      throw new ImpossibleError("Unreachable code. in checkNumberOperand");
    }
  }

  private static lookUpVariable(name: Token, expr: Expr): Object {
    let distance: number | undefined = Interpreter.locals.get(expr);
    if (distance !== undefined) {
      return Interpreter.environment.getAt(distance, name.lexeme);
    } else {
      return Interpreter.globals.get(name);
    }
  }

  resolve(expr: Expr, depth: number): void {
    Interpreter.locals.set(expr, depth);
  }
}
