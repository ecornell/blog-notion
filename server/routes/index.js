let express = require('express');
const router = express.Router();
let db = require('diskdb');
const fetch = require('node-fetch');
const _orderBy = require('lodash/orderBy');


db.connect('./db');
db.loadCollections(['index', 'posts']);

router.get("/", (req, res, next) => {

    const index = db.index.findOne({ id: 'blog' });

    if (index) {

        let json = index.json;
        json = _orderBy(json,['fields.date.start_date'],['desc']);
       
        console.log('Cache hit');
        res.render('index', { title: '8-BitMage Blog', body: json });
 
    } else {

        refresh(res);

    }
 
});

//

router.get('/post/:slug/:id', (req, res, next) => {

    const page = db.posts.findOne({ id: req.params.id });
    //const page = db.posts.findOne({ slug: req.params.slug });

    if (page) {

        console.log('Cache hit');
        res.render('post', { title: '8-BitMage Blog', body: page.body });

    } else {
        // todo: 404
    }

});

//

router.get('/page/:slug', (req, res, next) => {

    const page = db.posts.findOne({ slug: req.params.slug });

    if (page) {

        console.log('Cache hit');
        res.render('page', { title: '8-BitMage Blog', body: page.body });

    } else {
        // todo: 404
    }

});

//

router.get('/refresh-all', (req, res, next) => {

    refresh(res);

});

//

function refresh(res) {
    fetch("https://potion-ecornell.vercel.app/table?id=25a8f7af49184c60a5e9b57bf3e053dc")
        .then(res => res.json())
        .then(json => {

            const indexData = {
                id: 'blog',
                updated: Date.now(),
                json
            };
            const updated = db.index.update({ id: 0 }, indexData, { multi: false, upsert: true });
            console.log(updated);

            //
            json.forEach(pageNew => {

                const pageDB = db.posts.findOne({ id: pageNew.id });

                if (!pageDB || pageDB.last_edited !== pageNew.last_edited) {
                    console.log(`pull update - ${pageNew.id} - ${(pageNew.fields ? pageNew.fields.title : null)}`);

                    fetch("https://potion-ecornell.vercel.app/html?id=" + pageNew.id)
                        .then(resHtml => resHtml.text())
                        .then(text => {

                            const postData = {
                                id: pageNew.id,
                                created: pageNew.created,
                                last_edited: pageNew.last_edited,
                                slug: (pageNew?.fields?.slug),
                                type: (pageNew?.fields?.type),
                                title: (pageNew?.fields?.title),
                                date: (pageNew?.fields.date?.start_date),
                                published: (pageNew?.fields?.published),

                                body: text
                            };

                            const updated = db.posts.update({ id: pageNew.id }, postData, { multi: false, upsert: true });
                            console.log(updated);

                        });

                }

            });

            res.render('index', { title: '8-BitMage Blog', body: json, message: "Site Refreshed" });

        });
}

//
module.exports = router;



