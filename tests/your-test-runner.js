import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') && file !== 'your-test-runner.js');

let passed = 0;

for (const file of testFiles) {
  console.log(`Running ${file}`);
  await import(pathToFileURL(path.join(__dirname, file)));
  passed++;
}

console.log(`${passed} test file(s) run.`);

