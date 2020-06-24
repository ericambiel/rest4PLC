// const router = require('express').Router();
import {Router, Request, Response} from 'express';

import OPCController from '../../controllers/OPCController';
// import OPC from '../../../libs/OPC';
const router = Router();

const controller = new OPCController();

router.get(
    '/list_tree_opc_items',
    async (req: Request, res: Response, next: any) => {
      try {

        // const opc = new OPC();
        // // 563D903B-03B2-4641-89D0-A99E6C5A6C2C => RSLinx Enterprise Runtime
        // // A05BB6D6-2F8A-11D1-9BB0-080009D01446 => RSLinx
        // // 13486D44-4821-11D2-A494-3CB306C10000 => OpcEnum

        // const {comServer, opcServer} = await opc.createServer('10.0.0.100', 'DESKTOP-ETF6IMT', 'Administrador', '1234567890', 'A05BB6D6-2F8A-11D1-9BB0-080009D01446', null);

        // const opcBrowser = await opcServer.getBrowser();
        // const treeItems = await opcBrowser.browseAllTree();
        // const flatItems = await opcBrowser.browseAllFlat();

        // const opcGroup = await opcServer.addGroup('TesteGroup');

        // const opcItemManager = await opcGroup.getItemManager();

        // const items = [];
        // items.push({itemID: '[EM-80]Numero_Pecas_Produzidas', clientHandle: null});
        // // items.push({itemID: '[EM-80]Numero_Pecas_Refugo', clientHandle: 2});

        // const itemsGroup = await opcItemManager.add(items);

        // // console.log(itemsGroup);

        // JSON.stringify(await opcItemManager.validate(items));

        // const opcSyncIO = await opcGroup.getSyncIO();
        // console.log(await opcSyncIO.read([2], [itemsGroup[0][1].serverHandle]));


        // await opcSyncIO.write([{handle: itemsGroup[0][1].serverHandle, type: 9, value: 50}])
        const {connName} = req.body.opcServer;
        res.json(await controller.listAllServerItems(connName));
      } catch (err) { next(err); }
    },
);

router.get(
  '/read_group_itens',
  async (req: Request, res: Response, next: any) => {
    try {
      const {connName, groupName} = req.body.opcServer;
      res.json(await controller.readGroupItems(connName, groupName));
    } catch (err) { next(err); }
  },
);

router.get(
  '/list_all_opc_groups',
  async (req: Request, res: Response, next: any) => {
    try {
      const {connName} = req.body.opcServer;
      res.json(await controller.listAllConnGroups(connName));
    } catch (err) { next(err); }
  },
);

router.post(
  '/create_connection_server_opcda',
  async (req: Request, res: Response, next: any) => {
    try {
      const {connName} = req.body.opcServer;
      await controller.connectToNewServer(connName);
      res.json('Conexão sendo criada...');
    } catch (err) { next(err); }
  },
);

router.post(
  '/create_group_itens',
  async (req: Request, res: Response, next: any) => {
    try {
      const {connName, groupName, items} = req.body.opcServer;
      res.json(await controller.createGroupItensConn(connName, groupName, items));
    } catch (err) { next(err); }
  },
);


module.exports = router;
