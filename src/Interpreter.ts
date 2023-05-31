import { Environment } from "./Environment";
import { EnvironmentError, ImpossibleError } from "./Errors";
import {
  ArrayAccessExpr,
  ArrayExpr,
  AssignArrayExpr,
  AssignExpr,
  BinaryExpr,
  CallExpr,
  Expr,
  GetExpr,
  GroupingExpr,
  LiteralExpr,
  LogicalExpr,
  SetExpr,
  ThisExpr,
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
  ClassStmt,
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
import { LoxClass } from "./LoxClass";
import { LoxInstance } from "./LoxInstance";
import { prettyPrint } from "./Utility";
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

  public static visitSetExpr(expr: SetExpr): Object {
    let object: Object = Interpreter.evaluate(expr.object);

    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields.");
    }

    let value: Object = Interpreter.evaluate(expr.value);
    (object as LoxInstance).set(expr.name, value);
    return value;
  }

  public static visitThisExpr(expr: ThisExpr): Object {
    return Interpreter.lookUpVariable(expr.keyword, expr);
  }

  public static visitUnaryExpr(expr: UnaryExpr): Object {
    let right: Object = Interpreter.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.MINUS:
        Interpreter.checkNumberOperand(expr.operator, right);
        return -(right as number);
      case TokenType.BANG:
        return !Interpreter.isTruthly(right);
      case TokenType.LENGTH:
        Interpreter.checkLengthableOperand(expr.operator, right);
        return (right as Array<Object>).length;
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

  private static visitGetExpr(expr: GetExpr): Object {
    let object: Object = Interpreter.evaluate(expr.object);
    if (object instanceof LoxInstance) {
      return (object as LoxInstance).get(expr.name);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  private static visitArrayExpr(expr: ArrayExpr): Object[] {
    let values: Object[] = [];
    for (const e of expr.values) {
      values.push(this.evaluate(e));
    }
    return values;
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
    } else if (expr instanceof ArrayAccessExpr) {
      return Interpreter.visitArrayAccessExpr(expr);
    } else if (expr instanceof AssignExpr) {
      return Interpreter.visitAssignExpr(expr);
    } else if (expr instanceof AssignArrayExpr) {
      return Interpreter.visitAssignArrayExpr(expr);
    } else if (expr instanceof CallExpr) {
      return Interpreter.visitCallExpr(expr);
    } else if (expr instanceof ArrayExpr) {
      return Interpreter.visitArrayExpr(expr);
    } else if (expr instanceof GetExpr) {
      return Interpreter.visitGetExpr(expr);
    } else if (expr instanceof SetExpr) {
      return Interpreter.visitSetExpr(expr);
    } else if (expr instanceof ThisExpr) {
      return Interpreter.visitThisExpr(expr);
    } else throw new ImpossibleError("Unreachable code.");
  }

  public static execute(stmt: Stmt): void {
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
    } else if (stmt instanceof ClassStmt) {
      Interpreter.visitClassStmt(stmt);
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

  public static visitClassStmt(stmt: ClassStmt): void {
    Interpreter.environment.define(stmt.name.lexeme, Nil);
    let methods: Map<string, LoxFunction> = new Map();

    for (const method of stmt.methods) {
      let funktion: LoxFunction = new LoxFunction(
        method,
        Interpreter.environment,
        method.name.lexeme === "init"
      );
      methods.set(method.name.lexeme, funktion);
    }

    let klass: LoxClass = new LoxClass(stmt.name.lexeme, methods);
    Interpreter.environment.assign(stmt.name, klass);
  }

  public static visitExpressionStmt(stmt: ExpressionStmt): void {
    let value: Object = Interpreter.evaluate(stmt.expression);
    return;
  }

  public static visitFunctionStmt(stmt: FunctionStmt): void {
    let func: LoxFunction = new LoxFunction(
      stmt,
      Interpreter.environment,
      false
    );
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
    if (
      value instanceof LoxFunction ||
      value instanceof LoxClass ||
      value instanceof LoxCallable ||
      value instanceof LoxInstance
    )
      console.log(value.toString());
    else console.log(value);
    return;
  }

  public static visitAssertStmt(stmt: AssertStmt): void {
    let value: Object = Interpreter.evaluate(stmt.expression);
    let check: Object = Interpreter.evaluate(stmt.check);
    let assertFailed: boolean = false;
    if (Array.isArray(value) && Array.isArray(check)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] != check[i]) assertFailed = true;
      }
    } else if (value != check) {
      assertFailed = true;
    }

    if (assertFailed)
      throw new RuntimeError(
        stmt.name,
        `Assert failed: expected ${check} but got ${value}.`
      );
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

  public static visitAssignArrayExpr(expr: AssignArrayExpr): Object {
    let value: Object = Interpreter.evaluate(expr.value);
    let distance: number | undefined = Interpreter.locals.get(expr);
    let accesses: Expr = expr.arrayToAccess;
    if (accesses instanceof ArrayAccessExpr) {
      let arrayV = Interpreter.evaluate(accesses.arr);
      let indexV = Interpreter.evaluate(accesses.index);
      if (!Array.isArray(arrayV))
        throw new RuntimeError(expr.assigment, `is not an array.`);
      if (typeof indexV !== "number")
        throw new RuntimeError(
          expr.assigment,
          `Index of array must be a number.`
        );
      if (indexV < 0 || indexV > arrayV.length)
        throw new RuntimeError(expr.assigment, `Index out of bound.`);
      arrayV[indexV as number] = value;
      return arrayV;
    } else {
      throw new RuntimeError(expr.assigment, `Not an array.`);
    }
  }

  //TODO convert to RuntimeArray
  public static visitArrayAccessExpr(expr: ArrayAccessExpr): Object {
    let arrayV: Object = Interpreter.evaluate(expr.arr);
    let indexV: Object = Interpreter.evaluate(expr.index);
    if (!Array.isArray(arrayV))
      throw new RuntimeError(expr.token, `is not an array.`);
    if (typeof indexV !== "number")
      throw new RuntimeError(expr.token, `Index of array must be a number.`);
    if (indexV < 0 || indexV >= arrayV.length)
      throw new RuntimeError(expr.token, `Index out of bound.`);
    return arrayV[indexV as number];
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

  private static checkLengthableOperand(
    operator: Token,
    operand: Object
  ): void {
    if (typeof operand === "string" || Array.isArray(operand)) {
      return;
    }
    throw new RuntimeError(
      operator,
      `Operand must be a string or an array. ${operator}`
    );
  }

  private static checkArrayOperand(operator: Token, operand: Object): void {
    if (Array.isArray(operand)) {
      return;
    }
    throw new RuntimeError(operator, `Operand must be an array. ${operator}`);
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
