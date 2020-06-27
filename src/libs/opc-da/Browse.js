// import ConsoleLog from '../ConsoleLog';

// eslint-disable-next-line import/no-cycle
import Server from './Server';
import ErrorMessage from './ErrorMessage';

export default class Browse {

  /**
   *
   * @param {Server} server Instância de um servidor OPC-DA criada.
   */
  constructor(server) {
    this.errorMessage = new ErrorMessage();

    /** @type {Server} */
    this.server = server;
  }

  /**
   * Lista todos os itens em um Servidor OPC-DA
   * @param {boolean} isAllFlat Se true retorna itens alinhados se falso em cascata
   */
  async browseItems(isAllFlat) {

    /** @type {[]} */
    let items;

    const opcBrowser = await this.server.opcServer.getBrowser();

    if (isAllFlat) {
      items = await opcBrowser.browseAllFlat();
    } else {
      items = await opcBrowser.browseAllTree();
    }

    // // don't need to await it, so we can return immediately
    // opcBrowser.end()
    //   .then(() => this.server.opcServer.end())
    //   .then(() => this.server.comServer.closeStub())
    //   .catch((err) => new ConsoleLog('error').printConsole(`Error closing browse session: ${err}`));

    return items;
  }
}
