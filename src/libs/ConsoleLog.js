
import {debuglog} from 'util';

export default class ConsoleLog {

  /** @constant @type {String} Carácter de separação*/
  CHAR = ':';

  /** @type {String} */
  locale;

  /** @type {String} */
  _type;

  /**
   * Informar tipo da mensagem a ser impressa, caso contrario somente ira imprimir
   * em console de forma padrão.
   * @param {String} [type] - info, error, warn, debug.
   */
  constructor(type) {
    this._type = type === undefined ? '' : type.toString().toLowerCase();
  }

  // /**
  //  * Informar tipo da mensagem a ser impressa, caso contrario somente ira imprimir
  //  * em console de forma padrão.
  //  * @param {String} [type] - info, error, warn, debug.
  //  * @param {String} [locale] - Localização de Data e Hora, ex: PT-br, US-en ...
  //  */
  // constructor(type, locale) {
  //   this._type = type === undefined ? '' : type.toString().toLowerCase();
  //   this.locale = locale;
  // }

   /**
    * Imprime no console.
    * @param {String} message - Mensagem a ser impressa no console.
    * @return {string} - Retorna erro ou informação ao STDIO
    */
  printConsole(message) {
    switch (true) {
      case this.beforeCharacter(this._type, this.CHAR) === 'info': {
        console.info(`${this.getNow(this.locale)} [INFO][${this.afterCharacter(this._type, this.CHAR).toUpperCase()}] - ${message}`);
        break;
      }
      case this.beforeCharacter(this._type, this.CHAR) === 'error': {
        console.error(`${this.getNow(this.locale)} [ERROR][${this.afterCharacter(this._type, this.CHAR).toUpperCase()}] - ${message}`);
        break;
      }
      case this.beforeCharacter(this._type, this.CHAR) === 'warn': {
        console.warn(`${this.getNow(this.locale)} [WARN][${this.afterCharacter(this._type, this.CHAR).toUpperCase()}] - ${message}`);
        break;
      }
      case this.beforeCharacter(this._type, this.CHAR) === 'debug': {
        const debug = debuglog(this.afterCharacter(message, this.CHAR));
        debug(console.debug(`${this.getNow(this.locale)} [DEBUG][${this.afterCharacter(this._type, this.CHAR).toUpperCase()}] - ${message}`));
        break;
      }
      default: console.log(`${this.getNow(this.locale)} ${message}`);
    }
  }

  /**
   * Retorna Data e Hora atual em formato localizado. Caso não seja informada localização
   * ira retornar localização padrão configurada no ambiente do S.O.
   * @private
   * @param {String} [locale] - Localização de Data e Hora, ex: PT-br, US-en ...
   * @returns {String} Data e hora em formato localizado.
   */
  getNow(locale) {
    return `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString(locale)}`;
  }

  /**
   * Retorna texto após carácter informado.
   * @private
   * @param {String} text - Texto
   * @param {String} char - Carácter para filtro.
   * @returns {String} - Texto após algum carácter.
   */
  afterCharacter(text, char) {
    const subst = text.substring(text.indexOf(char) + 1);
    return subst === text ? 'UNDEFINED' : subst;
  }

  /**
   * Retorna texto até carácter informado.
   * @private
   * @param {String} text - Texto.
   * @param {String} char - Carácter para filtro.
   * @returns {String} - Texto até algum carácter.
   */
  beforeCharacter(text, char) {
    const subst = text.substring(0, text.indexOf(char));
    return subst === '' ? text : subst;
  }
}
