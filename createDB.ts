import * as sqlite3 from 'sqlite3';

sqlite3.verbose();
let db = new sqlite3.Database('meme.db');

function createDB() {
    /* TABLE meme
     * url VARCHAR(255) NOT NULL
     * price INT NOT NULL
     * date VARCHAR(20) NOT NULL
     * actual INT NOT NULL <-- 1 means yes, 0 means no
     * author VARCHAR(255)
     * CONSTRAINT id PRIMARY KEY (url, date)
     */
    db.run('CREATE TABLE meme (url VARCHAR(255) NOT NULL, price INT NOT NULL, date VARCHAR(20) NOT NULL, actual INT NOT NULL, author VARCHAR(255), CONSTRAINT id PRIMARY KEY (url, date));');
    /* TABLE session
     * nick VARCHAR(255) NOT NULL
     * pages INT NOT NULL
     * expire VARCHAR(20) NOT NULL
     * actual INT NOT NULL
     * CONSTRAINT id PRIMARY KEY (nick, expire)
     */
    db.run('CREATE TABLE session (nick VARCHAR(255) NOT NULL, pages INT NOT NULL, expire VARCHAR(20) NOT NULL, actual INT NOT NULL, CONSTRAINT id PRIMARY KEY (nick, expire));');
}

createDB();