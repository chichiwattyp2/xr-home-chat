const fs = require('fs');
const path = require('path');

const testsDir = __dirname;
const testFiles = fs.readdirSync(testsDir)
  .filter(file => file.endsWith('.js') && file !== 'your-test-runner.js');

let passed = 0;

for (const file of testFiles) {
  console.log(`Running ${file}`);
  require(path.join(testsDir, file));
  passed++;
}

console.log(`${passed} test file(s) run.`);
