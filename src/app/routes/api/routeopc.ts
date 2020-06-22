// const router = require('express').Router();
import {Router, Request, Response} from 'express';
import OPCController from '../../controllers/OPCController';

const router = Router();

router.get(
    '/',
    async (req: Request, res: Response, next: any) => {
      try {
        const controller = new OPCController('10.0.0.100', 'DESKTOP-ETF6IMT', 'Administrador', '1234567890', 'A05BB6D6-2F8A-11D1-9BB0-080009D01446', null);

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

        res.json(controller.getAllTree);
      } catch (err) { next(err); }
    },
);

module.exports = router;
