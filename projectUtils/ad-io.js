const { v4: uuidv4 } = require('uuid');

module.exports.buildAdObject = async (vars) => {
    try {
        let { isbn, info, price, qualityCondition, latitude, longitude, availableForShipping } = vars;
        const adUID = uuidv4();

        const [bookRows] = await global.db.query(`SELECT * FROM bp_books WHERE isbn = ?`, [isbn]);
        if (!bookRows.length) return { error: "Book not found" };

        const book = bookRows[0];

        // info must be a string, max 500 characters
        info = info.trim();
        if (typeof info !== 'string') return { error: "Info must be a string" };
        if (info.length > 500) return { error: "Info too long" };

        // price must be a double or an integer, and must be positive
        price = parseFloat(price);
        if (isNaN(price) || typeof price !== 'number') return { error: "Price must be a number" };
        if (price < 0) return { error: "Price can not be negative" };

        // qualityCondition must be an integer between 1 and 5
        qualityCondition = parseInt(qualityCondition);
        if (isNaN(qualityCondition) || typeof qualityCondition !== 'number') return { error: "qualityCondition must be a number" };
        if (qualityCondition < 1 || qualityCondition > 5) return { error: "qualityCondition must be between 1 and 5" };

        // latitude and longitude must be doubles, and must be within the range of valid coordinates
        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);
        if (isNaN(latitude) || typeof latitude !== 'number' || isNaN(longitude) || typeof longitude !== 'number') return { error: "Latitude and Longitude must be numbers" };
        if (latitude < -90 || latitude > 90) return { error: "Latitude must be between -90 and 90" };
        if (longitude < -180 || longitude > 180) return { error: "Longitude must be between -180 and 180" };

        // availableForShipping must be an integer between 0 and 1
        availableForShipping = availableForShipping ? 1 : 0;
        if (isNaN(availableForShipping) || typeof availableForShipping !== 'number') return { error: "Available for shipping must be a number" };
        if (availableForShipping < 0 || availableForShipping > 1) return { error: "Available for shipping must be 0 or 1" };

        return {
            adUID,
            isbn,
            info,
            price,
            qualityCondition,
            latitude,
            longitude,
            availableForShipping,
            book
        };
    } catch (error) {
        console.error(error);
        return { error: "Bad Request" };
    }
}