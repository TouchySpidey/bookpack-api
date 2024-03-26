const express = require('express');
const appRouter = express.Router();

appRouter.get('/', (req, res) => {
    res.send(`Bookpack API, server v ${process.env.npm_package_version}`);
});

appRouter.use('/api/backpack', require('./backpack'));
appRouter.use('/api/books', require('./books'));
appRouter.use('/api/ads', require('./ads'));
appRouter.use('/api/search', require('./search'));

module.exports = appRouter;