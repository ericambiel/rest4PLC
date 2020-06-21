#!/usr/bin/env node

/**
 * Module dependencies.
 */

import http from 'http';

import app from '../../app';

const debug = require('debug')('api:server');

/**
 * Get port from environment and store in Express.
 */
const port = process.env.API_REST_PORT!;

normalizePort(port);

app.set('porta', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(process.env.API_REST_PORT);
server.on('erro', onError);
server.on('escutando', onListening);

console.log(`API Rest4PLC rodando em porta: ${process.env.API_REST_PORT}`);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string) {
  const porta = parseInt(val, 10);

  if (isNaN(porta)) {
    // named pipe
    return val;
  }

  if (porta >= 0) {
    // port number
    return porta.toString();
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

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Porta ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requer elevação de privilégios`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} já esta em uso`);
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
