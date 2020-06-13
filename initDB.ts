import * as sqlite3 from 'sqlite3';

sqlite3.verbose();
let db = new sqlite3.Database('meme.db');

function addMemeToDB(filename: string, price: number) {
    let date: string = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.run('INSERT INTO meme (url, price, date, actual) VALUES ("' + filename + '", ' + price + ', "' + date + '", 1);');
}

function initDB() {
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

    db.run('INSERT INTO session (nick, pages, expire, actual) VALUES ("", 0, "", 1);');
}

initDB();