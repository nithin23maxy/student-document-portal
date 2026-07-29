const session = require("express-session");

class SQLiteSessionStore extends session.Store {
    constructor(db) {
        super();
        this.db = db;
    }

    get(sid, callback) {
        const now = Date.now();
        this.db.get("SELECT sess FROM sessions WHERE sid = ? AND expire > ?", [sid, now], (err, row) => {
            if (err) return callback(err);
            if (!row) return callback(null, null);
            try {
                const sessionData = JSON.parse(row.sess);
                callback(null, sessionData);
            } catch (e) {
                callback(e);
            }
        });
    }

    set(sid, sess, callback) {
        const maxAge = (sess && sess.cookie && sess.cookie.maxAge) || 7 * 24 * 60 * 60 * 1000;
        const expire = Date.now() + maxAge;
        const sessStr = JSON.stringify(sess);

        this.db.run(
            `INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
             ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire`,
            [sid, sessStr, expire],
            (err) => {
                if (callback) callback(err);
            }
        );
    }

    destroy(sid, callback) {
        this.db.run("DELETE FROM sessions WHERE sid = ?", [sid], (err) => {
            if (callback) callback(err);
        });
    }

    touch(sid, sess, callback) {
        const maxAge = (sess && sess.cookie && sess.cookie.maxAge) || 7 * 24 * 60 * 60 * 1000;
        const expire = Date.now() + maxAge;
        this.db.run("UPDATE sessions SET expire = ? WHERE sid = ?", [expire, sid], (err) => {
            if (callback) callback(err);
        });
    }
}

module.exports = SQLiteSessionStore;
