import {createServer} from 'http';
import * as fs from 'fs';
import {promisify} from 'util';
import * as sqlite3 from 'sqlite3';

let open = promisify(fs.open);
let write = promisify(fs.write);
let close = promisify(fs.close);
sqlite3.verbose();
let db = new sqlite3.Database('pliki.db');

function ileOdwiedzin(filename: string, callback) {
    let zapytanie = 'SELECT liczba FROM wyswietlenia WHERE sciezka = "' + filename + '";';
    db.all(zapytanie, [], (err, rows) => {
        if (err) throw (err);
        if (rows.length === 0) {
            callback(filename, 0);
        } else {
            callback(filename, rows[0].liczba);
        }
    });
}

function dodajOdwiedzinyDoBazy(filename: string, liczba: number) {
    if (liczba === 0) {
        db.run('INSERT INTO wyswietlenia (sciezka, liczba) VALUES ("' + filename + '", 1);');
    } else {
        let help = liczba + 1;
        db.run('UPDATE wyswietlenia SET sciezka = "' + filename + '", liczba = ' + help + ' WHERE sciezka = "' + filename + '";');
    }
}

function getStats(req, res, callback) {
    let zapytanie = 'SELECT sciezka, liczba FROM wyswietlenia;';
    db.all(zapytanie, [], (err, rows) => {
        if (err) throw (err);

        let cellStyle = ' style="border: solid black 1px; padding: 5px"';
        let body = '<table style="border: solid black 3px; border-collapse: collapse;"><tr><th' 
            + cellStyle + '>Path</th><th' + cellStyle + '>Visits</th></tr>';
        
        for(let {sciezka, liczba} of rows) {
            console.log(sciezka, '->', liczba);
            body = body + '<tr><td' + cellStyle + '>' + sciezka + '</td><td' 
                + cellStyle + '>' + liczba + '</td></tr>';
        }
        body = body + '</table>';

        callback(req, res, body);
    });
}

function buildHtml(req, res, body) {
    var header = '<title>Statystyki</title>';
 
    let html = '<!DOCTYPE html>'
         + '<html><head>' + header + '</head><body>' + body + '</body></html>';

    res.end(html);
  };

let server = createServer(
    (req, res) => {
        if (req.url === "/statystyki") {
            console.log("/statystyki");
            /* wyswietl strone z pobranymi z bazy danych informacjami
                o liczbie odwołań do poszczególnych plików. Strona jest HTMLem.
            */
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            getStats(req, res, buildHtml);
        } else {
            /* przeszukaj bazę danych w poszukiwaniu takiego pliku jak w url
                i jeśli jest to zwróć jego zawartość odnotuj każde takie odwołanie
            */
            let filename = '.' + req.url;
            console.log(filename);

            ileOdwiedzin(filename, dodajOdwiedzinyDoBazy);
            
            let fd;
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
        }
    }
);

server.listen(8080);