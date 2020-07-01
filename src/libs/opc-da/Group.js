import {EventEmitter} from 'events';

import constants from 'node-opc-da/src/constants';

import ConsoleLog from '../ConsoleLog';

import In from './In';
import Out from './Out';
// Only for lint
// eslint-disable-next-line import/no-cycle
import Server from './Server';

export default class Group extends EventEmitter {

  /**
   * @typedef {import ('node-opc-da/src/opcGroupStateManager')} OPCGroupStateManager
   * @typedef {import ('node-opc-da/src/opcItemManager')} OPCItemManager
   * @typedef {import ('node-opc-da/src/opcSyncIO')} OPCSyncIO
   */

  /**
   * @typedef GrpConfig
   * @type {Object}
   * @property {String} name - Nome do Grupo
   * @property {Server} server - Instância da classe Server.
   * @property {[]} varTable - Lista com itens a serem inseridos, adquira com BrowseFlat
   * @property {boolean} [validate=false]
   * @property {boolean} [active=true]
   * @property {Number} [updateRate=1000] - Tempo de atualização dos itens do grupo
   * @property {Number} [timeBias=0] - %
   * @property {Number} [gdeadband=0]
   */

  /**
   * @typedef OPCSyncIORead Lista com valores retornado por opcSyncIO.
   * @type {[ResObj, {errorCode: Number}]}
   *
   * @typedef ResObj Objeto retornado por extração de valores de um item.
   * @type {Object}
   * @property {number} errorCode - Código de error.
   * @property {number} clientHandle - Identificador do item no cliente.
   * @property {Date} timestamp - Data da aquisição do valor.
   * @property {Number} quality - Qualidade do valor obtido, ex: 192 = good.
   * @property {*} reserved
   * @property {*} value - Valor do item lido.
   */

  /** @type {OPCGroupStateManager} */
  opcGroupMgr;

  /** @type {OPCItemManager} */
  opcItemMgr;

  /** @type {OPCSyncIO} */
  opcSyncIo;

  /** @type {In} */
  in;

  /** @type {Out} */
  out;

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

  /** @type {GrpConfig} */
  grpConfig;

  /** @type {String} */
  status;

  /** @type {Timeout} */
  timer;

  /** @constant @type {Number} @default 100*/
  MIN_UPDATE_RATE = 100;

  /**
   * ---------- OPC-DA Group ----------
   * @param {GrpConfig} grpConfig
   */
  constructor(grpConfig) {
    super();
    EventEmitter.call(this);
    // this.in = new In({group: this, item: grpConfig.varTable});
    // this.out = new Out({group: this, item: grpConfig.varTable});

    if (!grpConfig.validade) { grpConfig.validate = false; }
    if (!grpConfig.active) { grpConfig.active = true; }
    if (!grpConfig.updateRate) { grpConfig.updateRate = 1000; }
    if (!grpConfig.timeBias) { grpConfig.timeBias = 0; }
    if (!grpConfig.gdeadband) { grpConfig.gdeadband = 0; }

    this.validate = grpConfig.validate;
    this.updateRate = grpConfig.updateRate;

    this.status = 'unknown';

    this.serverHandles = [];
    this.clientHandles = [];

    this.readInProgress = false;
    this.connected = false;
    this.readDeferred = 0;
    this.oldItems = {};
    this.isOnCleanUp = false;

    this.grpConfig = grpConfig;
  }

  /**
   * @param {OPCGroupStateManager} newGroup
   */
  async setup(newGroup) {
    try {

      clearInterval(this.timer);
      this.opcGroupMgr = newGroup;
      this.opcItemMgr = await this.opcGroupMgr.getItemManager();
      this.opcSyncIo = await this.opcGroupMgr.getSyncIO();

      this.clientHandlePtr = 1;
      this.clientHandles = [];
      this.serverHandles = [];
      this.connected = true;
      this.readInProgress = false;
      this.readDeferred = 0;

      const items = this.grpConfig.varTable || [];
      if (items.length < 1) {
        new ConsoleLog('warn:group').printConsole(`Sem itens na criação do grupo: ${this.grpConfig.name}`);
      }

      const itemsList = items.map((item) => {
        // Verificar clientHandle para dar números aleatórios, lib já faz isso.
        return {itemID: item, clientHandle: this.clientHandlePtr++};
      });

      const resAddItems = await this.opcItemMgr.add(itemsList);

      for (let i = 0; i < resAddItems.length; i++) {
        const resItem = resAddItems[i];
        const item = itemsList[i];

        if (resItem[0] === 0) {
          this.serverHandles.push(resItem[1].serverHandle);
          this.clientHandles[item.clientHandle] = item.itemID;
        } else {
          new ConsoleLog('error:group').printConsole(`Error adding item '${itemsList[i].itemID}': ${this.errorMessage(resItem[0])} to group: ${this.grpConfig.name}`);
        }
      }

      this.in = new In({group: this, item: this.grpConfig.varTable});
      this.out = new Out({group: this, item: this.grpConfig.varTable});
    } catch (err) {
      const error = err || err.stack;
      new ConsoleLog('error:group').printConsole(`Error on setting up group: ${this.grpConfig.name}, erro: ${error}`);
    }

    // we set up the timer regardless the result of setting up items
    // we may support adding items at a later time
    if (this.updateRate < this.MIN_UPDATE_RATE) {
      this.updateRate = this.MIN_UPDATE_RATE;
      new ConsoleLog('warn:group').printConsole(`Valor minimo para updateRate: ${this.updateRate}ms`);
    }

    if (this.grpConfig.active) {
      this.timer = setInterval(() => this.doCycle(), this.updateRate);
      this.doCycle();
    }

    this.on('close', async (done) => {
      this.grpConfig.server.unregisterGroup(this);
      await this.cleanup();
      new ConsoleLog('info:group').printConsole("group cleaned");
      done();
    });
  }

  /** Apaga e finaliza todas as relações a instancia atual do grupo */
  async cleanup() {
    try {
      if (this.isOnCleanUp) { return; }
      this.isOnCleanUp = true;

      clearInterval(this.timer);
      this.clientHandlePtr = 1;
      this.clientHandles.length = 0;
      this.serverHandles = [];

      if (this.opcSyncIo) {
        await this.opcSyncIo.end()
          .then(() => {
            new ConsoleLog('info:group').printConsole("opcSync - Conexões de sincronia com itens do grupo encerradas!");
            this.opcSyncIo = null;
          })
          .catch((err) => { throw err; });
      }

      if (this.opcItemMgr) {
        await this.opcItemMgr.end()
          .then(() => {
            new ConsoleLog('info:group').printConsole("opcItemMgr - Gerenciador de itens do grupo apagado!");
            this.opcItemMgr = null;
          }).catch((err) => { throw err; });
      }

      if (this.opcGroupMgr) {
        await this.opcGroupMgr.end()
          .then(() => {
            new ConsoleLog('info:group').printConsole("opcGroupMgr - Gerenciador do grupo apagado!");
            this.opcGroupMgr = null;
          }).catch((err) => { throw err; });
      }

    } catch (err) {
      this.isOnCleanUp = false;
      const error = err || err.stack;
      new ConsoleLog('error:group').printConsole(`Error on cleaning up group: ${this.grpConfig.name}, ${error}`);
    }
    this.isOnCleanUp = false;
  }

  async doCycle() {
    if (this.connected && !this.readInProgress) {
      if (!this.serverHandles.length) { return; }

      this.readInProgress = true;
      this.readDeferred = 0;
      await this.opcSyncIo.read(constants.opc.dataSource.DEVICE, this.serverHandles)
        .then((res) => this.cycleCallback(res))
        .catch((err) => this.cycleError(err));
    } else {
      this.readDeferred++;
      if (this.readDeferred > 15) {
        new ConsoleLog('warn:group').printConsole(`Sem resposta para itens do grupo: ${this.grpConfig.name}`);
        clearInterval(this.timer);
        // since we have no good way to know if there is a network problem
        // or if something else happened, restart the whole thing
        this.grpConfig.server.reConnect();
      }
    }
  }

   /**
   * @param {OPCSyncIORead} res Lista com valores retornado por opcSyncIO.
   */
  cycleCallback(res) {
    this.readInProgress = false;

    if (this.readDeferred && this.connected) {
      this.doCycle();
      this.readDeferred = 0;
    }
        // sanitizeValues(resObj);
    let changed = false;
    for (const item of res) {
      const itemID = this.clientHandles[item.clientHandle];

      if (!itemID) {
        // eslint-disable-next-line no-warning-comments
        // TODO - what is the right to do here?
        new ConsoleLog('warn:group').printConsole(`Server replied with an unknown client handle, group: ${this.grpConfig.name}`);
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
    new ConsoleLog('error:group').printConsole(`Error reading items, group: ${this.grpConfig.name}, error: ${err}`);
  }

  onServerStatus(status) {
    this.status = status;
    this.emit('__STATUS__', status);
  }

  getStatus() {
    return this.status;
  }

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
