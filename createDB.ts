import * as sqlite3 from 'sqlite3';

sqlite3.verbose();

function zalozBaze() {
    let db = new sqlite3.Database('meme.db');
    /* TABLE meme
     * url VARCHAR(255) NOT NULL PRIMARY KEY
     * price INT NOT NULL
     * date VARCHAR(20) NOT NULL
     * CONSTRAINT id PRIMARY KEY (url, date)
     */
    db.run('CREATE TABLE meme (url VARCHAR(255) NOT NULL, price INT NOT NULL, date VARCHAR(20) NOT NULL, CONSTRAINT id PRIMARY KEY (url, date));');
    db.close;
}

zalozBaze();