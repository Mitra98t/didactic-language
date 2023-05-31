import { ResolverError } from "./Errors";
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
import { Interpreter } from "./Interpreter";
import { Lox, Nil } from "./Lox";
import { LoxFunction } from "./LoxFunction";
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

export enum FunctionType {
  NONE,
  FUNCTION,
  METHOD,
  INITIALIZER,
}

export enum ClassType {
  NONE,
  CLASS,
}

export class Resolver {
  private interpreter: Interpreter;
  private scopes: Map<string, boolean>[] = [new Map<string, boolean>()];
  private currentFunction: FunctionType = FunctionType.NONE;
  private currentClass: ClassType = ClassType.NONE;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  visitBlockStmt(stmt: BlockStmt): void {
    this.beginScope();
    this.resolveStmts(stmt.statements);
    this.endScope();
  }

  public visitClassStmt(stmt: ClassStmt): void {
    let enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;

    this.declare(stmt.name);
    this.define(stmt.name);

    this.beginScope();
    this.scopes[this.scopes.length - 1].set("this", true);

    for (let method of stmt.methods) {
      let declaration = FunctionType.METHOD;
      if (method.name.lexeme == "init") {
        declaration = FunctionType.INITIALIZER;
      }
      this.resolveFunction(method, declaration);
    }

    this.endScope();
    this.currentClass = enclosingClass;
  }

  visitVarStmt(stmt: VarStmt): void {
    this.declare(stmt.name);
    if (stmt.initializer != Nil) {
      this.resolveExpr(stmt.initializer);
    }

    this.define(stmt.name);
  }

  visitVariableExpr(expr: VariableExpr): void {
    if (
      this.scopes.length > 0 &&
      this.scopes[this.scopes.length - 1].get(expr.name.lexeme) == false
    ) {
      Lox.resolverError(
        new ResolverError(
          expr.name,
          "Cannot read local variable in its own initializer."
        )
      );
    }

    this.resolveLocal(expr, expr.name);
  }

  visitAssignExpr(expr: AssignExpr): void {
    this.resolveExpr(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  visitAssignArrayExpr(expr: AssignArrayExpr): void {
    this.resolveExpr(expr.arrayToAccess);
    this.resolveExpr(expr.value);
  }

  visitFunctionStmt(stmt: FunctionStmt): void {
    this.declare(stmt.name);
    this.define(stmt.name);
    this.resolveFunction(stmt, FunctionType.FUNCTION);
  }

  visitExpressionStmt(stmt: ExpressionStmt): void {
    this.resolveExpr(stmt.expression);
  }

  visitIfStmt(stmt: IfStmt): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.thenBranch);
    if (stmt.elseBranch != Nil) {
      this.resolveStmt(stmt.elseBranch);
    }
  }

  visitPrintStmt(stmt: PrintStmt): void {
    this.resolveExpr(stmt.expression);
  }
  visitAssertStmt(stmt: AssertStmt): void {
    this.resolveExpr(stmt.check);
    this.resolveExpr(stmt.expression);
  }

  visitReturnStmt(stmt: ReturnStmt): void {
    if (this.currentFunction == FunctionType.NONE) {
      Lox.resolverError(
        new ResolverError(stmt.keyword, "Can't return from top-level code. -_-")
      );
    }
    if (stmt.value != Nil) {
      if (this.currentFunction == FunctionType.INITIALIZER) {
        Lox.resolverError(
          new ResolverError(
            stmt.keyword,
            "Can't return a value from an initializer."
          )
        );
      }
      this.resolveExpr(stmt.value);
    }
  }

  visitWhileStmt(stmt: WhileStmt): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.body);
  }

  visitBinaryExpr(expr: BinaryExpr): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  visitCallExpr(expr: CallExpr): void {
    this.resolveExpr(expr.callee);
    for (let argument of expr.args) {
      this.resolveExpr(argument);
    }
  }

  visitGetExpr(expr: GetExpr): void {
    this.resolveExpr(expr.object);
  }

  visitGroupingExpr(expr: GroupingExpr): void {
    this.resolveExpr(expr.expression);
  }

  visitLiteralExpr(expr: LiteralExpr): void {
    //do nothing
  }

  visitLogicalExpr(expr: LogicalExpr): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  visitSetExpr(expr: SetExpr): void {
    this.resolveExpr(expr.value);
    this.resolveExpr(expr.object);
  }

  visitThisExpr(expr: ThisExpr): void {
    if (this.currentClass == ClassType.NONE) {
      Lox.resolverError(
        new ResolverError(expr.keyword, "Cannot use 'this' outside of a class.")
      );
      return;
    }
    this.resolveLocal(expr, expr.keyword);
  }

  visitUnaryExpr(expr: UnaryExpr): void {
    this.resolveExpr(expr.right);
  }

  visitArrayExpr(expr: ArrayExpr): void {
    for (const e of expr.values) this.resolveExpr(e);
  }

  visitArrayAccessExpr(expr: ArrayAccessExpr): void {
    this.resolveExpr(expr.arr);
    this.resolveExpr(expr.index);
  }

  public resolveStmts(statements: Stmt[]): void {
    for (let statement of statements) {
      this.resolveStmt(statement);
    }
  }

  private resolveStmt(statement: Stmt): void {
    if (statement instanceof BlockStmt) {
      this.visitBlockStmt(statement);
    } else if (statement instanceof VarStmt) {
      this.visitVarStmt(statement);
    } else if (statement instanceof FunctionStmt) {
      this.visitFunctionStmt(statement);
    } else if (statement instanceof ExpressionStmt) {
      this.visitExpressionStmt(statement);
    } else if (statement instanceof IfStmt) {
      this.visitIfStmt(statement);
    } else if (statement instanceof PrintStmt) {
      this.visitPrintStmt(statement);
    } else if (statement instanceof AssertStmt) {
      this.visitAssertStmt(statement);
    } else if (statement instanceof ReturnStmt) {
      this.visitReturnStmt(statement);
    } else if (statement instanceof WhileStmt) {
      this.visitWhileStmt(statement);
    } else if (statement instanceof ClassStmt) {
      this.visitClassStmt(statement);
    } else {
      throw new Error("Unknown statement type");
    }
  }

  private resolveExpr(expr: Expr): void {
    if (expr instanceof VariableExpr) {
      this.visitVariableExpr(expr);
    } else if (expr instanceof AssignExpr) {
      this.visitAssignExpr(expr);
    } else if (expr instanceof CallExpr) {
      this.visitCallExpr(expr);
    } else if (expr instanceof AssignArrayExpr) {
      this.visitAssignArrayExpr(expr);
    } else if (expr instanceof BinaryExpr) {
      this.visitBinaryExpr(expr);
    } else if (expr instanceof GroupingExpr) {
      this.visitGroupingExpr(expr);
    } else if (expr instanceof LiteralExpr) {
      this.visitLiteralExpr(expr);
    } else if (expr instanceof LogicalExpr) {
      this.visitLogicalExpr(expr);
    } else if (expr instanceof UnaryExpr) {
      this.visitUnaryExpr(expr);
    } else if (expr instanceof ArrayExpr) {
      this.visitArrayExpr(expr);
    } else if (expr instanceof ArrayAccessExpr) {
      this.visitArrayAccessExpr(expr);
    } else if (expr instanceof GetExpr) {
      this.visitGetExpr(expr);
    } else if (expr instanceof SetExpr) {
      this.visitSetExpr(expr);
    } else if (expr instanceof ThisExpr) {
      this.visitThisExpr(expr);
    } else {
      throw new Error(`Unknown expression type ${JSON.stringify(expr)}`);
    }
  }

  private resolveFunction(stmt: FunctionStmt, type: FunctionType): void {
    let enclosingFunction: FunctionType = this.currentFunction;
    this.currentFunction = type;
    this.beginScope();
    for (let param of stmt.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolveStmts(stmt.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  private beginScope(): void {
    this.scopes.push(new Map<string, boolean>());
  }
  private endScope(): void {
    this.scopes.pop();
  }

  private declare(name: Token) {
    if (this.scopes.length == 0) {
      return;
    }
    let scope = this.scopes[this.scopes.length - 1];
    if (scope.has(name.lexeme)) {
      Lox.resolverError(
        new ResolverError(
          name,
          "Variable with this name already declared in this scope."
        )
      );
    }
    scope.set(name.lexeme, false);
  }
  private define(name: Token) {
    if (this.scopes.length == 0) {
      return;
    }
    let scope = this.scopes[this.scopes.length - 1];
    scope.set(name.lexeme, true);
  }

  private resolveLocal(expr: Expr, name: Token) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        //TODO check if this is correct
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }
}
