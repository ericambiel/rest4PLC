// import OPC from '../../libs/OPC';
const OPC = require('../../libs/OPC');

export default class OPCController {
  public opc: any;
  private lastItemsListing: [{itemID: String}] | null;

  constructor() {
    try {
      this.lastItemsListing = null;
      this.opc = new OPC();
      console.log(process.env.OPCDA_ADDRESS);
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
      this.lastItemsListing = await this.opc.getAllFlat();
      return await this.opc.getAllTree();
    } catch (err) { throw Error(err.message); }
  }

  async createGroupLastItemsListing(name: String) {
    try {
      await this.opc.makeGroupItems(name, this.lastItemsListing!);
      await this.opc.getValuesSync(this.opc.itemsGroup);
    } catch (err) { throw Error(err.message); }
  }
}
