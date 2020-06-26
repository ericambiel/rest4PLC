import {EventEmitter} from 'events';

// eslint-disable-next-line no-unused-vars
import ComObject from 'node-dcom/dcom/core/comobject';
import Session from 'node-dcom/dcom/core/session';
import ComServer from 'node-dcom/dcom/core/comserver';
import Clsid from 'node-dcom/dcom/core/clsid';
import OPCServer from 'node-opc-da/src/opcServer';

import ConsoleLog from '../ConsoleLog';

import ErrorMessage from './ErrorMessage';
// eslint-disable-next-line no-unused-vars
import Group from './Group';


export default class Server extends EventEmitter {

  /** @type {OPCServer} */
  opcServer;

  /** @type {ComServer} */
  comServer;

  /** @type {Session} */
  comSession;

  /** @type {ComObject} */
  comObject;

//   /** @type {Group} */
//   group;

  /** @type {Map<String, Group>} */
  groups;

  /** @type {boolean} */
  isOnCleanUp;

  /** @type {boolean} */
  reconnecting;

  /** @type {String} */
  status;

  /** @type {{address:String, domain:String username:String, password: String, clsid: String, timeout: 7000, opts:[] | null}} */
  connOpts;

  /** @type {ErrorMessage} */
  errorMessage;
  // const isVerbose = (config.verbose === 'on' || config.verbose === 'off') ? (config.verbose === 'on') : RED.settings.get('verbose');

   /**
   *
   * @param {String} address       Endereço IP/Hostname do Servidor OPC remoto.
   * @param {String} domain        Nome do domínio Microsoft.
   * @param {String} username      Usuário de rede com acesso OPC ao servidor.
   * @param {String} password      Senha de usuário.
   * @param {String} clsid         CLSID do servidor OPC no host de destino.
   * @param {object[]} [opts]   Opções de configuração adicionais.
   */
  constructor(address, domain, username, password, clsid, opts) {
    super();
    EventEmitter.call(this);

    this.errorMessage = new ErrorMessage();

    this.connOpts = {
      address,
      domain,
      username,
      password,
      clsid,
      timeout: 7000,
      opts,
    };

    this.isOnCleanUp = false;
    this.reconnecting = false;
    this.status = 'unknown';
    this.groups = new Map();

    this.setup().catch(this.onComServerError);
  }

  async onComServerError(err) {
    new ConsoleLog('error').printConsole(`[SERVER] ${this.errorMessage(err)}`);
    switch (err) {
      case 0x00000005: this.errorMessage.getErrorMessageAndPrint(err);
        return;
      case 0xC0040010: this.errorMessage.getErrorMessageAndPrint(err);
        return;
      case 0x80040154: this.errorMessage.getErrorMessageAndPrint(err);
        return;
      case 0x00000061: this.errorMessage.getErrorMessageAndPrint(err);
        return;
      default:
        new ConsoleLog('warn').printConsole('[SERVER] - Trying to reconnect...');
        await this.setup().catch(this.onComServerError);
    }
  }

  updateStatus(newStatus) {
    if (this.status === newStatus) { return; }

    this.status = newStatus;
    this.groups.forEach((group) => group.onServerStatus(this.status));
  }

  async setup() {
    // Prepara sessão para conexão com servidor COM
    this.comSession = new Session();
    this.comSession = this.comSession.createSession(this.connOpts.domain, this.connOpts.username, this.connOpts.password);
    this.comSession.setGlobalSocketTimeout(this.connOpts.timeout);

    // Cria conexão COM com servidor Microsoft
    this.comServer = new ComServer(new Clsid(this.connOpts.clsid), this.connOpts.address, this.comSession);

    // this.comServer.on('e_classnotreg', () => {
    //   new ConsoleLog('error').printConsole("opc-da.error.classnotreg");
    // });

    // this.comServer.on("disconnected", () => {
    //   this.onComServerError(ConsoleLog('error').printConsole("opc-da.error.disconnected"));
    // });

    // this.comServer.on("e_accessdenied", () => {
    //   new ConsoleLog('error').printConsole("opc-da.error.accessdenied");
    // });

    this.comServer.on('error', this.onComServerError);

    await this.comServer.init();

    this.comObject = await this.comServer.createInstance();

    // Cria conexão OPC-DA com servidor COM
    this.opcServer = new OPCServer();
    await this.opcServer.init(this.comObject);
    // Caso já exista algum grupo salvo, dar carga DB aqui
    for (const entry of this.groups.entries()) {
      const name = entry[0];
      const group = entry[1];
      const oPCGroupStateManager = await this.opcServer.addGroup(name, group.opcConfig);
      new ConsoleLog('info').printConsole(`setup for group: ${name}`);
      await group.setup(oPCGroupStateManager);
    }

    this.updateStatus('online');
  }

  async cleanup() {
    try {
      if (this.isOnCleanUp) { return; }
      new ConsoleLog('info').printConsole('[SERVER] - Cleaning Up');
      this.isOnCleanUp = true;
      // cleanup this.groups first
      new ConsoleLog('info').printConsole('[SERVER] - Cleaning this.groups...');
      for (const group of this.this.groups.values()) {
        // await group.cleanUp();
      }
      new ConsoleLog('info').printConsole('[SERVER] - Cleaned Groups');
      if (this.opcServer) {
        // await this.opcServer.end();
        this.opcServer = null;
      }
      new ConsoleLog('info').printConsole('[SERVER] - Cleaned this.opcServer');
      if (this.comSession) {
        await this.comSession.destroySession();
        this.comServer = null;
      }
      new ConsoleLog('info').printConsole('[SERVER] - Cleaned session. Finished.');
      this.isOnCleanUp = false;
    } catch (err) {
      // eslint-disable-next-line no-warning-comments
      // TODO I18N
      this.isOnCleanUp = false;
      const error = err || err.stack;
      // eslint-disable-next-line object-shorthand
      new ConsoleLog('error').printConsole(`[SERVER] - Error cleaning up server: ${error}`, {error: error});
    }

    this.updateStatus('unknown');
  }

  // eslint-disable-next-line shopify/prefer-early-return
  reConnect() {

    /* if reconnect was already called, do nothing if reconnect was never called, try to restart the session */
    if (!this.reconnecting) {
      new ConsoleLog('info').printConsole('[SERVER] - cleaning up');
      this.reconnecting = true;
      await this.cleanup();
      await this.setup().catch(this.onComServerError);
      this.reconnecting = false;
    }
  }

  getStatus() {
    return this.status;
  }

  /**
   * Cria novo grupo. Gera nova instancia em MAP de Server e adiciona também em OPCServer
   * @param {Object} grpConfig
   * @param {String} grpConfig.name Nome do Grupo
   * @param {Server} grpConfig.server Instância da classe Server.
   * @param {[]} grpConfig.vartable Lista com itens a serem inseridos, adquira com BrowseFlat
   * @param {boolean} [grpConfig.validate=false]
   * @param {boolean} [grpConfig.active=true]
   * @param {Number} [grpConfig.updateRate=1000]
   * @param {Number} [grpConfig.timeBias=0]
   * @param {Number} [grpConfig.deadband=0]
   */
  createGroup(grpConfig) {
    const group = new Group(grpConfig);

    const oPCGroupStateManager = await this.opcServer.addGroup(grpConfig.name, grpConfig);
    new ConsoleLog('info').printConsole(`[SERVER] - setup for group: ${group.config.name}`);
    await group.setup(oPCGroupStateManager);
    group.onServerStatus(this.status);
  }

//   /**
//    *
//    * @param {Group} group
//    */
//   registerGroup(group) {
//     if (this.groups.has(group.config.name)) {
//       new ConsoleLog('warn').printConsole('[SERVER] - Grupo já existe, foi sobrescrito');
//     }

//     this.groups.set(group.config.name, group);
//   }

  /**
   *
   * @param {Group} group
   */
  unregisterGroup(group) {
    // Somente deleta do MAP da instancia em Server mas não deleta de OPCServer
    this.groups.delete(group.config.name);
  }
}
