const express = require('express');
const router = express.Router();
const { authenticate } = global.authenticators;
const { adIO, searchIO } = require('../projectUtils/_projectUtils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

router.post('/save', authenticate, global.multerUpload.array('pics'), async (req, res) => {
    /* #swagger.tags = ['ads']
    #swagger.summary = 'Save an ad in the database'
    #swagger.description = 'This saves ads in the database, the POST body is very similar to the db's table's structure. This will also notify users that have active searches that match this ad.  This post is done with multipart/form-data because of the images'
    security via apikey in bearer authorization header
    #swagger.security = [{
        "Bearer": []
    }]
    #swagger.requestBody = {
        required: true,
        content: {
            'multipart/form-data': {
                schema: {
                    $ref: "#/components/schemas/AdSave"
                }
            }
        }
    } */

    try {
        const userUID = req.user.UID;
        const adData = await adIO.buildAdObject(req.body);
        if (adData?.error) return res.status(400).send(adData.error);

        const adOriginalFolder = path.join('uploads', 'ads', 'originals', adData.adUID);
        if (!fs.existsSync(adOriginalFolder)) {
            fs.mkdirSync(adOriginalFolder);
        }
        const adThumbnailFolder = path.join('uploads', 'ads', 'thumbnails', adData.adUID);
        if (!fs.existsSync(adThumbnailFolder)) {
            fs.mkdirSync(adThumbnailFolder);
        }

        req.files.forEach((file, index) => {
            const extension = path.extname(file.originalname);
            const newFileName = `${(index + 1).toString().padStart(2, '0')}${extension}`;
            const oldPath = path.join(file.path);
            const newPath = path.join(adOriginalFolder, newFileName);
            fs.renameSync(oldPath, newPath);
            sharp(newPath).resize(200, 200).toFile(path.join(adThumbnailFolder, newFileName));
        });

        global.db.execute(`INSERT INTO bp_ads
        (UID, userUID, bookCode, info, qualityCondition, price, availableForShipping, latitude, longitude, postedOn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [adData.adUID, userUID, adData.isbn, adData.info, adData.qualityCondition, adData.price, adData.availableForShipping, adData.latitude, adData.longitude]);

        const matchingSearches = await searchIO.matchingSearches(adData);
        if (matchingSearches.length) {
            newAdForSearchMail(adData, matchingSearches);
        }
        return res.status(200).send(adData.adUID);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/:adUID', authenticate, async (req, res) => {
    /* #swagger.tags = ['ads']
    #swagger.summary = 'Get an ad by its UID'
    #swagger.description = 'This gets an ad by its UID, and returns the ad and infos about it'
    #swagger.parameters['adUID'] = { description: 'The UID of the ad', in: 'path', required: true, type: 'string' }
    security via apikey in bearer authorization header
    #swagger.security = [{
        "Bearer": []
    }]
    #swagger.responses[200] = {
        schema: {
            $ref: "#/components/schemas/Ad"
        }
    } */
    try {
        const { adUID } = req.params;
        if (!adUID) return res.status(400).send("Bad Request");

        const adResponse = {};
        const [adRows] = await global.db.execute(`SELECT * FROM bp_ads WHERE UID = ?`, [adUID]);
        if (!adRows.length) return res.status(404).send("Ad not found");
        adResponse.ad = adRows[0];

        const [bookRows] = await global.db.execute(`SELECT * FROM bp_books WHERE isbn = ?`, [adResponse.ad.bookCode]);
        if (!bookRows.length) return res.status(500).send("Internal Server Error");
        adResponse.book = bookRows[0];

        const [userRows] = await global.db.execute(`SELECT UID, nickname FROM users WHERE UID = ?`, [adResponse.ad.userUID]);
        if (!userRows.length) return res.status(500).send("Internal Server Error");

        const [reviewRows] = await global.db.execute(`SELECT bp_reviews.*, reviewers.nickname
        FROM bp_reviews
        LEFT JOIN users reviewers
        ON reviewers.UID = bp_reviews.byUID
        WHERE userUID = ?`, [adResponse.ad.userUID]);
        adResponse.op = {
            user: userRows[0],
            reviews: reviewRows
        };

        const picsDir = path.join('uploads', 'ads', 'originals', adUID);
        if (fs.existsSync(picsDir)) adResponse.pics = fs.readdirSync(picsDir);
        else adResponse.pics = [];

        const thumbDir = path.join('uploads', 'ads', 'originals', adUID);
        if (fs.existsSync(thumbDir)) adResponse.thumbnails = fs.readdirSync(thumbDir);
        else adResponse.thumbnails = [];

        return res.status(200).json(adResponse);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/:adUID/thumbnail/:picName', async (req, res) => {
    /* #swagger.tags = ['ads']
    #swagger.summary = 'Get a thumbnail of an ad by its UID and pic name'
    #swagger.description = 'This gets a thumbnail of an ad by its UID and pic name'
    #swagger.parameters['adUID'] = { description: 'The UID of the ad', in: 'path', required: true, type: 'string' }
    #swagger.parameters['picName'] = { description: 'The name of the pic', in: 'path', required: true, type: 'string' }
    #swagger.responses[200] = {
        description: 'The thumbnail of the pic',
        content: {
            'image/*': {
                schema: {
                    type: 'file'
                }
            }
        }
    } */
    return getPic(req, res, 'thumbnails');
});

router.get('/:adUID/pic/:picName', async (req, res) => {
    /* #swagger.tags = ['ads']
    #swagger.summary = 'Get a pic of an ad by its UID and pic name'
    #swagger.description = 'This gets a pic of an ad by its UID and pic name'
    #swagger.parameters['adUID'] = { description: 'The UID of the ad', in: 'path', required: true, type: 'string' }
    #swagger.parameters['picName'] = { description: 'The name of the pic', in: 'path', type: 'string' }
    #swagger.responses[200] = {
        description: 'The pic',
        content: {
            'image/*': {
                schema: {
                    type: 'file'
                }
            }
        }
    } */
    return getPic(req, res, 'originals');
});

const getPic = (req, res, type) => {
    try {
        const { adUID, picName } = req.params;
        if (!adUID) return res.status(400).send("Bad Request");

        const thumbDir = path.join('uploads', 'ads', type, adUID);
        if (!fs.existsSync(thumbDir)) return res.status(404).send("Ad not found");
        const thumbPath = path.join(thumbDir, picName);
        if (!fs.existsSync(thumbPath)) return res.status(404).send("Pic not found");
        return res.status(200).sendFile(path.resolve(thumbPath));
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
}

function newAdForSearchMail(adData, matchingSearches) {
    const { adUID, info, qualityCondition, price, availableForShipping, book } = adData;
    const subject = "Bookpack — Un nuovo annuncio per la tua ricerca";
    for (const search of matchingSearches) {
        const body = `<p>
            <p><h2>Un nuovo annuncio per la tua ricerca</h2></p>
            <p>Ciao <b>${search.nickname}</b></p>
            <p>È appena stato pubblicato un nuovo annuncio che corrisponde alla tua ricerca <b>${search.label}</b>.</p>
            <p>Controlla subito!</p>
            <a href="${process.env.FRONTEND_URL}/ad/${adUID}">
                <div style="border-radius: 4px; border: 1px solid #ff7930; display: flex;">
                    <div>some pic</div>
                    <div>
                        <div>${book.title}</div>
                        <div>€ ${price}</div>
                        <div>info del venditore: ${info}</div>
                        <div>Condizioni: ${qualityCondition}</div>
                        <div>${search.distance ?? '?'}Km${availableForShipping ? " (disponibile per la spedizione)" : ""}</div>
                    </div>
                </div>
            </a>
            <a href="${process.env.FRONTEND_URL}/search/${search.UID}">La tua ricerca</a>
            <p><i>Il team di Bookpack</i></p>
        </p>`;

        global.sendMail(search.email, subject, body);
    }
}

module.exports = router;
