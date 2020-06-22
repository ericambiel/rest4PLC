let now;
let _type;

class ConsoleLog {
  constructor(type) {
    _type = type === undefined ? '' : type.toString().toLowerCase();
    now = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  }

   /**
    * Imprime no console mensagens de erro
    * info - console.info,
    * error - console.erro,
    * warn - console.warn,
    * debug - console.debug
    * @param {String} message
    * @return {string} Retorna erro ou informação ao STDIO
    */
  printConsole(message) {
    switch (_type) {
      case 'info': console.info(`${now} [INFO]${message}`); break;
      case 'error': console.error(`${now} [ERROR]${message}`); break;
      case 'warn': console.warn(`${now} [WARN]${message}`); break;
      case 'debug': console.debug(`${now} [DEBUG]${message}`); break;
      default: console.log(`${now} ${message}`);
    }
  }
}

module.exports = ConsoleLog;
