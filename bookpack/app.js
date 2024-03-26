
module.exports = (app) => {
    // handle routes
    app.use('/bookpack', require('./routers/routers'));
}
