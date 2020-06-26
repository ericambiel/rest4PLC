import {EventEmitter} from 'events';

// eslint-disable-next-line no-unused-vars
import OPCItemManager from 'node-opc-da/src/opcItemManager';
// eslint-disable-next-line no-unused-vars
import OPCGroupStateManager from 'node-opc-da/src/opcGroupStateManager';
// eslint-disable-next-line no-unused-vars
import OPCSyncIO from 'node-opc-da/src/opcAsyncIO';
import constants from 'node-opc-da/src/constants';

import ConsoleLog from '../ConsoleLog';


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

  status;
  timer;

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

  /** @type {Number} */
  deadband;

  /** @type {boolean} */
  validate;

  /** @type {boolean} */
  onCleanUp;

  /** @type {{server: String, updaterate: String, deadband: String, active: boolean, validate: boolean, vartable: []}} */
  config;

  /** @type {{active: boolean, updateRate: Number, timeBias: Number, deadband: Number}} */
  opcConfig;

  /** @type {Number} @const*/
  MIN_UPDATE_RATE = 100;

  constructor() {
    super();
    EventEmitter.call(this);
  }

    /**
     * @param {object} config
     * @param {string} config.server
     * @param {string} config.updaterate
     * @param {string} config.deadband
     * @param {boolean} config.active
     * @param {boolean} config.validate
     * @param {object[]} config.vartable
     */
  OPCDAGroup(config) {

    // node.server = RED.nodes.getNode(config.server);

    // if (!node.server || !node.server.registerGroup) {
    //   return node.error(RED._("opc-da.error.missingconfig"));
    // }

    this.serverHandles = [];
    this.clientHandles = [];

    this.readInProgress = false;
    this.connected = false;
    this.readDeferred = 0;
    this.oldItems = {};
    this.updateRate = 1000;
    this.deadband = 0;
    this.validate = false;
    this.onCleanUp = false;

    node.on('close', async function(done) {
      node.server.unregisterGroup(this);
      await cleanup();
      new ConsoleLog('info').printConsole("group cleaned");
      done();
    });
    const err = node.server.registerGroup(this);
    if (err) {
      new ConsoleLog('error').printConsole(err, {error: err});
    }

    this.config = config;
    this.opcConfig = {
      active: config.active,
      updateRate: this.updateRate,
      timeBias: 0,
      deadband: this.deadband || 0,
    };

    if (node.server.getStatus() === 'online') {
      node.server.createGroup(this);
    }
  }

    /**
     * @private
     * @param {OPCGroupStateManager} newGroup
     */
  async setup(newGroup) {
    // Declarar um valor para time
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

      const items = this.config.vartable || [];
      if (items.length < 1) {
        new ConsoleLog('warn').printConsole("opc-da.warn.noitems");
      }

      const itemsList = items.map((item) => {
        // Verificar clientHandle para dar números aleatórios, lib já faz isso.
        return {itemID: item.item, clientHandle: this.clientHandlePtr++};
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
      new ConsoleLog('info').printConsole(err);
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
  }

  async cleanup() {
    if (this.onCleanUp) { return; }
    this.onCleanUp = true;

    clearInterval(this.timer);
    this.clientHandlePtr = 1;
    this.clientHandles.length = 0;
    this.serverHandles = [];

    try {
      if (this.opcSyncIo) {
        await this.opcSyncIo.end();
        new ConsoleLog('info').printConsole("GroupCLeanup - opcSync");
        this.opcSyncIo = null;
      }

      if (this.opcItemMgr) {
        await this.opcItemMgr.end();
        new ConsoleLog('info').printConsole("GroupCLeanup - opcItemMgr");
        this.opcItemMgr = null;
      }

      if (this.opcGroupMgr) {
        await this.opcGroupMgr.end();
        new ConsoleLog('info').printConsole("GroupCLeanup - this.opcGroupMgr");
        this.opcGroupMgr = null;
      }
    } catch (err) {
      this.onCleanUp = false;
      const error = err || err.stack;
      new ConsoleLog('info').printConsole(err);
      new ConsoleLog('error').printConsole(`Error on cleaning up group: ${error}`);
    }
    this.onCleanUp = false;
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
        node.server.reConnect();
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

  /**
   * @private
   * @param {OPCGroupStateManager} newOpcGroup
   */
  async updateInstance(newOpcGroup) {
          // await cleanup();
    await this.setup(newOpcGroup);
  }

  /**
  * Compares values for equality, includes special handling for arrays.
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