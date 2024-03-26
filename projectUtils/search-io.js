const buildQuery = (variables) => {
    let { distance, distanceFromLat, distanceFromLon } = variables;
    let { searchString, orderBy, orderDir } = variables;
    let conditions = variables.conditions?.length ? conditions.split(',') : [];

    if (!orderBy || !orderDir || !['distance', 'price', 'rating', 'recent'].includes(orderBy.toLowerCase())) {
        orderBy = null;
        orderDir = null;
    } else {
        orderBy = orderBy.toLowerCase();
        orderDir = orderDir.toLowerCase();
    }

    const pars = [], wheres = [];
    if (distanceFromLat && distanceFromLon) {
        // these must be the first 2 parameters in pars, because they are used in the SELECT clause
        pars.push(distanceFromLat, distanceFromLon);
        if (distance) {
            wheres.push(`ST_Distance_Sphere(POINT(latitude, longitude), POINT(?, ?)) / 1000 <= ?`);
            pars.push(distanceFromLat, distanceFromLon, distance);
        }
    } else if (orderBy === 'distance') {
        orderBy = null;
        orderDir = null;
    }
    if (searchString) {
        wheres.push(`(title LIKE ? OR isbn LIKE ?)`);
        pars.push(`%${searchString}%`, `%${searchString}%`);
    }
    if (conditions && conditions.length) {
        wheres.push(`qualityCondition IN (?)`);
        pars.push(conditions);
    }

    const queryBuilding = `SELECT
          bp_ads.UID as adUID
        , qualityCondition
        , price
        , isbn
        , title
        , postedOn
        , rating
        ${distanceFromLat && distanceFromLon ? `, ROUND(ST_Distance_Sphere(POINT(latitude, longitude), POINT(?, ?)) / 1000) AS distance` : ''}
        FROM bp_ads
        JOIN bp_books ON bp_ads.bookCode = bp_books.isbn
        LEFT JOIN (
            SELECT userUID, AVG(rating) as rating
            FROM bp_reviews
            GROUP BY userUID
        ) ratings ON bp_ads.userUID = ratings.userUID
        WHERE ${wheres.length ? wheres.join(' AND ') : '1'}
        ${orderBy ? `ORDER BY ${orderBy} ${orderDir}` : ''}`;

    return global.mysql.format(queryBuilding, pars);
}

module.exports.parseSearchFromDB = async (searchUID) => {
    const [adsRows] = await global.db.query(`SELECT * FROM bp_searches WHERE UID = ?`, [searchUID]);
    if (!adsRows.length) return null;
    const searchObject = adsRows[0];
    return buildQuery(searchObject);
}

const buildSearchObject = module.exports.buildSearchObject = (variables) => {
    const { distance, distanceFromLat, distanceFromLon } = variables;
    const { searchString, sortBy, sortDir } = variables;
    const conditions = variables.conditions?.join(',');

    let orderBy = null, orderDir = null;
    switch (sortBy?.toLowerCase()) {
        case 'recent':
            orderBy = 'postedOn';
            break;

        case 'price': case 'distance': case 'rating':
            orderBy = sortBy.toLowerCase();
            break;

        default:
            orderBy = null;
            orderDir = null;
            break;
    }
    switch (sortDir?.toLowerCase()) {
        case 'asc':
            orderDir = 'ASC';
            break;
        case 'desc':
            orderDir = 'DESC';
            break;
        default:
            orderDir = null;
            orderBy = null;
            break;
    }
    return {
        searchString: searchString ?? null,
        conditions: conditions ?? null,
        distance: distance ?? null,
        distanceFromLat: distanceFromLat ?? null,
        distanceFromLon: distanceFromLon ?? null,
        orderBy: orderBy ?? null,
        orderDir: orderDir ?? null
    }
}

module.exports.matchingSearches = async (adData) => {
    const { isbn, latitude, longitude, qualityCondition, availableForShipping } = adData;
    const query = `SELECT users.email, users.nickname, bp_searches.label, bp_searches.UID, ST_Distance_Sphere(POINT(distanceFromLat, distanceFromLon), POINT(?, ?)) / 1000 AS distance
    FROM bp_searches
    LEFT JOIN users
    ON bp_searches.userUID = users.UID
    WHERE (searchString IS NULL OR searchString = ?)
    AND (conditions IS NULL OR conditions LIKE ?)
    ${availableForShipping ? "" : "AND (distance IS NULL OR ST_Distance_Sphere(POINT(distanceFromLat, distanceFromLon), POINT(?, ?)) / 1000 <= distance)"}
    AND (lastRunOn < UTC_TIMESTAMP())`;
    const [searchRows] = await global.db.query(query, [latitude, longitude, isbn, `%${qualityCondition}%`, latitude, longitude]);
    return searchRows;
}

module.exports.parseSearchFromRequest = (req) => {
    const searchObject = buildSearchObject(req.query);
    return buildQuery(searchObject);
}