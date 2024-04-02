const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router();
const { searchIO } = require('../projectUtils/_projectUtils');

router.get('/', async (req, res) => {
    /* #swagger.tags = ['search']
    #swagger.summary = 'Search for ads'
    #swagger.description = 'This gets a list of ads that match the search string'
    #swagger.parameters['searchString'] = { description: 'The string to search for', in: 'query', type: 'string' }
    #swagger.parameters['conditions'] = { description: 'The conditions to search for', in: 'query', type: 'array' }
    #swagger.parameters['distance'] = { description: 'The distance to search within', in: 'query', type: 'number' }
    #swagger.parameters['distanceFromLat'] = { description: 'The latitude to search from', in: 'query', type: 'number' }
    #swagger.parameters['distanceFromLon'] = { description: 'The longitude to search from', in: 'query', type: 'number' }
    #swagger.parameters['sortBy'] = { description: 'The field to sort by', in: 'query', type: 'string' }
    #swagger.parameters['sortDir'] = { description: 'The direction to sort by', in: 'query', type: 'string' }
    #swagger.responses[200] = {
        description: 'The list of ads that match the search parameters',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    adUID: { type: 'string' },
                    qualityCondition: { type: 'string' },
                    price: { type: 'number' },
                    isbn: { type: 'string' },
                    title: { type: 'string' },
                    postedOn: { type: 'string' },
                    rating: { type: 'number' },
                    distance: { type: 'number' }
                }
            }
        }
    } */
    try {
        const query = searchIO.parseSearchFromRequest(req);
        if (!query) return res.status(400).send("Bad Request");
        const [adsRows] = await global.db.query(query);
        return res.json(adsRows);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.post('/save', global.authenticators.authenticate, async (req, res) => {
    /* #swagger.tags = ['search']
    #swagger.summary = 'Save a search'
    #swagger.description = 'This saves a search'
    #swagger.parameters['searchString'] = { description: 'The string to search for', in: 'query', type: 'string' }
    #swagger.parameters['conditions'] = { description: 'The conditions to search for', in: 'query', type: 'array' }
    #swagger.parameters['distance'] = { description: 'The distance to search within', in: 'query', type: 'number' }
    #swagger.parameters['distanceFromLat'] = { description: 'The latitude to search from', in: 'query', type: 'number' }
    #swagger.parameters['distanceFromLon'] = { description: 'The longitude to search from', in: 'query', type: 'number' }
    #swagger.parameters['sortBy'] = { description: 'The field to sort by', in: 'query', type: 'string' }
    #swagger.parameters['sortDir'] = { description: 'The direction to sort by', in: 'query', type: 'string' }
    #swagger.requestBody = {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        label: { type: 'string' }
                    }
                }
            }
        }
    }
    #swagger.responses[200] = {
        description: 'The search object that was saved',
        schema: {
            type: 'object',
            properties: {
                UID: { type: 'string' },
                userUID: { type: 'string' },
                searchString: { type: 'string' },
                conditions: { type: 'array' },
                distance: { type: 'number' },
                distanceFromLat: { type: 'number' },
                distanceFromLon: { type: 'number' },
                orderBy: { type: 'string' },
                orderDir: { type: 'string' },
                label: { type: 'string' }
            }
        }
    } */
    try {
        const searchObject = searchIO.buildSearchObject(req.query);
        searchObject.label = req.body.label;
        searchObject.UID = uuidv4();
        searchObject.userUID = req.user.UID;
        global.db.execute(`INSERT INTO bp_searches
        (UID, userUID, searchString, conditions, distance, distanceFromLat, distanceFromLon, orderBy, orderDir, label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [searchObject.UID, searchObject.userUID, searchObject.searchString, searchObject.conditions, searchObject.distance, searchObject.distanceFromLat, searchObject.distanceFromLon, searchObject.orderBy, searchObject.orderDir, searchObject.label]);
        res.status(200).send(searchObject);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/:searchUID', async (req, res) => {
    /* #swagger.tags = ['search']
    #swagger.summary = 'Run a saved search'
    #swagger.description = 'This runs a saved search'
    #swagger.parameters['searchUID'] = { description: 'The UID of the search', in: 'path', required: true, type: 'string' }
    #swagger.responses[200] = {
        description: 'The list of ads that match the search parameters',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    adUID: { type: 'string' },
                    qualityCondition: { type: 'string' },
                    price: { type: 'number' },
                    isbn: { type: 'string' },
                    title: { type: 'string' },
                    postedOn: { type: 'string' },
                    rating: { type: 'number' },
                    distance: { type: 'number' }
                }
            }
        }
    } */
    try {
        const { searchUID } = req.params;
        if (!searchUID) return res.status(400).send("Bad Request");

        const query = await searchIO.parseSearchFromDB(searchUID);
        if (!query) return res.status(404).send("Search not found");
        const [adsRows] = await global.db.query(query);
        global.db.execute(`UPDATE bp_searches SET lastRunOn = UTC_TIMESTAMP() WHERE UID = ?`, [searchUID]);
        return res.json(adsRows);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
