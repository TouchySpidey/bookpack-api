const express = require('express');
const router = express.Router();

router.get('/search', async (req, res) => {
    try {
        const { searchString } = req.query;
        if (!searchString) return res.status(400).send("Bad Request");

        const [booksRows] = await global.db.execute(`SELECT isbn, title, subject
        FROM bp_books
        WHERE title LIKE ? OR isbn LIKE ?`, [`%${searchString}%`, `%${searchString}%`]);
        return res.json(booksRows);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
