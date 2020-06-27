import {EventEmitter} from 'events';

// eslint-disable-next-line no-unused-vars
import OPCItemManager from 'node-opc-da/src/opcItemManager';
// eslint-disable-next-line no-unused-vars
import OPCGroupStateManager from 'node-opc-da/src/opcGroupStateManager';
// eslint-disable-next-line no-unused-vars
import OPCSyncIO from 'node-opc-da/src/opcAsyncIO';
import constants from 'node-opc-da/src/constants';

import ConsoleLog from '../ConsoleLog';

// eslint-disable-next-line import/no-cycle
import Server from './Server';


export default class Group extends EventEmitter {

  /** @type {OPCGroupStateManager} */
  opcGroupMgr;

  /** @type {OPCItemManager} */
  opcItemMgr;

  /** @type {OPCSyncIO} */
  opcSyncIo;

  /** @type {Number} */
  clientHandlePtr;

  /** @type {[]} */
  serverHandles;

  /** @type {[]} */
  clientHandles;

  /** @type {boolean} */
  readInProgress;

  /** @type {boolean} */
  connected;

  /** @type {Number} */
  readDeferred;

  /** @type {Object} */
  oldItems;

  /** @type {Number} */
  updateRate;

  /** @type {boolean} */
  validate;

  /** @type {boolean} */
  isOnCleanUp;

  /** @type {{name: String, server: Server, updaterate: String, deadband: String, active: boolean, validate: boolean, varTable: []}}
   * varTable Lista com itens do grupo a ser criado.
   * */
  config;

  /** @type {String} */
  status;

  /** @type {Timeout} */
  timer;

  /** @type {Number} @const*/
  MIN_UPDATE_RATE = 100;

  /**
   * @param {Object} config
   * @param {Server} config.server Instância de um servidor OPC-DA criada.
   * @param {boolean} config.active
   * @param {boolean} config.validate
   * @param {object[]} config.varTable
   */
  constructor(config) {
    super();
    EventEmitter.call(this);

    this.updateRate = config.updateRate;
    this.validate = config.validate;

    this.status = 'unknown';

    this.serverHandles = [];
    this.clientHandles = [];

    this.readInProgress = false;
    this.connected = false;
    this.readDeferred = 0;
    this.oldItems = {};
    this.isOnCleanUp = false;

    this.config = config;
  }

  /**
   * @private
   * @param {OPCGroupStateManager} newGroup
   */
  async setup(newGroup) {
    // if (this.server.getStatus() === 'online') {
    //   this.server.createGroup(this);
    // }

    clearInterval(this.timer);

    try {
      this.opcGroupMgr = newGroup;
      this.opcItemMgr = await this.opcGroupMgr.getItemManager();
      this.opcSyncIo = await this.opcGroupMgr.getSyncIO();

      this.clientHandlePtr = 1;
      this.clientHandles = [];
      this.serverHandles = [];
      this.connected = true;
      this.readInProgress = false;
      this.readDeferred = 0;

      const items = this.config.varTable || [];
      if (items.length < 1) {
        new ConsoleLog('warn').printConsole(['[GROUP] - Sem itens na criação de um grupo']);
      }

      const itemsList = items.map((item) => {
        // Verificar clientHandle para dar números aleatórios, lib já faz isso.
        return {itemID: item, clientHandle: this.clientHandlePtr++};
      });

      const resAddItems = await this.opcItemMgr.add(itemsList);

      for (let i = 0; i < resAddItems.length; i++) {
        const resItem = resAddItems[i];
        const item = itemsList[i];

        // eslint-disable-next-line no-negated-condition
        if (resItem[0] !== 0) {
          new ConsoleLog('error').printConsole(`Error adding item '${itemsList[i].itemID}': ${this.errorMessage(resItem[0])}`);
        } else {
          this.serverHandles.push(resItem[1].serverHandle);
          this.clientHandles[item.clientHandle] = item.itemID;
        }
      }
    } catch (err) {
      const error = err || err.stack;
      new ConsoleLog('error').printConsole(`Error on setting up group: ${error}`);
    }

    // we set up the timer regardless the result of setting up items
    // we may support adding items at a later time
    if (this.updateRate < this.MIN_UPDATE_RATE) {
      this.updateRate = this.MIN_UPDATE_RATE;
      new ConsoleLog('warn').printConsole('opc-da.warn.minupdaterate', {value: `${this.updateRate}ms`});
    }

    if (this.config.active) {
      this.timer = setInterval(this.doCycle, this.updateRate);
      this.doCycle();
    }

    // this.on('close', async function(done) {
    //   server.unregisterGroup(this);
    //   await cleanup();
    //   new ConsoleLog('info').printConsole("group cleaned");
    //   done();
    // });

    const error = this.registerGroupOnServer(this);
    if (error) {
      new ConsoleLog('error').printConsole(`[GROUP] ${error}`);
    }
  }

  /**
   * Registra novo grupo em Server.groups (MAP)
   * @private
   * @param {this} group
   */
  registerGroupOnServer(group) {
    if (this.config.server.groups.has(this.config.name)) {
      new ConsoleLog('warn').printConsole('[SERVER] - Grupo já existe!');
    } else {
      this.config.server.groups.set(this.config.name, group);
    }
  }

  /** Apaga e finaliza todas as relações a instancia atual do grupo */
  async cleanup() {
    if (this.isOnCleanUp) { return; }
    this.isOnCleanUp = true;

    clearInterval(this.timer);
    this.clientHandlePtr = 1;
    this.clientHandles.length = 0;
    this.serverHandles = [];

    try {
      if (this.opcSyncIo) {
        new ConsoleLog('info').printConsole("[Group] - opcSync - Encerrando conexões de sincronia com itens do grupo.");
        await this.opcSyncIo.end()
          .then(new ConsoleLog('info').printConsole("[Group] - opcSync - Conexões de sincronia com itens do grupo encerradas!"))
          .then(this.opcSyncIo = null)
          .catch((err) => { throw err; });
      }

      if (this.opcItemMgr) {
        new ConsoleLog('info').printConsole("[Group] - opcItemMgr - Apagando gerenciador de itens do grupo.");
        await this.opcItemMgr.end()
          .then(new ConsoleLog('info').printConsole("[Group] - opcItemMgr - Gerenciador de itens do grupo apagado!"))
          .then(this.opcItemMgr = null)
          .catch((err) => { throw err; });
      }

      if (this.opcGroupMgr) {
        new ConsoleLog('info').printConsole("[Group] - opcGroupMgr - Apagando gerenciador do grupo.");
        await this.opcGroupMgr.end()
          .then(new ConsoleLog('info').printConsole("[Group] - opcGroupMgr - Gerenciador do grupo apagado!"))
          .then(this.opcGroupMgr = null)
          .catch((err) => { throw err; });
      }
    } catch (err) {
      this.isOnCleanUp = false;
      const error = err || err.stack;
      new ConsoleLog('error').printConsole(`Error on cleaning up group: ${error}`);
    }
    this.isOnCleanUp = false;
  }

  async doCycle() {
    if (this.connected && !this.readInProgress) {
      if (!this.serverHandles.length) { return; }

      this.readInProgress = true;
      this.readDeferred = 0;
      await this.opcSyncIo.read(constants.opc.dataSource.DEVICE, this.serverHandles)
        .then(this.cycleCallback).catch(this.cycleError);
    } else {
      this.readDeferred++;
      if (this.readDeferred > 15) {
        new ConsoleLog('warn').printConsole("opc-da.error.noresponse");
        clearInterval(this.timer);
                // since we have no good way to know if there is a network problem
                // or if something else happened, restart the whole thing
        this.config.server.reConnect();
      }
    }
  }

  cycleCallback(values) {
    this.readInProgress = false;

    if (this.readDeferred && this.connected) {
      this.doCycle();
      this.readDeferred = 0;
    }
        // sanitizeValues(values);
    let changed = false;
    for (const item of values) {
      const itemID = this.clientHandles[item.clientHandle];

      if (!itemID) {
        // eslint-disable-next-line no-warning-comments
        // TODO - what is the right to do here?
        new ConsoleLog('warn').printConsole("Server replied with an unknown client handle");
        continue;
      }

      const oldItem = this.oldItems[itemID];

      if (!oldItem || oldItem.quality !== item.quality || !this.equals(oldItem.value, item.value)) {
        changed = true;
        this.emit(itemID, item);
        this.emit('__CHANGED__', {itemID, item});
      }
      this.oldItems[itemID] = item;
    }
    this.emit('__ALL__', this.oldItems);
    if (changed) { this.emit('__ALL_CHANGED__', this.oldItems); }
  }

  cycleError(err) {
    this.readInProgress = false;
    new ConsoleLog('error').printConsole(`Error reading items: ${err}` && (err.stack || err));
  }

  onServerStatus(status) {
    this.status = status;
    this.emit('__STATUS__', status);
  }

  getStatus() {
    return this.status;
  }

//   /**
//    * @private
//    * @param {OPCGroupStateManager} newOpcGroup
//    */
//   async updateInstance(newOpcGroup, config) {
//     // await cleanup();
//     await this.setup(newOpcGroup);
//   }

  /**
  * Compares values for equality, includes special handling for arrays.
  * @private
  * @param {number|string|Array} first
  * @param {number|string|Array} second
  */
  equals(first, second) {
    if (first === second) { return true; }
    if (first == null || second == null) { return false; }
    if (Array.isArray(first) && Array.isArray(second)) {
      if (first.length !== second.length) { return false; }

      for (let i = 0; i < first.length; ++i) {
        if (first[i] !== second[i]) { return false; }
      }
      return true;
    }
    return false;
  }

}
