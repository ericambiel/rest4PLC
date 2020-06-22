import http from 'http';

import app from '../../app';
import ConsoleLog from '../../libs/ConsoleLog';

const debug = require('debug')('api:debug'); // TODO: Verificar como usar 

/**
 * Get port from environment and store in Express.
 */
const _port = normalizePort(process.env.API_REST_PORT!);

app.set('porta', _port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(process.env.API_REST_PORT);
server.on('error', onError);
server.on('listening', onListening);

new ConsoleLog('info').printConsole(`[START] - API Rest4PLC rodando em porta: ${process.env.API_REST_PORT}`);
debug('Debug');

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port.toString();
  }

  return 'false';
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error: any) {
  if (error.syscall !== 'escutando') {
    throw error;
  }

  const bind = typeof _port === 'string' 
    ? `Pipe ${_port}`
    : `Porta ${_port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      new ConsoleLog('erro').printConsole(`[START] - ${bind} requer elevação de privilégios`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      new ConsoleLog('erro').printConsole(`[START] - ${bind} já esta em uso`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const bind = typeof server.address() === 'string'
    ? `pipe ${server.address()}`
    : `porta ${server.address()}`;
  debug(`Escultando em: ${bind}`);
}
