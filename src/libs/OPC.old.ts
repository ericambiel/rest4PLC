import {EventEmitter} from 'events';

const opc = require('node-opc-da');
const dcom = require('node-dcom');

// const dcom = require('node-dcom');

const {ComServer, Session, Clsid} = dcom;
const {OPCServer} = opc;

// 563D903B-03B2-4641-89D0-A99E6C5A6C2C => RSLinx Enterprise Runtime
// A05BB6D6-2F8A-11D1-9BB0-080009D01446 => RSLinx Gateway

export default class OPC extends EventEmitter {
  itemsGroup = [];
  private opcBrowser: any;
  private opcGroup: any;
  private opcItemManager: any;
  private _comServer: any;
  private _opcServer: any;

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
  async createServerConn(address: String, domain: String, user: String, pass: String, clsid: String, opts:[object]|null) {
    try {
      EventEmitter.call(this);
      let session = new Session();
      session = session.createSession(domain, user, pass);
      session.setGlobalSocketTimeout(7000);

      const comServer = new ComServer(new Clsid(clsid), address, session);

      console.log(`debug`);
      console.log(await comServer.init());
      // await comServer.init();
      const comObject = await comServer.createInstance();

      const opcServer = new OPCServer(opts);
      await opcServer.init(comObject);

      this.start(comServer, opcServer);
    } catch (err) { throw Error(err); }
  }

  private async start(comServer: Object, opcServer: any) {
    this.opcBrowser = await opcServer.getBrowser();

    this._comServer = comServer;
    this._opcServer = opcServer;
  }

  async getAllTree(): Promise<Object> {
    try {
      return await this.opcBrowser.browseAllTree();
    } catch (err) { throw Error(err.message); }
  }

  async getAllFlat(): Promise<[{itemID: String}]> {
    try {
      const listFoundItems = await this.opcBrowser.browseAllFlat();
      return listFoundItems.map((item: [String]) => {
        return ({itemID: item});
      });
    } catch (err) { throw Error(err.message); }
  }

    /**
     *
     * @param {String} groupName Nome do grupo de Itens a ser formado
     * @param {Array} items Itens a serem colocado no grupo, obter por getAllTree|getAllFlat
     */
  async makeGroupItems(groupName: String, items: [{itemID: String, clientHandle: number}] | [{itemID: String}]) {
    try {
      this.opcGroup = await this._opcServer.addGroup(groupName);
      this.opcItemManager = await this.opcGroup.getItemManager();
      this.itemsGroup = await this.opcItemManager.add(items);
    //   return await this.opcItemManager.add(items);
    } catch (err) { throw Error(err.message); }
  }

  async validateItem(items: [{itemID: String, clientHandle: number|null}]) {
    try {
      return await this.opcItemManager.validate(items);
    } catch (err) { throw Error(err.message); }
  }

  async getValuesSync(itemsGroup: any) {
    try {
      const opcSyncIO = await this.opcGroup.getSyncIO();
      console.log(await opcSyncIO.read([2], [itemsGroup[0][1].serverHandle]));
    } catch (err) { throw Error(err.message); }
  }

// await opcSyncIO.write([{handle: itemsGroup[0][1].serverHandle, type: 9, value: 50}])
}
