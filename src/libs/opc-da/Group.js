import {EventEmitter} from 'events';

import {OPCItemManager, OPCSyncIO, OPCGroupStateManager} from 'node-opc-da';

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
  oldItems = {};

  /** @type {Number} */
  updateRate;

  /** @type {Number} */
  deadband;

  /** @type {boolean} */
  validate;

  /** @type {boolean} */
  onCleanUp;

  constructor() {
    super();
    EventEmitter.call(this);
    this.readInProgress = true;
    this.connected = false;
    this.readDeferred = 0;
    this.oldItems = {};
    this.updateRate = 1000;
    this.deadband = 0;
    this.validate = false;
    this.onCleanUp = false;

    this.clientHandlePtr = 1;
    this.serverHandles = [];
    this.clientHandles = [];
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

    const node = this;


    // node.server = RED.nodes.getNode(config.server);
    // if (!node.server || !node.server.registerGroup) {
    //   return node.error(RED._("opc-da.error.missingconfig"));
    // }

    // if (node.server.getStatus() == 'online') {
    //   node.server.createGroup(this);
    // }

    const err = node.server.registerGroup(this);
    if (err) {
      node.error(err, {error: err});
    }

    this.on('close', async function(done) {
      this.server.unregisterGroup(this);
      await this.cleanup();
      console.log("group cleaned");
      done();
    });

  }

    /**
     * @private
     * @param {OPCGroupStateManager} newGroup
     */
  async setup(newGroup) {
    clearInterval(timer);
    try {
      opcGroupMgr = newGroup;
      opcItemMgr = await opcGroupMgr.getItemManager();
      opcSyncIo = await opcGroupMgr.getSyncIO();

      clientHandlePtr = 1;
      clientHandles.length = 0;
      serverHandles = [];
      connected = true;
      readInProgress = false;
      readDeferred = 0;

      const items = config.vartable || [];
      if (items.length < 1) {
        node.warn("opc-da.warn.noitems");
      }

      const itemsList = items.map((e) => {
        return {itemID: e.item, clientHandle: clientHandlePtr++};
      });

      const resAddItems = await opcItemMgr.add(itemsList);

      for (let i = 0; i < resAddItems.length; i++) {
        const resItem = resAddItems[i];
        const item = itemsList[i];

        if (resItem[0] !== 0) {
          node.error(`Error adding item '${itemsList[i].itemID}': ${errorMessage(resItem[0])}`);
        } else {
          serverHandles.push(resItem[1].serverHandle);
          clientHandles[item.clientHandle] = item.itemID;
        }
      }
    } catch (e) {
      const err = e && e.stack || e;
      console.log(e);
      node.error(`Error on setting up group: ${err}`);
    }

        // we set up the timer regardless the result of setting up items
        // we may support adding items at a later time
    if (updateRate < MIN_UPDATE_RATE) {
      updateRate = MIN_UPDATE_RATE;
      node.warn(RED._('opc-da.warn.minupdaterate', {value: `${updateRate}ms`}));
    }

    if (config.active) {
      timer = setInterval(doCycle, updateRate);
      doCycle();
    }
  }

  async cleanup() {
    if (onCleanUp) { return; }
    onCleanUp = true;

    clearInterval(timer);
    clientHandlePtr = 1;
    clientHandles.length = 0;
    serverHandles = [];

    try {
      if (opcSyncIo) {
        await opcSyncIo.end();
        console.log("GroupCLeanup - opcSync");
        opcSyncIo = null;
      }

      if (opcItemMgr) {
        await opcItemMgr.end();
        console.log("GroupCLeanup - opcItemMgr");
        opcItemMgr = null;
      }

      if (opcGroupMgr) {
        await opcGroupMgr.end();
        console.log("GroupCLeanup - opcGroupMgr");
        opcGroupMgr = null;
      }
    } catch (e) {
      onCleanUp = false;
      const err = e && e.stack || e;
      console.log(e);
      node.error(`Error on cleaning up group: ${err}`);
    }
    onCleanUp = false;
  }

  async doCycle() {
    if (connected && !readInProgress) {
      if (!serverHandles.length) { return; }

      readInProgress = true;
      readDeferred = 0;
      await opcSyncIo.read(opcda.constants.opc.dataSource.DEVICE, serverHandles)
        .then(cycleCallback).catch(cycleError);
    } else {
      readDeferred++;
      if (readDeferred > 15) {
        node.warn(RED._("opc-da.error.noresponse"), {});
        clearInterval(timer);
                // since we have no good way to know if there is a network problem
                // or if something else happened, restart the whole thing
        node.server.reConnect();
      }
    }
  }

  cycleCallback(values) {
    readInProgress = false;

    if (readDeferred && connected) {
      doCycle();
      readDeferred = 0;
    }
        // sanitizeValues(values);
    let changed = false;
    for (const item of values) {
      const itemID = clientHandles[item.clientHandle];

      if (!itemID) {
                // TODO - what is the right to do here?
        node.warn("Server replied with an unknown client handle");
        continue;
      }

      const oldItem = oldItems[itemID];

      if (!oldItem || oldItem.quality !== item.quality || !equals(oldItem.value, item.value)) {
        changed = true;
        node.emit(itemID, item);
        node.emit('__CHANGED__', {itemID, item});
      }
      oldItems[itemID] = item;
    }
    node.emit('__ALL__', oldItems);
    if (changed) { node.emit('__ALL_CHANGED__', oldItems); }
  }

  cycleError(err) {
    readInProgress = false;
    node.error(`Error reading items: ${err}` && err.stack || err);
  }


  onServerStatus(s) {
    this.status = s;
    this.emit('__STATUS__', s);
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

}
