// ...........................................................................................
// Misc Functions
// Lazy JSON.Stringify() for pretty logs and debugging
exports.J = function(obj, pretty)
{
  if (!pretty)
    return JSON.stringify(obj); // js obj >> json
  else
    return JSON.stringify(obj, null, 2); // Better for logs+humans
};

// ...........................................................................................
// Checks for empty object
exports.checkForEmptyObj = function(obj)
{
    var isEmptyObj = Object.keys(obj).length === 0 && obj.constructor === Object
    console.log('[Common] isEmptyObj == ' + isEmptyObj);
    return isEmptyObj;
};

// ...........................................................................................
// Simple date for logs
exports.GetDateTime = function()
{
  return new Date().toISOString()
    .replace(/T/, ' ') // replace T with a space
    .replace(/\..+/, ''); // delete the dot and everything after
};

// ...........................................................................................
// Get IP from req header
exports.getIP = function(req)
{
    var ipInfo =
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress ||
    req.headers['x-cluster-client-ip'] ||
    req.headers['x-forwarded-for'];

    console.log(ipInfo);
    return ipInfo;
};

// ...........................................................................................
// Common console+logs for incoming POST for PlayFab
exports.InitLog = function(req, routeName, httpType)
{
    // Substitute sensitive data for random mask
    var filteredReq = req;
    if (req.Password || req.body.Password)
        filteredReq.body.Password = "******";

    console.log( '\n' + this.GetDateTime() );
    console.log('####################################');
    console.log(`[${httpType}] request to "${routeName}" ..`);
    console.log( '<< REQ: ' + this.J(filteredReq.body, true) + '\n' );
};