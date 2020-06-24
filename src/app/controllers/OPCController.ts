import OPCDA from '../../libs/OPC';

export default class OPCController {

  /** @type Set */
  private opcServesMap: Map<String, OPCDA>;

  constructor() {
    this.opcServesMap = new Map<String, OPCDA>();
    // TODO: Carregar Conexões salvas no BD.
  }

  /**
   * Criara uma nova conexão com um Servidor OPC.
   * @param {String} connName Um nome único para idêntificar conexão.
   */
  connectToNewServer(connName: String) {
    try {
      if (!this.opcServesMap.has(connName)) {
        this.opcServesMap.set(connName, new OPCDA(
          process.env.OPCDA_ADDRESS!,
          process.env.OPCDA_DOMAIN!,
          process.env.OPCDA_USER!,
          process.env.OPCDA_PASS!,
          process.env.OPCDA_CLSID!,
          null,
        ));
          // TODO: Chamar Schema e salvar nova conexão no banco.
      }
    } catch (err) { throw Error(err.message); }
  }

  /**
   * Verifica se uma conexão foi criada
   * @param {String} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   */
  private getSpecificConnection(connName: String): OPCDA {
    try {
      if (this.opcServesMap.has(connName)) {
        return this.opcServesMap.get(connName)!;
      } else {
        throw Error('Não há nenhuma conexão com Servidor OPC-DA criada');
      }
    } catch (err) { throw Error(err.message); }
  }

  /**
   * Lista todos as TAG disponível em servidor OPC DA
   * @param {String} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   */
  async listAllServerItems(connName: String) {
    try {
      const opcda = this.getSpecificConnection(connName);
      return await opcda.opcBrowser.browseAllTree();
    } catch (err) { throw Error(err.message); }
  }

  /**
   * Cria um grupo de itens a ser usado em posterior leitura de dados para uma conexão existente.
   * @param {String} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   * @param {String} groupName Nome do grupo para ser criado para introdução de itens.
   * @param {[{itemID: string}]} items Lista de itens para serem introduzidos. Use "listAllServerItems" para listar.
   */
  async createGroupItensConn(connName: String, groupName: string, items:[{itemID: string}]) {
    try {
      const opcda = this.getSpecificConnection(connName);
      await opcda.createGroupItems(groupName, items);
    } catch (err) { throw Error(err.message); }
  }

  /**
   * Lê dados de itens em um grupo, em uma conexão existente.
   * @param {String} groupName Nome do grupo para ser criado para introdução de itens.
   * @param {String} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   */
  async readGroupItems(connName: String, groupName: string) {
    try {
      const opcda = this.getSpecificConnection(connName);
      // return await opcda._opcServer.getGroupByName(groupName);
      return await opcda.getValuesSync(groupName, 'asdasdasd');
    } catch (err) { throw Error(err.message); }
  }

  /**
   * Lista todos os grupos de itens para uma conexão existente.
   * @param {String} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   * TODO: NÂO TESTADO
   */
  async listAllConnGroups(connName: String) {
    try {
      const opcda = this.getSpecificConnection(connName);
      return await opcda._opcServer.getGroups(0); // Verificar oque é esse parametro, https://www.desigoccecosystem.com/WebClientApplication/Help/EngineeringHelp/en-US/13672511115.html
    } catch (err) { throw Error(err.message); }
  }

  /**
   * @returns Lista contendo nome das conexões criadas.
   */
  listAllConnections() {
    try {
      return this.opcServesMap.keys();
    } catch (err) { throw Error(err.message); }
  }
}
