import * as fs from 'fs';
import {log, promisify} from 'util';
import * as sqlite3 from 'sqlite3';

let open = promisify(fs.open);
let close = promisify(fs.close);
sqlite3.verbose();
let db = new sqlite3.Database('meme.db');

function addMemeToDB(filename: string, price: number) {
    let date: string = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.run('INSERT INTO meme (url, price, date, actual) VALUES ("' + filename + '", ' + price + ', "' + date + '", 1);');
}

function add10Memes() {
    addMemeToDB('1.jpg', 20);
    addMemeToDB('2.jpg', 21);
    addMemeToDB('3.jpg', 22);
    addMemeToDB('4.jpg', 23);
    addMemeToDB('5.jpg', 24);
    addMemeToDB('6.jpg', 25);
    addMemeToDB('7.jpg', 26);
    addMemeToDB('8.jpg', 27);
    addMemeToDB('9.jpg', 28);
    addMemeToDB('10.jpg', 29);
}

function searchHistory(res, req, logged: boolean, filename, callback) {
    let zapytanie = 'SELECT date, price FROM meme WHERE url = "' + filename + '" ORDER BY date DESC;';
    db.all(zapytanie, [], (err, rows) => {
        if (err) throw (err);

        let history = [];
        for (let {date, price} of rows) {
            let o = {date: date, price: price};
            history.push(o);
        }
        callback(res, req, logged, filename, history);
    });
}

function addNewPrice(res, req, filename, newPrice) {
    db.run('UPDATE meme SET actual = 0 WHERE url = "' + filename + '";');
    let date: string = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.run('INSERT INTO meme (url, price, date, actual) VALUES ("' + filename + '", ' + newPrice + ', "' + date + '", 1);');
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

function openPageHistory(res, req, logged: boolean, filename: string, history) {
    console.log("open " + filename);
    console.log(history);
    if (logged) {
        res.render('logged-history', {
            title: 'meme price history',
            url: filename,
            history: history,
            token: req.csrfToken(),
            pageViews: req.session.page_views
        });
    } else {
        res.render('not-logged-history', {
            title: 'meme price history',
            url: filename,
            history: history,
            token: req.csrfToken(),
            pageViews: req.session.page_views
        });
    }

}

function chooseTheMostExpensive3(res, req, logged: boolean, callback) {
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
        callback(res, req, logged, selected);
    });
}

function openPageMain(res, req, logged: boolean, selected) {
    console.log(selected);
    if (logged) {
        res.render('logged', {
            title: 'meme market',
            message: 'I\'m not good in memes, so I used random pictures, sorry',
            memes: selected,
            token: req.csrfToken(),
            pageViews: req.session.page_views
        });
    } else {
        res.render('index', {
            title: 'meme market',
            message: 'I\'m not good in memes, so I used random pictures, sorry',
            memes: selected,
            token: req.csrfToken(),
            pageViews: req.session.page_views
        });
    }
}

function countPageViews(req) {
    if(req.session.page_views){
        req.session.page_views++;
        console.log("You visited this page " + req.session.page_views + " times");
    } else {
        req.session.page_views = 1;
        console.log("Welcome to this page for the first time!");
        req.session.expire = new Date(Date.now() + 15*60*1000);
        console.log("New session, expire by " + req.session.expire);
    }

    let now = new Date(Date.now());
    let end = new Date(req.session.expire);
    if (end <= now) {
        console.log("Your session expired.");
        req.session.page_views = 1;
        req.session.expire = new Date(Date.now() + 15*60*1000);
        console.log("New session, expire by " + req.session.expire);
    }
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
    req.session.nick = "";
    countPageViews(req);
    chooseTheMostExpensive3(res, req, false, openPageMain);
});

app.post('/', function (req, res) {
    console.log(`Message received: ${req.body.nick}`);
    console.log(`CSRF token used: ${req.body._csrf}`);

    countPageViews(req);

    if (req.body.nick === undefined || req.body.nick === "") {
        console.log("Pusty nick. Nie jesteś zalogowany.");
        req.body.nick = "";
        chooseTheMostExpensive3(res, req, false, openPageMain);
    } else {
        req.session.nick = req.body.nick;
        chooseTheMostExpensive3(res, req, true, openPageMain);
    }
});

function openImage(req, res, logged: boolean, justOpen: boolean) {
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
                searchHistory(res, req, logged, filename, openPageHistory);
            }
        });
    }).then(() => close(fd)).catch((reason) => {
        console.log('Błąd był straszliwy!', reason);
    });
}

app.get('/assets/:image', function (req, res) {
    openImage(req, res, false, true);
});

app.get('/history/:image', function (req, res) {
    countPageViews(req);
    if (req.session.nick === undefined || req.session.nick === "") {
        openImage(req, res, false,false);
    } else {
        console.log("nick to: " + req.session.nick);
        openImage(req, res, true, false);
    }
});

app.post('/history/:image', (req, res) => {
    console.log(`Message received: ${req.body.changePrice}`);
    console.log(`CSRF token used: ${req.body._csrf}`);

    if (isNaN(req.body.changePrice)) {
        console.log("Błędne wartość ceny.");
    } else {
        addNewPrice(res, req, req.params.image, req.body.changePrice);
    }

    openImage(req, res, true, false);
});

//add10Memes();
const PORT = 3000;
app.listen(PORT, function () {
    console.log(`Listening on http://localhost:${PORT}`);
});
