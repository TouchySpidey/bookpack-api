/* Swagger configuration */
const options = {
    openapi: '3.0.3',
    language: 'en-US',
    disableLogs: false,
    autoHeaders: false,
    autoQuery: false,
    autoBody: false
}

const swaggerAutogen = require('swagger-autogen')(options);

const fs = require('fs');
const path = require('path');
const schemas = {};

fs.readdirSync(path.join(__dirname, 'schemas')).forEach(file => {
    const schema = require(path.join(__dirname, 'schemas', file));
    schemas[file.split('.')[0]] = schema;
});

const doc = {
    info: {
        version: '1.0.1',
        title: 'Bookpack Apis',
        description: 'API for Bookpack marketplace webapp',
        contact: {
            'name': 'Tech Support',
            'email': 'bookpack@questfinder.app'
        },
    },
    host: process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:8080',
    basePath: '/',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
        {
            name: 'ads',
            description: 'Everything about the ads',
        },
    ],
    // security as bearer authorization header
    securityDefinitions: {
        Bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header'
        }
    },
    components: {
        schemas
    }
};

const outputFile = './docs/swagger.json';
const endpointsFiles = [
    'app.js',
    'routers/routers.js',
];

swaggerAutogen(outputFile, endpointsFiles, doc);
