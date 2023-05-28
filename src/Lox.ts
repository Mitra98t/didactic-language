import * as fs from "fs";
import { Scanner } from "./Scanner";
import { Token } from "./Token";
import { TokenType } from "./TokenType";
import { Expr } from "./Expressions";
import { Parser } from "./Parser";
import { prettyPrint } from "./Utility";
import { Interpreter, RuntimeError } from "./Interpreter";
import { Stmt } from "./Statements";

export class Nil extends Object {}

export class Lox {
  private static hadError: boolean = false;
  private static hadRuntimeError: boolean = false;
  private static interpreter: Interpreter = new Interpreter();

  static main(args: string[]): void {
    if (args.length > 1) {
      console.log("Usage: tslox [script]");
      process.exit(64);
    } else if (args.length == 1) {
      Lox.runFile(args[0]);
    } else {
      Lox.runPrompt();
    }
  }

  private static runFile(path: string): void {
    let source = fs.readFileSync(path, "utf-8");
    Lox.run(source);
    if (Lox.hadError) {
      process.exit(65);
    }
    if (Lox.hadRuntimeError) {
      process.exit(70);
    }
  }

  private static runPrompt(): void {
    let input = process.stdin;
    input.setEncoding("utf-8");
    let exit = false;
    while (!exit) {
      process.stdout.write("> ");
      input.on("data", function (data) {
        if (Buffer.compare(data, Buffer.from("exit", "utf-8")) == 0) {
          exit = true;
        }
        Lox.run(data.toString());
        Lox.hadError = false;
      });
    }
  }

  private static run(source: string): void {
    let scanner: Scanner = new Scanner(source);
    let tokens: Token[] = scanner.scanTokens();

    let parser = new Parser(tokens);
    let statements: Stmt[] = parser.parse();
    if (Lox.hadError) return;

    this.interpreter.interpret(statements);
  }

  public static error(token: Token, message: string): void {
    if (token.type == TokenType.EOF) {
      this.report(token.line, " at end", message);
    } else {
      this.report(token.line, " at '" + token.lexeme + "'", message);
    }
  }

  public static errorLine(line: number, message: string): void {
    this.report(line, "", message);
  }

  public static runtimeError(error: RuntimeError): void {
    console.log(error.message + "\n[line " + error.token.line + "]");
    this.hadRuntimeError = true;
  }

  private static report(line: number, where: string, message: string): void {
    console.log("[line " + line + "] Error" + where + ": " + message);
    this.hadError = true;
  }
}
