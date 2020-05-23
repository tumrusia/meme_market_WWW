import * as sqlite3 from 'sqlite3';

sqlite3.verbose();

function zalozBaze() {
    let db = new sqlite3.Database('pliki.db');
    db.run('CREATE TABLE wyswietlenia (sciezka VARCHAR(255), liczba INT);');
    db.close;
}

zalozBaze();