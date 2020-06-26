import {Router, Request, Response} from 'express';

import Server from '../../../libs/opc-da/Server';

const router = Router();
const server = new Server(
    process.env.OPCDA_ADDRESS!,
    process.env.OPCDA_DOMAIN!,
    process.env.OPCDA_USER!,
    process.env.OPCDA_PASS!,
    process.env.OPCDA_CLSID!,
);

// router.get(
//     '/list_tree_opc_items',
//     async (req: Request, res: Response, next: any) => {
//       try {

//         res.json(await controller.listAllServerItems(connName));
//       } catch (err) { next(err); }
//     },
// );

// router.get(
//   '/read_group_itens',
//   async (req: Request, res: Response, next: any) => {
//     try {
//       const {connName, groupName} = req.body.opcServer;
//       res.json(await controller.readGroupItems(connName, groupName));
//     } catch (err) { next(err); }
//   },
// );

// router.get(
//   '/list_all_opc_groups',
//   async (req: Request, res: Response, next: any) => {
//     try {
//       const {connName} = req.body.opcServer;
//       res.json(await controller.listAllConnGroups(connName));
//     } catch (err) { next(err); }
//   },
// );

router.post(
  '/create_connection_server_opcda',
  async (req: Request, res: Response, next: any) => {
    try {
      const {connName} = req.body.opcServer;
      await server.setup();
      res.json('Conexão sendo criada...');
    } catch (err) { next(err); }
  },
);

router.post(
  '/create_group_itens',
  async (req: Request, res: Response, next: any) => {
    try {
      const {connName, groupName, items} = req.body.opcServer;
      res.json(await server.createGroup(groupName, server, {varTable: items}));
    } catch (err) { next(err); }
  },
);


module.exports = router;
