import * as fs from 'fs';
import {log, promisify} from 'util';
import * as sqlite3 from 'sqlite3';

let open = promisify(fs.open);
let close = promisify(fs.close);
sqlite3.verbose();
let db = new sqlite3.Database('meme.db');

const searchHistory = (filename) => {
    return new Promise((resolve, reject) => {
        let zapytanie = 'SELECT date, price FROM meme WHERE url = "' + filename + '" ORDER BY date DESC;';
        db.all(zapytanie, [], (err, rows) => {
            if (err) throw (err);

            let history = [];
            for (let {date, price} of rows) {
                let o = {date: date, price: price};
                history.push(o);
            }
            resolve(history);
        });
    });
}

function addNewPrice(res, req, filename, newPrice, nick) {
    db.run('UPDATE meme SET actual = 0 WHERE url = "' + filename + '";');
    let date: string = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.run('INSERT INTO meme (url, price, date, actual, author) VALUES ("' + filename + '", ' + newPrice + ', "' + date + '", 1, "' + nick + '");');
    let zapytanie = 'SELECT date, price FROM meme WHERE url = "' + filename + '" ORDER BY date DESC;';
    db.all(zapytanie, [], (err, rows) => {
        if (err) throw (err);

        let history = [];
        for (let {date, price} of rows) {
            let o = {date: date, price: price};
            history.push(o);
        }
    });
}

const openPageHistory = (req, res, history, filename) => {
    return new Promise((resolve, reject) => {
        let zapytanie = 'SELECT nick, pages FROM session WHERE actual = 1;';
        db.all(zapytanie, [], (err, rows) => {
            if (err) throw (err);

            let nick = rows[0].nick;
            let pages = rows[0].pages;

            if (nick === "") {
                //niezalogowany
                res.render('not-logged-history', {
                    title: 'meme price history',
                    url: filename,
                    history: history,
                    token: req.csrfToken(),
                });
                resolve();
            } else {
                //zalogowany
                res.render('logged-history', {
                    title: 'meme price history',
                    url: filename,
                    history: history,
                    token: req.csrfToken(),
                    pageViews: pages
                });
                resolve();
            }
        });
    });
}

const chooseTheMostExpensive3 = () => {
    return new Promise((resolve, reject) => {
        let zapytanie = 'SELECT url FROM meme WHERE actual = 1 ORDER BY price DESC;';
        db.all(zapytanie, [], (err, rows) => {
            if (err) throw (err);

            let selected = [];
            let i = 0;
            for (let {url} of rows) {
                let o = {url: url};
                selected.push(o);
                i++;
                if (i >= 3) {
                    break;
                }
            }
            resolve(selected);
        });
    });
}

const getUserNick = () => {
    return new Promise((resolve, reject) => {
        let zapytanie = 'SELECT nick FROM session WHERE actual = 1;';
        db.all(zapytanie, [], (err, rows) => {
            if (err) throw (err);

            let nick = rows[0].nick;
            resolve(nick);
        });
    });
}

const openPageMain = (req, res, selected) => {
    return new Promise((resolve, reject) => {
        let zapytanie = 'SELECT nick, pages FROM session WHERE actual = 1;';
        db.all(zapytanie, [], (err, rows) => {
            if (err) throw (err);

            let nick = rows[0].nick;
            let pages = rows[0].pages;

            if (nick === "") {
                //niezalogowany
                res.render('index', {
                    title: 'meme market',
                    message: 'I\'m not good in memes, so I used random pictures, sorry',
                    memes: selected,
                    token: req.csrfToken(),
                });
                resolve();
            } else {
                //zalogowany
                res.render('logged', {
                    title: 'meme market',
                    message: 'I\'m not good in memes, so I used random pictures, sorry',
                    memes: selected,
                    token: req.csrfToken(),
                    pageViews: pages
                });
                resolve();
            }
        });
    });
}

const countPageViews = () => {
    return new Promise((resolve, reject) => {
        let zapytanie = 'SELECT nick, pages, expire FROM session WHERE actual = 1;';
        db.all(zapytanie, [], (err, rows) => {
            if (err) throw (err);

            let nick;
            let pages;
            let expire;

            if (rows.length === 0) {
                reject();
            } else {
                nick = rows[0].nick;
                pages = rows[0].pages;
                expire = new Date(rows[0].expire);
                let now = new Date(Date.now());
                console.log(now + "  CURRENT TIME\n" + expire + "  EXPIRE BY");
                if (expire <= now) {
                    nick = "";
                    pages = 1;
                    expire = new Date(Date.now() + 15*60*1000);
                } else {
                    pages++;
                }

                //update do bazy
                db.run('UPDATE session SET nick = "' + nick + '", pages = ' + pages + ', expire = "' + expire + '" WHERE actual = 1;');
                resolve();
            }
        });
    });
}

const logInUser = (nick, currentNick) => {
    return new Promise((resolve, reject) => {
        if (nick === currentNick) {
            resolve();
        } else {
            let expire = new Date(Date.now() + 15 * 60 * 1000);
            db.run('UPDATE session SET nick = "' + nick + '", pages = 1, expire = "' + expire + '" WHERE actual = 1;');
            resolve();
        }
    });
}

const logOutUser = () => {
    return new Promise((resolve, reject) => {
        let expire = new Date(Date.now() + 15*60*1000);
        db.run('UPDATE session SET nick = "", pages = 1, expire = "' + expire + '" WHERE actual = 1;');
        resolve();
    });
}

function openImage(req, res, justOpen: boolean) {
    let fd;
    let path = './assets/' + req.params.image;
    let filename = req.params.image;
    open(path, 'a').then((_fd) => {
        fd = _fd;
        fs.readFile(path, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.write(err);
                res.end();
            } else if (justOpen) {
                res.write(data);
                res.end();
            } else {
                searchHistory(filename)
                    .then( (history) => {
                        return openPageHistory(req, res, history, filename);
                    })
                    .catch((error) => {
                        console.log(error.message);
                    });
            }
        });
    }).then(() => close(fd)).catch((reason) => {
        console.log('ERROR: ', reason);
    });
}

const express = require('express');
const bodyParser = require('body-parser');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const csrfMiddleware = csurf({
    cookie: true
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(csrfMiddleware);
app.use(session({secret: "Shh, its a secret!"}));

app.set('view engine', 'pug');

app.get('/', function (req, res) {
    countPageViews()
        .then( () => {
            return logOutUser();
        })
        .then( () => {
            return chooseTheMostExpensive3();
        })
        .then( (selected) => {
            return openPageMain(req, res, selected);
        })
        .catch((error) => {
            console.log(error.message);
        });
});

app.post('/', function (req, res) {
    console.log(`Message received: ${req.body.nick}`);
    console.log(`CSRF token used: ${req.body._csrf}`);

    countPageViews()
        .then( () => {
            return getUserNick();
        })
        .then( (currentNick) => {
            return logInUser(req.body.nick, currentNick);
        })
        .then( () => {
            return chooseTheMostExpensive3();
        })
        .then( (selected) => {
            return openPageMain(req, res, selected);
        })
        .catch((error) => {
            console.log(error.message);
        });
});

app.get('/assets/:image', function (req, res) {
    openImage(req, res,true);
});

app.get('/history/:image', function (req, res) {
    countPageViews()
        .then( () => {
            return openImage(req, res, false);
        })
        .catch((error) => {
            console.log(error.message);
        });
});

app.post('/history/:image', (req, res) => {
    console.log(`Message received: ${req.body.changePrice}`);
    console.log(`CSRF token used: ${req.body._csrf}`);

    if (isNaN(req.body.changePrice)) {
        console.log("Błędne wartość ceny.");
    } else {
        getUserNick()
            .then( (nick) => {
                addNewPrice(res, req, req.params.image, req.body.changePrice, nick);
            })
            .catch((error) => {
                console.log(error.message);
            });

    }

    countPageViews()
        .then( () => {
            openImage(req, res, false);
        })
        .catch((error) => {
            console.log(error.message);
        });
});

const PORT = 3000;
app.listen(PORT, function () {
    console.log(`Listening on http://localhost:${PORT}`);
});
