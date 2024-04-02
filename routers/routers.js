const express = require('express');
const appRouter = express.Router();

appRouter.get('/', (req, res) => {
    /* #swagger.tags = ['root']
    #swagger.summary = 'Get the server version'
    #swagger.description = 'This gets the server version'
    #swagger.responses[200] = {
        description: 'Server status',
        schema: {
            type: 'string'
        }
    } */
    res.send(`Bookpack API, server v ${process.env.npm_package_version}`);
});

appRouter.use('/api/backpack', require('./backpack'));
appRouter.use('/api/books', require('./books'));
appRouter.use('/api/ads', require('./ads'));
appRouter.use('/api/search', require('./search'));

module.exports = appRouter;