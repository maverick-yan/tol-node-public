#tol-node-public
Originally made for Throne of Lies: The Online Game of Lies and Deceit @ https://www.ThroneOfLies.com
* This is a Node.js wrapper to a game developer's BaaS.
* More specifically, PlayFab. There are also some commented-out experiments with GameSparks.
* This is a template/wrapper: Almost anything within PlayFab can be called/returned within 6 lines of code.
* Copy+Paste a block of PlayFab code to use it for another call, and simply rename the call.
* There are also some experiments in regards to handling CSV (such as CD keys) and other relevant tasks.

## PreReqs:
1. Edit "rename_me_to_secret-keys.json" file in /tol/data/ and replace placeholder values.
2. Rename "rename_me_to_secret-keys.json" to "secret-keys.json"
3. SSL (https) is required: Copy your "cert.pem" and "key.pem" SSL/TLS files to /tol/ssl/

**HINT:**
If you don't have SSL (https), you probably shouldn't be making API calls anyway :)
It's worth the Google search -- it will take you just a couple days to get used to it.
You may have to spend ~$10/year for a legit SSL certificate that's not self-signed.

**Disclaimer:**
* This is a template/wrapper for PlayFab with some experiments of other useful/relevant features.
* This repo may or may not be updated/monitored by me. If you want authority for pull requests and I've been slack, let me know~
* Branch out as you please: This is license-free, although if you gave me credit, I'd toss you a +1 for coder's karma :D

**Like what you see?**
Support my game @ https://www.ThroneOfLies.com and I'll call that a thanks ;)
