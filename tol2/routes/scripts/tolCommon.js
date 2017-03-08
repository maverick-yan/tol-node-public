// ...........................................................................................
// Misc Functions
// Lazy JSON.Stringify() for pretty logs and debugging
exports.J = function(obj, pretty) {
  if (!pretty)
    return JSON.stringify(obj); // js obj >> json
  else
    return JSON.stringify(obj, null, 2); // Better for logs+humans
}

// ...........................................................................................
// Simple date for logs
exports.GetDateTime = function() {
  return new Date().toISOString()
    .replace(/T/, ' ') // replace T with a space
    .replace(/\..+/, ''); // delete the dot and everything after
}

// ...........................................................................................
// Common console+logs for incoming POST for PlayFab
exports.InitLog = function(req, routeName, httpType) {
  console.log( '\n' + this.GetDateTime() );
  console.log('####################################');
  console.log(`[${httpType}] request to "${routeName}" ..`);
  console.log( '<< REQ: ' + this.J(req.body, true) + '\n' );
}