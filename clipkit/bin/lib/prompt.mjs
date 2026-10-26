// Minimal terminal prompts (numbered choices, yes/no, text), no dependencies. Lines are queued, so
// answers typed ahead or pasted all at once aren't lost, and a closed input takes the defaults.
import readline from 'node:readline';

let rl;
let closed = false;
const queue = [];
const waiting = [];

const io = () => {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('line', (l) => (waiting.length ? waiting.shift()(l) : queue.push(l)));
    rl.on('close', () => {
      closed = true;
      while (waiting.length) waiting.shift()(null);
    });
    rl.on('SIGINT', () => {
      process.stdout.write('\n');
      process.exit(130);
    });
  }
  return rl;
};

/** One line of input; null once the input has closed. */
const line = (prompt) => {
  io().setPrompt(prompt);
  rl.prompt();
  if (queue.length) {
    const l = queue.shift();
    process.stdout.write(`${l}\n`);
    return Promise.resolve(l);
  }
  return closed ? Promise.resolve(null) : new Promise((resolve) => waiting.push(resolve));
};

export const interactive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI);

export const closePrompts = () => {
  rl?.close();
  rl = undefined;
  closed = false;
};

export const ask = async (question, fallback = '') => ((await line(`${question}${fallback ? ` [${fallback}]` : ''}: `)) ?? '').trim() || fallback;

export const confirm = async (question, fallback = true) => {
  const a = ((await line(`${question} ${fallback ? '[Y/n]' : '[y/N]'}: `)) ?? '').trim().toLowerCase();
  return a ? a.startsWith('y') : fallback;
};

/** Numbered list; returns the chosen index. `options` are strings or { label, hint }. */
export const choose = async (question, options, fallback = 0) => {
  console.log(`\n${question}`);
  options.forEach((o, i) => {
    const { label, hint } = typeof o === 'string' ? { label: o } : o;
    console.log(`  ${String(i + 1).padStart(2)}) ${label}${hint ? `\n      ${hint}` : ''}`);
  });
  for (;;) {
    const a = await line(`Choose 1-${options.length} [${fallback + 1}]: `);
    if (a === null || !a.trim()) return fallback;
    const n = Number(a.trim());
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return n - 1;
  }
};
