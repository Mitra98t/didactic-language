import {
  BinaryExpr,
  Expr,
  GroupingExpr,
  LiteralExpr,
  UnaryExpr,
} from "./Expressions";

export function prettyPrint(expression: Expr): string {
  return JSON.stringify(JSON.parse(JSON.stringify(expression)), null, 2);
}
