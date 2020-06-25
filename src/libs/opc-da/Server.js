import {EventEmitter} from 'events';

import {Session, ComServer, Clsid} from 'node-dcom';
// import {ComObject} from 'node-dcom/dcom/core/comobject';
import {OPCServer} from 'node-opc-da';

import ConsoleLog from '../ConsoleLog';

// import Group from './Group';


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
  // const isVerbose = (config.verbose === 'on' || config.verbose === 'off') ? (config.verbose === 'on') : RED.settings.get('verbose');

   /**
   *
   * @param {String} address       Endereço IP/Hostname do Servidor OPC remoto.
   * @param {String} domain        Nome do domínio Microsoft.
   * @param {String} username      Usuário de rede com acesso OPC ao servidor.
   * @param {String} password      Senha de usuário.
   * @param {String} clsid         CLSID do servidor OPC no host de destino.
   * @param {object} [opts]   Opções de configuração adicionais.
   */
  constructor(address, domain, username, password, clsid, opts) {
    super();
    EventEmitter.call(this);

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
    new ConsoleLog('error').printConsole(this.errorMessage(err));
    switch (err) {
      case 0x00000005:
        return;
      case 0xC0040010:
        return;
      case 0x80040154:
        return;
      case 0x00000061:
        return;
      default:
        new ConsoleLog('warn').printConsole("Trying to reconnect...");
        await this.setup().catch(this.onComServerError);
    }
  }

  updateStatus(newStatus) {
    if (this.status === newStatus) { return; }

    this.status = newStatus;
    this.groups.forEach((group) => group.onServerStatus(this.status));
  }

  async setup() {
    this.comSession = new Session();
    this.comSession = this.comSession.createSession(this.connOpts.domain, this.connOpts.username, this.connOpts.password);
    this.comSession.setGlobalSocketTimeout(this.connOpts.timeout);

    this.comServer = new ComServer(new Clsid(this.connOpts.clsid), this.connOpts.address, this.comSession);
          // this.comServer.on('error', onComServerError);

    this.comServer.on('e_classnotreg', () => {
      new ConsoleLog('error').printConsole("opc-da.error.classnotreg");
    });

    this.comServer.on("disconnected", () => {
      this.onComServerError(ConsoleLog('error').printConsole("opc-da.error.disconnected"));
    });

    this.comServer.on("e_accessdenied", () => {
      new ConsoleLog('error').printConsole("opc-da.error.accessdenied");
    });

    await this.comServer.init();

    this.comObject = await this.comServer.createInstance();

    this.opcServer = new OPCServer();
    await this.opcServer.init(this.comObject);
    for (const entry of this.groups.entries()) {
      const name = entry[0];
      const group = entry[1];
      const opcGroup = await this.opcServer.addGroup(name, group.opcConfig);
      console.log(`setup for group: ${name}`);
      await group.updateInstance(opcGroup);
    }

    this.updateStatus('online');
  }

  async cleanup() {
    try {
      if (this.isOnCleanUp) { return; }
      console.log("Cleaning Up");
      this.isOnCleanUp = true;
      // cleanup this.groups first
      console.log("Cleaning this.groups...");
      for (const group of this.this.groups.values()) {
        // await group.cleanUp();
      }
      console.log("Cleaned Groups");
      if (this.opcServer) {
                  // await this.opcServer.end();
        this.opcServer = null;
      }
      console.log("Cleaned this.opcServer");
      if (this.comSession) {
        await this.comSession.destroySession();
        this.comServer = null;
      }
      console.log("Cleaned session. Finished.");
      this.isOnCleanUp = false;
    } catch (err) {
      // eslint-disable-next-line no-warning-comments
      // TODO I18N
      this.isOnCleanUp = false;
      const error = err || err.stack;
      console.log(err);
      // eslint-disable-next-line object-shorthand
      new ConsoleLog('error').printConsole(`Error cleaning up server: ${error}`, {error: error});
    }

    this.updateStatus('unknown');
  }

  // eslint-disable-next-line shopify/prefer-early-return
  reConnect() {

    /* if reconnect was already called, do nothing if reconnect was never called, try to restart the session */
    if (!this.reconnecting) {
      console.log("cleaning up");
      this.reconnecting = true;
      await this.cleanup();
      await this.setup().catch(this.onComServerError);
      this.reconnecting = false;
    }
  }

  getStatus() {
    return this.status;
  }

  createGroup(group) {
    const opcGroup = await this.opcServer.addGroup(group.opcConfig.name, group.opcConfig);
    console.log(`setup for group: ${group.config.name}`);
    await group.updateInstance(opcGroup);
    group.onServerStatus(this.status);
  }

  registerGroup(group) {
    if (this.this.groups.has(group.config.name)) {
      new ConsoleLog('warn').printConsole("opc-da.warn.dupgroupname");
    }

    this.this.groups.set(group.config.name, group);
  }

  unregisterGroup(group) {
    this.this.groups.delete(group.config.name);
  }
}
