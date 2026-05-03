import fs from 'fs';
import { buildAST } from './astBuilder.js';
import { analyze } from './analyzer.js';
import { generateJS } from './generator.js';

export function compile(source) {
  const { ast, errors: parseErrors } = buildAST(source);
  if (parseErrors.length) return { code: null, diagnostics: parseErrors.map(m => ({ severity: 'error', message: m })) };

  // run AST-based analyzer
  const semErrs = analyze(ast, source);
  if (semErrs.length) return { code: null, diagnostics: semErrs.map(e => ({ severity: 'error', message: e.message })) };

  // codegen
  const code = generateJS(ast);
  return { code, diagnostics: [] };
}

export default { compile };
