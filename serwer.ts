import {createServer} from 'http';
import * as fs from 'fs';
import {promisify} from 'util';
import * as sqlite3 from 'sqlite3';
import { Interface } from 'readline';

let open = promisify(fs.open);
let write = promisify(fs.write);
let close = promisify(fs.close);
sqlite3.verbose();
let db = new sqlite3.Database('meme.db');

function addMemeToDB(filename: string, price: number) {
    let date: string = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.run('INSERT INTO meme (url, price, date, actual) VALUES ("' + filename + '", ' + price + ', "' + date + '", 1);');
}

function add10Memes() {
    addMemeToDB('./assets/1.jpg', 10);
    addMemeToDB('./assets/2.jpg', 11);
    addMemeToDB('./assets/3.jpg', 12);
    addMemeToDB('./assets/4.jpg', 13);
    addMemeToDB('./assets/5.jpg', 14);
    addMemeToDB('./assets/6.jpg', 15);
    addMemeToDB('./assets/7.jpg', 16);
    addMemeToDB('./assets/8.jpg', 17);
    addMemeToDB('./assets/9.jpg', 18);
    addMemeToDB('./assets/10.jpg', 19);
}

function searchHistory(res, filename, callback) {
    let zapytanie = 'SELECT date, price FROM meme WHERE url = "' + filename + '" ORDER BY date DESC;';
    db.all(zapytanie, [], (err, rows) => {
        if (err) throw (err);

        let history = [];
        for(let {date, price} of rows) {
            let o = {date: date, price: price};
            history.push(o);
        }
        callback(res, filename, history);
    });
}

function addNewPrice(res, filename, newPrice, callback) {
    db.run('UPDATE meme SET actual = 0 WHERE url = "' + filename + '";');
    let date: string = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.run('INSERT INTO meme (url, price, date, actual) VALUES ("' + filename + '", ' + newPrice + ', "' + date + '", 1);');
    let zapytanie = 'SELECT date, price FROM meme WHERE url = "' + filename + '" ORDER BY date DESC;';
    db.all(zapytanie, [], (err, rows) => {
        if (err) throw (err);

        let history = [];
        for(let {date, price} of rows) {
            let o = {date: date, price: price};
            history.push(o);
        }
        callback(res, filename, history);
    });
}

function openPageHistory(res, filename: string, history) {
    console.log("open " + filename);
    console.log(history);
    res.render('history', {title: 'meme price history', url: filename, history: history});
}

function chooseTheMostExpensive3(res, callback) {
    let zapytanie = 'SELECT url FROM meme WHERE actual = 1 ORDER BY price DESC;';
    db.all(zapytanie, [], (err, rows) => {
        if (err) throw (err);

        let selected = [];
        let i = 0;
        for(let {url} of rows) {
            let o = {url: url};
            selected.push(o);
            i++;
            if (i >= 3) {
                break;
            }
        }
        callback(res, selected);
    });
}

function openPageMain(res, selected) {
    console.log(selected);
    res.render('index', { title: 'meme market', message: 'I\'m not good in memes, so I used random pictures, sorry', memes: selected });
}

let express = require('express');
let app = express();
app.set('view engine', 'pug');

app.get('/', function(req, res) {
    chooseTheMostExpensive3(res, openPageMain);
});

app.get('/assets/:image', function(req, res) {
    let fd;
    let filename = './assets/' + req.params.image;
    console.log(filename);
    open(filename, 'a').then((_fd) => {
        fd = _fd;
        fs.readFile(filename, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.write(err);
                res.end();
            } else {
                res.write(data);
                res.end();
            }
        });
    }).then(() => close(fd)).catch((reason) => {
        console.log('Błąd był straszliwy!', reason);
    });
});


app.get('/views/assets/:image', function(req, res) {
    let fd;
    let filename = './assets/' + req.params.image;
    open(filename, 'a').then((_fd) => {
        fd = _fd;
        fs.readFile(filename, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.write(err);
                res.end();
            } else if (req.url.length < ("/views/assets/?changePrice=1&submit=change").length + req.params.image.length) {
                console.log("hej " + filename + " " + req.url);
                searchHistory(res, filename, openPageHistory);
            } else {
                let help = req.url.split('/');
                let help2 = (help[help.length -1]).split('=');
                let help3 = (help2[1]).split('&');
                let newPrice = parseInt(help3[0]);
                console.log(newPrice);
                if (isNaN(newPrice)) {
                    console.log("Błędna wartość nowej ceny!");
                    searchHistory(res, filename, openPageHistory);
                } else {
                    addNewPrice(res, filename, newPrice, openPageHistory);
                }
            }
        });
    }).then(() => close(fd)).catch((reason) => {
        console.log('Błąd był straszliwy!', reason);
    });
});

//add10Memes();

app.listen(8080, function() {
    console.log('App listening on port 8080!');
});
