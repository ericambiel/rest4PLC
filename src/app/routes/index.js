const router = require('express').Router();

router.get('/', (req, res) => {
  res.send('Rest4PLC funcionando!!!');
});

// Redirecionamento de rota
// router.use('/api/auth', require('./api/routeauthentication'));
// router.use('/api/permission', require('./api/routepermissions'));
router.use('/api/opcda', require('./api/routeopcda'));

module.exports = router;
