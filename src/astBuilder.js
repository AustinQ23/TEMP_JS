import fs from 'fs';
import * as ohm from 'ohm-js';

const grammarText = fs.readFileSync(new URL('../src/TEMP_JS.ohm', import.meta.url), 'utf8');
const G = ohm.grammar(grammarText);

function flatten(list) {
  return list.children ? list.children.map(c => c.ast()) : [];
}

const semantics = G.createSemantics();

// Helper constructors
const n = (type, props) => ({ type, ...props });

semantics.addOperation('ast', {
  Program(decls) {
    return n('Program', { body: decls.children.map(d => d.ast()) });
  },

  Decl(d) { return d.ast(); },

  FuncDecl(_fn, name, _open, params, _close, ret, _openb, stmts, _closeb) {
    const pname = name.ast().name;
    const paramsArr = params.children.length === 0 ? [] : params.children.map(c => c.ast());
    const body = stmts.children.map(s => s.ast());
    const returnType = ret.children.length ? ret.children[0].ast() : null;
    return n('FunctionDecl', { name: pname, params: paramsArr, returnType, body });
  },

  Param(id, _colon, type) {
    return n('Param', { name: id.ast().name, annType: type.ast() });
  },

  type(_t) { return this.sourceString; },

  Statement(s) { return s.ast(); },

  VarDecl(kind, id, typeOpt, _eq, initOpt) {
    const k = kind.sourceString;
    const name = id.ast().name;
    const ann = typeOpt.children.length ? typeOpt.children[0].ast() : null;
    const init = initOpt.children.length ? initOpt.children[0].ast() : null;
    return n('VarDecl', { kind: k, name, annType: ann, init });
  },

  Assign(id, _eq, exp) {
    return n('Assign', { target: id.ast().name, expr: exp.ast() });
  },

  Print(_print, _open, exp, _close) {
    return n('Print', { expr: exp.ast() });
  },

  IfStmt(_if, cond, _open, thenStmts, _close, elseOpt) {
    const thenBody = thenStmts.children.map(s => s.ast());
    let elseBody = null;
    if (elseOpt.children.length) {
      // elseOpt is ("else" "{" Statement* "}")?
      const inner = elseOpt.children[0];
      // inner children: 'else', '{', stmts, '}'
      elseBody = inner.children[2].children.map(s => s.ast());
    }
    return n('If', { cond: cond.ast(), thenBody, elseBody });
  },

  WhileStmt(_while, cond, _open, stmts, _close) {
    return n('While', { cond: cond.ast(), body: stmts.children.map(s => s.ast()) });
  },

  ReturnStmt(_ret, expOpt) {
    const expr = expOpt.children.length ? expOpt.children[0].ast() : null;
    return n('Return', { expr });
  },

  BreakStmt(_b) { return n('Break', {}); },

  ExpStmt(exp) { return exp.ast(); },

  // Expressions
  Exp_or(left, _op, right) { return n('Binary', { op: '||', left: left.ast(), right: right.ast() }); },
  Exp(left) { return left.ast(); },
  Exp1_and(left, _op, right) { return n('Binary', { op: '&&', left: left.ast(), right: right.ast() }); },
  Exp1(left) { return left.ast(); },
  Exp2_compare(left, _op, right) { return n('Binary', { op: this.children[1].sourceString, left: left.ast(), right: right.ast() }); },
  Exp2(left) { return left.ast(); },
  Exp3_add(left, _op, right) { return n('Binary', { op: this.children[1].sourceString, left: left.ast(), right: right.ast() }); },
  Exp3(left) { return left.ast(); },
  Exp4_mul(left, _op, right) { return n('Binary', { op: this.children[1].sourceString, left: left.ast(), right: right.ast() }); },
  Exp4(left) { return left.ast(); },
  Exp5_prefix(op, right) { return n('Unary', { op: op.sourceString, expr: right.ast() }); },
  Exp5(expr) { return expr.ast(); },
  Exp6_power(left, _op, right) { return n('Binary', { op: '**', left: left.ast(), right: right.ast() }); },
  Exp6(left) { return left.ast(); },
  Exp7_literal(lit) { return lit.ast(); },
  Exp7_call(id, _open, list, _close) {
    const args = list.children.length ? list.children[0].children.map(c => c.ast()) : [];
    return n('Call', { callee: id.ast().name, args });
  },
  Exp7_id(id) { return id.ast(); },
  Exp7_paren(_open, e, _close) { return e.ast(); },

  relop(ch) { return this.sourceString; },
  addop(ch) { return this.sourceString; },
  mulop(ch) { return this.sourceString; },
  prefixop(ch) { return this.sourceString; },

  id(_notKw, first, rest) { return n('Identifier', { name: this.sourceString }); },

  literal_num(num) { return n('Literal', { value: Number(this.sourceString), valueType: 'num' }); },
  literal_string(str) { return n('Literal', { value: this.sourceString.slice(1, -1), valueType: 'string' }); },
  literal_true() { return n('Literal', { value: true, valueType: 'bool' }); },
  literal_false() { return n('Literal', { value: false, valueType: 'bool' }); },

  num(_digs, _opt) { return n('Literal', { value: Number(this.sourceString), valueType: 'num' }); },
  string(_open, _chars, _close) { return n('Literal', { value: this.sourceString.slice(1, -1), valueType: 'string' }); },

  // default
  _terminal() { return this.sourceString; },
  _iter(...children) { return children.map(c => c.ast ? c.ast() : c); }
});

export function buildAST(src) {
  const match = G.match(src);
  if (!match.succeeded()) {
    return { ast: null, errors: [match.message] };
  }
  const ast = semantics(match).ast();
  return { ast, errors: [] };
}

export default { buildAST };
