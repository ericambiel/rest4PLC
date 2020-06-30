// eslint-disable-next-line no-unused-vars
import Group from './Group';

export default class In {

  /**
   * @typedef InConfig
   * @type {Object}
   * @property {Group} group
   * @property {String} item
   * @property {String} mode
   * @property {boolean} diff
   */

  /** @type {[]} */
  statusVal;

  /**
   * @param {InConfig} inConfig
   */
  constructor(inConfig) {
    this.inConfig = inConfig;

    this.inConfig.group.on('__STATUS__', onGroupStatus);
    this.status(generateStatus(this.group.getStatus(), this.statusVal));


    if (this.inConfig.diff) {
      switch (this.inConfig.mode) {
        case 'all-split':
          this.group.on('__CHANGED__', onChanged);
          break;
        case 'single':
          this.group.on(this.inConfig.item, onData);
          break;
        case 'all':
        default:
          this.group.on('__ALL_CHANGED__', onData);
      }
    } else {
      switch (this.inConfig.mode) {
        case 'all-split':
          this.group.on('__ALL__', onDataSplit);
          break;
        case 'single':
          this.group.on('__ALL__', onDataSelect);
          break;
        case 'all':
        default:
          this.group.on('__ALL__', onData);
      }
    }

    this.on('close', (done) => {
      this.group.removeListener('__ALL__', onDataSelect);
      this.group.removeListener('__ALL__', onDataSplit);
      this.group.removeListener('__ALL__', onData);
      this.group.removeListener('__ALL_CHANGED__', onData);
      this.group.removeListener('__CHANGED__', onChanged);
      this.group.removeListener('__STATUS__', onGroupStatus);
      this.group.removeListener(this.inConfig.item, onData);
      done();
    });
  }

  sendMsg(data, key, status) {
    // if there is no data to be sent
    if (!data) { return; }
    if (key === undefined) { key = ''; }

    let msg;
    // should be the case when mode == 'all'
    if (key === '') {
      const newData = new Array();
      for (const key in data) {
        newData.push({
          errorCode: data[key].errorCode,
          value: data[key].value,
          quality: data[key].quality,
          timestamp: data[key].timestamp,
          topic: key,
        });
      }

      msg = {
        topic: "all",
        payload: newData,
      };
    } else {
      if (data.errorCode !== 0) {
            // TODO i18n and this status handling
        msg = {
          errorCode: data.errorCode,
          payload: data.value,
          quality: data.quality,
          timestamp: data.timestamp,
          topic: key,
        };
        this.error(`Read of item '${key}' returned error: ${data.errorCode}`, msg);
        return;
      }

      msg = {
        payload: data.value,
        quality: data.quality,
        timestamp: data.timestamp,
        topic: key,
      };
    }
    this.statusVal = status !== undefined ? status : data;
    this.send(msg);
    this.status(generateStatus(this.group.getStatus(), this.statusVal));
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
    this.sendMsg(data, this.inConfig.mode == 'single' ? this.inConfig.item : '');
  }

  onDataSelect(data) {
    onData(data[this.inConfig.item]);
  }

  onGroupStatus(s) {
    this.status(generateStatus(s.status, this.statusVal));
  }
}
