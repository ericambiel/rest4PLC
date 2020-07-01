export default class Status {

  generateStatus(status, value) {

    let val = value;

    if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') {
      val = 'Online';
    }

    switch (status) {
      case 'online': return val.toString();
      case 'badvalues': return 'Bad Value';
      case 'offline': return 'Off-Line';
      case 'connecting': return 'Connecting';
      default: return 'Unknown';
    }
  }
}
