const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

module.exports = (app) => {
    if (fs.existsSync(path.join(__dirname, 'swagger.json'))) {
        const swaggerDocument = require('./swagger.json');
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } else {
        console.log('swagger.json file not found.');
    }
}
