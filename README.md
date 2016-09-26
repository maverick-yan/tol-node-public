#tol-node-public (TNP) - for game developers

<img src="https://i.imgur.com/NYmM7It.png">

<img src="https://i.imgur.com/NyeIsMh.png"><br>

* **This is a Node.js+Express.js REST API, <a href="www.playfab.com">PlayFab</a> (BaaS) wrapper, and <a href="www.mailchimp.com">Mailchimp</a> wrapper with MVC architecture.**
* There are premade templates for common calls, including authentication.
* Premade script not found? Simply copy+paste a template from another call and rename it to the correct call: Done.
* There are also some experiments in regards to handling CSV (such as CD keys) and other relevant tasks.
* Now with MailChimp support! Surely more to come.
* API Originally made for Throne of Lies: The Online Game of Lies and Deceit @ https://www.ThroneOfLies.com

## PreReqs:
1. Edit "rename_me_to_secret-keys.json" file in `/tol2/data/` and replace placeholder values.
2. Rename "rename_me_to_secret-keys.json" to "secret-keys.json" and fill in your secret keys (remember the key names)
3. SSL/TLS (https) is required: Copy your `cert.pem` and `key.pem` files to `/tol2/ssl/`
4. Navigate to **/tol2/** and type `sudo npm install --save` to install the req's `/tol2/node_modules/` dir)

## Scripts:
`package.json` comes with two "dev" scripts - run via `npm run <script_name>`:

1. `forever` - type `sudo npm run forever` to run forever+nodemon together to keep your app going and restart on changes, automatically.
2. `kill` - type `sudo npm run kill` to kill forever+nodemon.
3. `restart` - calls npm `kill`, then npm `forever`

## PlayFab Example:
`/tol2/routes/playfab.js`
```
// https://api.playfab.com/Documentation/Client/method/LoginWithPlayFab
router.post('/loginwithpf', cors(corsOptions), (req, res) => {
    // Init
    PFInitPost(req, '/loginwithpf');

    // Send
    PlayFabClient.LoginWithPlayFab(req.body, (err, data) => {
        PFGenericCallback(res, err, data);
    });
});
```

## Mailchimp Example:
`/tol2/routes/mailchimp.js`
```
// REGISTER
router.post('/register', cors(corsOptions), (req, res) => {
    // Init
    MCInitPost(req, '/register');
    var email = req.body["email"];
    var username = req.body["username"];
    var emailMd5 = GetMd5(email);
    var url = `/lists/${i42ListId}/members/${emailMd5}`;

    console.log("MC: PUT >> " + url);
    mailchimp.put(url, {
        "email_address": email,
        "status": "pending",
        "merge_fields": {
            "EMAIL": email,
            "UNAME": username
        }
    }, (err, data) => {
        // Generic callback + res
        mcGenericCallback(err, data, req, res);
    });
});
```

## Disclaimer:
* This is a template/wrapper for PlayFab with some experiments of other useful/relevant features.
* This repo may or may not be updated/monitored by me. If you want authority for pull requests and I've been slack, let me know~

## Like what you see?
Support my game and I'll call that a thanks ;)

## License
MIT
