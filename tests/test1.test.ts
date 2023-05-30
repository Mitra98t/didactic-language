import { describe, expect, test } from "@jest/globals";
import { Lox } from "../src/Lox";

describe("sum of 1 and 2", () => {
  function program1() {
    let source: string = `
var a = 1;
var b = 2;
print a+b;
`;
    Lox.runForTest(source);
  }

  test("Check print", () => {
    const spy = jest.spyOn(console, "log");
    program1();
    expect(spy).toHaveBeenCalledWith(3);
  });
});

describe("Boubble sort", () => {
  function program2() {
    let source: string = `
var a = [3,5,2,1,7,6,8,9,5,4];
var n = 10;
fun bubbleSort(arr, n) {
  var a = arr;
  for(var i = 0; i < n; i+=1){
    for(var j = 0; j < n-1; j+=1){
      if(a[j] > a[j+1]){
        var temp = a[j];
        a[j] = a[j+1];
        a[j+1] = temp;
      }
    }
  }
  return a;
}

print bubbleSort(a, n);
`;
    Lox.runForTest(source);
  }

  test("Check print", () => {
    const spy = jest.spyOn(console, "log");
    program2();
    expect(spy).toHaveBeenCalledWith([1, 2, 3, 4, 5, 5, 6, 7, 8, 9]);
  });
});
