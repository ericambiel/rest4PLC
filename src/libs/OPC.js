import {EventEmitter} from 'events';

import OPCServer from 'node-opc-da/src/opcServer';
import OPCBrowser from 'node-opc-da/src/opcBrowser';
import OPCItemManager from 'node-opc-da/src/opcItemManager';
import OPCGroupManagerStateManager from 'node-opc-da/src/opcGroupManagerStateManager';
import ComServer from 'node-dcom/dcom/core/comserver';
import Session from 'node-dcom/dcom/core/session';
import Clsid from 'node-dcom/dcom/core/clsid';


// import {ComServer, Session, Clsid} from 'node-dcom';
// // eslint-disable-next-line no-unused-vars
// import {OPCServer, OPCBrowser, OPCGroupManagerStateManager, OPCItemManager} from 'node-opc-da';


// const opc = require('node-opc-da');
// const dcom = require('node-dcom');

// 563D903B-03B2-4641-89D0-A99E6C5A6C2C => RSLinx Enterprise Runtime
// A05BB6D6-2F8A-11D1-9BB0-080009D01446 => RSLinx Gateway

// eslint-disable-next-line no-warning-comments
// TODO:  OPCGroupManagerStateManager: atach()
export default class OPCDA extends EventEmitter {

  /** @type OPCBrowser */
  opcBrowser;

  /** @type ComServer */
  _comServer;

  /** @type OPCServer */
  _opcServer;

  /** @type OPCGroupManagerStateManager */
  // _opcGroupManager;

  /** @type OPCItemManager */
  // _opcItemManager;

  constructor(address, domain, user, pass, clsid, opts) {
    try {
      super();
      this.createServerConn(address, domain, user, pass, clsid, opts);
    } catch (err) { throw Error(err); }
  }

    /**
     * Cria conexão com Servidor OPC DA
     * @param {String} address       Endereço IP/Hostname do Servidor OPC remoto.
     * @param {String} domain        Nome do domínio Microsoft.
     * @param {String} user          Usuário de rede com acesso OPC ao servidor.
     * @param {String} pass          Senha de usuário.
     * @param {String} clsid         CLSID do servidor OPC no host de destino.
     * @param {object|null} [opts]   Opções de configuração adicionais.
     * @returns {Promise<{comServer:ComServer, opcServer:OPCServer}>}
     */
  async createServerConn(address, domain, user, pass, clsid, opts) {
    try {
      EventEmitter.call(this);

      let session = new Session();
      session = session.createSession(domain, user, pass);
      session.setGlobalSocketTimeout(7000);

      this._comServer = new ComServer(new Clsid(clsid), address, session);
      this._opcServer = new OPCServer(opts);

      await this._comServer.init();

      const comObject = await this._comServer.createInstance();

      await this._opcServer.init(comObject);

      this.opcBrowser = await this._opcServer.getBrowser();
    } catch (err) { throw Error(err); }
  }

  /**
   * @returns {Promise<[{itemID: String}]>}
   */
  async getAllFlat() {
    try {
      const listFoundItems = await this.opcBrowser.browseAllFlat();
      return listFoundItems.map((item) => {
        return ({itemID: item});
      });
    } catch (err) { throw Error(err.message); }
  }

    /**
     * Cria um grupo com itens lidos de um Servido OPC DA
     * @param {String} groupName Nome do grupo de Itens a ser formado
     * @param {[{itemID: String}] | [{itemID: String, clientHandle: number}]} items Itens a serem colocado no grupo, obter por getAllTree|getAllFlat
     * @returns
     */
  async createGroupItems(groupName, items) {
    try {
      const opcGroupManager = await this._opcServer.addGroup(groupName);
      const opcItemManager = await opcGroupManager.getItemManager();
      return await opcItemManager.add(items);
    } catch (err) { throw Error(err.message); }
  }

  /**
   * Valida se item é valido para leitura
   * @param {[{itemID: String, clientHandle: number|null}]} items
   */
  async validateItem(items) {
    try {
      return await this._opcItemManager.validate(items);
    } catch (err) { throw Error(err.message); }
  }

  async getValuesSync(groupName, itemsGroup) {
    try {
      const opcGroupManager = await this._opcServer.getGroupByName(groupName);
      // const opcItemManager = await opcGroupManager.getItemManager();
      // console.log(await opcGroupManager.getState());
      const opcSyncIO = await opcGroupManager.getSyncIO();
      // OPC_DS_CACHE ( 1 ), OPC_DS_DEVICE ( 2 ), OPC_DS_UNKNOWN ( 0 );
      return await opcSyncIO.read([1], [itemsGroup[3][1].serverHandle]);
    } catch (err) { throw Error(err.message); }
  }
// await opcSyncIO.write([{handle: itemsGroup[0][1].serverHandle, type: 9, value: 50}])
}

// module.exports = OPC;
