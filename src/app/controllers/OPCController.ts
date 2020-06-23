import OPC from '../../libs/OPC';

export default class OPCController {
  private opc: OPC;

  constructor() {
    try {
      this.opc = new OPC();
      this.opc.createServerConn(
            process.env.OPCDA_ADDRESS!,
            process.env.OPCDA_DOMAIN!,
            process.env.OPCDA_USER!,
            process.env.OPCDA_PASS!,
            process.env.OPCDA_CLSID!,
            null,
        );
    } catch (err) { throw Error(err.message); }
  }

  async listItemsOnPLC() {
    try {
      return await this.opc.getAllTree(); // Problema na criação do OPC
    } catch (err) { throw Error(err.message); }
  }
}
