import http from 'node:http'

// #region start
const server = http.createServer(handler)
server.listen(3000)
// #endregion start
