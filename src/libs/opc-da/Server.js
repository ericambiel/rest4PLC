import {EventEmitter} from 'events';

import Session from 'node-dcom/dcom/core/session';
import ComServer from 'node-dcom/dcom/core/comserver';
import Clsid from 'node-dcom/dcom/core/clsid';
import OPCServer from 'node-opc-da/src/opcServer';

import ConsoleLog from '../ConsoleLog';

import ErrorMessage from './ErrorMessage';
// Only for lint
// import Browse from './Browse';
// eslint-disable-next-line import/no-cycle
import Group from './Group';

export default class Server extends EventEmitter {

  /** @typedef {import ('node-dcom/dcom/core/comobject')} ComObject*/

  /** @type {OPCServer} */
  opcServer;

  /** @type {ComServer} */
  comServer;

  /** @type {Session} */
  comSession;

  /** @type {ComObject} */
  comObject;

  /** @type {Map<String, Group>} */
  groups;

  // /** @type {Browse} */
  // browse;

  /** @type {boolean} */
  isOnCleanUp;

  /** @type {boolean} */
  isOnReconnecting;

  /** @type {String} */
  status;

  /** @type {{address:String, domain:String username:String, password: String, clsid: String, timeout: 7000, opts:[] | null}} */
  connOpts;

  /** @type {ErrorMessage} */
  errorMessage;

  /** @type {ConsoleLog} */
  debug;
  // const isVerbose = (config.verbose === 'on' || config.verbose === 'off') ? (config.verbose === 'on') : RED.settings.get('verbose');

   /**
   * ---------- OPC-DA Sever ----------
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
    this.debug = new ConsoleLog('debug:server');

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
    this.isOnReconnecting = false;
    this.status = 'unknown';
    this.groups = new Map();

    // this.browse = new Browse(this); // Somente necessario se implementar mais funções a Navegação de itens.
  }

  async onComServerError(err) {
    // new ConsoleLog('error:server').printConsole(`${this.errorMessage.getErrorMessage(err)}`);
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
        new ConsoleLog('warn:server').printConsole('Trying to reconnect...');
        await this.setup().catch((error) => this.onComServerError(error));
    }
  }

  updateStatus(newStatus) {
    if (this.status === newStatus) { return; }

    this.status = newStatus;
    this.groups.forEach((group) => group.onServerStatus(this.status));
  }

  async setup() {
    try {
      // Prepara sessão para conexão com servidor COM
      this.comSession = new Session();
      this.comSession = this.comSession.createSession(this.connOpts.domain, this.connOpts.username, this.connOpts.password);
      this.comSession.setGlobalSocketTimeout(this.connOpts.timeout);

      // Cria conexão COM com servidor Microsoft
      this.comServer = new ComServer(new Clsid(this.connOpts.clsid), this.connOpts.address, this.comSession);

      this.comServer.on("disconnected", () => {
        this.onComServerError(new ConsoleLog('error:server').printConsole("Disconnected"));
      });

      this.comServer.on('e_classnotreg', () => {
        new ConsoleLog('error').printConsole("Classnotreg");
      });

      this.comServer.on("e_accessdenied", () => {
        new ConsoleLog('error').printConsole("Accessdenied");
      });

      // this.comServer.on('error', (err) => {
      //   this.onComServerError(err);
      // });

      await this.comServer.init()
        .then(async () => {
          this.comObject = await this.comServer.createInstance();

          // Cria conexão OPC-DA com servidor COM
          this.opcServer = new OPCServer();
          await this.opcServer.init(this.comObject);
        })
        .then(() => {
          // Caso restarte iniciado por Group recria grupos para a conexão.
          this.groups.forEach(async (group, key) => {
            const oPCGroupStateManager = await this.opcServer.addGroup(key, group.grpConfig);
            new ConsoleLog('info:server').printConsole(`setup for group: ${key}`);
            await group.setup(oPCGroupStateManager);
          });

          this.updateStatus('online');
        })
        .catch((err) => { throw err; });
    } catch (err) {
      this.onComServerError(err);
      throw err;
    }
  }

  /**
   * Lista todos os itens em um Servidor OPC-DA
   * @param {boolean} isAllFlat Se true retorna itens alinhados se falso em cascata
   */
  async browseItems(isAllFlat) {

    /** @type {[String]|[Object]} */
    let items;

    const opcBrowser = await this.opcServer.getBrowser();

    if (isAllFlat) {
      items = await opcBrowser.browseAllFlat();
    } else {
      items = await opcBrowser.browseAllTree();
    }

    return items;
  }

  /**
   * Apaga e limpa referencias entre cliente e servidor
   */
  async cleanup() {
    try {
      if (this.isOnCleanUp) { return; }
      new ConsoleLog('info:server').printConsole('Cleaning Up');
      this.isOnCleanUp = true;

      // cleanup groups first
      // Necessário Map para Array para usar Promise All
      new ConsoleLog('info:server').printConsole('Cleaning groups...');
      const arrayGroups = [];
      this.groups.forEach((group) => {
        arrayGroups.push(group);
      });
      await Promise.all(arrayGroups.map((group) => {
        return group.cleanup()
          .catch((err) => { throw err; });
      }))
        .catch((err) => { throw err; });
      new ConsoleLog('info:server').printConsole('Cleaned Groups');

      if (this.opcServer) {
        new ConsoleLog('info:server').printConsole('Cleaning Server');
        await this.opcServer.end()
          .then(new ConsoleLog('info:server').printConsole('Cleaned Server'))
          .catch(this.opcServer = null);
      }

      if (this.comSession) {
        new ConsoleLog('info:server').printConsole('Cleaned opcServer');
        await this.comSession.destroySession()
          .then(new ConsoleLog('info:server').printConsole('Cleaned session. Finished.'))
          .then(this.comServer = null)
          .catch((err) => { throw err; });
      }

      this.isOnCleanUp = false;
    } catch (err) {
      // eslint-disable-next-line no-warning-comments
      // TODO I18N
      this.isOnCleanUp = false;
      const error = err || err.stack;
      new ConsoleLog('error:server').printConsole(`Error cleaning up server: ${error}`);
    }

    this.updateStatus('unknown');
  }

  // eslint-disable-next-line shopify/prefer-early-return
  async reConnect() {

    /* if reconnect was already called, do nothing if reconnect was never called, try to restart the session */
    if (!this.isOnReconnecting) {
      this.debug.printConsole('Reconectando ao servidor');
      this.isOnReconnecting = true;
      await this.cleanup();
      await this.setup().catch(this.onComServerError);
      this.isOnReconnecting = false;
    }
  }

  getStatus() {
    return this.status;
  }

  /**
   * Cria novo grupo. Gera nova instancia em MAP de Server e adiciona também em OPCServer
   * @param {Object} grpConfig
   * @param {String} grpConfig.name Nome do Grupo
   * @param {[]} grpConfig.varTable Lista com itens a serem inseridos, adquira com BrowseFlat
   * @param {boolean} [grpConfig.validate=false]
   * @param {boolean} [grpConfig.active=true]
   * @param {Number} [grpConfig.updateRate=1000]
   * @param {Number} [grpConfig.timeBias=0]
   * @param {Number} [grpConfig.deadband=0]
   */
  async createGroup(grpConfig) {

    /** @type {Server} grpConfig.server Instância da classe Server. */
    grpConfig.server = this;

    if (this.groups.has(grpConfig.name)) {
      new ConsoleLog('warn:server').printConsole('Grupo já existe, tente outro nome!');
    } else {
      const group = new Group(grpConfig);

      const oPCGroupStateManager = await this.opcServer.addGroup(grpConfig.name, grpConfig);
      new ConsoleLog('info:server').printConsole(`setup for group: ${group.grpConfig.name}`);
      await group.setup(oPCGroupStateManager);
      group.onServerStatus(this.status);

      this.groups.set(grpConfig.name, group);
    }
  }

  /**
   *
   * @param {Group} group
   */
  unregisterGroup(group) {
    // Somente deleta do MAP da instancia em Server mas não deleta de OPCServer
    this.groups.delete(group.grpConfig.name);
  }
}
