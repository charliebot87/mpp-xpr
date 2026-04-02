// CJS compatibility wrapper
const mod = import('./index.js');
module.exports = mod;
module.exports.default = mod;
