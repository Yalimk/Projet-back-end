/************* PARTIE HTTP EXPRESS *************/

/************* CONSTANT VARIABLES DECLARATION *************/
const express = require('express');
const session = require('express-session');
const favicon = require('express-favicon');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const MongoStore = require('connect-mongo')(session);
const bodyParser = require('body-parser');
const app = express();
const urlDb = 'mongodb+srv://admin:adminpassword@diwjs13acs.ieuak.gcp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'silly-race';
const collectionName = 'users';
const PORT = process.env.PORT || 9090;

/************* MIDDLEWARES *************/

app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: true }));

app.use('/js', express.static(__dirname + '/public/script'));
app.use('/css', express.static(__dirname + '/public/style'));
app.use('/img', express.static(__dirname + 'public/images'));

app.use(favicon(__dirname + '/public/images/favicon.png'));

app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'YouWillNeverFindOut',
  cookie: {
    MaxAge: 3600000,
  },
  store: new MongoStore({
    url: urlDb,
    // dbName: dbName,
    // collection: collectionName,
  })
}));

/************* GET REQUESTS HANDLING *************/

app.get('/', (req, res, next) => {
  if (req.session.login) {
    res.redirect('/gameroom');
  } else {
    res.render('login', { pageTitle: 'Accueil' });
    // console.log(req.session);
  }
});

app.get('/login', (req, res, next) => {
  console.log(req.session)
  res.render('login', { pageTitle: 'Accueil' });
});

app.get('/registration', (req, res, next) => {
  console.log(req.session)
  res.render('registration', { pageTitle: 'Création de compte' });
});

app.get('/gameroom', (req, res, next) => {
  if (req.session.login) {
    res.render('gameroom', {
      _id: req.session._id,
      login: req.session.login,
      pageTitle: 'Salle de jeu',
    });
  } else {
    res.redirect('/login');
  }
});

/************* POST REQUESTS HANDLING *************/

app.post('/login', (req, res, next) => {
  if (!req.body.login || !req.body.password) {
    res.redirect('/login');
    app.locals.message = `Identifiant ou mot de passe non renseigné`
  } else {
    MongoClient.connect(urlDb, { useUnifiedTopology: true }, (err, client) => {
      if (err) {
        next(new Error(err));
      } else {
        const collection = client.db(dbName).collection(collectionName);
        collection.find({ login: req.body.login }).toArray((err, data) => {
          client.close();
          if (err) {
            next(new Error(err));
          } else {
            if (!data.length) {
              res.redirect('/login');
              app.locals.message = 'Identifiant introuvable';
            } else {
              if (req.body.password === data[0].password) {
                req.session._id = data[0]._id;
                req.session.login = data[0].login;
                res.redirect('/gameroom');
              } else {
                res.redirect('/login');
                app.locals.message = `Mot de passe incorrect`;
              }
            }
          }
        });
      };
    });
  }
});

app.post('/processing', (req, res, next) => {
  MongoClient.connect(urlDb, { useUnifiedTopology: true }, (err, client) => {
    if (err) {
      next(new Error(err));
    } else {
      const collection = client.db(dbName).collection(collectionName);
      collection.find({ login: req.body.login }).toArray((err, data) => {
        console.log('data : ', data);
        if (err) {
          next(new Error(err));
        }
        if (data[0] === undefined) {
          collection.insertOne({
            login: req.body.login,
            password: req.body.password
          }, (err, data) => {
            if (err) return;
            client.close();
            app.locals.message = `Compte créé avec succès`
            res.redirect('/login');
          })
        } else {
          if (req.body.login === data[0].login) {
            app.locals.message = `Compte existant pour ce login`;
            res.redirect('/login');
          }
        }
      });
    };
  });
});

const server = app.listen(PORT, () => {
  console.log(`Now listening on port ${PORT}.`)
});

/************* PARTIE SOCKET.IO *************/

const io = require('socket.io')(server);
const allAvatars = {};
const connectedPlayers = [];

io.on('connect', socket => {
  console.log(`Le client ${socket.id} est connecté`);

  socket.on('playerPseudo', pseudo => {
    socket.login = pseudo;
    if (!connectedPlayers.includes(socket.login)) {
      connectedPlayers.push(socket.login);
    };

    const avatar = {
      backgroundColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      border: '1px solid black',
      borderRadius: '100%',
      boxShadow: '2px 2px 5px 3px black',
      color: 'black',
      height: '50px',
      id: socket.id,
      left: 0,
      position: 'absolute',
      top: Math.random() * 700 + 150,
      width: '50px',
      score: 0,
      innerText: socket.login,
    };

    allAvatars[avatar.id] = avatar;
    io.emit('createAvatar', avatar);

    const score = {
      id: allAvatars[avatar.id].innerText,
      color: 'green',
      position: 'absolute',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      top: allAvatars[avatar.id].top,
    };

    /** SEUL MOYEN TROUVE POUR AFFICHER TOUS LES JOUEURS... **/

    let allPlayersInfo = [];
    (function updatePlayers() {
      for (const avatar in allAvatars) {
        allPlayersInfo.push(allAvatars[avatar]);
      }
      io.emit('displayAllPlayers', allPlayersInfo);
    }());


    /** EVENEMENT QUI VA GERER LE DEPLACEMENT DES JOUEURS **/

    socket.on('keypress', movement => {
      if (movement.right && connectedPlayers.length >= 2) {
        if (allAvatars[avatar.id].left <= 850) {
          allAvatars[avatar.id].left += 10;
        }
        if (allAvatars[avatar.id].left > 850) {
          allAvatars[avatar.id].left = 0;
          allAvatars[avatar.id].score++;
        }
      }
      io.emit('createAvatar', avatar);
      io.emit('displayScores', score); // Je ne sais pas encore vraiment pourquoi, mais il n'y a qu'en plaçant cet émission d'événement displayScores dans l'event keypress que le score s'affiche correctement... moi pas trop comprendre, mais ça marcher, donc moi pas toucher !
    });

    socket.on('disconnect', (reason) => {
      delete allAvatars[avatar.id];
      io.emit('removeAvatar', avatar);
    });
  });
});