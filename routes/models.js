const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors({
  origin: '*',
  methods: ["GET", "POST"]
}));
const formidable = require('express-formidable');
const { listObjects, uploadObject, translateObject, getManifest, urnify } = require('../services/aps.js');
const fs = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
let router = express.Router();

var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}


fs.initializeApp({
    credential: fs.credential.cert(serviceAccount)
   });
   
const db = fs.firestore(); 

// For converting the source into a Base64-Encoded string
var Buffer = require('buffer').Buffer;
String.prototype.toBase64 = function () {
    // Buffer is part of Node.js to enable interaction with octet streams in TCP streams, 
    // file system operations, and other contexts.
    return new Buffer(this).toString('base64');
};







router.get('/api/models', cors(corsOptions) , async function (req, res, next) {
    try {
        const objects = await listObjects();
        console.log()
        res.json(objects.map(o => ({
            name: o.objectKey,
            urn: urnify(o.objectId)
            
        }    )))  ;
    } catch (err) {
        next(err);
    }
});

router.get('/api/models/:urn/status', cors(corsOptions) , async function (req, res, next) {
    try {
        const manifest = await getManifest(req.params.urn);
        if (manifest) {
            let messages = [];
            if (manifest.derivatives) {
                for (const derivative of manifest.derivatives) {
                    messages = messages.concat(derivative.messages || []);
                    if (derivative.children) {
                        for (const child of derivative.children) {
                            messages.concat(child.messages || []);
                        }
                    }
                }
            }
            res.json({ status: manifest.status, progress: manifest.progress, messages });
        } else {
            res.json({ status: 'n/a' });
        }
    } catch (err) {
        next(err);
    }
});

router.post('/api/models', formidable({ maxFileSize: Infinity }), async function (req, res, next) {
    const file = req.files['fileToUpload'];
    if (!file) {
        res.status(400).send('The required field ("model-file") is missing.');
        return;
    }
    try {
        const obj = await uploadObject(file.name, file.path);
        await translateObject(urnify(obj.objectId), req.fields['model-zip-entrypoint']);
      //  console.log(obj.objectId)

        var urn = obj.objectId.toBase64();

   

        const cityRef = db.collection('projetos').doc(req.fields.idprojeto);
        const response = await cityRef.update({urn: urn});


        // res.json({    name: obj.objectKey,  urn: urnify(obj.objectId)   });
       // res.send('ALL Done!!!')
       res.redirect('https://www.lumera3d.com/main');



    } catch (err) {
        next(err);
    }
});

module.exports = router;
