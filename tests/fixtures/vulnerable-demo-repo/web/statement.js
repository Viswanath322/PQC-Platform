// Demo bank front-end helper. INTENTIONALLY VULNERABLE, fake token.
const API_TOKEN = "FAKE-DEMO-TOKEN-DO-NOT-USE-0000"; // VULN: SECRET-005

function render(userExpr) {
  return eval(userExpr); // VULN: EVAL-002
}

function show(el, html) {
  el.innerHTML = html; // VULN: XSS-001
}

module.exports = { render, show, API_TOKEN };
