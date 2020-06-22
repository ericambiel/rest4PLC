import OPC from '../../libs/OPC';

// 563D903B-03B2-4641-89D0-A99E6C5A6C2C => RSLinx Enterprise Runtime
// A05BB6D6-2F8A-11D1-9BB0-080009D01446 => RSLinx
// 13486D44-4821-11D2-A494-3CB306C10000 => OpcEnum
export default class OPCController {
  itemsGroup = [];
  private opcBrowser: any;
  private opcGroup: any;
  private opcItemManager: any;
  private _comServer: any;
  private _opcServer: any;

    /**
     * Configurações iniciais de conexão ao Servidor OPC
     * @param {String} address       Endereço IP/Hostname do Servidor OPC remoto.
     * @param {String} domain        Nome do domínio Microsoft.
     * @param {String} user          Usuário de rede com acesso OPC ao servidor.
     * @param {String} pass          Senha de usuário.
     * @param {String} clsid         CLSID do servidor OPC no host de destino.
     * @param {object|null} [opts]   Opções de configuração adicionais.
     */
  constructor(address: String, domain: String, user: String, pass: String, clsid: String, opts:[object]|null) {
    this.init(address, domain, user, pass, clsid, opts);
  }

  private async init(address: String, domain: String, user: String, pass: String, clsid: String, opts:[object]|null) {
    const opc = new OPC();
    const {comServer, opcServer} = await opc.createServer(address, domain, user, pass, clsid, opts);
    this.opcBrowser = await opcServer.getBrowser();

    this._comServer = comServer;
    this._opcServer = opcServer;
  }

  async getAllTree(): Promise<Object> {
    try {
      return await this.opcBrowser.browseAllTree();
    } catch (err) { throw Error(err.message); }
  }

  async getAllFlat(): Promise<Object> {
    try {
      return await this.opcBrowser.browseAllFlat();
    } catch (err) { throw Error(err.message); }
  }

    /**
     *
     * @param {String} groupName Nome do grupo de Itens a ser formado
     * @param {Array} items Itens a serem colocado no grupo, obter por getAllTree|getAllFlat
     * @returns {Object} Grupo contendo valores dos itens para serem lidos.
     */
  async makeGroupItems(groupName: String, items: [{itemID: String, clientHandle: number|null}]) {
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
