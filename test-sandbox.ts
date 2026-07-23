import { executeCode } from './src/services/sandbox';

async function runTests() {
  console.log('=== STARTING SANDBOX CODE RUNNER INTEGRITY TESTS ===\n');

  // Test 1: JavaScript Execution
  console.log('Test 1: Running JavaScript...');
  const jsCode = `
    const list = [1, 2, 3, 4, 5];
    const sum = list.reduce((a, b) => a + b, 0);
    console.log("Sum is:", sum);
  `;
  const jsResult = await executeCode(jsCode, 'javascript');
  console.log('Result:', JSON.stringify(jsResult, null, 2));
  console.log('--------------------------------------------------\n');

  // Test 2: Python Execution
  console.log('Test 2: Running Python...');
  const pyCode = `
import math
print("Factorial of 5 is:", math.factorial(5))
  `;
  const pyResult = await executeCode(pyCode, 'python');
  console.log('Result:', JSON.stringify(pyResult, null, 2));
  console.log('--------------------------------------------------\n');

  // Test 3: Infinite Loop Timeout Execution
  console.log('Test 3: Running Python Infinite Loop (Should Timeout in 4s)...');
  const loopCode = `
print("Entering infinite loop...")
while True:
    pass
print("This should never print!")
  `;
  // Set timeout to 4000ms for testing
  const loopResult = await executeCode(loopCode, 'python', 4000);
  console.log('Result:', JSON.stringify(loopResult, null, 2));
  console.log('--------------------------------------------------\n');

  console.log('=== SANDBOX TESTING COMPLETE ===');
}

runTests().catch(err => {
  console.error('Testing failed:', err);
});
