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

    this.status = new Status();
    this.outConfig = outConfig;

    this.outConfig.group.on('__STATUS__', (status) => this.onGroupStatus(status));
    new ConsoleLog('info:out').printConsole(this.status.generateStatus(this.outConfig.group.getStatus(), this.statusValue));

    this.on('input', (msg) => this.onNewMsg(msg));

    this.on('close', (done) => {
      this.outConfig.group.removeListener('__STATUS__', (status) => this.onGroupStatus(status));
      done();
    });

  }

  onGroupStatus(status) {
    new ConsoleLog('info:in').printConsole(this.status.generateStatus(status.status, this.statusValue));
  }

  onNewMsg(msg) {
    const writeObj = {
      name: this.outConfig.item || msg.item,
      val: msg.payload,
    };

    if (!writeObj.name) { return; }

    this.statusValue = writeObj.val;
    this.outConfig.group.writeVar(writeObj);
    new ConsoleLog('info:in').printConsole(this.status.generateStatus(this.outConfig.group.getStatus(), this.statusValue));
  }
}
