// Load environment configuration
require('dotenv-safe').config();
// config({
//   path: path.resolve(__dirname, '../../..', '.env'),
//   example: path.resolve(__dirname, '../../..', '.env.example'),
// });
// require('./lib/passport'); // Verificar se usuário é valido/BD

const path = require('path');

const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const {default: ConsoleLog} = require('./libs/ConsoleLog');

// const ConsoleLog = require('./libs/ConsoleLog');

const connectionString =
  `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const app = express();

mongoose.Promise = global.Promise;

mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false, // Para mais detalhes https://mongoosejs.com/docs/deprecations.html#-findandmodify-
  useCreateIndex: true}) // Para mais detalhes https://github.com/Automattic/mongoose/issues/6890
  .then((client) => {
    client.connections.forEach((connection) => {
      new ConsoleLog('info:start').printConsole(`Conectado ao BD em: ${connection.host}:${connection.port}`);
      new ConsoleLog('info:start').printConsole(`Base de Dados: ${connection.name}`);
    });
    new ConsoleLog('info:start').printConsole(`Contato: eric.ambiel@gmail.com.br - (19) 9 9747-4657`);
  })
  .catch((error) => {
    new ConsoleLog('error:start').printConsole(`Erro ao se conectar ao BD: ${error.message}`);
  });

// Error handler
mongoose.connection.on('error', (err) => {
  console.log(err);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Caminhos das Rotas
app.use('/', require('./app/routes/index'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
