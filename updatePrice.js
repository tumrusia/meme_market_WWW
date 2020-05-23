import * as sqlite3 from 'sqlite3';
function newPrice() {
    const pricePlace = document.querySelector("input[type=text]");
    const url = document.URL;
    let help = url.split('/');
    let filename = './assets/' + help[help.length - 1];
    console.log(filename);
    let price = parseInt(pricePlace.value);
    console.log(price);
    if (isNaN(price)) {
        console.log("Please, enter a new, correct price.");
        return;
    }
    let db = new sqlite3.Database('http://localhost:8080/meme.db');
    let date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    db.run('INSERT INTO meme (url, price, date) VALUES ("' + filename + '", ' + price + ', "' + date + '");');
    db.close();
}
