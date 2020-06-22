// import {EventEmitter} from 'events';

const opc = require('node-opc-da');
const dcom = require('node-dcom');

// const dcom = require('node-dcom');

const {ComServer, Session, Clsid} = dcom;
const {OPCServer} = opc;

export default class OPC {

    /**
     *
     * @param {String} address
     * @param {String} domain
     * @param {String} user
     * @param {String} pass
     * @param {String} clsid
     * @param {object} [opts]
     * @returns {Promise<{comServer:ComServer, opcServer:OPCServer}>}
     */
  async createServer(address: String, domain:String, user:String, pass:String, clsid:String, opts:any) {
    try {
      // EventEmitter.call(this);
      let session = new Session();
      session = session.createSession(domain, user, pass);
      session.setGlobalSocketTimeout(7000);

      const comServer = new ComServer(new Clsid(clsid), address, session);

      console.log(`debug`);
      await comServer.init();
      const comObject = await comServer.createInstance();

      const opcServer = new OPCServer(opts);
      await opcServer.init(comObject);

      return {comServer, opcServer};
    } catch (err) { throw Error(err); }
  }
}
