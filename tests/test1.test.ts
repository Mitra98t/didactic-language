import { describe, expect, test } from "@jest/globals";
import { Lox } from "../src/Lox";

describe("Map Function", () => {
  function program1() {
    let source: string = `
    var arr = [0,1,2,3,4];

    fun map(a, fn){
      var result = [];
      for(var i = 0; i < length a; i+=1){
        result[i] = fn(a[i]);
      }
      return result;
    }
    fun square(x){
      return x * x;
    }
    
    var result = map(arr, square);
    
    assert result, [0,1,4,9,16];
    print "successo";
`;
    Lox.runForTest(source);
  }

  test("Check print", () => {
    const spy = jest.spyOn(console, "log");
    program1();
    expect(spy).toHaveBeenCalledWith("successo");
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
