import {Session, ComServer, Clsid} from 'node-dcom';
import {OPCServer} from 'node-opc-da';

import ConsoleLog from '../ConsoleLog';

import ErrorMessage from './ErrorMessage';

export default class Browse {

  /** @type {ErrorMessage} */
  errorMessage;

  /** @type {String} */
  address;

  /** @type {String} */
  domain;

  /** @type {String} */
  user;

  /** @type {String} */
  pass;

  /** @type {String} */
  clsid;

  /** @type {[] | null} */
  opts;

  /** @type {number} */
  timeout = 7000;

  /**
   *
   * @param {String} address       Endereço IP/Hostname do Servidor OPC remoto.
   * @param {String} domain        Nome do domínio Microsoft.
   * @param {String} username      Usuário de rede com acesso OPC ao servidor.
   * @param {String} password      Senha de usuário.
   * @param {String} clsid         CLSID do servidor OPC no host de destino.
   * @param {object|null} [opts]   Opções de configuração adicionais.
   */
  constructor(address, domain, username, password, clsid, opts) {
    this.address = address; this.domain = domain;
    this.user = username; this.pass = password;
    this.clsid = clsid; this.opts = opts;

    this.errorMessage = new ErrorMessage();
  }

  /**
   *
   * @param {boolean} allFlat Se true retorna itens alinhados se falso em cascata
   */
  async browseItems(allFlat) {

    /** @type {[]} */
    let items;
    let session = new Session();
    session = session.createSession(this.domain, this.username, this.password);
    session.setGlobalSocketTimeout(this.timeout);

    const comServer = new ComServer(new Clsid(this.clsid), this.address, session);

    comServer.on("disconnected", () => {
      this.onBrowseError("opc-da.error.disconnected");
    });

    await comServer.init();

    const comObject = await comServer.createInstance();

    const opcServer = new OPCServer();
    await opcServer.init(comObject);

    const opcBrowser = await opcServer.getBrowser();

    if (allFlat) {
      items = await opcBrowser.browseAllFlat();
    } else {
      items = await opcBrowser.browseAllTree();
    }

    // don't need to await it, so we can return immediately
    opcBrowser.end()
      .then(() => opcServer.end())
      .then(() => comServer.closeStub())
      .catch((err) => new ConsoleLog('error').printConsole(`Error closing browse session: ${err}`));

    return items;
  }

  /**
   * @private
   * @param {String} err Erro em hexadecimal
   */
  onBrowseError(err) {
    new ConsoleLog('error').printConsole(this.errorMessage(err));
  }

}
