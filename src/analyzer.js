// AST-based analyzer: builds simple symbol table per function and enforces:
// - assignment must target a previously seen VarDecl or parameter
// - assignments to `let` are errors

export function analyze(ast, source) {
  const errors = [];
  if (!ast) return errors;

  function report(msg, node) {
    errors.push({ message: msg, node });
  }

  for (const top of ast.body) {
    if (top.type !== 'FunctionDecl') continue;
    const declared = Object.create(null);

    // parameters: treat as declared let (immutable)
    for (const p of top.params || []) {
      declared[p.name] = { kind: 'let', node: p };
    }

    function walkStmts(stmts) {
      for (const s of stmts) {
        if (!s) continue;
        switch (s.type) {
          case 'VarDecl': {
            const name = s.name;
            const kind = s.kind; // 'let' or 'mut'
            // record declaration (visible after this point)
            declared[name] = { kind, node: s };
            // if initializer is present, we could type-check it later
            break;
          }
          case 'Assign': {
            const name = s.target;
            const info = declared[name];
            if (!info) {
              report(`Assignment to undeclared variable '${name}'`, s);
            } else if (info.kind === 'let') {
              report(`Assignment to immutable 'let' variable '${name}'`, s);
            }
            break;
          }
          case 'If': {
            // analyze then and else bodies in-order; declarations in then/else are visible after they appear
            walkStmts(s.thenBody || []);
            if (s.elseBody) walkStmts(s.elseBody || []);
            break;
          }
          case 'While': {
            walkStmts(s.body || []);
            break;
          }
          case 'Return':
          case 'Print':
          case 'Break':
            // nothing to do
            break;
          default:
            // expressions used as statements (ExpStmt) can be calls etc; we don't need checks here
            break;
        }
      }
    }

    walkStmts(top.body || []);
  }

  return errors;
}

export default { analyze };
