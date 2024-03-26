const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router();
const { searchIO } = require('../projectUtils/_projectUtils');

router.get('/', async (req, res) => {
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
