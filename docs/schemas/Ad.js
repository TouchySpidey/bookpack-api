module.exports = {
    ad: {
        adUID: 'string',
        isbn: 'string',
        info: 'string',
        price: 14.7,
        qualityCondition: {
            '@enum': [1, 2, 3, 4, 5],
        },
        latitude: 44.31348792,
        longitude: 6.35723892,
        availableForShipping: true,
        pics: ['string'],
        thumbnails: ['string'],
    },
    book: {
        isbn: 'string',
        title: 'string',
        subject: 'string',
    },
    op: {
        user: {
            UID: 'string',
            nickname: 'Leo',
        },
        reviews: [
            {
                "byUID": "string",
                "ratedOn": "2024-03-31 12:00:00",
                "rating": 4,
                "review": "Nice fella!",
                "nickname": "Dest"
            }
        ]
    }
}
