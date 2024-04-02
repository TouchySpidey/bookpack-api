const express = require('express');
const router = express.Router();

router.get('/search', async (req, res) => {
    /* #swagger.tags = ['books']
    #swagger.summary = 'Search for books'
    #swagger.description = 'This gets a list of books that match the search string'
    #swagger.parameters['searchString'] = { description: 'The string to search for', in: 'query', required: true, type: 'string' }
    #swagger.responses[200] = {
        description: 'The list of books that match the search string',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    isbn: { type: 'string' },
                    title: { type: 'string' },
                    subject: { type: 'string' }
                }
            }
        }
    } */
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
