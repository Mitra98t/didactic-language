import { RuntimeError } from "./Errors";

export class Return extends Error {
  value: Object;
  constructor(value: Object) {
    super();
    this.value = value;
  }
}
