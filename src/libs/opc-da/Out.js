import {EventEmitter} from 'events';

import ConsoleLog from '../ConsoleLog';

import Status from './Status';
// Only for lint
// eslint-disable-next-line import/no-cycle
import Group from './Group';

export default class Out extends EventEmitter {

  /**
   * @typedef OutConfig
   * @type {Object}
   * @property {Group} group
   * @property {String} item
   */

  /** @type {OutConfig} */
  outConfig;

  /** @type {[]} */
  statusValue;

  /** @type {Status} */
  status;

  /**
   * ---------- OPC-DA Out ----------
   * @param {OutConfig} outConfig
   */
  constructor(outConfig) {
    super();
    EventEmitter.call(this);

    const onGroupStatus = (status) => this.onGroupStatus(status);

    this.status = new Status();
    this.outConfig = outConfig;
    this.outConfig.group.on('__STATUS__', onGroupStatus);

    // new ConsoleLog('info:out').printConsole(this.status.generateStatus(this.outConfig.group.getStatus(), this.statusValue));

    const onNewMsg = (msg) => this.onNewMsg(msg);
    this.on('input', onNewMsg);

    this.on('close', () => {
      this.outConfig.group.removeListener('__STATUS__', onGroupStatus);
    });

  }

  onGroupStatus(status) {
    new ConsoleLog('info:out').printConsole(this.status.generateStatus(status.status, this.statusValue));
  }

  onNewMsg(msg) {
    const writeObj = {
      name: this.outConfig.item || msg.item,
      val: msg.payload,
    };

    if (!writeObj.name) { return; }

    this.statusValue = writeObj.val;
    this.outConfig.group.writeVar(writeObj);
    // new ConsoleLog('info:out').printConsole(this.status.generateStatus(this.outConfig.group.getStatus(), this.statusValue));
  }
}
