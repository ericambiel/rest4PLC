import OPCDA from '../../libs/opc-da/Server';

export default class OPCController {

  /** @type Set */
  private opcServesMap: Map<string, OPCDA>;

  constructor() {
    this.opcServesMap = new Map<string, OPCDA>();
    // TODO: Carregar Conexões salvas no BD.
  }

  /**
   * Criara uma nova conexão com um Servidor OPC.
   * @param {string} connName - Um nome único para idêntificar conexão.
   * @param {string} address - IP/Hostname do servidor OPC-DA
   * @param {string} domain - Domínio/Hostname do servidor OPC-DA
   * @param {string} user - Usuário com acessos a DCOMs.
   * @param {string} password - Senha do usuário informado.
   * @param {string} clsid - ID do Objeto DCOM com acessos aos itens OPC no servidor.
   */
  async connectToNewServer(connName: string, address: string, domain: string,
    user: string, password: string, clsid: string) {
    try {
      if (this.opcServesMap.has(connName)) {
        return 'Conexão já existe tente outro nome.';
      } else {
        // TODO: Chamar Schema e salvar nova conexão no banco.
        this.opcServesMap.set(connName, new OPCDA(
          address, domain, user, password, clsid,
        ));
        return await this.opcServesMap.get(connName)!.setup()
          .then(() => { return 'Conexão sendo Criada...'; })
          .catch((err) => { throw err; });
      }
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

  /**
   * Verifica se uma conexão foi criada
   * @param {string} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   */
  private getSpecificConnection(connName: string): OPCDA {
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
   * @param {string} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   */
  async listAllServerItems(connName: string) {
    try {
      const opcda = this.getSpecificConnection(connName);
      return await opcda.browseItems(false);
    } catch (err) { throw Error(err.message); }
  }

  /**
   * Cria um grupo de itens a ser usado em posterior leitura de dados para uma conexão existente.
   * @param {string} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   * @param {string} name Nome do grupo para ser criado para introdução de itens.
   * @param {[]} items Lista de itens para serem introduzidos. Use "listAllServerItems" para listar.
   */
  async createGroupItensConn(connName: string, name: string, items:[]) {
    try {
      const opcda = this.getSpecificConnection(connName);
      await opcda.createGroup({name, varTable: items});
    } catch (err) { throw Error(err.message); }
  }

  /**
   * Lista todos os grupos de itens para uma conexão existente.
   * @param {string} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
   * TODO: NÂO TESTADO
   */
  async listAllConnGroups(connName: string) {
    try {
      const opcda = this.getSpecificConnection(connName);
      // Pode ser adquirido pelo MAP em server
      return await opcda.opcServer.getGroups(0); // Verificar oque é esse parametro, https://www.desigoccecosystem.com/WebClientApplication/Help/EngineeringHelp/en-US/13672511115.html
    } catch (err) { throw Error(err.message); }
  }

  // /**
  //  * Lê dados de itens em um grupo, em uma conexão existente.
  //  * @param {string} groupName Nome do grupo para ser criado para introdução de itens.
  //  * @param {string} connName Nome de uma conexão existente. Use "connectToNewServer" para criar uma.
  //  */
  // async readGroupItems(connName: string, groupName: string) {
  //   try {
  //     const opcda = this.getSpecificConnection(connName);
  //     // return await opcda._opcServer.getGroupByName(groupName);
  //     return await opcda.getValuesSync(groupName, 'asdasdasd');
  //   } catch (err) { throw Error(err.message); }
  // }
}
