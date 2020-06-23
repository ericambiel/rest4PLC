import {EventEmitter} from 'events';

const opc = require('node-opc-da');
const dcom = require('node-dcom');

const {ComServer, Session, Clsid} = dcom;
const {OPCServer, OPCBrowser, OPCGroupStateManager, OPCItemManager} = opc;

// 563D903B-03B2-4641-89D0-A99E6C5A6C2C => RSLinx Enterprise Runtime
// A05BB6D6-2F8A-11D1-9BB0-080009D01446 => RSLinx Gateway

class OPC extends EventEmitter {
  _itemsGroup = [];

  /** @type ComServer */
  _comServer;

  /** @type  OPCServer */
  _opcServer;

  /** @type OPCBrowser */
  _opcBrowser;

  /** @type OPCGroupStateManager */
  _opcGroup;

  /** @type OPCItemManager */
  _opcItemManager;

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

      this._opcBrowser = await this._opcServer.getBrowser();
    } catch (err) { throw Error(err); }
  }

  /**
   * @returns {Promise<Object>}
   */
  async getAllTree() {
    try {
      return await this._opcBrowser.browseAllTree();
    } catch (err) { throw Error(err.message); }
  }

  /**
   * @returns {Promise<[{itemID: String}]>}
   */
  async getAllFlat() {
    try {
      const listFoundItems = await this._opcBrowser.browseAllFlat();
      return listFoundItems.map((item) => {
        return ({itemID: item});
      });
    } catch (err) { throw Error(err.message); }
  }

    /**
     *
     * @param {String} groupName Nome do grupo de Itens a ser formado
     * @param {[{itemID: String, clientHandle: number}] | [{itemID: String}]} items Itens a serem colocado no grupo, obter por getAllTree|getAllFlat
     */
  async makeGroupItems(groupName, items) {
    try {
      this._opcGroup = await this._opcServer.addGroup(groupName);
      this._opcItemManager = await this._opcGroup.getItemManager();
      this._itemsGroup = await this._opcItemManager.add(items);
    //   return await this.opcItemManager.add(items);
    } catch (err) { throw Error(err.message); }
  }

  /**
   *
   * @param {[{itemID: String, clientHandle: number|null}]} items
   */
  async validateItem(items) {
    try {
      return await this._opcItemManager.validate(items);
    } catch (err) { throw Error(err.message); }
  }

  async getValuesSync(itemsGroup) {
    try {
      const opcSyncIO = await this._opcGroup.getSyncIO();
      console.log(await opcSyncIO.read([2], [itemsGroup[0][1].serverHandle]));
    } catch (err) { throw Error(err.message); }
  }
// await opcSyncIO.write([{handle: itemsGroup[0][1].serverHandle, type: 9, value: 50}])
}

module.exports = OPC;
