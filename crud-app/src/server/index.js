require('dotenv').config({ path: 'env.local' });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const epilogue = require('epilogue');
const OktaJwtVerifier = require('@okta/jwt-verifier');

const oktaJwtVerifier = new OktaJwtVerifier({
    clientId: process.env.REACT_APP_OKTA_CLIENT_ID,
    issuer: `${process.env.REACT_APP_OKTA_ORG_URL}/oauth2/default`,
});


// Here is where you check that a user is properly authenticated. First, throw an error if 
// there is no Authorization header, which is how you will send the authorization token.

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Here is where you set up Sequelize. This is a quick way of creating database models. You can Sequelize with a wide 
// variety of databases, but here you can just use SQLite to get up and running quickly without any other dependencies.

app.use(async (req, res, next) => {
    try {
        if (!req.headers.authorization) throw new Error('Authorization header is required');

        const accessToken = req.headers.authorization.trim().split(' ')[1];
        await oktaJwtVerifier.verifyAccessToken(accessToken);
        next();
    } catch (error) {
        next(error.message);
    }
});

// Epilogue works well with Sequelize and Express. It binds the two together like glue, creating a set of 
// CRUD endpoints with just a couple lines of code. First, you initialize Epilogue with the Express app and 
// the Sequelize database model. Next, you tell it to create your endpoints for the Post model: one for a list 
// of posts, which will have POST and GET methods; and one for individual posts, which will have GET, PUT, and DELETE methods.

const database = new Sequelize({
    dialect: 'sqlite',
    storage: './test.sqlite',
});

const Post = database.define('posts', {
    title: Sequelize.STRING,
    body: Sequelize.TEXT,
});

epilogue.initialize({ app, sequelize: database });

epilogue.resource({
    model: Post,
    endpoints: ['/posts', '/posts/:id'],
});

const port = process.env.SERVER_PORT || 3001;

// The last part of the server is where you tell Express to start listening for HTTP requests.

database.sync().then(() => {
    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
});