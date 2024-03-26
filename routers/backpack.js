const express = require('express');
const router = express.Router();

router.get('/schools/list', async (req, res) => {
    try {
        const queryParams = {
            where_1: req.query.where_1,
            where_2: req.query.where_2,
            where_3: req.query.where_3,
            where_4: req.query.where_4,
            type: req.query.type,
            name: req.query.name,
        };
        const { target, code } = req.query;
        const wheres = [];
        const pars = [];

        Object.entries(queryParams).forEach(([key, value]) => {
            if (value) {
                wheres.push(`${key} = ?`);
                pars.push(value);
            }
        });

        switch (target?.toLowerCase()) {
            case 'school':
                const [schoolsRows] = await global.db.execute(`SELECT code, name
                FROM bp_schools
                WHERE ${wheres.length ? wheres.join(' AND ') : '1'}`, pars);
                return res.json(schoolsRows);
                break;

            case 'where_1': case 'where_2': case 'where_3': case 'where_4': case 'type':
                const [listRows] = await global.db.execute(`SELECT ${target.toLowerCase()}
                FROM bp_schools
                WHERE ${wheres.length ? `${wheres.join(' AND ')}` : '1'}
                GROUP BY ${target.toLowerCase()}`, pars);
                return res.json(listRows.map(row => row[target.toLowerCase()]));
                break;

            case 'classes':
                if (!code) return res.status(400).send("Bad Request");

                const [classesRows] = await global.db.execute(`SELECT class, section
                FROM bp_adoptions
                WHERE schoolCode = ?
                GROUP BY class, section`, [code]);
                return res.json(classesRows);
                break;

            default: return res.status(400).send("Bad Request, target is required and must be valid");
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/schools/search', async (req, res) => {
    try {
        const { searchString } = req.query;
        const [rows] = await global.db.execute('SELECT * FROM bp_schools WHERE code LIKE ? OR name LIKE ? OR where_1 LIKE ? OR where_2 LIKE ? OR where_3 LIKE ? OR where_4 LIKE ?',
            [`%${searchString}%`, `%${searchString}%`, `%${searchString}%`, `%${searchString}%`, `%${searchString}%`, `%${searchString}%`]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/adoptions/list', async (req, res) => {
    try {
        const queryParams = {
            schoolCode: req.query.schoolCode,
            class: req.query.class,
            section: req.query.section,
        };
        const [adoptionsRows] = await global.db.execute(`SELECT bookCode, newAdoption, isMandatory, bp_books.*
        FROM bp_adoptions
        JOIN bp_books
        ON bp_adoptions.bookCode = bp_books.isbn
        WHERE schoolCode = ? AND class = ? AND section = ?`, [queryParams.schoolCode, queryParams.class, queryParams.section]);
        return res.json(adoptionsRows);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
