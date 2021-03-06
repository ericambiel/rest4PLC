import {EventEmitter} from 'events';

import ConsoleLog from '../ConsoleLog';

import Status from './Status';
// Only for lint
// eslint-disable-next-line import/no-cycle
import Group from './Group';

export default class In extends EventEmitter {

  /**
   * @typedef InConfig
   * @type {Object}
   * @property {Group} group - Instancia do grupo a ser lido os itens.
   * @property {String} item - Itens a serem lidos monitorados.
   * @property {String} [mode='all'] - all, all-split, single.
   * @property {boolean} [diff=true] - Reportar somente quando dados se alterarem.
   */

  /** @type {[]} */
  statusValue;

  /** @type {Status} */
  status;

  /** @type {ConsoleLog} */
  debug;

  /**
   * ---------- OPC-DA In ----------
   * @param {InConfig} inConfig
   */
  constructor(inConfig) {
    super();
    EventEmitter.call(this);

    this.status = new Status();
    this.debug = new ConsoleLog('debug:in');

    if (!inConfig.mode) { inConfig.mode = 'all'; }
    if (!inConfig.diff) { inConfig.diff = true; }

    this.inConfig = inConfig;

    const onGroupStatus = (status) => this.onGroupStatus(status);
    this.inConfig.group.on('__STATUS__', onGroupStatus);
    // new ConsoleLog('info:in').printConsole(this.status.generateStatus(this.inConfig.group.getStatus(), this.statusValue));

    // Assim é possível usar contexto de onde o evento foi emitido e remover listener pelo nome da função
    const onChanged = (elm) => this.onChanged(elm);
    const onData = (data) => this.onData(data);
    const onDataSplit = (data) => this.onDataSplit(data);
    const onDataSelect = (data) => this.onDataSelect(data);

    if (this.inConfig.diff) {
      switch (this.inConfig.mode) {
        case 'all-split':
          this.inConfig.group.on('__CHANGED__', onChanged); break;
        case 'single':
          this.inConfig.group.on(this.inConfig.item, onData); break;
        case 'all':
        default:
          this.inConfig.group.on('__ALL_CHANGED__', onData);
      }
    } else {
      switch (this.inConfig.mode) {
        case 'all-split':
          this.inConfig.group.on('__ALL__', onDataSplit); break;
        case 'single':
          this.inConfig.group.on('__ALL__', onDataSelect); break;
        case 'all':
        default:
          this.inConfig.group.on('__ALL__', onData);
      }
    }

    this.on('close', () => {
      this.inConfig.group.removeListener('__ALL__', onDataSelect);
      this.inConfig.group.removeListener('__ALL__', onDataSplit);
      this.inConfig.group.removeListener('__ALL__', onData);
      this.inConfig.group.removeListener('__ALL_CHANGED__', onData);
      this.inConfig.group.removeListener('__CHANGED__', onChanged);
      this.inConfig.group.removeListener('__STATUS__', onGroupStatus);
      this.inConfig.group.removeListener(this.inConfig.item, onData);
    });
  }

  /**
   *
   * @param {Object} data Dado obtido por leitura de um item em um grupo
   * @param {*} key
   * @param {*} status Estado atual do Grupo
   */
  sendMsg(data, key, status) {
    // if there is no data to be sent
    if (!data) { return; }

    let msg;
    // should be the case when mode == 'all'
    if (key === undefined || key === '') {
      const newData = [];

      for (const obj in data) {
        if (Object.prototype.hasOwnProperty.call(data, obj)) {
          newData.push({
            errorCode: data[obj].errorCode,
            value: data[obj].value,
            quality: data[obj].quality,
            timestamp: data[obj].timestamp,
            topic: obj,
          });
        }
      }

      msg = {
        topic: "all",
        payload: newData,
      };
    } else {
      if (data.errorCode !== 0) {
        // eslint-disable-next-line no-warning-comments
        // TODO i18n and this status handling
        msg = {
          errorCode: data.errorCode,
          payload: data.value,
          quality: data.quality,
          timestamp: data.timestamp,
          topic: key,
        };
        new ConsoleLog('error:in').printConsole(`Read of item '${key}' returned error: ${data.errorCode}, ${msg}`);
        return;
      }

      msg = {
        payload: data.value,
        quality: data.quality,
        timestamp: data.timestamp,
        topic: key,
      };
    }
    this.statusValue = status === undefined ? data : status;
    // new ConsoleLog('info:in').printConsole(this.status.generateStatus(this.inConfig.group.getStatus(), this.statusValue));
    console.log(msg);
  }

  onChanged(elm) {
    this.sendMsg(elm.item, elm.itemID, null);
  }

  onDataSplit(data) {
    Object.keys(data).forEach((key) => {
      this.sendMsg(data[key], key, null);
    });
  }

  onData(data) {
    this.sendMsg(data, this.inConfig.mode === 'single' ? this.inConfig.item : '');
  }

  onDataSelect(data) {
    this.onData(data[this.inConfig.item]);
  }

  onGroupStatus(status) {
    new ConsoleLog('info:in').printConsole(this.status.generateStatus(status.status, this.statusValue));
  }
}
