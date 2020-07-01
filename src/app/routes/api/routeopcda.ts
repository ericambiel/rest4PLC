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
        // await opcSyncIO.write([{handle: itemsGroup[0][1].serverHandle, type: 9, value: 50}])
        const {connName} = req.body.opcServer;
        res.json(await controller.listAllServerItems(connName));
      } catch (err) { next(err); }
    },
);

// router.get(
//   '/read_group_itens',
//   async (req: Request, res: Response, next: any) => {
//     try {
//       const {connName, groupName} = req.body.opcServer;
//       res.json(await controller.readGroupItems(connName, groupName));
//     } catch (err) { next(err); }
//   },
// );

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
      const {connName, address, domain, user, password, clsid} = req.body.opcServer;
      res.json(await controller.connectToNewServer(connName, address, domain, user, password, clsid));
    } catch (err) { next(err); }
  },
);

router.post(
  '/create_group_itens',
  async (req: Request, res: Response, next: any) => {
    try {
      const {connName, name, items} = req.body.opcServer;
      res.json(await controller.createGroupItensConn(connName, name, items));
    } catch (err) { next(err); }
  },
);


module.exports = router;
